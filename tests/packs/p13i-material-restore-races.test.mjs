import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { MaterialController } from '../../modules/materials/material-controller.mjs';
import { canonicalMaterialPayload } from '../../modules/materials/material-pack-entry.mjs';
import { ChunkDownloader, canonicalChunkPayload, DEFAULT_LOCAL_RESOURCE_POLICY, memoryChunkStore, sha256Chunk } from '../../modules/materials/chunk-delivery.mjs';

const { privateKey, publicKey } = generateKeyPairSync('ed25519');
const testTrust = { purpose: 'test-only-signed-material', publicKey: publicKey.export({format:'jwk'}) };
const policy = {...DEFAULT_LOCAL_RESOURCE_POLICY, trustedOrigins:['https://cdn.test']};
const account = () => ({user:{id:'account-a'},entitlements:{coachArmy:{status:'completed',completedAt:1},ownedPacks:[{packId:'liquid-amethyst',status:'owned',grantedAt:1}]}});
async function fixture(version='1.0.0',hue=286) {
 const bytes = new TextEncoder().encode(JSON.stringify({hue,strength:.8})),digest=await sha256Chunk(bytes);
 const manifest={schema:'mom-material-pack-v1',packId:'liquid-amethyst',version,minAppVersion:'1.0.0',sha256:digest,alg:'Ed25519',keyId:'mom-material-production-v1',materialId:'liquid-amethyst',runtimeType:'liquid-v1',parameters:{hue:278,strength:.6},assets:[{path:'assets/config.json',bytes:bytes.length,sha256:digest}]};
 manifest.signature=sign(null,Buffer.from(canonicalMaterialPayload(manifest)),privateKey).toString('base64');
 const chunkManifest={schema:'mom-material-chunks-v1',packId:manifest.packId,version,keyId:manifest.keyId,assets:[{...manifest.assets[0],chunks:[{index:0,offset:0,bytes:bytes.length,sha256:digest,url:`https://cdn.test/materials/${version}/config.json`}]}]};
 chunkManifest.signature=sign(null,Buffer.from(canonicalChunkPayload(chunkManifest)),privateKey).toString('base64');
 return {manifest,chunkManifest,bytes,policy,testTrust};
}
function host() {
 const h={children:[],created:[],onReplace:null,replaceChildren(canvas){this.children=[canvas];this.onReplace?.()},ownerDocument:{createElement(){const canvas={getContext:()=>null,addEventListener(){},removeEventListener(){},remove(){canvas.removed=true;h.children=h.children.filter(c=>c!==canvas)}};h.created.push(canvas);return canvas}}};
 return h;
}
const row = f => ({state:'active',receivedBytes:f.bytes.length,materialManifest:structuredClone(f.manifest),chunkManifest:structuredClone(f.chunkManifest)});
async function setup({active=true,candidate=null,workoutAllowed=true}={}) {
 const f=await fixture(),a=account(),h=host(),store=memoryChunkStore(),saved={v:2,accounts:{'account-a':{active:active?row(f):null,candidate}}};
 let text=JSON.stringify(saved),writes=0,held=false,leases=0,releases=0;
 const storage={getItem:()=>text,setItem(k,v){writes++;text=v}};
 const workoutOwner={snapshot:()=>({phase:'idle',revision:1}),save:async()=>true,acquireIdleLease(){if(!workoutAllowed)return null;assert.equal(held,false);held=true;leases++;return {revision:1}},releaseIdleLease(){assert.equal(held,true);held=false;releases++}};
 const c=new MaterialController({account:a,host:h,chunkStore:store,storage,workoutOwner,policy,fetchImpl:async()=>{throw Error('offline: must not fetch')}});
 const key=`material/account-a/${f.manifest.packId}/${f.manifest.version}/${f.manifest.keyId}/assets/config.json/0`;
 await store.put(key,f.bytes);
 return {f,a,h,store,c,workoutOwner,storage,state:()=>({held,leases,releases,writes,text})};
}

