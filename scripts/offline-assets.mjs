import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {readdir,readFile,writeFile,stat} from 'node:fs/promises';
import {join,posix} from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';

const folders=['pod','creature','models','icons','handborne','arcade','war-room','food','vendor','modules'];
export const CORE_OFFLINE_BUDGET=8*1024*1024;
// D34: core precache holds only what a first run needs (sign-in/onboarding, home, a camera or manual
// workout with its counter, updates/recovery, the offline shell). Core is every root, /icons/ or /pod/
// file that the first-run pages name, directly or through other core files. The scan is conservative:
// any path string counts. Bundled sources that no page requests, and everything else, ship in the
// post-download package (sw.js OPTIONAL_ASSETS): fetched on demand online, offline once downloaded.
const CORE_ENTRIES=['/pose.html','/index.html','/onboarding.html','/signin.html','/install.html','/privacy.html','/manifest.webmanifest',
 // #108 starter ship + wonder: built from a template literal (meditation-backgrounds.mjs, ship-view.mjs),
 // so the closure scan below can never discover them by grepping for a literal path. Listed here instead,
 // so the offline first run (and offline meditation) never falls back to a blank gradient (risk 2).
 '/pod/worlds/starter/supportive.glb','/pod/worlds/starter/colosseum-a.webp','/pod/worlds/starter/great-pyramid-of-giza-a.webp','/pod/worlds/starter/great-wall-of-china-a.webp','/pod/worlds/starter/machu-picchu-a.webp','/pod/worlds/starter/mount-fuji-a.webp','/pod/worlds/starter/taj-mahal-a.webp','/pod/worlds/great-wall.webp'];
// Named by first-run code, but used only by deferrable features that already cope without them:
// food reference search (2.6 MB), rest/meditation backgrounds and Records handwriting fonts (swap).
// The quilt is the starter portal, and the starter ship/wonders/great-wall backdrop, stay in core so
// they remain available after an offline install (#108, risk 2).
const DEFERRED=/^\/(?:nutrition-data\.mjs$|pod\/worlds\/(?!starter\/|great-wall\.webp$|quilt\.webp$)|pod\/fonts\/)/;
const coreFolder=url=>!url.slice(1).includes('/')||url.startsWith('/icons/')||url.startsWith('/modules/portal/')||url==='/vendor/three/three.module.js'||url.startsWith('/pod/worlds/starter/')&&url.endsWith('.glb')||url.startsWith('/pod/')&&!/\.(?:glb|gltf|bin)$/i.test(url);
const reference=/(?:\.{1,2}\/|\/)?[\w@][\w\-./@]*\.(?:html|css|mjs|js|webmanifest|json|png|jpe?g|webp|avif|gif|svg|ico|glb|gltf|bin|woff2?|ttf|otf)\b/g;
const runtime=/\.(?:html|css|mjs|js|webmanifest|json|png|jpe?g|webp|avif|gif|svg|ico|glb|gltf|bin|woff2?|ttf|otf)$/i;
const excluded=new Set(['sw.js','source.json','source.json.gz','package.json','package-lock.json','recover.html','recovery-page.mjs']);

