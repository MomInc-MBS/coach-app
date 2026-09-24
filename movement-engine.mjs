// MYR5 movement rules. AGPL-3.0-or-later, like the accompanying test app.
// These are counting/shape heuristics, not assessments of exercise technique.
import {EXERCISES} from './exercise-library.mjs';
import {evaluateMovement} from './movement-rules.mjs';
const LEGACY_MOVEMENTS = {
  squat: { name: 'Squats', kind: 'reps', hint: 'Keep shoulders and hips visible. Start standing tall. Feet can stay outside the picture.' },
  pushup: { name: 'Push-ups', kind: 'reps', hint: 'Place the camera beside you. Start at the top with your arm visible.' },
  tree: { name: 'Tree pose', kind: 'hold', hint: 'Show your shoulders, hips and knees. The hold is estimated from your upper-leg position.' },
  warrior: { name: 'Warrior II', kind: 'hold', hint: 'Show your arms, hips and knees. Either direction works; feet are not tracked.' },
  horse: { name: 'Horse stance', kind: 'hold', hint: 'Show your hips and knees in your comfortable wide stance. Feet are not tracked.' },
  boxing: { name: 'Air boxing', kind: 'pace', hint: 'Keep shoulders, elbows and hands visible. Measures time and relative hand pace.' },
  jogging: { name: 'Jogging in place', kind: 'steps', hint: 'Show both knees. Steps are estimated from alternating knee lifts. Keep the phone still.' },
  jumping: { name: 'Jumping', kind: 'jumps', hint: 'Show your shoulders and hips. Jumps are estimated from body rise. Keep the phone still.' }
};
export const MOVEMENTS={...LEGACY_MOVEMENTS,...EXERCISES};
const SIDES = { left: { s:11,e:13,w:15,h:23,k:25 }, right: { s:12,e:14,w:16,h:24,k:26 } };
// CPU tracking can run below 6 Hz. Treat a genuine interruption differently
// from a slower, continuous stream; never require seven frames in 1.1 seconds.
const MAX_FRAME_GAP=.75;
const JOINTS={11:'left shoulder',12:'right shoulder',13:'left elbow',14:'right elbow',15:'left hand',16:'right hand',23:'left hip',24:'right hip',25:'left knee',26:'right knee'};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,(a.z??0)-(b.z??0));
const midpoint=(a,b)=>({x:(a.x+b.x)/2,y:(a.y+b.y)/2,z:((a.z??0)+(b.z??0))/2});
export function jointAngle(a,b,c){
  const u=[a.x-b.x,a.y-b.y,(a.z??0)-(b.z??0)],v=[c.x-b.x,c.y-b.y,(c.z??0)-(b.z??0)];
  const divisor=Math.hypot(...u)*Math.hypot(...v);
  return divisor>1e-8?Math.acos(clamp(u.reduce((n,x,i)=>n+x*v[i],0)/divisor,-1,1))*180/Math.PI:NaN;
}
function median(a){const s=[...a].sort((a,b)=>a-b);return s[Math.floor(s.length/2)];}
export function features(raw,aspect=1,world=null){
  if(!raw||raw.length<27)return null;
  // Lower-leg landmarks never enter the movement rules, including legacy modes.
  raw=raw.map((v,i)=>i>26?{x:0,y:0,visibility:0}:v);
  while(raw.length<33)raw.push({x:0,y:0,visibility:0});
  world=world?.map((v,i)=>i>26?null:v)??null;
  // Normalized x and y have different scales in portrait video. Restore aspect.
  // MediaPipe's web result publishes visibility, not a per-joint presence score.
  const p=raw.map(v=>({x:v.x*aspect,y:v.y,z:0,visibility:Number.isFinite(v.visibility)?v.visibility:0}));
  const inFrame=i=>p[i]&&Number.isFinite(p[i].x)&&Number.isFinite(p[i].y)&&raw[i].x>=-.03&&raw[i].x<=1.03&&raw[i].y>=-.03&&raw[i].y<=1.03;
  const visible=ids=>ids.every(i=>inFrame(i)&&p[i].visibility>=.45);
  const issues=ids=>ids.filter(i=>!visible([i])).map(i=>!inFrame(i)?`${JOINTS[i]} outside picture`:`${JOINTS[i]} unclear (${Math.round(p[i].visibility*100)}%)`);
  const sides={};
  for(const [name,id] of Object.entries(SIDES)){
    const q=Object.fromEntries(Object.entries(id).map(([key,i])=>[key,p[i]]));
    const torso=distance(q.s,q.h);
    sides[name]={...q,id,torso,
      core:visible([id.s,id.h])&&torso>.035,
      coreQuality:Math.min(p[id.s].visibility,p[id.h].visibility),
      arm:visible([id.s,id.e,id.w,id.h])&&torso>.035,
      armQuality:Math.min(...[id.s,id.e,id.w,id.h].map(i=>p[i].visibility)),
      elbow:jointAngle(q.s,q.e,q.w),
      horizontal:Math.abs(q.s.x-q.h.x)/Math.max(torso,.035)
    };
  }
  const torso=(sides.left.torso+sides.right.torso)/2;
  const hip=midpoint(p[23],p[24]),shoulder=midpoint(p[11],p[12]);
  return {p,world,visible,issues,sides,torso,hip,shoulder,
    upright:(hip.y-shoulder.y)/Math.max(torso,.035)>.65,
    knees:visible([11,12,23,24,25,26])&&torso>.035};
}

