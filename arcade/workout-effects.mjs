// Shared AR geometry and lazy wrapper lifecycle for optional workout effects.
// Landmark coordinates stay normalized; geometry is mapped to the overlay that owns the video.
export {workoutEffectsSnapshot} from './workout-effects-state.mjs';
import {holdStyleForExercise,createOptionalRetry,createOptionalModuleLoader} from './workout-effects-state.mjs';
export {mapPointToOverlay,mapPointsToOverlay,videoRectInOverlay} from './workout-effects-state.mjs';
import {EXERCISES} from '../exercise-library.mjs';
const loadCameraHoldModule=createOptionalModuleLoader('/arcade/hold/camera-hold.mjs');
const loadCameraPowerModule=createOptionalModuleLoader('/arcade/power/camera-power.mjs');
export function createOverlayCanvas(host,className,{opacity=.3,max=.3}={}){
 const canvas=document.createElement('canvas');canvas.className=className;canvas.setAttribute('aria-hidden','true');
 canvas.style.cssText=`position:absolute;inset:0;width:100%;height:100%;image-rendering:pixelated;pointer-events:none;z-index:0;opacity:${Math.max(0,Math.min(max,opacity))}`;
 const resize=()=>{const rect=host.getBoundingClientRect();const dpr=Math.min(2,window.devicePixelRatio||1),w=Math.max(1,Math.round(rect.width*dpr)),h=Math.max(1,Math.round(rect.height*dpr));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}};
 host.prepend(canvas);resize();const observer=typeof ResizeObserver==='function'?new ResizeObserver(resize):null;observer?.observe(host);
 return {canvas,resize,dispose(){observer?.disconnect();canvas.remove();}};
}

/** Warm the right renderer module and sprite sheets for an exercise before its set starts. */
export function preloadWorkoutEffects(mode){
 const ex=EXERCISES[mode];if(!ex)return;
 const stance=ex.kind==='hold'&&ex.group!=='stances';
 (stance?loadCameraHoldModule():loadCameraPowerModule()).then(m=>m.preloadAuraForMode?.(mode)).catch(()=>{});
 if(ex.kind==='hold')loadCameraPowerModule().then(m=>m.preloadAuraForMode?.(mode)).catch(()=>{});
}
export function mountWorkoutEffects({host,sound=()=>{},seed=1,loaders={},retryOptions}={}){
 let ecology=null,power=null,ecologyLoading=null,powerLoading=null,session=null,stopped=false,epoch=0,holdGeneration=0,powerGeneration=0,lastDetail=null,selectedHoldStyle='living';
 const holdRetry=createOptionalRetry(retryOptions),powerRetry=createOptionalRetry(retryOptions);
 const dropHold=()=>{holdGeneration++;holdRetry.reset();ecology?.stop();ecology=null;ecologyLoading=null;};
 const drop=()=>{epoch++;dropHold();powerGeneration++;powerRetry.reset();power?.stop();power=null;powerLoading=null;session=null;lastDetail=null;};
 function invalidate(){holdGeneration++;powerGeneration++;holdRetry.reset();powerRetry.reset();ecologyLoading=powerLoading=null;ecology?.invalidate();power?.invalidate();}
 async function ensure(kind,token,loadGeneration){
  if(stopped||token!==epoch)return null;
  if(kind==='hold'){
   if(ecology)return ecology;
   if(!ecologyLoading){if(!holdRetry.canStart())return null;holdRetry.start();const style=selectedHoldStyle;const pending=(async()=>{const mod=await (loaders.hold?loaders.hold(style):loadCameraHoldModule());holdRetry.succeed();if(stopped||token!==epoch||loadGeneration!==holdGeneration||style!==selectedHoldStyle||!lastDetail?.workout?.active)return null;ecology=mod.mountCameraHold({host,sound,onXp:()=>{},seed,style,mode:lastDetail?.workout?.mode});return ecology;})();ecologyLoading=pending;pending.catch(()=>{if(ecologyLoading===pending&&token===epoch&&loadGeneration===holdGeneration){holdRetry.fail();ecologyLoading=null;}});}
   return ecologyLoading;
  }
  if(power)return power;
  if(!powerLoading){if(!powerRetry.canStart())return null;powerRetry.start();const pending=(async()=>{const mod=await (loaders.power?loaders.power():loadCameraPowerModule());powerRetry.succeed();if(stopped||token!==epoch||loadGeneration!==powerGeneration||!lastDetail?.workout?.active)return null;power=mod.mountCameraPower({host,sound,seed});return power;})();powerLoading=pending;pending.catch(()=>{if(powerLoading===pending&&token===epoch&&loadGeneration===powerGeneration){powerRetry.fail();powerLoading=null;}});}
  return powerLoading;
 }
 function pose(detail){
  if(stopped)return;
  const workout=detail?.workout||{},key=workout.sessionId;
  lastDetail=detail;
  if(key==null||!workout.active){invalidate();if(workout.kind==='hold'&&ecology)ecology.pose(detail);return;}
  const sessionKey=`${key}:${workout.mode??''}`;
  if(session!==sessionKey){drop();session=sessionKey;lastDetail=detail;}
  const token=epoch;
  if(workout.kind==='hold'){
   const style=holdStyleForExercise(EXERCISES[workout.mode]);if(style!==selectedHoldStyle)setHoldStyle(style);
   if(selectedHoldStyle&&ecology)ecology.pose(detail);else if(selectedHoldStyle){const loadGeneration=holdGeneration;void ensure('hold',token,loadGeneration).then(instance=>{if(instance&&token===epoch&&loadGeneration===holdGeneration&&session===sessionKey&&lastDetail?.workout?.active)instance.pose(lastDetail);}).catch(()=>{});}
   if(selectedHoldStyle==='blizzard'){power?.invalidate();return;}
   if(power)power.pose(detail);else{const loadGeneration=powerGeneration;void ensure('power',token,loadGeneration).then(instance=>{if(instance&&token===epoch&&loadGeneration===powerGeneration&&session===sessionKey&&lastDetail?.workout?.active)instance.pose(lastDetail);}).catch(()=>{});}
  }else if(['reps','gentle','sprint'].includes(workout.kind)){
   ecology?.invalidate();
   if(power){power.pose(detail);return;}
   const loadGeneration=powerGeneration;void ensure('power',token,loadGeneration).then(instance=>{if(instance&&token===epoch&&loadGeneration===powerGeneration&&session===sessionKey&&lastDetail?.workout?.active)instance.pose(lastDetail);}).catch(()=>{});
  }else{ecology?.invalidate();power?.invalidate();}
 }
 function stop(){if(stopped)return;stopped=true;drop();}
 function setHoldStyle(style){const next=style===null?null:style==='blizzard'?'blizzard':'living';if(next===selectedHoldStyle)return selectedHoldStyle;selectedHoldStyle=next;dropHold();return selectedHoldStyle;}
 return {pose,stop,invalidate,setHoldStyle,get holdStyle(){return selectedHoldStyle;},get active(){return !!(ecology||power);}};
}

