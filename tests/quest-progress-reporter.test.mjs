import test from 'node:test';
import assert from 'node:assert/strict';
import {createQuestProgressReporter} from '../arcade/quest-progress-reporter.mjs';
import {performanceOwner} from '../performance-progress.mjs';

const tick=()=>new Promise(resolve=>setImmediate(resolve));

test('offline game milestones stay queued, drain later for their captured owner, and are idempotent',async()=>{
 const data=new Map(),storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)};
 let owner='account:A',loads=0,writes=[],now=0;
 const load=async()=>{if(++loads===1)throw Error('offline');return {recordQuestProgress:event=>{writes.push(event);},questProgressStored:(_owner,_counter,value)=>value<=8};};
 const reporter=createQuestProgressReporter(owner,{storage,currentOwner:()=>owner,load,now:()=>now});
 assert.equal(reporter.record('fruit-streak',5),true);await tick();
 const key='myr5-quest-pending-v1/account%3AA';
 assert.deepEqual(JSON.parse(data.get(key)).values,{'fruit-streak':5});
 now=1000;assert.equal(reporter.record('fruit-streak',8),true);await tick();
 assert.deepEqual(writes,[{ownerId:'account:A',counter:'fruit-streak',value:8}]);
 assert.equal(data.has(key),false,'confirmed max is removed after a successful drain');
 assert.equal(reporter.record('fruit-streak',8),false,'confirmed duplicate does no queue or Vault work');await tick();
 assert.equal(loads,2,'confirmed repeated metrics do not reimport Vault');
});

test('pending game progress cannot drain or be attributed after an account switch',async()=>{
 const data=new Map(),storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)};
 let owner='account:A',writes=0,fail=true,now=0;
 const reporter=createQuestProgressReporter(owner,{storage,currentOwner:()=>owner,now:()=>now,load:async()=>{if(fail)throw Error('offline');return {recordQuestProgress:()=>{writes++;},questProgressStored:()=>true};}});
 reporter.record('pyramid-level',7);await tick();owner='account:B';fail=false;
 assert.equal(await reporter.drain(),false);assert.equal(writes,0);
 owner='account:A';now=1000;assert.equal(await reporter.drain(),true);assert.equal(writes,1);
});

test('reporter rejects out-of-bound metrics before queueing',()=>{
 const data=new Map(),storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)};
 const reporter=createQuestProgressReporter('owner',{storage,currentOwner:()=> 'owner',load:async()=>({recordQuestProgress(){}})});
 assert.equal(reporter.record('pyramid-level',21),false);assert.equal(reporter.record('aura-tier',3.5),false);assert.equal(data.size,0);
});

test('online delivery can drain after the first queue write fails, including a concurrent higher maximum',async()=>{
 const data=new Map();let failWrite=true,owner='account:C',resolveLoad,loads=0,writes=[];
 const storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>{if(failWrite)throw Error('storage unavailable');data.set(k,String(v));},removeItem:k=>data.delete(k)};
 const load=()=>{loads++;return new Promise(resolve=>{resolveLoad=resolve;});};
 const reporter=createQuestProgressReporter(owner,{storage,currentOwner:()=>owner,load});
 assert.equal(reporter.record('fruit-streak',5),true);
 await tick();
 reporter.record('fruit-streak',8);
 failWrite=false;
 const module={recordQuestProgress:event=>writes.push(event),questProgressStored:(_owner,_counter,value)=>value<=8};
 resolveLoad(module);await tick();
 assert.deepEqual(writes,[{ownerId:owner,counter:'fruit-streak',value:8}], 'one in-flight drain reads the latest owner-scoped maximum');
 assert.equal(data.size,0,'confirmed pending record is cleared after storage recovers');
 assert.equal(loads,1,'concurrent records share one loader/drain');
});

