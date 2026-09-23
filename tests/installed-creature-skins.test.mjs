import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,generateKeyPairSync,sign} from 'node:crypto';
import CATALOG from '../creature/source/creator/creature-skins.json' with {type:'json'};
import {createInstalledCreatureSkinSource,CREATURE_SKIN_MAP_SEMANTICS} from '../modules/materials/installed-creature-skins.mjs';
import {canonicalChunkPayload,memoryChunkStore,DEFAULT_LOCAL_RESOURCE_POLICY} from '../modules/materials/chunk-delivery.mjs';
import {resolvePostDownloadSection} from '../modules/materials/post-download-sections.mjs';
import * as ledger from '../unlock-ledger.mjs';
import {signedSkinFixture} from './skin-fixture.mjs';

const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
function bundle(entries){let offset=0;const index=Object.fromEntries(entries.map(([name,bytes])=>{const row={offset,bytes:bytes.length,sha256:digest(bytes)};offset+=bytes.length;return[name,row]}));const header=Buffer.from(JSON.stringify(index)),prefix=Buffer.alloc(4);prefix.writeUInt32BE(header.length);return Buffer.concat([prefix,header,...entries.map(row=>row[1])]);}

test('installed creature skins resolve only previously verified track data for the active owner',async()=>{
 const prior={storage:Object.getOwnPropertyDescriptor(globalThis,'localStorage'),account:Object.getOwnPropertyDescriptor(globalThis,'myr5AuthenticatedAccount')};
 const data=new Map(),storage={getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,String(value)),removeItem:key=>data.delete(key)};
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:storage});
 const {skin,maps,asset,manifest,trust}=await signedSkinFixture(),mapBytes=maps.basecolor,policy={...DEFAULT_LOCAL_RESOURCE_POLICY,trustedOrigins:['https://example.test']};
 const store=memoryChunkStore();for(const chunk of manifest.assets[0].chunks)await store.put(`material/owner-a/track-chest/1.0.0/fixture-v1/assets/chest.m5bundle/${chunk.index}`,asset.subarray(chunk.offset,chunk.offset+chunk.bytes));
 ledger.grantUnlock('creature-skin',skin.id,{account:'owner-a'});globalThis.myr5AuthenticatedAccount={user:{id:'owner-a'}};let manifestFetches=0,chunkFetches=0;
 const fetchImpl=async url=>{if(String(url).endsWith('/materials/track-chest/chunk-manifest.json')){manifestFetches++;return new Response(JSON.stringify(manifest),{status:200,headers:{'content-type':'application/json'}});}chunkFetches++;throw Error('renderer must not download missing chunks');};
 try{
  const resolved=await resolvePostDownloadSection('track-chest',{fetchImpl,policy,trust});assert.equal(resolved.manifest.packId,'track-chest');
  const source=createInstalledCreatureSkinSource({account:'owner-a',fetchImpl,store,policy,trust});
  const rows=await source.list();assert.deepEqual(rows.map(row=>row.id),[skin.id]);assert.deepEqual([...rows[0].maps.basecolor], [...mapBytes]);assert.equal(await source.resolve(skin.id).then(row=>row.id),skin.id);assert.equal(manifestFetches,2);assert.equal(chunkFetches,0);
  source.dispose();const offline=createInstalledCreatureSkinSource({account:'owner-a',fetchImpl:async()=>{throw Error('offline');},store,policy,trust});assert.equal((await offline.list())[0]?.id,skin.id,'signed cached metadata and verified chunks work offline');offline.dispose();
  const invalid=createInstalledCreatureSkinSource({account:'owner-a',fetchImpl:async()=>new Response(JSON.stringify({...manifest,signature:'A'.repeat(88)})),store,policy,trust});assert.deepEqual(await invalid.list(),[],'invalid responding metadata cannot fall back to a previously cached signature');invalid.dispose();
  const disabled=createInstalledCreatureSkinSource({account:'owner-a',fetchImpl,store,policy,trust:null});assert.deepEqual(await disabled.list(),[]);
  globalThis.myr5AuthenticatedAccount={user:{id:'owner-b'}};assert.deepEqual(await source.list(),[]);assert.equal(await source.resolve(skin.id),null);source.dispose();
  assert.equal(ledger.isGranted('creature-skin',skin.id,{account:'owner-b'}),false);
 }finally{if(prior.storage)Object.defineProperty(globalThis,'localStorage',prior.storage);else delete globalThis.localStorage;if(prior.account)Object.defineProperty(globalThis,'myr5AuthenticatedAccount',prior.account);else delete globalThis.myr5AuthenticatedAccount;}
});

test('skin map semantics retain color/data spaces and OpenGL normal convention',async()=>{
 assert.deepEqual(CREATURE_SKIN_MAP_SEMANTICS,{basecolor:'srgb',tintMask:'srgb',emissive:'srgb',normal:'linear',roughness:'linear',height:'linear',metalness:'linear',ao:'linear',opacity:'linear',normalConvention:'OpenGL +Y',tint:'linear-space triad lookup driven by the decoded grayscale tint mask'});
 const source=await requireSource();assert.match(source,/texture\.colorSpace=colorSpace==='srgb'\?T\.SRGBColorSpace/);assert.match(source,/skinBase=texture2D\(myr5SkinMask,vMyr5SkinUv\)\.rgb/);assert.match(source,/diffuseColor\.rgb=skinBase\*skinPalette/);assert.match(source,/normalScale\.set\(1,1\)/);
});

function requireSource(){return import('node:fs').then(fs=>fs.readFileSync(new URL('../creature/source/creator/skin-materials.ts',import.meta.url),'utf8'));}
