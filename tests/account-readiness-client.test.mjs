import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {createAccountReadinessRefresh} from '../account-readiness-client.mjs';
import {probeOptionalAccount,probeOptionalTransfer,LocalCoachStorageError} from '../local-coach/browser-runtime.mjs';
import {restoreInstall} from '../install-transfer.mjs';
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
function transitions(){let version=0;const listeners=[];return {capture:()=>({version}),isCurrent:ticket=>ticket.version===version,subscribe(fn){listeners.push(fn);},invalidate(){version++;listeners.forEach(fn=>fn());}};}
const observation=(state='ready',startedAt=10)=>({state,startedAt,observationId:String(startedAt),checkedAt:startedAt});
const account=()=>({user:{id:'A'},dataEpoch:1,push:{configured:true,publicKey:'keep',schedulerActive:true,status:'ready'},readiness:{reminders:{...observation(),push:{configured:true,publicKey:'keep',schedulerActive:true}},training:observation()}});
function fixture(api){let current=account();const t=transitions(),applied=[];const helper=createAccountReadinessRefresh({api,transitions:t,getAccount:()=>current,apply:value=>{applied.push(value);Object.assign(current,value);}});return {helper,t,applied,get:()=>current,set:value=>current=value};}
const response=(epoch=1)=>({targetAccountId:'A',dataEpoch:epoch,readiness:{reminders:{...observation('ready',20),push:{configured:true,publicKey:'new',schedulerActive:true}},training:observation('ready',20)}});
test('optional browser readiness discards cross-auth, owner and epoch responses',async()=>{
 for(const transition of ['auth','owner','epoch','response']){const gate=deferred(),f=fixture(()=>gate.promise),pending=f.helper.refresh();if(transition==='auth')f.t.invalidate();if(transition==='owner')f.set({...account(),user:{id:'B'}});if(transition==='epoch')f.set({...account(),dataEpoch:2});gate.resolve(response(transition==='response'?2:1));assert.equal(await pending,false);assert.equal(f.applied.length,0);}
});
test('overlapping optional refreshes cannot overwrite newer observation',async()=>{
 const gate=deferred();let calls=0;const f=fixture(()=>++calls===1?gate.promise:Promise.resolve(response()));const old=f.helper.refresh();assert.equal(await f.helper.refresh(),true);gate.resolve({...response(),readiness:{reminders:observation('unavailable',11)}});assert.equal(await old,false);assert.equal(f.get().readiness.reminders.startedAt,20);
});
test('optional channel/network failure preserves independent successful observations and core state',async()=>{
 const f=fixture(async()=>({targetAccountId:'A',dataEpoch:1,readiness:{reminders:observation('unavailable',20),training:{state:'unknown'}},push:{configured:false,publicKey:null,status:'unavailable'}}));
 await f.helper.refresh();assert.equal(f.get().readiness.reminders.state,'unavailable');assert.equal(f.get().readiness.training.state,'ready');assert.equal(f.get().push.publicKey,'keep');assert.equal(f.get().push.status,'unavailable');assert.equal(f.get().stale,undefined);
 const failed=fixture(async()=>{throw Error('offline');});assert.equal(await failed.helper.refresh(),false);assert.equal(failed.applied.length,0);assert.equal(failed.get().push.publicKey,'keep');
});
test('actual launch core refresh returns without awaiting optional readiness',async()=>{
 const source=await readFile(new URL('../launch.mjs',import.meta.url),'utf8'),line=source.split('\n').find(s=>s.startsWith('async function refresh(){')),value={...account(),revision:1,profile:{},progress:{}};let started=0;
 const context={account:null,accountTransitionBusy:false,revision:0,accountTransitions:{beginRefresh:()=>({}),isCurrent:()=>true},packGrantCache:{confirm(){},deactivate(){},active(){return null;}},api:async()=>value,applyCoachAccount(){},$:()=>({}),set(){},publishProgress(){},optionalReadiness:{refresh(){started++;return new Promise(()=>{});}},syncDeviceSwitch:async()=>{},flushSets:async()=>{},window:{},navigator:{onLine:true},Object};
 const refresh=vm.runInNewContext(line+';refresh',context);assert.equal(await refresh(),value);assert.equal(started,1);assert.equal(context.account,value);
});
function clock(){let fire,cleared=0;return {options:{timeoutMs:20,setTimeoutFn:fn=>{fire=fn;return 1;},clearTimeoutFn:()=>cleared++},fire:()=>fire(),cleared:()=>cleared};}
test('account and install probes have bounded deadlines and abort signals',async()=>{
 for(const probe of [probeOptionalAccount,probeOptionalTransfer]){const timer=clock();let signal;const pending=probe(options=>{signal=options.signal;return new Promise(()=>{});},timer.options);await Promise.resolve();timer.fire();assert.equal(await pending,null);assert.equal(signal.aborted,true);assert.equal(timer.cleared(),1);}
});
test('timeouts/5xx permit local startup but 4xx/auth-config and local database failures propagate',async()=>{
 for(const probe of [probeOptionalAccount,probeOptionalTransfer]){
  for(const error of [Object.assign(Error('timeout'),{name:'TimeoutError'}),Object.assign(Error('503'),{status:503}),new TypeError('network')])assert.equal(await probe(async()=>{throw error;}),null);
  for(const error of [Object.assign(new TypeError('403'),{status:403}),Object.assign(Error('configuration'),{status:401,code:'auth-config'}),new LocalCoachStorageError('unavailable','database failed')])await assert.rejects(probe(async()=>{throw error;}),e=>e===error);
 }
 assert.equal(await probeOptionalAccount(async()=>{throw Object.assign(Error('not signed in'),{status:401});}),null);
});
test('late optional install JSON cannot modify local storage after deadline',async()=>{
 const timer=clock(),body=deferred();let writes=0,signal;const storage={getItem:()=>null,setItem:()=>writes++,removeItem:()=>writes++};
 const pending=probeOptionalTransfer(options=>{signal=options.signal;return restoreInstall(async()=>({ok:true,json:()=>body.promise}),storage,storage,{signal});},timer.options);await Promise.resolve();await Promise.resolve();timer.fire();assert.equal(await pending,null);body.resolve({data:{anything:true}});await new Promise(r=>setImmediate(r));assert.equal(writes,0);
});
