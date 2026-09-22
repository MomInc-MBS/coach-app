import test from 'node:test';
import assert from 'node:assert/strict';
import Dexie from 'dexie';
import {indexedDB,IDBKeyRange,IDBObjectStore} from 'fake-indexeddb';
import {openLocalCoach} from '../local-coach/repository.mjs';
import {completeCoach} from './onboarding-fixture.mjs';
import {validateOnboarding} from '../onboarding-domain.mjs';

let sequence=0;
const options=(name=`ledger-${++sequence}`)=>({name,indexedDB,IDBKeyRange,cryptoObject:{randomUUID:()=>`id-${++sequence}`},now:()=>1000});
async function completed(scope,id){await scope.startWorkout({clientWorkoutId:id,mode:'squat',goal:3});await scope.completeWorkout(id,{value:3});return scope.prepareImportAssignment(id);}
function claim(scope,id,tag='a',target='alice',epoch=1){return {decisionId:`decision-${tag}`,itemId:`item-${tag}`,claimId:`claim-${tag}`,sourceOwnerId:scope.ownerId,sourceDeviceId:scope.deviceId,clientWorkoutId:id,kind:'import',completed:true,targetAccountId:target,targetDataEpoch:epoch,fingerprint:'a'.repeat(64),snapshot:{mode:'squat',value:3}};}
const proof=(tag='a')=>({claimId:`claim-${tag}`,generation:1,ownerId:'alice',currentDataEpoch:2,deletedThroughEpoch:1});
const plainSource=exported=>{const {importAssignments,exportedAt,...source}=exported;return source;};

test('actual v1 database upgrades preserving schema1 source rows and ordinary outbox',async()=>{
 const opt=options(),v1=new Dexie(opt.name,{indexedDB,IDBKeyRange});
 v1.version(1).stores({meta:'&key,ownerId,updatedAt',intake:'&ownerId,deviceId,updatedAt',settings:'&ownerId,deviceId,updatedAt',workouts:'&id,&clientWorkoutId,ownerId,[ownerId+status],[ownerId+startedAt],status,updatedAt',workoutEvents:'&id,workoutId,[ownerId+workoutId],[workoutId+sequence],ownerId,createdAt',outbox:'&id,&workoutId,ownerId,[ownerId+state],state,updatedAt'});
 await v1.open();
 const ownerId='guest:old',deviceId='old-device';
 const workout={id:'old',clientWorkoutId:'old',ownerId,deviceId,mode:'squat',goal:3,restSeconds:60,status:'completed',progress:{},metadata:{},completion:{value:3},startedAt:1000,updatedAt:1000,completedAt:1000,schemaVersion:1};
 const event={id:'old-event',workoutId:'old',ownerId,deviceId,sequence:1,type:'completed',payload:{value:3},createdAt:1000,schemaVersion:1};
 const outbox={id:'old-outbox',workoutId:'old',clientWorkoutId:'old',ownerId,deviceId,type:'workout.completed',state:'pending',payload:{workout},createdAt:1000,updatedAt:1000,schemaVersion:1};
 await v1.table('meta').bulkAdd([{key:'device-id',value:deviceId,updatedAt:1000,schemaVersion:1},{key:'guest-owner-id',ownerId,value:ownerId,updatedAt:1000,schemaVersion:1}]);
 await v1.table('workouts').add(workout);await v1.table('workoutEvents').add(event);await v1.table('outbox').add(outbox);
 const intake={ownerId,deviceId,value:validateOnboarding(completeCoach()),updatedAt:1000,schemaVersion:1},settings={ownerId,deviceId,value:{sound:false},updatedAt:1000,schemaVersion:1};
 await v1.table('intake').add(intake);await v1.table('settings').add(settings);
 const before={exportVersion:1,schemaVersion:1,ownerId,deviceId,intake,settings,workouts:[workout],events:[event],outbox:[outbox]};v1.close();
 const next=await openLocalCoach(opt),after=await next.forOwner(next.guestOwnerId).exportLocalData();
 assert.equal(next.layoutVersion,2);assert.equal(next.schemaVersion,1);assert.deepEqual(plainSource(after),plainSource(before));
 assert.deepEqual(after.importAssignments,{decisions:[],heads:[],items:[],events:[]});
 next.close();
});

