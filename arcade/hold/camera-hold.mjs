import {createEcosystem} from './ecosystem.mjs';
import {renderEcosystem} from './render.mjs';
import {createBlizzard,renderBlizzard} from './blizzard.mjs';
import {renderPower,preloadAura} from '../power/power.mjs';
import {createGrowth,AURA_TUNING} from '../power/aura-growth.mjs';
export {preloadAuraForMode} from '../power/power.mjs';
const AURA_LAYER_OPACITY=AURA_TUNING.LAYER_OPACITY;
import {EFFECT_OPTION_BY_ID,effectGroupForExercise,readEffectChoices,resolveExerciseEffect} from '../power/aura-options.mjs';
import {createOverlayCanvas,mapPointsToOverlay} from '../workout-effects.mjs';

const LOGICAL_WIDTH=360;
function randomFor(seed=1){let value=(Number(seed)>>>0)||0x9e3779b9;return()=>{value^=value<<13;value^=value>>>17;value^=value<<5;return(value>>>0)/0x100000000;};}
export function mountCameraHold({host,sound=()=>{},onXp=()=>{},seed=Date.now(),style='living',mode=null}={}){
 if(!host)throw new TypeError('A camera overlay host is required.');
 const holdStyle=style==='blizzard'?'blizzard':'living';
 const layer=createOverlayCanvas(host,'hold-ecosystem-canvas',{opacity:AURA_LAYER_OPACITY,max:1}),canvas=layer.canvas,ctx=canvas.getContext('2d',{alpha:true});
 const growth=createGrowth();let poseAt=-Infinity,holdValid=false;
 let engine=null,w=LOGICAL_WIDTH,h=1,raf=0,lastFrame=0,lastPose=null,disposed=false,resizeObserver=null,selectedMode=mode,effectChoices=readEffectChoices();
 const random=randomFor(seed);let selectedEffect=resolveExerciseEffect(selectedMode,effectChoices,random);preloadAura(selectedEffect);
 const createEngine=()=>holdStyle==='blizzard'?createBlizzard({w,h,seed,stillSeconds:AURA_TUNING.HOLD_FIRST_S}):createEcosystem({w,h,seed,stillSeconds:AURA_TUNING.HOLD_FIRST_S,ecology:EFFECT_OPTION_BY_ID.get(selectedEffect)?.ecology??null});
 function resize(){
  if(disposed)return;const rect=host.getBoundingClientRect();if(!(rect.width>0&&rect.height>0))return;
  layer.resize();const nextH=Math.max(1,Math.round(LOGICAL_WIDTH*rect.height/rect.width));
  const changed=!engine||nextH!==h;w=LOGICAL_WIDTH;h=nextH;
  if(changed){engine?.reset();engine=createEngine();}
  ctx.setTransform(canvas.width/w,0,0,canvas.height/h,0,0);ctx.imageSmoothingEnabled=false;
 }
 function map(detail){
  const rect=host.getBoundingClientRect();return mapPointsToOverlay(detail.points,{videoWidth:detail.width,videoHeight:detail.height,hostWidth:w,hostHeight:h,mirrored:detail.mirrored,hostCssWidth:rect.width,hostCssHeight:rect.height});
 }
 function paint(now){
  if(disposed)return;const dt=lastFrame?Math.max(0,(now-lastFrame)/1000):0;lastFrame=now;
  engine.step(dt);growth.step(dt);ctx.setTransform(canvas.width/w,0,0,canvas.height/h,0,0);ctx.clearRect(0,0,w,h);
  const option=EFFECT_OPTION_BY_ID.get(selectedEffect),fade=holdStyle==='blizzard'
    ? Math.max(0,...(engine.state.iceEdges??[]).map(edge=>edge.alpha??0),...(engine.state.snow??[]).map(flake=>flake.alpha??0))
    : Math.max(0,...(engine.state.entities??[]).map(entity=>entity.alpha??0));
  if(option?.ecology)renderEcosystem(ctx,engine.state);
  else if(holdStyle==='blizzard'&&selectedEffect==='blizzard')renderBlizzard(ctx,engine.state);
  else if(option?.asset&&holdValid&&now-poseAt<1000){
   // Sheet auras grow on the shared hold clock (visible at once), not on the slow ecology spawn.
   renderPower(ctx,{w,h,route:'aura',active:true,level:growth.state.level,pulse:0,contacts:[],points:lastPose?.points??[],time:now/1000,effect:selectedEffect});
  }
  raf=requestAnimationFrame(paint);
 }
 resize();
 if(typeof ResizeObserver==='function'){resizeObserver=new ResizeObserver(resize);resizeObserver.observe(host);}else window.addEventListener('resize',resize);
 raf=requestAnimationFrame(paint);
 function pose(detail={}){
  if(disposed)return;
  resize();const points=map(detail),nextMode=detail.workout?.mode??selectedMode;
  if(nextMode!==selectedMode){selectedMode=nextMode;selectedEffect=resolveExerciseEffect(selectedMode,effectChoices,random);preloadAura(selectedEffect);engine?.reset();engine=createEngine();}
  lastPose={points,now:detail.now,validHold:!!detail.validHold,mode:selectedMode};
  poseAt=performance.now();holdValid=lastPose.validHold;
  if(holdValid)growth.update({now:detail.now,points,kind:'hold',valid:true});else growth.reset();
  engine.pose(lastPose);
 }
 function invalidate(){holdValid=false;growth.reset();if(!disposed&&engine){lastPose={points:lastPose?.points,now:lastPose?.now,validHold:false};engine.pose({validHold:false});}}
 function choiceChanged(event){if(disposed)return;const group=effectGroupForExercise(selectedMode),before=group?effectChoices[group]:null;effectChoices=readEffectChoices();if(event?.detail?.group&&event.detail.group!==group)return;if(!event?.detail?.group&&group&&before===effectChoices[group])return;const next=resolveExerciseEffect(selectedMode,effectChoices,random);if(next===selectedEffect)return;selectedEffect=next;preloadAura(next);engine?.reset();engine=createEngine();if(lastPose)engine.pose(lastPose);}
 globalThis.addEventListener?.('myr5:exercise-effect-choice-change',choiceChanged);
 const storageChanged=event=>{if(event?.key==='myr5-exercise-effect-choices-v1')choiceChanged();};
 globalThis.addEventListener?.('storage',storageChanged);
 function stop(){if(disposed)return;disposed=true;cancelAnimationFrame(raf);resizeObserver?.disconnect();window.removeEventListener('resize',resize);globalThis.removeEventListener?.('myr5:exercise-effect-choice-change',choiceChanged);globalThis.removeEventListener?.('storage',storageChanged);engine?.reset();layer.dispose();}
 return {get engine(){return engine;},pose,stop,invalidate,get effect(){return selectedEffect;}};
}