// Shared frame-time monitor for the camera effect layers (power, hold, slice can all report into it).
// Q3 silhouette mask + wisps, Q2 bone glow + flame particles, Q1 bone glow only, Q0 sprites only.
// Rolling mean of rAF frame intervals: step down when it passes DOWN_MS, step up after UP_HOLD_MS under UP_MS.
// Q3 must be earned (start at START) and once dropped from Q3 the session stays at Q2 or below.
export const EFFECT_QUALITY=Object.freeze({START:2,MAX:3,WINDOW:60,DOWN_MS:28,UP_MS:20,UP_HOLD_MS:3000,DOWN_HOLD_MS:500,SESSION_CAP_MS:5000,SESSION_CAP_FPS_MS:50});
export function createQualityMonitor(T=EFFECT_QUALITY){
 const ring=new Float32Array(T.WINDOW);let n=0,i=0,sum=0,tier=T.START,cap=T.MAX,goodFor=0,badFor=0,slowFor=0,pinned=null;const listeners=new Set();
 const set=next=>{next=Math.max(0,Math.min(cap,next));if(next===tier)return;const prev=tier;tier=next;goodFor=badFor=0;for(const fn of listeners)try{fn(tier,prev);}catch{}};
 return {
  frame(ms){
   if(pinned!=null||!(ms>0)||ms>250)return tier; // pinned (debug), tab switches and first frames are not frame cost
   sum-=n===T.WINDOW?ring[i]:0;ring[i]=ms;sum+=ms;i=(i+1)%T.WINDOW;if(n<T.WINDOW)n++;
   const avg=sum/n;if(n<Math.min(15,T.WINDOW))return tier;
   if(avg>T.DOWN_MS){badFor+=ms;goodFor=0;if(badFor>=T.DOWN_HOLD_MS){if(tier===3)cap=2;set(tier-1);}}
   else if(avg<T.UP_MS){goodFor+=ms;badFor=0;if(goodFor>=T.UP_HOLD_MS)set(tier+1);}
   else{goodFor=0;badFor=0;}
   if(avg>T.SESSION_CAP_FPS_MS){slowFor+=ms;if(slowFor>=T.SESSION_CAP_MS){cap=Math.max(0,Math.min(cap,tier)-1);slowFor=0;set(tier);}}else slowFor=0;
   return tier;
  },
  get tier(){return tier;},get average(){return n?sum/n:0;},get cap(){return cap;},
  onChange(fn){listeners.add(fn);return()=>listeners.delete(fn);},
  /** Debug / test: hold a tier (0..3), or null to let the ladder run again. */
  pin(next=null){pinned=next==null?null:Math.max(0,Math.min(T.MAX,next|0));if(pinned!=null){const keep=cap;cap=T.MAX;set(pinned);cap=keep;}},
  reset(){n=i=0;sum=0;tier=T.START;cap=T.MAX;goodFor=badFor=slowFor=0;ring.fill(0);}
 };
}
export const effectQuality=createQualityMonitor();
globalThis.myr5EffectQuality=effectQuality;
// Phone debugging: ?auraq=0..3 holds a quality tier for the session.
try{const q=new URLSearchParams(globalThis.location?.search??'').get('auraq');if(q!=null&&q!=='')effectQuality.pin(Number(q));}catch{}