test('two independent connections racing a workout produce one immutable claim/head',async()=>{
 const opt=options(),one=await openLocalCoach(opt),a=one.forOwner(one.guestOwnerId),prepared=await completed(a,'w');
 const two=await openLocalCoach(opt),b=two.forOwner(two.guestOwnerId);
 const settled=await Promise.allSettled([a.claimImportAssignment(claim(a,'w','a'),prepared),b.claimImportAssignment(claim(b,'w','b','bob'),prepared)]);
 assert.equal(settled.filter(result=>result.status==='fulfilled').length,1);
 const ledger=await a.listImportAssignments();assert.equal(ledger.items.length,1);assert.equal(ledger.heads.length,1);assert.equal(ledger.decisions.length,1);
 const winner=settled.find(result=>result.status==='fulfilled').value.item;
 assert.equal((await b.claimImportAssignment(claim(b,'w',winner.claimId.slice(6),winner.targetAccountId),prepared)).duplicate,true);
 one.close();two.close();
});

test('A import deletion B reimport survives reopen and late A outcomes do not change B',async()=>{
 const opt=options(),coach=await openLocalCoach(opt),scope=coach.forOwner(coach.guestOwnerId),prepared=await completed(scope,'w'),before=await scope.exportLocalData();
 const a=await scope.claimImportAssignment(claim(scope,'w'),prepared);
 const callback={claimId:a.item.claimId,generation:1,sourceOwnerId:scope.ownerId,sourceDeviceId:scope.deviceId,clientWorkoutId:'w',type:'imported'};
 await scope.recordImportAssignmentOutcome(callback);await scope.releaseImportAssignment(proof());
 const b=await scope.claimImportAssignment(claim(scope,'w','b','bob'),prepared);assert.equal(b.item.generation,2);
 assert.equal((await scope.recordImportAssignmentOutcome(callback)).status,'target_deleted');
 assert.equal((await scope.releaseImportAssignment(proof())).duplicate,true);
 const ledger=await scope.listImportAssignments();assert.equal(ledger.heads[0].claimId,'claim-b');assert.equal(ledger.heads[0].status,'active');
 assert.equal(ledger.items[0].targetAccountId,'alice');assert.equal(ledger.items[1].targetAccountId,'bob');
 assert.deepEqual(plainSource(await scope.exportLocalData()),plainSource(before));
 coach.close();const reopened=await openLocalCoach(opt);assert.deepEqual(await reopened.forOwner(reopened.guestOwnerId).listImportAssignments(),ledger);reopened.close();
});

test('release head write failure rolls back the appended deletion event',async()=>{
 const coach=await openLocalCoach(options()),scope=coach.forOwner(coach.guestOwnerId),prepared=await completed(scope,'w');await scope.claimImportAssignment(claim(scope,'w'),prepared);
 const before=await scope.listImportAssignments(),original=IDBObjectStore.prototype.put;
 IDBObjectStore.prototype.put=function(...args){if(this.name==='guestHistoryAssignmentHeads')throw new DOMException('injected write failure','AbortError');return original.apply(this,args);};
 try{await assert.rejects(scope.releaseImportAssignment(proof()));}finally{IDBObjectStore.prototype.put=original;}
 assert.deepEqual(await scope.listImportAssignments(),before);coach.close();
});

test('stale source revision, incomplete source and wrong device cannot claim',async()=>{
 const opt=options(),coach=await openLocalCoach(opt),scope=coach.forOwner(coach.guestOwnerId),prepared=await completed(scope,'w');
 await assert.rejects(scope.claimImportAssignment({...claim(scope,'w'),sourceDeviceId:'other-device'},prepared));
 await scope.startWorkout({clientWorkoutId:'active',mode:'squat',goal:3});await assert.rejects(scope.prepareImportAssignment('active'));
 const raw=new Dexie(opt.name,{indexedDB,IDBKeyRange});await raw.open();await raw.table('workouts').update('w',{updatedAt:2000});
 await assert.rejects(scope.claimImportAssignment(claim(scope,'w'),prepared));
 await raw.table('workouts').update('w',{updatedAt:1000,deviceId:'foreign'});await assert.rejects(scope.claimImportAssignment(claim(scope,'w'),prepared));
 assert.equal((await scope.listImportAssignments()).items.length,0);raw.close();coach.close();
});

