import {createEcosystem} from './ecosystem.mjs';
import {renderEcosystem} from './render.mjs';
import {createBlizzard,renderBlizzard} from './blizzard.mjs';
import {createOverlayCanvas,mapPointsToOverlay} from '../workout-effects.mjs';

const LOGICAL_WIDTH=360;
export function mountCameraHold({host,sound=()=>{},onXp=()=>{},seed=Date.now(),style='living'}={}){
 if(!host)throw new TypeError('A camera overlay host is required.');
 const holdStyle=style==='blizzard'?'blizzard':'living';
 const layer=createOverlayCanvas(host,'hold-ecosystem-canvas',{opacity:.3}),canvas=layer.canvas,ctx=canvas.getContext('2d',{alpha:true});
 let engine=null,w=LOGICAL_WIDTH,h=1,raf=0,lastFrame=0,lastPose=null,disposed=false,resizeObserver=null;
 function resize(){
  if(disposed)return;const rect=host.getBoundingClientRect();if(!(rect.width>0&&rect.height>0))return;
  layer.resize();const nextH=Math.max(1,Math.round(LOGICAL_WIDTH*rect.height/rect.width));
  const changed=!engine||nextH!==h;w=LOGICAL_WIDTH;h=nextH;
  if(changed){engine?.reset();engine=holdStyle==='blizzard'?createBlizzard({w,h,seed}):createEcosystem({w,h,seed});}
  ctx.setTransform(canvas.width/w,0,0,canvas.height/h,0,0);ctx.imageSmoothingEnabled=false;
 }
 function map(detail){
  const rect=host.getBoundingClientRect();return mapPointsToOverlay(detail.points,{videoWidth:detail.width,videoHeight:detail.height,hostWidth:w,hostHeight:h,mirrored:detail.mirrored,hostCssWidth:rect.width,hostCssHeight:rect.height});
 }
 function paint(now){
  if(disposed)return;const dt=lastFrame?Math.max(0,(now-lastFrame)/1000):0;lastFrame=now;
  engine.step(dt);ctx.setTransform(canvas.width/w,0,0,canvas.height/h,0,0);ctx.clearRect(0,0,w,h);(holdStyle==='blizzard'?renderBlizzard:renderEcosystem)(ctx,engine.state);
  raf=requestAnimationFrame(paint);
 }
 resize();
 if(typeof ResizeObserver==='function'){resizeObserver=new ResizeObserver(resize);resizeObserver.observe(host);}else window.addEventListener('resize',resize);
 raf=requestAnimationFrame(paint);
 function pose(detail={}){
  if(disposed)return;
  resize();const points=map(detail);lastPose={points,now:detail.now,validHold:!!detail.validHold,mode:detail.workout?.mode};
  engine.pose(lastPose);
 }
 function invalidate(){if(!disposed&&engine){lastPose={points:lastPose?.points,now:lastPose?.now,validHold:false};engine.pose({validHold:false});}}
 function stop(){if(disposed)return;disposed=true;cancelAnimationFrame(raf);resizeObserver?.disconnect();window.removeEventListener('resize',resize);engine?.reset();layer.dispose();}
 return {get engine(){return engine;},pose,stop,invalidate};
}
