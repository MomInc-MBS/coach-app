import test from 'node:test';
import assert from 'node:assert/strict';
import {receiveCoach} from '../receive-coach.mjs';
import {WEBSITE} from '../onboarding-domain.mjs';
import {completeCoach} from './onboarding-fixture.mjs';
test('only the opened website can transfer choices, and receipt follows durable session storage',async()=>{
 const original=globalThis.window,win=new EventTarget(),sent=[];win.opener={postMessage:(message,origin)=>sent.push({message,origin})};globalThis.window=win;let saved=null;
 const dispatch=(origin,source,profile)=>{const e=new Event('message');Object.assign(e,{origin,source,data:{type:'myr5:coach-transfer',profile}});win.dispatchEvent(e);};
 try{const pending=receiveCoach(raw=>saved=JSON.parse(raw));assert.equal(sent[0].message.type,'myr5:ready-for-coach');dispatch('https://unrelated.test',win.opener,completeCoach());dispatch(WEBSITE,{},completeCoach());assert.equal(saved,null);const profile=completeCoach();dispatch(WEBSITE,win.opener,profile);assert.deepEqual(await pending,profile);assert.deepEqual(saved,profile);assert.equal(sent.at(-1).message.type,'myr5:coach-received');assert(sent.every(x=>x.origin===WEBSITE));}finally{globalThis.window=original;}
});
test('storage failure never acknowledges receipt or silently loses a website profile',async()=>{const original=globalThis.window,win=new EventTarget(),sent=[];win.opener={postMessage:m=>sent.push(m)};globalThis.window=win;try{const p=receiveCoach(()=>{throw Error('Storage is blocked');});const e=new Event('message');Object.assign(e,{origin:WEBSITE,source:win.opener,data:{type:'myr5:coach-transfer',profile:completeCoach()}});win.dispatchEvent(e);await assert.rejects(p,/Storage is blocked/);assert(!sent.some(m=>m.type==='myr5:coach-received'));}finally{globalThis.window=original;}});
