import test from 'node:test';
import assert from 'node:assert/strict';

const memory=new Map(),writes=new Map(),events=[];
globalThis.localStorage={
 getItem:key=>memory.get(key)??null,
 setItem:(key,value)=>{memory.set(key,String(value));writes.set(key,(writes.get(key)||0)+1);},
 removeItem:key=>memory.delete(key),clear:()=>memory.clear(),
};
globalThis.myr5AuthenticatedAccount={user:{id:'quest-owner'},dataEpoch:1};
globalThis.CustomEvent=class{constructor(type,init){this.type=type;this.detail=init?.detail;}};
globalThis.window={dispatchEvent:event=>events.push(event),addEventListener(){}};

const {performanceOwner}=await import('../performance-progress.mjs');
const bridge=await import('../modules/vault/quest-progress.mjs');
const store=await import('../modules/vault/vault-store.mjs');
const owner=performanceOwner(),vaultKey=`myr5-vault-v1/${encodeURIComponent(owner)}`;

test('game progress is owner-bound, bounded, and deduplicated before Vault writes',()=>{
 memory.clear();writes.clear();
 assert.equal(bridge.recordQuestProgress({ownerId:owner,counter:'fruit-streak',value:5}),true);
 const writesAtEarn=writes.get(vaultKey);
 assert.equal(store.read().counters['fruit-streak'],5);
 assert.equal(store.read().earned['fruit-streak-5']>0,true);
 assert.equal(bridge.recordQuestProgress({ownerId:owner,counter:'fruit-streak',value:5}),false,'same high-water mark is a no-op');
 assert.equal(bridge.recordQuestProgress({ownerId:owner,counter:'fruit-streak',value:4}),false,'downward correction is ignored');
 assert.equal(writes.get(vaultKey),writesAtEarn,'duplicate snapshots do not write or re-evaluate');
 assert.equal(bridge.recordQuestProgress({ownerId:owner,counter:'pyramid-level',value:21}),false,'level is capped at 20');
 assert.equal(bridge.recordQuestProgress({ownerId:owner,counter:'aura-tier',value:4.5}),false,'tiers must be integers');
 globalThis.myr5AuthenticatedAccount={user:{id:'quest-other'},dataEpoch:1};
 assert.equal(bridge.recordQuestProgress({ownerId:owner,counter:'pyramid-level',value:5}),false,'late callback from previous owner is rejected');
 assert.equal(store.read().counters['pyramid-level']||0,0,'stale callback does not touch the new owner vault');
});

test('a failed Vault write does not advance the dedupe cache and the same metric can retry',()=>{
 memory.clear();writes.clear();globalThis.myr5AuthenticatedAccount={user:{id:'quest-write-retry'},dataEpoch:1};
 const retryOwner=performanceOwner(),retryKey=`myr5-vault-v1/${encodeURIComponent(retryOwner)}`;
 const original=globalThis.localStorage.setItem;let fail=true;
 globalThis.localStorage.setItem=(key,value)=>{if(key===retryKey&&fail)throw Error('temporary storage failure');original.call(globalThis.localStorage,key,value);};
 try{
  assert.equal(bridge.recordQuestProgress({ownerId:retryOwner,counter:'pyramid-level',value:5}),false,'failed write stays unconfirmed');
  fail=false;
  assert.equal(bridge.recordQuestProgress({ownerId:retryOwner,counter:'pyramid-level',value:5}),true,'the identical event retries after storage recovers');
  assert.equal(store.read().counters['pyramid-level'],5);
 }finally{globalThis.localStorage.setItem=original;}
});

test('a cached Vault store can drain game progress when the hall opens later',async()=>{
 memory.clear();globalThis.myr5AuthenticatedAccount={user:{id:'quest-vault-open'},dataEpoch:1};
 const activeOwner=performanceOwner(),pendingKey=`myr5-quest-pending-v1/${encodeURIComponent(activeOwner)}`;
 memory.set(pendingKey,JSON.stringify({ownerId:activeOwner,values:{'pyramid-level':7}}));
 assert.equal(await store.drainQuestPending({load:async()=>bridge}),true);
 assert.equal(store.read().counters['pyramid-level'],7);
 assert.equal(memory.has(pendingKey),false,'confirmed queue drains on explicit hall-open retry');
});

