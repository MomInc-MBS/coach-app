import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign,createHash} from 'node:crypto';
import {ChunkDownloader,DEFAULT_LOCAL_RESOURCE_POLICY,canonicalChunkPayload,memoryChunkStore} from '../modules/materials/chunk-delivery.mjs';
import {downloadPostDownloadSection} from '../modules/materials/post-download-controller.mjs';
import {unpackVerifiedBundle} from '../modules/materials/verified-bundle.mjs';
import {createVerifiedShipAssetBridge} from '../modules/ships/verified-ship-assets.mjs';
import {BIOMES} from '../modules/ships/ship-scene-domain.mjs';
import * as ledger from '../unlock-ledger.mjs';
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const keys=generateKeyPairSync('ed25519'),trust=keys.publicKey.export({format:'jwk'});
const policy={...DEFAULT_LOCAL_RESOURCE_POLICY,trustedOrigins:['https://example.test']};
function fixture(){const bytes=new Uint8Array([1,2,3,4]),sha256=digest(bytes),manifest={schema:'mom-material-chunks-v1',packId:'track-chest',version:'1.0.0',keyId:'test-v1',assets:[{path:'assets/chest.m5bundle',bytes:4,sha256,chunks:[{index:0,offset:0,bytes:4,sha256,url:'https://example.test/materials/chest'}]}]};manifest.signature=sign(null,Buffer.from(canonicalChunkPayload(manifest)),keys.privateKey).toString('base64');return {bytes,manifest};}
function bundle(entries){let offset=0;const index=Object.fromEntries(entries.map(([name,bytes])=>{const entry={offset,bytes:bytes.length,sha256:digest(bytes)};offset+=bytes.length;return [name,entry];}));const header=Buffer.from(JSON.stringify(index)),prefix=Buffer.alloc(4);prefix.writeUInt32BE(header.length);return Buffer.concat([prefix,header,...entries.map(x=>x[1])]);}

test('new cosmetics are account-bound while legacy grants remain device-wide',()=>{
 const original=globalThis.localStorage,data=new Map();globalThis.localStorage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)};
 try{for(const kind of ledger.ACCOUNT_SCOPED_LEDGER_KINDS){assert.equal(ledger.grantUnlock(kind,'test-id',{account:null}),false);assert.equal(ledger.grantUnlock(kind,'test-id',{account:{user:{id:'owner-a'}}}),true);assert.equal(ledger.isGranted(kind,'test-id',{account:'owner-a'}),true);assert.equal(ledger.isGranted(kind,'test-id',{account:'owner-b'}),false);assert.equal(ledger.grantUnlock(kind,'test-id',{account:'owner-a'}),false);assert.equal(ledger.isGranted(kind,'test-id',{account:'../owner-a'}),false);}ledger.grantUnlock('weapon','legacy');assert(ledger.isGranted('weapon','legacy',{account:'owner-b'}));}finally{globalThis.localStorage=original;}
});
test('logout cannot fall back to the account captured by a packet download',async()=>{
 const prior=Object.getOwnPropertyDescriptor(globalThis,'myr5AuthenticatedAccount');globalThis.myr5AuthenticatedAccount=null;let fetches=0;
 try{await assert.rejects(()=>downloadPostDownloadSection({id:'track-chest',account:{user:{id:'old-owner'}},authorize:()=>true,store:memoryChunkStore(),trust,policy,fetchImpl:async()=>{fetches++;throw Error();}}),/account changed/);assert.equal(fetches,0);}finally{if(prior)Object.defineProperty(globalThis,'myr5AuthenticatedAccount',prior);else delete globalThis.myr5AuthenticatedAccount;}
});
test('progress scan cannot silently restart delivery under a different owner and obeys cancellation',async()=>{
 const {bytes,manifest}=fixture(),base=memoryChunkStore();let owner='owner-a',calls=0;
 const downloader=new ChunkDownloader({store:{...base,get:async()=>{owner='owner-b';return bytes;}},policy,manifestPublicKey:trust,expectedVersion:'1.0.0',ownership:()=>owner,fetchImpl:async()=>{calls++;throw Error('network');}});
 await assert.rejects(()=>downloader.downloadWithProgress(manifest),/account changed/);assert.equal(calls,0);
 owner='owner-a';const cancelled=new AbortController();cancelled.abort();await assert.rejects(()=>downloader.downloadWithProgress(manifest,{signal:cancelled.signal}),/cancelled/);
});
test('bundle rejects traversal, gaps, corruption and unindexed data',async()=>{
 const valid=bundle([['safe/map',Buffer.from([7])]]);assert.equal((await unpackVerifiedBundle(valid)).size,1);
 await assert.rejects(()=>unpackVerifiedBundle(bundle([['../escape',Buffer.from([7])]])),/invalid bundled entry/);
 await assert.rejects(()=>unpackVerifiedBundle(Buffer.concat([valid,Buffer.from([1])])),/trailing/);
 const corrupt=Buffer.from(valid);corrupt[corrupt.length-1]^=1;await assert.rejects(()=>unpackVerifiedBundle(corrupt),/integrity/);
});
test('ship bridge assembles only owned ships and revokes every URL on account loss',async()=>{
 let owned=true;const created=[],revoked=[],reads=[],events=new EventTarget(),plates=bundle(BIOMES.map(name=>[`${name}.webp`,Buffer.from([1,2])]));
 const bridge=await createVerifiedShipAssetBridge({manifest:{packId:'coach-ships-biomes',assets:[]},isOwned:()=>owned,canUseShip:()=>['supportive'],events,urlApi:{createObjectURL:()=>{const url=`blob:${created.length}`;created.push(url);return url;},revokeObjectURL:url=>revoked.push(url)},downloader:{readVerifiedAsset:async(_,path)=>{reads.push(path);return {bytes:path.endsWith('.m5bundle')?plates:new Uint8Array([1])};}}});
 assert.equal(reads.length,2);assert.equal(created.length,25);assert.throws(()=>bridge.getShipUrl('calm'),/not owned/);assert.deepEqual(bridge.ownedShipIds(),['supportive']);owned=false;events.dispatchEvent(new Event('myr5:account-ready'));assert.deepEqual(revoked,created);assert.throws(()=>bridge.getBackgroundUrl('original'),/revoked/);bridge.dispose();assert.equal(revoked.length,25);
});