test('failed optional loads back off while per-pose snapshots still update the durable maximum',async()=>{
 const data=new Map();let now=0,loads=0,owner='account:D';
 const storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)};
 const reporter=createQuestProgressReporter(owner,{storage,currentOwner:()=>owner,now:()=>now,baseDelay:1000,maxDelay:8000,load:async()=>{loads++;throw Error('offline');}});
 for(let n=3;n<=8;n++)reporter.record('fruit-streak',n);
 await tick();assert.equal(loads,1,'all rapid snapshots share a single failed load');
 assert.equal(JSON.parse(data.get('myr5-quest-pending-v1/account%3AD')).values['fruit-streak'],8,'higher maxima persist despite backoff');
 for(let n=9;n<=12;n++)reporter.record('fruit-streak',n);await tick();assert.equal(loads,1,'per-pose callbacks do not retry while offline');
 now=1000;reporter.record('fruit-streak',12);await tick();assert.equal(loads,2,'the next bounded retry occurs after cooldown');
});

test('loaded Vault write failures back off and the same value retries after recovery',async()=>{
 const data=new Map();let now=0,loads=0,writes=0,stored=false,owner='account:E';
 const storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)};
 const reporter=createQuestProgressReporter(owner,{storage,currentOwner:()=>owner,now:()=>now,baseDelay:1000,load:async()=>{loads++;return {recordQuestProgress:()=>{writes++;},questProgressStored:()=>stored};}});
 reporter.record('pyramid-level',8);await tick();assert.equal(loads,1);assert.equal(writes,1);
 reporter.record('pyramid-level',8);await tick();assert.equal(loads,1,'loaded module write failures respect cooldown');assert.equal(writes,1,'same value does not trigger another write during backoff');
 now=1000;stored=true;reporter.record('pyramid-level',8);await tick();
 assert.equal(loads,1,'the reporter reuses the successfully loaded module');assert.equal(writes,2,'the identical value is retried after storage recovery');
 assert.equal(data.size,0,'confirmed metric leaves the queue');
});

test('a rejected plain module URL retries with a unique query, then reuses the loaded module',async()=>{
 const data=new Map();let now=0,owner='account:F';const urls=[],writes=[];
 const storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)};
 const module={recordQuestProgress:event=>writes.push(event),questProgressStored:()=>true};
 const reporter=createQuestProgressReporter(owner,{storage,currentOwner:()=>owner,now:()=>now,baseDelay:1000,importer:async url=>{urls.push(url);if(urls.length===1)throw Error('cached module fetch rejection');return module;}});
 reporter.record('pyramid-level',5);await tick();
 now=1000;reporter.record('pyramid-level',5);await tick();
 assert.deepEqual(urls,['../modules/vault/quest-progress.mjs','../modules/vault/quest-progress.mjs?quest-retry=1']);
 assert.deepEqual(writes,[{ownerId:owner,counter:'pyramid-level',value:5}]);
 assert.equal(await reporter.drain(),true);assert.equal(urls.length,2,'successful module is cached by the same reporter');
});

test('workout reporter retains final inactive credited yoga and Blizzard snapshots',async()=>{
 globalThis.myr5AuthenticatedAccount={user:{id:'report-workout'}};const owner=performanceOwner(),writes=[];
 const reporter=createQuestProgressReporter(owner,{currentOwner:()=>owner,load:async()=>({recordQuestProgress:event=>writes.push(event),questProgressStored:()=>false})});
 const detail=(mode,kind,extra)=>({workout:{ownerId:owner,mode,kind,stage:'working',paused:false,active:false,validHold:false,activeSeconds:60,...extra}});
 assert.equal(reporter.recordWorkout(detail('mountain','hold',{})),true);
 assert.equal(reporter.recordWorkout(detail('high-plank','hold',{})),true);
 await tick();
 assert.deepEqual(writes.map(({counter,value})=>[counter,value]).sort(),[['blizzard-tier',2],['yoga-hold-seconds',60]]);
});
