import test from 'node:test';
import assert from 'node:assert/strict';
import Dexie from 'dexie';
import {indexedDB,IDBKeyRange,IDBObjectStore} from 'fake-indexeddb';
import {completeCoach} from './onboarding-fixture.mjs';
import {
 LocalCoachStorageError,
 classifyLocalCoachError,
 openLocalCoach,
} from '../local-coach/repository.mjs';

let databaseSequence=0;
const nextDatabase=()=>`myr5-local-coach-test-${++databaseSequence}`;
const deterministicCrypto=(prefix='id')=>{let sequence=0;return {randomUUID:()=>`${prefix}-${++sequence}`};};
const openTestCoach=(options={})=>openLocalCoach({name:nextDatabase(),indexedDB,IDBKeyRange,cryptoObject:deterministicCrypto(),now:(()=>{let value=1_000;return ()=>++value;})(),...options});

test('stable guest and device identities survive database reopen',async()=>{
 const name=nextDatabase();
 const first=await openLocalCoach({name,indexedDB,IDBKeyRange,cryptoObject:deterministicCrypto('first')});
 const identity={deviceId:first.deviceId,guestOwnerId:first.guestOwnerId};
 first.close();
 const second=await openLocalCoach({name,indexedDB,IDBKeyRange,cryptoObject:deterministicCrypto('second')});
 assert.deepEqual({deviceId:second.deviceId,guestOwnerId:second.guestOwnerId},identity);
 second.close();
});

test('simultaneous tab opens converge on one durable guest and device identity',async()=>{
 const name=nextDatabase();
 const [first,second]=await Promise.all([
  openLocalCoach({name,indexedDB,IDBKeyRange,cryptoObject:deterministicCrypto('tab-a')}),
  openLocalCoach({name,indexedDB,IDBKeyRange,cryptoObject:deterministicCrypto('tab-b')}),
 ]);
 assert.equal(first.deviceId,second.deviceId);
 assert.equal(first.guestOwnerId,second.guestOwnerId);
 first.close();second.close();
});

test('validated anonymous intake, settings, workout history, events, and outbox survive reopen',async()=>{
 const name=nextDatabase(),clock=(()=>{let value=2_000;return ()=>++value;})();
 const first=await openLocalCoach({name,indexedDB,IDBKeyRange,cryptoObject:deterministicCrypto('persist'),now:clock});
 const ownerId=first.guestOwnerId,scope=first.forOwner(ownerId);
 const intake=completeCoach();
 await scope.saveIntake(intake);
 await scope.saveSettings({sound:false,reducedMotion:true});
 const started=await scope.startWorkout({mode:'squat',goal:3,restSeconds:60,progress:{count:0}});
 await scope.updateWorkout(started.id,{progress:{count:2}});
 await scope.pauseWorkout(started.id);
 await scope.resumeWorkout(started.id);
 const completed=await scope.completeWorkout(started.id,{value:3,activeSeconds:12,elapsedSeconds:30,earned:true,progress:{count:3}});
 assert.equal(completed.workout.clientWorkoutId,started.id);
 assert.equal(completed.outbox.state,'pending');
 const duplicate=await scope.completeWorkout(started.id,{value:3});
 assert.equal(duplicate.duplicate,true);
 assert.equal((await scope.listOutbox()).length,1);
 first.close();

 const second=await openLocalCoach({name,indexedDB,IDBKeyRange,cryptoObject:deterministicCrypto('unused'),now:clock});
 const reopened=second.forOwner(ownerId);
 assert.equal((await reopened.getIntake()).profile.name,'Sam');
 assert.deepEqual(await reopened.getSettings(),{sound:false,reducedMotion:true});
 const history=await reopened.listWorkouts();
 assert.equal(history.length,1);
 assert.equal(history[0].status,'completed');
 assert.equal(history[0].completion.value,3);
 assert.deepEqual((await reopened.listEvents(started.id)).map(event=>event.type),['started','updated','paused','resumed','completed']);
 second.close();
});

test('recovery marks unfinished owner workouts interrupted without touching another owner',async()=>{
 const coach=await openTestCoach(),guest=coach.forOwner(coach.guestOwnerId),account=coach.forOwner('account:user-2');
 const active=await guest.startWorkout({mode:'tree',goal:9,restSeconds:45});
 const paused=await guest.startWorkout({mode:'squat',goal:4,restSeconds:60});
 await guest.pauseWorkout(paused.id);
 const foreign=await account.startWorkout({mode:'pushup',goal:3,restSeconds:60});
 const recovered=await guest.recoverInterruptedWorkouts();
 assert.equal(recovered.length,2);
 assert.ok(recovered.every(workout=>workout.status==='interrupted'));
 assert.equal((await account.getWorkout(foreign.id)).status,'active');
 assert.deepEqual((await guest.listEvents(active.id)).map(event=>event.type),['started','interrupted']);
 coach.close();
});

