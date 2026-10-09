import {GALA_KEY,loadGala} from './identity.mjs';
import {drawAnimatedWeapon} from './weapon-animator.mjs';
import {abilityFor,evolution} from './weapon-evolution.mjs';
import {createCharacterPhysics} from '../character-phone-physics.mjs';
import {subscribePhoneMotion} from '../character-phone-sensor.mjs';

// R26: the War Room's coach body/pet (64-bit coach sprites in the saved coach's colours) stands here too. Loaded
// lazily from the War Room bundle so the core app stays small; offline without it the Gala body shows.
const COACH_SPRITES='/war-room/coach-sprites.js',RECIPE_KEY='myr5-recipe-v1',COACH_CHOICE='myr5-war-room-coaches-v2/';
export function mountHomeCharacter(){
 const host=document.getElementById('homeCharacter'),canvas=host.querySelector('canvas'),hud=document.getElementById('hud');
 const W=window.GalaWeapons,A=window.GalaAvatar,reduced=matchMedia('(prefers-reduced-motion: reduce)');
 window.GalaWeaponMotion={drawAnimatedWeapon,abilityFor,evolution};
 let performer,frame=0,last=0,origin=performance.now(),visible=true,disposed=false,coaches=null,feetFraction=.835;
 const platform=document.createElement('div');platform.className='home-character-platform';platform.setAttribute('aria-hidden','true');host.append(platform);
 const physics=createCharacterPhysics({width:host.clientWidth||320,height:host.clientHeight||220,bodyWidth:canvas.clientWidth||120,bodyHeight:canvas.clientHeight||240,buffer:0,ship:false,climb:false,contain:true});
 let motion={gx:0,gy:0,shake:0,angularSpeed:0,timeSeconds:0},unsubscribeMotion=()=>{};
 function load(){
  let storage;try{storage=localStorage;}catch{}
  const look=loadGala(storage,A).look,chosen=look.weapon||{type:'rapier',tier:0};
  look.weapon=W.unlocked(chosen)?chosen:{type:chosen.type,tier:0};
  performer=window.GalaPerformance.create(look,coaches?{draw:(canvas,value,options)=>coaches.draw(A.draw,canvas,value,options),hasPet:coaches.hasPet,hasCoachBody:coaches.hasBody}:{});origin=performance.now();
  feetFraction=(coaches?.hasBody||coaches?.hasPet)? .935 : .835;
  host.querySelector('[data-weapon]').textContent=W.name(look.weapon);
  canvas.setAttribute('aria-label',`${look.name||'Your Gala character'} with ${W.name(look.weapon)}`);
  performer.paint(canvas,0,reduced.matches,{pose:physics.state.pose,phase:physics.state.phase,active:physics.state.active});feetFraction=performer.feetFraction||feetFraction;resize();sync();
 }
 function shown(){return document.body.dataset.tracking!=='true'&&document.body.dataset.screen!=='rest';}
 function animate(now){
  frame=0;if(disposed||!shown()||!visible||document.hidden||document.querySelector('dialog[open]'))return;
  if(reduced.matches){if(physics.state.phase!=='idle'||canvas.style.transform!=='translateX(-50%)')resetForReducedMotion();return;}
  if(now-last>32){
   const dt=last?Math.min(.05,(now-last)/1000):1/60;last=now;
   physics.sample(motion,now/1000);physics.step(dt);
   const state=physics.state;
   // CSS uses clockwise positive angles; the domain heading points the feet toward gravity.
   const groundedLean=state.phase==='slide'?(canvas.clientHeight||0)*(feetFraction-.5)*(1-Math.cos(state.angle)):0;
   canvas.style.transform=`translate(calc(-50% + ${state.x}px),${state.y+groundedLean}px) rotate(${-state.angle}rad)`;
   canvas.dataset.pose=state.pose;canvas.dataset.phase=state.phase;host.dataset.phase=state.phase;host.dataset.phonePhase=state.phase;host.dataset.phoneX=Math.round(state.x);host.dataset.phoneY=Math.round(state.y);
   performer.paint(canvas,now-origin,false,{pose:state.pose,phase:state.phase,active:state.active});
  }
  if(!reduced.matches)frame=requestAnimationFrame(animate);
 }
 function sync(){
  const show=shown();host.hidden=!show;hud.hidden=show;
  if(frame)cancelAnimationFrame(frame);frame=0;
  if(!disposed&&show&&visible&&!document.hidden)frame=requestAnimationFrame(animate);
 }
 function listenForMotion(){unsubscribeMotion();unsubscribeMotion=()=>{};if(!disposed&&!reduced.matches)unsubscribeMotion=subscribePhoneMotion(sample=>{motion=sample;if(shown()&&visible&&!document.hidden&&!document.querySelector('dialog[open]'))physics.sample(sample,sample.timeSeconds);});}
 function resetForReducedMotion(){
  unsubscribeMotion();unsubscribeMotion=()=>{};physics.reset();motion={gx:0,gy:1,shake:0,angularSpeed:0,timeSeconds:0};last=0;
  canvas.style.transform='translateX(-50%)';canvas.dataset.pose='idle';canvas.dataset.phase='idle';
  host.dataset.phase='idle';host.dataset.phonePhase='idle';host.dataset.phoneX='0';host.dataset.phoneY='0';
  platform.style.transform='';
  performer?.paint(canvas,0,true,{pose:'idle',phase:'idle',active:false});
 }
 function reducedChanged(){if(reduced.matches)resetForReducedMotion();else listenForMotion();sync();}
 function attack(){
  if(!performer?.weapon)return;
  const index=performer.scenes.findIndex(scene=>scene.name==='weapon');
  if(index<0)return;
  origin=performance.now()-performer.scenes.slice(0,index).reduce((sum,scene)=>sum+scene.duration,0);sync();
 }
 const observer=new MutationObserver(sync);observer.observe(document.body,{subtree:true,attributes:true,attributeFilter:['data-tracking','data-screen','open']});
 const intersection=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync();});intersection.observe(host);
 const storage=event=>{if(event.key===GALA_KEY||event.key===RECIPE_KEY||event.key?.startsWith(COACH_CHOICE))load();},shownAgain=event=>{if(event.persisted){listenForMotion();load();}};
 listenForMotion();
 const resize=()=>{const width=host.clientWidth||320,height=host.clientHeight||220,bodyWidth=canvas.clientWidth||120,bodyHeight=canvas.clientHeight||240,bottom=height*.24-bodyHeight*(1-feetFraction);canvas.style.bottom=`${bottom}px`;physics.setRestCenter(width/2,height-bottom-bodyHeight/2);physics.resize(width,height,bodyWidth,bodyHeight);};
 const layoutObserver=typeof ResizeObserver==='function'?new ResizeObserver(resize):null;
 layoutObserver?.observe(host);layoutObserver?.observe(canvas);
 resize();window.addEventListener('resize',resize);
 window.addEventListener('mominc-avatar-change',load);window.addEventListener('myr5:recipe',load);window.addEventListener('pageshow',shownAgain);window.addEventListener('myr5:account-progress',load);window.addEventListener('storage',storage);
 document.addEventListener('visibilitychange',sync);reduced.addEventListener('change',reducedChanged);
 const entry=host.querySelector('button');entry.setAttribute('aria-label','Open your character in the War Room');
 entry.addEventListener('click',()=>{location.href='/war-room/index.html';});
 load();
 import(COACH_SPRITES).then(m=>m.loadWarRoomCoaches(document)).then(value=>{if(!disposed){coaches=value;load();}}).catch(()=>{});
  window.addEventListener('pagehide',event=>{if(event.persisted){unsubscribeMotion();return;}disposed=true;unsubscribeMotion();sync();observer.disconnect();intersection.disconnect();layoutObserver?.disconnect();window.removeEventListener('resize',resize);window.removeEventListener('mominc-avatar-change',load);window.removeEventListener('myr5:recipe',load);window.removeEventListener('pageshow',shownAgain);window.removeEventListener('myr5:account-progress',load);window.removeEventListener('storage',storage);document.removeEventListener('visibilitychange',sync);reduced.removeEventListener('change',reducedChanged);}); // a bfcache hide keeps it alive for pageshow
}
