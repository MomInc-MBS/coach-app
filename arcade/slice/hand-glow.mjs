// Lightweight camera-only hand energy. Pose landmarks still drive Fruit Ninja
// collisions unchanged; this model smooths and renders only the visible effect.
const MAX_TRAIL=16, TRAIL_LIFE_MS=300, STALE_MS=400, SAMPLE_MS=1000/30;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

function confidence(point){return Number.isFinite(point?.visibility)?point.visibility:Number.isFinite(point?.score)?point.score:0;}
function handConfidence(points,wrist,shape){
 const wristConf=confidence(points[wrist]);if(wristConf<.5)return 0;
 const visible=shape.map(i=>confidence(points[i])).filter(v=>v>=.5);
 // A wrist is sufficient when the hand-specific keypoints are missing from a pose.
 return visible.length?Math.min(wristConf,visible.reduce((sum,v)=>sum+v,0)/visible.length):wristConf;
}

export function createHandGlow({clock=()=>globalThis.performance?.now?.()??Date.now()}={}){
 const state={hands:new Map(),lastPoseAt:null,poseHz:0,poseSamples:0,enabled:true,highCostFrames:0,lowCostSince:null,lastRenderAt:null,lastSampleAt:0};
 function clear(){state.hands.clear();state.lastPoseAt=null;state.poseHz=0;state.poseSamples=0;state.lastRenderAt=null;state.lastSampleAt=0;}
 function pose(points,{now=clock(),mapPoint=p=>p}={}){
  if(!Array.isArray(points)){clear();return;}
  const t=Number.isFinite(now)?now:clock();
  if(state.lastPoseAt!=null){const dt=t-state.lastPoseAt;if(dt>0){const hz=1000/dt;state.poseHz=dt>STALE_MS||!state.poseSamples?hz:state.poseHz*.7+hz*.3;state.poseSamples++;}}
  state.lastPoseAt=t;
  for(const [side,wrist,shape] of [['left',15,[17,19,21]],['right',16,[18,20,22]]]){
   const point=points[wrist],conf=handConfidence(points,wrist,shape);
   if(!point||conf<.5){state.hands.delete(side);continue;}
   const mapped=mapPoint(point);if(!mapped||!Number.isFinite(mapped.x)||!Number.isFinite(mapped.y)){state.hands.delete(side);continue;}
   const hand=state.hands.get(side);
   if(hand){const dt=Math.max(1,t-hand.lastSeen);hand.speed=clamp(Math.hypot(mapped.x-hand.target.x,mapped.y-hand.target.y)*1000/dt,0,2200);hand.target={x:mapped.x,y:mapped.y};hand.heat=hand.heat*.65+clamp(hand.speed/1000,0,1)*.35;hand.confidence=conf;hand.lastSeen=t;}
   else state.hands.set(side,{x:mapped.x,y:mapped.y,target:{x:mapped.x,y:mapped.y},confidence:conf,lastSeen:t,trail:[],speed:0,heat:0});
  }
 }
 function step(dtSeconds,now=clock()){
  const t=Number.isFinite(now)?now:clock(),dt=clamp(Number(dtSeconds)||0,0,.05),alpha=1-Math.exp(-14*dt);
  for(const [key,hand] of state.hands){
   if(t-hand.lastSeen>STALE_MS){state.hands.delete(key);continue;}
   hand.x+=(hand.target.x-hand.x)*alpha;hand.y+=(hand.target.y-hand.y)*alpha;
   if(state.enabled&&t-state.lastSampleAt>=SAMPLE_MS){hand.trail.push({x:hand.x,y:hand.y,t});if(hand.trail.length>MAX_TRAIL)hand.trail.shift();}
   hand.trail=hand.trail.filter(p=>t-p.t<=TRAIL_LIFE_MS);
  }
  if(t-state.lastSampleAt>=SAMPLE_MS)state.lastSampleAt=t;
  state.lastRenderAt=t;
  return state;
 }
 function measure(costMs,now=clock()){
  if(!Number.isFinite(costMs))return state.enabled;
  const t=Number.isFinite(now)?now:clock();
  if(costMs>2){state.highCostFrames++;state.lowCostSince=null;if(state.highCostFrames>=8)state.enabled=false;}
  else{state.highCostFrames=0;if(costMs<1.2){if(state.lowCostSince==null)state.lowCostSince=t;if(!state.enabled&&t-state.lowCostSince>=1500)state.enabled=true;}else state.lowCostSince=null;}
  return state.enabled;
 }
 return {state,pose,step,measure,clear};
}

// Pixel glow and a short fire-colored energy trail, kept deliberately faint.
export function renderHandGlow(ctx,state){
 if(!ctx||!state?.enabled)return;
 // Permit one initial wrist aura while cadence is unknown; once sampled, a
 // tracker slower than 4 Hz receives no trail or glow draw calls.
 if(state.poseSamples>=2&&state.poseHz<4)return;
 const trails=state.poseSamples>=2;
 for(const hand of state.hands.values()){
  ctx.save();ctx.globalCompositeOperation='source-over';ctx.imageSmoothingEnabled=false;
  if(trails&&hand.trail.length>1){
   for(let i=1;i<hand.trail.length;i++){
    const a=hand.trail[i-1],b=hand.trail[i],age=clamp(1-(state.lastRenderAt-b.t)/TRAIL_LIFE_MS,0,1);
    ctx.globalAlpha=(.08+.13*hand.heat)*age;ctx.strokeStyle=i%3===0?'#fff0ad':'#ff713b';ctx.lineWidth=2.2;
    ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
   }
  }
  ctx.globalAlpha=.1+.08*clamp(hand.confidence,0,1)+.12*hand.heat;ctx.fillStyle='#ffbd62';
  const x=Math.round(hand.x),y=Math.round(hand.y);
  // Small blocky aura, not a full-screen tint or a hand-shape replacement.
  ctx.fillRect(x-4,y-4,8,8);ctx.globalAlpha*=.75;ctx.fillStyle='#fff2b0';ctx.fillRect(x-2,y-2,4,4);
  ctx.restore();
 }
}
