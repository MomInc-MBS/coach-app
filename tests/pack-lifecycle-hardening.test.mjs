import test from 'node:test';
import assert from 'node:assert/strict';
import { createPrivateKey, sign } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { PackLifecycle, fixtureAssetStore, memoryStore, sha256 } from '../packs/pack-lifecycle.mjs';
import { existingWorkoutIdleAdapter } from '../packs/workout-idle-adapter.mjs';
import { WorkoutSessionOwner } from '../pod/workout-session-owner.mjs';
import { resolveExpansionManifest, verifyExpansionManifest, EXPANSION_ID } from '../modules/new/expansion-entry.mjs';

// Fixed RFC 8032 test vector only; no generated or production signing keys.
const privateKey=createPrivateKey({format:'der',type:'pkcs8',key:Buffer.from('302e020100300506032b6570042204209d61b19deffd5a60ba844af492ec2cc44449c5697b326919703bac031cae7f60','hex')});
const publicKey={kty:'OKP',crv:'Ed25519',x:Buffer.from('d75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a','hex').toString('base64url')};
const testTrust={purpose:'test-only-signed-expansion',publicKey};
const canonical=m=>JSON.stringify({packId:m.packId,version:m.version,minAppVersion:m.minAppVersion,sha256:m.sha256,alg:m.alg,keyId:m.keyId,assets:m.assets.map(({path,bytes,sha256})=>({path,bytes,sha256}))});
const bytes=new TextEncoder().encode('Signed last-good expansion');
async function signed(version='1.0.0',data=bytes){const hash=await sha256(data),m={packId:EXPANSION_ID,version,minAppVersion:'1.0.0',sha256:hash,alg:'Ed25519',keyId:'mom-paper-production-v1',assets:[{path:'assets/paper.bin',bytes:data.length,sha256:hash}]};m.signature=sign(null,Buffer.from(canonical(m)),privateKey).toString('base64');return m;}
const key=m=>`${EXPANSION_ID}@${m.version}@${m.sha256}/assets/paper.bin`;
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
async function fixture(){
 const storage=memoryStore(),assetStore=fixtureAssetStore(),state={id:'a',epoch:0,entitled:true},owner=new WorkoutSessionOwner({storage:memoryStore()}),manifest=await signed();
 const account={getIdentity:()=>state.id,getGeneration:()=>state.epoch,getEntitlements:()=>state.entitled?[EXPANSION_ID]:[]};
 const options={storage,assetStore,account,workout:existingWorkoutIdleAdapter({owner}),verifyManifest:m=>verifyExpansionManifest(m,publicKey)};
 const life=new PackLifecycle(options);life.manifest(manifest,{'assets/paper.bin':bytes});
 await life.download(EXPANSION_ID);await life.verify(EXPANSION_ID);await life.equipPending(EXPANSION_ID);
 return {storage,assetStore,state,owner,manifest,options,life};
}

