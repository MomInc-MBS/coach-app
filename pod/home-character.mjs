import {GALA_KEY,loadGala} from './identity.mjs';
import {drawAnimatedWeapon} from './weapon-animator.mjs';
import {abilityFor,evolution} from './weapon-evolution.mjs';

// R26: the War Room's coach body/pet (64-bit coach sprites in the saved coach's colours) stands here too. Loaded
// lazily from the War Room bundle so the core app stays small; offline without it the Gala body shows.
const COACH_SPRITES='/war-room/coach-sprites.js',RECIPE_KEY='myr5-recipe-v1',COACH_CHOICE='myr5-war-room-coaches-v2/';
export function mountHomeCharacter(){
 const host=document.getElementById('homeCharacter'),canvas=host.querySelector('canvas'),hud=document.getElementById('hud');
 const W=window.GalaWeapons,A=window.GalaAvatar,reduced=matchMedia('(prefers-reduced-motion: reduce)');
 window.GalaWeaponMotion={drawAnimatedWeapon,abilityFor,evolution};
 let performer,frame=0,last=0,origin=performance.now(),visible=true,disposed=false,coaches=null;
 function load(){
  let storage;try{storage=localStorage;}catch{}
  const look=loadGala(storage,A).look,chosen=look.weapon||{type:'rapier',tier:0};
  look.weapon=W.unlocked(chosen)?chosen:{type:chosen.type,tier:0};
  performer=window.GalaPerformance.create(look,coaches?{draw:(canvas,value,options)=>coaches.draw(A.draw,canvas,value,options),hasPet:coaches.hasPet}:{});origin=performance.now();
  host.querySelector('[data-weapon]').textContent=W.name(look.weapon);
  canvas.setAttribute('aria-label',`${look.name||'Your Gala character'} with ${W.name(look.weapon)}`);
  performer.paint(canvas,0,reduced.matches);sync();
 }
 function shown(){return document.body.dataset.tracking!=='true'&&document.body.dataset.screen!=='rest';}
 function animate(now){
  frame=0;if(disposed||!shown()||!visible||document.hidden||document.querySelector('dialog[open]'))return;
  if(now-last>32){performer.paint(canvas,now-origin,reduced.matches);last=now;}
  if(!reduced.matches)frame=requestAnimationFrame(animate);
 }
 function sync(){
  const show=shown();host.hidden=!show;hud.hidden=show;
  if(frame)cancelAnimationFrame(frame);frame=0;
  if(!disposed&&show&&visible&&!document.hidden)frame=requestAnimationFrame(animate);
 }
 function attack(){
  if(!performer?.weapon)return;
  const index=performer.scenes.findIndex(scene=>scene.name==='weapon');
  if(index<0)return;
  origin=performance.now()-performer.scenes.slice(0,index).reduce((sum,scene)=>sum+scene.duration,0);sync();
 }
 const observer=new MutationObserver(sync);observer.observe(document.body,{subtree:true,attributes:true,attributeFilter:['data-tracking','data-screen','open']});
 const intersection=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync();});intersection.observe(host);
 const storage=event=>{if(event.key===GALA_KEY||event.key===RECIPE_KEY||event.key?.startsWith(COACH_CHOICE))load();},shownAgain=event=>{if(event.persisted)load();};
 window.addEventListener('mominc-avatar-change',load);window.addEventListener('myr5:recipe',load);window.addEventListener('pageshow',shownAgain);window.addEventListener('myr5:account-progress',load);window.addEventListener('storage',storage);
 document.addEventListener('visibilitychange',sync);reduced.addEventListener('change',sync);
 const entry=host.querySelector('button');entry.setAttribute('aria-label','Open your character in the War Room');
 entry.addEventListener('click',()=>{location.href='/war-room/index.html';});
 load();
 import(COACH_SPRITES).then(m=>m.loadWarRoomCoaches(document)).then(value=>{if(!disposed){coaches=value;load();}}).catch(()=>{});
 window.addEventListener('pagehide',event=>{if(event.persisted)return;disposed=true;sync();observer.disconnect();intersection.disconnect();window.removeEventListener('mominc-avatar-change',load);window.removeEventListener('myr5:recipe',load);window.removeEventListener('pageshow',shownAgain);window.removeEventListener('myr5:account-progress',load);window.removeEventListener('storage',storage);document.removeEventListener('visibilitychange',sync);reduced.removeEventListener('change',sync);}); // a bfcache hide keeps it alive for pageshow
}
