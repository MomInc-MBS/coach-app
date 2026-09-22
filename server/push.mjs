import {buildPushPayload} from '@block65/webcrypto-web-push';
import {db} from './db.mjs';
import {reminderMessage} from '../reminder-settings.mjs';
import {isDue,fail} from './domain.mjs';
import {claimNotificationSlot} from './reminder-plan.mjs';
import {missedTrainingDays,coachReminder} from '../reminder-plan.mjs';
import {epochFencedBatch} from './remote-epochs.mjs';
export function subscriptionInput(v){let url;try{url=new URL(v.endpoint);}catch{fail('Invalid notification subscription.');}const host=url.hostname;if(url.protocol!=='https:'||url.port||url.username||url.password||!(host==='fcm.googleapis.com'||host==='updates.push.services.mozilla.com'||host.endsWith('.push.services.mozilla.com')||host==='web.push.apple.com'||host.endsWith('.notify.windows.com')))fail('This notification provider is not supported.');for(const [k,size] of [['p256dh',87],['auth',22]])if(typeof v.keys?.[k]!=='string'||!new RegExp(`^[A-Za-z0-9_-]{${size}}={0,2}$`).test(v.keys[k]))fail('Invalid notification keys.');return {endpoint:url.href,keys:v.keys,expirationTime:null};}
const stale=()=>Object.assign(Error('Notification generation changed.'),{code:'stale_delivery',status:409});
const staleError=error=>['stale_delivery','target_epoch_mismatch'].includes(error?.code);
export async function sendPush(env,sub,message,{ttl=600,ownerId,dataEpoch,subscriptionData,subscriptionCreatedAt}={}){
 if(typeof ownerId!=='string'||!ownerId||!Number.isSafeInteger(dataEpoch)||dataEpoch<1||typeof subscriptionData!=='string'||!Number.isSafeInteger(subscriptionCreatedAt)||subscriptionCreatedAt<0)throw stale();
 const database=db(env),payload=await buildPushPayload({data:JSON.stringify(message),options:{ttl}},sub,{subject:env.VAPID_SUBJECT,publicKey:env.VAPID_PUBLIC_KEY,privateKey:env.VAPID_PRIVATE_KEY});
 const current=await database.prepare('SELECT s.endpoint FROM subscriptions s LEFT JOIN account_data_epochs e ON e.owner_id=s.user_id WHERE s.endpoint=? AND s.user_id=? AND s.data=? AND s.created_at=? AND COALESCE(e.epoch,1)=?').bind(sub.endpoint,ownerId,subscriptionData,subscriptionCreatedAt,dataEpoch).first();
 if(!current)throw stale();
 const result=await fetch(sub.endpoint,{...payload,redirect:'manual',signal:AbortSignal.timeout(15000)});
 if(result.status===404||result.status===410){
  try{await epochFencedBatch(database,{ownerId,expectedDataEpoch:dataEpoch,now:Date.now(),statements:[database.prepare('DELETE FROM subscriptions WHERE endpoint=? AND user_id=? AND data=? AND created_at=?').bind(sub.endpoint,ownerId,subscriptionData,subscriptionCreatedAt)]});}
  catch(error){if(!staleError(error))throw error;}
 }
 if(!result.ok)throw Error('Notification service did not accept delivery.');return result.status;
}
export async function runReminders(env,now=Date.now()){
 const database=db(env);await database.prepare("INSERT INTO system(key,value) VALUES('scheduler_tick',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(String(now)).run();
 if(!env.VAPID_PRIVATE_KEY)return {sent:0,configured:false};
 const rows=(await database.prepare('SELECT r.*,COALESCE(e.epoch,1) AS data_epoch FROM reminders r LEFT JOIN account_data_epochs e ON e.owner_id=r.user_id WHERE r.enabled=1').all()).results;let sent=0,failed=0;
 for(const r of rows){
  const day=isDue(r,now);if(!day)continue;
  const subs=(await database.prepare('SELECT * FROM subscriptions WHERE user_id=?').bind(r.user_id).all()).results;
  if(!subs.length)continue;
  try{if(!await claimNotificationSlot(database,r.user_id,day,r.id,{dataEpoch:r.data_epoch,now,requireReminder:true}))continue;}catch(error){if(staleError(error))continue;throw error;}
  let training=null;try{const status=await database.prepare('SELECT value FROM system WHERE key=?').bind('training:'+r.user_id).first();training=status?JSON.parse(status.value):null;}catch{}
  const message=r.kind==='workout'?coachReminder(missedTrainingDays(training,now,r.days_per_week),r.tone):reminderMessage(r.kind,r.tone);
  const commit=statements=>epochFencedBatch(database,{ownerId:r.user_id,expectedDataEpoch:r.data_epoch,now,statements});
  for(const s of subs){
   let claimed;
   try{
    const results=await commit([database.prepare("INSERT INTO deliveries(reminder_id,day,endpoint,status,updated_at) SELECT ?,?,?,'sending',? WHERE EXISTS(SELECT 1 FROM reminders WHERE id=? AND user_id=? AND enabled=1) AND EXISTS(SELECT 1 FROM subscriptions WHERE endpoint=? AND user_id=? AND data=? AND created_at=?) ON CONFLICT(reminder_id,day,endpoint) DO UPDATE SET status='sending',updated_at=excluded.updated_at WHERE deliveries.status!='sent' AND deliveries.updated_at<? RETURNING reminder_id").bind(r.id,day,s.endpoint,now,r.id,r.user_id,s.endpoint,r.user_id,s.data,s.created_at,now-120000)]);
    claimed=results[0].results?.length>0;
   }catch(error){if(staleError(error))continue;throw error;}
   if(!claimed)continue;
   let deliveryStatus='sent';
   try{await sendPush(env,JSON.parse(s.data),{title:'MOM // POD CHECK',body:message,tag:`${r.id}-${day}`,url:`/pose.html?panel=${r.kind==='meal'?'meals':'reminders'}`},{ownerId:r.user_id,dataEpoch:r.data_epoch,subscriptionData:s.data,subscriptionCreatedAt:s.created_at});sent++;}
   catch(error){if(staleError(error))continue;failed++;deliveryStatus='failed';}
   try{await commit([database.prepare('UPDATE deliveries SET status=?,updated_at=? WHERE reminder_id=? AND day=? AND endpoint=? AND updated_at=? AND EXISTS(SELECT 1 FROM subscriptions WHERE endpoint=? AND user_id=? AND data=? AND created_at=?)').bind(deliveryStatus,now,r.id,day,s.endpoint,now,s.endpoint,r.user_id,s.data,s.created_at)]);}catch(error){if(!staleError(error))throw error;}
  }
 }
 await database.prepare('DELETE FROM deliveries WHERE updated_at<?').bind(now-35*86400000).run();await database.prepare("DELETE FROM system WHERE key LIKE 'notify-budget:%' AND substr(key,-10)<?").bind(new Date(now-35*86400000).toISOString().slice(0,10)).run();return {sent,failed,configured:true};
}
