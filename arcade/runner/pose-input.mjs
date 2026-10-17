// Body -> runner controls. Built for a treadmill with the phone in front (legs usually hidden), and still works jogging in place.
// Upper body only (nose 0, shoulders 11/12, elbows 13/14, wrists 15/16, hips 23/24 when seen):
//   head bob = running (speed never scales with effort) · both arms up + shoulders up = jump · head drops = slide · lean = lane.
// The old knee-lift step (movement-engine jogUpdate) and one-leg side step still count as alternates.
// Every number a real treadmill test might need to move lives in POSE_TUNING. Distances are in shoulder widths.
export const POSE_TUNING={
  jogHold:2,         // s with no head bob (and no knee step) before you count as stopped -> "YOU ARE STOPPED"
  minVisibility:.5,
  bob:{
    min:.06,         // head bob half-swing that counts (shoulder widths). Treadmill walk ~.08, run ~.15; standing jitter ~.02
    maxHalf:.8,      // s: a swing slower than this is drift (walking toward the phone), not a bob
    smooth:.04       // s smoothing on the head signal
  },
  calibrate:1.2,     // s of head/neck samples (running or standing) for the baseline
  adapt:3,           // s time constant: the baseline follows slow drift on the belt (paused while an action is held)
  smooth:.1,         // s smoothing on drop / shrug / lean (kills the bob)
  jump:{
    armAbove:.15,    // wrist this far above its shoulder (or elbow above the shoulder when the wrist is out of frame)
    shrug:.06,       // shoulders risen toward the nose vs baseline neck length
    dwell:.08,cooldown:.9
  },
  crouch:{
    drop:.45,        // head+shoulders below the running baseline (bob is ~.1, so it never slides)
    rearm:.2,dwell:.1,cooldown:.7
  },
  lean:{
    in:.3,           // shoulder tilt + shoulder-mid offset from hip-mid (hips optional)
    out:.12,dwell:.12,cooldown:.5,
    flip:false       // raw camera frames are unmirrored: the player's right is image-left. Flip if a device disagrees.
  },
  settle:.3,         // s after any action before a different action can fire (arms dropping, standing up)
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
    flip:false
  }
};
const median=a=>{const s=[...a].sort((x,y)=>x-y);return s[Math.floor(s.length/2)];};
const ema=(old,v,dt,tau)=>old===null?v:old+(v-old)*(1-Math.exp(-Math.max(dt,.001)/tau));
// Shared upper-body frame: null unless nose and both shoulders are clear.
function upper(p,aspect,minVis){
  if(!p||p.length<17)return null;
  const ok=i=>p[i]&&Number.isFinite(p[i].x)&&Number.isFinite(p[i].y)&&(p[i].visibility??1)>=minVis;
  if(![0,11,12].every(ok))return null;
  const X=i=>p[i].x*aspect,sw=Math.hypot(X(11)-X(12),p[11].y-p[12].y);if(sw<.03)return null;
  return {ok,X,sw,sx:(X(11)+X(12))/2,sy:(p[11].y+p[12].y)/2,ny:p[0].y};
}
// Head bob: a hysteresis peak tracker on (nose+shoulders)/2. Returns true on each up/down reversal of the head. Also used by movement-engine
// to keep Cool Cardio's active time (XP) counting when the knees are hidden by a treadmill console.
export function createHeadBob(tuning=POSE_TUNING){
  let v=null,ext=null,dir=1,lastRev=-Infinity,last=null;
  return {update(points,t,aspect=1){
    const T=tuning.bob,f=upper(points,aspect,tuning.minVisibility);if(!f)return false;
    const dt=last===null?0:t-last;last=t;v=ema(v,(f.ny+f.sy)/2,dt,T.smooth);
    const h=T.min*f.sw;if(ext===null){ext=v;return false;}
    let rev=0;
    if(dir*(v-ext)>0)ext=v;
    else if(Math.abs(v-ext)>=h){rev=dir;dir=-dir;ext=v;}
    if(!rev)return false;
    // Every quick reversal counts (about two per step). Below ~2x the cadence a tracker aliases the bob into a slower
    // wave, so the window widens with the frame gap: a 2 updates/s phone still reads a runner as running.
    const quick=t-lastRev<=Math.max(T.maxHalf,3*dt);lastRev=t;
    return quick;
  }};
}
// Jump / slide / lean from the upper body, with a moving-safe baseline, smoothing, hysteresis, dwell and cooldowns.
export function createUpperBody(tuning=POSE_TUNING){
  let last=null,calib=[],base=null,drop=null,shrug=null,lean=null,lastAct=-Infinity,lastKind='',leanResetSerial=0;
  const st={jump:{armed:true,since:null,fired:-Infinity},slide:{armed:true,since:null,fired:-Infinity},lean:{armed:true,since:null,fired:-Infinity,dir:null,firedDir:null}};
  const hold=(s,on,t,dt,T,kind)=>{
    if(!on){s.since=null;return false;}
    if(s.since===null)s.since=t-dt/2;
    if((t-s.since>=T.dwell||dt>=.125)&&t-s.fired>=T.cooldown&&(lastKind===kind||t-lastAct>=tuning.settle)){s.fired=t;s.armed=false;s.since=null;lastAct=t;lastKind=kind;return true;}
    return false;
  };
  return {get leanResetSerial(){return leanResetSerial},get calibrated(){return !!base},get baseline(){return base},
    signals:()=>({drop,shrug,lean}),
    update(points,t,aspect=1){
      const T=tuning,f=upper(points,aspect,T.minVisibility);if(!f)return null;
      const dt=last===null?0:Math.min(.5,t-last);last=t;
      const head=(f.ny+f.sy)/2,neck=(f.sy-f.ny)/f.sw;
      if(!base){calib.push({t,head,neck});calib=calib.filter(c=>t-c.t<=T.calibrate*2);
        if(calib.length>=5&&t-calib[0].t>=T.calibrate)base={head:median(calib.map(c=>c.head)),neck:median(calib.map(c=>c.neck))};
        return null;}
      const p=points,J=T.jump;
      const arm=(s,e,w)=>f.ok(w)?p[w].y<p[s].y-J.armAbove*f.sw:f.ok(e)&&p[e].y<p[s].y;
      const armsUp=arm(11,13,15)&&arm(12,14,16);
      const hips=f.ok(23)&&f.ok(24),offset=hips?((f.X(23)+f.X(24))/2-f.sx)/f.sw:0,tilt=(p[12].y-p[11].y)/f.sw;
      drop=ema(drop,(head-base.head)/f.sw,dt,T.smooth);shrug=ema(shrug,base.neck-neck,dt,T.smooth);lean=ema(lean,offset+tilt,dt,T.smooth);
      const actions=[],C=T.crouch,L=T.lean;
      // Jump: both arms up AND shoulders up. Rearms when the arms come down.
      if(!armsUp)st.jump.armed=true;
      if(st.jump.armed&&hold(st.jump,armsUp&&shrug>=J.shrug,t,dt,J,'jump'))actions.push('jump');
      // Slide: head and shoulders well below the running baseline.
      if(drop<C.rearm)st.slide.armed=true;
      if(st.slide.armed&&hold(st.slide,!armsUp&&drop>=C.drop,t,dt,C,'slide'))actions.push('slide');
      // Runner-only edge mode accepts a deliberate reversal even when a slow
      // tracker skips upright. Neutral uses the current sample so a short reset
      // is not swallowed by smoothing; raw+filtered gates prevent residual drift
      // from counting as a second gesture on that neutral frame.
      const rawLean=offset+tilt,edgeMode=L.reverseRearm===true;
      if(Math.abs(edgeMode?rawLean:lean)<L.out){if(!st.lean.armed)leanResetSerial++;st.lean.armed=true;}
      const dir=(lean>0)!==L.flip?'right':'left';
      if(st.lean.dir!==dir){st.lean.dir=dir;st.lean.since=null;}
      const leaning=!armsUp&&drop<C.rearm&&Math.abs(lean)>=L.in&&(!edgeMode||(Math.abs(rawLean)>=L.in&&rawLean*lean>0));
      if(edgeMode&&leaning&&st.lean.firedDir&&st.lean.firedDir!==dir)st.lean.armed=true;
      if(st.lean.armed&&hold(st.lean,leaning,t,dt,L,'lean')){actions.push(dir);st.lean.firedDir=dir;}
      // Baseline follows slow belt drift only while nothing is held.
      if(!armsUp&&drop<C.rearm&&Math.abs(lean)<L.out){base.head=ema(base.head,head,dt,T.adapt);base.neck=ema(base.neck,neck,dt,T.adapt);}
      return actions;
    }};
}
// Side-step detector on raw landmarks (ankles 27/28, knees 25/26, hips 23/24, shoulders 11/12).
export function createSideStep(tuning=POSE_TUNING.side){
  let armed=true,since=null,dir=null,lastFire=-Infinity,last=null,stance=null,calib=[];
  const d={get armed(){return armed},stance:()=>stance,update(points,t,aspect=1){
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
// Session: the app's MovementSession class (passed in so the lazy chunk does not reload the engine); only its knee-step
// jog detector is used now. Running = a head bob or a knee step within jogHold seconds.
export function createPoseInput({Session,tuning=POSE_TUNING}){
  const jog=new Session('jogging'),bob=createHeadBob(tuning),body=createUpperBody(tuning),side=createSideStep(tuning.side);
  let lastStep=-Infinity,lastCount=0,lastLane=-Infinity,lastLaneSource='',lastLaneDir=null,lastSideLeanReset=0,jogging=false;
  return {get jogging(){return jogging},get calibrated(){return body.calibrated},body,
    update({points,world=null,width=1,height=1,now}){
      const actions=[];if(!points||!Number.isFinite(now))return {jogging,actions};
      const t=now/1000,aspect=width/Math.max(1,height);
      const s=jog.update(points,now,aspect,world);
      if(s.count>lastCount){lastCount=s.count;lastStep=t;}
      if(bob.update(points,t,aspect))lastStep=t;
      jogging=t-lastStep<=tuning.jogHold;
      const dir=side.update(points,t,aspect);
      let leaned=false;
      for(const a of body.update(points,t,aspect)||[]){
        if(a==='left'||a==='right'){
          // The side-step and torso detectors may describe the same gesture on
          // adjacent samples. Suppress that duplicate, while an opposite lean
          // or a freshly rearmed lean remains a new, intentional edge.
          if(tuning.lean.reverseRearm&&lastLaneSource==='side'&&a===lastLaneDir&&body.leanResetSerial===lastSideLeanReset&&!side.armed)continue;
          lastLane=t;lastLaneSource='lean';lastLaneDir=a;leaned=true;
        }
        actions.push(a);
      }
      if(dir&&!leaned&&t-lastLane>=tuning.side.cooldown){lastLane=t;lastLaneSource='side';lastLaneDir=dir;lastSideLeanReset=body.leanResetSerial;actions.push(dir);}
      return {jogging,actions};
    }};
}