test('keep-local covers permanently and export/delete remain owner-scoped',async()=>{
 const coach=await openLocalCoach(options()),scope=coach.forOwner(coach.guestOwnerId),other=coach.forOwner('guest:other');
 const prepared=await completed(scope,'w'),otherPrepared=await completed(other,'other');
 const {targetAccountId,targetDataEpoch,fingerprint,snapshot,...keep}=claim(scope,'w');keep.kind='keep_local';
 await scope.claimImportAssignment(keep,prepared);await other.claimImportAssignment(claim(other,'other','other'),otherPrepared);
 await assert.rejects(scope.claimImportAssignment(claim(scope,'w','b'),prepared),{code:'covered'});
 await assert.rejects(scope.releaseImportAssignment(proof()));
 const beforeOther=await other.exportLocalData();await scope.deleteLocalData();
 const empty=await scope.exportLocalData();assert.equal(empty.workouts.length,0);assert.equal(empty.importAssignments.items.length,0);assert.equal(empty.importAssignments.decisions.length,0);assert.equal(empty.importAssignments.heads.length,0);
 assert.deepEqual(await other.exportLocalData(),beforeOther);coach.close();
});

test('wrong owner and insufficient epoch evidence do not mutate ledger',async()=>{
 const coach=await openLocalCoach(options()),scope=coach.forOwner(coach.guestOwnerId),prepared=await completed(scope,'w');
 await scope.claimImportAssignment(claim(scope,'w','a','alice',2),prepared);const before=await scope.listImportAssignments();
 await assert.rejects(scope.releaseImportAssignment({...proof(),ownerId:'bob'}));await assert.rejects(scope.releaseImportAssignment(proof()));
 assert.deepEqual(await scope.listImportAssignments(),before);coach.close();
});


test('blocked v1 upgrade times out recoverably and a later open succeeds after blocker closes',async()=>{
 const opt=options(),blocker=new Dexie(opt.name,{indexedDB,IDBKeyRange});
 blocker.version(1).stores({meta:'&key,ownerId,updatedAt',intake:'&ownerId,deviceId,updatedAt',settings:'&ownerId,deviceId,updatedAt',workouts:'&id,&clientWorkoutId,ownerId,[ownerId+status],[ownerId+startedAt],status,updatedAt',workoutEvents:'&id,workoutId,[ownerId+workoutId],[workoutId+sequence],ownerId,createdAt',outbox:'&id,&workoutId,ownerId,[ownerId+state],state,updatedAt'});
 blocker.on('versionchange',()=>false);await blocker.open();
 await blocker.table('meta').bulkAdd([{key:'device-id',value:'retained-device',updatedAt:1000,schemaVersion:1},{key:'guest-owner-id',ownerId:'guest:retained',value:'guest:retained',updatedAt:1000,schemaVersion:1}]);
 await blocker.table('settings').add({ownerId:'guest:retained',deviceId:'retained-device',value:{sound:false},updatedAt:1000,schemaVersion:1});
 try{await assert.rejects(openLocalCoach({...opt,openTimeoutMs:20}),{code:'migration',recoverable:true});}finally{blocker.close();}
 const reopened=await openLocalCoach(opt);assert.equal(reopened.layoutVersion,2);assert.equal(reopened.guestOwnerId,'guest:retained');assert.equal(reopened.deviceId,'retained-device');assert.deepEqual(await reopened.forOwner(reopened.guestOwnerId).getSettings(),{sound:false});reopened.close();
});