async function identify(root,path){
 const hash=createHash('sha256');
 for await(const chunk of createReadStream(join(root,path)))hash.update(chunk);
 return {url:'/'+path,integrity:'sha256-'+hash.digest('base64'),bytes:(await stat(join(root,path))).size};
}
async function coreClosure(root,urls,template){
 const core=new Set(),queue=[...CORE_ENTRIES];
 try{for(const [ref] of (await readFile(template,'utf8')).matchAll(reference))queue.push(ref);}catch(error){if(error.code!=='ENOENT')throw error;}
 while(queue.length){
  const url=queue.shift();
  if(core.has(url)||!urls.has(url)||!coreFolder(url)||DEFERRED.test(url))continue;
  core.add(url);
  if(/\.(?:html|css|mjs|js|webmanifest|json)$/.test(url))for(const [ref] of (await readFile(join(root,url),'utf8')).matchAll(reference))
   queue.push(ref.startsWith('/')?ref:posix.join(posix.dirname(url),ref),'/'+ref.replace(/^\.\//,''));
 }
 return core;
}
// The voice clips (not core) are listed with their identities inside the voice manifest, whose own
// identity is in the package list; `contains` is the byte total of the clips it names.
export async function identifyVoice(root){
 let manifest;try{manifest=JSON.parse(await readFile(join(root,'voice/manifest.json'),'utf8'));}catch(error){if(error.code==='ENOENT')return;throw error;}
 manifest.files=[];for(const url of new Set(Object.values(manifest.phrases)))manifest.files.push(await identify(root,url.slice(1)));
 await writeFile(join(root,'voice/manifest.json'),JSON.stringify(manifest));
}

// The Downloads menu picks the post-download package by group; every optional file carries one.
// First match wins; whatever is left (regular coach models, customizer, exercise demos, app screens)
// is "Your coach". Roster bodies never join it: each goes to its workout section from
// track-placements.ts (#102), or Starter when it has no placement.
const GROUPS=[
 ['voices',/^\/voice\//],
 ['hand',/^\/handborne\//],
 ['food',/^\/(?:food\/|nutrition-data\.mjs$|food-live\.css$|meal-)/],
 ['meditation',/^\/(?:pod\/worlds\/|meditation|breathing)/],
 ['games',/^\/(?:arcade|war-room)\//],
];
const ROSTER_BODY=/^\/creature\/models\/roster\/[^/]+\.glb$/;
let placements;
export function bodySections(){
 placements??=build({entryPoints:[fileURLToPath(new URL('../creature/source/creator/track-placements.ts',import.meta.url))],bundle:true,write:false,format:'esm',platform:'neutral',logLevel:'silent'})
  .then(({outputFiles:[out]})=>import('data:text/javascript;base64,'+Buffer.from(out.text).toString('base64')))
  .then(({TRACK_PLACEMENTS})=>new Map(TRACK_PLACEMENTS.map(p=>['/'+p.sourceAsset,p.tracks[0]])));
 return placements;
}
export const groupOf=(url,sections)=>ROSTER_BODY.test(url)?'bodies-'+(sections.get(url)??'starter'):GROUPS.find(([,test])=>test.test(url))?.[0]??'coach';

// PackLifecycle bytes are outside both inventories.
export async function offlineInventory(root,template='sw.js'){
 const assets=[];
 async function walk(path){
  for(const entry of await readdir(join(root,path),{withFileTypes:true})){
   if(entry.name.startsWith('.')||entry.name==='source')continue;
   const name=path+'/'+entry.name;
   if(entry.isDirectory())await walk(name);
   else if(entry.isFile()&&runtime.test(entry.name))assets.push(await identify(root,name));
  }
 }
 for(const entry of await readdir(root,{withFileTypes:true}))if(entry.isFile()&&!excluded.has(entry.name)&&runtime.test(entry.name))assets.push(await identify(root,entry.name));
 for(const folder of folders)try{await walk(folder);}catch(error){if(error.code!=='ENOENT')throw error;}
 const core=await coreClosure(root,new Set(assets.map(a=>a.url)),template);
 try{const {files}=JSON.parse(await readFile(join(root,'voice/manifest.json'),'utf8'));if(Array.isArray(files))assets.push({...await identify(root,'voice/manifest.json'),contains:files.reduce((sum,file)=>sum+file.bytes,0)});}catch(error){if(error.code!=='ENOENT')throw error;}
 assets.sort((a,b)=>a.url.localeCompare(b.url));
 const sections=await bodySections();
 return {core:assets.filter(a=>core.has(a.url)),optional:assets.filter(a=>!core.has(a.url)).map(a=>({...a,group:groupOf(a.url,sections)}))};
}

export async function offlineAssets(root){return (await offlineInventory(root)).core;}

export async function writeOfflineWorker(root,buildId,template='sw.js'){
 await identifyVoice(root);
 const {core:assets,optional}=await offlineInventory(root,template);
 if(assets.reduce((sum,a)=>sum+a.bytes,0)>CORE_OFFLINE_BUDGET)throw Error('Core offline shell exceeds the 8 MiB release budget.');
 for(const required of ['/pose.html','/app-runtime.mjs','/launch-bootstrap.mjs','/launch-runtime.mjs','/local-coach-runtime.mjs','/onboarding.html','/onboarding.mjs','/workout-tracks.js','/pod/gala-weapons.js','/pod/gala-avatar.js','/pod/gala-performer.js','/pod/dj-identity.js']){
  if(!assets.some(asset=>asset.url===required&&asset.bytes>0))throw Error('Missing offline Coach asset: '+required);
 }
 const source=await readFile(template,'utf8');
 if(!source.includes('/* OFFLINE_ASSETS */ []'))throw Error('Offline worker template is missing its asset marker.');
 await writeFile(join(root,'sw.js'),source.replace(/^const SHELL='[^']*'/,`const SHELL='myr5-shell-${buildId}'`).replace('/* OFFLINE_ASSETS */ []',JSON.stringify(assets)).replace('/* OPTIONAL_ASSETS */ []',JSON.stringify(optional)));
 const mib=list=>(list.reduce((sum,asset)=>sum+asset.bytes+(asset.contains||0),0)/1048576).toFixed(1);
 const groups=Object.entries(Object.groupBy(optional,a=>a.group)).map(([id,list])=>`${id} ${list.length}/${mib(list)}`).join(', ');
 console.log(`Offline Coach: ${assets.length} files, ${mib(assets)} MiB (${assets.reduce((sum,a)=>sum+a.bytes,0)} of ${CORE_OFFLINE_BUDGET} B). Post-download package: ${optional.length} entries, ${mib(optional)} MiB (groups, files/MiB: ${groups}).`);
 return assets;
}
