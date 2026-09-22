import test from 'node:test';
import assert from 'node:assert/strict';
import Dexie from 'dexie';
import {indexedDB,IDBKeyRange,IDBObjectStore} from 'fake-indexeddb';
import {IMPORT_LEDGER_STORES,createImportLedger} from '../local-coach/import-ledger.mjs';
import {fingerprintImportSnapshot,importIdempotencyKey} from '../workout-import-codec.mjs';
let seq=0;
const ids=['00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002'];
class StorageError extends Error {constructor(code,message){super(message);this.code=code;}}
const row=id=>({id,clientWorkoutId:id,ownerId:'guest:a',deviceId:'device:a',schemaVersion:1,status:'completed',mode:'squat',goal:3,restSeconds:60,startedAt:1000,completedAt:2000,updatedAt:2000,completion:{value:3,activeSeconds:1,elapsedSeconds:1},metadata:{private:'never upload'}});
async function setup(name=`preparation-${++seq}`){
 const db=new Dexie(name,{indexedDB,IDBKeyRange});db.version(1).stores({workouts:'&id,ownerId',outbox:'&id',...IMPORT_LEDGER_STORES});await db.open();
 if(!await db.workouts.count()){await db.workouts.bulkAdd(ids.map(row));await db.outbox.put({id:'ordinary',payload:'unchanged'});}
 const api=createImportLedger({db,ownerId:'guest:a',deviceId:'device:a',getWorkout:id=>db.workouts.get(id),transact:(_,tables,fn)=>db.transaction('rw',...tables,fn),StorageError,classifyError:e=>e});
 return {db,api};
}
const choice=(overrides={})=>({decisionId:'decision',kind:'import',targetAccountId:'alice',targetDataEpoch:1,selections:ids.map((id,i)=>({clientWorkoutId:id,claimId:`claim${i}`,itemId:`item${i}`})),...overrides});

test('trusted projection binds exact digest/key; both selections and header commit together',async()=>{
 const {db,api}=await setup(),source=await db.workouts.toArray(),outbox=await db.outbox.toArray();
 const input=choice(),token=await api.prepareImportDecision(input);input.targetAccountId='mutated';
 const result=await api.commitImportDecision(token);assert.equal(result.items.length,2);assert.equal(result.duplicate,false);
 for(const {item} of result.items){assert.equal(item.targetAccountId,'alice');assert.equal(item.digestVersion,1);assert.equal(item.snapshot.metadata,undefined);assert.equal(item.snapshot.ownerId,undefined);assert.equal(item.fingerprint,await fingerprintImportSnapshot(item.snapshot));assert.equal(item.idempotencyKey,await importIdempotencyKey({digestVersion:1,targetAccountId:'alice',targetDataEpoch:1,clientWorkoutId:item.clientWorkoutId,fingerprint:item.fingerprint}));}
 assert.equal(await db.guestHistoryDecisions.count(),1);assert.equal(await db.guestHistoryAssignmentHeads.count(),2);assert.deepEqual(await db.workouts.toArray(),source);assert.deepEqual(await db.outbox.toArray(),outbox);db.close();
});

test('second item write failure rolls back entire header/items/heads',async()=>{
 const {db,api}=await setup(),token=await api.prepareImportDecision(choice()),add=IDBObjectStore.prototype.add;
 IDBObjectStore.prototype.add=function(value,...args){if(this.name==='guestHistoryItems'&&value.itemId==='item1')throw new DOMException('failure','AbortError');return add.call(this,value,...args);};
 try{await assert.rejects(api.commitImportDecision(token));}finally{IDBObjectStore.prototype.add=add;}
 for(const key of Object.keys(IMPORT_LEDGER_STORES))assert.equal(await db.table(key).count(),0);db.close();
});

test('source and head races abort whole selection across independent connections',async()=>{
 const one=await setup(),two=await setup(one.db.name);
 const token=await one.api.prepareImportDecision(choice());await two.db.workouts.update(ids[1],{updatedAt:3000});await assert.rejects(one.api.commitImportDecision(token));assert.equal(await one.db.guestHistoryItems.count(),0);
 const left=await one.api.prepareImportDecision(choice()),right=await two.api.prepareImportDecision(choice({decisionId:'other',selections:[{clientWorkoutId:ids[1],claimId:'otherclaim',itemId:'otheritem'}]}));
 await two.api.commitImportDecision(right);await assert.rejects(one.api.commitImportDecision(left));assert.equal(await one.db.guestHistoryItems.count(),1);assert.equal(await one.db.guestHistoryDecisions.count(),1);one.db.close();two.db.close();
});

