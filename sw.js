const SHELL='myr5-shell-22d1026e5a1d6f2441dd',VOICE='myr5-voice-approved-v2';
// Filled from the complete production asset inventory, with content identities.
const ASSETS=/* OFFLINE_ASSETS */ [];
// D34 post-download package: every other deployed runtime file. Fetched on demand into a small LRU
// until the user downloads the whole package into this release's own package cache.
const OPTIONAL_ASSETS=/* OPTIONAL_ASSETS */ [];
const BUILD=SHELL.slice('myr5-shell-'.length);
const OPTIONAL='myr5-optional-'+BUILD,OPTIONAL_LIMIT=64*1024*1024;
const PACKAGE='myr5-package-'+BUILD,PACKAGE_INDEX='/__myr5_package__';
const OPTIONAL_BY_URL=new Map(OPTIONAL_ASSETS.map(asset=>[asset.url,asset]));
let optionalWrite=Promise.resolve();
async function saveOptional(asset,response){
 if(asset.bytes>OPTIONAL_LIMIT)return;
 const copy=response.clone();
 const write=optionalWrite.then(async()=>{
  const cache=await caches.open(OPTIONAL),keys=await cache.keys();
  let used=keys.reduce((sum,key)=>sum+(OPTIONAL_BY_URL.get(new URL(key.url).pathname)?.bytes??0),0);
  if(await cache.match(asset.url))return;
  for(const key of keys){if(used+asset.bytes<=OPTIONAL_LIMIT)break;used-=OPTIONAL_BY_URL.get(new URL(key.url).pathname)?.bytes??0;await cache.delete(key);}
  await cache.put(asset.url,copy);
 });
 optionalWrite=write.catch(()=>{});return optionalWrite;
}
const INDEX='/__myr5_offline_assets__';
// Every shell and package cache records what it holds (url and integrity). A file is reused across
// releases only when its integrity is unchanged, so a package is never half old and half new.
const indexes=new Map();
function cacheIndex(name){
 if(!indexes.has(name))indexes.set(name,caches.open(name).then(cache=>cache.match(name.startsWith('myr5-shell-')?INDEX:PACKAGE_INDEX)).then(saved=>saved.json()).then(list=>new Map(list.map(asset=>[asset.url,asset.integrity])),()=>new Map()));
 return indexes.get(name);
}
async function localCopy(asset,lru=true){
 for(const name of await caches.keys())if(name!==PACKAGE&&/^myr5-(?:shell|package)-/.test(name)&&(await cacheIndex(name)).get(asset.url)===asset.integrity){
  const hit=await caches.match(asset.url,{cacheName:name});if(hit)return {name,hit};
 }
 const hit=lru&&await caches.match(asset.url,{cacheName:OPTIONAL});return hit&&{name:OPTIONAL,hit};
}
const sri=async body=>'sha256-'+btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.digest('SHA-256',body))));
// What this release's package still needs from the network. Unchanged files already on the device
// (older package, older shell) are moved in first; the on-demand LRU (64 MiB, kept for people who
// never asked for the package) is adopted only once the user has chosen to download.
async function packagePlan(adopt){
 const cache=await caches.open(PACKAGE);
 if(!await cache.match(PACKAGE_INDEX))await cache.put(PACKAGE_INDEX,new Response(JSON.stringify(OPTIONAL_ASSETS),{headers:{'Content-Type':'application/json'}}));
 const have=new Set((await cache.keys()).map(key=>new URL(key.url).pathname)),missing=[];let total=0;
 for(const asset of OPTIONAL_ASSETS){
  total+=asset.bytes+(asset.contains||0);
  if(asset.contains!==undefined){missing.push(...await voiceMissing(asset));continue;}
  if(have.has(asset.url))continue;
  const copy=await localCopy(asset,adopt);
  if(!copy){missing.push(asset);continue;}
  await cache.put(asset.url,copy.hit);
  if(!copy.name.startsWith('myr5-shell-'))await(await caches.open(copy.name)).delete(asset.url);
 }
 if(!missing.length)for(const name of await caches.keys())if(name!==PACKAGE&&/^myr5-(?:package|optional)-/.test(name))await caches.delete(name);
 return {type:'PACKAGE_PLAN',cache:PACKAGE,total,missing,remaining:missing.reduce((sum,asset)=>sum+asset.bytes+(asset.contains||0),0)};
}
// Voice clips live in the update-stable voice cache. Their identities come from this release's
// verified voice manifest; until that is saved, the manifest itself is what is missing.
async function voiceMissing(entry){
 const voice=await caches.open(VOICE),key=entry.url+'?v='+BUILD,saved=await voice.match(key);
 let files;try{const body=await saved.arrayBuffer();if(await sri(body)===entry.integrity)files=JSON.parse(new TextDecoder().decode(body)).files;}catch{}
 if(!Array.isArray(files))return [{...entry,cache:VOICE,key}];
 const have=new Set((await voice.keys()).map(request=>request.url));
 return files.filter(file=>!have.has(new URL(file.url,self.location.origin).href)).map(file=>({...file,cache:VOICE}));
}
let planning=Promise.resolve();
const ASSET_BY_URL=new Map(ASSETS.map(asset=>[asset.url,asset]));
const downloadProgress={type:'OFFLINE_PROGRESS',files:0,totalFiles:ASSETS.length,bytes:0,totalBytes:ASSETS.reduce((n,a)=>n+a.bytes,0)};
async function reportDownload(){
 for(const client of await self.clients.matchAll?.({type:'window',includeUncontrolled:true})||[])try{client.postMessage(downloadProgress);}catch{}
}

