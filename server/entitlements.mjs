import {fail} from './domain.mjs';
import {coachEpoch,coachBatch,coachConflict,requireCoachRow} from './coach-army-epochs.mjs';
const validId=v=>typeof v==='string'&&v.length>0&&v.length<=200&&v.trim()===v;
function validate(event){
 if(!event||event.eventType!=='coach_army.completed'||!validId(event.eventId)||!validId(event.accountId)||!Number.isSafeInteger(event.completedAt)||event.completedAt<1)fail('Invalid Coach Army completion event.');
 return coachEpoch(event.dataEpoch);
}
function completionStatements(db,event,epoch,now){
 return [
  db.prepare(`INSERT INTO coach_army_completions(event_id,user_id,completed_at,received_at,data_epoch) VALUES(?,?,?,?,?) ON CONFLICT(event_id) DO UPDATE SET completed_at=CASE WHEN coach_army_completions.user_id=excluded.user_id AND coach_army_completions.completed_at=excluded.completed_at AND coach_army_completions.data_epoch=excluded.data_epoch THEN coach_army_completions.completed_at ELSE NULL END`).bind(event.eventId,event.accountId,event.completedAt,now,epoch),
  db.prepare(`INSERT INTO account_entitlements(user_id,coach_army_status,coach_army_completed_at,coach_army_event_id,updated_at,data_epoch) VALUES(?,'completed',?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET coach_army_status='completed',coach_army_completed_at=MIN(COALESCE(account_entitlements.coach_army_completed_at,excluded.coach_army_completed_at),excluded.coach_army_completed_at),coach_army_event_id=CASE WHEN account_entitlements.coach_army_status='completed' THEN account_entitlements.coach_army_event_id ELSE excluded.coach_army_event_id END,updated_at=excluded.updated_at,data_epoch=excluded.data_epoch`).bind(event.accountId,event.completedAt,event.eventId,now,epoch)
 ];
}
async function completionIdentity(db,event,epoch){
 const old=await db.prepare('SELECT * FROM coach_army_completions WHERE event_id=?').bind(event.eventId).first();
 if(old&&(old.user_id!==event.accountId||old.completed_at!==event.completedAt||old.data_epoch!==epoch))coachConflict();
}
const result=(db,owner)=>db.prepare('SELECT coach_army_status AS status,coach_army_completed_at AS completedAt,coach_army_event_id AS eventId,data_epoch AS dataEpoch,user_id AS targetAccountId FROM account_entitlements WHERE user_id=?').bind(owner).first();
// Missing producer epoch is the fixed legacy generation 1, never current-on-arrival.
export async function recordCoachArmyCompletion(db,event,now=Date.now()){
 const epoch=validate(event);await completionIdentity(db,event,epoch);
 try{await coachBatch(db,event.accountId,epoch,now,completionStatements(db,event,epoch,now));}
 catch(error){await completionIdentity(db,event,epoch);throw error;}
 return result(db,event.accountId);
}

export async function readEntitlements(database,user){
  const row=await database.prepare('SELECT coach_army_status AS status,coach_army_completed_at AS completedAt,coach_army_event_id AS eventId FROM account_entitlements WHERE user_id=?').bind(user).first();
  const packs=await database.prepare("SELECT pack_id AS packId, granted_at AS grantedAt FROM account_pack_entitlements WHERE user_id=? AND status='owned' ORDER BY pack_id").bind(user).all();
  return {coachArmy:row?.status==='completed'&&Number.isSafeInteger(Number(row.completedAt))?{status:'completed',completedAt:Number(row.completedAt)}:null,ownedPacks:(packs.results||[]).filter(pack=>typeof pack.packId==='string'&&Number.isSafeInteger(Number(pack.grantedAt))).map(pack=>({packId:pack.packId,status:'owned',grantedAt:Number(pack.grantedAt)}))};
}


const randomToken=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');
const sha256=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');
export async function createCoachArmyBinding(db,{runId,accountId,eventId,completedAt,dataEpoch},now=Date.now()){
 const epoch=validate({eventType:'coach_army.completed',accountId,eventId,completedAt,dataEpoch});if(!validId(runId))fail('Invalid Coach Army binding.');
 const run=await db.prepare('SELECT completed_at FROM gala_runs WHERE id=?').bind(runId).first();
 if(!run?.completed_at||run.completed_at>completedAt)fail('Coach Army run is not authoritatively complete.',409);
 const existing=await db.prepare('SELECT * FROM coach_army_bindings WHERE event_id=?').bind(eventId).first();
 if(existing){
  if(existing.run_id!==runId||existing.account_id!==accountId||existing.completed_at!==completedAt||existing.data_epoch!==epoch)coachConflict();
  await coachBatch(db,accountId,epoch,now,[]);
  return {bindingId:existing.binding_id,claimToken:null,expiresAt:existing.expires_at,claimed:existing.claimed_at!=null,targetAccountId:accountId,dataEpoch:epoch};
 }
 const bindingId=crypto.randomUUID(),claimToken=randomToken(),expiresAt=now+300000;
 await coachBatch(db,accountId,epoch,now,[
  requireCoachRow(db,accountId,'SELECT 1 FROM gala_runs WHERE id=? AND completed_at IS NOT NULL AND completed_at<=?',[runId,completedAt]),
  db.prepare('INSERT INTO coach_army_bindings(binding_id,run_id,account_id,event_id,claim_hash,completed_at,expires_at,created_at,data_epoch) VALUES(?,?,?,?,?,?,?,?,?)').bind(bindingId,runId,accountId,eventId,await sha256(claimToken),completedAt,expiresAt,now,epoch)
 ]);
 return {bindingId,claimToken,expiresAt,claimed:false,targetAccountId:accountId,dataEpoch:epoch};
}
export async function claimCoachArmyBinding(db,{bindingId,claimToken,accountId,dataEpoch},now=Date.now()){
 if(!validId(bindingId)||typeof claimToken!=='string'||!validId(accountId))fail('Invalid Coach Army claim.');
 const known=await db.prepare('SELECT * FROM coach_army_bindings WHERE binding_id=?').bind(bindingId).first();
 if(!known||known.account_id!==accountId)fail('Coach Army binding does not belong to this account.',403);
 if(known.claimed_at!=null)fail('Coach Army binding was already claimed.',409);
 if(known.expires_at<=now)fail('Coach Army binding expired.',410);
 if(known.claim_hash!==await sha256(claimToken))fail('Invalid Coach Army claim.',401);
 const epoch=coachEpoch(known.data_epoch);if(dataEpoch!==undefined&&coachEpoch(dataEpoch)!==epoch)coachConflict();
 const event={eventType:'coach_army.completed',eventId:known.event_id,accountId,completedAt:known.completed_at,dataEpoch:epoch};
 await completionIdentity(db,event,epoch);
 await coachBatch(db,accountId,epoch,now,[
  requireCoachRow(db,accountId,'SELECT 1 FROM coach_army_bindings WHERE binding_id=? AND account_id=? AND claim_hash=? AND claimed_at IS NULL AND expires_at>? AND data_epoch=?',[bindingId,accountId,known.claim_hash,now,epoch]),
  db.prepare('UPDATE coach_army_bindings SET claimed_at=? WHERE binding_id=?').bind(now,bindingId),
  ...completionStatements(db,event,epoch,now)
 ]);
 return result(db,accountId);
}
