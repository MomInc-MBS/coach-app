import {fail} from './domain.mjs';
import {coachEpoch,coachBatch,coachConflict,requireCoachRow} from './coach-army-epochs.mjs';
export const COACH_ARMY_STAGES=['djscratch','goon','lilboyfriend','corgi','hand','armie'];
const eventId=value=>typeof value==='string'&&/^[A-Za-z0-9._:-]{1,200}$/.test(value);
async function safe(db,run){const events=(await db.prepare('SELECT stage FROM coach_army_run_events WHERE run_id=? ORDER BY sequence').bind(run.id).all()).results;return {id:run.id,targetAccountId:run.account_id,dataEpoch:run.data_epoch,startedAt:run.started_at,completedAt:run.completed_at,completed:run.completed_at!=null,stages:events.map(e=>e.stage)};}
async function row(db,id,owner){const run=await db.prepare('SELECT * FROM coach_army_runs WHERE id=? AND account_id=?').bind(id,owner).first();if(!run)fail('Coach Army run not found.',404);return run;}
export async function startCoachArmyRun(db,owner,now=Date.now(),{dataEpoch=1}={}){
 const epoch=coachEpoch(dataEpoch),id=crypto.randomUUID();await coachBatch(db,owner,epoch,now,[db.prepare('INSERT INTO coach_army_runs(id,account_id,started_at,updated_at,data_epoch) VALUES(?,?,?,?,?)').bind(id,owner,now,now,epoch)]);return safe(db,await row(db,id,owner));
}
export async function readCoachArmyRun(db,id,owner){return safe(db,await row(db,id,owner));}
function assertOrigin(run,dataEpoch){if(dataEpoch!==undefined&&coachEpoch(dataEpoch)!==run.data_epoch)coachConflict();}
function eventStatements(db,run,event,now){
 const {eventId:id,sequence,stage,source}=event,owner=run.account_id,epoch=run.data_epoch;
 const statements=[
  requireCoachRow(db,owner,'SELECT 1 FROM coach_army_runs WHERE id=? AND account_id=? AND data_epoch=? AND completed_at IS NULL',[run.id,owner,epoch]),
  requireCoachRow(db,owner,'SELECT 1 WHERE (SELECT COALESCE(MAX(sequence),0) FROM coach_army_run_events WHERE run_id=?)=?',[run.id,sequence-1]),
  db.prepare('INSERT INTO coach_army_run_events(event_id,run_id,account_id,sequence,stage,source,received_at,data_epoch) VALUES(?,?,?,?,?,?,?,?)').bind(id,run.id,owner,sequence,stage,source,now,epoch),
  db.prepare('UPDATE coach_army_runs SET updated_at=? WHERE id=?').bind(now,run.id)
 ];
 if(source==='verifier'&&stage==='armie'){
  statements.push(requireCoachRow(db,owner,"SELECT 1 WHERE (SELECT count(*) FROM coach_army_run_events WHERE run_id=? AND source='verifier' AND data_epoch=?)=6",[run.id,epoch]));
  const completionId=`coach-army-run:${run.id}`;
  statements.push(db.prepare('UPDATE coach_army_runs SET completed_at=?,completion_event_id=?,updated_at=? WHERE id=?').bind(now,completionId,now,run.id));
  statements.push(db.prepare("INSERT INTO coach_army_completion_outbox(event_id,run_id,account_id,completed_at,status,updated_at,data_epoch) VALUES(?,?,?,?,'pending',?,?)").bind(completionId,run.id,owner,now,now,epoch));
 }
 return statements;
}
async function writeEvent(db,event,now){
 const {runId,accountId,eventId:id,sequence,stage,source,dataEpoch}=event;
 if(!eventId(id)||!Number.isSafeInteger(sequence)||sequence<1||stage!==COACH_ARMY_STAGES[sequence-1]||!['browser','verifier'].includes(source))fail('Invalid Coach Army progress event.',409);
 const run=await row(db,runId,accountId);assertOrigin(run,dataEpoch);
 async function replay(){
  const old=await db.prepare('SELECT * FROM coach_army_run_events WHERE event_id=?').bind(id).first();
  if(!old)return false;
  if(old.run_id!==runId||old.account_id!==accountId||old.sequence!==sequence||old.stage!==stage||old.source!==source||old.data_epoch!==run.data_epoch)coachConflict();
  await coachBatch(db,accountId,run.data_epoch,now,[]);return true;
 }
 if(await replay())return {run:await safe(db,run),replay:true};
 if(run.completed_at!=null)coachConflict();
 const previous=await db.prepare('SELECT COALESCE(MAX(sequence),0) AS n FROM coach_army_run_events WHERE run_id=?').bind(runId).first();
 if(sequence!==previous.n+1)fail('Coach Army progress is out of order.',409);
 try{await coachBatch(db,accountId,run.data_epoch,now,eventStatements(db,run,event,now));}
 catch(error){if(error.code==='target_epoch_mismatch')throw error;if(await replay())return {run:await readCoachArmyRun(db,runId,accountId),replay:true};coachConflict();}
 return {run:await readCoachArmyRun(db,runId,accountId),replay:false,...(source==='browser'?{evidence:'pending_verifier'}:stage==='armie'?{outbox:'pending'}:{})};
}
export const recordBrowserCoachArmyEvent=(db,input,owner,now)=>writeEvent(db,{...input,accountId:owner,source:'browser'},now);
// An omitted external producer epoch denotes legacy epoch 1, never the run's new generation.
export const recordVerifiedCoachArmyEvent=(db,input,now)=>writeEvent(db,{...input,dataEpoch:coachEpoch(input.dataEpoch),source:'verifier'},now);

