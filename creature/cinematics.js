// Full-app opening doors, followed by scenes using the live customized coach.
const OPENING_SEEN='myr5-opening-doors-seen-v2';
const SCENES={
 opening:{duration:4800,label:'MOM INC. / POD 005',title:'Something big is waking up.',beats:['CONTAINMENT ONLINE','COACH AWAKENING','MYR5 IS READY']},
 home:{duration:2400,label:'TRAINING DECK',title:'Your coach. Your next move.',beats:['WELCOME ABOARD','READY WHEN YOU ARE']},
 pre:{duration:3300,label:'MOVEMENT SELECTED',title:'Let’s make it count.',beats:['FIND YOUR SPACE','FIND YOUR FOCUS','LET’S GO']},
 post:{duration:3800,label:'SET COMPLETE',title:'You showed up.',beats:['EFFORT RECORDED','TAKE A BREATH','MEET YOUR GIANT']}
};
export function initCinematics({voice}={}){
 const body=document.body,reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const read=(store,key)=>{try{return store.getItem(key);}catch{return null;}};
 const lowMotion=()=>{try{return reduced.matches||JSON.parse(read(localStorage,'myr5-motion-v1')||'{}')?.reduced===true;}catch{return reduced.matches;}};
 let enabled=read(localStorage,'myr5-cinematics-v1')!=='off',active=null,frame=0,lastScreen=body.dataset.screen,disposed=false;
 if(!document.getElementById('coach-cinematics-style')){const sheet=document.createElement('link');sheet.rel='stylesheet';sheet.href=new URL('cinematics.css',import.meta.url).href;document.head.append(sheet);}
 const layer=document.createElement('section');layer.className='coach-film';layer.hidden=true;
 layer.setAttribute('aria-label','Coach cinematic');layer.innerHTML='<div class="film-doors" aria-hidden="true"><div class="film-door film-door-left"><div class="film-door-brand"><img alt=""></div></div><div class="film-door film-door-right"><div class="film-door-brand"><img alt=""></div></div></div><div class="film-top"><span class="film-label"></span><button type="button" class="film-skip">Skip intro →</button></div><div class="film-scan" aria-hidden="true"></div><div class="film-copy"><p class="film-beat"></p><h1 class="film-title"></h1><p class="film-detail"></p><div class="film-progress" aria-hidden="true"><i></i></div></div>';
 for(const side of ['left','right'])layer.querySelector(`.film-door-${side} img`).src=new URL('../pod/mom-inc-mark.png',import.meta.url).href;
 body.append(layer);
 const label=layer.querySelector('.film-label'),title=layer.querySelector('.film-title'),beat=layer.querySelector('.film-beat'),detail=layer.querySelector('.film-detail'),progress=layer.querySelector('.film-progress i'),skip=layer.querySelector('button');
 const inertNodes=[];
 function finish(outcome='complete'){
  if(!active)return;const run=active;active=null;cancelAnimationFrame(frame);
  delete body.dataset.cinematic;layer.hidden=true;if(run.kind!=='opening'){try{window.myr5Creature?.cinematic(null);}catch{}}
  for(const [node,was] of inertNodes.splice(0))node.inert=was;
  if(run.focus?.isConnected&&!run.focus.closest('[hidden]'))run.focus.focus({preventScroll:true});
  if(run.kind==='opening'&&outcome!=='cancelled'){try{sessionStorage.setItem(OPENING_SEEN,'yes');}catch{}}
  window.dispatchEvent(new CustomEvent('myr5:cinematic-end',{detail:{kind:run.kind,outcome}}));
  run.resolve(outcome);
 }
 function play(kind,info={}){
  if(!Object.hasOwn(SCENES,kind)||disposed)return Promise.resolve('cancelled');
  finish('cancelled');
  if(!enabled||lowMotion()||document.hidden)return Promise.resolve(document.hidden?'cancelled':'skipped');
  const scene=SCENES[kind],home=kind==='home';
  voice?.cancel();
  body.dataset.cinematic=kind;layer.dataset.scene=kind;layer.hidden=false;
  label.textContent=scene.label;title.textContent=scene.title;
  detail.textContent=kind==='pre'?(info.name||'Your next movement'):kind==='post'?(document.getElementById('setReceipt')?.textContent||'Your effort counts.'):kind==='opening'?'MAKING YOU READY.':'';
  beat.textContent=scene.beats[0];progress.style.transform='scaleX(0)';
  skip.textContent=kind==='pre'?'Start now →':kind==='post'?'Continue →':'Skip intro →';
  layer.setAttribute('role',home?'region':'dialog');layer.setAttribute('aria-modal',String(!home));
  const focus=document.activeElement;
  if(!home){
   // Keep the existing canvas mounted, while keyboard focus stays in the scene.
   for(const node of body.children)if(node!==layer&&!['SCRIPT','LINK','STYLE'].includes(node.tagName)){inertNodes.push([node,node.inert]);node.inert=true;}
   skip.focus({preventScroll:true});
  }
  return new Promise(resolve=>{
   active={kind,resolve,focus,start:performance.now(),elapsed:0};
   const tick=now=>{
    if(!active||active.kind!==kind)return;const elapsed=now-active.start;active.elapsed=elapsed;
    if(kind!=='opening'){try{window.myr5Creature?.cinematic(kind,elapsed);}catch{finish('skipped');return;}}
    const index=Math.min(scene.beats.length-1,Math.floor(elapsed/scene.duration*scene.beats.length));
    if(beat.textContent!==scene.beats[index])beat.textContent=scene.beats[index];
    progress.style.transform=`scaleX(${Math.min(1,elapsed/scene.duration)})`;
    if(elapsed>=scene.duration)finish();else frame=requestAnimationFrame(tick);
   };frame=requestAnimationFrame(tick);
  });
 }
 skip.addEventListener('click',()=>finish('skipped'));
 const keyboard=event=>{if(!active)return;if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();finish('skipped');}else if(event.key==='Tab'&&active.kind!=='home'){event.preventDefault();skip.focus();}};
 document.addEventListener('keydown',keyboard,true);
 const visibility=()=>{if(document.hidden)finish('cancelled');};document.addEventListener('visibilitychange',visibility);
 const motionChange=()=>{if(reduced.matches)finish('skipped');};reduced.addEventListener('change',motionChange);
 const settings=document.getElementById('settings');
 if(settings){
  const group=document.createElement('div');group.className='cinematic-settings';
  const toggle=document.createElement('button');toggle.type='button';
  const paint=()=>{toggle.textContent=enabled?'Cinematics on':'Cinematics off';toggle.setAttribute('aria-pressed',String(enabled));};paint();
  toggle.addEventListener('click',()=>{enabled=!enabled;try{localStorage.setItem('myr5-cinematics-v1',enabled?'on':'off');}catch{}paint();if(!enabled)finish('skipped');});
  const replay=document.createElement('button');replay.type='button';replay.textContent='Replay opening';
  replay.addEventListener('click',async()=>{settings.close();if(!enabled){enabled=true;paint();try{localStorage.setItem('myr5-cinematics-v1','on');}catch{}}await play('opening');});
  group.append(toggle,replay);settings.append(group);
 }
 const observer=new MutationObserver(()=>{const screen=body.dataset.screen;if(screen===lastScreen)return;lastScreen=screen;if(active&&((active.kind==='post'&&screen!=='rest')||(active.kind!=='post'&&screen!=='pod')))finish('cancelled');if(screen==='pod'&&!active)play('home');});
 observer.observe(body,{attributes:true,attributeFilter:['data-screen']});
 // Doors cover the whole app while the coach loads beneath them.
 const bootTimer=setTimeout(async()=>{
  if(disposed||document.hidden||body.dataset.screen!=='pod'||document.querySelector('dialog[open]')||body.dataset.tracking==='true'||active)return;
  if(read(sessionStorage,OPENING_SEEN)!=='yes'){const outcome=await play('opening');if(outcome==='cancelled')return;}
  if(!disposed&&!document.hidden&&!active&&body.dataset.screen==='pod')play('home');
 },150);
 const interaction=()=>{clearTimeout(bootTimer);if(active?.kind==='home')finish('skipped');};
 for(const id of ['start','openLibrary','openSettings','openBreathing','visitRest','openIdentity','openAccomplishments'])document.getElementById(id)?.addEventListener('click',interaction,{capture:true});
 window.addEventListener('pagehide',()=>{disposed=true;clearTimeout(bootTimer);finish('cancelled');observer.disconnect();document.removeEventListener('keydown',keyboard,true);document.removeEventListener('visibilitychange',visibility);reduced.removeEventListener('change',motionChange);},{once:true});
 return {play,cancel:()=>finish('cancelled'),stats:()=>({active:active?.kind||null,enabled,reduced:lowMotion()})};
}
