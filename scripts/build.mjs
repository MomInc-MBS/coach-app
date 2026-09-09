import {build} from 'vite';
import {sites} from '@openai/sites-vite-plugin';
import {mkdir,cp,readdir,readFile,writeFile} from 'node:fs/promises';
import {ensureAssets} from './assets.mjs';
await ensureAssets();
await build({configFile:false,plugins:[sites()],build:{outDir:'dist/server',ssr:'server/worker.mjs',target:'es2022',minify:true,rollupOptions:{output:{entryFileNames:'index.js',inlineDynamicImports:true}},ssrEmitAssets:false},ssr:{noExternal:true}});
await mkdir('dist/client',{recursive:true});
for(const entry of await readdir('.',{withFileTypes:true})){if(entry.isFile()&&/\.(html|css|mjs|webmanifest)$/.test(entry.name))await cp(entry.name,`dist/client/${entry.name}`);}
for(const folder of ['pod','creature','models','voice','icons'])await cp(folder,`dist/client/${folder}`,{recursive:true});
await cp('pose.html','dist/client/index.html');await cp('LICENSE','dist/client/LICENSE');
await cp('sw.js','dist/client/sw.js');
// The AGPL source offer travels with the app, with no runtime secrets or user records.
const sources={};for(const folder of ['server','db','scripts','scheduler'])for(const entry of await readdir(folder)){if(/\.(mjs|ts|cjs)$/.test(entry))sources[`${folder}/${entry}`]=await readFile(`${folder}/${entry}`,'utf8');}
for(const entry of await readdir('.'))if(/\.(mjs|html|css|webmanifest)$/.test(entry))sources[entry]=await readFile(entry,'utf8');
await writeFile('dist/client/source.json',JSON.stringify(sources));
console.log('Coach build ready.');
