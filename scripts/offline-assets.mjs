import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {readdir,readFile,writeFile,stat} from 'node:fs/promises';
import {join} from 'node:path';

const folders=['pod','creature','models','icons','handborne','arcade'];
const runtime=/\.(?:html|css|mjs|js|webmanifest|json|png|jpe?g|webp|avif|gif|svg|ico|glb|gltf|bin|woff2?|ttf|otf)$/i;
const excluded=new Set(['sw.js','source.json','package.json','package-lock.json','recover.html','recovery-page.mjs']);

// Inventory the actual shipped files, including large models and every design,
// so an unvisited screen or a new material is available after installation.
export async function offlineAssets(root){
 const assets=[];
 async function add(path){
  const hash=createHash('sha256');
  for await(const chunk of createReadStream(join(root,path)))hash.update(chunk);
  assets.push({url:'/'+path,integrity:'sha256-'+hash.digest('base64'),bytes:(await stat(join(root,path))).size});
 }
 async function walk(path){
  for(const entry of await readdir(join(root,path),{withFileTypes:true})){
   if(entry.name.startsWith('.')||entry.name==='source')continue;
   const name=path+'/'+entry.name;
   // The full roster stays available from the customizer, but forcing every
   // large GLB into the atomic app install exceeds practical mobile quotas.
   if(entry.isFile()&&name.startsWith('creature/models/roster/')&&name.endsWith('.glb'))continue;
   if(entry.isDirectory())await walk(name);
   else if(entry.isFile()&&runtime.test(entry.name))await add(name);
  }
 }
 for(const entry of await readdir(root,{withFileTypes:true}))if(entry.isFile()&&!excluded.has(entry.name)&&runtime.test(entry.name))await add(entry.name);
 for(const folder of folders)await walk(folder);
 return assets.sort((a,b)=>a.url.localeCompare(b.url));
}

export async function writeOfflineWorker(root,buildId,template='sw.js'){
 const assets=await offlineAssets(root);
 for(const required of ['/pose.html','/app-runtime.mjs','/launch-bootstrap.mjs','/launch-runtime.mjs','/creature/assets/phone.js','/creature/assets/editor.js','/creature/models/myr5.glb','/creature/models/anatomy.glb','/creature/models/hands-v2.glb','/handborne/models/family-20.glb']){
  if(!assets.some(asset=>asset.url===required&&asset.bytes>0))throw Error('Missing offline Coach asset: '+required);
 }
 const source=await readFile(template,'utf8');
 if(!source.includes('/* OFFLINE_ASSETS */ []'))throw Error('Offline worker template is missing its asset marker.');
 await writeFile(join(root,'sw.js'),source.replace(/^const SHELL='[^']*'/,`const SHELL='myr5-shell-${buildId}'`).replace('/* OFFLINE_ASSETS */ []',JSON.stringify(assets)));
 console.log(`Offline Coach: ${assets.length} files, ${(assets.reduce((sum,asset)=>sum+asset.bytes,0)/1048576).toFixed(1)} MiB.`);
 return assets;
}
