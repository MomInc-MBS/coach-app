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
const CORE_ENTRIES=['/pose.html','/index.html','/onboarding.html','/signin.html','/install.html','/privacy.html','/manifest.webmanifest'];
// W2-2O (#136): the portal experience's heavy art is ONE optional "Starter" download, never core: the quilt
// texture, the pyramid model, the starter ship + six wonders, the still-room backdrop and the achievements
// art (everything in pod/worlds/). Their small code (modules/portal, the ship view, the pyramid scanner,
// the GLTF loader) stays core, so each scene opens offline and shows its own placeholder.
// R9-OFFLINE: the pinned pose tracker (vendor/mediapipe, scripts/mediapipe.mjs) is Starter too, so camera workouts run offline.
export const STARTER=/^\/(?:pod\/worlds\/|food\/pyramid-scanner\.glb$|vendor\/mediapipe\/)/;
export const BOARDS=/^\/pod\/worlds\/boards\//;
const TUNNELS=/^\/modules\/portal\/portal-tunnel-(?:ice|grass|cogs|jelly|wood)\.mjs$/;
export const SCOREBOARD_ROOM=/^\/(?:pod\/rooms\/classroom-(?:wall|desks)\.glb|modules\/rooms\/classroom\.(?:mjs|css))$/;
export const REMINDERS_ROOM=/^\/(?:pod\/rooms\/console\.webp|modules\/rooms\/reminders-computer\.css)$/;
// W4-4E (D47): the customizer cage and the Draco decoder only it needs. Never core; the customizer stays 2D without it.
export const CAGE_ROOM=/^\/pod\/rooms\/cage\//;
// Each grimoire's art: its GLB board (cogs: its folder), its flat poster (portal.mjs's base layer) and its tunnel effect.
const GRIMOIRE_ART={ice:'ice\\.glb',grass:'(?:grass|flower)\\.glb',cogs:'cogs/.+',jelly:'jelly\\.glb',wood:'wood\\.glb'};
const GRIMOIRE_GROUPS=Object.entries(GRIMOIRE_ART).map(([id,art])=>['grimoire-'+id,new RegExp(`^/(?:pod/worlds/boards/(?:${art}|${id}-poster\\.webp)|modules/portal/portal-tunnel-${id}\\.mjs)$`)]);
// Named by first-run code, but used only by deferrable features that already cope without them:
// food reference search (2.6 MB) and Records handwriting fonts (swap).
const DEFERRED=/^\/(?:nutrition-data\.mjs$|pod\/fonts\/)/;
const coreFolder=url=>!url.slice(1).includes('/')||/^\/(?:icons|modules\/portal|modules\/ships|food|vendor\/three)\//.test(url)||url.startsWith('/pod/')&&!/\.(?:glb|gltf|bin)$/i.test(url);
const reference=/(?:\.{1,2}\/|\/)?[\w@][\w\-./@]*\.(?:html|css|mjs|js|webmanifest|json|png|jpe?g|webp|avif|gif|svg|ico|glb|gltf|bin|woff2?|ttf|otf)\b/g;
const runtime=/\.(?:html|css|mjs|js|webmanifest|json|png|jpe?g|webp|avif|gif|svg|ico|glb|gltf|bin|wasm|task|woff2?|ttf|otf)$/i;
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
 if(core.has(url)||!urls.has(url)||!coreFolder(url)||DEFERRED.test(url)||STARTER.test(url)||BOARDS.test(url)||TUNNELS.test(url)||SCOREBOARD_ROOM.test(url)||REMINDERS_ROOM.test(url)||CAGE_ROOM.test(url))continue;
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

// The group manifest: the Downloads menu picks the post-download package by group; every optional file
// carries one. First match wins; whatever is left (regular coach models, customizer, exercise demos, app
// screens) is "Your coach". Roster bodies never join it: each goes to its workout section from
// track-placements.ts (#102), or the bodies' Starter section when it has no placement.
// "starter" (W2-2O) is the portal experience's art, offered first on the first open. Site size rule: the
// Each grimoire device downloads its own board art and tunnel effect together. Quilt stays Starter.
const GROUPS=[
 ...GRIMOIRE_GROUPS,
 ['room-scoreboard',SCOREBOARD_ROOM],
 ['room-reminders',REMINDERS_ROOM],
 ['room-cage',CAGE_ROOM],
 ['starter',STARTER],
 ['voices',/^\/voice\//],
 ['hand',/^\/handborne\//],
 // The meshopt decoder is the pyramid's alone (release 5): core here through the pyramid scanner (W2-2O keeps the scenes'
 // code core), and with Food should it ever leave core. GLTFLoader is shared (hologram, ships, pyramid): core (coreFolder).
 ['food',/^\/(?:food\/|vendor\/three\/meshopt_decoder\.module\.js$|nutrition-data\.mjs$|food-live\.css$|meal-)/],
 ['meditation',/^\/(?:meditation|breathing)/],
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
   // ponytail: the no-SIMD tracker (Safari before 16.4) is served online only, never downloaded; add it to Starter if those phones matter.
   else if(entry.isFile()&&runtime.test(entry.name)&&!entry.name.includes('nosimd'))assets.push(await identify(root,name));
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
