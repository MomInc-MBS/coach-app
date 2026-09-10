import {GALA_KEY,loadGala} from './identity.mjs';
import {drawAnimatedWeapon} from './weapon-animator.mjs';
import {abilityFor,evolution} from './weapon-evolution.mjs';

export function mountHomeCharacter(){
 const host=document.getElementById('homeCharacter'),canvas=host.querySelector('canvas'),hud=document.getElementById('hud');
 const W=window.GalaWeapons,A=window.GalaAvatar,reduced=matchMedia('(prefers-reduced-motion: reduce)');
 window.GalaWeaponMotion={drawAnimatedWeapon,abilityFor,evolution};
 let performer,selected=false,frame=0,last=0,origin=performance.now(),visible=true,disposed=false;
 function load(){
  let storage;try{storage=localStorage;}catch{}
  const look=loadGala(storage,A).look,chosen=look.weapon||{type:'rapier',tier:0};
  look.weapon=W.unlocked(chosen)?chosen:{type:chosen.type,tier:0};
  performer=window.GalaPerformance.create(look);origin=performance.now();
  host.querySelector('[data-weapon]').textContent=W.name(look.weapon);
  canvas.setAttribute('aria-label',`${look.name||'Your Gala character'} with ${W.name(look.weapon)}`);
  performer.paint(canvas,0,reduced.matches);sync();
 }
 function shown(){return !selected&&document.body.dataset.tracking!=='true'&&document.body.dataset.screen!=='rest';}
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
 function choose(){selected=true;sync();}
 function home(){if(document.body.dataset.tracking==='true')return;selected=false;sync();}
 function attack(){
  if(!performer?.weapon)return;
  const index=performer.scenes.findIndex(scene=>scene.name==='weapon');
  if(index<0)return;
  origin=performance.now()-performer.scenes.slice(0,index).reduce((sum,scene)=>sum+scene.duration,0);sync();
 }
 const observer=new MutationObserver(sync);observer.observe(document.body,{attributes:true,attributeFilter:['data-tracking','data-screen']});
 document.querySelectorAll('dialog').forEach(dialog=>observer.observe(dialog,{attributes:true,attributeFilter:['open']}));
 const intersection=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync();});intersection.observe(host);
 const storage=event=>{if(event.key===GALA_KEY)load();};
 window.addEventListener('myr5:exercise-selected',choose);window.addEventListener('mominc-avatar-change',load);window.addEventListener('myr5:account-progress',load);window.addEventListener('storage',storage);
 document.addEventListener('visibilitychange',sync);reduced.addEventListener('change',sync);
 document.querySelector('.mom-brand').addEventListener('click',home);host.querySelector('button').addEventListener('click',attack);
 load();
 window.addEventListener('pagehide',()=>{disposed=true;sync();observer.disconnect();intersection.disconnect();window.removeEventListener('myr5:exercise-selected',choose);window.removeEventListener('mominc-avatar-change',load);window.removeEventListener('myr5:account-progress',load);window.removeEventListener('storage',storage);document.removeEventListener('visibilitychange',sync);reduced.removeEventListener('change',sync);},{once:true});
}
