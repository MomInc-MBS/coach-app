// Primary-D1 foundation only. A route must supply an authenticated canonical
// owner and its own owner-bound statements; this module performs no remote I/O.
export class AccountDataEpochError extends Error {
 constructor(code, message=code, options){super(message,options);this.name='AccountDataEpochError';this.code=code;}
}
const fail=code=>{throw new AccountDataEpochError(code);};
const owner=value=>{if(typeof value!=='string'||!value||value.length>512||value.trim()!==value)fail('invalid-owner');return value;};
const safeEpoch=value=>{if(!Number.isSafeInteger(value)||value<1)fail('invalid-epoch');return value;};
const safeTime=value=>{if(!Number.isSafeInteger(value)||value<0)fail('invalid-time');return value;};
const provision=(database,ownerId,now)=>database.prepare('INSERT INTO account_data_epochs(owner_id,epoch,updated_at) VALUES(?,1,?) ON CONFLICT(owner_id) DO NOTHING').bind(ownerId,now);

// One SQL statement gives a coherent snapshot when another deletion commits.
// Missing rows mean untouched legacy epoch 1, never a deletion confirmation.
export async function inspectAccountDataEpoch(database,ownerId){
 ownerId=owner(ownerId);
 const row=await database.prepare('SELECT e.epoch, (SELECT MAX(d.deleted_epoch) FROM account_data_deletions d WHERE d.owner_id=e.owner_id) AS deleted_through_epoch FROM account_data_epochs e WHERE e.owner_id=?').bind(ownerId).first();
 if(!row)return {ownerId,currentDataEpoch:1,deletedThroughEpoch:0};
 const currentDataEpoch=safeEpoch(row.epoch),deletedThroughEpoch=row.deleted_through_epoch??0;
 if(!Number.isSafeInteger(deletedThroughEpoch)||deletedThroughEpoch<0||deletedThroughEpoch!==currentDataEpoch-1)fail('epoch-history-corrupt');
 return {ownerId,currentDataEpoch,deletedThroughEpoch};
}
export async function readAccountDataEpoch(database,ownerId,now){
 ownerId=owner(ownerId);now=safeTime(now);
 await provision(database,ownerId,now).run();
 return inspectAccountDataEpoch(database,ownerId);
}

// Keep every primary data deletion in this same batch. A zero-row SELECT is
// NOT a guard: the receipt's NOT NULL constraint aborts the entire transaction.
// Receipts/epoch tombstones must never be included in the supplied deletions.
export async function deleteAccountDataAtEpoch(database,{ownerId,expectedDataEpoch,now,deletions}){
 ownerId=owner(ownerId);expectedDataEpoch=safeEpoch(expectedDataEpoch);now=safeTime(now);
 if(expectedDataEpoch===Number.MAX_SAFE_INTEGER)fail('epoch-overflow');
 if(!Array.isArray(deletions))fail('invalid-deletions');
 const observed=await inspectAccountDataEpoch(database,ownerId);
 if(expectedDataEpoch>observed.currentDataEpoch)fail('epoch-mismatch');
 if(expectedDataEpoch<observed.currentDataEpoch)return {...observed,alreadyDeleted:true};
 try{
  await database.batch([
   provision(database,ownerId,now),
   database.prepare('INSERT INTO account_data_deletions(owner_id,deleted_epoch,deleted_at) VALUES(?,(SELECT epoch FROM account_data_epochs WHERE owner_id=? AND epoch=?),?)').bind(ownerId,ownerId,expectedDataEpoch,now),
   database.prepare('UPDATE account_data_epochs SET epoch=epoch+1,updated_at=? WHERE owner_id=? AND epoch=?').bind(now,ownerId,expectedDataEpoch),
   ...deletions,
  ]);
  return {ownerId,currentDataEpoch:expectedDataEpoch+1,deletedThroughEpoch:expectedDataEpoch,alreadyDeleted:false};
 }catch(error){
  const current=await inspectAccountDataEpoch(database,ownerId);
  if(current.currentDataEpoch>expectedDataEpoch)return {...current,alreadyDeleted:true};
  if(current.currentDataEpoch<expectedDataEpoch)fail('epoch-mismatch');
  throw error;
 }
}
