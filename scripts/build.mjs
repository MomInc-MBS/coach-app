import {build} from 'vite';
import {sites} from '@openai/sites-vite-plugin';
import {mkdir,cp,readdir,readFile,writeFile,unlink} from 'node:fs/promises';
import {ensureAssets,ensureHandAssets} from './assets.mjs';
import {build as bundleEditor} from 'esbuild';
import {prepareReleaseBuild} from './release-build.mjs';
await ensureAssets();
await ensureHandAssets();
await bundleEditor({entryPoints:['./creature/source/editor.ts'],bundle:true,format:'esm',target:'es2022',minify:true,sourcemap:true,outfile:'creature/assets/editor.js'});
// The app viewer must use the same recipe catalog and materials as the editor.
await bundleEditor({entryPoints:['./creature/source/phone.ts'],bundle:true,format:'esm',target:'es2022',minify:true,sourcemap:true,outfile:'creature/assets/phone.js'});
await bundleEditor({entryPoints:['./weapon-training.mjs'],bundle:true,format:'iife',globalName:'MYR5Training',target:'es2022',minify:true,outfile:'workout-tracks.js'});
const releaseBuild=await prepareReleaseBuild();
await bundleEditor({entryPoints:['./app.mjs'],bundle:true,format:'esm',target:'es2022',minify:true,outfile:'app-runtime.mjs',external:['three','three/*','https://*']});
await bundleEditor({entryPoints:['./launch.mjs'],bundle:true,format:'esm',target:'es2022',minify:true,outfile:'launch-runtime.mjs',external:['./nutrition-data.mjs']});
await build({configFile:false,plugins:[sites()],build:{outDir:'dist/server',ssr:'server/worker.mjs',target:'es2022',minify:true,rollupOptions:{output:{entryFileNames:'index.js',inlineDynamicImports:true}},ssrEmitAssets:false},ssr:{noExternal:true}});
await mkdir('dist/client',{recursive:true});
for(const entry of await readdir('.',{withFileTypes:true})){if(entry.isFile()&&/\.(html|css|mjs|webmanifest)$/.test(entry.name))await cp(entry.name,`dist/client/${entry.name}`);}
await cp('workout-tracks.js','dist/client/workout-tracks.js');
for(const folder of ['pod','creature','models','icons','handborne','arcade'])await cp(folder,`dist/client/${folder}`,{recursive:true});
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
let sw=(await readFile('sw.js','utf8')).replace(/^const SHELL='[^']*'/,`const SHELL='myr5-shell-${releaseBuild}'`);
for(const h of cssHrefs)sw=sw.replaceAll(`'${h}',`,'').replaceAll(`,'${h}'`,'');
sw=sw.replace("'/pose.html',","'/pose.html','/app.css',");
sw=sw.replace("const CORE=['/pose.html',","const CORE=['/pose.html','/app.css',");
await writeFile('dist/client/sw.js',sw);
// The AGPL source offer travels with the app, with no runtime secrets or user records.
const sources={};for(const folder of ['server','db','scripts','scheduler','pod'])for(const entry of await readdir(folder)){if(/\.(mjs|ts|cjs)$/.test(entry))sources[`${folder}/${entry}`]=await readFile(`${folder}/${entry}`,'utf8');}
for(const entry of await readdir('.'))if(/\.(mjs|html|css|webmanifest)$/.test(entry))sources[entry]=await readFile(entry,'utf8');
await writeFile('dist/client/source.json',JSON.stringify(sources));
console.log('Coach build ready.');
