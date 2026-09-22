import test from 'node:test';
import assert from 'node:assert/strict';
import Dexie from 'dexie';
import {indexedDB,IDBKeyRange,IDBObjectStore} from 'fake-indexeddb';
import {IMPORT_LEDGER_STORES,createImportLedger} from '../local-coach/import-ledger.mjs';
import {IMPORT_ATTEMPT_STALE_MS} from '../local-coach/import-attempts.mjs';
let sequence=0;
class StorageError extends Error{constructor(code,message){super(message);this.code=code;}}
const ids=['00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002'];
async function open(name=`attempt-${++sequence}`){
 const db=new Dexie(name,{indexedDB,IDBKeyRange});db.version(1).stores({workouts:'&id',outbox:'&id',...IMPORT_LEDGER_STORES});await db.open();
 const api=createImportLedger({db,ownerId:'guest:a',deviceId:'device:a',getWorkout:id=>db.workouts.get(id),transact:(_,tables,fn)=>db.transaction('rw',...tables,fn),StorageError,classifyError:e=>e});return {db,api};
}
async function setup(){
 const context=await open();
 await context.db.workouts.bulkAdd(ids.map(id=>({id,clientWorkoutId:id,ownerId:'guest:a',deviceId:'device:a',schemaVersion:1,status:'completed',mode:'squat',goal:3,restSeconds:60,startedAt:1000,completedAt:2000,completion:{value:3,activeSeconds:1,elapsedSeconds:1}})));
 await context.db.outbox.add({id:'ordinary',private:'unchanged'});
 const input={decisionId:'choice',kind:'import',targetAccountId:'alice',targetDataEpoch:1,selections:ids.map((clientWorkoutId,i)=>({clientWorkoutId,claimId:`claim${i}`,itemId:`item${i}`}))};
 await context.api.commitImportDecision(await context.api.prepareImportDecision(input));return context;
}
const begin=(change={})=>({claimId:'claim0',generation:1,attemptId:'attempt1',startedAt:100,...change});
const result=(change={})=>({claimId:'claim0',generation:1,attemptId:'attempt1',type:'imported',at:110,httpStatus:201,serverWorkoutId:'server-workout',...change});
const failure=(change={})=>({claimId:'claim0',generation:1,attemptId:'attempt1',type:'retryable_failure',at:110,category:'timeout',retryAt:200,...change});

test('attempt then matching result are durable exact-idempotent and source/outbox stay untouched',async()=>{
 const {db,api}=await setup(),source=await db.workouts.toArray(),outbox=await db.outbox.toArray();
 assert.equal((await api.beginImportAttempt(begin())).status,'in_flight');assert.equal((await api.beginImportAttempt({startedAt:100,attemptId:'attempt1',generation:1,claimId:'claim0'})).duplicate,true);
 await assert.rejects(api.beginImportAttempt(begin({startedAt:101})));
 assert.equal((await api.recordImportAttemptResult(result())).status,'imported');assert.equal((await api.recordImportAttemptResult(result())).duplicate,true);
 await assert.rejects(api.recordImportAttemptResult(result({serverWorkoutId:'changed'})));
 await assert.rejects(api.beginImportAttempt(begin({attemptId:'new',startedAt:100000})));
 assert.equal((await api.listImportAssignments()).events.length,2);assert.deepEqual(await db.workouts.toArray(),source);assert.deepEqual(await db.outbox.toArray(),outbox);db.close();
});

test('two connections serialize starts and exact simultaneous retries create one attempt',async()=>{
 const one=await setup(),two=await open(one.db.name);
 const answers=await Promise.allSettled([one.api.beginImportAttempt(begin()),two.api.beginImportAttempt(begin({attemptId:'competing'}))]);assert.equal(answers.filter(x=>x.status==='fulfilled').length,1);
 const event=(await one.api.listImportAssignments()).events[0],exact={claimId:event.claimId,generation:event.generation,attemptId:event.attemptId,startedAt:event.startedAt};
 assert((await Promise.all([one.api.beginImportAttempt(exact),two.api.beginImportAttempt(exact)])).every(r=>r.duplicate));
 assert.equal((await one.api.listImportAssignments()).events.length,1);one.db.close();two.db.close();
});

