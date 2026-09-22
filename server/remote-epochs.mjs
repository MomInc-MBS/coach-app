// PROPOSAL: transaction proof primitives only, not HTTP integration or auth.
// All statements supplied by callers MUST be owner-bound trusted SQL.
export class RemoteEpochError extends Error {
 constructor(code){super(code);this.code=code;this.name='RemoteEpochError';}
}
const fail=code=>{throw new RemoteEpochError(code);};
function validate(owner,epoch,now){
 if(typeof owner!=='string'||!owner||owner.length>512||owner.trim()!==owner)fail('invalid_owner');
 if(!Number.isSafeInteger(epoch)||epoch<1)fail('invalid_epoch');
 if(!Number.isSafeInteger(now)||now<0)fail('invalid_time');
}
const provision=(db,owner,now)=>db.prepare('INSERT INTO account_data_epochs(owner_id,epoch,updated_at) VALUES(?,1,?) ON CONFLICT(owner_id) DO NOTHING').bind(owner,now);
// NOT NULL violation fails the *whole batch*, unlike an ineffective zero-row guard.
const guard=(db,owner,epoch)=>db.prepare('UPDATE account_data_epochs SET epoch=CASE WHEN epoch=? THEN epoch ELSE NULL END WHERE owner_id=?').bind(epoch,owner);
export async function epochFencedBatch(db,{ownerId,expectedDataEpoch,now,statements}){
 validate(ownerId,expectedDataEpoch,now);if(!Array.isArray(statements))fail('invalid_statements');
 try{
  const result=await db.batch([provision(db,ownerId,now),guard(db,ownerId,expectedDataEpoch),...statements]);
  return result.slice(2);
 }catch(error){
  const row=await db.prepare('SELECT epoch FROM account_data_epochs WHERE owner_id=?').bind(ownerId).first();
  if((row?.epoch??1)!==expectedDataEpoch)fail('target_epoch_mismatch');
  throw error;
 }
}
// A caller must authenticate the primary service and derive this proof from its
// retained D1 receipts. Client headers/body are NOT acceptable proof authority.
export async function reconcileRemoteEpoch(db,{ownerId,currentDataEpoch,deletedThroughEpoch,now,deletions}){
 validate(ownerId,currentDataEpoch,now);
 if(deletedThroughEpoch!==currentDataEpoch-1||!Array.isArray(deletions))fail('invalid_proof');
 for(let attempt=0;attempt<4;attempt++){
  const row=await db.prepare('SELECT epoch FROM account_data_epochs WHERE owner_id=?').bind(ownerId).first();
  const observed=row?.epoch??1;
  if(observed>=currentDataEpoch)return {ownerId,currentDataEpoch:observed,deletedThroughEpoch:observed-1,reconciled:false};
  try{
   await db.batch([
    provision(db,ownerId,now),guard(db,ownerId,observed),
    ...deletions,
    db.prepare('UPDATE account_data_epochs SET epoch=?,updated_at=? WHERE owner_id=?').bind(currentDataEpoch,now,ownerId),
    db.prepare('INSERT INTO account_data_deletions(owner_id,deleted_epoch,deleted_at) VALUES(?,?,?)').bind(ownerId,deletedThroughEpoch,now),
   ]);
   return {ownerId,currentDataEpoch,deletedThroughEpoch,reconciled:true};
  }catch(error){
   const latest=await db.prepare('SELECT epoch FROM account_data_epochs WHERE owner_id=?').bind(ownerId).first();
   if((latest?.epoch??1)===observed)throw error; // Actual data-deletion error, not a CAS race.
  }
 }
 fail('remote_epoch_busy');
}
