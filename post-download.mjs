// D34 post-download package, picked in a Downloads menu. scripts/offline-assets.mjs tags every package
// file with a group; the service worker owns this release's package cache and, for the groups this
// device chose, says what is still missing and how big each group is (PACKAGE_PLAN). This page fetches
// those whole files (Sites has no byte ranges), each checked against its build sha256, so an interrupted
// download resumes file by file, across reloads. The menu is its own full-screen page, shown once after
// the first open and never over the quilt portal (the portal waits, hidden, until it closes); Settings
// and Install reopen it (window.myr5Packs.open). Nothing is forced: the app works with just the core.
import {ROWS,TRACKS,LEVELS_PER_BOSS} from './battle-pass-rewards.mjs';

const STATE='myr5-full-download',CHOSEN='myr5-download-groups',SEEN='myr5-downloads-seen';
const BUSY=['camera','model','tracking','manual'];
const mb=bytes=>bytes>0&&bytes<104858?'<0.1 MB':(bytes/1048576).toFixed(bytes<10*1048576?1:0)+' MB';
const read=(store,key)=>{try{return store.getItem(key);}catch{return null;}};
const write=(store,key,value)=>{try{value==null?store.removeItem(key):store.setItem(key,value);}catch{}};
const say=text=>Object.assign(Error(text),{shown:true});
// Group ids come from scripts/offline-assets.mjs; a row shows only when this build has that group.
const GROUPS=[
 ['coach','Your coach','The regular coach models, the customizer and exercise demos.'],
 ['bodies','Extra coach bodies','More body shapes for the customizer, by workout section. A body you pick also downloads by itself.'],
 ['hand','Helping Hand','Your hand companion and all its looks.'],
 ['voices','Voices','Your coach’s spoken lines.'],
 ['food','Food scanner','The food scanner model and the food list.'],
 ['meditation','Meditation & backgrounds','Meditation, rest and board backgrounds.'],
 ['games','Games & War Room','Arcade games and the War Room.'],
];
// Body sections follow the board rows (#102): a section's bodies unlock when every boss in its row
// is beaten. Mirrors track-placements.ts sectionComplete(), which can't be imported here (its catalog
// pulls three.js into the launch bundle).
const SECTIONS=[{id:'bodies-starter',name:'Starter',row:null},...ROWS.filter(row=>row.track).map(row=>({id:'bodies-'+TRACKS[row.track].catalog,name:TRACKS[row.track].name,row}))];
const sectionLocked=(row,progress)=>!!row&&!Array.from({length:row.bosses},(_,i)=>progress[`${row.id}-${i+1}`]??0).every(levels=>levels>=LEVELS_PER_BOSS);
const row=(id,title,text,extra='')=>`<label class="download-row"><input type="checkbox" ${id.startsWith('*')?`data-all="${id.slice(1)}"`:`data-group="${id}"`}><span><strong>${title}</strong>${extra}<small>${text}</small></span><b data-size></b></label>`;