for(const state of ['failed','downloading','verified','pending-equip'])test(`offline saved last-good restore ignores a ${state} newer candidate and current bundle`,async()=>{
 const next=await fixture('2.0.0',302),candidate={...row(next),state,bootId:'same-boot'},s=await setup({candidate});s.c.bootId='same-boot';
 await s.c.load({fixture:next,testTrust});
 const original=s.c.record().candidate,get=s.store.get.bind(s.store);s.store.get=async key=>{assert.equal(s.state().held,true,'idle lease covers stored reads');return get(key)};
 await s.c.restorePending({testTrust});
 assert.equal(s.c.runtime.getDebug().hue,286);assert.equal(s.c.bundle.manifest.version,'2.0.0');assert.equal(s.c.record().candidate,original);assert.equal(s.c.record().active.materialManifest.version,'1.0.0');
 assert.deepEqual({held:s.state().held,leases:s.state().leases,releases:s.state().releases,writes:s.state().writes},{held:false,leases:1,releases:1,writes:0});s.c.dispose();
});

test('active restoration rejects absent workout lease before reading or constructing a runtime',async()=>{
 const s=await setup({workoutAllowed:false});s.store.get=()=>{throw Error('must not read')};
 await assert.rejects(s.c.restoreActive({testTrust}),/workout|idle/);assert.equal(s.h.created.length,0);assert.equal(s.state().writes,0);
});

for(const target of ['material','chunks'])test(`persisted ${target} signature is authenticated even with a valid current bundle`,async()=>{
 const s=await setup();await s.c.load({fixture:s.f,testTrust});
 if(target==='material')s.c.record().active.materialManifest.parameters.hue=301;
 else s.c.record().active.chunkManifest.assets[0].chunks[0].sha256='0'.repeat(64);
 await assert.rejects(s.c.restoreActive({testTrust}),/signature/);assert.equal(s.h.created.length,0);assert.equal(s.state().leases,0);
});

test('cached trust keys do not authorize a signed saved bundle',async()=>{
 const s=await setup();s.c.record().active.trust=testTrust.publicKey;
 await assert.rejects(s.c.restoreActive(),/signature/);assert.equal(s.h.created.length,0);
});

for(const action of ['revoke','dispose','switch','entitlement'])test(`${action} during final asset read prevents activation and stale metadata writes`,async()=>{
 const s=await setup(),get=s.store.get.bind(s.store);let reads=0;
 s.store.get=async key=>{const value=await get(key);if(++reads===2){if(action==='switch')s.a.user.id='account-b';else if(action==='entitlement')s.a.entitlements.ownedPacks=[];else s.c[action]()}return value};
 await assert.rejects(s.c.restoreActive({testTrust}),/revoked|changed|disposed/);
 assert.equal(s.c.runtime,null);assert.equal(s.h.created.length,0);assert.equal(s.state().held,false);assert.equal(s.state().releases,1);
 assert.equal(s.state().writes,action==='revoke'?1:0);if(action==='revoke')assert.deepEqual(s.c.record(),{active:null,candidate:null});
});

for(const action of ['revoke','dispose','switch','entitlement'])test(`${action} during runtime creation disposes the abandoned runtime under the lease`,async()=>{
 const s=await setup();s.h.onReplace=()=>{assert.equal(s.state().held,true);if(action==='switch')s.a.user.id='account-b';else if(action==='entitlement')s.a.entitlements.ownedPacks=[];else s.c[action]()};
 await assert.rejects(s.c.restoreActive({testTrust}),/revoked|changed|disposed/);
 assert.equal(s.h.created.length,1);assert.equal(s.h.created[0].removed,true);assert.equal(s.h.children.length,0);assert.equal(s.c.runtime,null);assert.equal(s.state().held,false);assert.equal(s.state().releases,1);
 assert.equal(s.state().writes,action==='revoke'?1:0);
});

test('revocation while saving releases the lease and prevents asset reads',async()=>{
 const s=await setup();s.workoutOwner.save=async()=>{s.c.revoke();return true};s.store.get=()=>{throw Error('must not read')};
 await assert.rejects(s.c.restoreActive({testTrust}),/revoked/);assert.equal(s.state().held,false);assert.equal(s.state().releases,1);assert.equal(s.h.created.length,0);
});

