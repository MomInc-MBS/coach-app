import {mountTubFlight} from './arcade/tub-flight/game.mjs';
import {mountBreathing} from './breathing.mjs';
import {todaysBackground,averageRgb} from './meditation-backgrounds.mjs';
// #149 (D46): the meditation track's starting boss and only mount, Four-legged 7, sleeps big behind you.
export const MEDITATION_COACH='roster/18-quad-all--robotic_dog_3d_model';
const SLEEP_YAW=-.9; // lying three-quarters on, head toward screen left, behind your character
export function mountMeditation({api,onComplete,getAccount,backgroundLookup}={}){
 const open=document.createElement('button');open.type='button';open.className='meditation-entry';open.innerHTML='<span>◌</span><strong>Meditation</strong><small aria-hidden="true">→</small>';document.querySelector('.crew-footer').after(open);
 // #149: the room is three peering layers (data-peer-depth): far = the day's wonder, mid = the big sleeping coach,
 // near = your seated character, the ring and the caption. All black and white until a full session brings the colour back.
 const dialog=document.createElement('dialog');dialog.className='launch-panel meditation-panel';dialog.setAttribute('aria-labelledby','meditation-title');dialog.innerHTML='<header><h2 id="meditation-title">The still room</h2><button data-meditation-close>Close</button></header><section data-meditation-scene><div class="meditation-stage"><div class="meditation-layer meditation-far" data-peer-depth="far" aria-hidden="true"></div><div class="meditation-layer meditation-mid" data-peer-depth="mid" aria-hidden="true"><div class="meditation-platform"></div><div class="meditation-coach"></div></div><div class="meditation-layer meditation-near" data-peer-depth="near"><i class="breathing-ring" aria-hidden="true"></i><button class="meditation-character" aria-label="Tap your Gala character"><canvas width="64" height="96"></canvas></button><div class="meditation-can" aria-hidden="true"><b>FUEL</b><i></i></div><div class="meditation-powder" aria-hidden="true">· · · · ·</div><p class="meditation-speech" role="status">Breathe in. Breathe out.</p></div></div><button data-breath-pause type="button">Pause</button></section><section data-meditation-arcade hidden></section><div class="meditation-blackout" aria-hidden="true">'+Array.from({length:8},(_,i)=>'<i style="--strip:'+i+'"></i>').join('')+'</div>';document.body.append(dialog);
 const scene=dialog.querySelector('[data-meditation-scene]'),stage=dialog.querySelector('.meditation-stage'),coachBox=dialog.querySelector('.meditation-coach'),character=dialog.querySelector('.meditation-character'),speech=dialog.querySelector('.meditation-speech'),arcade=dialog.querySelector('[data-meditation-arcade]'),breathPause=dialog.querySelector('[data-breath-pause]');let taps=0,game=null,timers=[],transitioning=false,epoch=0,borrowed=null,drag=null;
 const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
 const later=(fn,ms)=>{const id=setTimeout(fn,ms);timers.push(id);};
 // Cancelled with the room: reset() clears the timer, so the awaiting sequence simply never resumes.
 const wait=ms=>new Promise(resolve=>later(resolve,ms));
 const say=line=>{speech.textContent=line;};
 function portrait(){try{const A=window.GalaAvatar;let look=A.defaultLook;try{look=A.normalize(JSON.parse(localStorage.getItem('mominc-avatar-v1')));}catch{}A.draw(character.querySelector('canvas'),look,{base:false,weapon:false,prop:false,blink:taps<2,pose:{meditate:true}});}catch{}}
 function reset(){epoch++;timers.forEach(clearTimeout);timers=[];game?.dispose();game=null;taps=0;transitioning=false;scene.hidden=false;arcade.hidden=true;dialog.classList.remove('snorting','blacking-out','meditation-colour','coach-lunge','coach-wander','smacked');peer(0,0);stage.dataset.annoyed='0';character.disabled=false;dialog.classList.remove('breathing-paused');breathPause.textContent='Pause';say('Breathe in. Breathe out.');portrait();}
 // D28: the day's "wonders" pack background when a caller-supplied lookup has it downloaded,
 // otherwise today's bundled starter wonder; the neutral gradient only shows if the image fails.
 async function applyBackground(){
  const {id,url}=await todaysBackground(backgroundLookup);let art=null;
  if(url)try{const img=new Image();img.src=url;await img.decode();const base=bottomColour(img);art={url:`url("${url}")`,base,grey:base&&grey(base)};}catch{}
  dialog.dataset.wonder=art?id:'';dialog.classList.toggle('has-wonder-art',!!art);starter.hidden=!!art;
  for(const key of ['url','base','grey'])art?.[key]?dialog.style.setProperty('--wonder-'+key,art[key]):dialog.style.removeProperty('--wonder-'+key);
 }
 // W2-2O: the starter wonders are Starter-pack art; without today's (offline, not downloaded) the plain room shows and the pack is offered.
 const starter=document.createElement('p'),get=document.createElement('button');starter.className='meditation-starter';starter.hidden=true;
 get.type='button';get.textContent='Download the Starter pack';get.onclick=()=>window.myr5Packs?.open('starter');
 starter.append('Backgrounds come with the Starter pack. ',get);stage.after(starter); // below the room: the caption now sits inside its near layer (#149)
 function bottomColour(img){try{const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=1;const g=c.getContext('2d');g.drawImage(img,0,img.naturalHeight-1,img.naturalWidth,1,0,0,img.naturalWidth,1);return averageRgb(g.getImageData(0,0,c.width,1).data);}catch{return null;}}
 // The panel below the stage continues the wonder's bottom edge; while the room is black and white, in grey (grayscale() weights).
 function grey(rgb){const [r,g,b]=rgb.match(/\d+/g).map(Number),y=Math.round(.2126*r+.7152*g+.0722*b);return `rgb(${y},${y},${y})`;}
 // The big sleeping coach: borrow the live companion card (creature/assets/phone.js, loaded here if the pod hasn't yet) into
 // the mid layer and show the meditation boss built on the user's own recipe, asleep. pod.mjs re-homes the card on any #view
 // change unless body.dataset.shipView is set, so the room holds that flag while it has the card, as the ship view does.
 async function borrowCoach(run){
  let card=document.querySelector('.myr5-companion-card');
  if(!card&&document.getElementById('view')){
   if(!document.querySelector('link[href="/creature/phone.css"]')){const link=document.createElement('link');link.rel='stylesheet';link.href='/creature/phone.css';document.head.append(link);}
   try{await import('/creature/assets/phone.js');}catch{}card=document.querySelector('.myr5-companion-card');
  }
  const creature=window.myr5Creature;if(run!==epoch||!dialog.open||!card||!creature?.preview)return;
  borrowed={card,home:card.parentElement,stage:creature.stats?.().stage,flag:document.body.dataset.shipView??''};
  document.body.dataset.shipView='true';coachBox.append(card);creature.stage('overlay');creature.sleep(true);
  let shown=false;try{shown=await creature.preview({body:MEDITATION_COACH,headFrom:MEDITATION_COACH,armsFrom:MEDITATION_COACH,feetFrom:MEDITATION_COACH});}catch{}
  if(run===epoch)creature.face?.(SLEEP_YAW); // the freshly built rig starts facing the camera
  // Never blank: an optional body that isn't on the phone (offline) leaves the user's own coach asleep in its place.
  if(run===epoch&&!shown)say('The meditation coach isn’t on this phone yet, so your own coach is sleeping in.');
 }
 function releaseCoach(){
  if(!borrowed)return;const {card,home,stage:was,flag}=borrowed,creature=window.myr5Creature;borrowed=null;
  creature?.walk?.(false);creature?.face?.(0);creature?.sleep?.(false);void creature?.preview?.(null)?.catch?.(()=>{});
  document.body.dataset.shipView=flag;(home?.isConnected?home:document.getElementById('coachMount')||document.getElementById('view')||document.body).append(card);
  if(was)creature?.stage?.(was);
 }
 // A full session: colour fades back into every layer (CSS, ~2.5 s), then the coach wakes and wanders off screen right.
 async function wake(){
  dialog.classList.add('meditation-colour');say('The colour comes back.');await wait(2500);
  const creature=borrowed&&window.myr5Creature;creature?.sleep?.(false);creature?.face?.(Math.PI/2);creature?.walk?.(true);
  dialog.classList.add('coach-wander');say('Your coach wakes up and wanders off. Well breathed.');await wait(3000);creature?.walk?.(false);
 }
 // Stopped early: the coach wakes, lunges, smacks you, and you go back through the wormhole; then the room closes.
 async function smack(){
  if(transitioning||!dialog.open)return;transitioning=true;const run=epoch;
  const creature=borrowed&&window.myr5Creature,reduced=reducedMotion.matches;creature?.sleep?.(false);creature?.play?.('encourage');
  if(reduced){dialog.classList.add('smacked');await wait(400);}
  else{dialog.classList.add('coach-lunge');await wait(300);dialog.classList.add('smacked');await wait(450);}
  await throughWormhole(reduced);if(run===epoch&&dialog.open)dialog.close(); // not a room reopened during the wormhole
 }
 // The one exit hook: 2N's wormhole (portal.mjs exposes it as window.myr5Portal.playWormhole); without the portal, the blackout strips.
 async function throughWormhole(reduced){
  const portal=window.myr5Portal;
  if(typeof portal?.playWormhole==='function'){try{await portal.playWormhole({direction:'out',minMs:900});}catch{}return;}
  if(!reduced){dialog.classList.add('blacking-out');await wait(1200);}
 }
 // D46 "should still have the peering effect, even if slight": drag and the layers slide by depth (far .3, mid .6, near 1, in CSS).
 // ponytail: drag only; tilt can drive the same --peer-x/--peer-y on the stage (2N's wrapper) when it lands.
 function peer(x,y){stage.style.setProperty('--peer-x',x+'px');stage.style.setProperty('--peer-y',y+'px');}
 const clamp=v=>Math.max(-24,Math.min(24,v*.25));
 stage.addEventListener('pointerdown',event=>{if(reducedMotion.matches)return;drag={x:event.clientX,y:event.clientY};stage.classList.add('peering');});
 stage.addEventListener('pointermove',event=>{if(drag)peer(clamp(event.clientX-drag.x),clamp(event.clientY-drag.y));});
 for(const type of ['pointerup','pointercancel','pointerleave'])stage.addEventListener(type,()=>{if(!drag)return;drag=null;stage.classList.remove('peering');peer(0,0);});
 open.onclick=()=>{document.getElementById('stop')?.click();reset();void applyBackground();dialog.showModal();void borrowCoach(epoch);};
 dialog.querySelector('[data-meditation-close]').onclick=()=>dialog.close();dialog.addEventListener('close',()=>{reset();releaseCoach();open.focus();});
 breathPause.onclick=()=>{const paused=dialog.classList.toggle('breathing-paused');breathPause.textContent=paused?'Resume':'Pause';};
 character.onclick=()=>{if(transitioning)return;taps++;stage.dataset.annoyed=String(Math.min(taps,5));portrait();const lines=['I am concentrating.','That is not part of the meditation.','You. Again.','One more poke. See what happens.','Fine. Emergency fuel.'];speech.textContent=lines[Math.min(taps-1,4)];if(taps<5)return;transitioning=true;character.disabled=true;dialog.classList.add('snorting');later(()=>dialog.classList.add('blacking-out'),1800);later(()=>{scene.hidden=true;arcade.hidden=false;game=mountTubFlight(arcade,{title:'TUB FLIGHT',onComplete:()=>{const link=document.createElement('a');link.className='primary-action';link.href='https://mominc.online/games/fuel/#fuelFlight=myr5-eight-pipes';link.target='_blank';link.rel='noopener';link.textContent='Your tub is full. Open Goon Fuel →';arcade.append(link);}});dialog.classList.remove('snorting','blacking-out');transitioning=false;arcade.querySelector('canvas').focus();},3000);};
 mountBreathing({dialog,scene,pause:breathPause,api,getAccount,onComplete:async()=>{await onComplete?.();if(dialog.open)void wake();},onEarlyExit:()=>void smack()});
 window.addEventListener('pagehide',()=>{timers.forEach(clearTimeout);game?.dispose();});
}
