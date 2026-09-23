import test from 'node:test';
import assert from 'node:assert/strict';
import {signedSkinFixture} from './skin-fixture.mjs';
import {downloadPostDownloadSection} from '../modules/materials/post-download-controller.mjs';
import {createInstalledCreatureSkinSource} from '../modules/materials/installed-creature-skins.mjs';
import {DEFAULT_LOCAL_RESOURCE_POLICY,memoryChunkStore} from '../modules/materials/chunk-delivery.mjs';
import * as ledger from '../unlock-ledger.mjs';

test('completed signed section caches exact manifest bytes for its first offline renderer use',async()=>{
 const previous=Object.getOwnPropertyDescriptor(globalThis,'myr5AuthenticatedAccount'),previousStorage=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
 const {skin,asset,manifest,trust}=await signedSkinFixture(),owner='manifest-cache-owner';
 const policy={...DEFAULT_LOCAL_RESOURCE_POLICY,trustedOrigins:['https://example.test']},store=memoryChunkStore();
 // Formatting is intentionally non-canonical: the cache must preserve the signed response bytes, not reserialize JSON.
 const manifestBytes=new TextEncoder().encode(JSON.stringify(manifest,null,2)+'\n');
 let online=true,manifestRequests=0,chunkRequests=0;
 const localData=new Map();Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:key=>localData.get(key)??null,setItem:(key,value)=>localData.set(key,String(value)),removeItem:key=>localData.delete(key)}});
 const fetchImpl=async(url,options={})=>{
  if(String(url)==='/materials/track-chest/chunk-manifest.json'){
   manifestRequests++;if(!online)throw new TypeError('offline');
   return new Response(manifestBytes,{status:200,headers:{'content-type':'application/json'}});
  }
  if(String(url)==='https://example.test/materials/chest'){
   chunkRequests++;if(!online)throw new TypeError('offline');
   const range=options.headers.Range,match=/^bytes=(\d+)-(\d+)$/.exec(range);assert(match);
   const start=Number(match[1]),end=Number(match[2]),bytes=asset.subarray(start,end+1);
   return new Response(bytes,{status:206,headers:{'content-range':`bytes ${start}-${end}/${asset.length}`,'content-length':String(bytes.length)}});
  }
  throw new Error(`unexpected request ${url}`);
 };
 Object.defineProperty(globalThis,'myr5AuthenticatedAccount',{configurable:true,value:{user:{id:owner}}});
 try{
  ledger.grantUnlock('creature-skin',skin.id,{account:owner});
  await downloadPostDownloadSection({id:'track-chest',account:{user:{id:owner}},authorize:()=>true,fetchImpl,store,policy,trust});
  const key=`material-manifest/${owner}/track-chest/1.0.0`;
  assert.deepEqual(await store.get(key),manifestBytes,'only the exact original response bytes are cached');
  assert.equal(manifestRequests,1);assert(chunkRequests>0);
  const downloadedChunks=chunkRequests;

  // The renderer's first call happens only after the user has gone offline.
  online=false;
  const source=createInstalledCreatureSkinSource({account:owner,fetchImpl,store,policy,trust});
  const rows=await source.list();
  assert.deepEqual(rows.map(row=>row.id),[skin.id]);
  assert.deepEqual(await source.resolve(skin.id).then(row=>row.id),skin.id);
  assert.equal(manifestRequests,2,'first renderer use attempted the network once, then used the cached verified manifest');
  assert.equal(chunkRequests,downloadedChunks,'renderer did not redownload already verified chunks');
  source.dispose();
  online=true;const refreshed=createInstalledCreatureSkinSource({account:owner,fetchImpl,store,policy,trust});assert.equal((await refreshed.list())[0]?.id,skin.id);refreshed.dispose();assert.deepEqual(await store.get(key),manifestBytes,'online renderer refresh preserves the exact signed response bytes too');
 }finally{
  if(previous)Object.defineProperty(globalThis,'myr5AuthenticatedAccount',previous);else delete globalThis.myr5AuthenticatedAccount;
  if(previousStorage)Object.defineProperty(globalThis,'localStorage',previousStorage);else delete globalThis.localStorage;
 }
});

test('account change during manifest persistence removes the stale owner metadata',async()=>{
 const previous=Object.getOwnPropertyDescriptor(globalThis,'myr5AuthenticatedAccount');
 const {asset,manifest,trust}=await signedSkinFixture(),owner='manifest-race-owner';
 const policy={...DEFAULT_LOCAL_RESOURCE_POLICY,trustedOrigins:['https://example.test']},base=memoryChunkStore();
 const store={...base,
  get:key=>base.get(key),
  async put(key,bytes){await base.put(key,bytes);if(key===`material-manifest/${owner}/track-chest/1.0.0`)Object.defineProperty(globalThis,'myr5AuthenticatedAccount',{configurable:true,value:null});},
  removePrefix:prefix=>base.removePrefix(prefix),
 };
 const fetchImpl=async(url,options={})=>{
  if(String(url)==='/materials/track-chest/chunk-manifest.json')return new Response(JSON.stringify(manifest));
  const match=/^bytes=(\d+)-(\d+)$/.exec(options.headers.Range),start=Number(match[1]),end=Number(match[2]),bytes=asset.subarray(start,end+1);
  return new Response(bytes,{status:206,headers:{'content-range':`bytes ${start}-${end}/${asset.length}`,'content-length':String(bytes.length)}});
 };
 Object.defineProperty(globalThis,'myr5AuthenticatedAccount',{configurable:true,value:{user:{id:owner}}});
 try{
  await assert.rejects(()=>downloadPostDownloadSection({id:'track-chest',account:{user:{id:owner}},authorize:()=>true,fetchImpl,store,policy,trust}),/account changed/);
  assert.equal(await base.get(`material-manifest/${owner}/track-chest/1.0.0`),undefined);
 }finally{if(previous)Object.defineProperty(globalThis,'myr5AuthenticatedAccount',previous);else delete globalThis.myr5AuthenticatedAccount;}
});
