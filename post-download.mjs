// D34 post-download package: the rest of MyR5 (every coach and roster model, the customizer, meditation,
// games, backgrounds, food reference, voice) in one download, offered right after the app opens.
// The service worker owns this release's package cache and says what is missing (PACKAGE_PLAN); this
// page fetches those whole files (Sites has no byte ranges), each checked against its build sha256,
// so an interrupted download resumes file by file, across reloads.
const STATE='myr5-full-download',LATER='myr5-full-download-later';
const BUSY=['camera','model','tracking','manual'];
const mb=bytes=>(bytes/1048576).toFixed(bytes<10*1048576?1:0)+' MB';
const read=(store,key)=>{try{return store.getItem(key);}catch{return null;}};
const write=(store,key,value)=>{try{value==null?store.removeItem(key):store.setItem(key,value);}catch{}};
const say=text=>Object.assign(Error(text),{shown:true});

export function mountPostDownload({host}){
 const worker=navigator.serviceWorker;
 if(!worker?.controller||!globalThis.caches||!host)return null;
 const offer=document.createElement('dialog'),bar=document.createElement('section'),settings=document.createElement('section');
 offer.id='fullDownloadOffer';offer.className='full-download-sheet';offer.setAttribute('aria-labelledby','fullDownloadTitle');offer.setAttribute('aria-describedby','fullDownloadText');
 offer.innerHTML='<h2 id="fullDownloadTitle"></h2><p id="fullDownloadText">Every coach, the customizer, meditation, games and voice, ready to use without a connection.</p><p class="hint" data-cellular hidden>You’re on mobile data. Wi‑Fi is best for a download this size.</p><div class="actions"><button type="button" class="main-action" data-download autofocus>Download now</button><button type="button" data-later>Later</button></div>';
 bar.className='full-download-bar';bar.setAttribute('aria-label','Full MyR5 download');bar.hidden=true;
 settings.className='full-download-settings';settings.setAttribute('aria-labelledby','fullDownloadSettingsTitle');
 const status='<p role="status" data-text></p><progress max="1" value="0" aria-label="Full MyR5 download progress"></progress><span data-bytes></span><button type="button" data-toggle></button>';
 bar.innerHTML=status+'<button type="button" data-hide aria-label="Hide download status">Hide</button>';
 settings.innerHTML='<h3 id="fullDownloadSettingsTitle">Full download</h3>'+status;
 host.append(settings);document.body.append(offer,bar);
 // Account-bound, signed optional packets live beside (not inside) the legacy anonymous package.
 // Do not even add their controls to the anonymous page: mount them only after the same-origin
 // account bridge publishes a stable owner, and remove them again as soon as that owner clears.
 let sectionControls=null,sectionEpoch=0,mountedOwner=null;
 const sectionOwner=value=>typeof value?.user?.id==='string'?value.user.id:null;
 const clearSections=()=>{++sectionEpoch;sectionControls?.dispose();sectionControls=null;mountedOwner=null;};
 const mountSections=async account=>{
  const owner=sectionOwner(account),run=++sectionEpoch;if(!owner)return;mountedOwner=owner;
  try{
   const {mountPostDownloadSections}=await import('./modules/materials/post-download-ui.mjs');
   if(run!==sectionEpoch||sectionOwner(window.myr5AuthenticatedAccount)!==owner)return;
   sectionControls=mountPostDownloadSections({host:settings,account:window.myr5AuthenticatedAccount});
   if(!sectionControls)mountedOwner=null;
  }catch(error){if(run===sectionEpoch)mountedOwner=null;console.warn('Extra offline packs unavailable',error);}
 };
 // The section UI receives account updates itself; polling the same owner must not dispose it.
 const sectionsReady=event=>{if(mountedOwner&&sectionOwner(event.detail)===mountedOwner)return;clearSections();void mountSections(event.detail);};
 const sectionsCleared=()=>clearSections();
 window.addEventListener('myr5:account-ready',sectionsReady);window.addEventListener('myr5:account-cleared',sectionsCleared);
 void mountSections(window.myr5AuthenticatedAccount);
 // Findability: Install → Full download → Extra offline packs is three levels deep and easy to
 // miss. Any part of the app (e.g. the ship scene, when its pack isn't installed yet) can send the
 // owner straight there, and optionally point at one section's button.
 window.myr5Packs=Object.freeze({open(sectionId){
  if(!host.open)host.showModal();
  const packs=sectionControls?.panel;
  (packs||settings).scrollIntoView({block:'start',behavior:'smooth'});
  const target=typeof sectionId==='string'&&/^[a-z0-9-]+$/.test(sectionId)?packs?.querySelector(`[data-actions] [data-sections~="${sectionId}"]`):null;
  if(target){target.scrollIntoView({block:'center',behavior:'smooth'});target.focus({preventScroll:true});}
  return !!target;
 }});

 let plan=null,phase='checking',message='',got=0,controller=null,wantOffer=false,doneTimer=0;
 const busy=()=>document.body.dataset.cameraWorkout==='true'||document.body.dataset.tracking==='true'||document.body.dataset.screen==='rest'||BUSY.includes(window.myr5TestState?.phase);
 const idle=()=>!busy()&&!document.hidden&&!document.querySelector('dialog[open]');
 const cellular=()=>navigator.connection?.type==='cellular'||navigator.connection?.saveData===true;
 function paint(){
  const total=plan?.total||0,left=Math.max(0,(plan?.remaining||0)-got),done=total-left;
  offer.querySelector('h2').textContent=`Download the full MyR5 (${mb(left)})`;
  const text=phase==='done'?'Ready offline. The full MyR5 works without a connection.':phase==='downloading'?'Downloading the full MyR5…':phase==='paused'?'Download paused.':phase==='error'?message:phase==='checking'?'Checking this device…':'Every coach, the customizer, meditation, games and voice for offline use.';
  const toggle=phase==='downloading'?'Pause':phase==='paused'||phase==='error'?'Resume':phase==='ready'?`Download the full MyR5 (${mb(left)})`:'';
  for(const box of [bar,settings]){
   const active=['downloading','paused','error'].includes(phase)&&total>0;
   box.querySelector('[data-text]').textContent=text;box.querySelector('progress').value=total?done/total:0;box.querySelector('progress').hidden=!active;
   box.querySelector('[data-bytes]').textContent=active?`${mb(done)} of ${mb(total)}`:'';
   const button=box.querySelector('[data-toggle]');button.hidden=!toggle;button.textContent=toggle;
  }
 }
 function ask(adopt=false){
  return new Promise((resolve,reject)=>{
   const channel=new MessageChannel(),timer=setTimeout(()=>reject(say('Coach is busy. Try again.')),60000);
   channel.port1.onmessage=({data})=>{clearTimeout(timer);data?.error?reject(say('Could not check the download. Try again.')):resolve(data);};
   if(!worker.controller){clearTimeout(timer);reject(say('Reload MyR5 to continue the download.'));return;}
   worker.controller.postMessage({type:'PACKAGE_PLAN',adopt},[channel.port2]);
  });
 }
 async function save(asset,signal){
  const cache=await caches.open(asset.cache||plan.cache);
  for(let attempt=1;;attempt++){
   try{
    // HTML may be rewritten in transit by edge security products; the worker allows that too.
    const response=await fetch(asset.url,{cache:'no-cache',headers:{'x-myr5-package':'1'},signal,...(asset.url.endsWith('.html')?{}:{integrity:asset.integrity})});
    if(!response.ok)throw Error('HTTP '+response.status);
    await cache.put(asset.key||asset.url,response);return;
   }catch(error){
    if(signal.aborted||error.name==='QuotaExceededError'||attempt===3)throw error;
    await new Promise(resolve=>setTimeout(resolve,1500*attempt));
   }
  }
 }
 async function start(){
  if(controller||phase==='done')return;
  controller=new AbortController();const {signal}=controller;
  write(localStorage,STATE,'on');write(sessionStorage,LATER,null);phase='downloading';message='';bar.hidden=false;paint();
  navigator.storage?.persist?.().catch(()=>{});
  try{
   // Pass 1 saves the package and the voice manifest; pass 2 the voice clips that manifest names.
   for(let pass=0;;pass++){
    plan=await ask(true);got=0;paint();
    if(!plan.missing.length)break;
    if(pass===3)throw say('Download stopped. It continues where it left off.');
    const {quota=0,usage=0}=await navigator.storage?.estimate?.().catch(()=>({}))||{};
    if(quota&&quota-usage<plan.remaining)throw say(`Not enough free space. MyR5 needs ${mb(plan.remaining)}.`);
    for(const asset of plan.missing){await save(asset,signal);got+=asset.bytes;paint();}
   }
   phase='done';bar.hidden=false;clearTimeout(doneTimer);doneTimer=0;
  }catch(error){
   if(signal.aborted){phase='paused';write(localStorage,STATE,'paused');write(sessionStorage,LATER,'1');}
   else{phase='error';message=error.shown?error.message:error.name==='QuotaExceededError'?'Not enough free space. Free some up, then resume.':'Download stopped. Check your connection; it continues where it left off.';}
  // Keep saved bytes against this plan until the next worker plan replaces both plan and got.
  }finally{controller=null;paint();}
 }
 function openOffer(){
  if(!plan?.remaining||controller||offer.open)return;
  offer.querySelector('[data-cellular]').hidden=!cellular();offer.returnValue='';paint();offer.showModal();
 }
 offer.querySelector('[data-download]').onclick=()=>{offer.close('download');void start();};
 offer.querySelector('[data-later]').onclick=()=>offer.close('later');
 // Later (or Esc) snoozes until the next time the app opens; Settings always offers it.
 offer.addEventListener('close',()=>{if(offer.returnValue==='busy')wantOffer=true;else if(offer.returnValue!=='download')write(sessionStorage,LATER,'1');});
 for(const box of [bar,settings])box.querySelector('[data-toggle]').onclick=()=>controller?controller.abort():void start();
 bar.querySelector('[data-hide]').onclick=()=>{bar.hidden=true;};
 // Nothing appears over a workout or camera-only mode; the offer waits until the app is idle.
 const ticker=setInterval(()=>{
  if(offer.open&&busy())offer.close('busy');
  if(wantOffer&&idle()&&navigator.onLine){wantOffer=false;openOffer();}
  if(phase==='done'&&!bar.hidden&&!doneTimer&&idle())doneTimer=setTimeout(()=>{bar.hidden=true;},6000);
 },1000);
 window.addEventListener('online',()=>{if(read(localStorage,STATE)==='on'&&['ready','error'].includes(phase)&&!cellular())void start();});
 window.addEventListener('pagehide',event=>{if(!event.persisted){clearInterval(ticker);window.removeEventListener('myr5:account-ready',sectionsReady);window.removeEventListener('myr5:account-cleared',sectionsCleared);clearSections();}});
 (async()=>{
  try{plan=await ask();}catch(error){phase='error';message=error.message;paint();return;}
  phase=plan.remaining?'ready':'done';paint();
  if(!plan.remaining)return;
  const state=read(localStorage,STATE);
  // The earlier tap was the consent: resume after a reload, or fetch an update's changed files,
  // but never silently on mobile data.
  if(state==='on'&&navigator.onLine&&!cellular())return void start();
  if(state==='paused'&&read(sessionStorage,LATER)){phase='paused';bar.hidden=false;paint();return;}
  if(!read(sessionStorage,LATER))wantOffer=true;
 })();
}
