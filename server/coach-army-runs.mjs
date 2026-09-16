import {fail} from './domain.mjs';

// This is the order currently used by P08's run-progress.js/gala.mjs.  A
// verifier may attest terminal actions; a browser may only journal its own
// progress and can never turn that journal into an entitlement.
export const COACH_ARMY_STAGES=['djscratch','goon','lilboyfriend','corgi','hand','armie'];
const eventId=value=>typeof value==='string'&&/^[A-Za-z0-9._:-]{1,200}$/.test(value);
async function safe(database,row){const events=(await database.prepare('SELECT stage FROM coach_army_run_events WHERE run_id=? ORDER BY sequence').bind(row.id).all()).results;return {id:row.id,startedAt:Number(row.started_at),completedAt:row.completed_at==null?null:Number(row.completed_at),completed:row.completed_at!=null,stages:events.map(event=>event.stage)};}
async function row(database,id,accountId){const run=await database.prepare('SELECT * FROM coach_army_runs WHERE id=? AND account_id=?').bind(id,accountId).first();if(!run)fail('Coach Army run not found.',404);return run;}
export async function startCoachArmyRun(database,accountId,now=Date.now()){
 const id=crypto.randomUUID();await database.prepare('INSERT INTO coach_army_runs(id,account_id,started_at,updated_at) VALUES(?,?,?,?)').bind(id,accountId,now,now).run();return safe(database,await row(database,id,accountId));
}
export async function readCoachArmyRun(database,id,accountId){return safe(database,await row(database,id,accountId));}
async function writeEvent(database,{runId,accountId,eventId: id,sequence,stage,source},now){
 if(!eventId(id)||!Number.isSafeInteger(sequence)||sequence<1||!COACH_ARMY_STAGES.includes(stage)||!['browser','verifier'].includes(source))fail('Invalid Coach Army progress event.');
 const run=await row(database,runId,accountId);if(run.completed_at) return {run:await safe(database,run),replay:true};
 const old=await database.prepare('SELECT run_id,account_id,sequence,stage,source FROM coach_army_run_events WHERE event_id=?').bind(id).first();
 if(old){if(old.run_id!==runId||old.account_id!==accountId||Number(old.sequence)!==sequence||old.stage!==stage||old.source!==source)fail('Coach Army event id was reused.',409);return {run:await safe(database,run),replay:true};}
 const previous=await database.prepare('SELECT sequence,stage,source FROM coach_army_run_events WHERE run_id=? ORDER BY sequence DESC LIMIT 1').bind(runId).first();
 const expected=previous?Number(previous.sequence)+1:1;
 if(sequence!==expected||stage!==COACH_ARMY_STAGES[expected-1])fail('Coach Army progress is out of order.',409);
 await database.prepare('INSERT INTO coach_army_run_events(event_id,run_id,account_id,sequence,stage,source,received_at) VALUES(?,?,?,?,?,?,?)').bind(id,runId,accountId,sequence,stage,source,now).run();
 await database.prepare('UPDATE coach_army_runs SET updated_at=? WHERE id=?').bind(now,runId).run();
 // Browser reports deliberately stop here. No client assertion, local state or
 // IP-derived identity can satisfy the completion evidence requirement.
 if(source==='browser')return {run:await safe(database,await row(database,runId,accountId)),replay:false,evidence:'pending_verifier'};
 if(stage!=='armie')return {run:await safe(database,await row(database,runId,accountId)),replay:false};
 const events=(await database.prepare("SELECT stage,source FROM coach_army_run_events WHERE run_id=? ORDER BY sequence").bind(runId).all()).results;
 if(events.length!==COACH_ARMY_STAGES.length||events.some((e,i)=>e.stage!==COACH_ARMY_STAGES[i]||e.source!=='verifier'))fail('Complete verifier evidence is required.',409);
 const completionEventId=`coach-army-run:${runId}`;
 await database.prepare('UPDATE coach_army_runs SET completed_at=COALESCE(completed_at,?),completion_event_id=COALESCE(completion_event_id,?),updated_at=? WHERE id=?').bind(now,completionEventId,now,runId).run();
 await database.prepare("INSERT INTO coach_army_completion_outbox(event_id,run_id,account_id,completed_at,status,updated_at) VALUES(?,?,?,?, 'pending',?) ON CONFLICT(event_id) DO NOTHING").bind(completionEventId,runId,accountId,now,now).run();
 return {run:await safe(database,await row(database,runId,accountId)),replay:false,outbox:'pending'};
}
export const recordBrowserCoachArmyEvent=(database,input,accountId,now)=>writeEvent(database,{...input,accountId,source:'browser'},now);
export const recordVerifiedCoachArmyEvent=(database,input,now)=>writeEvent(database,{...input,source:'verifier'},now);
const DJ_SEQUENCE=Object.freeze([['bass',8],['treble',3],['volume',7],['tempo',9]]);
const control=value=>typeof value==='string'&&DJ_SEQUENCE.some(([key])=>key===value);
// A browser can only attest its submitted transitions. This verifies the software
// objective, account/session ownership, ordering, and expiry—not physical play.
export async function startDjscratchChallenge(database,runId,accountId,now=Date.now()){
 const run=await row(database,runId,accountId);if(run.completed_at)fail('Coach Army run is complete.',409);const id=crypto.randomUUID(),expiresAt=now+600000;
 const active=await database.prepare("SELECT id,expires_at,next_step FROM coach_army_djscratch_challenges WHERE run_id=? AND account_id=? AND status='active' AND expires_at>? ORDER BY created_at DESC LIMIT 1").bind(runId,accountId,now).first();
 // Reopening a live mix reads its authoritative progress; it must not replace
 // a challenge whose accepted reply was merely lost by the browser.
 if(active)return {id:active.id,expiresAt:Number(active.expires_at),nextStep:Number(active.next_step),steps:DJ_SEQUENCE.map(([key,value])=>({key,value}))};
 await database.prepare("UPDATE coach_army_djscratch_challenges SET status='superseded',updated_at=? WHERE run_id=? AND account_id=? AND status='active'").bind(now,runId,accountId).run();
 await database.prepare("INSERT INTO coach_army_djscratch_challenges(id,run_id,account_id,expires_at,next_step,status,created_at,updated_at) VALUES(?,?,?,?,0,'active',?,?)").bind(id,runId,accountId,expiresAt,now,now).run();return {id,expiresAt,steps:DJ_SEQUENCE.map(([key,value])=>({key,value}))};
}
export async function recordDjscratchControl(database,{runId,challengeId,key,value},accountId,now=Date.now()){
 if(typeof challengeId!=='string'||!eventId(challengeId)||!control(key)||!Number.isSafeInteger(value)||value<0||value>10)fail('Invalid DJ Scratch control evidence.');
 const challenge=await database.prepare('SELECT * FROM coach_army_djscratch_challenges WHERE id=? AND run_id=? AND account_id=?').bind(challengeId,runId,accountId).first();if(!challenge)fail('DJ Scratch challenge not found.',404);
 if(Number(challenge.expires_at)<=now){await database.prepare("UPDATE coach_army_djscratch_challenges SET status='expired',updated_at=? WHERE id=? AND status='active'").bind(now,challengeId).run();fail('DJ Scratch challenge expired.',409);}
 if(challenge.status==='completed')return {run:await readCoachArmyRun(database,runId,accountId),replay:true,accepted:true,complete:true,nextStep:DJ_SEQUENCE.length};if(challenge.status!=='active')fail('DJ Scratch challenge is no longer active.',409);
 const step=Number(challenge.next_step),[expectedKey,expectedValue]=DJ_SEQUENCE[step]||[];
 // Each sequence control is unique. An earlier matching control is therefore
 // only a replay of an accepted transition, never permission to advance again.
 if(key!==expectedKey||value!==expectedValue){const replay=DJ_SEQUENCE.slice(0,step).some(([priorKey,priorValue])=>key===priorKey&&value===priorValue);return {run:await readCoachArmyRun(database,runId,accountId),accepted:replay,replay,complete:false,nextStep:step};}
 const previous=Number(challenge.next_step),next=previous+1,advanced=await database.prepare('UPDATE coach_army_djscratch_challenges SET next_step=?,updated_at=? WHERE id=? AND status=? AND next_step=?').bind(next,now,challengeId,'active',previous).run();
 if(Number(advanced.meta?.changes||0)!==1){const current=await database.prepare('SELECT status,next_step FROM coach_army_djscratch_challenges WHERE id=? AND run_id=? AND account_id=?').bind(challengeId,runId,accountId).first();if(current?.status==='completed')return {run:await readCoachArmyRun(database,runId,accountId),replay:true,accepted:true,complete:true,nextStep:DJ_SEQUENCE.length};if(current?.status==='active')return {run:await readCoachArmyRun(database,runId,accountId),replay:true,accepted:true,complete:false,nextStep:Number(current.next_step)};fail('DJ Scratch control was already processed.',409);}
 if(next<DJ_SEQUENCE.length)return {run:await readCoachArmyRun(database,runId,accountId),accepted:true,complete:false,nextStep:next};
 await database.prepare("UPDATE coach_army_djscratch_challenges SET status='completed',completed_at=?,updated_at=? WHERE id=?").bind(now,now,challengeId).run();const verified=await recordVerifiedCoachArmyEvent(database,{runId,accountId,eventId:`djscratch:${challengeId}`,sequence:1,stage:'djscratch'},now);return {run:verified.run,accepted:true,complete:true,replay:verified.replay,nextStep:DJ_SEQUENCE.length};
}
export async function deliverCoachArmyOutbox(database,env,now=Date.now()){
 const rows=(await database.prepare("SELECT * FROM coach_army_completion_outbox WHERE status='pending' ORDER BY updated_at LIMIT 25").all()).results;
 if(!env.COACH_ARMY_ENTITLEMENT_URL||!env.COACH_ARMY_ENTITLEMENT_TOKEN)return {attempted:0,delivered:0,configured:false};
 let delivered=0;for(const item of rows){try{const response=await fetch(env.COACH_ARMY_ENTITLEMENT_URL,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${env.COACH_ARMY_ENTITLEMENT_TOKEN}`},body:JSON.stringify({eventType:'coach_army.completed',eventId:item.event_id,accountId:item.account_id,completedAt:Number(item.completed_at)})});if(!response.ok)throw Error(`Entitlement receiver returned ${response.status}.`);await database.prepare("UPDATE coach_army_completion_outbox SET status='delivered',attempts=attempts+1,last_error=NULL,delivered_at=?,updated_at=? WHERE event_id=?").bind(now,now,item.event_id).run();delivered++;}catch(error){await database.prepare('UPDATE coach_army_completion_outbox SET attempts=attempts+1,last_error=?,updated_at=? WHERE event_id=?').bind(String(error.message||'Delivery failed.').slice(0,500),now,item.event_id).run();}}
 return {attempted:rows.length,delivered,configured:true};
}
