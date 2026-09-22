import test from 'node:test';
import assert from 'node:assert/strict';
import {indexedDB,IDBKeyRange} from 'fake-indexeddb';
import {openLocalCoach} from '../local-coach/repository.mjs';
import {createImportAccountAdapter} from '../local-coach/import-account-adapter.mjs';
const account=(owner='alice',epoch=1)=>({user:{id:owner},dataEpoch:epoch,deletionEvidence:{ownerId:owner,currentDataEpoch:epoch,deletedThroughEpoch:epoch-1}});
function transition(){let version=0,controller=new AbortController();const listeners=new Set();return {capture:()=>({version,signal:controller.signal}),isCurrent:ticket=>ticket.version===version,assertCurrent(ticket){if(ticket.version!==version)throw Object.assign(Error('changed'),{code:'auth_transition'});},subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},invalidate(){version++;controller.abort();controller=new AbortController();for(const fn of listeners)fn();}};}
async function fixture(t){
 const repository=await openLocalCoach({name:'import-adapter-'+crypto.randomUUID(),indexedDB,IDBKeyRange,now:()=>1000});t.after(()=>repository.close());
 const scope=repository.forOwner(repository.guestOwnerId),ids=[];
 for(let i=0;i<2;i++){const id=crypto.randomUUID();ids.push(id);await scope.startWorkout({clientWorkoutId:id,mode:'squat',goal:3,metadata:{private:'local-only'}});await scope.completeWorkout(id,{value:3,activeSeconds:1,elapsedSeconds:1});}
 let displayed=account(),live=displayed,requests=[];const transitions=transition();
 const request=async(path,options)=>{requests.push({path,options});assert.equal(options.cache,'no-store');return Response.json(live);};
 const make=overrides=>createImportAccountAdapter({repository:scope,request,transitions,getAccount:()=>displayed,...overrides});
 return {scope,ids,make,transitions,requests,setDisplayed:value=>displayed=value,setLive:value=>live=value};
}
test('history inspection/dismissal creates no claims; explicit keep local needs no auth',async t=>{
 const f=await fixture(t),adapter=f.make();assert.equal((await adapter.history()).filter(row=>row.selectable).length,2);assert.equal((await f.scope.listImportAssignments()).items.length,0);
 await adapter.choose('keep_local',[f.ids[0]],null);assert.equal(f.requests.length,0);const rows=await adapter.history();assert.equal(rows.find(row=>row.workout.id===f.ids[0]).status,'keep_local');assert.equal(rows.find(row=>row.workout.id===f.ids[0]).selectable,false);
});
test('fresh import after authenticated deletion retains original guest data and old assignment',async t=>{
 const f=await fixture(t),adapter=f.make(),before=await f.scope.exportLocalData();
 await adapter.choose('import',[f.ids[0]],account());const first=(await f.scope.listImportAssignments()).items[0];
 assert.equal((await adapter.history()).find(row=>row.workout.id===f.ids[0]).selectable,false);
 f.setDisplayed(account('alice',2));f.setLive(account('alice',2));assert.equal(await adapter.reconcileDeletedTarget(account('alice',2)),1);
 assert.equal((await adapter.history()).find(row=>row.workout.id===f.ids[0]).selectable,true);
 await adapter.choose('import',[f.ids[0]],account('alice',2));const state=await f.scope.listImportAssignments(),latest=state.items.find(item=>item.generation===2);
 assert.equal(state.items.length,2);assert.equal(latest.targetDataEpoch,2);assert.notEqual(latest.idempotencyKey,first.idempotencyKey);assert.deepEqual(state.items.find(item=>item.generation===1),first);
 const after=await f.scope.exportLocalData();for(const key of ['workouts','events','outbox'])assert.deepEqual(after[key],before[key]);assert(f.requests.every(request=>request.options.method==='GET'));
});
test('epoch mismatch or wrong-owner proof never releases or retargets history',async t=>{
 const f=await fixture(t),adapter=f.make();await adapter.choose('import',[f.ids[0]],account());
 f.setLive(account('alice',2));await assert.rejects(adapter.reconcileDeletedTarget(account()),{code:'account_scope_changed'});
 f.setDisplayed(account('alice',2));f.setLive({...account('alice',2),deletionEvidence:account('bob',2).deletionEvidence});await assert.rejects(adapter.reconcileDeletedTarget(account('alice',2)),{code:'invalid_deletion_evidence'});
 assert.equal((await f.scope.listImportAssignments()).heads[0].status,'active');
});
test('account switch during fresh read cannot create a choice for either destination',async t=>{
 const f=await fixture(t);let release;const held=new Promise(resolve=>release=resolve),adapter=f.make({request:()=>held});
 const pending=adapter.choose('import',[f.ids[0]],account());f.transitions.invalidate();f.setDisplayed(account('bob'));release(Response.json(account()));await assert.rejects(pending,{code:'auth_transition'});assert.equal((await f.scope.listImportAssignments()).items.length,0);
});
test('selection is captured before credential await; caller mutation cannot add workouts',async t=>{
 const f=await fixture(t);let release;const held=new Promise(resolve=>release=resolve),adapter=f.make({request:()=>held}),selected=[f.ids[0]];
 const pending=adapter.choose('import',selected,account());selected.push(f.ids[1]);release(Response.json(account()));await pending;assert.deepEqual((await f.scope.listImportAssignments()).items.map(item=>item.clientWorkoutId),[f.ids[0]]);
});
test('default disabled upload does no account, local repository or transport work',async()=>{
 const nope=()=>{throw Error('must not run');};const adapter=createImportAccountAdapter({repository:{},request:nope,transitions:{},getAccount:nope});
 assert.deepEqual(await adapter.upload(null),{stopped:'disabled',posted:0,imported:0});
});


