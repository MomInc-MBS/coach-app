const SHELL='myr5-shell-auto-updates-v23',VOICE='myr5-voice-approved-v2';
const FILES=["/handborne/assets/fflate.module-BTK1vOXE.js","/handborne/assets/GLTFExporter-CkiDkgTb.js","/handborne/assets/hand-entry-BrVOFL10.js","/handborne/assets/hand-entry-DdX_dztK.css","/handborne/assets/OBJExporter-DThty9Vw.js",'/scoreboard.mjs','/scoreboard-domain.mjs','/scoreboard.css','/movement-setup.mjs','/personal-tracker.mjs','/personal-tracker.css','/pod/mom-inc-mark.png','/app-updates.mjs','/release-info.mjs','/exercise-library.mjs','/movement-rules.mjs','/exercise-demo.mjs','/demo-poses.mjs','/hologram.mjs','/focus-library.css','/hand-companion.mjs','/hand-companion.css','/handborne/companion.mjs','/handborne/index.html','/auth-client.mjs','/auth-paths.mjs','/device-notifications.mjs','/nutrition.mjs','/meal-nutrition.mjs','/reminder-live.mjs','/food-live.css','/icons/myr5-alien-apple.png','/icons/myr5-alien-maskable.png','/office-quick-form.mjs','/office-domain.mjs','/office-form.mjs','/onboarding-domain.mjs','/onboarding-questions.mjs','/coach-profile.mjs','/pose.html','/manifest.webmanifest','/menu.css','/launch.css','/launch.mjs','/launch-shell.mjs','/flip-display.mjs','/flip-display.css','/achievements.mjs','/app.mjs','/coach.mjs','/robot-audio.mjs','/camera.mjs','/menu.mjs','/movement-engine.mjs','/pod/pod.mjs','/pod/pod.css','/pod/set-flow.mjs','/pod/identity.mjs','/pod/encouragement.mjs','/pod/gala-avatar.js','/icons/myr5-alien-192.png','/icons/myr5-alien-512.png'];
FILES.push('/pocket-hardware.css','/reminder-settings.mjs','/reminder-controls.mjs','/meal-scanner.mjs','/food-worker.mjs','/icons/coach-install-qr.png','/pod/hardware.css','/pod/hardware.mjs','/hardware-launch.css','/pod/whiteboard.css','/pod/fonts/hand-0.woff2','/pod/fonts/hand-2.woff2','/pod/fonts/hand-6.woff2');
FILES.push('/pod/retro-rooms.css','/pod/worlds/great-wall.png','/gala-handoff.mjs','/install-context.mjs','/pod/gala-weapons.js','/pod/dj-identity.js','/pod/rest-arena.mjs','/pod/rest-arena.css','/meditation.mjs','/meditation.css','/arcade/tub-flight/engine.mjs','/arcade/tub-flight/game.mjs','/arcade/tub-flight/style.css');
FILES.push('/pod/weapon-evolution.mjs','/pod/weapon-animator.mjs','/pod/weapon-abilities.css');
FILES.push('/update-policy.mjs','/release-build.mjs','/launch-bootstrap.mjs','/launch-runtime.mjs','/app-runtime.mjs');
FILES.push('/weapon-training.mjs','/workout-tracks.js','/weapon-rewards.mjs');
FILES.push('/breathing.mjs','/combat.mjs');
FILES.push('/workout-route.mjs','/workout-route-ui.mjs');
FILES.push('/coach-hub.mjs','/coach-hub.css','/reminder-plan.mjs');
FILES.push('/pod/home-character.mjs','/pod/home-character.css','/pod/gala-performer.js');
self.addEventListener('install',event=>event.waitUntil(caches.open(SHELL).then(cache=>cache.addAll(FILES))));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())if((key.startsWith('myr5-shell-')&&key!==SHELL)||(key.startsWith('myr5-voice-')&&key!==VOICE))await caches.delete(key);await self.clients.claim();})()));
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('message',event=>{
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
self.addEventListener('fetch',event=>{const request=event.request,url=new URL(request.url);if(request.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/')||url.pathname.includes('with-chatgpt')||url.pathname==='/callback'||url.pathname.startsWith('/signin')||url.pathname==='/source.json')return;
 if(url.pathname.startsWith('/voice/')){event.respondWith((async()=>{const cache=await caches.open(VOICE),cached=await cache.match(request);if(cached)return cached;const response=await fetch(request);if(response.ok&&!response.redirected)await cache.put(request,response.clone());return response;})());return;}
 if(request.mode==='navigate'){event.respondWith((async()=>{try{const response=await fetch(request);if(response.ok&&!response.redirected&&url.pathname.startsWith('/handborne'))await(await caches.open(SHELL)).put(request,response.clone());return response;}catch{return (await caches.match(request))||(await caches.match(url.pathname.startsWith('/handborne')?'/handborne/index.html':'/pose.html'));}})());return;}
 if(/\.(mjs|js|css|png|glb|woff2|webmanifest)$/.test(url.pathname)){event.respondWith((async()=>{const cached=await caches.match(request);if(cached)return cached;const response=await fetch(request);if(response.ok&&!response.redirected){const size=Number(response.headers.get('content-length'));if(size>0&&size<8*1024*1024)await(await caches.open(SHELL)).put(request,response.clone());}return response;})());}
});
self.addEventListener('push',event=>{let data={title:'MYR5 Coach',body:'Your coach has a reminder.',url:'/pose.html'};try{data={...data,...event.data.json()};}catch{}event.waitUntil(self.registration.showNotification(String(data.title).slice(0,80),{body:String(data.body).slice(0,200),icon:'/icons/myr5-alien-192.png',badge:'/icons/myr5-alien-192.png',tag:data.tag||'myr5-reminder',data:{url:data.url,kind:data.kind},...(data.kind==='app-update'?{actions:[{action:'download',title:'Download update'}]}:{}),renotify:false}));});
self.addEventListener('notificationclick',event=>{event.notification.close();event.waitUntil((async()=>{let url;try{url=new URL(event.notification.data?.url||'/pose.html',self.location.origin);}catch{return;}if(url.origin!==self.location.origin)return;const all=await self.clients.matchAll({type:'window',includeUncontrolled:true});for(const client of all)if(new URL(client.url).origin===url.origin){if(event.notification.data?.kind==='app-update'&&new URL(client.url).pathname==='/pose.html'){await client.focus();client.postMessage({type:'APP_UPDATE_AVAILABLE'});return;}await client.navigate(url.href);return client.focus();}return self.clients.openWindow(url.href);})());});