test('unordered item ids rehydrate in workout/generation order and preserve append history',async()=>{
 const opt=options(),coach=await openLocalCoach(opt),scope=coach.forOwner(coach.guestOwnerId);
 const alpha=await completed(scope,'alpha'),zulu=await completed(scope,'zulu');
 await scope.claimImportAssignment(claim(scope,'zulu','middle'),zulu);
 await scope.claimImportAssignment(claim(scope,'alpha','z-last'),alpha);
 await scope.releaseImportAssignment(proof('z-last'));
 await scope.claimImportAssignment(claim(scope,'alpha','0-first','bob'),alpha);
 const before=await scope.listImportAssignments();
 assert.deepEqual(before.items.map(item=>[item.clientWorkoutId,item.generation]),[['alpha',1],['alpha',2],['zulu',1]]);
 assert.deepEqual(before.heads.map(head=>head.clientWorkoutId),['alpha','zulu']);
 assert.deepEqual(before.decisions.map(decision=>decision.decisionId),['decision-0-first','decision-middle','decision-z-last']);
 coach.close();const second=await openLocalCoach(opt),reopened=second.forOwner(second.guestOwnerId);
 assert.deepEqual(await reopened.listImportAssignments(),before);
 await reopened.releaseImportAssignment({claimId:'claim-0-first',generation:2,ownerId:'bob',currentDataEpoch:2,deletedThroughEpoch:1});
 await reopened.claimImportAssignment(claim(reopened,'alpha','-new','carol'),alpha);
 const after=await reopened.listImportAssignments();
 assert.deepEqual(after.items.filter(item=>item.clientWorkoutId==='alpha').map(item=>item.generation),[1,2,3]);
 for(const item of before.items)assert.deepEqual(after.items.find(row=>row.itemId===item.itemId),item);
 assert.deepEqual(after.events.slice(0,before.events.length),before.events);second.close();
});

test('exact capture preserves supported claim fields and historical retry ignores source revisions',async()=>{
 const opt=options(),coach=await openLocalCoach(opt),scope=coach.forOwner(coach.guestOwnerId),prepared=await completed(scope,'w'),input=claim(scope,'w');
 const first=await scope.claimImportAssignment(input,prepared);
 const {generation,decision,...captured}=first.item;
 assert.deepEqual({...captured,completed:true},input);
 assert.deepEqual(Object.keys(captured).sort(),['claimId','clientWorkoutId','decisionId','fingerprint','itemId','kind','snapshot','sourceDeviceId','sourceOwnerId','targetAccountId','targetDataEpoch'].sort());
 const raw=new Dexie(opt.name,{indexedDB,IDBKeyRange});await raw.open();await raw.table('workouts').update('w',{updatedAt:2000});
 assert.deepEqual((await scope.claimImportAssignment(input)).item,first.item);
 await raw.table('workouts').delete('w');
 assert.equal((await scope.claimImportAssignment(input,{sourceRevision:'irrelevant-old-revision'})).duplicate,true);
 await assert.rejects(scope.claimImportAssignment({...input,snapshot:{value:100}},prepared),{code:'decision-conflict'});
 await scope.releaseImportAssignment(proof());
 await assert.rejects(scope.claimImportAssignment(claim(scope,'w','b','bob'),prepared),{code:'invalid-record'});
 raw.close();coach.close();
});

test('ledger read schema errors and prepare storage failures are typed and recoverable',async()=>{
 const opt=options(),coach=await openLocalCoach(opt),scope=coach.forOwner(coach.guestOwnerId),prepared=await completed(scope,'w');await scope.claimImportAssignment(claim(scope,'w'),prepared);
 const raw=new Dexie(opt.name,{indexedDB,IDBKeyRange});await raw.open();await raw.table('guestHistoryItems').update('item-a',{schemaVersion:2});
 await assert.rejects(scope.listImportAssignments(),{code:'invalid-record',recoverable:true});
 await assert.rejects(scope.exportLocalData(),{code:'invalid-record',recoverable:true});
 const original=IDBObjectStore.prototype.get;
 IDBObjectStore.prototype.get=function(...args){if(this.name==='workouts')throw new DOMException('injected storage failure','QuotaExceededError');return original.apply(this,args);};
 try{await assert.rejects(scope.prepareImportAssignment('w'),{code:'quota',recoverable:true});}finally{IDBObjectStore.prototype.get=original;}
 raw.close();coach.close();
});

test('slow unblocked open is bounded and late completion cannot provision identity',async()=>{
 const opt=options(),original=Dexie.prototype.open;
 Dexie.prototype.open=function(...args){const db=this;return new Promise((resolve,reject)=>setTimeout(()=>original.apply(db,args).then(resolve,reject),40));};
 try{await assert.rejects(openLocalCoach({...opt,openTimeoutMs:10}),{code:'migration',recoverable:true});}finally{Dexie.prototype.open=original;}
 await new Promise(resolve=>setTimeout(resolve,80));
 const raw=new Dexie(opt.name,{indexedDB,IDBKeyRange});await raw.open();assert.equal(await raw.table('meta').count(),0);raw.close();
 const reopened=await openLocalCoach(opt);assert.equal(reopened.layoutVersion,2);reopened.close();
});
