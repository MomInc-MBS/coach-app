import test from 'node:test';
import assert from 'node:assert/strict';
import {checkUpdateSources} from '../app-updates.mjs';

test('failed release notes do not block a service-worker update',async()=>{
 let updates=0;
 await checkUpdateSources({update:async()=>{updates++;}},async()=>{throw Error('offline metadata');});
 assert.equal(updates,1);
});

test('hanging notes do not hold an update check or prevent another check',async()=>{
 let updates=0;
 const registration={update:async()=>{updates++;}},notes=new Promise(()=>{});
 await Promise.race([
  (async()=>{await checkUpdateSources(registration,()=>notes);await checkUpdateSources(registration,()=>notes);})(),
  new Promise((_,reject)=>{const timer=setTimeout(()=>reject(Error('update blocked by notes')),1000);timer.unref();})
 ]);
 assert.equal(updates,2);
});

test('worker failures remain visible even when release notes succeed',async()=>{
 await assert.rejects(checkUpdateSources({update:async()=>{throw Error('worker download failed');}},async()=>{}),/worker download failed/);
});

test('without a service worker the metadata result still determines success',async()=>{
 await checkUpdateSources(null,async()=>{});
 await assert.rejects(checkUpdateSources(null,async()=>{throw Error('offline');}),/Release information/);
});
