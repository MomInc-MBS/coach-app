import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { PackLifecycle, fixtureAssetStore, memoryStore, sha256 } from '../../packs/pack-lifecycle.mjs';
import { httpFixtureAssetSource } from '../../packs/http-fixture-adapter.mjs';
import { quotaInjectingStore } from '../../packs/browser-asset-store.mjs';
import { existingWorkoutIdleAdapter } from '../../packs/workout-idle-adapter.mjs';
import { fixtureEntitlementAccount } from '../../packs/isolated-pack-control.mjs';

const body = new TextEncoder().encode('P13C local fixture payload: resumable and hash-pinned.');
async function server({ etag = '"fixture-v1"', version = '1.0.0' } = {}) {
 const requests=[]; const instance=http.createServer((request,response)=>{
  requests.push(request.headers); const range=request.headers.range; const start=range ? Number(range.match(/bytes=(\d+)-/)?.[1]) : 0;
  if (range && request.headers['if-range'] !== etag) { response.writeHead(412); return response.end(); }
  response.writeHead(range ? 206 : 200, { ETag: etag, 'x-fixture-version': version, 'Content-Length': body.byteLength-start, ...(range ? { 'Content-Range': `bytes ${start}-${body.byteLength-1}/${body.byteLength}` } : {}) });response.end(body.subarray(start));
 }); await new Promise(resolve=>instance.listen(0,'127.0.0.1',resolve)); return { requests, close:()=>new Promise(resolve=>instance.close(resolve)), baseUrl:`http://127.0.0.1:${instance.address().port}/` };
}
async function manifest() { const hash=await sha256(body); return { packId:'fixture', version:'1.0.0', minAppVersion:'1.0.0', sha256:hash, assets:[{path:'asset.bin',bytes:body.byteLength,sha256:hash}] }; }
async function setup({ assetStore=fixtureAssetStore(), source, workout={saveAndConfirmIdle:async()=>({saved:true,idle:true})} }={}) { const lifecycle=new PackLifecycle({account:fixtureEntitlementAccount(['fixture']),storage:memoryStore(),assetStore,workout});lifecycle.manifest(await manifest(),source);return lifecycle; }

test('local HTTP fixture resumes with Range and validates ETag/version before hash validation',async()=>{
 const fixture=await server();try { const assets=fixtureAssetStore(), m=await manifest(), key=`fixture@${m.version}@${m.sha256}/asset.bin`;await assets.put(key,body.subarray(0,11));const lifecycle=await setup({assetStore:assets,source:httpFixtureAssetSource({baseUrl:fixture.baseUrl,expectedEtag:'"fixture-v1"',expectedVersion:'1.0.0'})});assert.equal((await lifecycle.download('fixture')).state,'downloaded');assert.equal((await lifecycle.verify('fixture')).state,'verified');assert.equal(fixture.requests[0].range,'bytes=11-');assert.equal(fixture.requests[0]['if-range'],'"fixture-v1"'); } finally { await fixture.close(); }
});
test('offline, changed ETag/version, and injected quota leave bytes untrusted and activation pending',async()=>{
 const m=await manifest();
 for (const source of [httpFixtureAssetSource({baseUrl:'http://offline.invalid/',expectedEtag:'"fixture-v1"',expectedVersion:'1.0.0',fetchImpl:async()=>{throw Error('offline');}}),{get:async()=>{throw Error('fixture asset changed (ETag mismatch)');}}]) { const lifecycle=await setup({source});assert.equal((await lifecycle.download('fixture')).state,'failed'); }
 const lifecycle=await setup({assetStore:quotaInjectingStore(fixtureAssetStore(),{failPut:()=>true}),source:{'asset.bin':body}});assert.match((await lifecycle.download('fixture')).error,/quota/);
 assert.equal(lifecycle.status('fixture').entitlement,true);
});
test('reload persistence, hash isolation, and no-workout-contract adapter protect active work',async()=>{
 const state={phase:'tracking'};const adapter=existingWorkoutIdleAdapter({getWorkoutState:()=>state,saveWorkout:async()=>true});assert.deepEqual(await adapter.saveAndConfirmIdle(),{saved:false,idle:false,reason:'active workout must not be interrupted'});
 const storage=memoryStore(),assets=fixtureAssetStore(),m=await manifest(),first=new PackLifecycle({account:fixtureEntitlementAccount(['fixture']),storage,assetStore:assets,workout:{saveAndConfirmIdle:async()=>({saved:true,idle:true})},runtimeFactory:async()=>({dispose(){}})});first.manifest(m,{'asset.bin':body});await first.download('fixture');await first.verify('fixture');await first.equipPending('fixture');await first.restart();
 const reloaded=new PackLifecycle({account:fixtureEntitlementAccount(['fixture']),storage,assetStore:assets,workout:{saveAndConfirmIdle:async()=>({saved:true,idle:true})},runtimeFactory:async()=>({dispose(){}})});reloaded.manifest(m,{'asset.bin':body});await reloaded.restore();assert.equal(reloaded.status('fixture').state,'active');assert.equal(reloaded.status('fixture').entitlement,true);
});
