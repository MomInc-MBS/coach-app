import test from 'node:test';
import assert from 'node:assert/strict';
import {createAuthTransition} from '../auth-transition.mjs';
import {createStandaloneAccountContext} from '../standalone-account-context.mjs';
import {performanceOwner} from '../performance-progress.mjs';
import {grantUnlock,isGranted} from '../creature/source/creator/unlock-store.ts';
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
const account=(id='A',dataEpoch=1)=>({user:{id},dataEpoch,progress:{},entitlements:{}});
const reply=value=>new Response(JSON.stringify(value),{headers:{'Content-Type':'application/json'}});
function fixture(request,timeoutMs=100){
 const data=new Map(),storage={getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,String(value))};
 const target=new EventTarget(),channel=new EventTarget();channel.postMessage=()=>{};
 const transitions=createAuthTransition({storage,events:target,channelFactory:()=>channel,randomUUID:()=>crypto.randomUUID()});
 const priorStorage=globalThis.localStorage,priorAccount=globalThis.myr5AuthenticatedAccount;globalThis.localStorage=storage;
 Object.defineProperty(target,'myr5AuthenticatedAccount',{get:()=>globalThis.myr5AuthenticatedAccount,set:value=>{globalThis.myr5AuthenticatedAccount=value;}});
 const context=createStandaloneAccountContext({request,transitions,target,timeoutMs});
 return {context,transitions,target,storage,close(){context.dispose();transitions.close();globalThis.localStorage=priorStorage;globalThis.myr5AuthenticatedAccount=priorAccount;}};
}

test('standalone verified account binds the actual cosmetic store to the account and data epoch',async()=>{
 const f=fixture(async()=>reply(account('verified-owner',3)));let ready=0;f.target.addEventListener('myr5:account-ready',()=>ready++);
 try{const value=await f.context.refresh();assert.equal(value.user.id,'verified-owner');assert.equal(ready,1);assert.equal(performanceOwner(), 'account:verified-owner:3');grantUnlock('texture','chest-plate-steel','myr5');assert(isGranted('texture','chest-plate-steel','myr5'));f.transitions.invalidate();assert.equal(globalThis.myr5AuthenticatedAccount,null);assert(!isGranted('texture','chest-plate-steel','myr5'));}finally{f.close();}
});

test('a response from before sign-out cannot republish account ownership',async()=>{
 const waiting=deferred(),f=fixture(()=>waiting.promise);
 try{const pending=f.context.refresh();f.transitions.invalidate();waiting.resolve(reply(account()));assert.equal(await pending,null);assert.equal(f.context.account,null);assert.equal(globalThis.myr5AuthenticatedAccount,null);}finally{f.close();}
});

test('newer refresh wins and stale unauthorized responses cannot clear its account',async()=>{
 const first=deferred(),second=deferred();let calls=0;const f=fixture(()=>++calls===1?first.promise:second.promise);
 try{const old=f.context.refresh(),fresh=f.context.refresh();second.resolve(reply(account('B',4)));await fresh;first.resolve(new Response('{}',{status:401}));await old;assert.equal(globalThis.myr5AuthenticatedAccount.user.id,'B');assert.equal(globalThis.myr5AuthenticatedAccount.dataEpoch,4);}finally{f.close();}
});

test('verified account and epoch changes invalidate the previous authority before rebinding',async()=>{
 let value=account('A',1);const f=fixture(async()=>reply(value));
 try{await f.context.refresh();const prior=f.transitions.capture();value=account('A',2);assert.equal(await f.context.refresh(),null);assert(!f.transitions.isCurrent(prior));assert.equal(globalThis.myr5AuthenticatedAccount,null);await f.context.refresh();assert.equal(performanceOwner(),'account:A:2');value=account('B',1);await f.context.refresh();assert.equal(globalThis.myr5AuthenticatedAccount,null);await f.context.refresh();assert.equal(performanceOwner(),'account:B:1');}finally{f.close();}
});

test('invalid, redirected, unauthorized and unavailable responses clear rather than cache identity',async()=>{
 for(const response of [new Response('{}',{status:401}),reply({user:{id:'A'}}),reply(account('A',0)),new Response('<html>Login</html>',{headers:{'Content-Type':'text/html'}})]){
  const f=fixture(async()=>response);try{assert.equal(await f.context.refresh(),null);assert.equal(globalThis.myr5AuthenticatedAccount,null);}finally{f.close();}
 }
});

test('a stalled account request has a bounded deadline and cannot publish a late success',async()=>{
 const waiting=deferred(),f=fixture(()=>waiting.promise,5);
 try{assert.equal(await f.context.refresh(),null);waiting.resolve(reply(account()));await new Promise(resolve=>setTimeout(resolve,1));assert.equal(globalThis.myr5AuthenticatedAccount,null);}finally{f.close();}
});