export function mountPostDownload({host}){
 const worker=navigator.serviceWorker;
 if(!worker||!globalThis.caches||!host)return null;
 const menu=document.createElement('dialog'),bar=document.createElement('section'),settings=document.createElement('section'),note=document.createElement('p');
 menu.id='downloadsMenu';menu.className='downloads-menu';menu.setAttribute('aria-labelledby','downloadsTitle');menu.setAttribute('aria-describedby','downloadsText');
 const status='<p role="status" data-text></p><progress max="1" value="0" aria-label="Download progress"></progress><span data-bytes></span><button type="button" data-toggle></button>';
 menu.innerHTML='<div class="downloads-page"><h2 id="downloadsTitle">Downloads</h2><p id="downloadsText">MyR5 already works. Pick what else to keep on this phone for offline use. You can change this any time in Settings.</p><p class="hint" data-cellular hidden>You’re on mobile data. Wi‑Fi is best for big downloads.</p><fieldset data-groups><legend>What to download</legend></fieldset><section data-packs></section></div>'
  +'<footer class="downloads-footer"><div class="downloads-status">'+status+'</div><p data-total></p><div class="actions"><button type="button" class="main-action" data-download>Download selected</button><button type="button" data-later>Not now</button></div></footer>';
 bar.className='full-download-bar';bar.setAttribute('aria-label','MyR5 downloads');bar.hidden=true;
 settings.className='full-download-settings';settings.setAttribute('aria-labelledby','fullDownloadSettingsTitle');
 bar.innerHTML=status+'<button type="button" data-hide aria-label="Hide download status">Hide</button>';
 settings.innerHTML='<h3 id="fullDownloadSettingsTitle">Downloads</h3><button type="button" data-open>Choose downloads</button>'+status;
 note.className='body-download-note';note.setAttribute('role','status');note.hidden=true;
 host.append(settings);document.body.append(menu,bar,note);
 const list=menu.querySelector('[data-groups]'),packsHost=menu.querySelector('[data-packs]'),menuStatus=menu.querySelector('.downloads-status');
 // Settings reaches the same menu (the pod Settings dialog, when this page has one).
 const podSettings=document.getElementById('settings'),entry=document.createElement('div');
 if(podSettings){entry.className='settings-fields downloads-entry';entry.innerHTML='<button type="button" data-open>Downloads</button>';const before=podSettings.querySelector('.settings-actions');before?before.before(entry):podSettings.append(entry);}
 // Account-bound, signed optional packets live beside (not inside) the anonymous package groups.
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
   sectionControls=mountPostDownloadSections({host:packsHost,account:window.myr5AuthenticatedAccount});
   if(!sectionControls)mountedOwner=null;
  }catch(error){if(run===sectionEpoch)mountedOwner=null;console.warn('Extra offline packs unavailable',error);}
 };
 // The section UI receives account updates itself; polling the same owner must not dispose it.
 const sectionsReady=event=>{if(mountedOwner&&sectionOwner(event.detail)===mountedOwner)return;clearSections();void mountSections(event.detail);};
 const sectionsCleared=()=>clearSections();
 window.addEventListener('myr5:account-ready',sectionsReady);window.addEventListener('myr5:account-cleared',sectionsCleared);
 void mountSections(window.myr5AuthenticatedAccount);
 // Any part of the app (e.g. the ship scene, when its pack isn't installed yet) can open the menu,
 // optionally pointing at one signed section's button.
 window.myr5Packs=Object.freeze({open(sectionId){
  openMenu(false);
  const packs=sectionControls?.panel;
  const target=typeof sectionId==='string'&&/^[a-z0-9-]+$/.test(sectionId)?packs?.querySelector(`[data-actions] [data-sections~="${sectionId}"]`):null;
  if(target){target.scrollIntoView({block:'center',behavior:'smooth'});target.focus({preventScroll:true});}
  return !!target;
 }});

 let plan=null,phase='checking',message='',got=0,controller=null,wantMenu=false,autoMenu=false,firstPick=false,restorePortal=false,doneTimer=0,progress=null;
 const busy=()=>document.body.dataset.cameraWorkout==='true'||document.body.dataset.tracking==='true'||document.body.dataset.screen==='rest'||BUSY.includes(window.myr5TestState?.phase);
 const idle=()=>!busy()&&!document.hidden&&!document.querySelector('dialog[open]');
 const cellular=()=>navigator.connection?.type==='cellular'||navigator.connection?.saveData===true;
 // null: the whole package (a download chosen before the menu existed, or Everything).
 function chosen(){try{const list=JSON.parse(read(localStorage,CHOSEN));if(Array.isArray(list))return list;}catch{}return read(localStorage,STATE)?null:[];}
 const boxes=()=>[...list.querySelectorAll('[data-group]')];
 function paint(){
  const total=plan?.total||0,left=Math.max(0,(plan?.remaining||0)-got),done=total-left;
  const text=phase==='done'?(total?'Ready offline. Your downloads work without a connection.':'MyR5 works with what’s on this phone. Choose downloads for more offline.'):phase==='downloading'?'Downloading your picks…':phase==='paused'?'Download paused.':phase==='error'?message:phase==='checking'?'Checking this device…':`${mb(left)} of your picks still to download.`;
  const toggle=phase==='downloading'?'Pause':phase==='paused'||phase==='error'?'Resume':phase==='ready'?`Download ${mb(left)}`:'';
  for(const box of [bar,settings,menuStatus]){
   const active=['downloading','paused','error'].includes(phase)&&total>0;
   box.querySelector('[data-text]').textContent=text;box.querySelector('progress').value=total?done/total:0;box.querySelector('progress').hidden=!active;
   box.querySelector('[data-bytes]').textContent=active?`${mb(done)} of ${mb(total)}`:'';
   const button=box.querySelector('[data-toggle]');button.hidden=!toggle;button.textContent=toggle;
  }
  menuStatus.hidden=!['checking','downloading','paused','error'].includes(phase);
  if(menu.open)sync();
 }
 // The menu: one toggle and size per group; Extra coach bodies splits by workout section.
 function renderMenu(){
  const groups=plan?.groups||{},sizes=id=>groups[id];
  const bodies=SECTIONS.filter(section=>sizes(section.id));
  const current=new Map(boxes().map(box=>[box.dataset.group,box.checked])),expanded=menu.open&&!!list.querySelector('details')?.open;
  list.querySelectorAll('.download-row,.download-bodies').forEach(node=>node.remove());
  for(const [id,title,text] of GROUPS){
   if(id==='bodies'){
    if(!bodies.length)continue;
    const wrap=document.createElement('div');wrap.className='download-bodies';
    wrap.innerHTML=row('*bodies',title,text)+'<details><summary>By workout section</summary>'+bodies.map(section=>row(section.id,section.name,section.row?`${sizes(section.id).files} bodies`:`${sizes(section.id).files} bodies, open to everyone`,'<em data-lock hidden>Locked · preview</em>')).join('')+'</details>';
    wrap.querySelector('details').open=expanded;list.append(wrap);continue;
   }
   if(sizes(id))list.insertAdjacentHTML('beforeend',row(id,title,text,id==='coach'?'<em>Recommended</em>':''));
  }
  if(Object.keys(groups).length>1)list.insertAdjacentHTML('beforeend',row('*everything','Everything','Every group above.'));
  // A re-render while the menu is up (a fresher plan) keeps what the user has toggled so far.
  const picked=chosen(),kept=menu.open?current:null;
  for(const box of boxes()){
   const info=sizes(box.dataset.group),label=box.closest('label');label.dataset.saved=String(!info.remaining);
   box.checked=!info.remaining||(kept?.has(box.dataset.group)?kept.get(box.dataset.group):firstPick?box.dataset.group==='coach':!picked||picked.includes(box.dataset.group));
   label.querySelector('[data-size]').textContent=!info.remaining?'Saved':info.remaining<info.total?`${mb(info.remaining)} left`:mb(info.total);
  }
  paintLocks();sync();
 }
 function paintLocks(){
  if(progress)for(const section of SECTIONS){const badge=list.querySelector(`[data-group="${section.id}"]`)?.closest('label').querySelector('[data-lock]');if(badge)badge.hidden=!sectionLocked(section.row,progress);}
 }
 const saved=box=>box.closest('label').dataset.saved==='true',left=box=>plan?.groups?.[box.dataset.group]?.remaining||0;
 function sync(){
  const all=boxes(),busyNow=!!controller;
  for(const box of all)box.disabled=busyNow||saved(box);
  for(const [name,members] of [['bodies',all.filter(box=>box.dataset.group.startsWith('bodies-'))],['everything',all]]){
   const parent=list.querySelector(`[data-all="${name}"]`);if(!parent)continue;
   const on=members.filter(box=>box.checked).length,size=members.reduce((sum,box)=>sum+left(box),0);
   parent.checked=on===members.length;parent.indeterminate=on>0&&on<members.length;parent.disabled=busyNow||!size;
   parent.closest('label').querySelector('[data-size]').textContent=size?mb(size):'Saved';
  }
  const selected=all.filter(box=>box.checked&&!saved(box)).reduce((sum,box)=>sum+left(box),0);
  menu.querySelector('[data-total]').textContent=busyNow?'':selected?`Selected: ${mb(selected)}`:'Nothing new selected.';
  const download=menu.querySelector('[data-download]');download.disabled=busyNow||!selected;download.hidden=busyNow;
 }
 list.addEventListener('change',event=>{
  const all=event.target.dataset.all;
  if(all)for(const box of boxes())if(!box.disabled&&(all==='everything'||box.dataset.group.startsWith('bodies-')))box.checked=event.target.checked;
  sync();
 });
 const portalUp=()=>!!window.myr5Portal&&!window.myr5Portal.disposed&&document.getElementById('portalHome')?.hidden===false;
 function openMenu(auto){
  if(menu.open)return;
  // Shown once: the first open marks it seen (and picks the recommended group); Settings reopens it.
  autoMenu=auto;firstPick=auto&&(firstPick||!read(localStorage,SEEN)&&!chosen()?.length);menu.returnValue='';if(auto)write(localStorage,SEEN,'1');
  // Its own screen, never a modal over the quilt: the portal steps aside and comes back after.
  restorePortal=portalUp();if(restorePortal)window.myr5Portal.hide();
  menu.querySelector('[data-cellular]').hidden=!cellular();menu.querySelector('[data-later]').textContent=auto?'Not now':'Close';
  renderMenu();paint();menu.showModal();menu.querySelector('.downloads-page').scrollTop=0;
  menu.querySelector(auto&&!menu.querySelector('[data-download]').disabled?'[data-download]':'[data-later]').focus();
  import('./battle-pass.mjs').then(({loadProgress})=>{progress=loadProgress();paintLocks();},()=>{});
  // Sizes change as bodies download on demand; show the worker's current count.
  if(plan&&!controller)ask().then(fresh=>{if(controller)return;plan=fresh;got=0;paint();if(menu.open)renderMenu();},()=>{});
 }
 menu.querySelector('[data-download]').onclick=()=>{
  const all=boxes(),picked=all.filter(box=>box.checked).map(box=>box.dataset.group);
  write(localStorage,CHOSEN,picked.length===all.length?null:JSON.stringify(picked));
  menu.close('download');void start();
 };
 menu.querySelector('[data-later]').onclick=()=>menu.close('later');
 menu.addEventListener('close',()=>{
  if(menu.returnValue==='busy'){wantMenu=autoMenu;restorePortal=false;return;}
  // First open: the quilt waited for this menu (app.mjs skips it while a dialog is open).
  if(restorePortal)window.myr5Portal?.show?.();
  // Not just "not mounted yet": the mount can finish (window.myr5Portal set, still hidden) while this
  // menu was open, since shouldShow() only gets one check, at mount time, and this menu wasn't open
  // yet then. Always route through the shared opener; it no-ops fast when already mounted (#risk 1).
  else if(autoMenu&&window.coachPlan&&!new URLSearchParams(location.search).has('panel')&&!['#pod','#ship'].includes(location.hash))void window.myr5Menus?.portal?.({shouldShow:idle});
  restorePortal=false;autoMenu=false;
 });
 for(const button of [settings,entry].map(node=>node.querySelector('[data-open]')).filter(Boolean))button.onclick=()=>openMenu(false);

 function ask(adopt=false){
  return new Promise((resolve,reject)=>{
   const channel=new MessageChannel(),timer=setTimeout(()=>reject(say('Coach is busy. Try again.')),60000);
   channel.port1.onmessage=({data})=>{clearTimeout(timer);data?.error?reject(say('Could not check the download. Try again.')):resolve(data);};
   if(!worker.controller){clearTimeout(timer);reject(say('Reload MyR5 to continue the download.'));return;}
   worker.controller.postMessage({type:'PACKAGE_PLAN',adopt,groups:chosen()??undefined},[channel.port2]);
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
  if(controller)return;
  controller=new AbortController();const {signal}=controller;
  write(localStorage,STATE,'on');phase='downloading';message='';bar.hidden=false;paint();
  navigator.storage?.persist?.().catch(()=>{});
  try{
   // Pass 1 saves the picked groups and the voice manifest; pass 2 the voice clips that manifest names.
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
   if(signal.aborted){phase='paused';write(localStorage,STATE,'paused');}
   else{phase='error';message=error.shown?error.message:error.name==='QuotaExceededError'?'Not enough free space. Free some up, then resume.':'Download stopped. Check your connection; it continues where it left off.';}
  // Keep saved bytes against this plan until the next worker plan replaces both plan and got.
  }finally{controller=null;paint();if(menu.open)renderMenu();}
 }
 for(const box of [bar,settings,menuStatus])box.querySelector('[data-toggle]').onclick=()=>controller?controller.abort():void start();
 bar.querySelector('[data-hide]').onclick=()=>{bar.hidden=true;};
 // A roster body that isn't on this phone downloads by itself when it's previewed or picked (sw.js).
 const pendingBodies=new Set();let noteTimer=0;
 worker.addEventListener?.('message',({data})=>{
  if(data?.type!=='BODY_DOWNLOAD')return;
  clearTimeout(noteTimer);
  if(data.state==='start')pendingBodies.add(data.url);else pendingBodies.delete(data.url);
  note.textContent=data.state==='unavailable'?'This body isn’t on this phone yet. Connect to the internet to download it.':pendingBodies.size?'Downloading this body…':'';
  note.hidden=!note.textContent;
  if(data.state==='unavailable')noteTimer=setTimeout(()=>{note.hidden=true;},6000);
 });
 // Nothing appears over a workout or camera-only mode; the menu waits until the app is idle.
 const ticker=setInterval(()=>{
  if(menu.open&&busy())menu.close('busy');
  if(wantMenu&&idle()&&navigator.onLine){wantMenu=false;openMenu(true);}
  if(phase==='done'&&!bar.hidden&&!doneTimer&&idle())doneTimer=setTimeout(()=>{bar.hidden=true;},6000);
 },1000);
 window.addEventListener('online',()=>{if(read(localStorage,STATE)==='on'&&['ready','error'].includes(phase)&&!cellular())void start();});
 window.addEventListener('pagehide',event=>{if(!event.persisted){clearInterval(ticker);window.removeEventListener('myr5:account-ready',sectionsReady);window.removeEventListener('myr5:account-cleared',sectionsCleared);clearSections();}});
 (async()=>{
  // A first visit is controlled once the core install activates; its menu can open then.
  if(!worker.controller)await new Promise(resolve=>worker.addEventListener?.('controllerchange',resolve,{once:true}));
  try{plan=await ask();}catch(error){phase='error';message=error.message;paint();return;}
  phase=plan.remaining?'ready':'done';paint();if(menu.open)renderMenu();
  const state=read(localStorage,STATE);
  if(state)write(localStorage,SEEN,'1');
  // The earlier tap was the consent: resume after a reload, or fetch an update's changed files,
  // but never silently on mobile data.
  if(plan.remaining&&state==='on'&&navigator.onLine&&!cellular())return void start();
  if(plan.remaining&&state==='paused'){phase='paused';bar.hidden=false;paint();return;}
  // A deep link (?panel=) came for one thing; like the quilt, the menu waits for a plain open.
  if(!read(localStorage,SEEN)&&!new URLSearchParams(location.search).has('panel')&&Object.values(plan.groups||{}).some(group=>group.remaining))wantMenu=true;
 })();
}