test('cached signed last-good restores without current metadata, even beside a failed candidate',async()=>{
 const f=await fixture();await f.life.restart();
 const bad=await signed('2.0.0');f.life.manifest(bad,{get:async()=>{throw Error('offline');}});await f.life.download(EXPANSION_ID);
 let restored;const life=new PackLifecycle({...f.options,runtimeFactory:async(_id,_record,m)=>{restored=m;return {dispose(){}};}});
 await life.restore();assert.equal(restored.version,'1.0.0');assert.equal(life.status(EXPANSION_ID).candidate.state,'failed');assert.equal(life.status(EXPANSION_ID).state,'active');
});
test('authenticates exact persisted manifest before reading bytes or creating runtime',async()=>{
 const f=await fixture();await f.life.restart();const saved=JSON.parse(f.storage.getItem('p13b.device-cache'));
 saved.packs[EXPANSION_ID].manifest.minAppVersion='0.0.0';f.storage.setItem('p13b.device-cache',JSON.stringify(saved));let reads=0,calls=0;
 const life=new PackLifecycle({...f.options,assetStore:{...f.assetStore,get:async()=>{reads++;throw Error('must not read');}},runtimeFactory:async()=>{calls++;return {dispose(){}};}});
 // A currently valid network manifest must not lend trust to altered disk metadata.
 life.manifest(f.manifest,{});await life.restore();assert.equal(reads,0);assert.equal(calls,0);assert.equal(life.equipped,null);assert.match(life.status(EXPANSION_ID).error,/signature/);
});
test('rejects a valid signature paired with a different cached version pin',async()=>{
 const f=await fixture();await f.life.restart();const saved=JSON.parse(f.storage.getItem('p13b.device-cache'));saved.packs[EXPANSION_ID].version='9.0.0';f.storage.setItem('p13b.device-cache',JSON.stringify(saved));
 const life=new PackLifecycle(f.options);await life.restore();assert.equal(life.equipped,null);assert.match(life.status(EXPANSION_ID).error,/pinned/);
});
test('pending restore authenticates and activates its saved version while current metadata differs',async()=>{
 const f=await fixture(),life=new PackLifecycle(f.options);life.manifest(await signed('2.0.0'),{});await life.restart();assert.equal(life.equipped.version,'1.0.0');
});
test('restore retains the idle lease across asynchronous runtime construction',async()=>{
 const f=await fixture();await f.life.restart();const entered=deferred(),runtime=deferred();
 const life=new PackLifecycle({...f.options,runtimeFactory:()=>{entered.resolve();return runtime.promise;}});
 const restoring=life.restore();await entered.promise;assert.equal(f.owner.start(),false);runtime.resolve({dispose(){}});await restoring;assert.equal(f.owner.start(),true);
});
test('an active workout blocks cached restore without changing last-good metadata',async()=>{
 const f=await fixture();await f.life.restart();const before=f.storage.getItem('p13b.device-cache');f.owner.start();let calls=0;
 const life=new PackLifecycle({...f.options,runtimeFactory:()=>{calls++;return {dispose(){}};}});await assert.rejects(life.restore(),/acknowledgment/);assert.equal(calls,0);assert.equal(f.storage.getItem('p13b.device-cache'),before);
});
for(const phase of ['restart','restore'])for(const transition of ['identity','epoch','clear','dispose','revoke'])test(`${phase} disposes abandoned runtime after ${transition} during await`,async()=>{
 const f=await fixture();if(phase==='restore')await f.life.restart();const entered=deferred(),runtime=deferred();let retired=0,published=0;
 const life=new PackLifecycle({...f.options,runtimeFactory:()=>{entered.resolve();return runtime.promise;}}),before=f.storage.getItem('p13b.device-cache');
 const operation=life[phase]();await entered.promise;
 if(transition==='identity')f.state.id='b';else if(transition==='epoch')f.state.epoch++;else if(transition==='revoke')f.state.entitled=false;else life[transition]();
 runtime.resolve({dispose(){retired++;},activate(){published++;}});await assert.rejects(operation,/changed/);assert.equal(retired,1);assert.equal(published,0);assert.equal(life.runtime,null);assert.equal(f.owner.canStart(),true);assert.equal(f.storage.getItem('p13b.device-cache'),before);
});
test('transition during cached read prevents runtime construction and stale persistence',async()=>{
 const f=await fixture();await f.life.restart();const entered=deferred(),read=deferred();let calls=0;
 const life=new PackLifecycle({...f.options,assetStore:{...f.assetStore,get:()=>{entered.resolve();return read.promise;}},runtimeFactory:()=>{calls++;return {dispose(){}};}}),before=f.storage.getItem('p13b.device-cache');
 const operation=life.restore();await entered.promise;f.state.id='b';read.resolve(bytes);await assert.rejects(operation,/changed/);assert.equal(calls,0);assert.equal(f.storage.getItem('p13b.device-cache'),before);
});
test('transition while download is pending prevents byte writes and metadata publication',async()=>{
 const f=await fixture(),entered=deferred(),download=deferred();let puts=0;
 const life=new PackLifecycle({...f.options,assetStore:{...f.assetStore,put:async()=>{puts++;}}});life.manifest(await signed('2.0.0'),{get:()=>{entered.resolve();return download.promise;}});
 const operation=life.download(EXPANSION_ID);await entered.promise;const before=f.storage.getItem('p13b.device-cache');f.state.id='b';download.resolve(bytes);await assert.rejects(operation,/changed/);assert.equal(puts,0);assert.equal(f.storage.getItem('p13b.device-cache'),before);
});
test('legacy callback snapshots cannot claim a held idle lease',async()=>{
 let saves=0;const result=await existingWorkoutIdleAdapter({getWorkoutState:()=>({phase:'idle'}),saveWorkout:async()=>{saves++;return true;}}).saveAndConfirmIdle();assert.equal(result.idle,false);assert.equal(saves,0);assert.match(result.reason,/lease/);
});
test('same-length corrupt cached bytes are fully redownloaded instead of repeatedly skipped',async()=>{
 const f=await fixture();await f.assetStore.put(key(f.manifest),new Uint8Array(bytes.length));let previous='unset';f.life.manifest(f.manifest,{get:async(_asset,old)=>{previous=old;return bytes;}});
 await f.life.download(EXPANSION_ID);await f.life.verify(EXPANSION_ID);assert.equal(previous,null);assert.deepEqual(await f.assetStore.get(key(f.manifest)),bytes);assert.equal(f.life.status(EXPANSION_ID).state,'verified');
});
test('hash validation supports a signed 512 KiB asset without argument-spread overflow',async()=>{
 const data=new Uint8Array(512*1024),m=await signed('1.0.0',data),f=await fixture(),life=new PackLifecycle({...f.options,assetStore:fixtureAssetStore({maxBytes:data.length})});life.manifest(m,{'assets/paper.bin':data});await life.download(EXPANSION_ID);await life.verify(EXPANSION_ID);assert.equal(life.status(EXPANSION_ID).state,'verified');
});
test('HTTP 200 replaces partial cache and exact HTTP 206 resumes it',async()=>{
 const manifest=await signed(),asset=manifest.assets[0],prior=bytes.subarray(0,5);
 for(const status of [200,206]){
  let range;const entry=await resolveExpansionManifest({testTrust,fetchImpl:async(url,options)=>{if(String(url).endsWith('manifest.json'))return Response.json(manifest);range=options.headers.Range;return new Response(status===200?bytes:bytes.subarray(5),{status,headers:status===206?{'content-range':`bytes 5-${bytes.length-1}/${bytes.length}`}:{}});}});
  assert.deepEqual(await entry.source.get(asset,prior),bytes);assert.equal(range,'bytes=5-');
 }
});
test('rejects incorrect ranges, totals, lengths and oversized full responses',async()=>{
 const manifest=await signed(),asset=manifest.assets[0],prior=bytes.subarray(0,5);
 for(const response of [()=>new Response(bytes,{status:206}),()=>new Response(bytes.subarray(5),{status:206,headers:{'content-range':`bytes 4-${bytes.length-2}/${bytes.length}`}}),()=>new Response(bytes.subarray(5),{status:206,headers:{'content-range':`bytes 5-${bytes.length-1}/${bytes.length+1}`}}),()=>new Response(bytes.subarray(6),{status:206,headers:{'content-range':`bytes 5-${bytes.length-1}/${bytes.length}`}}),()=>new Response(new Uint8Array(bytes.length+1)),()=>new Response(bytes.subarray(1))]){
  const entry=await resolveExpansionManifest({testTrust,fetchImpl:async url=>String(url).endsWith('manifest.json')?Response.json(manifest):response()});await assert.rejects(entry.source.get(asset,prior),/manifest/);
 }
});

