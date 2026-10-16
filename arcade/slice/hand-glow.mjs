// Camera-workout hand light trails. Pose landmarks still drive Fruit Ninja collisions unchanged; this
// module only paints: One Euro wrists + damped prediction, a time-stamped ring buffer per hand, centripetal
// Catmull-Rom, a tapered filled ribbon in three additive layers, speed-gated emission with hysteresis,
// punch impacts (flash, ring, sparks) and alpha fades instead of hard deletes.
// Coordinates: pose() takes points mapped to the overlay host as 0..1 fractions (workout-effects mapper);
// renderHandGlow() scales them to the canvas logical size (CSS px).
import {createLandmarkBank,PRESETS} from '../one-euro.mjs';

// Tuning knobs (real phones need tuning). Speeds are body-heights per second; widths are fractions of body height.
export const TRAIL_TUNING=Object.freeze({
 MAX_PTS:32, LIFE_MS:420, SUBDIV:4,
 GATE_ON:1.2, GATE_OFF:.7, EMIT_OFF_MS:150, SPEED_FULL:2.5,
 BASE_W:.022, HEAD_BOOST:1.3,
 LAYERS:[[2.6,.2],[1.3,.65],[.42,1]],  // [width x, alpha x]: wide soft, mid colour, white core
 PREDICT_MAX:.1,                     // max prediction lead, body heights
 VIS_FADE_MS:200, STALE_MS:400, MIN_HZ:4,
 BODY_M:1.7,                         // metres per body height for world-landmark speed
 PEAK_MIN:1.5, DROP:.6, HARD_DROP:.4, STRAIGHT_DEG:150, WINDOW_MS:150, COOLDOWN_MS:250,
 SPARKS:[8,14], SPARK_SPEED:[1.5,3], SPARK_LIFE:[250,400], SPARK_DRAG:3, SPARK_CONE:35*Math.PI/180,
 FLASH_MS:120, FLASH_R:.05, RING_MS:220, RING_R:.12,
 COST_DOWN_MS:3, COST_UP_MS:1.5, COST_FRAMES:8, RECOVER_MS:1500,
});
// Colour by aura level (myr5:aura-level 0..3): [wide, mid, core, tail second hue].
export const TRAIL_PALETTES=[
 ['#ff3d10','#ff8a2a','#fff6e0',null],
 ['#ff3d10','#ff8a2a','#fff6e0',null],
 ['#ff1f6a','#ff5ad0','#fff0fa',null],
 ['#1f6bff','#38e8ff','#f0ffff','#9a5cff'],
];
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
const SIDES=[['left',15,13,11,[17,19,21]],['right',16,14,12,[18,20,22]]];
const F=6; // floats per trail point: x, y, t, speedN, emit, spare

function confidence(point){return Number.isFinite(point?.visibility)?point.visibility:Number.isFinite(point?.score)?point.score:0;}
function handConfidence(points,wrist,shape){
 const wristConf=confidence(points[wrist]);if(wristConf<.4)return wristConf;
 let sum=0,n=0;for(const i of shape){const v=confidence(points[i]);if(v>=.5){sum+=v;n++;}}
 // A wrist is sufficient when the hand-specific keypoints are missing from a pose.
 return n?Math.min(wristConf,sum/n):wristConf;
}
/** Elbow angle in degrees (180 = straight). World landmarks (metres, 3D) when present, else image space. */
export function elbowAngle(a,b,c,ar=1){
 if(!a||!b||!c)return 0;
 const ux=(a.x-b.x)*ar,uy=a.y-b.y,uz=(a.z??0)-(b.z??0),vx=(c.x-b.x)*ar,vy=c.y-b.y,vz=(c.z??0)-(b.z??0);
 const l=Math.hypot(ux,uy,uz)*Math.hypot(vx,vy,vz);if(!l)return 0;
 return Math.acos(clamp((ux*vx+uy*vy+uz*vz)/l,-1,1))*180/Math.PI;
}
/** Body height in host heights from mapped shoulders/hips (aspect = host w/h). Fallback: shoulder width. */
export function bodyHeight(m,aspect){
 const ok=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&(p.visibility??1)>=.5;
 const [ls,rs,lh,rh]=[m(11),m(12),m(23),m(24)];
 if(ok(ls)&&ok(rs)&&ok(lh)&&ok(rh))return Math.hypot((ls.x+rs.x-lh.x-rh.x)/2*aspect,(ls.y+rs.y-lh.y-rh.y)/2)/.3;
 if(ok(ls)&&ok(rs))return Math.hypot((ls.x-rs.x)*aspect,ls.y-rs.y)/.23;
 return 0;
}

