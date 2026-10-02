// Full-body coach in the room during a tracked set: off frame until the first rep (or held second) counts,
// then it walks in and wanders beside, behind and in front of the user. Kick it and it spins off, then walks back.
import {CoachMotion,COACH} from './coach-hit.mjs';
const $=id=>document.getElementById(id);

// D43.5: while a set is counting, the coach gives up frames before the counter does. window.myr5TestState.rate
// is the tracking loop's own pose-update measurement (app.mjs) — reused here, not remeasured, so this is the
// same "updates/s" the counter and the calibration floor (9919c65) already see. When capped, this both caps
// the creature viewer's own WebGL render loop (window.myr5Creature.setMaxFps, creature/source/viewer.ts —
// the actual cost that competes with MediaPipe) and throttles coach-overlay's own per-pose work below (DOM
// writes and the coach-hit wander/hit-test math, which run inline in the tracking loop's call stack).
// Release 5 review: 1.6/s only engaged below the engine's own 1.33/s floor; phones stall in the 2-8/s band, so cap under 4/s.
const COACH_CAP={minPoseHz:4,fps:10,recoverMs:2000};
const COACH_GESTURE={spun:'laugh',held:'wiggle',swiping:'swipe',impressed:'agree',laughing:'laugh'};

export function videoToScreen(point,{videoW,videoH,screenW,screenH,mirrored}){
 if(!point||!videoW||!videoH||!screenW||!screenH)return {x:0,y:0,visibility:0};
 const scale=Math.min(screenW/videoW,screenH/videoH),offX=(screenW-videoW*scale)/2,offY=(screenH-videoH*scale)/2;
 const px=mirrored?1-point.x:point.x;
 return {x:(offX+px*videoW*scale)/screenW,y:(offY+point.y*videoH*scale)/screenH,visibility:point.visibility??0};
}

export function mountCoachOverlay(){
 let overlay=null,box=null,card=null,motion=null,tracking=false,boxH=0,gesturePhase=null,walking=false,begun=false,loading=null,lastState=null;
 let capped=false,aboveSince=null,lastRenderAt=-Infinity;
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
 // Off frame the box leaves layout (display:none), not just visibility:hidden: only then does the coach
 // viewer's IntersectionObserver pause its WebGL loop, which otherwise competes with the CPU pose tracker
 // (main thread and its per-frame GPU readback) while the user is still setting their start.
 const shown=on=>{box.style.visibility=on?'visible':'hidden';box.style.display=on?'':'none';};
 async function enter(){
  await ensureCard();if(!card||!tracking)return;
  ensureOverlay();if(!box)return;if(card.parentElement!==box)box.append(card);
  boxH=0;gesturePhase=null;lastState=null;capped=false;aboveSince=null;lastRenderAt=-Infinity;window.myr5Creature?.setMaxFps?.(null);shown(false);
  motion=new CoachMotion({aspect:innerWidth/innerHeight,now:performance.now(),play:!String(window.myr5Creature?.stats?.()?.recipe?.body||'').startsWith('roster/18-quad')});if(begun)motion.begin();
  window.myr5Creature?.stage('overlay');
 }
 function leave(){
  motion=null;lastState=null;walk(false);window.myr5Creature?.face?.(0);window.myr5Creature?.setMaxFps?.(null);if(!card)return;
  card.style.cssText='';if(box)box.style.visibility=box.style.display='';
  const mount=document.body.dataset.screen==='rest'?$('restCoachMount'):$('coachMount');
  if(mount&&card.parentElement!==mount)mount.append(card);
  window.myr5Creature?.stage(document.body.dataset.screen==='rest'?'encounter':'pod');
 }
 function place(state){
  if(!box)return;
  const hidden=state.phase==='offstage'||state.phase==='away';
  shown(!hidden);
  walk(state.phase==='walking'||state.phase==='charge');window.myr5Creature?.face?.(state.yaw);
  // One clip per phase entry; `wiggle` loops, so it is re-asked every frame (a no-op while it already plays).
  const gesture=COACH_GESTURE[state.phase];
  if(gesture&&(state.phase!==gesturePhase||state.phase==='held'))window.myr5Creature?.play(gesture);
  gesturePhase=gesture?state.phase:null;
  if(hidden||!state.baseHeight)return;
  // The card is sized for the coach level with the user (a resize re-renders WebGL, so only on 15% changes);
  // walking nearer or farther is a CSS scale about the card's centre, keeping the feet on the floor line.
  const w=innerWidth,h=innerHeight,base=state.baseHeight*h;
  if(!boxH||Math.abs(base-boxH)/boxH>.15){boxH=base;box.style.width=Math.max(1,base*COACH.boxWidth)+'px';box.style.height=Math.max(1,base)+'px';}
  const k=state.height*h/boxH;
  // held: dangles by the head, a small pendulum about the box top. fallen: toppled 90° away from the user about the
  // feet (eased by a short transition, which also eases the get-up). Whole-card transforms, so every silhouette works.
  const swing=state.phase==='held'?Math.sin(performance.now()/160)*.12:0;
  const pivot=state.phase==='held'?'translate(0,-50%) ':state.phase==='fallen'?'translate(0,50%) ':'';
  const unpivot=state.phase==='held'?' translate(0,50%)':state.phase==='fallen'?' translate(0,-50%)':'';
  const tilt=state.rotation+swing+(state.phase==='fallen'?state.side*Math.PI/2:0);
  box.style.transition=/^(fallen|impressed|laughing)$/.test(state.phase)?'transform .35s ease-in':'';
  box.style.transform=`translate(${state.x*w-boxH*COACH.boxWidth/2}px,${state.feetY*h-(k+1)*boxH/2}px) scale(${k}) ${pivot}rotate(${tilt}rad)${unpivot}`;
 }
 function apply(state){lastState=state;place(state);}
 // Hysteresis: drop to capped the moment tracking is slow; only climb back out after minPoseHz has held
 // for recoverMs straight, so a set hovering near the threshold doesn't flip the cap on and off. Flips the
 // creature viewer's own render cap on transitions only (not every pose event).
 function updateCap(counting,now){
  const was=capped;
  if(!counting){capped=false;aboveSince=null;}
  else{
   const rate=window.myr5TestState?.rate;
   if(Number.isFinite(rate)&&rate<COACH_CAP.minPoseHz){capped=true;aboveSince=null;}
   else{
    if(aboveSince===null)aboveSince=now;
    if(capped&&now-aboveSince>=COACH_CAP.recoverMs)capped=false;
   }
  }
  if(capped!==was)window.myr5Creature?.setMaxFps?.(capped?COACH_CAP.fps:null);
 }
 function onPose(event){
  if(!tracking||!motion||!box)return;
  const {points,width,height,mirrored,now,counting}=event.detail;
  if(counting&&!begun){begun=true;motion.begin();}
  updateCap(counting,now);
  // The WebGL cap above covers the render cost; this also skips this pose sample's own DOM writes and
  // coach-hit math (still real-time, not frame-count, so a capped coach covers the same ground in fewer,
  // bigger steps) since that work runs inline in the tracking loop's call stack too.
  if(capped&&now-lastRenderAt<1000/COACH_CAP.fps)return;
  lastRenderAt=now;
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
