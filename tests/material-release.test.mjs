import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,generateKeyPairSync,sign} from 'node:crypto';
import {mkdtemp,mkdir,readFile,readdir,rm,writeFile} from 'node:fs/promises';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {DEFAULT_LOCAL_RESOURCE_POLICY,validateChunkManifest,verifyChunkManifest,canonicalChunkPayload} from '../modules/materials/chunk-delivery.mjs';
import {MATERIAL_SECTION_IDS,copySignedMaterialManifests,loadMaterialPublicBuildConfig,parseMaterialsBaseUrl,publicJwkFromPrivate,signAndStageMaterialSections} from '../scripts/material-release.mjs';
import {buildPostDownloadSections} from '../scripts/build-post-download-sections.mjs';
import {build} from 'esbuild';

const hash=bytes=>createHash('sha256').update(bytes).digest('hex'),commit='0123456789abcdef0123456789abcdef01234567';
const baseUrl=`https://raw.githubusercontent.com/mominc/myr5-packs/${commit}/materials`;
const publicPolicy={...DEFAULT_LOCAL_RESOURCE_POLICY,trustedOrigins:['https://raw.githubusercontent.com'],allowedProtocols:['https:'],pathPrefix:`/mominc/myr5-packs/${commit}/materials/`};
function manifest(id,bytes){const paths=id==='coach-ships-biomes'?['supportive','direct','analytical','playful','calm','mom'].map(ship=>`assets/ships/${ship}.glb`).concat('assets/biomes.m5bundle'):[`assets/${id.slice(6)}.m5bundle`],digest=hash(bytes);return{schema:'mom-material-chunks-v1',packId:id,version:'1.0.0',keyId:'placeholder',assets:paths.map(path=>({path,bytes:bytes.length,sha256:digest,chunks:[{index:0,offset:0,bytes:bytes.length,sha256:digest,url:`${baseUrl}/${id}/1.0.0/${path.split('/').at(-1)}`}]})),signature:''};}

test('material release signing verifies all nine packets and separates raw-host bytes from Site manifests',async()=>{
 const root=await mkdtemp(join(tmpdir(),'myr5-material-release-')),input=join(root,'unsigned'),host=join(root,'raw-github-stage'),site=join(root,'site-manifests'),keypair=generateKeyPairSync('ed25519'),privateJwk=keypair.privateKey.export({format:'jwk'}),publicJwk=keypair.publicKey.export({format:'jwk'});
 try{
  const bytesById=new Map();for(const id of MATERIAL_SECTION_IDS){const bytes=Buffer.from(`fixture:${id}`),dir=join(input,id),record=manifest(id,bytes);record.unreviewedMetadata=privateJwk.d;bytesById.set(id,bytes);for(const asset of record.assets){await mkdir(dirname(join(dir,asset.path)),{recursive:true});await writeFile(join(dir,asset.path),bytes);}await writeFile(join(dir,'chunk-manifest.unsigned.json'),JSON.stringify(record));}
  const result=await signAndStageMaterialSections({inputDir:input,hostRoot:host,siteRoot:site,baseUrl,privateJwk});assert.equal(result.signed,true);assert.equal(result.sections.length,9);assert.deepEqual(result.publicJwk,{kty:'OKP',crv:'Ed25519',x:publicJwk.x});assert.equal('d'in result.publicJwk,false);
  for(const id of MATERIAL_SECTION_IDS){const text=await readFile(join(site,'materials',id,'chunk-manifest.json'),'utf8'),signed=JSON.parse(text);assert.equal(text.includes(privateJwk.d),false);assert.equal(await verifyChunkManifest(signed,result.publicJwk,publicPolicy),true);assert.equal(signed.signature.length,88);for(const asset of signed.assets)assert.deepEqual(await readFile(join(host,'materials',id,'1.0.0',asset.path.split('/').at(-1))),bytesById.get(id));}
  assert.equal(await copySignedMaterialManifests({sourceDir:site,siteRoot:join(root,'sites-dist'),baseUrl,publicJwk:result.publicJwk}).then(rows=>rows.length),9);
  const republished=await signAndStageMaterialSections({inputDir:input,hostRoot:host,siteRoot:join(root,'site-manifests-second-pass'),baseUrl,privateJwk});assert.equal(republished.sections.length,9,'a later commit-pinned signing pass must reuse already-staged identical host bytes');
  const siteFiles=[];async function walk(path){for(const entry of await readdir(path,{withFileTypes:true})){const child=join(path,entry.name);if(entry.isDirectory())await walk(child);else siteFiles.push(child);}}await walk(site);assert.equal(siteFiles.every(path=>path.endsWith('chunk-manifest.json')),true);
  assert.doesNotMatch(JSON.stringify(result),new RegExp(privateJwk.d));
  const extra=JSON.parse(await readFile(join(site,'materials','track-arms','chunk-manifest.json'),'utf8'));extra.secret=privateJwk.d;await writeFile(join(site,'materials','track-arms','chunk-manifest.json'),JSON.stringify(extra));await assert.rejects(()=>copySignedMaterialManifests({sourceDir:site,siteRoot:join(root,'reject-extra-metadata'),baseUrl,publicJwk}),/unauthenticated metadata/);
  const changed=manifest('track-arms',Buffer.from('fixture:track-arms'));changed.assets[0].path='assets/unexpected.m5bundle';changed.signature=sign(null,Buffer.from(canonicalChunkPayload(changed)),keypair.privateKey).toString('base64');await writeFile(join(site,'materials','track-arms','chunk-manifest.json'),JSON.stringify(changed));await assert.rejects(()=>copySignedMaterialManifests({sourceDir:site,siteRoot:join(root,'reject-wrong-inventory'),baseUrl,publicJwk}),/inventory mismatch/);
  const incomplete=manifest('coach-ships-biomes',bytesById.get('coach-ships-biomes'));incomplete.assets.pop();await writeFile(join(input,'coach-ships-biomes','chunk-manifest.unsigned.json'),JSON.stringify(incomplete));await assert.rejects(()=>signAndStageMaterialSections({inputDir:input,hostRoot:host,siteRoot:join(root,'reject-incomplete-ships'),baseUrl,privateJwk}),/inventory mismatch/);
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

test('every browser entrypoint receives public material trust, including the launch download UI',async()=>{
 const pair=generateKeyPairSync('ed25519'),privateJwk=pair.privateKey.export({format:'jwk'}),publicJwk=publicJwkFromPrivate(privateJwk),config=loadMaterialPublicBuildConfig({MYR5_MATERIAL_PUBLIC_SIGNING_JWK:JSON.stringify(publicJwk),MYR5_MATERIALS_BASE_URL:baseUrl}),script=await readFile(new URL('../scripts/build.mjs',import.meta.url),'utf8');
 for(const entry of ['./creature/source/editor.ts','./creature/source/phone.ts','./app.mjs','./launch.mjs']){const line=script.split('\n').find(line=>line.includes(`entryPoints:['${entry}']`));assert(line?.includes('define:materialRelease.defines'),`${entry} must receive the release public trust/policy defines`);}
 const result=await build({entryPoints:['launch.mjs'],bundle:true,write:false,format:'esm',target:'es2022',define:config.defines,external:['./nutrition-data.mjs','./local-coach-runtime.mjs','./food/pyramid-scanner.mjs']});
 assert(result.outputFiles[0].text.includes(publicJwk.x));assert(result.outputFiles[0].text.includes(config.policy.pathPrefix));assert(!result.outputFiles[0].text.includes(privateJwk.d));
});