test('owner export and deletion are isolated while device and guest identity remain stable',async()=>{
 const name=nextDatabase();
 const coach=await openLocalCoach({name,indexedDB,IDBKeyRange,cryptoObject:deterministicCrypto('delete')});
 const deviceId=coach.deviceId,guestId=coach.guestOwnerId;
 const guest=coach.forOwner(guestId),account=coach.forOwner('account:someone');
 await guest.saveIntake(completeCoach());
 const workout=await guest.startWorkout({mode:'squat',goal:3});
 await guest.completeWorkout(workout.id,{value:3});
 await account.saveSettings({sound:true});
 const exported=await guest.exportLocalData();
 assert.equal(exported.ownerId,guestId);
 assert.equal(exported.workouts.length,1);
 assert.equal(exported.events.length,2);
 assert.equal(exported.outbox.length,1);
 const counts=await guest.deleteLocalData();
 assert.equal(counts.workouts,1);
 assert.equal(counts.events,2);
 assert.equal(counts.outbox,1);
 assert.deepEqual(await account.getSettings(),{sound:true});
 coach.close();

 const reopened=await openLocalCoach({name,indexedDB,IDBKeyRange,cryptoObject:deterministicCrypto('replacement')});
 assert.equal(reopened.deviceId,deviceId);
 assert.equal(reopened.guestOwnerId,guestId);
 reopened.close();
});

test('legacy import is explicit, validated, transactional, and idempotent',async()=>{
 const coach=await openTestCoach(),scope=coach.forOwner(coach.guestOwnerId),payload={sourceKey:'onboarding-v1',intake:completeCoach(),settings:{sound:false},pendingSets:[{id:'server-old-1',value:3,active:10}]};
 assert.deepEqual(await scope.importLegacyLocalState(payload),{imported:true,pending:1});
 assert.deepEqual(await scope.importLegacyLocalState(payload),{imported:false,reason:'already-imported'});
 assert.equal((await scope.listOutbox()).length,1);
 await assert.rejects(()=>scope.importLegacyLocalState({sourceKey:'bad',pendingSets:[{id:'x',value:-1}]}),error=>error instanceof LocalCoachStorageError&&error.code==='invalid-record');
 assert.equal((await scope.listOutbox()).length,1);
 coach.close();
});

test('legacy migration markers cannot collide across owner and source boundaries',async()=>{
 const coach=await openTestCoach(),first=coach.forOwner('account:a'),second=coach.forOwner('account:a:b');
 assert.deepEqual(await first.importLegacyLocalState({sourceKey:'b:c',settings:{owner:'first'}}),{imported:true,pending:0});
 assert.deepEqual(await second.importLegacyLocalState({sourceKey:'c',settings:{owner:'second'}}),{imported:true,pending:0});
 assert.deepEqual(await first.importLegacyLocalState({sourceKey:'b:c',settings:{owner:'changed'}}),{imported:false,reason:'already-imported'});
 assert.deepEqual(await first.getSettings(),{owner:'first'});
 assert.deepEqual(await second.getSettings(),{owner:'second'});
 coach.close();
});

test('failed multi-table start rolls back the workout and surfaces the write failure',async()=>{
 const values=['device','guest','workout-one','event-one','event-one'];
 const coach=await openLocalCoach({name:nextDatabase(),indexedDB,IDBKeyRange,cryptoObject:{randomUUID:()=>values.shift()??'unused'}});
 const scope=coach.forOwner(coach.guestOwnerId);
 await scope.startWorkout({mode:'squat',goal:3});
 await assert.rejects(()=>scope.startWorkout({clientWorkoutId:'workout-two',mode:'tree',goal:9}),error=>error instanceof LocalCoachStorageError&&error.code==='storage');
 assert.equal(await scope.getWorkout('workout-two'),null);
 assert.equal((await scope.listWorkouts()).length,1);
 coach.close();
});