test('failed attempt append rolls back and no in-flight state is reported',async()=>{
 const {db,api}=await setup(),add=IDBObjectStore.prototype.add;
 IDBObjectStore.prototype.add=function(...args){if(this.name==='guestHistoryEvents')throw new DOMException('failure','AbortError');return add.apply(this,args);};
 try{await assert.rejects(api.beginImportAttempt(begin()));}finally{IDBObjectStore.prototype.add=add;}
 assert.equal((await api.importAttemptState('claim0',200)).status,'pending');assert.equal((await api.listImportAssignments()).events.length,0);db.close();
});

test('crash reopen leaves unmatched start replayable after deadline with original immutable key',async()=>{
 const first=await setup(),started=await first.api.beginImportAttempt(begin()),name=first.db.name;first.db.close();
 const second=await open(name);assert.equal((await second.api.importAttemptState('claim0',100+IMPORT_ATTEMPT_STALE_MS-1)).status,'in_flight');assert.equal((await second.api.importAttemptState('claim0',100+IMPORT_ATTEMPT_STALE_MS)).status,'retryable');
 const next=await second.api.beginImportAttempt(begin({attemptId:'replay',startedAt:100+IMPORT_ATTEMPT_STALE_MS}));assert.deepEqual(next.item,started.item);assert.equal((await second.api.listImportAssignments()).events.length,2);second.db.close();
});

test('late old failures cannot park a newer attempt; late success dominates all retries',async()=>{
 const {db,api}=await setup();await api.beginImportAttempt(begin());await api.beginImportAttempt(begin({attemptId:'second',startedAt:30100}));
 assert.equal((await api.recordImportAttemptResult(failure({at:30101,retryAt:30200}))).status,'in_flight');
 await api.recordImportAttemptResult(result({attemptId:'second',at:30102}));assert.equal((await api.importAttemptState('claim0',50000)).status,'imported');db.close();
});

test('deletion dominates late success and old results cannot alter a new head',async()=>{
 const {db,api}=await setup();await api.beginImportAttempt(begin());await api.releaseImportAssignment({claimId:'claim0',generation:1,ownerId:'alice',deletedThroughEpoch:1,currentDataEpoch:2});
 const input={decisionId:'newchoice',kind:'import',targetAccountId:'bob',targetDataEpoch:1,selections:[{clientWorkoutId:ids[0],claimId:'newclaim',itemId:'newitem'}]};await api.commitImportDecision(await api.prepareImportDecision(input));
 const heads=(await api.listImportAssignments()).heads;
 assert.equal((await api.recordImportAttemptResult(result())).status,'target_deleted');assert.deepEqual((await api.listImportAssignments()).heads,heads);
 await assert.rejects(api.beginImportAttempt(begin({attemptId:'late',startedAt:100000})));db.close();
});

test('backoff bounds and terminal conflict/rejection reject new attempts',async()=>{
 const {db,api}=await setup();await api.beginImportAttempt(begin());await api.recordImportAttemptResult(failure());await assert.rejects(api.beginImportAttempt(begin({attemptId:'early',startedAt:199})));
 await api.beginImportAttempt(begin({attemptId:'next',startedAt:200}));await api.recordImportAttemptResult({claimId:'claim0',generation:1,attemptId:'next',type:'conflict',at:210,category:'fingerprint_conflict',httpStatus:409});
 assert.equal((await api.importAttemptState('claim0',100000)).status,'conflict');await assert.rejects(api.beginImportAttempt(begin({attemptId:'again',startedAt:100000})));db.close();
});

test('incomplete prepared header, legacy metadata and foreign scope cannot begin',async()=>{
 const {db,api}=await setup(),header=await db.guestHistoryDecisions.get(['guest:a','choice']);
 await db.guestHistoryDecisions.put({...header,selections:header.selections.slice(0,1)});await assert.rejects(api.beginImportAttempt(begin()));
 await db.guestHistoryDecisions.put(header);await db.guestHistoryItems.update('item1',{sourceDeviceId:'foreign'});await assert.rejects(api.beginImportAttempt(begin()));
 await db.guestHistoryItems.update('item1',{sourceDeviceId:'device:a',digestVersion:undefined});await assert.rejects(api.beginImportAttempt(begin()));assert.equal((await api.listImportAssignments()).events.length,0);db.close();
});

