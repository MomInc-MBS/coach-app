// Shared AR geometry and lazy wrapper lifecycle for optional workout effects.
// Landmark coordinates stay normalized; geometry is mapped to the overlay that owns the video.
export {workoutEffectsSnapshot} from './workout-effects-state.mjs';
import {holdStyleForExercise,createOptionalRetry,createOptionalModuleLoader} from './workout-effects-state.mjs';
import {EXERCISES} from '../exercise-library.mjs';
const loadCameraHoldModule=createOptionalModuleLoader('/arcade/hold/camera-hold.mjs');
const loadCameraPowerModule=createOptionalModuleLoader('/arcade/power/camera-power.mjs');
export function mapPointToOverlay(point,{videoWidth,videoHeight,hostWidth,hostHeight,mirrored=false}={}){
 if(!point||![point.x,point.y,videoWidth,videoHeight,hostWidth,hostHeight].every(Number.isFinite)||videoWidth<=0||videoHeight<=0||hostWidth<=0||hostHeight<=0)return null;
 const scale=Math.min(hostWidth/videoWidth,hostHeight/videoHeight),renderedWidth=videoWidth*scale,renderedHeight=videoHeight*scale;
 const offsetX=(hostWidth-renderedWidth)/2,offsetY=(hostHeight-renderedHeight)/2,px=mirrored?1-point.x:point.x;
 return {x:(offsetX+px*renderedWidth)/hostWidth,y:(offsetY+point.y*renderedHeight)/hostHeight,visibility:Number.isFinite(point.visibility)?point.visibility:0};
}

export function mapPointsToOverlay(points,geometry){
 return Array.isArray(points)?points.map(point=>mapPointToOverlay(point,geometry)):null;
}

export function createOverlayCanvas(host,className,{opacity=.3}={}){
 const canvas=document.createElement('canvas');canvas.className=className;canvas.setAttribute('aria-hidden','true');
 canvas.style.cssText=`position:absolute;inset:0;width:100%;height:100%;image-rendering:pixelated;pointer-events:none;z-index:0;opacity:${Math.max(0,Math.min(.3,opacity))}`;
 const resize=()=>{const rect=host.getBoundingClientRect();const dpr=Math.min(2,window.devicePixelRatio||1),w=Math.max(1,Math.round(rect.width*dpr)),h=Math.max(1,Math.round(rect.height*dpr));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}};
 host.prepend(canvas);resize();const observer=typeof ResizeObserver==='function'?new ResizeObserver(resize):null;observer?.observe(host);
 return {canvas,resize,dispose(){observer?.disconnect();canvas.remove();}};
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
   if(!ecologyLoading){if(!holdRetry.canStart())return null;holdRetry.start();const style=selectedHoldStyle;const pending=(async()=>{const mod=await (loaders.hold?loaders.hold(style):loadCameraHoldModule());holdRetry.succeed();if(stopped||token!==epoch||loadGeneration!==holdGeneration||style!==selectedHoldStyle||!lastDetail?.workout?.active)return null;ecology=mod.mountCameraHold({host,sound,onXp:()=>{},seed,style});return ecology;})();ecologyLoading=pending;pending.catch(()=>{if(ecologyLoading===pending&&token===epoch&&loadGeneration===holdGeneration){holdRetry.fail();ecologyLoading=null;}});}
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
  }else if(workout.kind==='reps'){
   ecology?.invalidate();
   if(power){power.pose(detail);return;}
   const loadGeneration=powerGeneration;void ensure('power',token,loadGeneration).then(instance=>{if(instance&&token===epoch&&loadGeneration===powerGeneration&&session===sessionKey&&lastDetail?.workout?.active)instance.pose(lastDetail);}).catch(()=>{});
  }else{ecology?.invalidate();power?.invalidate();}
 }
 function stop(){if(stopped)return;stopped=true;drop();}
 function setHoldStyle(style){const next=style===null?null:style==='blizzard'?'blizzard':'living';if(next===selectedHoldStyle)return selectedHoldStyle;selectedHoldStyle=next;dropHold();return selectedHoldStyle;}
 return {pose,stop,invalidate,setHoldStyle,get holdStyle(){return selectedHoldStyle;},get active(){return !!(ecology||power);}};
}
