import test from 'node:test';
import assert from 'node:assert/strict';
import {indexedDB,IDBKeyRange} from 'fake-indexeddb';
import {openLocalCoach,LocalCoachStorageError} from '../local-coach/repository.mjs';
import {fingerprintImportSnapshot,importIdempotencyKey} from '../workout-import-codec.mjs';
const options=()=>({name:`preparation-repository-${crypto.randomUUID()}`,indexedDB,IDBKeyRange,now:()=>1000});
const withoutExportTime=value=>{const {exportedAt,...stable}=value;return stable;};
const sourceOnly=value=>{const {importAssignments,...source}=withoutExportTime(value);return source;};
async function complete(scope){
 const id=crypto.randomUUID();
 await scope.startWorkout({clientWorkoutId:id,mode:'squat',goal:3,restSeconds:60,metadata:{privateNote:'local only'}});
 await scope.completeWorkout(id,{value:3,activeSeconds:1,elapsedSeconds:1,earned:true});
 return id;
}
function choice(ids,{decisionId=crypto.randomUUID(),kind='import',targetAccountId='alice',targetDataEpoch=1}={}){
 return {decisionId,kind,...(kind==='import'?{targetAccountId,targetDataEpoch}:{}),selections:ids.map(clientWorkoutId=>({clientWorkoutId,claimId:crypto.randomUUID(),itemId:crypto.randomUUID()}))};
}
async function commit(scope,input){return scope.commitImportDecision(await scope.prepareImportDecision(input));}

test('openLocalCoach prepares exact multi-workout imports and exports/reopens complete immutable ledger',async()=>{
 const opt=options();let repository=await openLocalCoach(opt);
 try{
  let scope=repository.forOwner(repository.guestOwnerId);
  const ids=[await complete(scope),await complete(scope)],before=await scope.exportLocalData(),input=choice(ids);
  const result=await commit(scope,input);
  assert.equal(result.duplicate,false);assert.equal(result.items.length,2);
  for(const {item,status} of result.items){
   assert.equal(status,'pending');assert.equal(item.sourceOwnerId,scope.ownerId);assert.equal(item.sourceDeviceId,scope.deviceId);
   assert.equal(item.fingerprint,await fingerprintImportSnapshot(item.snapshot));
   assert.equal(item.idempotencyKey,await importIdempotencyKey({digestVersion:1,targetAccountId:'alice',targetDataEpoch:1,clientWorkoutId:item.clientWorkoutId,fingerprint:item.fingerprint}));
   for(const key of ['ownerId','deviceId','metadata','earned'])assert.equal(Object.hasOwn(item.snapshot,key),false);
  }
  const exported=await scope.exportLocalData();assert.deepEqual(sourceOnly(exported),sourceOnly(before));
  assert.equal(exported.outbox.length,2);assert.equal(exported.importAssignments.decisions.length,1);assert.equal(exported.importAssignments.heads.length,2);
  assert.deepEqual(exported.importAssignments.decisions[0].selections.map(s=>s.clientWorkoutId),ids.slice().sort());
  repository.close();repository=await openLocalCoach(opt);scope=repository.forOwner(repository.guestOwnerId);
  assert.deepEqual(withoutExportTime(await scope.exportLocalData()),withoutExportTime(exported));
  const retry=await commit(scope,{...input,selections:input.selections.slice().reverse()});assert.equal(retry.duplicate,true);assert.deepEqual(retry.items,result.items);
 }finally{repository.close();}
});