/** Pure speed gate with hysteresis (exported for tests). */
export function gateStep(on,speed,T=TRAIL_TUNING){return on?speed>=T.GATE_OFF:speed>T.GATE_ON;}
/** Ribbon half-width for a sample: taper by age, widen with speed (exported for tests). */
export function ribbonHalfWidth(age01,speedN,bodyPx,head=false,T=TRAIL_TUNING){
 return T.BASE_W*bodyPx*Math.pow(1-clamp(age01,0,1),1.3)*(.35+.65*clamp(speedN,0,1))*(head?T.HEAD_BOOST:1);
}
/** Ribbon alpha for a sample (exported for tests). */
export function ribbonAlpha(age01,speedN,emit){return Math.pow(1-clamp(age01,0,1),2)*smooth(.15,.5,speedN)*emit;}

/**
 * Punch impact detector for one hand: a peak above PEAK_MIN, then the speed falls below DROP*peak within
 * WINDOW_MS with the elbow straight (jab/cross), or below HARD_DROP*peak with a bent elbow (hook). One per punch.
 */
export function createImpactDetector(T=TRAIL_TUNING){
 const s={armed:false,peak:0,peakAt:0,coolUntil:-Infinity};
 return {state:s,update(speed,elbowDeg,t){
  if(s.armed&&t-s.peakAt>T.WINDOW_MS)s.armed=false;
  if(speed>=T.PEAK_MIN&&(!s.armed||speed>s.peak)){s.armed=true;s.peak=speed;s.peakAt=t;return 0;}
  if(!s.armed||t<s.coolUntil)return 0;
  if(speed<=T.DROP*s.peak&&(elbowDeg>=T.STRAIGHT_DEG||speed<=T.HARD_DROP*s.peak)){
   const peak=s.peak;s.armed=false;s.peak=0;s.coolUntil=t+T.COOLDOWN_MS;return peak;}
  return 0;
 },reset(){s.armed=false;s.peak=0;}};
}

function makeHand(side,T){
 return {side,visible:false,alpha:0,x:0,y:0,hx:0,hy:0,speed:0,speedN:0,gate:false,emit:0,lastSeen:-Infinity,lastPoseAt:null,
  wx:NaN,wy:NaN,wz:NaN,pts:new Float32Array(T.MAX_PTS*F),start:0,count:0,impact:createImpactDetector(T),dirX:0,dirY:0,confidence:0};
}

