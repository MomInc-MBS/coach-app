import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,generateKeyPairSync,sign} from 'node:crypto';
import CATALOG from '../creature/source/creator/creature-skins.json' with {type:'json'};
import {createInstalledCreatureSkinSource,CREATURE_SKIN_MAP_SEMANTICS} from '../modules/materials/installed-creature-skins.mjs';
import {canonicalChunkPayload,memoryChunkStore,DEFAULT_LOCAL_RESOURCE_POLICY} from '../modules/materials/chunk-delivery.mjs';
import {resolvePostDownloadSection} from '../modules/materials/post-download-sections.mjs';
import * as ledger from '../unlock-ledger.mjs';

const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
function bundle(entries){let offset=0;const index=Object.fromEntries(entries.map(([name,bytes])=>{const row={offset,bytes:bytes.length,sha256:digest(bytes)};offset+=bytes.length;return[name,row]}));const header=Buffer.from(JSON.stringify(index)),prefix=Buffer.alloc(4);prefix.writeUInt32BE(header.length);return Buffer.concat([prefix,header,...entries.map(row=>row[1])]);}

test('installed creature skins resolve only previously verified track data for the active owner',async()=>{
 const prior={storage:Object.getOwnPropertyDescriptor(globalThis,'localStorage'),account:Object.getOwnPropertyDescriptor(globalThis,'myr5AuthenticatedAccount')};
 const data=new Map(),storage={getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,String(value)),removeItem:key=>data.delete(key)};
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:storage});
 const skin=CATALOG.skins.find(row=>row.track==='chest'),mapBytes=Buffer.from([82,17,199,4]),priorMap={...skin.maps.basecolor};Object.assign(skin.maps.basecolor,{bytes:mapBytes.length,sha256:digest(mapBytes)});const path=`${skin.id}/basecolor`,asset=bundle([[path,mapBytes]]),hash=digest(asset);
 const pair=generateKeyPairSync('ed25519'),trust=pair.publicKey.export({format:'jwk'}),policy={...DEFAULT_LOCAL_RESOURCE_POLICY,trustedOrigins:['https://example.test']};
 const manifest={schema:'mom-material-chunks-v1',packId:'track-chest',version:'1.0.0',keyId:'fixture-v1',assets:[{path:'assets/chest.m5bundle',bytes:asset.length,sha256:hash,chunks:[{index:0,offset:0,bytes:asset.length,sha256:hash,url:'https://example.test/materials/chest'}]}]};
 manifest.signature=sign(null,Buffer.from(canonicalChunkPayload(manifest)),pair.privateKey).toString('base64');
 const store=memoryChunkStore();await store.put(`material/owner-a/track-chest/1.0.0/fixture-v1/assets/chest.m5bundle/0`,asset);
 ledger.grantUnlock('creature-skin',skin.id,{account:'owner-a'});globalThis.myr5AuthenticatedAccount={user:{id:'owner-a'}};let manifestFetches=0,chunkFetches=0;
 const fetchImpl=async url=>{if(String(url).endsWith('/materials/track-chest/chunk-manifest.json')){manifestFetches++;return new Response(JSON.stringify(manifest),{status:200,headers:{'content-type':'application/json'}});}chunkFetches++;throw Error('renderer must not download missing chunks');};
 try{
  const resolved=await resolvePostDownloadSection('track-chest',{fetchImpl,policy,trust});assert.equal(resolved.manifest.packId,'track-chest');
  const source=createInstalledCreatureSkinSource({account:'owner-a',fetchImpl,store,policy,trust});
  const rows=await source.list();assert.deepEqual(rows.map(row=>row.id),[skin.id]);assert.deepEqual([...rows[0].maps.basecolor], [...mapBytes]);assert.equal(await source.resolve(skin.id).then(row=>row.id),skin.id);assert.equal(manifestFetches,2);assert.equal(chunkFetches,0);
  globalThis.myr5AuthenticatedAccount={user:{id:'owner-b'}};assert.deepEqual(await source.list(),[]);assert.equal(await source.resolve(skin.id),null);source.dispose();
  assert.equal(ledger.isGranted('creature-skin',skin.id,{account:'owner-b'}),false);
 }finally{Object.assign(skin.maps.basecolor,priorMap);if(prior.storage)Object.defineProperty(globalThis,'localStorage',prior.storage);else delete globalThis.localStorage;if(prior.account)Object.defineProperty(globalThis,'myr5AuthenticatedAccount',prior.account);else delete globalThis.myr5AuthenticatedAccount;}
});

test('skin map semantics retain color/data spaces and OpenGL normal convention',async()=>{
 assert.deepEqual(CREATURE_SKIN_MAP_SEMANTICS,{basecolor:'srgb',tintMask:'srgb',emissive:'srgb',normal:'linear',roughness:'linear',height:'linear',metalness:'linear',ao:'linear',opacity:'linear',normalConvention:'OpenGL +Y',tint:'linear-space triad lookup driven by the decoded grayscale tint mask'});
 const source=await requireSource();assert.match(source,/texture\.colorSpace=colorSpace==='srgb'\?T\.SRGBColorSpace/);assert.match(source,/dot\(texture2D\(myr5SkinMask,vMyr5SkinUv\)\.rgb/);assert.match(source,/diffuseColor\.rgb\*=skinPalette/);assert.match(source,/normalScale\.set\(1,1\)/);
});

function requireSource(){return import('node:fs').then(fs=>fs.readFileSync(new URL('../creature/source/creator/skin-materials.ts',import.meta.url),'utf8'));}
