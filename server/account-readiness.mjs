import {epochFencedBatch} from './remote-epochs.mjs';
import {remoteReminders,reminderService} from './remote-reminders.mjs';
import {syncTrainingStatus} from './reminder-plan.mjs';
const healthKey='readiness:reminders';
export const trainingReadinessKey=owner=>'readiness:training:'+JSON.stringify(owner);
const valid=value=>value&&Number.isSafeInteger(value.startedAt)&&value.startedAt>=0&&typeof value.observationId==='string'&&['ready','unavailable'].includes(value.state);
const validPush=push=>push&&typeof push.configured==='boolean'&&typeof push.schedulerActive==='boolean'&&(push.publicKey===null||typeof push.publicKey==='string');
async function read(database,key){
 const row=await database.prepare('SELECT value FROM system WHERE key=?').bind(key).first();
 try{const value=JSON.parse(row?.value??'null');return valid(value)?value:null;}catch{return null;}
}
// Cache access is optional; only these cache keys are allowed to fail open.
const optionalRead=async(database,key)=>{try{return await read(database,key);}catch{return null;}};
function write(database,key,value){
 return database.prepare("INSERT INTO system(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value WHERE CASE WHEN json_valid(system.value)=0 THEN 1 WHEN json_type(system.value,'$.startedAt')!='integer' OR json_type(system.value,'$.startedAt') IS NULL OR json_type(system.value,'$.observationId')!='text' OR json_type(system.value,'$.observationId') IS NULL OR json_extract(system.value,'$.startedAt')<0 OR coalesce(json_extract(system.value,'$.state') IN ('ready','unavailable'),0)=0 THEN 1 ELSE json_extract(system.value,'$.startedAt')<json_extract(excluded.value,'$.startedAt') OR (json_extract(system.value,'$.startedAt')=json_extract(excluded.value,'$.startedAt') AND json_extract(system.value,'$.observationId')<json_extract(excluded.value,'$.observationId')) END").bind(key,JSON.stringify(value));
}
const view=(value,now)=>value?{...value,state:now-value.startedAt>300000?'stale':value.state}:{state:'unknown',checkedAt:null};
export async function readAccountReadiness(database,owner,epoch,now=Date.now()){
 const [health,training]=await Promise.all([optionalRead(database,healthKey),optionalRead(database,trainingReadinessKey(owner))]);
 const safeHealth=health?{...health}:null;if(safeHealth&&!validPush(safeHealth.push))delete safeHealth.push;
 return {reminders:view(safeHealth,now),training:view(training?.dataEpoch===epoch?training:null,now)};
}
export async function refreshReminderHealth(database,env,owner,{now=Date.now(),observationId=crypto.randomUUID()}={}){
 let value={startedAt:now,observationId,checkedAt:null,state:'unavailable'};
 try{
  const push=await reminderService(env,owner,'/internal/status');if(!validPush(push))throw Error('Invalid reminder health.');
  value={...value,state:'ready',checkedAt:Date.now(),push:{configured:push.configured,publicKey:push.publicKey,schedulerActive:push.schedulerActive}};
 }catch{
  const previous=await optionalRead(database,healthKey);
  if(validPush(previous?.push))value={...value,push:previous.push,lastSuccessAt:previous.state==='ready'?previous.checkedAt:previous.lastSuccessAt??null};
 }
 try{await write(database,healthKey,value).run();}catch{/* Health result remains usable even when its optional cache is unavailable. */}
 return value;
}
export async function refreshTrainingReadiness(database,env,owner,proof,training,{now=Date.now(),observationId=crypto.randomUUID()}={}){
 const value={startedAt:now,observationId,checkedAt:null,dataEpoch:proof.currentDataEpoch,state:'unavailable'};
 try{
  if(remoteReminders(env))await reminderService(env,owner,'/internal/training-status','POST',training,proof);
  else await syncTrainingStatus(database,owner,training,now,{dataEpoch:proof.currentDataEpoch});
  value.state='ready';value.checkedAt=Date.now();
 }catch{
  const previous=await optionalRead(database,trainingReadinessKey(owner));
  if(previous?.dataEpoch===proof.currentDataEpoch)value.lastSuccessAt=previous.state==='ready'?previous.checkedAt:previous.lastSuccessAt??null;
 }
 // Even a failure observation may never recreate a deleted user's cache.
 await epochFencedBatch(database,{ownerId:owner,expectedDataEpoch:proof.currentDataEpoch,now,statements:[write(database,trainingReadinessKey(owner),value)]});
 return value;
}
export function scheduleAccountReadiness(ctx,database,env,owner,proof,training){
 if(typeof ctx?.waitUntil!=='function')return;
 const now=Date.now();
 if(remoteReminders(env))ctx.waitUntil(Promise.resolve().then(()=>refreshReminderHealth(database,env,owner,{now})).catch(()=>{}));
 ctx.waitUntil(Promise.resolve().then(()=>refreshTrainingReadiness(database,env,owner,proof,training,{now})).catch(()=>{}));
}
