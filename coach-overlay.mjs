// Full-body coach in the room during a tracked set: off frame until the first rep (or held second) counts,
// then it walks in and wanders beside, behind and in front of the user. Kick it and it spins off, then walks back.
import {CoachMotion,COACH} from './coach-hit.mjs';
const $=id=>document.getElementById(id);

export function videoToScreen(point,{videoW,videoH,screenW,screenH,mirrored}){
 if(!point||!videoW||!videoH||!screenW||!screenH)return {x:0,y:0,visibility:0};
 const scale=Math.max(screenW/videoW,screenH/videoH),offX=(screenW-videoW*scale)/2,offY=(screenH-videoH*scale)/2;
 const px=mirrored?1-point.x:point.x;
 return {x:(offX+px*videoW*scale)/screenW,y:(offY+point.y*videoH*scale)/screenH,visibility:point.visibility??0};
}

export function mountCoachOverlay(){
 let overlay=null,box=null,card=null,motion=null,tracking=false,boxH=0,laughed=false,walking=false,begun=false,loading=null,lastState=null;
 async function ensureCard(){
  card=document.querySelector('.myr5-companion-card');if(card)return;
  loading??=(async()=>{
   if(!document.querySelector('link[href="/creature/phone.css"]')){const link=document.createElement('link');link.rel='stylesheet';link.href='/creature/phone.css';document.head.append(link);}
   try{await import('/creature/assets/phone.js');}catch{}
   card=document.querySelector('.myr5-companion-card');
  })();
  await loading;
 }
 function ensureOverlay(){
  overlay=$('coachOverlay');if(!overlay)return;
  box=overlay.querySelector('.coach-overlay-box');
  if(!box){box=document.createElement('div');box.className='coach-overlay-box';box.style.cssText='position:absolute;left:0;top:0;transform-origin:50% 50%';overlay.append(box);}
 }
 const walk=on=>{if(on!==walking){walking=on;window.myr5Creature?.walk?.(on);}};
 async function enter(){
  await ensureCard();if(!card||!tracking)return;
  ensureOverlay();if(!box)return;if(card.parentElement!==box)box.append(card);
  boxH=0;laughed=false;lastState=null;box.style.visibility='hidden';
  motion=new CoachMotion({aspect:innerWidth/innerHeight,now:performance.now()});if(begun)motion.begin();
  window.myr5Creature?.stage('overlay');
 }
 function leave(){
  motion=null;lastState=null;walk(false);window.myr5Creature?.face?.(0);if(!card)return;
  card.style.cssText='';if(box)box.style.visibility='';
  const mount=document.body.dataset.screen==='rest'?$('restCoachMount'):$('coachMount');
  if(mount&&card.parentElement!==mount)mount.append(card);
  window.myr5Creature?.stage(document.body.dataset.screen==='rest'?'encounter':'pod');
 }
 function place(state){
  if(!box)return;
  const hidden=state.phase==='offstage'||state.phase==='away';
  box.style.visibility=hidden?'hidden':'visible';
  walk(state.phase==='walking');window.myr5Creature?.face?.(state.yaw);
  if(state.phase==='spun'){if(!laughed){laughed=true;window.myr5Creature?.play('laugh');}}else laughed=false;
  if(hidden||!state.baseHeight)return;
  // The card is sized for the coach level with the user (a resize re-renders WebGL, so only on 15% changes);
  // walking nearer or farther is a CSS scale about the card's centre, keeping the feet on the floor line.
  const w=innerWidth,h=innerHeight,base=state.baseHeight*h;
  if(!boxH||Math.abs(base-boxH)/boxH>.15){boxH=base;box.style.width=Math.max(1,base*COACH.boxWidth)+'px';box.style.height=Math.max(1,base)+'px';}
  const k=state.height*h/boxH;
  box.style.transform=`translate(${state.x*w-boxH*COACH.boxWidth/2}px,${state.feetY*h-(k+1)*boxH/2}px) scale(${k}) rotate(${state.rotation}rad)`;
 }
 function apply(state){lastState=state;place(state);}
 function onPose(event){
  if(!tracking||!motion||!box)return;
  const {points,width,height,mirrored,now,counting}=event.detail;
  if(counting&&!begun){begun=true;motion.begin();}
  const screenPoints=points?points.map(p=>videoToScreen(p,{videoW:width,videoH:height,screenW:innerWidth,screenH:innerHeight,mirrored})):null;
  apply(motion.update(screenPoints,now));
 }
 window.addEventListener('myr5:pose',onPose);
 function setTracking(busy){if(busy===tracking)return;tracking=busy;if(busy){begun=false;void enter();}else leave();}
 new MutationObserver(()=>setTracking(document.body.dataset.tracking==='true')).observe(document.body,{attributes:true,attributeFilter:['data-tracking']});
 window.myr5CoachOverlay={
  start(){document.body.dataset.tracking='true';setTracking(true);},
  begin(){begun=true;motion?.begin();},
  pose(screenPoints){if(!motion||!box)return;apply(motion.update(screenPoints,performance.now()));},
  stop(){document.body.dataset.tracking='false';setTracking(false);},
  state:()=>lastState
 };
}
