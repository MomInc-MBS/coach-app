import {createPower,renderPower} from './power.mjs';
import {AURA_TUNING} from './aura-growth.mjs';
import {createAuraBody} from './aura-body.mjs';
export {preloadAuraForMode} from './power.mjs';
const AURA_LAYER_OPACITY=AURA_TUNING.LAYER_OPACITY;
import {createOverlayCanvas,mapPointsToOverlay,effectQuality} from '../workout-effects.mjs';

const LOGICAL_WIDTH=360,MAX_GAIN=.045;
function makeCue(sound,payload){
 if(!sound?.voice||!sound?.tone)return null;
 const intensity=Math.max(0,Math.min(1,Number(payload?.intensity)||0));
 const level=MAX_GAIN*(.35+.65*intensity),route=payload?.route;
 const start=route==='lightning'?520:route==='floor'?180:260,end=route==='lightning'?860:route==='floor'?260:420;
 return sound.voice('workout-power',.2,args=>sound.tone(args,start,.16,level,route==='floor'?'triangle':'sine',end));
}

export function mountCameraPower({host,sound,seed=Date.now(),quality=effectQuality}={}){
 if(!host)throw new TypeError('A camera overlay host is required.');
 const layer=createOverlayCanvas(host,'workout-power-canvas',{opacity:AURA_LAYER_OPACITY,max:1}),canvas=layer.canvas,ctx=canvas.getContext('2d',{alpha:true});
 // Glow under the sprites; both draw from the same filtered + predicted landmarks so they stay on the body together.
 const body=createAuraBody({host,quality});
 let engine=null,w=LOGICAL_WIDTH,h=1,raf=0,lastFrame=0,disposed=false,resizeObserver=null,voice=null;
 const shown={active:false};let fade=0; // last active engine state, kept to fade out instead of a hard clear
 const stopVoice=()=>{voice?.stop?.(.025);voice=null;};
 function makeEngine(){engine=createPower({w,h,seed,onEvent(type,payload){if(type==='pulse'){stopVoice();voice=makeCue(sound,payload);}}});}
 function resize(){
  if(disposed)return;const rect=host.getBoundingClientRect();if(!(rect.width>0&&rect.height>0))return;
  layer.resize();const nextH=Math.max(1,Math.round(LOGICAL_WIDTH*rect.height/rect.width));
  const changed=!engine||nextH!==h;w=LOGICAL_WIDTH;h=nextH;
  if(changed){stopVoice();engine?.reset();makeEngine();}
  ctx.setTransform(canvas.width/w,0,0,canvas.height/h,0,0);ctx.imageSmoothingEnabled=false;
 }
 function paint(now){
  if(disposed)return;const dt=lastFrame?Math.max(0,(now-lastFrame)/1000):0;
  if(lastFrame)quality.frame(now-lastFrame);lastFrame=now;
  engine.step(dt);
  const state=engine.state;if(state.active)Object.assign(shown,state);
  const points=body.points(now);
  fade=body.draw(now,state,points);
  ctx.setTransform(canvas.width/w,0,0,canvas.height/h,0,0);ctx.clearRect(0,0,w,h);
  if(fade>0&&shown.active){shown.time=state.time;shown.pulse=state.active?state.pulse:0;renderPower(ctx,shown,{points,alpha:fade});}
  canvas.style.display=fade>0?'block':'none';
  raf=requestAnimationFrame(paint);
 }
 resize();
 if(typeof ResizeObserver==='function'){resizeObserver=new ResizeObserver(resize);resizeObserver.observe(host);}else window.addEventListener('resize',resize);
 raf=requestAnimationFrame(paint);
 function pose(detail={}){
  if(disposed)return;resize();
  const geometry={videoWidth:detail.width,videoHeight:detail.height,hostWidth:w,hostHeight:h,mirrored:detail.mirrored};
  const points=mapPointsToOverlay(detail.points,geometry);
  engine.pose({points,now:detail.now,workout:{...detail.workout,validHold:!!detail.validHold}});
  body.pose(points,Number.isFinite(detail.frameMs)?detail.frameMs:detail.now,detail.mask,geometry);
  if(!detail.workout?.active)stopVoice();
 }
 function invalidate(){if(disposed)return;engine.invalidate();stopVoice();}
 function stop(){if(disposed)return;disposed=true;cancelAnimationFrame(raf);resizeObserver?.disconnect();window.removeEventListener('resize',resize);stopVoice();engine?.reset();body.dispose();layer.dispose();}
 return {get engine(){return engine;},get body(){return body;},pose,stop,invalidate};
}