test('exact historical retry survives source removal/reopen; changed selection or target rejects',async()=>{
 const first=await setup(),original=await first.api.commitImportDecision(await first.api.prepareImportDecision(choice())),name=first.db.name;
 await first.db.workouts.clear();first.db.close();
 const second=await setup(name);await second.db.workouts.clear();
 const retry=await second.api.commitImportDecision(await second.api.prepareImportDecision(choice({selections:choice().selections.reverse()})));
 assert.equal(retry.duplicate,true);assert.deepEqual(retry.items,original.items);
 for(const change of [{targetAccountId:'bob'},{targetDataEpoch:2},{selections:[choice().selections[0]]},{selections:choice().selections.map(s=>({...s,itemId:s.itemId+'x'}))}])await assert.rejects(second.api.prepareImportDecision(choice(change)));
 second.db.close();
});

test('keep-local omits snapshot/digests/target and needs no importable completion or crypto',async()=>{
 const {db,api}=await setup();await db.workouts.update(ids[0],{completion:{value:3}});
 const input=choice({kind:'keep_local'});delete input.targetAccountId;delete input.targetDataEpoch;
 const digest=globalThis.crypto.subtle.digest;let result;
 globalThis.crypto.subtle.digest=()=>{throw Error('keep_local must not hash');};
 try{result=await api.commitImportDecision(await api.prepareImportDecision(input));}finally{globalThis.crypto.subtle.digest=digest;}
 for(const {item} of result.items)for(const key of ['snapshot','fingerprint','digestVersion','idempotencyKey','targetAccountId','targetDataEpoch'])assert.equal(Object.hasOwn(item,key),false);
 await assert.rejects(api.prepareImportDecision(choice({decisionId:'another'})));db.close();
});

test('import unavailable/malformed selection or forged token never creates rows',async()=>{
 const {db,api}=await setup();await db.workouts.update(ids[1],{completion:{value:3}});
 await assert.rejects(api.prepareImportDecision(choice()));await assert.rejects(api.commitImportDecision({decisionId:'decision'}));
 await assert.rejects(api.prepareImportDecision(choice({selections:[choice().selections[0],choice().selections[0]]})));
 let reads=0;const input=choice();Object.defineProperty(input,'targetAccountId',{enumerable:true,get(){reads++;return 'alice';}});await assert.rejects(api.prepareImportDecision(input));assert.equal(reads,0);
 assert.equal(await db.guestHistoryItems.count(),0);db.close();
});

test('confirmed deletion permits a fresh atomic choice without retargeting historical items',async()=>{
 const {db,api}=await setup();await api.commitImportDecision(await api.prepareImportDecision(choice()));
 for(let i=0;i<2;i++)await api.releaseImportAssignment({claimId:`claim${i}`,generation:1,ownerId:'alice',deletedThroughEpoch:1,currentDataEpoch:2});
 const next=choice({decisionId:'fresh',targetAccountId:'bob',selections:choice().selections.map(s=>({...s,claimId:s.claimId+'b',itemId:s.itemId+'b'}))});
 const result=await api.commitImportDecision(await api.prepareImportDecision(next));assert(result.items.every(({item})=>item.generation===2&&item.targetAccountId==='bob'));
 const retry=await api.commitImportDecision(await api.prepareImportDecision(choice()));assert(retry.items.every(({item,status})=>item.generation===1&&item.targetAccountId==='alice'&&status==='target_deleted'));
 assert.equal(await db.guestHistoryItems.count(),4);assert.equal(await db.guestHistoryAssignmentHeads.count(),2);db.close();
});

test('concurrent identical decisions are one atomic choice; changed targets cannot reuse identity',async()=>{
 const one=await setup(),two=await setup(one.db.name);
 const a=await one.api.prepareImportDecision(choice()),b=await two.api.prepareImportDecision(choice());
 const results=await Promise.all([one.api.commitImportDecision(a),two.api.commitImportDecision(b)]);
 assert.deepEqual(results.map(r=>r.duplicate).sort(),[false,true]);assert.equal(await one.db.guestHistoryItems.count(),2);
 await assert.rejects(two.api.prepareImportDecision(choice({targetAccountId:'bob'})));one.db.close();two.db.close();
});


test('hashing runs after read transaction closes and before atomic commit starts',async()=>{
 const {db,api}=await setup(),digest=globalThis.crypto.subtle.digest;let calls=0,token;
 globalThis.crypto.subtle.digest=function(...args){assert.equal(Dexie.currentTransaction,null);calls++;return digest.apply(this,args);};
 try{token=await api.prepareImportDecision(choice());}finally{globalThis.crypto.subtle.digest=digest;}
 assert.equal(calls,4);assert.equal(await db.guestHistoryItems.count(),0);await api.commitImportDecision(token);db.close();
});