export class MovementSession {
  constructor(mode='squat',options={}){this.reset(mode,options);}
  reset(mode=this.mode,options={}){
    if(!MOVEMENTS[mode])throw new Error('Unknown movement');
    this.mode=mode;this.duration=Number(options.duration)||0;this.count=0;this.elapsed=0;this.hold=0;this.totalHold=0;this.bestHold=0;this.active=0;this.speed=0;this.bestSpeed=0;
    this.started=null;this.last=null;this.complete=false;this.eventTimes=[];this.side=null;this.calibration=[];this.base=null;this.filtered={};this.phase='ready';this.phaseSince=null;this.lastRep=-Infinity;
    this.candidate=null;this.missAt=null;this.previousMatch=false;this.hands={};this.kneeArmed={left:false,right:false};this.lastStep=-Infinity;
    this.message=MOVEMENTS[mode].hint;this.measurement='';this.tracking=false;this.progress=0;this.setupProgress=0;this.setupReason='';this.jointReadings='';
    return this.snapshot();
  }
  smooth(key,value,dt){const old=this.filtered[key];const a=1-Math.exp(-Math.max(dt,.01)/.085);return this.filtered[key]=old===undefined?value:old+(value-old)*a;}
  lose(t,message='Keep the needed joints in view.'){
    this.tracking=false;this.message=message;this.measurement='Tracking paused';this.phase='ready';this.phaseSince=null;this.filtered={};this.calibration=[];this.setupProgress=0;this.progress=0;this.kneeArmed={left:false,right:false};this.hands={};this.speed=0;
    this.previousMatch=false;this.candidate=null;if(this.missAt===null)this.missAt=t;
    if(t-this.missAt>.35)this.hold=0;
  }
  selectSide(f,kind,t){
    const candidates=Object.entries(f.sides).filter(([,s])=>s[kind]);
    if(!candidates.length){
      const required=s=>kind==='core'?[s.id.s,s.id.h]:[s.id.s,s.id.e,s.id.w,s.id.h];
      const nearest=Object.values(f.sides).map(s=>({s,issues:f.issues(required(s))})).sort((a,b)=>a.issues.length-b.issues.length)[0];
      this.lose(t,nearest.issues.length?'Counting paused: '+nearest.issues.slice(0,2).join('; ')+'.':'Move a little closer so your torso is clear.');return null;
    }
    const key=kind==='core'?'coreQuality':'armQuality';
    const chosen=candidates.find(([name])=>name===this.side)||candidates.sort((a,b)=>b[1][key]-a[1][key])[0];
    if(this.side!==chosen[0]){this.side=chosen[0];this.base=null;this.calibration=[];this.phase='ready';this.phaseSince=null;this.filtered={};}
    return chosen[1];
  }
  calibrate(sample,ready,t){
    if(!ready){this.calibration=[];this.setupProgress=0;this.setupReason='Starting position not yet detected';return false;}
    // Three samples must fit the window at any continuous rate (gaps up to MAX_FRAME_GAP). A fixed 1.1 s
    // window silently needed 2 updates/s: a phone tracking at 1.4–1.9/s stayed on "Setting start" forever.
    this.calibration.push({t,...sample});this.calibration=this.calibration.filter(v=>t-v.t<=2*MAX_FRAME_GAP);
    this.setupProgress=Math.min(1,this.calibration.length/3,(t-this.calibration[0].t)/.7);this.setupReason='Hold steady';
    if(this.calibration.length<3||t-this.calibration[0].t<.7)return false;
    // A moving starting position is not a useful baseline.
    const key=sample.hipY!==undefined?'hipY':'angle';
    const values=this.calibration.map(v=>v[key]);
    if(Math.max(...values)-Math.min(...values)>(key==='angle'?12:.025)){this.setupProgress=0;this.setupReason='Waiting for a steadier starting position';return false;}
    this.base=Object.fromEntries(Object.keys(sample).map(k=>[k,median(this.calibration.map(v=>v[k]))]));
    this.calibration=[];this.setupProgress=1;this.setupReason='Ready';this.phase='top';this.phaseSince=null;return true;
  }
  repetition(down,up,t,minDuration,dwell=.10){
    if(this.phase==='ready'){
      if(up){this.phase='top';this.phaseSince=null;}return;
    }
    if(this.phase==='top'){
      if(down){if(this.phaseSince===null)this.phaseSince=t;if(t-this.phaseSince>=dwell){this.phase='bottom';this.phaseSince=null;this.downAt=t;}}else this.phaseSince=null;
    }else if(this.phase==='bottom'){
      if(up){if(this.phaseSince===null)this.phaseSince=t;if(t-this.phaseSince>=.10&&t-this.downAt>=minDuration&&t-this.lastRep>=.45){this.count++;this.lastRep=t;this.eventTimes.push(t);this.phase='top';this.phaseSince=null;}}else this.phaseSince=null;
    }
  }
  recipeUpdate(f,t,dt){
    const m=MOVEMENTS[this.mode],rule=evaluateMovement(f,m,this.side);
    if(!rule.valid){this.lose(t,rule.message);return;}
    if(rule.side&&this.side!==rule.side){this.side=rule.side;this.base=null;this.calibration=[];this.phase='ready';this.phaseSince=null;this.filtered={};}
    this.tracking=true;
    if(m.kind==='hold'){
      if(rule.match){
        if(this.candidate===null)this.candidate=t;
        if(t-this.candidate>=.45&&this.previousMatch){this.hold+=dt;this.totalHold+=dt;this.bestHold=Math.max(this.bestHold,this.hold);}
        this.previousMatch=true;this.missAt=null;
      }else{this.previousMatch=false;this.candidate=null;this.hold=0;}
      this.progress=Number(rule.match);this.message=rule.match?'Position detected. Hold comfortably.':'Hold paused. '+m.hint;
    }else{
      let up=rule.up,down=rule.down;
      if(m.detector==='squat'){
        if(this.base){const travel=this.smooth('recipeMetric',(rule.sample.hipY-this.base.hipY)/this.base.torso,dt);down=travel>=(m.travel??.25);up=travel<=.09;this.progress=clamp(travel/.5,0,1);}else up=true;
      }else this.progress=clamp(rule.metric,0,1);
      if(!this.base){this.calibrate(rule.sample??{angle:0},up,t);this.message=this.base?'Ready. Begin when you are ready.':m.hint+' Hold the starting position briefly.';this.progress=this.setupProgress;}
      else{this.repetition(down,up,t,m.minCycle??.18,m.dwell??.10);this.message=this.phase==='bottom'?'Return to your starting position.':'Move with control. Complete the full return to count.';}
    }
    this.measurement=m.measurement+' · '+m.limits;
  }
  repUpdate(f,t,dt){
    const squat=this.mode==='squat';const s=this.selectSide(f,squat?'core':'arm',t);if(!s)return;
    if(!squat&&s.horizontal<.5){this.lose(t,'Place the camera beside you so it can see your push-up position.');return;}
    this.tracking=true;

    const a=this.smooth('angle',squat?180:s.elbow,dt),hipY=this.smooth('hipY',s.h.y,dt);
    if(!this.base){
      const ready=squat?(s.h.y-s.s.y)/s.torso>.65:a>145&&s.horizontal>=.5;
      const calibrated=this.calibrate(squat?{hipY,torso:s.torso,angle:a}:{angle:a},ready,t);
      this.message=calibrated?'Ready. Begin when you are ready.':!ready?(squat?'Start standing tall with your shoulders and hips visible.':'Start at the top with your arm extended.'):this.setupReason==='Hold steady'?`Setting start: ${Math.round(this.setupProgress*100)}%. Hold still briefly.`:this.setupReason+'.';
      this.progress=this.setupProgress;
      this.measurement=`${this.side} side · ${Math.round(a)}°`;return;
    }

    const bend=squat?0:this.base.angle-a,drop=squat?(hipY-this.base.hipY)/this.base.torso:0;
    // Hip travel relative to the starting torso supports cropped frontal views.
    // Counts use only torso movement; lower-leg landmarks are discarded.
    const down=squat?drop>=.25:bend>=35;
    const up=squat?drop<=.10:bend<=14;
    this.repetition(down,up,t,.18);
    this.message=this.phase==='bottom'?'Movement registered. Return to your starting position.':this.phase==='ready'?'Return to your starting position to resume.':'Ready for the next repetition.';
    this.progress=clamp(squat?Math.max(bend/40,drop/.5):bend/50,0,1);
    this.measurement=squat?`${this.side} hip · travel ${Math.max(0,drop).toFixed(2)} · torso only`:`${this.side} arm · bend ${Math.round(bend)}°`;
  }
  holdUpdate(f,t,dt){
    if(!f.knees){this.lose(t,'Hold paused: '+(f.issues([11,12,23,24,25,26]).slice(0,2).join('; ')||'move a little closer')+'. Feet do not need to be visible.');return;}
    this.tracking=true;const l=f.sides.left,r=f.sides.right;
    const spread=Math.abs(l.k.x-r.k.x)/f.torso;
    let match=false,label='';
    if(this.mode==='tree'){
      for(const [raised,support,name] of [[l,r,'Left leg raised'],[r,l,'Right leg raised']]){
        const raisedOut=Math.abs(raised.k.x-raised.h.x)/f.torso,supportOut=Math.abs(support.k.x-support.h.x)/f.torso;
        if(f.upright&&raisedOut>.4&&supportOut<.55&&(support.k.y-raised.k.y)/f.torso>.15){match=true;label=name+' · estimated from upper legs';break;}
      }
    }else if(this.mode==='warrior'){
      const arms=f.visible([11,12,13,14,15,16])&&l.elbow>140&&r.elbow>140&&Math.abs(l.w.y-l.s.y)/f.torso<.4&&Math.abs(r.w.y-r.s.y)/f.torso<.4&&Math.abs(l.w.x-r.w.x)/f.torso>2.2;
      const leftDrop=(l.k.y-l.h.y)/f.torso,rightDrop=(r.k.y-r.h.y)/f.torso;
      match=f.upright&&spread>1.15&&arms&&((leftDrop<.85&&rightDrop>.85)||(rightDrop<.85&&leftDrop>.85));label='Arms and upper-leg stance · estimated hold';
    }else{
      match=f.upright&&spread>1.5&&Math.abs(l.k.x-l.h.x)/f.torso>.5&&Math.abs(r.k.x-r.h.x)/f.torso>.5&&(l.k.y-l.h.y)/f.torso<1&&(r.k.y-r.h.y)/f.torso<1;label='Wide upper-leg stance · estimated hold';
    }
    if(match){
      if(this.missAt!==null&&t-this.missAt>.35)this.hold=0;
      this.missAt=null;if(this.candidate===null)this.candidate=t;
      if(t-this.candidate>=.45){if(this.previousMatch){this.hold+=dt;this.totalHold+=dt;this.bestHold=Math.max(this.bestHold,this.hold);}this.message='Pose detected. Hold at your own comfort level.';}
      else this.message='Position found. Hold steady…';
      this.previousMatch=true;this.measurement=label;
    }else{
      if(this.missAt===null)this.missAt=t;if(t-this.missAt>.35){this.hold=0;this.candidate=null;}
      this.previousMatch=false;this.message='Hold timer paused. Reposition if needed.';this.measurement=MOVEMENTS[this.mode].hint;
    }
    this.progress=match?1:0;
  }
  boxingUpdate(f,t,dt){
    const selected=MOVEMENTS[this.mode].side;
    const available=Object.entries(f.sides).filter(([name,s])=>s.arm&&(!selected||selected===name));
    if(!available.length){this.selectSide(f,'arm',t);return;}
    this.tracking=true;const velocities=[];const next={};
    for(const [name,s] of available){
      const w=f.world;const ids=s.id;
      const useWorld=w&&[ids.s,ids.w,ids.h].every(i=>w[i]&&Number.isFinite(w[i].x)&&Number.isFinite(w[i].y)&&Number.isFinite(w[i].z));
      const hand=useWorld?w[ids.w]:s.w,shoulder=useWorld?w[ids.s]:s.s,hip=useWorld?w[ids.h]:s.h;
      const scale=Math.max(distance(shoulder,hip),.035);
      const point={x:(hand.x-shoulder.x)/scale,y:(hand.y-shoulder.y)/scale,z:((hand.z??0)-(shoulder.z??0))/scale};
      const previous=this.hands[name];
      if(previous&&previous.world===!!useWorld&&dt>.005){const speed=distance(point,previous.point)/dt;if(speed<20)velocities.push(speed);}
      next[name]={point,world:!!useWorld};
    }
    this.hands=next;const instant=velocities.length?Math.max(...velocities):0;
    this.speed+= (instant-this.speed)*(1-Math.exp(-dt/.25));
    if(this.speed>.7)this.active+=dt;this.bestSpeed=Math.max(this.bestSpeed,this.speed);
    this.message=this.speed>.7?'Movement detected. Keep your own rhythm.':'Active timer paused. Move your hands when ready.';
    this.measurement='Hand pace is relative to torso length. No punch-accuracy score.';this.progress=clamp(this.speed/5,0,1);
  }
  jogUpdate(f,t,dt){
    if(!f.knees){this.lose(t,'Steps paused: '+(f.issues([11,12,23,24,25,26]).slice(0,2).join('; ')||'move a little closer')+'. Feet are not tracked.');return;}
    this.tracking=true;const l=f.sides.left,r=f.sides.right;
    for(const [name,a,b] of [['left',l,r],['right',r,l]]){
      const lift=this.smooth(name+'Lift',(b.k.y-a.k.y)/f.torso,dt);
      if(lift<.05)this.kneeArmed[name]=true;
      if(this.kneeArmed[name]&&lift>(MOVEMENTS[this.mode].lift??.13)&&t-this.lastStep>.17){this.count++;this.eventTimes.push(t);this.lastStep=t;this.kneeArmed[name]=false;}
    }
    this.message='Counting alternating knee lifts.';this.measurement='Estimated steps from knees; feet are not tracked.';this.progress=clamp(Math.abs(l.k.y-r.k.y)/f.torso/.3,0,1);
  }
  jumpUpdate(f,t,dt){
    const s=this.selectSide(f,'core',t);if(!s)return;this.tracking=true;
    const hip=this.smooth('hip',s.h.y,dt),shoulder=this.smooth('shoulder',s.s.y,dt);
    if(!this.base){this.calibrate({hipY:hip,shoulder,torso:s.torso},(s.h.y-s.s.y)/s.torso>.65,t);this.message=this.base?'Ready. Begin when you are ready.':`Setting start: ${Math.round(this.setupProgress*100)}%. Stand still briefly.`;this.progress=this.setupProgress;return;}
    if(Math.abs(s.torso/this.base.torso-1)>.3){this.base=null;this.calibration=[];this.phase='ready';this.message='Distance changed. Stand still to reset your start.';return;}
    const lift=(this.base.hipY-hip)/this.base.torso,shoulderLift=(this.base.shoulder-shoulder)/this.base.torso;
    if(this.phase==='ready'&&lift<.07)this.phase='top';
    if(this.phase==='top'&&lift>.16&&shoulderLift>.12){this.phase='air';this.airAt=t;}
    else if(this.phase==='air'&&lift<.07){if(t-this.airAt>.12&&t-this.lastRep>.35){this.count++;this.eventTimes.push(t);this.lastRep=t;}this.phase='top';}
    this.message=this.phase==='air'?'Body rise detected. Return to your starting height.':'Ready for the next estimated jump.';this.measurement='Estimated from body rise; landing cannot be verified without feet.';this.progress=clamp(lift/.4,0,1);
  }
  update(raw,timestamp,aspect=1,world=null){
    const t=timestamp/1000;if(!Number.isFinite(t))return this.snapshot();
    if(this.last!==null&&t<=this.last)return this.snapshot();
    const gap=this.last===null?0:t-this.last;const dt=gap>MAX_FRAME_GAP?0:gap;this.last=t;
    if(this.complete)return this.snapshot();
    const f=features(raw,aspect,world);
    this.jointReadings=f?Object.entries(f.sides).map(([side,s])=>`${side}: `+[s.id.s,s.id.h,s.id.k].map(i=>`${JOINTS[i].split(' ')[1]} ${Math.round(f.p[i].visibility*100)}%${f.visible([i])?'':' ×'}`).join(', ')).join(' | '):'No body landmarks';
    if(this.started===null&&f&&Object.values(f.sides).some(s=>s.core||s.arm))this.started=t;
    this.elapsed=this.started===null?0:t-this.started;
    if(this.duration>0&&this.elapsed>=this.duration){this.elapsed=this.duration;this.complete=true;this.message='Round complete.';return this.snapshot();}
    if(gap>MAX_FRAME_GAP){this.lose(t);this.phase='ready';this.hold=0;this.candidate=null;}
    if(!f){this.lose(t,'No body found. Step into view.');return this.snapshot();}
    const recipe=MOVEMENTS[this.mode];
    if(this.mode==='squat'||this.mode==='pushup')this.repUpdate(f,t,dt);
    else if(['tree','warrior','horse'].includes(this.mode))this.holdUpdate(f,t,dt);
    else if(recipe.detector==='boxing')this.boxingUpdate(f,t,dt);
    else if(recipe.detector==='march')this.jogUpdate(f,t,dt);
    else if(EXERCISES[this.mode])this.recipeUpdate(f,t,dt);
    else this.jumpUpdate(f,t,dt);
    return this.snapshot();
  }
  snapshot(){
    const window=Math.min(10,this.elapsed);const now=this.last??0;
    this.eventTimes=this.eventTimes.filter(t=>now-t<=10);
    return {mode:this.mode,name:MOVEMENTS[this.mode].name,kind:MOVEMENTS[this.mode].kind,count:this.count,elapsed:this.elapsed,remaining:this.duration?Math.max(0,this.duration-this.elapsed):null,
      hold:this.hold,totalHold:this.totalHold,bestHold:this.bestHold,active:this.active,speed:this.speed,bestSpeed:this.bestSpeed,cadence:window>=2?this.eventTimes.length*60/window:0,
      complete:this.complete,tracking:this.tracking,calibrated:!!this.base,setupProgress:this.setupProgress,phase:this.phase,message:this.message,measurement:this.measurement,progress:this.progress,side:this.side,jointReadings:this.jointReadings};
  }
}