test('unmatched outcomes, cross-item attempt reuse and private fields reject without getter invocation',async()=>{
 const {db,api}=await setup();await assert.rejects(api.recordImportAttemptResult(result()));await api.beginImportAttempt(begin());
 await assert.rejects(api.recordImportAttemptResult(result({claimId:'claim1'})));await assert.rejects(api.beginImportAttempt(begin({claimId:'claim1'})));
 await assert.rejects(api.recordImportAttemptResult({...failure(),message:'private raw body'}));let reads=0;const value=begin({attemptId:'getter'});Object.defineProperty(value,'startedAt',{enumerable:true,get(){reads++;return 100;}});await assert.rejects(api.beginImportAttempt(value));assert.equal(reads,0);
 assert.equal((await api.listImportAssignments()).events.length,1);db.close();
});

test('late retry after newer success stays imported and duplicate begin does not authorize resubmission',async()=>{
 const {db,api}=await setup();await api.beginImportAttempt(begin());await api.beginImportAttempt(begin({attemptId:'new',startedAt:30100}));await api.recordImportAttemptResult(result({attemptId:'new',at:30110}));
 assert.equal((await api.recordImportAttemptResult(failure({at:30120,retryAt:40000}))).status,'imported');
 const duplicate=await api.beginImportAttempt(begin());assert.equal(duplicate.duplicate,true);assert.equal(duplicate.status,'imported');db.close();
});

test('result write failure retains only committed start and retry succeeds after reopen',async()=>{
 const first=await setup();await first.api.beginImportAttempt(begin());const add=IDBObjectStore.prototype.add;
 IDBObjectStore.prototype.add=function(...args){if(this.name==='guestHistoryEvents')throw new DOMException('failure','AbortError');return add.apply(this,args);};
 try{await assert.rejects(first.api.recordImportAttemptResult(result()));}finally{IDBObjectStore.prototype.add=add;}
 const name=first.db.name;first.db.close();const second=await open(name);assert.equal((await second.api.listImportAssignments()).events.length,1);assert.equal((await second.api.recordImportAttemptResult(result())).status,'imported');second.db.close();
});

test('legacy unprepared and keep-local decisions cannot start attempts',async()=>{
 const {db,api}=await setup();for(const table of Object.keys(IMPORT_LEDGER_STORES))await db.table(table).clear();
 const prepared=await api.prepareImportAssignment(ids[0]);
 await api.claimImportAssignment({decisionId:'legacy',itemId:'legacyitem',claimId:'legacyclaim',sourceOwnerId:'guest:a',sourceDeviceId:'device:a',clientWorkoutId:ids[0],kind:'import',completed:true,targetAccountId:'alice',targetDataEpoch:1,fingerprint:'a'.repeat(64),snapshot:{value:3}},prepared);
 await assert.rejects(api.beginImportAttempt(begin({claimId:'legacyclaim'})));
 await api.commitImportDecision(await api.prepareImportDecision({decisionId:'keep',kind:'keep_local',selections:[{clientWorkoutId:ids[1],claimId:'keepclaim',itemId:'keepitem'}]}));
 await assert.rejects(api.beginImportAttempt(begin({claimId:'keepclaim'})));assert.equal((await api.listImportAssignments()).events.length,0);db.close();
});

test('parked attempts need explicit new start and rejection is terminal',async()=>{
 const {db,api}=await setup();await api.beginImportAttempt(begin());await api.recordImportAttemptResult({claimId:'claim0',generation:1,attemptId:'attempt1',type:'parked',at:110,category:'feature_disabled',httpStatus:404});
 assert.equal((await api.importAttemptState('claim0',100000)).status,'parked');await api.beginImportAttempt(begin({attemptId:'wake',startedAt:100000}),{resumeParked:true});
 await api.recordImportAttemptResult({claimId:'claim0',generation:1,attemptId:'wake',type:'rejected',at:100001,category:'invalid_payload',httpStatus:422});
 await assert.rejects(api.beginImportAttempt(begin({attemptId:'later',startedAt:200000})));assert.equal((await api.importAttemptState('claim0',200000)).status,'rejected');db.close();
});

