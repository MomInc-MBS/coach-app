import {fail} from './domain.mjs';

// Contract: the trusted Coach Army service posts one `coach_army.completed`
// event after its own completion authority has accepted the run. The caller
// supplies the already-resolved Coach owner id; this worker never derives it
// from Gala, onboarding, or a client claim.
export async function recordCoachArmyCompletion(database,event,now=Date.now()){
  if(!event||event.eventType!=='coach_army.completed'||typeof event.eventId!=='string'||event.eventId.length<1||event.eventId.length>200||typeof event.accountId!=='string'||event.accountId.length<1||event.accountId.length>200||!Number.isSafeInteger(event.completedAt)||event.completedAt<1)fail('Invalid Coach Army completion event.');
  await database.prepare('INSERT INTO coach_army_completions(event_id,user_id,completed_at,received_at) VALUES(?,?,?,?) ON CONFLICT(event_id) DO NOTHING').bind(event.eventId,event.accountId,event.completedAt,now).run();
  await database.prepare('INSERT INTO account_entitlements(user_id,coach_army_status,coach_army_completed_at,coach_army_event_id,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET coach_army_status=\'completed\',coach_army_completed_at=CASE WHEN account_entitlements.coach_army_event_id=excluded.coach_army_event_id THEN account_entitlements.coach_army_completed_at ELSE MIN(account_entitlements.coach_army_completed_at,excluded.coach_army_completed_at) END,coach_army_event_id=CASE WHEN account_entitlements.coach_army_status=\'completed\' THEN account_entitlements.coach_army_event_id ELSE excluded.coach_army_event_id END,updated_at=excluded.updated_at').bind(event.accountId,'completed',event.completedAt,event.eventId,now).run();
  return database.prepare('SELECT coach_army_status AS status,coach_army_completed_at AS completedAt,coach_army_event_id AS eventId FROM account_entitlements WHERE user_id=?').bind(event.accountId).first();
}

export async function readEntitlements(database,user){
  const row=await database.prepare('SELECT coach_army_status AS status,coach_army_completed_at AS completedAt,coach_army_event_id AS eventId FROM account_entitlements WHERE user_id=?').bind(user).first();
  const packs=await database.prepare("SELECT pack_id AS packId, granted_at AS grantedAt FROM account_pack_entitlements WHERE user_id=? AND status='owned' ORDER BY pack_id").bind(user).all();
  return {coachArmy:row?.status==='completed'&&Number.isSafeInteger(Number(row.completedAt))?{status:'completed',completedAt:Number(row.completedAt)}:null,ownedPacks:(packs.results||[]).filter(pack=>typeof pack.packId==='string'&&Number.isSafeInteger(Number(pack.grantedAt))).map(pack=>({packId:pack.packId,status:'owned',grantedAt:Number(pack.grantedAt)}))};
}

const randomToken=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');
const sha256=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');
// Only the trusted Coach Army service may mint a binding. The browser can only
// consume its opaque token as the exact authenticated account recorded here.
export async function createCoachArmyBinding(database,{runId,accountId,eventId,completedAt},now=Date.now()){
  if(typeof runId!=='string'||runId.length<1||runId.length>200||typeof accountId!=='string'||accountId.length<1||accountId.length>200||typeof eventId!=='string'||eventId.length<1||eventId.length>200||!Number.isSafeInteger(completedAt)||completedAt<1)fail('Invalid Coach Army binding.');
  const run=await database.prepare('SELECT id,completed_at FROM gala_runs WHERE id=?').bind(runId).first();
  if(!run?.completed_at||Number(run.completed_at)>completedAt)fail('Coach Army run is not authoritatively complete.',409);
  const existing=await database.prepare('SELECT binding_id,expires_at,claimed_at FROM coach_army_bindings WHERE event_id=?').bind(eventId).first();
  if(existing)return {bindingId:existing.binding_id,claimToken:null,expiresAt:Number(existing.expires_at),claimed:!!existing.claimed_at};
  const bindingId=crypto.randomUUID(),claimToken=randomToken(),expiresAt=now+5*60*1000;
  await database.prepare('INSERT INTO coach_army_bindings(binding_id,run_id,account_id,event_id,claim_hash,completed_at,expires_at,created_at) VALUES(?,?,?,?,?,?,?,?)').bind(bindingId,runId,accountId,eventId,await sha256(claimToken),completedAt,expiresAt,now).run();
  return {bindingId,claimToken,expiresAt,claimed:false};
}
export async function claimCoachArmyBinding(database,{bindingId,claimToken,accountId},now=Date.now()){
  if(typeof bindingId!=='string'||typeof claimToken!=='string'||typeof accountId!=='string')fail('Invalid Coach Army claim.');
  const row=await database.prepare('UPDATE coach_army_bindings SET claimed_at=? WHERE binding_id=? AND account_id=? AND claim_hash=? AND claimed_at IS NULL AND expires_at>? RETURNING event_id,completed_at').bind(now,bindingId,accountId,await sha256(claimToken),now).first();
  if(!row){const known=await database.prepare('SELECT claimed_at,expires_at,account_id FROM coach_army_bindings WHERE binding_id=?').bind(bindingId).first();if(!known||known.account_id!==accountId)fail('Coach Army binding does not belong to this account.',403);if(known.claimed_at)fail('Coach Army binding was already claimed.',409);if(Number(known.expires_at)<=now)fail('Coach Army binding expired.',410);fail('Invalid Coach Army claim.',401);}
  return recordCoachArmyCompletion(database,{eventType:'coach_army.completed',eventId:row.event_id,accountId,completedAt:Number(row.completed_at)},now);
}