test('browser mount restores signed last-good offline, clears UI on account transition, and blocks stale setup',async()=>{
 const root=resolve(import.meta.dirname,'..'),manifest=await signed();
 const server=createServer(async(req,res)=>{try{const pathname=new URL(req.url,'http://local').pathname;if(pathname==='/blank')return res.end('<!doctype html><main id="app"></main>');if(!/^\/(packs\/[^/]+\.mjs|modules\/new\/[^/]+\.mjs|public-access\.mjs)$/.test(pathname)){res.writeHead(404);return res.end();}res.setHeader('content-type','text/javascript');res.end(await readFile(resolve(root,'.'+pathname)));}catch{res.writeHead(404);res.end();}});
 await new Promise(done=>server.listen(0,'127.0.0.1',done));let browser;
 try{
  browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage();await page.goto(`http://127.0.0.1:${server.address().port}/blank`);
  const result=await page.evaluate(async({manifest,testTrust,data})=>{
   const {mountExpansion,verifyExpansionManifest}=await import('/modules/new/expansion-entry.mjs'),{PackLifecycle,fixtureAssetStore,memoryStore}=await import('/packs/pack-lifecycle.mjs');
   const storage=memoryStore(),assetStore=fixtureAssetStore(),workout={saveAndConfirmIdle:async()=>({saved:true,idle:true,release(){}})},account={user:{id:'a'},dataEpoch:1,entitlements:{ownedPacks:[{packId:'mom-paper-tear',status:'owned',grantedAt:1}]}};
   const seed=new PackLifecycle({account:{getEntitlements:()=>['mom-paper-tear']},storage,assetStore,workout,verifyManifest:m=>verifyExpansionManifest(m,testTrust.publicKey)});seed.manifest(manifest,{'assets/paper.bin':new Uint8Array(data)});await seed.download('mom-paper-tear');await seed.verify('mom-paper-tear');await seed.equipPending('mom-paper-tear');await seed.restart();
   let requests=0;const mounted=mountExpansion({account,host:document.querySelector('#app'),storage,assetStore,workout,testTrust,fetchImpl:async()=>{requests++;throw Error('offline');}});await mounted.ready;
   const restored={state:mounted.lifecycle.status('mom-paper-tear').state,shell:!!mounted.panel.querySelector('.mom-paper-expansion'),requests};
   window.dispatchEvent(new Event('myr5:account-cleared'));const cleared={shell:!!mounted.panel.querySelector('.mom-paper-expansion'),hidden:mounted.panel.hidden,control:mounted.lifecycle};
   window.dispatchEvent(new CustomEvent('myr5:account-ready',{detail:{...account,user:{id:'b'}}}));await mounted.ready;const rebound=mounted.lifecycle.runtime!==null;mounted.dispose();
   let resolveFetch,started;const fetchStarted=new Promise(r=>started=r);const staleMount=mountExpansion({account,host:document.querySelector('#app'),storage:memoryStore(),assetStore,workout,testTrust,fetchImpl:()=>{started();return new Promise(r=>resolveFetch=r);}});await fetchStarted;window.dispatchEvent(new Event('myr5:account-cleared'));resolveFetch(Response.json(manifest));await staleMount.ready;const stale={control:staleMount.lifecycle,hidden:staleMount.panel.hidden,shell:!!staleMount.panel.querySelector('.mom-paper-expansion')};staleMount.dispose();
   return {restored,cleared,rebound,stale};
  },{manifest,testTrust,data:[...bytes]});
  assert.deepEqual(result,{restored:{state:'active',shell:true,requests:1},cleared:{shell:false,hidden:true,control:null},rebound:true,stale:{control:null,hidden:true,shell:false}});
 }finally{await browser?.close();await new Promise(done=>server.close(done));}
});
