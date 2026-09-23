import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,generateKeyPairSync} from 'node:crypto';
import {mkdtemp,mkdir,readFile,readdir,rm,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {DEFAULT_LOCAL_RESOURCE_POLICY,validateChunkManifest,verifyChunkManifest} from '../modules/materials/chunk-delivery.mjs';
import {MATERIAL_SECTION_IDS,copySignedMaterialManifests,loadMaterialPublicBuildConfig,parseMaterialsBaseUrl,publicJwkFromPrivate,signAndStageMaterialSections} from '../scripts/material-release.mjs';
import {buildPostDownloadSections} from '../scripts/build-post-download-sections.mjs';

const hash=bytes=>createHash('sha256').update(bytes).digest('hex'),commit='0123456789abcdef0123456789abcdef01234567';
const baseUrl=`https://raw.githubusercontent.com/mominc/myr5-packs/${commit}/materials`;
const publicPolicy={...DEFAULT_LOCAL_RESOURCE_POLICY,trustedOrigins:['https://raw.githubusercontent.com'],allowedProtocols:['https:'],pathPrefix:`/mominc/myr5-packs/${commit}/materials/`};
function manifest(id,bytes){const path=`assets/${id}.bin`,url=`${baseUrl}/${id}/1.0.0/${id}.bin`,digest=hash(bytes);return{schema:'mom-material-chunks-v1',packId:id,version:'1.0.0',keyId:'placeholder',assets:[{path,bytes:bytes.length,sha256:digest,chunks:[{index:0,offset:0,bytes:bytes.length,sha256:digest,url}]}],signature:''};}

test('material release signing verifies all nine packets and separates raw-host bytes from Site manifests',async()=>{
 const root=await mkdtemp(join(tmpdir(),'myr5-material-release-')),input=join(root,'unsigned'),host=join(root,'raw-github-stage'),site=join(root,'site-manifests'),keypair=generateKeyPairSync('ed25519'),privateJwk=keypair.privateKey.export({format:'jwk'}),publicJwk=keypair.publicKey.export({format:'jwk'});
 try{
  const bytesById=new Map();for(const id of MATERIAL_SECTION_IDS){const bytes=Buffer.from(`fixture:${id}`),dir=join(input,id);bytesById.set(id,bytes);await mkdir(join(dir,'assets'),{recursive:true});await writeFile(join(dir,`assets/${id}.bin`),bytes);await writeFile(join(dir,'chunk-manifest.unsigned.json'),JSON.stringify(manifest(id,bytes)));}
  const result=await signAndStageMaterialSections({inputDir:input,hostRoot:host,siteRoot:site,baseUrl,privateJwk});assert.equal(result.signed,true);assert.equal(result.sections.length,9);assert.deepEqual(result.publicJwk,{kty:'OKP',crv:'Ed25519',x:publicJwk.x});assert.equal('d'in result.publicJwk,false);
  for(const id of MATERIAL_SECTION_IDS){const text=await readFile(join(site,'materials',id,'chunk-manifest.json'),'utf8'),signed=JSON.parse(text);assert.equal(text.includes(privateJwk.d),false);assert.equal(await verifyChunkManifest(signed,result.publicJwk,publicPolicy),true);assert.equal(signed.signature.length,88);assert.deepEqual(await readFile(join(host,'materials',id,'1.0.0',`${id}.bin`)),bytesById.get(id));}
  assert.equal(await copySignedMaterialManifests({sourceDir:site,siteRoot:join(root,'sites-dist'),baseUrl,publicJwk:result.publicJwk}).then(rows=>rows.length),9);
  const republished=await signAndStageMaterialSections({inputDir:input,hostRoot:host,siteRoot:join(root,'site-manifests-second-pass'),baseUrl,privateJwk});assert.equal(republished.sections.length,9,'a later commit-pinned signing pass must reuse already-staged identical host bytes');
  const siteFiles=[];async function walk(path){for(const entry of await readdir(path,{withFileTypes:true})){const child=join(path,entry.name);if(entry.isDirectory())await walk(child);else siteFiles.push(child);}}await walk(site);assert.equal(siteFiles.every(path=>path.endsWith('chunk-manifest.json')),true);
  assert.doesNotMatch(JSON.stringify(result),new RegExp(privateJwk.d));
 }finally{await rm(root,{recursive:true,force:true});}
});

test('raw host parsing pins exact origin and full immutable commit path',()=>{
 const parsed=parseMaterialsBaseUrl(baseUrl);assert.deepEqual(parsed.trustedOrigins,['https://raw.githubusercontent.com']);assert.equal(parsed.pathPrefix,`/mominc/myr5-packs/${commit}/materials/`);
 for(const unsafe of ['https://mominc.online/materials','https://raw.githubusercontent.com/mominc/myr5-packs/main/materials',`https://raw.githubusercontent.com/mominc/myr5-packs/${commit}/materials/extra`,`https://raw.githubusercontent.com/mominc/myr5-packs/${commit}/materials?redirect=1`,`https://evil.invalid/mominc/myr5-packs/${commit}/materials`])assert.throws(()=>parseMaterialsBaseUrl(unsafe),/raw\.githubusercontent/);
 const bytes=Buffer.from('test'),good=manifest('track-chest',bytes);assert.equal(validateChunkManifest(good,publicPolicy),true);
 for(const url of [`https://raw.githubusercontent.com/mominc/other/${commit}/materials/track-chest/1.0.0/a.bin`,`https://evil.invalid/mominc/myr5-packs/${commit}/materials/track-chest/1.0.0/a.bin`]){const bad=structuredClone(good);bad.assets[0].chunks[0].url=url;assert.throws(()=>validateChunkManifest(bad,publicPolicy),/URL/);}
});

test('release config requires complete public inputs and never accepts private JWK as browser trust',()=>{
 const keys=generateKeyPairSync('ed25519'),privateJwk=keys.privateKey.export({format:'jwk'}),publicJwk=publicJwkFromPrivate(privateJwk);
 assert.equal('d'in publicJwk,false);assert.throws(()=>loadMaterialPublicBuildConfig({MYR5_MATERIAL_PUBLIC_SIGNING_JWK:JSON.stringify(publicJwk)}),/both/);
 assert.throws(()=>loadMaterialPublicBuildConfig({MYR5_MATERIAL_PUBLIC_SIGNING_JWK:JSON.stringify(privateJwk),MYR5_MATERIALS_BASE_URL:baseUrl}),/without private/);
 const config=loadMaterialPublicBuildConfig({MYR5_MATERIAL_PUBLIC_SIGNING_JWK:JSON.stringify(publicJwk),MYR5_MATERIALS_BASE_URL:baseUrl});assert.equal(config.configured,true);assert.deepEqual(config.policy,{trustedOrigins:['https://raw.githubusercontent.com'],allowedProtocols:['https:'],pathPrefix:`/mominc/myr5-packs/${commit}/materials/`});
 assert.equal(JSON.stringify(config).includes(privateJwk.d),false);
});

test('packet builder fails closed without an immutable raw host configuration',async()=>{
 await assert.rejects(()=>buildPostDownloadSections({root:process.cwd(),outputDir:join(tmpdir(),'never-used-material-stage'),baseUrl:''}),/commit-pinned raw\.githubusercontent\.com/);
});