const DJ_SEQUENCE=Object.freeze([['bass',8],['treble',3],['volume',7],['tempo',9]]);
const challengeView=(c,run)=>({id:c.id,expiresAt:c.expires_at,nextStep:c.next_step,targetAccountId:run.account_id,dataEpoch:run.data_epoch,steps:DJ_SEQUENCE.map(([key,value])=>({key,value}))});
export async function startDjscratchChallenge(db,runId,owner,now=Date.now(),{dataEpoch}={}){
 const run=await row(db,runId,owner);assertOrigin(run,dataEpoch);if(run.completed_at!=null)coachConflict();
 const active=await db.prepare("SELECT * FROM coach_army_djscratch_challenges WHERE run_id=? AND account_id=? AND status='active' AND expires_at>? ORDER BY created_at DESC LIMIT 1").bind(runId,owner,now).first();
 if(active){await coachBatch(db,owner,run.data_epoch,now,[]);return challengeView(active,run);}
 const id=crypto.randomUUID(),expiresAt=now+600000;
 await coachBatch(db,owner,run.data_epoch,now,[
  requireCoachRow(db,owner,'SELECT 1 FROM coach_army_runs WHERE id=? AND account_id=? AND data_epoch=? AND completed_at IS NULL',[runId,owner,run.data_epoch]),
  db.prepare("UPDATE coach_army_djscratch_challenges SET status='superseded',updated_at=? WHERE run_id=? AND account_id=? AND status='active'").bind(now,runId,owner),
  db.prepare("INSERT INTO coach_army_djscratch_challenges(id,run_id,account_id,expires_at,next_step,status,created_at,updated_at,data_epoch) VALUES(?,?,?,?,0,'active',?,?,?)").bind(id,runId,owner,expiresAt,now,now,run.data_epoch)
 ]);
 return challengeView({id,expires_at:expiresAt,next_step:0},run);
}
export async function recordDjscratchControl(db,{runId,challengeId,key,value,dataEpoch},owner,now=Date.now()){
 if(!eventId(challengeId)||!DJ_SEQUENCE.some(([k])=>k===key)||!Number.isSafeInteger(value)||value<0||value>10)fail('Invalid DJ Scratch control evidence.');
 const run=await row(db,runId,owner);assertOrigin(run,dataEpoch);
 const c=await db.prepare('SELECT * FROM coach_army_djscratch_challenges WHERE id=? AND run_id=? AND account_id=?').bind(challengeId,runId,owner).first();if(!c)fail('DJ Scratch challenge not found.',404);
 if(c.data_epoch!==run.data_epoch)coachConflict();
 await coachBatch(db,owner,c.data_epoch,now,[]);
 if(c.expires_at<=now)fail('DJ Scratch challenge expired.',409);
 const answer=(extra)=>readCoachArmyRun(db,runId,owner).then(run=>({run,...extra}));
 if(c.status==='completed')return answer({replay:true,accepted:true,complete:true,nextStep:4});
 if(c.status!=='active')coachConflict();
 const step=c.next_step,[expectedKey,expectedValue]=DJ_SEQUENCE[step]||[];
 if(key!==expectedKey||value!==expectedValue){const replay=DJ_SEQUENCE.slice(0,step).some(([k,v])=>k===key&&v===value);return answer({accepted:replay,replay,complete:false,nextStep:step});}
 const next=step+1;
 const statements=[
  requireCoachRow(db,owner,"SELECT 1 FROM coach_army_djscratch_challenges WHERE id=? AND account_id=? AND status='active' AND next_step=? AND data_epoch=? AND expires_at>?",[challengeId,owner,step,c.data_epoch,now]),
  db.prepare("UPDATE coach_army_djscratch_challenges SET next_step=?,status=?,completed_at=?,updated_at=? WHERE id=?").bind(next,next===4?'completed':'active',next===4?now:null,now,challengeId)
 ];
 if(next===4)statements.push(...eventStatements(db,run,{eventId:`djscratch:${challengeId}`,sequence:1,stage:'djscratch',source:'verifier'},now));
 try{await coachBatch(db,owner,c.data_epoch,now,statements);}
 catch(error){if(error.code==='target_epoch_mismatch')throw error;const latest=await db.prepare('SELECT next_step,status FROM coach_army_djscratch_challenges WHERE id=?').bind(challengeId).first();if(latest?.next_step>step)return answer({accepted:true,replay:true,complete:latest.status==='completed',nextStep:latest.next_step});coachConflict();}
 return answer({accepted:true,replay:false,complete:next===4,nextStep:next});
}
export async function deliverCoachArmyOutbox(db,env,now=Date.now()){
 if(!env.COACH_ARMY_ENTITLEMENT_URL||!env.COACH_ARMY_ENTITLEMENT_TOKEN)return {attempted:0,delivered:0,configured:false};
 const rows=(await db.prepare("SELECT * FROM coach_army_completion_outbox WHERE status='pending' ORDER BY updated_at LIMIT 25").all()).results;
 let delivered=0;
 for(const item of rows){
  try{
   await coachBatch(db,item.account_id,item.data_epoch,now,[]);
   const response=await fetch(env.COACH_ARMY_ENTITLEMENT_URL,{method:'POST',redirect:'error',signal:AbortSignal.timeout(5000),headers:{'Content-Type':'application/json','Authorization':`Bearer ${env.COACH_ARMY_ENTITLEMENT_TOKEN}`},body:JSON.stringify({eventType:'coach_army.completed',eventId:item.event_id,accountId:item.account_id,completedAt:item.completed_at,dataEpoch:item.data_epoch})});
   if(!response.ok)throw Error(`Entitlement receiver returned ${response.status}.`);
   const ack=(await coachBatch(db,item.account_id,item.data_epoch,now,[db.prepare("UPDATE coach_army_completion_outbox SET status='delivered',attempts=attempts+1,last_error=NULL,delivered_at=?,updated_at=? WHERE event_id=? AND data_epoch=? AND status='pending'").bind(now,now,item.event_id,item.data_epoch)]))[0];
   if(ack.meta.changes===1)delivered++;
  }catch(error){
   if(error.code==='target_epoch_mismatch')continue;
   try{await coachBatch(db,item.account_id,item.data_epoch,now,[db.prepare('UPDATE coach_army_completion_outbox SET attempts=attempts+1,last_error=?,updated_at=? WHERE event_id=? AND data_epoch=?').bind('Delivery failed; retry pending.',now,item.event_id,item.data_epoch)]);}
   catch(ackError){if(ackError.code!=='target_epoch_mismatch')throw ackError;}
  }
 }
 return {attempted:rows.length,delivered,configured:true};
}
