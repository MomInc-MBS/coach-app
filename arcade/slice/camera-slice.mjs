// Camera-workout overlay for the slice engine: the MOM Inc. gun fires barrels at you, tracked limbs slice or explode them.
// Lazy: app.mjs imports this only for martial arts and holds (external in scripts/build.mjs, optional asset).
import {createSlice,render,pathKind} from './core.mjs';
import {createHandGlow,renderHandGlow} from './hand-glow.mjs';
import {createQuestProgressReporter} from '../quest-progress-reporter.mjs';
const LIMBS=[13,14,15,16,25,26,27,28]; // elbows, wrists, knees, ankles
const BODY=[11,12,23,24,15,16,27,28];
const FAST=.9,SEEN=.4; // screen heights per second a limb must travel; ponytail: one fixed gate, tune on device
const W=180;
export function createFruitStreakReporter(ownerId,load=()=>import('../../modules/vault/quest-progress.mjs')){
 const reporter=createQuestProgressReporter(ownerId,{load});
 return n=>reporter.record('fruit-streak',n);
}
function toScreen(p,{width,height,mirrored}){ // same mapping as coach-overlay videoToScreen
 const sw=innerWidth,sh=innerHeight,k=Math.min(sw/width,sh/height),ox=(sw-width*k)/2,oy=(sh-height*k)/2,px=mirrored?1-p.x:p.x;
 return {x:(ox+px*width*k)/sw,y:(oy+p.y*height*k)/sh,v:p.visibility??0};
}
export function mountCameraSlice({host,mode='martial',sound=()=>{},onXp=()=>{},ownerId=null,seed=Date.now()}){
 const H=Math.round(W*innerHeight/innerWidth),canvas=document.createElement('canvas');
 canvas.width=W;canvas.height=H;canvas.className='slice-canvas';canvas.setAttribute('aria-hidden','true');
 canvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;image-rendering:pixelated;pointer-events:none';host.append(canvas);
 const g=canvas.getContext('2d');
 const e=createSlice({w:W,h:H,seed,mode,strikes:mode==='martial',onEvent(type,d){
  if(type==='hit')sound(d.kind==='slice'?'barrel-split':d.type==='barrel-fuel'||d.type==='barrel-toxic'?'blast-big':'blast');
  else if(type==='shot')sound('gun-shot');else if(type==='gun-aim')sound('gun-arm');else if(type==='chain')sound('blast');
  else if(type==='bonus'){sound('dial');onXp(d.xp);}
  else if(type==='combo'){sound('lever');reportStreak(d.n);}else if(type==='strike')sound('jelly');
  else if(type==='laser-aim')sound('crt');else if(type==='laser-shield')sound('switch');else if(type==='laser-hit')sound('main-control');
 }});
 const reportStreak=createFruitStreakReporter(ownerId);
 const hist=new Map(),prevBody={pts:null,t:0},handGlow=createHandGlow();let last=performance.now(),raf=0,laserIn=7,counting=false,body={x:W/2,y:H*.6};
 const onVisibility=()=>{if(document.visibilityState==='hidden')handGlow.clear();};document.addEventListener('visibilitychange',onVisibility);
 function frame(now){
  raf=requestAnimationFrame(frame);const dt=Math.min(.05,(now-last)/1000);last=now;
  if(counting){laserIn-=dt;if(laserIn<=0&&e.laserStart(body.x,body.y)){laserIn=9+Math.random()*6;}}
  e.step(dt);
  const effectStart=performance.now();handGlow.step(dt,now);
  render(g,e,{pointerTrail:false});
  renderHandGlow(g,handGlow.state);handGlow.measure(performance.now()-effectStart,now);
 }
 raf=requestAnimationFrame(frame);
 return {
  engine:e,
  pose(detail){
   const {points,now}=detail;counting=!!detail.counting;if(!points){handGlow.pose(null);return;}
   const sp=points.map(p=>toScreen(p,detail)),toL=p=>({x:p.x*W,y:p.y*H});
   handGlow.pose(points,{now:now??performance.now(),mapPoint:p=>toL(toScreen(p,detail))});
   // whole-body motion, screen heights per second, feeds the laser's stillness test
   const t=(now??performance.now())/1000,pb=BODY.map(i=>sp[i]);
   if(prevBody.pts&&t>prevBody.t){let s=0,n=0;BODY.forEach((_,k)=>{if(pb[k].v>SEEN&&prevBody.pts[k].v>SEEN){s+=Math.hypot(pb[k].x-prevBody.pts[k].x,pb[k].y-prevBody.pts[k].y);n++;}});if(n)e.feedMotion(s/n/(t-prevBody.t));}
   prevBody.pts=pb;prevBody.t=t;
   const core=[11,12,23,24].map(i=>sp[i]).filter(p=>p.v>SEEN);if(core.length)body=toL({x:core.reduce((a,p)=>a+p.x,0)/core.length,y:core.reduce((a,p)=>a+p.y,0)/core.length});
   if(mode==='hold'){ // holds: any visible landmark touching a falling bonus item scores
    sp.forEach((p,i)=>{if(i>0&&p.v>SEEN){const q=toL(p);e.hitSegment(q,q,{kind:'explode',pad:6});}});return;
   }
   for(const i of LIMBS){
    const p=sp[i];if(p.v<SEEN){hist.delete(i);continue;}
    const q=toL(p),h=hist.get(i)||[];h.push({...q,t});if(h.length>6)h.shift();hist.set(i,h);
    if(h.length<2)continue;const a=h[h.length-2],dtp=t-a.t;
    const spd=dtp>0?Math.hypot(q.x-a.x,q.y-a.y)/H/dtp:0;if(dtp<=0||dtp>.5||spd<FAST)continue;
    e.addTrail(a.x,a.y);e.addTrail(q.x,q.y);
    e.hitSegment(a,q,{kind:pathKind(h),pad:4,speed:spd});
   }
  },
  stop(){cancelAnimationFrame(raf);document.removeEventListener('visibilitychange',onVisibility);handGlow.clear();canvas.remove();}
 };
}