test('invalid records and storage failures are explicit and recoverable',async()=>{
 const coach=await openTestCoach(),scope=coach.forOwner(coach.guestOwnerId);
 assert.throws(()=>coach.forOwner('account:'),error=>error instanceof LocalCoachStorageError&&error.code==='invalid-record');
 await assert.rejects(()=>scope.saveIntake({name:'incomplete'}),error=>error instanceof LocalCoachStorageError&&error.code==='invalid-record');
 await assert.rejects(()=>scope.startWorkout({mode:'unknown',goal:3}),error=>error instanceof LocalCoachStorageError&&error.code==='invalid-record');
 const quota=classifyLocalCoachError(new DOMException('full','QuotaExceededError'),'Workout completion');
 assert.equal(quota.code,'quota');
 assert.equal(quota.recoverable,true);
 assert.match(quota.message,/storage is full/i);
 coach.close();
});

test('another owner cannot read a workout or change its queued completion',async()=>{
 const coach=await openTestCoach(),guest=coach.forOwner(coach.guestOwnerId),account=coach.forOwner('account:other');
 const started=await guest.startWorkout({mode:'squat',goal:3});
 const {outbox}=await guest.completeWorkout(started.id,{value:3});
 assert.equal(await account.getWorkout(started.id),null);
 assert.deepEqual(await account.listOutbox(),[]);
 await assert.rejects(()=>account.markOutbox(outbox.id,'sent'),error=>error instanceof LocalCoachStorageError&&error.code==='not-found');
 assert.equal((await guest.listOutbox())[0].state,'pending');
 coach.close();
});

test('two open tabs completing one client workout produce one event and one outbox row',async()=>{
 const name=nextDatabase(),clock=(()=>{let value=8_000;return ()=>++value;})();
 const [first,second]=await Promise.all([
  openLocalCoach({name,indexedDB,IDBKeyRange,cryptoObject:deterministicCrypto('complete-a'),now:clock}),
  openLocalCoach({name,indexedDB,IDBKeyRange,cryptoObject:deterministicCrypto('complete-b'),now:clock}),
 ]);
 const ownerId=first.guestOwnerId,a=first.forOwner(ownerId),b=second.forOwner(ownerId);
 const started=await a.startWorkout({clientWorkoutId:'shared-client-workout',mode:'squat',goal:3});
 const results=await Promise.all([a.completeWorkout(started.id,{value:3}),b.completeWorkout(started.id,{value:3})]);
 assert.deepEqual(results.map(result=>result.duplicate).sort(),[false,true]);
 assert.equal((await a.listEvents(started.id)).filter(event=>event.type==='completed').length,1);
 assert.equal((await b.listOutbox()).length,1);
 assert.equal(first.deviceId,second.deviceId);
 first.close();second.close();
});

test('duplicate completion validates a corrupted existing outbox and cannot claim success',async()=>{
 const name=nextDatabase(),coach=await openLocalCoach({name,indexedDB,IDBKeyRange,cryptoObject:deterministicCrypto('bad-outbox')}),scope=coach.forOwner(coach.guestOwnerId);
 const started=await scope.startWorkout({mode:'squat',goal:3});
 const completed=await scope.completeWorkout(started.id,{value:3});
 const raw=new Dexie(name,{indexedDB,IDBKeyRange});
 raw.version(1).stores({meta:'&key,ownerId,updatedAt',intake:'&ownerId,deviceId,updatedAt',settings:'&ownerId,deviceId,updatedAt',workouts:'&id,&clientWorkoutId,ownerId,[ownerId+status],[ownerId+startedAt],status,updatedAt',workoutEvents:'&id,workoutId,[ownerId+workoutId],[workoutId+sequence],ownerId,createdAt',outbox:'&id,&workoutId,ownerId,[ownerId+state],state,updatedAt'});
 await raw.open();
 await raw.outbox.put({...completed.outbox,payload:'corrupt'});
 await assert.rejects(()=>scope.completeWorkout(started.id,{value:3}),error=>error instanceof LocalCoachStorageError&&error.code==='invalid-record');
 assert.equal((await scope.listEvents(started.id)).filter(event=>event.type==='completed').length,1);
 assert.equal(await raw.outbox.count(),1);
 raw.close();coach.close();
});

