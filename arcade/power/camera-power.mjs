import {createPower,renderPower} from './power.mjs';
import {AURA_TUNING} from './aura-growth.mjs';
export {preloadAuraForMode} from './power.mjs';
const AURA_LAYER_OPACITY=AURA_TUNING.LAYER_OPACITY;
import {createOverlayCanvas,mapPointsToOverlay} from '../workout-effects.mjs';

const LOGICAL_WIDTH=360,MAX_GAIN=.045;
function makeCue(sound,payload){
 if(!sound?.voice||!sound?.tone)return null;
 const intensity=Math.max(0,Math.min(1,Number(payload?.intensity)||0));
 const level=MAX_GAIN*(.35+.65*intensity),route=payload?.route;
 const start=route==='lightning'?520:route==='floor'?180:260,end=route==='lightning'?860:route==='floor'?260:420;
 return sound.voice('workout-power',.2,args=>sound.tone(args,start,.16,level,route==='floor'?'triangle':'sine',end));
}

export function mountCameraPower({host,sound,seed=Date.now()}={}){
 if(!host)throw new TypeError('A camera overlay host is required.');
 const layer=createOverlayCanvas(host,'workout-power-canvas',{opacity:AURA_LAYER_OPACITY,max:1}),canvas=layer.canvas,ctx=canvas.getContext('2d',{alpha:true});
 let engine=null,w=LOGICAL_WIDTH,h=1,raf=0,lastFrame=0,disposed=false,resizeObserver=null,voice=null;
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
  if(disposed)return;const dt=lastFrame?Math.max(0,(now-lastFrame)/1000):0;lastFrame=now;
  engine.step(dt);ctx.setTransform(canvas.width/w,0,0,canvas.height/h,0,0);ctx.clearRect(0,0,w,h);renderPower(ctx,engine.state);
  if(engine.state.active)canvas.style.display='block';else canvas.style.display='none';
  raf=requestAnimationFrame(paint);
 }
 resize();
 if(typeof ResizeObserver==='function'){resizeObserver=new ResizeObserver(resize);resizeObserver.observe(host);}else window.addEventListener('resize',resize);
 raf=requestAnimationFrame(paint);
 function pose(detail={}){
  if(disposed)return;resize();
  const rect=host.getBoundingClientRect(),points=mapPointsToOverlay(detail.points,{videoWidth:detail.width,videoHeight:detail.height,hostWidth:w,hostHeight:h,mirrored:detail.mirrored,hostCssWidth:rect.width,hostCssHeight:rect.height});
  engine.pose({points,now:detail.now,workout:{...detail.workout,validHold:!!detail.validHold}});
  if(detail.workout?.active)canvas.style.display='block';else{stopVoice();canvas.style.display='none';}
 }
 function invalidate(){if(disposed)return;engine.invalidate();stopVoice();canvas.style.display='none';}
 function stop(){if(disposed)return;disposed=true;cancelAnimationFrame(raf);resizeObserver?.disconnect();window.removeEventListener('resize',resize);stopVoice();engine?.reset();layer.dispose();}
 return {get engine(){return engine;},pose,stop,invalidate};
}
