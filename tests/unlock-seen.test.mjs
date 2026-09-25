import test from 'node:test';
import assert from 'node:assert/strict';
import {isUnseen,markSeen} from '../unlock-seen.mjs';
import {PENDING_KEY,noteUnlocked} from '../unlock-pending.mjs';
import {grantUnlock,LEDGER_KEY} from '../unlock-ledger.mjs';
import {grantUnlock as grantStoreUnlock} from '../creature/source/creator/unlock-store.ts';

function withDevice(run){
 const prior=globalThis.localStorage,data=new Map();
 globalThis.localStorage={getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)};
 try{return run(data);}finally{if(prior===undefined)delete globalThis.localStorage;else globalThis.localStorage=prior;}
}

test('existing grants with no pending marker stay quiet (zero-flood migration)',()=>withDevice(data=>{
 data.set(LEDGER_KEY,JSON.stringify({weapon:['old-w'],pet:['old-p']}));
 data.set('myr5-unlocks-v1',JSON.stringify({texture:['old-t']}));
 assert.equal(isUnseen('weapon','old-w'),false);
 assert.equal(isUnseen('pet','old-p'),false);
 assert.equal(isUnseen('texture','old-t'),false);
 assert.equal(grantUnlock('weapon','new-w'),true);
 grantStoreUnlock('texture','new-t');
 assert.equal(isUnseen('weapon','new-w'),true);
 assert.equal(isUnseen('texture','new-t'),true);
 assert.equal(isUnseen('weapon','old-w'),false);
}));

test('a repeat grant does not re-mark an item that was viewed',()=>withDevice(()=>{
 grantUnlock('weapon','w1');markSeen('weapon','w1');
 assert.equal(grantUnlock('weapon','w1'),false);
 assert.equal(isUnseen('weapon','w1'),false);
}));

test('viewing clears exactly that item, not its neighbours or other kinds',()=>withDevice(()=>{
 grantUnlock('weapon','w1');grantUnlock('weapon','w2');grantUnlock('pet','w1');
 markSeen('weapon','w1');
 assert.equal(isUnseen('weapon','w1'),false);
 assert.equal(isUnseen('weapon','w2'),true);
 assert.equal(isUnseen('pet','w1'),true);
}));

test('device kinds share one record; account kinds are per account and need an account',()=>withDevice(data=>{
 grantUnlock('pet','push-pet');
 assert.deepEqual(JSON.parse(data.get(PENDING_KEY)),{pet:['push-pet']});
 assert.equal(grantUnlock('ship','ship-calm',{account:null}),false);
 assert.equal(grantUnlock('ship','ship-calm',{account:'user_a'}),true);
 assert.equal(isUnseen('ship','ship-calm',{account:'user_a'}),true);
 assert.equal(isUnseen('ship','ship-calm',{account:'user_b'}),false);
 assert.equal(isUnseen('ship','ship-calm',{account:null}),false);
 markSeen('ship','ship-calm',{account:null});
 assert.equal(isUnseen('ship','ship-calm',{account:'user_a'}),true);
 markSeen('ship','ship-calm',{account:'user_a'});
 assert.equal(isUnseen('ship','ship-calm',{account:'user_a'}),false);
 assert.equal(data.has(PENDING_KEY+'/account/user_b'),false);
}));

test('a grant that fails to persist is not marked; corrupt or full storage never throws',()=>withDevice(data=>{
 const set=globalThis.localStorage.setItem;
 globalThis.localStorage.setItem=()=>{throw Error('full');};
 assert.equal(grantUnlock('weapon','w1'),false);
 grantStoreUnlock('texture','t1');
 assert.equal(isUnseen('weapon','w1'),false);
 assert.equal(isUnseen('texture','t1'),false);
 globalThis.localStorage.setItem=set;
 data.set(PENDING_KEY,'{nope');
 assert.equal(isUnseen('weapon','w1'),false);
 assert.equal(grantUnlock('weapon','w1'),true);
 assert.equal(isUnseen('weapon','w1'),true);
 globalThis.localStorage.setItem=()=>{throw Error('full');};
 assert.doesNotThrow(()=>markSeen('weapon','w1'));
}));

test('derived body unlocks: first use is a quiet baseline, only later ids sparkle, locked ids never do',()=>withDevice(()=>{
 noteUnlocked('body',['a','b']);
 assert.equal(isUnseen('body','a'),false);
 assert.equal(isUnseen('body','b'),false);
 noteUnlocked('body',['a','b','c']);
 assert.equal(isUnseen('body','c'),true);
 assert.equal(isUnseen('body','a'),false);
 assert.equal(isUnseen('body','locked'),false);
 markSeen('body','c');noteUnlocked('body',['a','b','c']);
 assert.equal(isUnseen('body','c'),false);
}));

test('body baseline stays device scoped with an account signed in, and survives full storage',()=>withDevice(data=>{
 globalThis.myr5AuthenticatedAccount={user:{id:'u1'}};
 try{noteUnlocked('body',['a']);noteUnlocked('body',['a','b']);}finally{delete globalThis.myr5AuthenticatedAccount;}
 assert.equal(isUnseen('body','b'),true);
 assert.equal([...data.keys()].some(k=>k.includes('/account/')),false);
 globalThis.localStorage.setItem=()=>{throw Error('full');};
 assert.doesNotThrow(()=>noteUnlocked('body',['a','b','z']));
 assert.equal(isUnseen('body','z'),false);
}));

test('a visible new item retains its badge briefly before it is marked seen',async()=>{
 const priorStore=globalThis.localStorage,priorObserver=globalThis.IntersectionObserver;
 const data=new Map();globalThis.localStorage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};
 let report;globalThis.IntersectionObserver=class{constructor(callback){report=callback;}observe(){}disconnect(){}};
 const doc={visibilityState:'visible',getElementById:()=>null,createElement:()=>({}),head:{append(){}},addEventListener(){},removeEventListener(){}};
 const el={ownerDocument:doc,dataset:{},isConnected:true,addEventListener(){}};
 try{
  grantUnlock('weapon','dwell-w');
  const {sparkle}=await import('../unlock-seen.mjs');
  assert.equal(sparkle(el,'weapon','dwell-w'),true);
  report([{isIntersecting:true,intersectionRatio:.8}]);
  assert.equal(isUnseen('weapon','dwell-w'),true,'intersection does not erase the badge immediately');
  await new Promise(r=>setTimeout(r,1650));
  assert.equal(isUnseen('weapon','dwell-w'),false,'sustained visibility clears only this item');
 }finally{if(priorStore===undefined)delete globalThis.localStorage;else globalThis.localStorage=priorStore;if(priorObserver===undefined)delete globalThis.IntersectionObserver;else globalThis.IntersectionObserver=priorObserver;}
});
