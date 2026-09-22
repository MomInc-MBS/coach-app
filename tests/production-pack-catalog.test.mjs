import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import {canonicalCatalogPayload,verifyPackCatalog} from '../packs/catalog-trust.mjs';
import {aggregateCatalogLicenses,dependencyReferenceCounts,planPackRemoval,promotePackCatalog,readLastGoodCatalog} from '../packs/catalog-state.mjs';
import {productionCatalogKeyring} from '../packs/catalog-config.mjs';

const hashA='a'.repeat(64),hashB='b'.repeat(64),manifestHash='c'.repeat(64);
const dependency=(name,hash=hashA)=>({name,version:'1.0.0',path:`/packs/assets/${name}.${hash}.bin`,bytes:20,sha256:hash,spdx:'MIT',sourceUrl:'https://example.com/'+name,attribution:name+' authors'});
const pack=(packId,version='1.0.0',dependencies=[dependency('shared')])=>({packId,version,fallbackId:'builtin:flat-coach',manifest:{path:`/packs/manifests/${packId}.${manifestHash}.json`,bytes:10,sha256:manifestHash},dependencies,totalBytes:10+dependencies.reduce((sum,item)=>sum+item.bytes,0)});
const keys=()=>{
 const release=generateKeyPairSync('ed25519'),recovery=generateKeyPairSync('ed25519');
 return {release,recovery,keyring:[
  {keyId:'release-1',role:'release',protocols:[1],publicKey:release.publicKey.export({format:'jwk'})},
  {keyId:'recovery-1',role:'recovery',protocols:[1],publicKey:recovery.publicKey.export({format:'jwk'})},
 ]};
};
const signed=(privateKey,{generation=1,keyId='release-1',packs=[pack('paper'),pack('material')] }={})=>{
 const catalog={schema:'mom-pack-catalog-v1',protocol:1,generation,publishedAt:1700000000000+generation,keyId,alg:'Ed25519',packs,signature:''};
 catalog.signature=sign(null,Buffer.from(canonicalCatalogPayload(catalog)),privateKey).toString('base64');return catalog;
};
const storage=()=>{const values=new Map();return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,String(value))};};

test('production keyring contains separate public release and recovery anchors',()=>{
 const keyring=productionCatalogKeyring();
 assert.equal(keyring.length,2);
 assert.deepEqual(new Set(keyring.map(entry=>entry.role)),new Set(['release','recovery']));
 assert.equal(new Set(keyring.map(entry=>entry.keyId)).size,2);
 for(const entry of keyring){assert.deepEqual(entry.protocols,[1]);assert.equal(entry.publicKey.kty,'OKP');assert.equal(entry.publicKey.crv,'Ed25519');assert.equal(typeof entry.publicKey.x,'string');assert.equal('d' in entry.publicKey,false);}
});

test('release and recovery keys verify exact immutable catalogs',async()=>{
 const {release,recovery,keyring}=keys(),first=signed(release.privateKey),rollback=signed(recovery.privateKey,{generation:2,keyId:'recovery-1',packs:[pack('paper','0.9.0')]});
 assert.equal(await verifyPackCatalog(first,keyring),true);
 assert.equal(await verifyPackCatalog(rollback,keyring),true);
 const tampered=structuredClone(first);tampered.packs[0].version='2.0.0';
 assert.equal(await verifyPackCatalog(tampered,keyring),false);
 assert.equal(await verifyPackCatalog(first,keyring.slice(1)),false);
});

test('promotion is monotonic, exact retries are idempotent, and rollback uses a higher generation',async()=>{
 const {release,recovery,keyring}=keys(),store=storage(),first=signed(release.privateKey),rollback=signed(recovery.privateKey,{generation:2,keyId:'recovery-1',packs:[pack('paper','0.9.0')]});
 assert.equal((await promotePackCatalog({catalog:first,keyring,storage:store})).duplicate,false);
 assert.equal((await promotePackCatalog({catalog:first,keyring,storage:store})).duplicate,true);
 await promotePackCatalog({catalog:rollback,keyring,storage:store});
 assert.equal((await readLastGoodCatalog({storage:store,keyring})).packs[0].version,'0.9.0');
 await assert.rejects(()=>promotePackCatalog({catalog:first,keyring,storage:store}),/cannot move backward/);
 const conflict=signed(recovery.privateKey,{generation:2,keyId:'recovery-1',packs:[pack('paper','0.8.0')]});
 await assert.rejects(()=>promotePackCatalog({catalog:conflict,keyring,storage:store}),/conflicts/);
});

test('dependencies deduplicate only by exact name version and hash and removal respects references',()=>{
 const shared=dependency('shared'),variant=dependency('shared',hashB),catalog={packs:[pack('paper','1.0.0',[shared]),pack('material','1.0.0',[shared,variant])]};
 const refs=dependencyReferenceCounts(catalog,['paper','material']);
 assert.deepEqual([...refs.values()].map(item=>item.count).sort(),[1,2]);
 const removePaper=planPackRemoval(catalog,['paper','material'],'paper');
 assert.equal(removePaper.removeDependencies.length,0);
 const removeMaterial=planPackRemoval(catalog,['paper','material'],'material');
 assert.deepEqual(removeMaterial.removeDependencies.map(item=>item.sha256),[hashB]);
 assert.equal(aggregateCatalogLicenses(catalog).length,1);
});

test('executable, unpinned, unhashed and unlicensed dependencies fail before signature trust',async()=>{
 const {release,keyring}=keys(),cases=[
  {...dependency('bad'),path:`/packs/assets/bad.${hashA}.wasm`},
  {...dependency('bad'),version:'^1.0.0'},
  {...dependency('bad'),path:'/packs/assets/bad.bin'},
  {...dependency('bad'),spdx:''},
  {...dependency('bad'),bytes:512*1024+1},
 ];
 for(const item of cases)assert.equal(await verifyPackCatalog(signed(release.privateKey,{packs:[pack('bad','1.0.0',[item])]}),keyring),false);
 const tooLarge=Array.from({length:4},(_,index)=>dependency('large-'+index)).map(item=>({...item,bytes:512*1024}));
 assert.equal(await verifyPackCatalog(signed(release.privateKey,{packs:[pack('too-large','1.0.0',tooLarge)]}),keyring),false);
});
