// Body -> runner controls. Jog, jump and crouch reuse the app's own detectors (movement-engine.mjs MovementSession:
// jogUpdate / jumpUpdate / repUpdate) through their public update(); only the one-leg side step is new.
// Every number a phone test might need to move lives here.
export const POSE_TUNING={
  jogWindow:1.6,     // s of recent knee-lift steps that set the pace
  jogFullSteps:3,    // steps inside jogWindow for full speed
  paceEase:.45,      // s, pace smoothing (rise and fall)
  side:{
    out:.62,         // stepping ankle: lateral distance from the hip midline, in torso lengths
    plant:.38,       // planted ankle must stay this close to the midline
    rearm:.42,       // both ankles back inside this before the next side step can fire
    kneeOut:.42,kneePlant:.28,kneeRearm:.3, // same three with knees (feet out of frame)
    outScale:2.2,    // calibrated standing half-stance x this, if larger than `out`
    dwell:.12,       // s the side-step shape must hold (one frame is enough below 8 updates/s)
    cooldown:.45,    // s between side steps
    minVisibility:.5,
    calibrate:.6,    // s of steady standing to learn the stance width
    flip:false       // raw camera frames are unmirrored: the player's right is image-left. Flip if a device disagrees.
  }
};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const median=a=>{const s=[...a].sort((x,y)=>x-y);return s[Math.floor(s.length/2)];};
// Side-step detector on raw landmarks (ankles 27/28, knees 25/26, hips 23/24, shoulders 11/12).
export function createSideStep(tuning=POSE_TUNING.side){
  let armed=true,since=null,dir=null,lastFire=-Infinity,last=null,stance=null,calib=[];
  const d={stance:()=>stance,update(points,t,aspect=1){
    const T=tuning,p=points;if(!p||p.length<29)return null;
    const ok=i=>p[i]&&Number.isFinite(p[i].x)&&Number.isFinite(p[i].y)&&(p[i].visibility??1)>=T.minVisibility;
    if(![11,12,23,24].every(ok))return null;
    const X=i=>p[i].x*aspect,hx=(X(23)+X(24))/2,hy=(p[23].y+p[24].y)/2,sx=(X(11)+X(12))/2,sy=(p[11].y+p[12].y)/2;
    const torso=Math.hypot(hx-sx,hy-sy);if(torso<.03)return null;
    const feet=ok(27)&&ok(28),knees=ok(25)&&ok(26);if(!feet&&!knees){since=null;return null;}
    const [a,b]=feet?[27,28]:[25,26],out=feet?T.out:T.kneeOut,plant=feet?T.plant:T.kneePlant,rearm=feet?T.rearm:T.kneeRearm;
    const oa=(X(a)-hx)/torso,ob=(X(b)-hx)/torso,wide=Math.max(Math.abs(oa),Math.abs(ob)),narrow=Math.min(Math.abs(oa),Math.abs(ob));
    const dt=last===null?0:t-last;last=t;
    // Short calibration: the standing half-stance (feet only) widens the out threshold for wide-stance players.
    if(feet&&stance===null){if(wide<rearm*1.4){calib.push({t,w:wide});calib=calib.filter(c=>t-c.t<=T.calibrate*2);if(calib.length>=3&&t-calib[0].t>=T.calibrate)stance=median(calib.map(c=>c.w));}else calib=[];}
    const need=feet&&stance!==null?Math.max(out,stance*T.outScale):out;
    if(!armed){if(wide<rearm){armed=true;since=null;}return null;}
    if(wide>=need&&narrow<=plant){
      const o=Math.abs(oa)>Math.abs(ob)?oa:ob,next=(o<0)!==T.flip?'right':'left';
      if(dir!==next){dir=next;since=t-dt/2;}
      // Hold for `dwell`, or a single sample at phone rates where frames are further apart than the dwell.
      if((t-since>=T.dwell||dt>=.125)&&t-lastFire>=T.cooldown){armed=false;lastFire=t;since=null;return next;}
    }else{since=null;dir=null;}
    return null;
  }};
  return d;
}
// Session: the app's MovementSession class (passed in so the lazy chunk does not reload the engine).
export function createPoseInput({Session,tuning=POSE_TUNING}){
  const jog=new Session('jogging'),jump=new Session('jumping'),crouch=new Session('squat',{samples:null}),side=createSideStep(tuning.side);
  let steps=[],lastCount=0,jumpPhase='',crouchPhase='',pace=0,lastT=null;
  return {get pace(){return pace},get calibrated(){return !!(jump.base&&crouch.base)},
    update({points,world=null,width=1,height=1,now}){
      const actions=[];if(!points||!Number.isFinite(now))return {pace,actions};
      const t=now/1000,aspect=width/Math.max(1,height),dt=lastT===null?0:Math.max(0,t-lastT);lastT=t;
      const s=jog.update(points,now,aspect,world);
      if(s.count>lastCount){for(let i=lastCount;i<s.count;i++)steps.push(t);lastCount=s.count;}
      steps=steps.filter(x=>t-x<=tuning.jogWindow);
      const target=clamp(steps.length/tuning.jogFullSteps,0,1);pace+=(target-pace)*(1-Math.exp(-dt/tuning.paceEase));
      const j=jump.update(points,now,aspect,world);if(j.phase==='air'&&jumpPhase!=='air')actions.push('jump');jumpPhase=j.phase;
      const c=crouch.update(points,now,aspect,world);if(c.phase==='bottom'&&crouchPhase!=='bottom')actions.push('slide');crouchPhase=c.phase;
      const dir=side.update(points,t,aspect);if(dir)actions.push(dir);
      return {pace,actions};
    }};
}