test('history exposes exhausted crash recovery after reopen for explicit resume and preserves deletion precedence',async t=>{
 const options={name:'import-adapter-crash-'+crypto.randomUUID(),indexedDB,IDBKeyRange,now:()=>1000};
 let repository=await openLocalCoach(options),scope=repository.forOwner(repository.guestOwnerId),clock=90099,selected=account();
 t.after(()=>repository.close());
 const clientWorkoutId=crypto.randomUUID();
 await scope.startWorkout({clientWorkoutId,mode:'squat',goal:3});
 await scope.completeWorkout(clientWorkoutId,{value:3,activeSeconds:1,elapsedSeconds:1});
 const make=()=>createImportAccountAdapter({repository:scope,request:async()=>Response.json(selected),transitions:transition(),getAccount:()=>selected,now:()=>clock});
 let adapter=make();await adapter.choose('import',[clientWorkoutId],selected);
 const item=(await scope.listImportAssignments()).items[0];
 for(let index=0;index<3;index++)await scope.beginImportAttempt({claimId:item.claimId,generation:1,attemptId:'crash-'+index,startedAt:100+index*30000});
 repository.close();repository=await openLocalCoach(options);scope=repository.forOwner(repository.guestOwnerId);adapter=make();
 const before=await scope.listImportAssignments();
 assert.equal((await adapter.history())[0].status,'in_flight');
 clock=90100;
 const row=(await adapter.history())[0];
 assert.equal(row.status,'parked');assert.equal(row.selectable,false);
 assert.equal(row.item.claimId,item.claimId);
 assert.deepEqual(await scope.listImportAssignments(),before);
 await assert.rejects(scope.beginImportAttempt({claimId:item.claimId,generation:1,attemptId:'automatic',startedAt:clock}));
 await scope.beginImportAttempt({claimId:item.claimId,generation:1,attemptId:'explicit',startedAt:clock},{resumeParked:true});
 assert.equal((await adapter.history())[0].status,'in_flight');
 clock+=30000;assert.equal((await adapter.history())[0].status,'retryable');
 selected=account('alice',2);await adapter.reconcileDeletedTarget(selected);
 assert.equal((await adapter.history())[0].status,'target_deleted');assert.equal((await adapter.history())[0].selectable,true);
 await adapter.choose('import',[clientWorkoutId],selected);
 assert.equal((await adapter.history())[0].status,'pending');
 assert.deepEqual((await scope.listImportAssignments()).items.find(row=>row.claimId===item.claimId),item);
});
