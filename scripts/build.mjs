import {build} from 'vite';
import {sites} from '@openai/sites-vite-plugin';
import {mkdir,cp,readdir,readFile,writeFile,unlink} from 'node:fs/promises';
import {ensureAssets,ensureHandAssets} from './assets.mjs';
import {build as bundleEditor} from 'esbuild';
import {prepareReleaseBuild} from './release-build.mjs';
await ensureAssets();
await ensureHandAssets();
await bundleEditor({entryPoints:['./creature/source/editor.ts'],bundle:true,format:'esm',target:'es2022',minify:true,sourcemap:true,outfile:'creature/assets/editor.js'});
await bundleEditor({entryPoints:['./weapon-training.mjs'],bundle:true,format:'iife',globalName:'MYR5Training',target:'es2022',minify:true,outfile:'workout-tracks.js'});
const releaseBuild=await prepareReleaseBuild();
await bundleEditor({entryPoints:['./app.mjs'],bundle:true,format:'esm',target:'es2022',minify:true,outfile:'app-runtime.mjs',external:['three','three/*','https://*']});
await bundleEditor({entryPoints:['./launch.mjs'],bundle:true,format:'esm',target:'es2022',minify:true,outfile:'launch-runtime.mjs'});
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
const pose=(await readFile('pose.html','utf8')).replace('launch-bootstrap.mjs?v=startup-recovery-1','launch-bootstrap.mjs?v='+releaseBuild).replace('app-runtime.mjs?v=rest-flow-1','app-runtime.mjs?v='+releaseBuild);
await writeFile('dist/client/pose.html',pose);await writeFile('dist/client/index.html',pose);await cp('LICENSE','dist/client/LICENSE');
await writeFile('dist/client/sw.js',(await readFile('sw.js','utf8')).replace(/^const SHELL='[^']*'/,`const SHELL='myr5-shell-${releaseBuild}'`));
// The AGPL source offer travels with the app, with no runtime secrets or user records.
const sources={};for(const folder of ['server','db','scripts','scheduler','pod'])for(const entry of await readdir(folder)){if(/\.(mjs|ts|cjs)$/.test(entry))sources[`${folder}/${entry}`]=await readFile(`${folder}/${entry}`,'utf8');}
for(const entry of await readdir('.'))if(/\.(mjs|html|css|webmanifest)$/.test(entry))sources[entry]=await readFile(entry,'utf8');
await writeFile('dist/client/source.json',JSON.stringify(sources));
console.log('Coach build ready.');