function assetPath(path){
 if(path==='/'||path==='/index.html'||path==='/index')return '/pose.html';
 if(ASSET_BY_URL.has(path)||OPTIONAL_BY_URL.has(path))return path;
 const html=path.endsWith('/')?path+'index.html':path+'.html';
 if(ASSET_BY_URL.has(html)||OPTIONAL_BY_URL.has(html))return html;
 return path+'/index.html';
}
function offlineResponse(response){
 // Sites serves /pose.html through its clean /pose URL. A fetched response
 // retains redirected=true even after CacheStorage saves it. Chrome rejects
 // that response for a navigation whose redirect mode is manual (ERR_FAILED).
 // Keep the verified bytes, but give the offline page its own response.
 const headers=new Headers(response.headers);
 headers.delete('content-encoding');headers.delete('content-length');
 return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}
async function downloadAsset(asset){
 // Edge security products can rewrite HTML in transit. Keep integrity strict for
 // executable and binary assets, but allow those harmless HTML transformations.
 const html=new URL(asset.url,self.location.origin).pathname.endsWith('.html');
 const response=await fetch(new Request(new URL(asset.url,self.location.origin),{cache:'reload',...(html?{}:{integrity:asset.integrity})}));
 const destination=response.url?new URL(response.url):null;
 const redirectedElsewhere=response.redirected&&(!destination||destination.origin!==self.location.origin||assetPath(destination.pathname)!==assetPath(asset.url));
 if(!response.ok||redirectedElsewhere)throw Error('Could not save Coach asset: '+asset.url);
 return offlineResponse(response);
}
async function installAssets(){
 if(!ASSETS.length)throw Error('Build Coach before installing its offline assets.');
 const cache=await caches.open(SHELL),previous=[];
 for(const name of (await caches.keys()).reverse()){
  if(!name.startsWith('myr5-shell-')||name===SHELL)continue;
  const old=await caches.open(name),saved=await old.match(INDEX);
  if(saved)try{previous.push({cache:old,files:new Map((await saved.json()).map(asset=>[asset.url,asset.integrity]))});}catch{}
 }
 let next=0,failed=false;
 const results=await Promise.allSettled(Array.from({length:4},async()=>{
  while(!failed&&next<ASSETS.length){
   const asset=ASSETS[next++];
   try{
    let response;
    for(const old of previous)if(old.files.get(asset.url)===asset.integrity){response=await old.cache.match(asset.url);if(response?.ok)break;response=null;}
    await cache.put(asset.url,response?offlineResponse(response):await downloadAsset(asset));
    downloadProgress.files++;downloadProgress.bytes+=asset.bytes;await reportDownload();
   }catch(error){failed=true;throw error;}
  }
 }));
 const failure=results.find(result=>result.status==='rejected');
 try{
  if(failure)throw failure.reason;
  await cache.put(INDEX,new Response(JSON.stringify(ASSETS),{headers:{'Content-Type':'application/json'}}));
 }catch(error){await caches.delete(SHELL);throw error;}
}
self.addEventListener('install',event=>event.waitUntil(installAssets()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 const names=await caches.keys();let previous=null;
 for(const name of [...names].reverse())if(name.startsWith('myr5-shell-')&&name!==SHELL&&await(await caches.open(name)).match(INDEX)){previous=name;break;}
 for(const name of names){
  if(name.startsWith('myr5-shell-')&&name!==SHELL&&name!==previous)await caches.delete(name);
  if(name.startsWith('myr5-optional-')&&name!==OPTIONAL&&name!=='myr5-optional-'+previous?.slice('myr5-shell-'.length))await caches.delete(name);
 }
 // Keep the newest older package until this release's package is complete (its files move over).
 for(const name of names.filter(name=>name.startsWith('myr5-package-')&&name!==PACKAGE).slice(0,-1))await caches.delete(name);
 const voice=await caches.open(VOICE);
 for(const key of await voice.keys()){const url=new URL(key.url);if(url.pathname==='/voice/manifest.json'&&url.searchParams.get('v')!==BUILD)await voice.delete(key);}
 await self.clients.claim();
})()));
let updateAttempt=null;
function updateReply(client,type,id){return new Promise(resolve=>{
 const channel=new MessageChannel();let done=false;
 const finish=value=>{if(done)return;done=true;clearTimeout(timer);channel.port1.close();resolve(value?.safe===true&&value.protocol===2&&value.id===id);};
 const timer=setTimeout(()=>finish(null),4000);
 channel.port1.onmessage=event=>finish(event.data);
 try{client.postMessage({type,id},[channel.port2]);}catch{finish(null);}
});}
async function prepareUpdate(source){
 const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});
 if(!source?.id||!clients.some(client=>client.id===source.id))return {activated:false,reason:'busy'};
 const id=crypto.randomUUID();let activated=false;
 try{
  if(!(await Promise.all(clients.map(client=>updateReply(client,'UPDATE_SAFETY_CHECK',id)))).every(Boolean))return {activated:false,reason:'busy'};
  if(!(await Promise.all(clients.map(client=>updateReply(client,'UPDATE_CONFIRM',id)))).every(Boolean))return {activated:false,reason:'busy'};
  // New or navigated windows must take part in their own fresh preparation.
  const current=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  if(current.length!==clients.length||current.some(client=>!clients.some(old=>old.id===client.id&&old.url===client.url)))return {activated:false,reason:'busy'};
  await self.skipWaiting();activated=true;return {activated:true};
 }finally{if(!activated)for(const client of clients)try{client.postMessage({type:'UPDATE_ABORT',id});}catch{}}
}
self.addEventListener('message',event=>{
 if(event.data?.type==='OFFLINE_STATUS'){event.source?.postMessage(downloadProgress);return;}
 if(event.data?.type==='PACKAGE_PLAN'){
  const plan=planning.then(()=>packagePlan(event.data.adopt===true));planning=plan.catch(()=>{});
  event.waitUntil(plan.then(value=>event.ports[0]?.postMessage(value),()=>event.ports[0]?.postMessage({type:'PACKAGE_PLAN',error:true})));return;
 }
 if(event.data?.type!=='PREPARE_UPDATE')return;
 if(updateAttempt){event.ports[0]?.postMessage({activated:false,reason:'busy'});return;}
 updateAttempt=prepareUpdate(event.source).catch(()=>({activated:false,reason:'busy'}));
 event.waitUntil(updateAttempt.then(result=>event.ports[0]?.postMessage(result)).finally(()=>{updateAttempt=null;}));
});
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/')||url.pathname.includes('with-chatgpt')||url.pathname==='/callback'||url.pathname.startsWith('/signin')||url.pathname.startsWith('/source.json')||url.pathname==='/repair-coach'||url.pathname==='/recover'||url.pathname==='/recover.html'||request.headers.has('x-myr5-package'))return;
 if(url.pathname.startsWith('/voice/')){
  event.respondWith((async()=>{const cache=await caches.open(VOICE),cached=await cache.match(request);if(cached)return cached;const response=await fetch(request);if(response.ok&&!response.redirected)await cache.put(request,response.clone());return response;})());return;
 }
 // Canonical paths also cover release query strings and customizer directory
 // links. Cached art is returned immediately, without a network revalidation.
 const path=assetPath(url.pathname);
 const asset=ASSET_BY_URL.get(path)||OPTIONAL_BY_URL.get(path);
 if(!asset)return;
 const optional=OPTIONAL_BY_URL.has(path);
 event.respondWith((async()=>{
  // Opening a cache creates it, so the package cache is only read by name here.
  const cached=optional?await caches.match(path,{cacheName:PACKAGE})||(await localCopy(asset))?.hit:await(await caches.open(SHELL)).match(path);
  if(cached)return offlineResponse(cached);
  let response;
  try{response=await downloadAsset(asset);}catch{
   // Never mix an unverified new executable into an older installed shell.
   return new Response('This resource is unavailable. Reconnect or update Coach.',{status:503});
  }
  if(optional)event.waitUntil(saveOptional(asset,response));else try{await(await caches.open(SHELL)).put(path,response.clone());}catch{}
  return response;
 })());
});
self.addEventListener('push',event=>{
 let data={title:'MYR5 Coach',body:'Your coach has a reminder.',url:'/pose.html'};try{data={...data,...event.data.json()};}catch{}
 event.waitUntil((async()=>{
  // D23: an Armie letter push is never shown during camera-only mode or
  // mid-set. The busy window holds it and shows it when the set ends
  // (armie-letters-client.mjs); the letter itself already lives in the inbox.
  if(data.kind==='myr5-armie-letter'){
   for(const client of await self.clients.matchAll({type:'window',includeUncontrolled:true}))
    if(await clientAnswers(client,'ARMIE_NOTIFY_CHECK',reply=>reply?.blocked===true)){client.postMessage({type:'ARMIE_LETTER_HELD',letter:data});return;}
  }
  return self.registration.showNotification(String(data.title).slice(0,80),{body:String(data.body).slice(0,200),icon:'/icons/myr5-alien-192.png',badge:'/icons/myr5-alien-192.png',tag:data.tag||'myr5-reminder',data:{url:data.url,kind:data.kind},...(data.kind==='app-update'?{actions:[{action:'download',title:'Download update'}]}:{}),renotify:false});
 })());
});
function clientAnswers(client,type,accept){
 return new Promise(resolve=>{
  const channel=new MessageChannel();
  const finish=handled=>{clearTimeout(timer);channel.port1.close();resolve(handled);};
  const timer=setTimeout(()=>finish(false),1000);
  channel.port1.onmessage=event=>finish(accept(event.data));
  try{client.postMessage({type},[channel.port2]);}catch{finish(false);}
 });
}
async function offerUpdate(client){
 if(await clientAnswers(client,'APP_UPDATE_AVAILABLE',data=>data?.handled===true))return true;
 // Older working pages do not acknowledge APP_UPDATE_AVAILABLE. Their safety
 // reply still proves they are alive, including a busy workout answering false.
 return clientAnswers(client,'UPDATE_SAFETY_CHECK',data=>typeof data?.safe==='boolean');
}
self.addEventListener('notificationclick',event=>{event.notification.close();event.waitUntil((async()=>{
 let url;try{url=new URL(event.notification.data?.url||'/pose.html',self.location.origin);}catch{return;}
 if(url.origin!==self.location.origin)return;
 const update=event.notification.data?.kind==='app-update',all=await self.clients.matchAll({type:'window',includeUncontrolled:true});
 if(update){
  // An old or failed page can accept postMessage without displaying anything.
  // Open independent recovery if it cannot acknowledge the update. Leave the
  // existing window and any unsaved workout or form intact.
  for(const client of all)if(new URL(client.url).origin===url.origin&&['/pose.html','/pose','/'].includes(new URL(client.url).pathname)){
   await client.focus();if(await offerUpdate(client))return;
  }
  return self.clients.openWindow(new URL('/repair-coach',self.location.origin).href);
 }
 for(const client of all)if(new URL(client.url).origin===url.origin){await client.navigate(url.href);return client.focus();}
 return self.clients.openWindow(url.href);
})());});