test('revoked pending activation cannot recreate the cleared candidate in its failure handler',async()=>{
 const s=await setup({active:false});s.c.putCandidate({...row(s.f),state:'pending-equip',bootId:'old-boot'});
 const get=s.store.get.bind(s.store);s.store.get=async key=>{const value=await get(key);s.c.revoke();return value};
 await assert.rejects(s.c.restorePending({testTrust}),/revoked/);assert.deepEqual(s.c.record(),{active:null,candidate:null});assert.equal(s.state().writes,2);
});

test('revocation after a download write cannot publish verified or failed metadata',async()=>{
 const s=await setup({active:false});await s.c.load({fixture:s.f,testTrust});await s.store.removePrefix('material/');
 s.c.fetchImpl=async()=>new Response(s.f.bytes,{status:206,headers:{'content-length':String(s.f.bytes.length),'content-range':`bytes 0-${s.f.bytes.length-1}/${s.f.bytes.length}`}});
 const put=s.store.put.bind(s.store);s.store.put=async(key,value)=>{await put(key,value);s.c.revoke()};
 await assert.rejects(s.c.download(),/revoked/);assert.deepEqual(s.c.record(),{active:null,candidate:null});assert.equal(s.state().writes,2);
});

for(const action of ['switch','deny'])test(`ChunkDownloader rejects owner ${action} on its last reconstruction read`,async()=>{
 const f=await fixture(),store=memoryChunkStore();let who='account-a',reads=0;
 const d=new ChunkDownloader({store,expectedVersion:f.manifest.version,manifestPublicKey:testTrust.publicKey,ownership:async()=>who,policy});
 await store.put(d.key(f.chunkManifest,who,f.chunkManifest.assets[0],f.chunkManifest.assets[0].chunks[0]),f.bytes);
 const get=store.get.bind(store);store.get=async key=>{const v=await get(key);if(++reads===2)who=action==='switch'?'account-b':false;return v};
 await assert.rejects(d.readVerifiedAssets(f.chunkManifest),/account changed|not owned/);assert.equal(reads,2);
});

test('ChunkDownloader disposes runtime returned after asynchronous activation loses ownership',async()=>{
 const f=await fixture(),store=memoryChunkStore();let who='account-a',disposed=false;
 const d=new ChunkDownloader({store,expectedVersion:f.manifest.version,manifestPublicKey:testTrust.publicKey,ownership:async()=>who,policy});
 await store.put(d.key(f.chunkManifest,who,f.chunkManifest.assets[0],f.chunkManifest.assets[0].chunks[0]),f.bytes);
 await assert.rejects(d.activate(f.chunkManifest,async()=>{who=false;return {dispose(){disposed=true}}}),/not owned/);assert.equal(disposed,true);
});

test('failed pending replacement restores signed last-good without substituting its bundle',async()=>{
 const next=await fixture('2.0.0',302),s=await setup({candidate:{...row(next),state:'pending-equip',bootId:'prior-boot'}});
 await s.c.load({fixture:next,testTrust});
 await assert.rejects(s.c.restorePending({testTrust}),/unverified stored chunk/);
 assert.equal(s.c.runtime.getDebug().hue,286);assert.equal(s.c.record().candidate.materialManifest.version,'2.0.0');assert.match(s.c.record().candidate.error,/activation failed/);assert.equal(s.state().leases,2);assert.equal(s.state().releases,2);s.c.dispose();
});

for(const operation of ['load','equipAfterRestart'])test(`revocation during ${operation} prevents late bundle or candidate publication`,async()=>{
 const s=await setup({active:false});
 if(operation==='equipAfterRestart'){await s.c.load({fixture:s.f,testTrust});s.c.putCandidate({...row(s.f),state:'verified'})}
 const promise=operation==='load'?s.c.load({fixture:s.f,testTrust}):s.c.equipAfterRestart();s.c.revoke();
 await assert.rejects(promise,/revoked/);assert.equal(s.c.bundle,null);assert.deepEqual(s.c.record(),{active:null,candidate:null});
});
