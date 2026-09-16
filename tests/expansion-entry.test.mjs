import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { isSignedExpansionManifest, resolveExpansionManifest, tearProgress, EXPANSION_ID, PRODUCTION_EXPANSION_KEY } from '../modules/new/expansion-entry.mjs';

const canonical=m=>JSON.stringify({packId:m.packId,version:m.version,minAppVersion:m.minAppVersion,sha256:m.sha256,alg:m.alg,keyId:m.keyId,assets:m.assets.map(({path,bytes,sha256})=>({path,bytes,sha256}))});
const pair=generateKeyPairSync('ed25519');
const trust={purpose:'test-only-signed-expansion',publicKey:pair.publicKey.export({format:'jwk'})};
function manifest(){const m={packId:EXPANSION_ID,version:'1.0.0',minAppVersion:'1.0.0',sha256:'a'.repeat(64),alg:'Ed25519',keyId:'mom-paper-production-v1',assets:[{path:'assets/paper.bin',bytes:3,sha256:'b'.repeat(64)}]};m.signature=sign(null,Buffer.from(canonical(m)),pair.privateKey).toString('base64');return m;}

test('resolver verifies an actual Ed25519 signature and explicitly scoped fixture trust',async()=>{
 const signed=manifest();assert.equal(isSignedExpansionManifest(signed),true);
 const result=await resolveExpansionManifest({fixture:{manifest:signed,source:{'assets/paper.bin':'abc'}},testTrust:trust});assert.equal(result.manifest.packId,EXPANSION_ID);
 await assert.rejects(()=>resolveExpansionManifest({fixture:{manifest:signed,source:{} }}),/signature is invalid/);
 await assert.rejects(()=>resolveExpansionManifest({fixture:{manifest:{...signed,version:'2.0.0'},source:{}},testTrust:trust}),/signature is invalid/);
});
test('resolver rejects unsigned, untrusted, oversized, and unsafe manifests',async()=>{
 const signed=manifest();await assert.rejects(()=>resolveExpansionManifest({fixture:{manifest:{...signed,signature:'signed'},source:{}},testTrust:trust}),/signature is invalid/);
 await assert.rejects(()=>resolveExpansionManifest({fixture:{manifest:{...signed,assets:[{...signed.assets[0],path:'https://evil.example/x'}]},source:{}},testTrust:trust}),/signature is invalid/);
 assert.equal(tearProgress({x:10,y:10},{x:10,y:220},400),1);assert.equal(tearProgress({x:10,y:220},{x:10,y:10},400),0);
});
test('an unprovisioned release has no production trust anchor and fails before network access',async()=>{
 assert.equal(PRODUCTION_EXPANSION_KEY,null);
 let requests=0;
 await assert.rejects(()=>resolveExpansionManifest({fetchImpl:async()=>{requests++;throw Error('network should not run');}}),/trusted production signing key is not configured/);
 assert.equal(requests,0);
});
