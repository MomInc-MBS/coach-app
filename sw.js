const SHELL='myr5-shell-22d1026e5a1d6f2441dd',VOICE='myr5-voice-approved-v2';
// Filled from the complete production asset inventory, with content identities.
const ASSETS=/* OFFLINE_ASSETS */ [];
const INDEX='/__myr5_offline_assets__';
const ASSET_BY_URL=new Map(ASSETS.map(asset=>[asset.url,asset]));
const downloadProgress={type:'OFFLINE_PROGRESS',files:0,totalFiles:ASSETS.length,bytes:0,totalBytes:ASSETS.reduce((n,a)=>n+a.bytes,0)};
async function reportDownload(){
 for(const client of await self.clients.matchAll?.({type:'window',includeUncontrolled:true})||[])try{client.postMessage(downloadProgress);}catch{}
}

function assetPath(path){
 if(path==='/'||path==='/index.html'||path==='/index')return '/pose.html';
 if(ASSET_BY_URL.has(path))return path;
 const html=path.endsWith('/')?path+'index.html':path+'.html';
 if(ASSET_BY_URL.has(html))return html;
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
 const response=await fetch(new Request(new URL(asset.url,self.location.origin),{cache:'reload',integrity:asset.integrity}));
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
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())if((key.startsWith('myr5-shell-')&&key!==SHELL)||(key.startsWith('myr5-voice-')&&key!==VOICE))await caches.delete(key);await self.clients.claim();})()));
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('message',event=>{
 if(event.data?.type==='OFFLINE_STATUS'){event.source?.postMessage(downloadProgress);return;}
 if(event.data?.type!=='PREPARE_UPDATE')return;
 event.waitUntil((async()=>{
  const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  const approvals=await Promise.all(clients.map(client=>new Promise(resolve=>{
   const channel=new MessageChannel();
   const finish=ok=>{clearTimeout(timer);channel.port1.close();resolve(ok);};
   const timer=setTimeout(()=>finish(false),4000);
   channel.port1.onmessage=message=>finish(message.data?.safe===true);
   try{client.postMessage({type:'UPDATE_SAFETY_CHECK'},[channel.port2]);}catch{finish(false);}
  })));
  const activated=approvals.length>0&&approvals.every(Boolean);
  if(activated)await self.skipWaiting();
  event.ports[0]?.postMessage({activated});
 })());
});
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/')||url.pathname.includes('with-chatgpt')||url.pathname==='/callback'||url.pathname.startsWith('/signin')||url.pathname==='/source.json'||url.pathname==='/repair-coach'||url.pathname==='/recover'||url.pathname==='/recover.html')return;
 if(url.pathname.startsWith('/voice/')){
  event.respondWith((async()=>{const cache=await caches.open(VOICE),cached=await cache.match(request);if(cached)return cached;const response=await fetch(request);if(response.ok&&!response.redirected)await cache.put(request,response.clone());return response;})());return;
 }
 // Canonical paths also cover release query strings and customizer directory
 // links. Cached art is returned immediately, without a network revalidation.
 const path=assetPath(url.pathname);
 const asset=ASSET_BY_URL.get(path);
 if(!asset)return;
 event.respondWith((async()=>{
  const cache=await caches.open(SHELL),cached=await cache.match(path);
  if(cached)return offlineResponse(cached);
  const response=await downloadAsset(asset);
  try{await cache.put(path,response.clone());}catch{}
  return response;
 })());
});
self.addEventListener('push',event=>{let data={title:'MYR5 Coach',body:'Your coach has a reminder.',url:'/pose.html'};try{data={...data,...event.data.json()};}catch{}event.waitUntil(self.registration.showNotification(String(data.title).slice(0,80),{body:String(data.body).slice(0,200),icon:'/icons/myr5-alien-192.png',badge:'/icons/myr5-alien-192.png',tag:data.tag||'myr5-reminder',data:{url:data.url,kind:data.kind},...(data.kind==='app-update'?{actions:[{action:'download',title:'Download update'}]}:{}),renotify:false}));});
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
