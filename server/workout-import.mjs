import {WorkoutImportCodecError,validateImportSnapshot,fingerprintImportSnapshot,importIdempotencyKey,canonicalImportKey} from '../workout-import-codec.mjs';
import {readAccountDataEpoch,inspectAccountDataEpoch} from './account-data-epochs.mjs';

export class WorkoutImportError extends Error {
 constructor(code,status=400){super(code);this.name='WorkoutImportError';this.code=code;this.status=status;}
}
const fail=(code,status)=>{throw new WorkoutImportError(code,status);};
function requestBody(raw){
 try{
  if(!raw||typeof raw!=='object'||Array.isArray(raw)||![Object.prototype,null].includes(Object.getPrototypeOf(raw)))fail('invalid_workout_import');
  const descriptors=Object.getOwnPropertyDescriptors(raw),keys=['digestVersion','targetDataEpoch','snapshot','fingerprint'];
  if(Reflect.ownKeys(descriptors).length!==keys.length||keys.some(key=>!descriptors[key]||!Object.hasOwn(descriptors[key],'value')||!descriptors[key].enumerable))fail('invalid_workout_import');
  return Object.fromEntries(keys.map(key=>[key,descriptors[key].value]));
 }catch{fail('invalid_workout_import');}
}
function response(row,status){
 const {id,user_id,mode,goal,started_at,completed_at,value,active,source,client_workout_id,competitive_status}=row;
 return {status,workout:{id,user_id,mode,goal,started_at,completed_at,value,active,source,client_workout_id,competitive_status},
  receipt:{targetAccountId:user_id,targetDataEpoch:row.account_data_epoch,digestVersion:row.digest_version,fingerprint:row.fingerprint,idempotencyKey:row.idempotency_key}};
}
const lookup=(database,ownerId,clientWorkoutId)=>database.prepare(`
 SELECT w.*,i.idempotency_key,i.fingerprint,i.digest_version,i.account_data_epoch,COALESCE(e.epoch,1) AS current_data_epoch
 FROM workouts w LEFT JOIN workout_imports i ON i.workout_id=w.id
 LEFT JOIN account_data_epochs e ON e.owner_id=w.user_id
 WHERE w.user_id=? AND w.client_workout_id=?`).bind(ownerId,clientWorkoutId).first();
function compare(row,request){
 if(row.current_data_epoch!==request.targetDataEpoch)fail('target_epoch_mismatch',409);
 if(row.source!=='guest_import'||row.competitive_status!=='not_eligible'||row.fingerprint!==request.fingerprint||row.idempotency_key!==request.idempotencyKey||row.digest_version!==request.digestVersion||row.account_data_epoch!==request.targetDataEpoch)fail('fingerprint_conflict',409);
}

// This helper does not authenticate requests. The caller must gate the route,
// validate origin/auth, and supply its canonical authenticated owner. The target
// assertion is only a consistency check and cannot select another owner.
export async function importWorkout(database,{ownerId,targetAccountId,idempotencyKey,body,now=Date.now()}){
 if(typeof ownerId!=='string'||!ownerId||ownerId.length>512||ownerId.trim()!==ownerId||/[\u0000-\u001f\u007f]/.test(ownerId))fail('invalid_authenticated_owner',500);
 if(targetAccountId!==ownerId)fail('target_account_mismatch',409);
 if(!Number.isSafeInteger(now)||now<0)fail('invalid_server_time',500);
 let request;
 try{
  const input=requestBody(body),snapshot=validateImportSnapshot(input.snapshot);
  const keyInput={digestVersion:input.digestVersion,targetAccountId:ownerId,targetDataEpoch:input.targetDataEpoch,clientWorkoutId:snapshot.clientWorkoutId,fingerprint:input.fingerprint};
  canonicalImportKey(keyInput);
  if(typeof idempotencyKey!=='string'||!(/^[0-9a-f]{64}$/).test(idempotencyKey))fail('invalid_idempotency_key');
  const fingerprint=await fingerprintImportSnapshot(snapshot,input.digestVersion);
  if(fingerprint!==input.fingerprint)fail('invalid_fingerprint');
  if(await importIdempotencyKey(keyInput)!==idempotencyKey)fail('invalid_idempotency_key');
  request={snapshot,digestVersion:input.digestVersion,targetDataEpoch:input.targetDataEpoch,fingerprint,idempotencyKey};
 }catch(error){if(error instanceof WorkoutImportCodecError)fail(error.code,error.code==='crypto_unavailable'?500:400);throw error;}
 const {snapshot}=request;
 const prior=await lookup(database,ownerId,snapshot.clientWorkoutId);
 if(prior){compare(prior,request);return response(prior,200);}

 // Version 1 adds no age/freshness or goal-completion policy beyond the pinned
 // codec. Partial personal history remains valid and never becomes authoritative.
 await readAccountDataEpoch(database,ownerId,now);
 const id=globalThis.crypto.randomUUID();
 await database.batch([
  database.prepare(`INSERT INTO workouts(id,user_id,mode,goal,started_at,completed_at,value,active,source,client_workout_id,competitive_status)
   SELECT ?,?,?,?,?,?,?,?,'guest_import',?,NULL FROM account_data_epochs WHERE owner_id=? AND epoch=?
   ON CONFLICT(user_id,client_workout_id) WHERE client_workout_id IS NOT NULL DO NOTHING`).bind(id,ownerId,snapshot.mode,snapshot.goal,snapshot.startedAt,snapshot.completedAt,snapshot.value,snapshot.activeSeconds,snapshot.clientWorkoutId,ownerId,request.targetDataEpoch),
  database.prepare(`INSERT INTO workout_imports(workout_id,idempotency_key,fingerprint,digest_version,account_data_epoch,created_at)
   SELECT id,?,?,?,?,? FROM workouts WHERE id=? AND user_id=?`).bind(request.idempotencyKey,request.fingerprint,request.digestVersion,request.targetDataEpoch,now,id,ownerId),

 ]);
 const persisted=await lookup(database,ownerId,snapshot.clientWorkoutId);
 if(!persisted){
  const epoch=await inspectAccountDataEpoch(database,ownerId);
  if(epoch.currentDataEpoch!==request.targetDataEpoch)fail('target_epoch_mismatch',409);
  fail('import_not_persisted',500);
 }
 compare(persisted,request);
 return response(persisted,persisted.id===id?201:200);
}
