import {ImportAssignmentError,claimAssignment,recordImportOutcome,releaseAssignment,assignmentStatus} from './import-assignment.mjs';

// Layout version is independent of the unchanged v1 workout row schema.
export const IMPORT_LEDGER_STORES=Object.freeze({
 guestHistoryDecisions:'[sourceOwnerId+decisionId],sourceOwnerId',
 guestHistoryItems:'&itemId,&claimId,&[sourceOwnerId+decisionId+clientWorkoutId],&[sourceOwnerId+clientWorkoutId+generation],sourceOwnerId',
 guestHistoryEvents:'++sequence,sourceOwnerId,claimId',
 guestHistoryAssignmentHeads:'[sourceOwnerId+clientWorkoutId],sourceOwnerId',
});
export const importLedgerTables=db=>Object.keys(IMPORT_LEDGER_STORES).map(name=>db.table(name));
export async function readImportLedger(db,sourceOwnerId,StorageError){
 const read=async name=>(await db.table(name).where('sourceOwnerId').equals(sourceOwnerId).toArray()).map(row=>{if(row.schemaVersion!==1)throw new StorageError('invalid-record','Unsupported import ledger row schema.',{recoverable:true});const {schemaVersion,...value}=row;return value;});
 const [decisions,items,eventRows,heads]=await Promise.all(Object.keys(IMPORT_LEDGER_STORES).map(read));
 const compare=(a,b)=>a<b?-1:a>b?1:0;
 decisions.sort((a,b)=>compare(a.sourceOwnerId,b.sourceOwnerId)||compare(a.decisionId,b.decisionId));
 heads.sort((a,b)=>compare(a.sourceOwnerId,b.sourceOwnerId)||compare(a.clientWorkoutId,b.clientWorkoutId));
 items.sort((a,b)=>compare(a.sourceOwnerId,b.sourceOwnerId)||compare(a.clientWorkoutId,b.clientWorkoutId)||a.generation-b.generation);
 return {decisions,heads,items,events:eventRows.sort((a,b)=>a.sequence-b.sequence).map(({sequence,sourceOwnerId,...event})=>event)};
}
export async function deleteImportLedger(db,sourceOwnerId){
 const counts={};
 for(const name of Object.keys(IMPORT_LEDGER_STORES))counts[name]=await db.table(name).where('sourceOwnerId').equals(sourceOwnerId).delete();
 return counts;
}
export function createImportLedger({db,ownerId,deviceId,getWorkout,transact,StorageError,classifyError}){
 const tables=importLedgerTables(db);
 const policy=fn=>{try{return fn();}catch(error){if(error instanceof ImportAssignmentError)throw new StorageError(error.code,error.message,{cause:error,recoverable:true});throw error;}};
 const invalid=message=>{throw new StorageError('invalid-record',message,{recoverable:true});};
 // getWorkout must only read the workouts table and open no nested write
 // transaction. Repository supplies its internal owner-scoped validator.
 const readOperation=async(label,fn)=>{try{return await fn();}catch(error){throw classifyError(error,label);}};
 const source=async clientWorkoutId=>{
  const workout=await getWorkout(clientWorkoutId);
  if(!ownerId.startsWith('guest:')||!workout||workout.status!=='completed'||workout.id!==workout.clientWorkoutId||workout.ownerId!==ownerId||workout.deviceId!==deviceId)invalid('Import source must be a completed workout owned by this guest and device.');
  return workout;
 };
 const persist=async(before,after)=>{
  // Assert append-only policy output before any writes, including all head keys.
  const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),headKey=head=>JSON.stringify([head.sourceOwnerId,head.clientWorkoutId]);
  for(const key of ['items','events'])if(after[key].length<before[key].length||before[key].some((entry,index)=>!same(entry,after[key][index])))invalid('Import policy attempted to change immutable history.');
  const nextKeys=after.heads.map(headKey);
  if(after.heads.length<before.heads.length||new Set(nextKeys).size!==nextKeys.length||before.heads.some(head=>!nextKeys.includes(headKey(head))))invalid('Import policy attempted to remove an assignment head.');
  if(after.items.slice(before.items.length).some(item=>item.sourceOwnerId!==ownerId)||after.heads.some(head=>head.sourceOwnerId!==ownerId))invalid('Import policy output has a mismatched source owner.');
  // Immutable rows are appended only; head replacement is the sole mutation.
  for(const item of after.items.slice(before.items.length))await db.guestHistoryItems.add({...item,schemaVersion:1});
  for(const event of after.events.slice(before.events.length))await db.guestHistoryEvents.add({...event,sourceOwnerId:ownerId,schemaVersion:1});
  for(const head of after.heads){
   const old=before.heads.find(candidate=>candidate.sourceOwnerId===head.sourceOwnerId&&candidate.clientWorkoutId===head.clientWorkoutId);
   if(JSON.stringify(old)!==JSON.stringify(head))await db.guestHistoryAssignmentHeads.put({...head,schemaVersion:1});
  }
 };
 const transition=(label,fn)=>transact(label,tables,async()=>{
  const before=await readImportLedger(db,ownerId,StorageError),result=policy(()=>fn(before));
  await persist(before,result.state);
  return {item:result.item,duplicate:result.duplicate,status:assignmentStatus(result.state,result.item.claimId)};
 });
 return Object.freeze({
  // Call before any asynchronous hashing. The revision is rechecked inside the
  // claim transaction. Snapshot/digest derivation belongs to the future trusted
  // import-preparation adapter; this layer never hashes or starts a upload.
  async prepareImportAssignment(clientWorkoutId){
   return readOperation('Import assignment preparation',()=>db.transaction('r',db.workouts,async()=>{const workout=await source(clientWorkoutId);return {workout,sourceRevision:JSON.stringify(workout)};}));
  },
  async claimImportAssignment(input,{sourceRevision}={}){
   // First capture/validate input through policy, without reading raw accessors.
   const {generation,decision,...captured}=policy(()=>claimAssignment({heads:[],items:[],events:[]},input)).item;
   const claim={...captured,completed:true};
   if(claim.sourceOwnerId!==ownerId||claim.sourceDeviceId!==deviceId)invalid('Import source scope does not match.');
   return transact('Import assignment claim',[db.workouts,...tables],async()=>{
    const before=await readImportLedger(db,ownerId,StorageError),result=policy(()=>claimAssignment(before,claim));
    // Exact historical retries return the original item even if its source has
    // since changed. The policy rejects any altered retry before this return.
    if(result.duplicate)return {item:result.item,duplicate:true,status:assignmentStatus(result.state,result.item.claimId)};
    if(typeof sourceRevision!=='string')invalid('A prepared source revision is required.');
    const workout=await source(claim.clientWorkoutId);
    if(JSON.stringify(workout)!==sourceRevision)invalid('Import source changed after preparation.');
    const header={sourceOwnerId:ownerId,decisionId:claim.decisionId,sourceDeviceId:deviceId,kind:claim.kind,...(claim.kind==='import'?{targetAccountId:claim.targetAccountId,targetDataEpoch:claim.targetDataEpoch}:{})};
    const stored=await db.guestHistoryDecisions.get([ownerId,claim.decisionId]);
    const prior=stored?(({schemaVersion,...header})=>header)(stored):null;
    if(prior&&JSON.stringify(prior)!==JSON.stringify(header))invalid('Decision identity cannot change its target or choice.');
    if(!prior)await db.guestHistoryDecisions.add({...header,schemaVersion:1});
    await persist(before,result.state);
    return {item:result.item,duplicate:result.duplicate,status:assignmentStatus(result.state,result.item.claimId)};
   });
  },
  // Only a future authenticated adapter may supply deletion evidence. Shape
  // validation and IndexedDB transactions do not authenticate a server response.
  async releaseImportAssignment(proof){return transition('Import assignment release',state=>releaseAssignment(state,proof));},
  async recordImportAssignmentOutcome(callback){return transition('Import assignment outcome',state=>recordImportOutcome(state,callback));},
  async listImportAssignments(){return readOperation('Import assignment history',()=>db.transaction('r',...tables,async()=>readImportLedger(db,ownerId,StorageError)));},
 });
}