export function createHandGlow({clock=()=>globalThis.performance?.now?.()??Date.now(),onImpact=()=>{},random=Math.random,tuning=TRAIL_TUNING}={}){
 const T=tuning,bank=createLandmarkBank(()=>PRESETS.wrist);
 const SP=new Float32Array(40*6); // spark pool: x, y, vx, vy, life, max (normalized host units)
 const IM=new Float32Array(4*6);  // impacts: x, y, t, strength, dirX, dirY
 const state={hands:[makeHand('left',T),makeHand('right',T)],bodyH:.6,aspect:9/16,level:0,lastPoseAt:null,poseHz:0,poseSamples:0,
  enabled:true,tier:3,highCostFrames:0,lowCostSince:null,lastRenderAt:0,sparks:SP,impacts:IM,impactNext:0};
 function clearHand(h){h.visible=false;h.alpha=0;h.count=0;h.start=0;h.gate=false;h.emit=0;h.speed=0;h.lastPoseAt=null;h.wx=NaN;h.impact.reset();}
 function clear(){for(const h of state.hands)clearHand(h);for(let i=0;i<SP.length;i+=6)SP[i+4]=0;for(let i=0;i<IM.length;i+=6)IM[i+2]=-1e9;
  bank.reset(15);bank.reset(16);state.lastPoseAt=null;state.poseHz=0;state.poseSamples=0;}
 clear();
 function push(h,x,y,t,sn,e){
  if(h.count===T.MAX_PTS){h.start=(h.start+1)%T.MAX_PTS;h.count--;}
  const o=((h.start+h.count)%T.MAX_PTS)*F;h.pts[o]=x;h.pts[o+1]=y;h.pts[o+2]=t;h.pts[o+3]=sn;h.pts[o+4]=e;h.count++;
 }
 function spawnImpact(h,x,y,t,peak){
  const strength=clamp(peak/3,.35,1),o=state.impactNext*6;state.impactNext=(state.impactNext+1)%4;
  IM[o]=x;IM[o+1]=y;IM[o+2]=t;IM[o+3]=strength;IM[o+4]=h.dirX;IM[o+5]=h.dirY;
  const n=Math.round(T.SPARKS[0]+(T.SPARKS[1]-T.SPARKS[0])*strength),base=Math.atan2(h.dirY,h.dirX*state.aspect);
  for(let k=0,i=0;k<n&&i<SP.length;i+=6){if(SP[i+4]>0)continue;k++;
   const a=base+(random()*2-1)*T.SPARK_CONE,v=(T.SPARK_SPEED[0]+random()*(T.SPARK_SPEED[1]-T.SPARK_SPEED[0]))*state.bodyH,life=T.SPARK_LIFE[0]+random()*(T.SPARK_LIFE[1]-T.SPARK_LIFE[0]);
   SP[i]=x;SP[i+1]=y;SP[i+2]=Math.cos(a)*v/state.aspect;SP[i+3]=Math.sin(a)*v;SP[i+4]=life;SP[i+5]=life;}
  onImpact({x,y,hand:h.side,strength});
 }
 // points: raw landmarks; mapPoint(p) -> {x,y} host fractions; world: world landmarks (optional); aspect: host w/h.
 function pose(points,{now=clock(),mapPoint=p=>p,world=null,aspect=state.aspect,videoAspect=1}={}){
  if(!Array.isArray(points)){for(const h of state.hands)h.visible=false;return;}
  const t=Number.isFinite(now)?now:clock();
  if(state.lastPoseAt!=null){const dt=t-state.lastPoseAt;if(dt>0){const hz=1000/dt;state.poseHz=dt>T.STALE_MS||!state.poseSamples?hz:state.poseHz*.7+hz*.3;state.poseSamples++;}}
  state.lastPoseAt=t;state.aspect=aspect>0?aspect:state.aspect;
  const m=i=>points[i]?mapPoint(points[i]):null,bh=bodyHeight(m,state.aspect);
  if(bh>.05)state.bodyH=state.bodyH*.8+clamp(bh,.15,1.6)*.2;
  for(let s=0;s<2;s++){
   const [,wrist,elbow,shoulder,shape]=SIDES[s],h=state.hands[s],conf=handConfidence(points,wrist,shape),mp=points[wrist]?m(wrist):null;
   if(!mp||!Number.isFinite(mp.x)||!Number.isFinite(mp.y)){h.visible=false;continue;}
   const f=bank.update(wrist,mp.x,mp.y,conf,t);h.visible=f.visible;h.confidence=conf;
   if(!h.visible)continue;
   const dt=h.lastPoseAt==null?0:(t-h.lastPoseAt)/1000;
   let raw=0;
   if(dt>0&&dt<.3){
    const dx=f.x-h.x,dy=f.y-h.y;raw=Math.hypot(dx*state.aspect,dy)/dt/state.bodyH;
    if(raw>.3){const l=Math.hypot(dx*state.aspect,dy);h.dirX=dx/l;h.dirY=dy/l;}
    const w=world?.[wrist];
    if(w&&Number.isFinite(h.wx))raw=Math.max(raw,Math.hypot(w.x-h.wx,w.y-h.wy,(w.z??0)-h.wz)/dt/T.BODY_M);
   }
   const w=world?.[wrist];if(w){h.wx=w.x;h.wy=w.y;h.wz=w.z??0;}
   if(h.lastPoseAt==null||t-h.lastSeen>T.STALE_MS){h.count=0;h.start=0;h.speed=0;}
   h.speed=dt>0?h.speed*.4+raw*.6:0;h.speedN=clamp(h.speed/T.SPEED_FULL,0,1);
   const was=h.gate;h.gate=gateStep(h.gate,h.gate?h.speed:Math.max(raw,h.speed),T); // open on the raw spike, close on the smoothed speed
   if(h.gate&&!was)for(let i=Math.max(0,h.count-2);i<h.count;i++)h.pts[((h.start+i)%T.MAX_PTS)*F+4]=1; // light the wind-up so the ribbon has length at once
   h.emit=h.gate?1:Math.max(0,h.emit-(dt*1000)/T.EMIT_OFF_MS);
   h.x=f.x;h.y=f.y;h.lastSeen=t;h.lastPoseAt=t;
   if(state.enabled)push(h,f.x,f.y,t,h.speedN,h.emit);
   if(dt>0){
    const ang=world?.[shoulder]&&world?.[elbow]&&world?.[wrist]?elbowAngle(world[shoulder],world[elbow],world[wrist]):elbowAngle(points[shoulder],points[elbow],points[wrist],videoAspect);
    const peak=h.impact.update(raw,ang,t);if(peak)spawnImpact(h,f.x,f.y,t,peak);
   }
  }
 }
 function step(dtSeconds,now=clock()){
  const t=Number.isFinite(now)?now:clock(),dt=clamp(Number(dtSeconds)||0,0,.05);
  for(let s=0;s<2;s++){
   const h=state.hands[s];if(t-h.lastSeen>T.STALE_MS)h.visible=false;
   h.alpha=clamp(h.alpha+(h.visible?1:-1)*dt*1000/T.VIS_FADE_MS,0,1);
   while(h.count&&t-h.pts[h.start*F+2]>T.LIFE_MS){h.start=(h.start+1)%T.MAX_PTS;h.count--;}
   // Live head: the filtered wrist pushed forward by the measured lag (capped), so the ribbon reaches the hand.
   const p=h.lastPoseAt==null?null:bank.predict(SIDES[s][1],t-h.lastPoseAt);
   if(p){let ox=(p.x-h.x)*state.aspect,oy=p.y-h.y;const l=Math.hypot(ox,oy),cap=T.PREDICT_MAX*state.bodyH;if(l>cap){ox*=cap/l;oy*=cap/l;}h.hx=h.x+ox/state.aspect;h.hy=h.y+oy;}
   else{h.hx=h.x;h.hy=h.y;}
  }
  const k=Math.exp(-T.SPARK_DRAG*dt);
  for(let i=0;i<SP.length;i+=6){if(SP[i+4]<=0)continue;SP[i]+=SP[i+2]*dt;SP[i+1]+=SP[i+3]*dt;SP[i+2]*=k;SP[i+3]*=k;SP[i+4]-=dt*1000;}
  state.lastRenderAt=t;
  return state;
 }
 // Quality ladder on measured render cost: 3 layers -> 2 -> 1 -> off, recovering after a calm stretch.
 function measure(costMs,now=clock()){
  if(!Number.isFinite(costMs))return state.enabled;
  const t=Number.isFinite(now)?now:clock();
  if(costMs>T.COST_DOWN_MS){state.highCostFrames++;state.lowCostSince=null;if(state.highCostFrames>=T.COST_FRAMES){state.tier=Math.max(0,state.tier-1);state.highCostFrames=0;}}
  else{state.highCostFrames=0;if(costMs<T.COST_UP_MS){if(state.lowCostSince==null)state.lowCostSince=t;if(state.tier<3&&t-state.lowCostSince>=T.RECOVER_MS){state.tier++;state.lowCostSince=t;}}else state.lowCostSince=null;}
  state.enabled=state.tier>0;
  return state.enabled;
 }
 function setLevel(level){state.level=clamp(Math.round(Number(level)||0),0,3);}
 return {state,pose,step,measure,clear,setLevel};
}

