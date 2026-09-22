import {epochFencedBatch} from './remote-epochs.mjs';
export function coachEpoch(value=1){
 if(!Number.isSafeInteger(value)||value<1)throw Object.assign(Error('Invalid Coach Army generation.'),{status:422,code:'invalid_account_epoch'});
 return value;
}
export function coachConflict(){throw Object.assign(Error('Coach Army state changed. Refresh before retrying.'),{status:409,code:'coach_army_conflict'});}
// Each predicate is fixed SQL supplied by the owning helper, never request SQL.
export const requireCoachRow=(db,owner,select,values)=>db.prepare(`UPDATE account_data_epochs SET epoch=CASE WHEN EXISTS(${select}) THEN epoch ELSE NULL END WHERE owner_id=?`).bind(...values,owner);
export async function coachBatch(db,owner,epoch,now,statements){
 try{return await epochFencedBatch(db,{ownerId:owner,expectedDataEpoch:coachEpoch(epoch),now,statements});}
 catch(error){if(error.code==='target_epoch_mismatch')throw Object.assign(error,{status:409});throw error;}
}
