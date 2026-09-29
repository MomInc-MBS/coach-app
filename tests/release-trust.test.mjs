import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,readFile,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {assertMaterialTrustShipped,copySignedMaterialManifests,loadMaterialPublicBuildConfig,MATERIAL_SECTION_IDS} from '../scripts/material-release.mjs';

// The committed public trust must still verify every committed signed manifest, exactly as scripts/build.mjs does.
test('committed release trust verifies all nine signed material manifests', async()=>{
 const config=JSON.parse(await readFile(new URL('../release-trust/public-build.json',import.meta.url),'utf8'));
 assert.equal(JSON.stringify(config).includes('"d"'),false,'public config never carries a private key field');
 const release=loadMaterialPublicBuildConfig({MYR5_MATERIAL_PUBLIC_SIGNING_JWK:JSON.stringify(config.MYR5_MATERIAL_PUBLIC_SIGNING_JWK),MYR5_MATERIALS_BASE_URL:config.MYR5_MATERIALS_BASE_URL});
 assert.equal(release.configured,true);
 const site=await mkdtemp(join(tmpdir(),'release-trust-'));
 try{assert.deepEqual(await copySignedMaterialManifests({sourceDir:config.MYR5_MATERIAL_SITE_MANIFESTS,siteRoot:site,baseUrl:config.MYR5_MATERIALS_BASE_URL,publicJwk:release.publicJwk}),[...MATERIAL_SECTION_IDS]);}
 finally{await rm(site,{recursive:true,force:true});}
});

// Release 7 shipped a bundle with the trust define unset: signed manifests plus a bare define must fail the build.
test('the build refuses signed material manifests next to a bundle without the public key', async()=>{
 const site=await mkdtemp(join(tmpdir(),'release-trust-guard-'));
 try{
  await writeFile(join(site,'app-runtime.mjs'),'const k=typeof __MYR5_MATERIAL_PUBLIC_JWK__==="undefined"?null:__MYR5_MATERIAL_PUBLIC_JWK__;');
  await assertMaterialTrustShipped(site);
  await mkdir(join(site,'materials','track-arms'),{recursive:true});await writeFile(join(site,'materials','track-arms','chunk-manifest.json'),'{}');
  await assert.rejects(assertMaterialTrustShipped(site),/app-runtime\.mjs has no material public key/);
  await writeFile(join(site,'app-runtime.mjs'),'const k={"kty":"OKP"};');
  await assertMaterialTrustShipped(site);
 }finally{await rm(site,{recursive:true,force:true});}
});
