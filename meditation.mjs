import {mountTubFlight} from './arcade/tub-flight/game.mjs';
import {mountBreathing,bubble} from './breathing.mjs';
import {todaysBackground,averageRgb} from './meditation-backgrounds.mjs';
// #149 (D46): the meditation track's starting boss and only mount, Four-legged 7, sleeps big behind you.
export const MEDITATION_COACH='roster/18-quad-all--robotic_dog_3d_model';
const SLEEP_YAW=-.9; // resting three-quarters on, head toward screen left, behind your character
export function mountMeditation({api,onComplete,getAccount,backgroundLookup}={}){
 const open=document.createElement('button');open.type='button';open.className='meditation-entry';open.innerHTML='<span>◌</span><strong>Meditation</strong><small aria-hidden="true">→</small>';document.querySelector('.crew-footer').after(open);
 // #149: the room is three peering layers (data-peer-depth): far = the day's wonder, mid = the big sleeping coach,
 // near = your seated character, the ring and the caption. All black and white until a full session brings the colour back.
 const dialog=document.createElement('dialog');dialog.className='launch-panel meditation-panel';dialog.setAttribute('aria-labelledby','meditation-title');dialog.innerHTML='<header><h2 id="meditation-title">The still room</h2><button data-meditation-close>Close</button></header><section data-meditation-scene><div class="meditation-stage"><div class="meditation-layer meditation-far" data-peer-depth="far" aria-hidden="true"></div><div class="meditation-layer meditation-mid" data-peer-depth="mid" aria-hidden="true"><div class="meditation-platform"></div><div class="meditation-coach"></div></div><div class="meditation-layer meditation-near" data-peer-depth="near"><button class="meditation-character" aria-label="Tap your Gala character"><canvas width="64" height="96"></canvas></button><div class="forest-canopy" aria-hidden="true"></div><div class="meditation-can" aria-hidden="true"><b>FUEL</b><i></i></div><div class="meditation-powder" aria-hidden="true">· · · · ·</div><p class="meditation-speech" role="status">Breathe in. Breathe out.</p></div><div class="meditation-grey" aria-hidden="true"></div></div><button data-breath-pause type="button">Pause</button></section><section data-meditation-arcade hidden></section><div class="meditation-blackout" aria-hidden="true">'+Array.from({length:8},(_,i)=>'<i style="--strip:'+i+'"></i>').join('')+'</div>';document.body.append(dialog);
 const scene=dialog.querySelector('[data-meditation-scene]'),stage=dialog.querySelector('.meditation-stage'),coachBox=dialog.querySelector('.meditation-coach'),character=dialog.querySelector('.meditation-character'),speech=dialog.querySelector('.meditation-speech'),arcade=dialog.querySelector('[data-meditation-arcade]'),breathPause=dialog.querySelector('[data-breath-pause]');let taps=0,game=null,timers=[],transitioning=false,epoch=0,borrowed=null,drag=null;
 // The room art is deliberately drawn from simple SVG shapes so it remains bundled, crisp, and offline.
 const far=dialog.querySelector('.meditation-far');far.innerHTML='<svg class="room-art" viewBox="0 0 800 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><g fill="#050505" stroke="#fff" stroke-width="5" stroke-linejoin="miter"><path d="M0 650h800v250H0z"/><path d="M36 612h36v-32h22v-36h22v-39h23v-37h26v37h22v39h22v36h34v32h22v288H36zM229 612h32v-35h20v-37h21v-43h24v-41h27v41h23v43h21v37h19v35h29v288H229zM419 612h35v-33h21v-38h22v-45h24v-42h27v42h23v45h22v38h21v33h32v288H419zM617 612h31v-34h19v-36h22v-42h24v-39h25v39h22v42h20v36h24v34h24v288H617z"/></g><path d="M0 650h800M0 735h800M0 820h800" stroke="#fff" stroke-width="4" stroke-dasharray="5 21"/><g fill="#fff"><path d="M95 140h28v28H95zM240 225h18v18h-18zM655 112h28v28h-28zM530 310h16v16h-16zM378 95h20v20h-20z"/></g><circle cx="680" cy="220" r="58" fill="none" stroke="#fff" stroke-width="5"/></svg>';
 const platform=dialog.querySelector('.meditation-platform');platform.innerHTML='<svg viewBox="0 0 800 230" preserveAspectRatio="none" aria-hidden="true"><path d="M28 118 400 12l372 106-372 100z" fill="#050505" stroke="#fff" stroke-width="8"/><path d="M130 118 400 45l270 73-270 75z" fill="none" stroke="#777" stroke-width="5" stroke-dasharray="12 9"/></svg>';
 const coachArt=document.createElementNS('http://www.w3.org/2000/svg','svg');coachArt.setAttribute('viewBox','0 0 800 500');coachArt.setAttribute('aria-hidden','true');coachArt.classList.add('coach-pixel');coachArt.innerHTML='<g fill="#050505" stroke="#fff" stroke-width="14" stroke-linejoin="round"><path d="M188 178 270 120 542 112 632 168 682 270 612 326 244 328 158 273z"/><path d="m232 292-25 148h70l56-134M330 305l8 142h70l26-137M530 304l-2 143h68l37-143M615 293l62 139h67l-73-195"/><path d="m173 194-86-70-55 22 91 132"/><path d="m600 176 92-85 62 24-110 129"/><path d="m608 176 35-78 68-10 46 43-35 75z"/></g><g fill="#fff"><path d="M682 139h25v25h-25zM731 139h25v25h-25z"/></g>';
 coachBox.prepend(coachArt);character.innerHTML='<canvas width="64" height="96"></canvas>';
 const canopy=dialog.querySelector('.forest-canopy');canopy.innerHTML='<svg viewBox="0 0 800 180" preserveAspectRatio="none" aria-hidden="true"><path d="M0 126h800v54H0z" fill="#000"/><g fill="#000" stroke="#fff" stroke-width="6" stroke-linejoin="miter"><path d="M46 151h28v-24h20v-21h18V83h18V59h17v24h18v23h20v21h27v29zM237 151h24v-25h19v-22h18V79h18V53h18v26h18v25h19v22h25v25zM430 151h28v-24h19v-23h17V74h20V47h18v27h20v30h17v23h25v24zM622 151h24v-23h18v-22h17V79h20V57h17v22h18v27h19v22h29v23z"/></g><path d="M157 119v54m171-53v54m214-55v55m157-52v52" stroke="#fff" stroke-width="7"/><path d="M157 139 135 122m22 10 20-18m151 43-22-18m22 4 21-18m192 42-22-20m22 5 23-19m134 34-21-18m21 4 21-18" stroke="#fff" stroke-width="5"/><path d="M0 165h800" stroke="#fff" stroke-width="4" stroke-dasharray="8 18"/></svg>';
 const stopCircle=document.createElement('button'),count=document.createElement('b'),sessionClock=document.createElement('small'),direction=document.createElement('i');count.className='breath-count';count.dataset.breathCount='';count.textContent='—';sessionClock.dataset.sessionClock='';sessionClock.textContent='3:30';direction.className='breath-direction';direction.dataset.breathDirection='';direction.textContent='SETTLE';stopCircle.type='button';stopCircle.className='breathing-ring-stop';stopCircle.dataset.breathingStop='';stopCircle.dataset.breathExit='';stopCircle.setAttribute('aria-label','Stop the breathing session and leave the room');stopCircle.hidden=true;const hud=document.createElement('div');hud.className='breath-hud';hud.append(count,sessionClock,direction,stopCircle);dialog.querySelector('.meditation-near').append(hud);
 const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
 const later=(fn,ms)=>{const id=setTimeout(fn,ms);timers.push(id);};
 // Cancelled with the room: reset() clears the timer, so the awaiting sequence simply never resumes.
 const wait=ms=>new Promise(resolve=>later(resolve,ms));
 const say=line=>bubble(speech,line);
 function portrait(){character.dataset.expression=taps>=3?'focused':'calm';try{const avatar=window.GalaAvatar,canvas=character.querySelector('canvas');let look=avatar.defaultLook;try{look=avatar.normalize(JSON.parse(localStorage.getItem('mominc-avatar-v1')));}catch{}avatar.draw(canvas,look,{base:false,weapon:false,prop:false,blink:false,pose:{meditate:true}});}catch{}}

 function reset(){epoch++;timers.forEach(clearTimeout);timers=[];game?.dispose();game=null;taps=0;transitioning=false;scene.hidden=false;arcade.hidden=true;dialog.classList.remove('snorting','blacking-out','meditation-colour','coach-leap','coach-wander');peer(0,0);stage.dataset.annoyed='0';character.disabled=false;dialog.classList.remove('breathing-paused');breathPause.textContent='Pause';say('Breathe in. Breathe out.');portrait();}
 // D28: the day's "wonders" pack background when a caller-supplied lookup has it downloaded,
 // otherwise today's bundled starter wonder; the neutral gradient only shows if the image fails.
 async function applyBackground(){
  const requestEpoch=epoch,{id,url}=await todaysBackground(backgroundLookup);let art=null;
  if(url)try{const img=new Image();img.src=url;await img.decode();if(requestEpoch!==epoch||!dialog.open)return;const base=bottomColour(img);art={url:`url("${url}")`,base,grey:base&&grey(base)};pixelateWonder(img);}catch{}
  if(requestEpoch!==epoch||!dialog.open)return;
   dialog.dataset.wonder=art?id:'';dialog.classList.toggle('has-wonder-art',!!art);starter.hidden=!!art;
  for(const key of ['url','base','grey'])art?.[key]?dialog.style.setProperty('--wonder-'+key,art[key]):dialog.style.removeProperty('--wonder-'+key);
 }
 function pixelateWonder(img){try{const canvas=document.createElement('canvas');canvas.className='room-pixels';canvas.width=56;canvas.height=64;const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.imageSmoothingEnabled=false;ctx.drawImage(img,0,0,canvas.width,canvas.height);const pixels=ctx.getImageData(0,0,canvas.width,canvas.height);for(let i=0;i<pixels.data.length;i+=4){const y=Math.round(.2126*pixels.data[i]+.7152*pixels.data[i+1]+.0722*pixels.data[i+2]);const v=y<70?0:y<135?88:y<200?176:255;pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=v;}ctx.putImageData(pixels,0,0);far.prepend(canvas);}catch{}}
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
  document.body.dataset.shipView='true';coachBox.append(card);card.hidden=true;coachArt.style.display='';creature.stage('overlay');creature.sleep(true);
  let shown=false;try{shown=await creature.preview({body:MEDITATION_COACH,headFrom:MEDITATION_COACH,armsFrom:MEDITATION_COACH,feetFrom:MEDITATION_COACH});}catch{}
  if(run===epoch&&dialog.open){if(shown){coachArt.style.display='none';card.hidden=false;creature.walk?.(false);creature.sleep?.(true);creature.face?.(SLEEP_YAW);creature.stage?.('overlay');creature.walk?.(false);creature.sleep?.(true);creature.face?.(SLEEP_YAW);}else{coachArt.style.display='';card.hidden=true;}}
  // If the model is offline, the drawn four-legged room figure remains visible; never substitute the user's coach.
 }
 function releaseCoach(){
  if(!borrowed)return;const {card,home,stage:was,flag}=borrowed,creature=window.myr5Creature;borrowed=null;card.hidden=false;
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
 character.onclick=()=>{if(transitioning)return;taps++;stage.dataset.annoyed=String(Math.min(taps,5));portrait();const lines=['I am concentrating.','That is not part of the meditation.','You. Again.','One more poke. See what happens.','Fine. Emergency fuel.'];bubble(speech,lines[Math.min(taps-1,4)]);if(taps<5)return;transitioning=true;character.disabled=true;dialog.classList.add('snorting');later(()=>dialog.classList.add('blacking-out'),1800);later(()=>{scene.hidden=true;arcade.hidden=false;game=mountTubFlight(arcade,{title:'TUB FLIGHT',onComplete:()=>{const link=document.createElement('a');link.className='primary-action';link.href='https://mominc.online/games/fuel/#fuelFlight=myr5-eight-pipes';link.target='_blank';link.rel='noopener';link.textContent='Your tub is full. Open Goon Fuel →';arcade.append(link);}});dialog.classList.remove('snorting','blacking-out');transitioning=false;arcade.querySelector('canvas').focus();},3000);};
 mountBreathing({dialog,scene,pause:breathPause,api,getAccount,onComplete,onSessionComplete:()=>{if(dialog.open)void wake();},onEarlyExit:async({isCurrent=()=>true}={})=>{const run=epoch;dialog.classList.add('coach-leap');await wait(700);if(run!==epoch||!dialog.open)return;dialog.classList.remove('coach-leap');if(isCurrent())dialog.close();}});
 window.addEventListener('pagehide',()=>{epoch++;timers.forEach(clearTimeout);timers=[];game?.dispose();game=null;if(dialog.open)dialog.close();else releaseCoach();});
}
