// Full gravity is independent of the decorative, calibrated room parallax.
export function screenGravity(x,y,angle=0){const a=angle*Math.PI/180,c=Math.cos(a),s=Math.sin(a);return {gx:x*c+y*s,gy:-x*s+y*c};}
export function createPhoneMotionSource(view=globalThis.window,doc=view?.document){
 const listeners=new Set();let running=false,motionAt=-Infinity,lastAngle=null,lastAt=0,permission=null;
 const now=()=> (view.performance?.now?.()??Date.now())/1000;
 const emit=(gravity,shake=0)=>{
  if(doc?.hidden||!Number.isFinite(gravity.gx)||!Number.isFinite(gravity.gy))return;
  const timeSeconds=now(),length=Math.hypot(gravity.gx,gravity.gy);
  // A phone held flat has no screen-plane gravity: retain the last heading instead of inventing a fall.
  if(length<.12)return;
  const gx=gravity.gx/length,gy=gravity.gy/length,angle=Math.atan2(gx,gy);
  let angularSpeed=0;if(lastAngle!=null&&timeSeconds>lastAt){const delta=Math.atan2(Math.sin(angle-lastAngle),Math.cos(angle-lastAngle));angularSpeed=Math.abs(delta)/(timeSeconds-lastAt);}
  lastAngle=angle;lastAt=timeSeconds;
  for(const callback of listeners)callback({gx,gy,shake,angularSpeed,timeSeconds});
 };
 const screenAngle=()=>view.screen?.orientation?.angle??view.orientation??0;
 const motion=event=>{
  const a=event.accelerationIncludingGravity;if(!a||![a.x,a.y].every(Number.isFinite))return;
  const linear=event.acceleration;let shake=linear&&[linear.x,linear.y,linear.z].every(Number.isFinite)?Math.hypot(linear.x,linear.y,linear.z):0;
  if(!linear||linear.x==null)shake=Math.abs(Math.hypot(a.x,a.y,a.z??0)-9.81);
  motionAt=now();emit(screenGravity(-a.x,a.y,screenAngle()),Math.min(80,shake));
 };
 const orientation=event=>{
  if(now()-motionAt<.5||!Number.isFinite(event.beta)||!Number.isFinite(event.gamma))return;
  const b=event.beta*Math.PI/180,g=event.gamma*Math.PI/180;
  emit(screenGravity(Math.cos(b)*Math.sin(g),Math.sin(b),screenAngle()));
 };
 const start=()=>{if(running||!listeners.size)return;running=true;lastAngle=null;lastAt=0;view.addEventListener('devicemotion',motion,{passive:true});view.addEventListener('deviceorientation',orientation,{passive:true});};
 const stop=()=>{if(!running)return;running=false;view.removeEventListener('devicemotion',motion);view.removeEventListener('deviceorientation',orientation);lastAngle=null;};
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