test('oversized JSON fails on write and on validation of a persisted row',async()=>{
 const name=nextDatabase(),coach=await openLocalCoach({name,indexedDB,IDBKeyRange,cryptoObject:deterministicCrypto('oversize')}),scope=coach.forOwner(coach.guestOwnerId),oversized={blob:'x'.repeat(131073)};
 await assert.rejects(()=>scope.saveSettings(oversized),error=>error instanceof LocalCoachStorageError&&error.code==='invalid-record');
 assert.equal(await scope.getSettings(),null);
 const raw=new Dexie(name,{indexedDB,IDBKeyRange});
 raw.version(1).stores({meta:'&key,ownerId,updatedAt',intake:'&ownerId,deviceId,updatedAt',settings:'&ownerId,deviceId,updatedAt',workouts:'&id,&clientWorkoutId,ownerId,[ownerId+status],[ownerId+startedAt],status,updatedAt',workoutEvents:'&id,workoutId,[ownerId+workoutId],[workoutId+sequence],ownerId,createdAt',outbox:'&id,&workoutId,ownerId,[ownerId+state],state,updatedAt'});
 await raw.open();
 await raw.settings.put({ownerId:coach.guestOwnerId,deviceId:coach.deviceId,value:oversized,updatedAt:1,schemaVersion:1});
 await assert.rejects(()=>scope.getSettings(),error=>error instanceof LocalCoachStorageError&&error.code==='invalid-record');
 raw.close();coach.close();
});

test('quota failure during completion rolls back workout, event, and outbox',async()=>{
 const coach=await openTestCoach(),scope=coach.forOwner(coach.guestOwnerId),started=await scope.startWorkout({mode:'squat',goal:3});
 const originalAdd=IDBObjectStore.prototype.add;
 IDBObjectStore.prototype.add=function(value,key){if(this.name==='outbox')throw new DOMException('device full','QuotaExceededError');return originalAdd.call(this,value,key);};
 try{await assert.rejects(()=>scope.completeWorkout(started.id,{value:3}),error=>error instanceof LocalCoachStorageError&&error.code==='quota');}
 finally{IDBObjectStore.prototype.add=originalAdd;}
 assert.equal((await scope.getWorkout(started.id)).status,'active');
 assert.deepEqual((await scope.listEvents(started.id)).map(event=>event.type),['started']);
 assert.deepEqual(await scope.listOutbox(),[]);
 coach.close();
});

test('database version failures are classified as explicit recoverable migration errors',()=>{
 const migration=classifyLocalCoachError(new DOMException('newer database','VersionError'),'Local coach database');
 assert.equal(migration.code,'migration');
 assert.equal(migration.recoverable,true);
 assert.match(migration.message,/could not open/i);
});

test('account recovery, export, and deletion never cross into guest data',async()=>{
 const coach=await openTestCoach(),guest=coach.forOwner(coach.guestOwnerId),account=coach.forOwner('account:switch-target');
 const guestWorkout=await guest.startWorkout({mode:'tree',goal:9});
 const accountWorkout=await account.startWorkout({mode:'pushup',goal:3});
 await account.saveSettings({sound:false});
 assert.deepEqual((await account.recoverInterruptedWorkouts()).map(workout=>workout.id),[accountWorkout.id]);
 assert.equal((await guest.getWorkout(guestWorkout.id)).status,'active');
 const exported=await account.exportLocalData();
 assert.equal(exported.ownerId,'account:switch-target');
 assert.deepEqual(exported.workouts.map(workout=>workout.id),[accountWorkout.id]);
 await account.deleteLocalData();
 assert.deepEqual(await account.listWorkouts(),[]);
 assert.equal((await guest.getWorkout(guestWorkout.id)).status,'active');
 assert.equal(coach.guestOwnerId,guest.ownerId);
 coach.close();
});

test('malformed persisted rows fail validation instead of becoming false settings',async()=>{
 const name=nextDatabase(),coach=await openLocalCoach({name,indexedDB,IDBKeyRange,cryptoObject:deterministicCrypto('corrupt')}),scope=coach.forOwner(coach.guestOwnerId);
 const raw=new Dexie(name,{indexedDB,IDBKeyRange});
 raw.version(1).stores({meta:'&key,ownerId,updatedAt',intake:'&ownerId,deviceId,updatedAt',settings:'&ownerId,deviceId,updatedAt',workouts:'&id,&clientWorkoutId,ownerId,[ownerId+status],[ownerId+startedAt],status,updatedAt',workoutEvents:'&id,workoutId,[ownerId+workoutId],[workoutId+sequence],ownerId,createdAt',outbox:'&id,&workoutId,ownerId,[ownerId+state],state,updatedAt'});
 await raw.open();
 await raw.settings.put({ownerId:coach.guestOwnerId,deviceId:coach.deviceId,value:'not-an-object',updatedAt:1,schemaVersion:1});
 await assert.rejects(()=>scope.getSettings(),error=>error instanceof LocalCoachStorageError&&error.code==='invalid-record');
 raw.close();coach.close();
});
