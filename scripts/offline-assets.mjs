import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {readdir,readFile,writeFile,stat} from 'node:fs/promises';
import {join} from 'node:path';

const folders=['pod','creature','models','icons','handborne','arcade','war-room'];
export const CORE_OFFLINE_BUDGET=8*1024*1024;
// ponytail: the achievements board art (453 KB) is built-in optional, not core: core is ~7.8 of the 8 MiB
// without it and the build refuses more. It still ships, and is cached the first time the board opens
// online. Drop the achievements.jpg exception once the core budget has room for it.
export const isCoreAsset=url=>!url.slice(1).includes('/')||url.startsWith('/icons/')||url.startsWith('/pod/')&&!/\.(?:glb|gltf|bin)$/i.test(url)&&url!=='/pod/worlds/achievements.jpg';
const runtime=/\.(?:html|css|mjs|js|webmanifest|json|png|jpe?g|webp|avif|gif|svg|ico|glb|gltf|bin|woff2?|ttf|otf)$/i;
const excluded=new Set(['sw.js','source.json','package.json','package-lock.json','recover.html','recovery-page.mjs']);

// Built-in optional art stays shipped but never blocks core installation.
// PackLifecycle bytes are outside both inventories.
export async function offlineInventory(root){
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
   if(entry.isDirectory())await walk(name);
   else if(entry.isFile()&&runtime.test(entry.name))await add(name);
  }
 }
 for(const entry of await readdir(root,{withFileTypes:true}))if(entry.isFile()&&!excluded.has(entry.name)&&runtime.test(entry.name))await add(entry.name);
 for(const folder of folders)try{await walk(folder);}catch(error){if(error.code!=='ENOENT')throw error;}
 assets.sort((a,b)=>a.url.localeCompare(b.url));
 return {core:assets.filter(a=>isCoreAsset(a.url)),optional:assets.filter(a=>!isCoreAsset(a.url))};
}

export async function offlineAssets(root){return (await offlineInventory(root)).core;}

export async function writeOfflineWorker(root,buildId,template='sw.js'){
 const {core:assets,optional}=await offlineInventory(root);
 if(assets.reduce((sum,a)=>sum+a.bytes,0)>CORE_OFFLINE_BUDGET)throw Error('Core offline shell exceeds the 8 MiB release budget.');
 for(const required of ['/pose.html','/app-runtime.mjs','/launch-bootstrap.mjs','/launch-runtime.mjs','/local-coach-runtime.mjs','/onboarding.html','/onboarding.mjs','/workout-tracks.js','/pod/gala-weapons.js','/pod/gala-avatar.js','/pod/gala-performer.js','/pod/dj-identity.js']){
  if(!assets.some(asset=>asset.url===required&&asset.bytes>0))throw Error('Missing offline Coach asset: '+required);
 }
 const source=await readFile(template,'utf8');
 if(!source.includes('/* OFFLINE_ASSETS */ []'))throw Error('Offline worker template is missing its asset marker.');
 await writeFile(join(root,'sw.js'),source.replace(/^const SHELL='[^']*'/,`const SHELL='myr5-shell-${buildId}'`).replace('/* OFFLINE_ASSETS */ []',JSON.stringify(assets)).replace('/* OPTIONAL_ASSETS */ []',JSON.stringify(optional)));
 console.log(`Offline Coach: ${assets.length} files, ${(assets.reduce((sum,asset)=>sum+asset.bytes,0)/1048576).toFixed(1)} MiB.`);
 return assets;
}
