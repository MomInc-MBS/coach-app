// Full gravity is independent of the decorative, calibrated room parallax.
export function screenGravity(x,y,angle=0){const a=angle*Math.PI/180,c=Math.cos(a),s=Math.sin(a);return {gx:x*c+y*s,gy:-x*s+y*c};}
// Look-around tilt for every room, the ship, the pod and the customizer. Read from the gravity vector, not raw
// beta/gamma deltas: held upright (beta near 90, how iPhones are held) gamma is gimbal-locked, so any small twist
// swings it tens of degrees, and it wraps at +-90 (or flips by 180 with beta past vertical); gravity is smooth through both.
// The angle the phone is held at is zero and that zero follows the hold (time-based, ~95% in recentreS), so the
// view settles wherever it is held. Real phones need tuning: maxDeg = tilt for full look, deadDeg = ignored wobble,
// gain = output at full look (1 = each consumer's full px), recentreS = seconds to re-centre on a new hold.
export const TILT={gain:1,maxDeg:18,deadDeg:1.5,recentreS:3};
const wrap180=a=>((a+180)%360+360)%360-180;
export function createTiltLook(view=globalThis,knobs=TILT){
 let base=null,at=0;
 const out=d=>{const m=Math.max(0,Math.abs(d)-knobs.deadDeg);return Math.sign(d)*knobs.gain*Math.min(1,m/(knobs.maxDeg-knobs.deadDeg));};
 return {
  reset(){base=null;},
  /** {x,y} in -gain..gain (x right, y top edge back), or null for an empty reading. now: ms, defaults to the event's. */
  read(event,now=event?.timeStamp??0){
   if(!Number.isFinite(event?.beta)||!Number.isFinite(event?.gamma))return null;
   const b=event.beta*Math.PI/180,g=event.gamma*Math.PI/180,deg=180/Math.PI;
   const {gx,gy}=screenGravity(Math.cos(b)*Math.sin(g),Math.sin(b),view?.screen?.orientation?.angle??view?.orientation??0),gz=Math.cos(b)*Math.cos(g);
   const roll=Math.atan2(gx,Math.hypot(gy,gz))*deg,pitch=Math.atan2(gy,gz)*deg;
   if(!base){base={roll,pitch};at=now;}
   // dt capped so a pause in events (hidden page, test gaps) is not counted as a long hold.
   const k=1-Math.exp(-Math.min(.1,Math.max(0,(now-at)/1000))*3/knobs.recentreS);at=now;
   base.roll+=(roll-base.roll)*k;base.pitch+=wrap180(pitch-base.pitch)*k;
   return {x:out(roll-base.roll),y:out(wrap180(pitch-base.pitch))};
  }
 };
}
export function createPhoneMotionSource(view=globalThis.window,doc=view?.document){
 const listeners=new Set();let running=false,motionAt=-Infinity,lastAngle=null,lastAt=0,lastGravity=null,permission=null;
 const now=()=> (view.performance?.now?.()??Date.now())/1000;
 const emit=(gravity,shake=0,rotationSpeed=0)=>{
  if(doc?.hidden||!Number.isFinite(gravity.gx)||!Number.isFinite(gravity.gy))return;
  const timeSeconds=now(),length=Math.hypot(gravity.gx,gravity.gy);
  // Pyramid Jump needs the current weak tilt direction even when the stable
  // character heading intentionally holds its last value near flat.
  const steerX=length>=.12/9.81?gravity.gx/length:0;
  // A flat phone has no screen-plane gravity. Hold its last heading, but still
  // deliver gyro and linear-acceleration samples so a shake can trigger motion.
  if(length>=.3)lastGravity={gx:gravity.gx/length,gy:gravity.gy/length};
  const {gx,gy}=lastGravity??{gx:0,gy:1},angle=Math.atan2(gx,gy);
  let angularSpeed=rotationSpeed;if(lastAngle!=null&&timeSeconds>lastAt){const delta=Math.atan2(Math.sin(angle-lastAngle),Math.cos(angle-lastAngle));angularSpeed=Math.max(angularSpeed,Math.abs(delta)/(timeSeconds-lastAt));}
  lastAngle=angle;lastAt=timeSeconds;
  for(const callback of listeners)callback({gx,gy,steerX,shake,angularSpeed,timeSeconds});
 };
 const screenAngle=()=>view.screen?.orientation?.angle??view.orientation??0;
 const motion=event=>{
  const a=event.accelerationIncludingGravity;if(!a||![a.x,a.y].every(Number.isFinite))return;
  const linear=event.acceleration,hasLinear=linear&&[linear.x,linear.y,linear.z].every(Number.isFinite);let shake=hasLinear?Math.hypot(linear.x,linear.y,linear.z):0;
  if(!linear||linear.x==null)shake=Math.abs(Math.hypot(a.x,a.y,a.z??0)-9.81);
  const rate=event.rotationRate;
  // The gyroscope's degrees/second survive delayed delivery when WebGL is busy.
  const rotationSpeed=rate?Math.hypot(...['alpha','beta','gamma'].map(axis=>Number.isFinite(rate[axis])?rate[axis]:0))*Math.PI/180:0;
  motionAt=now();emit(screenGravity(-(a.x-(hasLinear?linear.x:0))/9.81,(a.y-(hasLinear?linear.y:0))/9.81,screenAngle()),Math.min(80,shake),rotationSpeed);
 };
 const orientation=event=>{
  if(now()-motionAt<.5||!Number.isFinite(event.beta)||!Number.isFinite(event.gamma))return;
  const b=event.beta*Math.PI/180,g=event.gamma*Math.PI/180;
  emit(screenGravity(Math.cos(b)*Math.sin(g),Math.sin(b),screenAngle()));
 };
 const start=()=>{if(running||!listeners.size)return;running=true;lastAngle=null;lastAt=0;lastGravity=null;view.addEventListener('devicemotion',motion,{passive:true});view.addEventListener('deviceorientation',orientation,{passive:true});};
 const stop=()=>{if(!running)return;running=false;view.removeEventListener('devicemotion',motion);view.removeEventListener('deviceorientation',orientation);lastAngle=null;lastGravity=null;};
 const request=()=>{
  if(permission)return permission;
  // Both requests must begin in this same tap on iOS, before either promise is awaited.
  const requests=[view.DeviceOrientationEvent,view.DeviceMotionEvent].filter(api=>typeof api?.requestPermission==='function').map(api=>{try{return Promise.resolve(api.requestPermission());}catch{return Promise.resolve('denied');}});
  permission=Promise.all(requests).then(results=>{const granted=results.some(result=>result==='granted')||!requests.length;try{view.localStorage.setItem('myr5.tiltPermission',granted?'granted':'denied');}catch{}if(granted)start();return granted;}).finally(()=>{permission=null;});return permission;
 };
 const click=event=>{if(event.target?.closest?.('.pod-tilt-request,.editor-tilt-request'))void request();};
 const visibility=()=>{lastAngle=null;if(doc?.hidden)stop();else if(allowed())start();};
 const allowed=()=>{if(!view.DeviceMotionEvent?.requestPermission&&!view.DeviceOrientationEvent?.requestPermission)return true;try{return view.localStorage.getItem('myr5.tiltPermission')==='granted';}catch{return false;}};
 const attach=()=>{doc?.addEventListener('click',click,true);doc?.addEventListener('visibilitychange',visibility);view.addEventListener('pageshow',visibility);view.addEventListener('pagehide',stop);if(allowed())start();};
 const detach=()=>{stop();doc?.removeEventListener('click',click,true);doc?.removeEventListener('visibilitychange',visibility);view.removeEventListener('pageshow',visibility);view.removeEventListener('pagehide',stop);};
 return {subscribe(callback){listeners.add(callback);if(listeners.size===1)attach();return()=>{listeners.delete(callback);if(!listeners.size)detach();};},request};
}
// The customizer bundle and its separately loaded housing must share one permission request.
const SOURCE=Symbol.for('myr5.characterPhoneMotion');
const sharedSource=()=>window[SOURCE]??=(createPhoneMotionSource());
export function subscribePhoneMotion(callback){return sharedSource().subscribe(callback);}
export function requestPhoneMotion(){return sharedSource().request();}