test('workout quest bridge routes verified effect tiers and accepts finalized credited snapshots',()=>{
 memory.clear();globalThis.myr5AuthenticatedAccount={user:{id:'quest-owner'},dataEpoch:1};
 const activeOwner=performanceOwner();
 const workout=(mode,kind,extra={})=>({workout:{ownerId:activeOwner,sessionId:'s1',mode,kind,stage:'working',paused:false,active:true,workingReps:0,activeSeconds:0,...extra}});
 assert.equal(bridge.recordWorkoutQuestProgress(workout('squat','reps',{workingReps:16,active:false})),true);
 assert.equal(store.read().counters['aura-tier'],4);
 assert.equal(bridge.recordWorkoutQuestProgress(workout('pushup','reps',{workingReps:16})),true);
 assert.equal(store.read().counters['fire-tier'],4);
 assert.equal(bridge.recordWorkoutQuestProgress(workout('lateral-raise','reps',{workingReps:16})),true);
 assert.equal(store.read().counters['lightning-tier'],4);
 assert.equal(bridge.recordWorkoutQuestProgress(workout('high-plank','hold',{activeSeconds:465,active:false})),true);
 assert.equal(store.read().counters['blizzard-tier'],4);
 const yoga=workout('mountain','hold',{activeSeconds:60,active:false});yoga.validHold=false;
 assert.equal(bridge.recordWorkoutQuestProgress(yoga),true,'credited active time survives the final inactive snapshot');
 assert.equal(store.read().counters['yoga-hold-seconds'],60);
});

test('workout bridge rejects wrong owner, exercise kind, paused/preparation, and invalid raw units',()=>{
 memory.clear();globalThis.myr5AuthenticatedAccount={user:{id:'quest-owner'},dataEpoch:2};
 const activeOwner=performanceOwner();
 const detail=(mode,kind,overrides={})=>({workout:{ownerId:activeOwner,mode,kind,stage:'working',paused:false,workingReps:16,activeSeconds:60,...overrides}});
 assert.equal(bridge.recordWorkoutQuestProgress(detail('mountain','reps')),false,'hold exercises cannot earn reps aura');
 assert.equal(bridge.recordWorkoutQuestProgress(detail('mountain','hold',{paused:true})),false);
 assert.equal(bridge.recordWorkoutQuestProgress(detail('mountain','hold',{stage:'preparation'})),false);
 assert.equal(bridge.recordWorkoutQuestProgress(detail('pushup','reps',{workingReps:Infinity})),false);
 assert.equal(bridge.recordWorkoutQuestProgress(detail('pushup','reps',{workingReps:31})),false);
 assert.equal(bridge.recordWorkoutQuestProgress({workout:{...detail('mountain','hold').workout,ownerId:'account:someone-else'}}),false);
 assert.equal(store.read().counters['aura-tier']||0,0);
 assert.equal(store.read().counters['yoga-hold-seconds']||0,0);
});

test('Pyramid quest milestones require an upward transition; resume baseline is not a level clear',async()=>{
 const {newlyReachedQuestLevel}=await import('../arcade/pyramid-jump/logic.mjs');
 assert.equal(newlyReachedQuestLevel(9,9),null,'resume at level 10 does not count itself again');
 assert.equal(newlyReachedQuestLevel(9,10),11,'next actual upward transition counts level 11');
 assert.equal(newlyReachedQuestLevel(18,19),20,'entering level 20 is a level milestone only');
 assert.equal(newlyReachedQuestLevel(19,19),null,'desk landing is handled by the separate win counter');
 assert.equal(newlyReachedQuestLevel(2,1),null,'downward correction is ignored');
});