// ---- renderer (Canvas 2D, additive). Scratch buffers are module-level: no per-frame allocation. ----
const MAXS=(TRAIL_TUNING.MAX_PTS+1)*TRAIL_TUNING.SUBDIV+1;
const SX=new Float32Array(MAXS),SY=new Float32Array(MAXS),SA=new Float32Array(MAXS),SS=new Float32Array(MAXS),SE=new Float32Array(MAXS),NX=new Float32Array(MAXS),NY=new Float32Array(MAXS),HW=new Float32Array(MAXS),PT=new Float32Array((TRAIL_TUNING.MAX_PTS+1)*5);
const sprites=new Map();
function glowSprite(colour){
 if(sprites.has(colour))return sprites.get(colour);
 let c=null;
 try{c=typeof OffscreenCanvas==='function'?new OffscreenCanvas(64,64):globalThis.document?.createElement?.('canvas');if(c){c.width=c.height=64;const g=c.getContext('2d');const r=g.createRadialGradient(32,32,0,32,32,32);
  r.addColorStop(0,colour);r.addColorStop(.25,colour);r.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=r;g.fillRect(0,0,64,64);}}catch{c=null;}
 sprites.set(colour,c);return c;
}
// Centripetal Catmull-Rom (alpha .5) between p1 and p2; writes SUBDIV samples starting at index n.
function catmull(n,i0,i1,i2,i3,sub){
 const x0=PT[i0*5],y0=PT[i0*5+1],x1=PT[i1*5],y1=PT[i1*5+1],x2=PT[i2*5],y2=PT[i2*5+1],x3=PT[i3*5],y3=PT[i3*5+1];
 const t1=Math.sqrt(Math.hypot(x1-x0,y1-y0))||1e-4,t2=t1+(Math.sqrt(Math.hypot(x2-x1,y2-y1))||1e-4),t3=t2+(Math.sqrt(Math.hypot(x3-x2,y3-y2))||1e-4);
 for(let k=0;k<sub;k++){
  const u=k/sub,t=t1+(t2-t1)*u;
  const a1x=(t1-t)/t1*x0+t/t1*x1,a1y=(t1-t)/t1*y0+t/t1*y1;
  const a2x=(t2-t)/(t2-t1)*x1+(t-t1)/(t2-t1)*x2,a2y=(t2-t)/(t2-t1)*y1+(t-t1)/(t2-t1)*y2;
  const a3x=(t3-t)/(t3-t2)*x2+(t-t2)/(t3-t2)*x3,a3y=(t3-t)/(t3-t2)*y2+(t-t2)/(t3-t2)*y3;
  const b1x=(t2-t)/t2*a1x+t/t2*a2x,b1y=(t2-t)/t2*a1y+t/t2*a2y,b2x=(t3-t)/(t3-t1)*a2x+(t-t1)/(t3-t1)*a3x,b2y=(t3-t)/(t3-t1)*a2y+(t-t1)/(t3-t1)*a3y;
  SX[n+k]=(t2-t)/(t2-t1)*b1x+(t-t1)/(t2-t1)*b2x;SY[n+k]=(t2-t)/(t2-t1)*b1y+(t-t1)/(t2-t1)*b2y;
  SA[n+k]=PT[i1*5+2]+(PT[i2*5+2]-PT[i1*5+2])*u;SS[n+k]=PT[i1*5+3]+(PT[i2*5+3]-PT[i1*5+3])*u;SE[n+k]=PT[i1*5+4]+(PT[i2*5+4]-PT[i1*5+4])*u;
 }
}
/** Builds the ribbon samples for a hand into the scratch buffers; returns the sample count. Exported for tests. */
export function buildRibbon(hand,now,w,h,bodyPx,T=TRAIL_TUNING){
 let n=0;
 for(let i=0;i<hand.count;i++){const o=((hand.start+i)%T.MAX_PTS)*F,a=(now-hand.pts[o+2])/T.LIFE_MS;
  PT[n*5]=hand.pts[o]*w;PT[n*5+1]=hand.pts[o+1]*h;PT[n*5+2]=clamp(a,0,1);PT[n*5+3]=hand.pts[o+3];PT[n*5+4]=hand.pts[o+4];n++;}
 PT[n*5]=hand.hx*w;PT[n*5+1]=hand.hy*h;PT[n*5+2]=0;PT[n*5+3]=hand.speedN;PT[n*5+4]=hand.emit;n++;
 if(n<2)return 0;
 let m=0;
 for(let i=0;i<n-1;i++){catmull(m,Math.max(0,i-1),i,i+1,Math.min(n-1,i+2),T.SUBDIV);m+=T.SUBDIV;}
 SX[m]=PT[(n-1)*5];SY[m]=PT[(n-1)*5+1];SA[m]=0;SS[m]=PT[(n-1)*5+3];SE[m]=PT[(n-1)*5+4];m++;
 for(let i=0;i<m;i++){
  const a=Math.max(0,i-1),b=Math.min(m-1,i+1);let tx=SX[b]-SX[a],ty=SY[b]-SY[a];const l=Math.hypot(tx,ty)||1;tx/=l;ty/=l;
  NX[i]=-ty;NY[i]=tx;HW[i]=ribbonHalfWidth(SA[i],SS[i],bodyPx,i===m-1,T);
 }
 return m;
}
export const ribbonSamples={SX,SY,SA,SS,SE,HW};

