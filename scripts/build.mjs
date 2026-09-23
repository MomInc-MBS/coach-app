import {build} from 'vite';
import {resolve,sep} from 'node:path';
import {compactModels} from './compact-models.mjs';
import {sites} from '@openai/sites-vite-plugin';
import {mkdir,cp,readdir,readFile,writeFile,unlink,rm,stat} from 'node:fs/promises';
import {ensureAssets,ensureHandAssets,ensureThreeVendor} from './assets.mjs';
import {build as bundleEditor} from 'esbuild';
import {prepareReleaseBuild} from './release-build.mjs';
import {writeOfflineWorker} from './offline-assets.mjs';
const publicExpansionKey=process.env.PUBLIC_EXPANSION_SIGNING_JWK ? JSON.parse(process.env.PUBLIC_EXPANSION_SIGNING_JWK) : null;
if(publicExpansionKey && !(publicExpansionKey.kty==='OKP' && publicExpansionKey.crv==='Ed25519' && typeof publicExpansionKey.x==='string' && /^[A-Za-z0-9_-]{43}$/.test(publicExpansionKey.x) && !/^A+$/.test(publicExpansionKey.x))) throw new Error('PUBLIC_EXPANSION_SIGNING_JWK must be a non-placeholder Ed25519 public JWK');
await ensureAssets();
await ensureHandAssets();
await ensureThreeVendor();
await bundleEditor({entryPoints:['./creature/source/editor.ts'],bundle:true,format:'esm',target:'es2022',minify:true,sourcemap:true,outfile:'creature/assets/editor.js'});
// The app viewer must use the same recipe catalog and materials as the editor.
await bundleEditor({entryPoints:['./creature/source/phone.ts'],bundle:true,format:'esm',target:'es2022',minify:true,sourcemap:true,outfile:'creature/assets/phone.js'});
await bundleEditor({entryPoints:['./weapon-training.mjs'],bundle:true,format:'iife',globalName:'MYR5Training',target:'es2022',minify:true,outfile:'workout-tracks.js'});
await bundleEditor({entryPoints:['./local-coach/browser-runtime.mjs'],bundle:true,format:'esm',target:'es2022',minify:true,outfile:'local-coach-runtime.mjs'});
const releaseBuild=await prepareReleaseBuild();
await bundleEditor({entryPoints:['./app.mjs'],bundle:true,format:'esm',target:'es2022',minify:true,outfile:'app-runtime.mjs',external:['https://*','./local-coach-runtime.mjs','./creature/assets/phone.js','./modules/portal/portal-entry.mjs']});
await bundleEditor({entryPoints:['./launch.mjs'],bundle:true,format:'esm',target:'es2022',minify:true,outfile:'launch-runtime.mjs',external:['./nutrition-data.mjs','./local-coach-runtime.mjs','./food/pyramid-scanner.mjs']});
await build({configFile:false,plugins:[sites()],build:{outDir:'dist/server',ssr:'server/worker.mjs',target:'es2022',minify:true,rollupOptions:{output:{entryFileNames:'index.js',inlineDynamicImports:true}},ssrEmitAssets:false},ssr:{noExternal:true}});
await mkdir('dist/client',{recursive:true});
for(const entry of await readdir('.',{withFileTypes:true})){if(entry.isFile()&&/\.(html|css|mjs|webmanifest)$/.test(entry.name))await cp(entry.name,`dist/client/${entry.name}`);}
await cp('workout-tracks.js','dist/client/workout-tracks.js');
for(const folder of ['pod','creature','models','icons','handborne','arcade','modules','packs','war-room','food','vendor'])await cp(folder,`dist/client/${folder}`,{recursive:true});
// Authoring projects remain in the published source repository, not the app bundle.
for(const folder of ['creature/source','handborne/source']){const target=resolve('dist/client',folder);if(!target.startsWith(resolve('dist/client')+sep))throw Error('Invalid staging path');await rm(target,{recursive:true,force:true});}
// Keep debugger-only maps in the open-source repository,
// but not in the deployable static archive. Runtime code does not request them.
for(const path of [
 'dist/client/handborne/assets/hand-entry-B7K7J180.js',
 'dist/client/handborne/assets/hand-entry-BySRDxUO.css',
 'dist/client/handborne/assets/GLTFExporter-CL_WC7Dc.js',
 'dist/client/handborne/assets/OBJExporter-J3SdsgWZ.js',
 'dist/client/creature/assets/chunk-2X4UOJKI.js',
 'dist/client/creature/assets/chunk-FY3X2IKC.js',
 'dist/client/creature/assets/chunk-QUSSDQTX.js',
 'dist/client/creature/assets/chunk-2X4UOJKI.js.map',
 'dist/client/creature/assets/chunk-FY3X2IKC.js.map',
 'dist/client/creature/assets/chunk-QUSSDQTX.js.map',
 'dist/client/creature/assets/editor.js.map',
 'dist/client/creature/assets/phone.js.map',
])await unlink(path);
console.log('Duplicate model bytes removed:',await compactModels('dist/client/creature/models')+await compactModels('dist/client/handborne/models'));
// The source configuration is intentionally empty. Only a validated public
// verification JWK may be embedded in a release; signing material is never read.
const expansionConfigPath='dist/client/modules/new/expansion-config.mjs';
await writeFile(expansionConfigPath,(await readFile('modules/new/expansion-config.mjs','utf8')).replace('export const BUILT_PUBLIC_EXPANSION_SIGNING_JWK = null;',`export const BUILT_PUBLIC_EXPANSION_SIGNING_JWK = ${JSON.stringify(publicExpansionKey)};`));
// Publish only the current voice pack, excluding obsolete clips and source masters.
const voiceManifest=JSON.parse(await readFile('voice/manifest.json','utf8'));
await mkdir('dist/client/voice',{recursive:true});
for(const entry of await readdir('dist/client/voice',{withFileTypes:true}))if(entry.isFile()&&/\.(wav|mp3|json)$/.test(entry.name))await unlink('dist/client/voice/'+entry.name);
await cp('voice/manifest.json','dist/client/voice/manifest.json');
for(const url of new Set(Object.values(voiceManifest.phrases)))await cp('.'+url,'dist/client'+url);
let pose=(await readFile('pose.html','utf8')).replaceAll('startup-recovery-1',releaseBuild).replaceAll('rest-flow-1',releaseBuild);
// One stylesheet in production: concatenate the <link rel=stylesheet> files in document order (every url() in them is absolute).
const cssLinks=[...pose.matchAll(/<link[^>]*rel="stylesheet"[^>]*href="([^"?]+)[^"]*"[^>]*>/g)];
const cssHrefs=cssLinks.map(m=>m[1]);
await writeFile('dist/client/app.css',(await Promise.all(cssHrefs.map(h=>readFile('.'+h,'utf8')))).join('\n'));
for(const m of cssLinks)pose=pose.replace(m[0],'');
pose=pose.replace('<link rel="manifest"',`<link rel="stylesheet" href="/app.css?v=${releaseBuild}"><link rel="manifest"`);
await writeFile('dist/client/pose.html',pose);await writeFile('dist/client/index.html',pose);await cp('LICENSE','dist/client/LICENSE');
await writeOfflineWorker('dist/client',releaseBuild);
// The AGPL source offer travels with the app, with no runtime secrets or user records.
const sources={};for(const folder of ['server','db','scripts','scheduler','pod','local-coach'])for(const entry of await readdir(folder)){if(/\.(mjs|ts|cjs)$/.test(entry))sources[`${folder}/${entry}`]=await readFile(`${folder}/${entry}`,'utf8');}
for(const entry of await readdir('.'))if(/\.(mjs|html|css|webmanifest)$/.test(entry)&&!['app-runtime.mjs','launch-runtime.mjs','local-coach-runtime.mjs','nutrition-data.mjs'].includes(entry))sources[entry]=await readFile(entry,'utf8');
await writeFile('dist/client/source.json',JSON.stringify(sources));
// Sites caps the uncompressed deployment archive at 256 MiB. Measure every deployed file after
// staging (including server output) and fail closed if this release has no positive headroom.
const SITES_ARCHIVE_LIMIT=268435456;
async function deployedBytes(path){let total=0;for(const entry of await readdir(path,{withFileTypes:true})){const child=`${path}/${entry.name}`;total+=entry.isDirectory()?await deployedBytes(child):(await stat(child)).size;}return total;}
const archiveBytes=await deployedBytes('dist'),archiveHeadroom=SITES_ARCHIVE_LIMIT-archiveBytes;
if(archiveHeadroom<=0)throw Error(`Sites archive has no headroom: ${archiveBytes} / ${SITES_ARCHIVE_LIMIT} bytes.`);
console.log(`Sites archive: ${archiveBytes} / ${SITES_ARCHIVE_LIMIT} bytes; ${archiveHeadroom} bytes headroom.`);
console.log('Coach build ready.');