test('malformed persisted orphan outcomes fail closed through policy status',async()=>{
 const {db,api}=await setup();await db.guestHistoryEvents.add({sourceOwnerId:'guest:a',schemaVersion:1,...result()});
 await assert.rejects(api.importAttemptState('claim0',200));await assert.rejects(api.beginImportAttempt(begin()));db.close();
});

test('account watermark blocks untouched sibling claim while owner deletion helper removes attempts',async()=>{
 const {db,api}=await setup();await api.beginImportAttempt(begin());await api.releaseImportAssignment({claimId:'claim0',generation:1,ownerId:'alice',deletedThroughEpoch:1,currentDataEpoch:2});
 await assert.rejects(api.beginImportAttempt(begin({claimId:'claim1',attemptId:'sibling'})));assert.equal((await api.importAttemptState('claim1',200)).status,'target_deleted');
 const before=await api.listImportAssignments();assert.equal(before.events.length,2);assert.equal(before.events[0].type,'submission_started');
 // Repository export uses readImportLedger and owner deletion uses this helper.
 const {deleteImportLedger}=await import('../local-coach/import-ledger.mjs');await db.transaction('rw',...Object.keys(IMPORT_LEDGER_STORES).map(name=>db.table(name)),()=>deleteImportLedger(db,'guest:a'));
 assert.equal((await api.listImportAssignments()).events.length,0);assert.equal(await db.workouts.count(),2);assert.equal(await db.outbox.count(),1);db.close();
});

test('legacy outcome API cannot bypass committed attempt requirement for prepared items',async()=>{
 const {db,api}=await setup();await assert.rejects(api.recordImportAssignmentOutcome({claimId:'claim0',generation:1,sourceOwnerId:'guest:a',sourceDeviceId:'device:a',clientWorkoutId:ids[0],type:'imported'}));assert.equal((await api.listImportAssignments()).events.length,0);db.close();
});

test('new attempt time cannot precede the latest observation of its claim',async()=>{
 const {db,api}=await setup();await api.beginImportAttempt(begin());
 await api.recordImportAttemptResult({claimId:'claim0',generation:1,attemptId:'attempt1',type:'parked',at:500,category:'signed_out'});
 await assert.rejects(api.beginImportAttempt(begin({attemptId:'new',startedAt:499}),{resumeParked:true}));
 assert.equal((await api.beginImportAttempt(begin({attemptId:'new',startedAt:500}),{resumeParked:true})).duplicate,false);db.close();
});

test('rehydrated result property order does not change exact duplicate identity',async()=>{
 const {db,api}=await setup();await api.beginImportAttempt(begin());await api.recordImportAttemptResult(result());
 const row=(await db.guestHistoryEvents.toArray()).find(e=>e.type==='imported');
 await db.guestHistoryEvents.put(Object.fromEntries(Object.entries(row).reverse()));
 assert.equal((await api.recordImportAttemptResult(result())).duplicate,true);db.close();
});


test('parked resume consent defaults false and is checked atomically at attempt start',async()=>{
 const {db,api}=await setup();await api.beginImportAttempt(begin());await api.recordImportAttemptResult({claimId:'claim0',generation:1,attemptId:'attempt1',type:'parked',at:110,category:'retry_exhausted'});
 await assert.rejects(api.beginImportAttempt(begin({attemptId:'auto',startedAt:200})));
 await assert.rejects(api.beginImportAttempt(begin({attemptId:'auto',startedAt:200}),{resumeParked:'true'}));
 assert.equal((await api.listImportAssignments()).events.length,2);
 assert.equal((await api.beginImportAttempt(begin({attemptId:'explicit',startedAt:200}),{resumeParked:true})).status,'in_flight');db.close();
});