export function renderHandGlow(ctx,state,{w=180,h=320,now=state?.lastRenderAt??0}={}){
 if(!ctx||!state)return;
 const T=TRAIL_TUNING,pal=TRAIL_PALETTES[state.level]||TRAIL_PALETTES[0],bodyPx=state.bodyH*h;
 const slow=state.poseSamples>=2&&state.poseHz<T.MIN_HZ;
 ctx.save();ctx.globalCompositeOperation='lighter';
 if(state.enabled&&!slow)for(const hand of state.hands){
  if(hand.alpha<=.01)continue;
  const m=buildRibbon(hand,now,w,h,bodyPx,T),layers=state.tier>=3?3:state.tier;
  for(let L=3-layers;L<3&&m>1;L++){
   const [wx,ax]=T.LAYERS[L];
   for(let i=0;i<m-1;i++){
    const age=SA[i+1],a=ax*hand.alpha*ribbonAlpha(age,SS[i+1],SE[i+1])*(.7+.3*Math.sin(age*14-now*.009+L)*Math.sin(age*5.3+now*.004));
    if(a<.004)continue;
    ctx.fillStyle=L===2?pal[2]:pal[3]&&age>.5&&L===1?pal[3]:pal[L];ctx.globalAlpha=Math.min(1,a);
    const h0=HW[i]*wx,h1=HW[i+1]*wx;
    ctx.beginPath();ctx.moveTo(SX[i]+NX[i]*h0,SY[i]+NY[i]*h0);ctx.lineTo(SX[i+1]+NX[i+1]*h1,SY[i+1]+NY[i+1]*h1);
    ctx.lineTo(SX[i+1]-NX[i+1]*h1,SY[i+1]-NY[i+1]*h1);ctx.lineTo(SX[i]-NX[i]*h0,SY[i]-NY[i]*h0);ctx.closePath();ctx.fill();
   }
  }
  // Hand glow: always a soft light on the wrist, stretched along the motion and hotter with speed.
  const hx=hand.hx*w,hy=hand.hy*h,r=bodyPx*(.028+.025*hand.speedN),stretch=1+Math.min(2,hand.speedN*2.2*hand.emit);
  const spr=glowSprite(pal[1]),core=glowSprite(pal[2]);
  ctx.globalAlpha=hand.alpha*(.22+.5*hand.speedN*hand.emit);
  if(spr){ctx.save();ctx.translate(hx,hy);ctx.rotate(Math.atan2(hand.dirY,hand.dirX*w/h));ctx.drawImage(spr,r-2*r*stretch,-r,r*2*stretch,r*2);
   ctx.globalAlpha*=.8;ctx.drawImage(core,r*.45-r*.9*stretch,-r*.45,r*.9*stretch,r*.9);ctx.restore();}
  else{ctx.fillStyle=pal[1];ctx.fillRect(hx-r,hy-r,r*2,r*2);}
 }
 drawImpacts(ctx,state,w,h,now,pal);
 ctx.restore();
}
function drawImpacts(ctx,state,w,h,now,pal){
 const T=TRAIL_TUNING,IM=state.impacts,SP=state.sparks,bodyPx=state.bodyH*h,flash=glowSprite('#ffffff'),tint=glowSprite(pal[1]);
 for(let i=0;i<IM.length;i+=6){
  const age=now-IM[i+2];if(age<0||age>T.RING_MS)continue;
  const x=IM[i]*w,y=IM[i+1]*h,s=IM[i+3];
  if(age<T.FLASH_MS){const k=age/T.FLASH_MS,sc=(k<.35?k/.35:1-(k-.35)/.65)*T.FLASH_R*bodyPx*(.6+.4*s);
   if(flash){ctx.globalAlpha=.8;ctx.drawImage(tint,x-sc*2,y-sc*2,sc*4,sc*4);ctx.drawImage(flash,x-sc,y-sc,sc*2,sc*2);}}
  const k=age/T.RING_MS,R=T.RING_R*bodyPx*(.6+.4*s)*Math.sqrt(k);
  ctx.globalAlpha=(1-k)*.9;ctx.strokeStyle=pal[2];ctx.lineWidth=Math.max(1.5,bodyPx*.012*(1-k));ctx.beginPath();ctx.arc(x,y,R,0,Math.PI*2);ctx.stroke();
  ctx.globalAlpha=(1-k)*.5;ctx.strokeStyle=pal[1];ctx.lineWidth=Math.max(3,bodyPx*.03*(1-k));ctx.stroke();
 }
 ctx.lineCap='round';
 for(let i=0;i<SP.length;i+=6){
  if(SP[i+4]<=0)continue;const k=SP[i+4]/SP[i+5],x=SP[i]*w,y=SP[i+1]*h,vx=SP[i+2]*w,vy=SP[i+3]*h;
  ctx.globalAlpha=k;ctx.strokeStyle=k>.5?pal[2]:pal[1];ctx.lineWidth=Math.max(1,bodyPx*.008);
  ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-vx*.03,y-vy*.03);ctx.stroke();
 }
 ctx.lineCap='butt';
}