test('repository owner deletion atomically removes prepared history and leaves other owner intact',async()=>{
 const repository=await openLocalCoach(options());
 try{
  const one=repository.forOwner(repository.guestOwnerId),two=repository.forOwner('guest:other');
  const first=[await complete(one),await complete(one)],second=[await complete(two)];
  await one.saveSettings({sound:false});await two.saveSettings({sound:true});
  await commit(one,choice(first));await commit(two,choice(second,{kind:'keep_local'}));
  const otherBefore=await two.exportLocalData();
  const counts=await one.deleteLocalData();assert.equal(counts.workouts,2);assert.equal(counts.outbox,2);
  assert.equal(counts.importAssignments.guestHistoryItems,2);assert.equal(counts.importAssignments.guestHistoryDecisions,1);assert.equal(counts.importAssignments.guestHistoryAssignmentHeads,2);
  const empty=await one.exportLocalData();for(const key of ['workouts','events','outbox'])assert.deepEqual(empty[key],[]);
  assert.deepEqual(empty.importAssignments,{decisions:[],items:[],heads:[],events:[]});assert.equal(empty.settings,null);
  assert.deepEqual(withoutExportTime(await two.exportLocalData()),withoutExportTime(otherBefore));
  for(const item of otherBefore.importAssignments.items)for(const key of ['targetAccountId','targetDataEpoch','snapshot','digestVersion','fingerprint','idempotencyKey'])assert.equal(Object.hasOwn(item,key),false);
 }finally{repository.close();}
});

test('repository confirmed deletion enables fresh same-source choice while old retries and proofs stay historical',async()=>{
 const repository=await openLocalCoach(options());
 try{
  const scope=repository.forOwner(repository.guestOwnerId),id=await complete(scope),sourceBefore=await scope.exportLocalData();
  const initial=choice([id]),first=await commit(scope,initial),old=first.items[0].item;
  const proof={claimId:old.claimId,generation:old.generation,ownerId:'alice',currentDataEpoch:2,deletedThroughEpoch:1};
  await assert.rejects(scope.releaseImportAssignment({...proof,ownerId:'bob'}));
  await assert.rejects(commit(scope,choice([id],{targetAccountId:'bob'})));
  await scope.releaseImportAssignment(proof);
  const nextInput=choice([id],{targetAccountId:'alice',targetDataEpoch:2}),second=await commit(scope,nextInput),next=second.items[0].item;
  assert.equal(next.generation,2);assert.notEqual(next.claimId,old.claimId);assert.notEqual(next.idempotencyKey,old.idempotencyKey);
  const beforeReplay=await scope.listImportAssignments();await scope.releaseImportAssignment(proof);
  await scope.recordImportAssignmentOutcome({claimId:old.claimId,generation:1,sourceOwnerId:scope.ownerId,sourceDeviceId:scope.deviceId,clientWorkoutId:id,type:'imported'});
  assert.deepEqual(await scope.listImportAssignments(),beforeReplay);
  const retry=await commit(scope,initial);assert.equal(retry.duplicate,true);assert.deepEqual(retry.items[0].item,old);assert.equal(retry.items[0].status,'target_deleted');
  const history=await scope.listImportAssignments();assert.equal(history.items.length,2);assert.equal(history.heads.length,1);assert.equal(history.heads[0].claimId,next.claimId);assert.equal(history.heads[0].status,'active');
  assert.deepEqual(sourceOnly(await scope.exportLocalData()),sourceOnly(sourceBefore));
 }finally{repository.close();}
});

test('preparation reports codec and database failures as classified storage errors',async()=>{
 const repository=await openLocalCoach(options());
 const scope=repository.forOwner(repository.guestOwnerId);
 await scope.startWorkout({clientWorkoutId:'legacy-non-uuid',mode:'squat',goal:3});
 await scope.completeWorkout('legacy-non-uuid',{value:2});
 await assert.rejects(scope.prepareImportDecision(choice(['legacy-non-uuid'])),e=>e instanceof LocalCoachStorageError&&e.code==='snapshot_unavailable');
 const id=await complete(scope),original=crypto.subtle.digest;
 crypto.subtle.digest=async()=>{throw Error('injected');};
 try{await assert.rejects(scope.prepareImportDecision(choice([id])),e=>e instanceof LocalCoachStorageError&&e.code==='crypto_unavailable');}finally{crypto.subtle.digest=original;}
 repository.close();
 await assert.rejects(scope.prepareImportDecision(choice([id])),e=>e instanceof LocalCoachStorageError);
});
