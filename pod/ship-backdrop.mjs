/** Keep the decorative pod scene moving only while the pod page is the visible workspace. */
export function mountShipBackdropMotion({root=document.getElementById('podShipBackdrop'),body=document.body,doc=document}={}){
 if(!root||!body||!doc)return ()=>{};
 const reduce=doc.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)');
 const view=doc.defaultView,tiltKey='myr5.tiltPermission';
 let tiltFrame=0,nx=0,ny=0,bx=0,by=0,cx=0,cy=0,bt=0,ct=0,lastFrame=0,sensorBase=null,sensorActive=false;
 const clamp=v=>Math.max(-1,Math.min(1,v));
 const clearTilt=()=>{nx=ny=bx=by=cx=cy=bt=ct=0;body.style.setProperty('--pod-bg-x','0px');body.style.setProperty('--pod-bg-y','0px');body.style.setProperty('--pod-bg-tilt','0deg');body.style.setProperty('--pod-controls-x','0px');body.style.setProperty('--pod-controls-y','0px');body.style.setProperty('--pod-controls-tilt','0deg');};
 const tickTilt=now=>{
  tiltFrame=0;if(root.dataset.motionRunning!=='true'){lastFrame=0;clearTilt();return;}
  const elapsed=lastFrame?Math.min(100,Math.max(0,now-lastFrame)):16;lastFrame=now;
  const bg=1-Math.exp(-elapsed/120),controls=1-Math.exp(-elapsed/360);
  bx+=(nx*24-bx)*bg;by+=(ny*24-by)*bg;bt+=(nx*12-bt)*bg;
  cx+=(nx*4-cx)*controls;cy+=(ny*4-cy)*controls;ct+=(nx*1.5-ct)*controls;
  body.style.setProperty('--pod-bg-x',bx.toFixed(2)+'px');body.style.setProperty('--pod-bg-y',by.toFixed(2)+'px');body.style.setProperty('--pod-bg-tilt',bt.toFixed(2)+'deg');
  body.style.setProperty('--pod-controls-x',cx.toFixed(2)+'px');body.style.setProperty('--pod-controls-y',cy.toFixed(2)+'px');body.style.setProperty('--pod-controls-tilt',ct.toFixed(2)+'deg');
  if(Math.abs(nx*24-bx)+Math.abs(ny*24-by)+Math.abs(nx*4-cx)+Math.abs(ny*4-cy)>.08)tiltFrame=requestAnimationFrame(tickTilt);
 };
 const kickTilt=()=>{if(!tiltFrame&&root.dataset.motionRunning==='true')tiltFrame=requestAnimationFrame(tickTilt);};
 const pointerMove=event=>{if(root.dataset.motionRunning!=='true')return;const w=Math.max(1,doc.documentElement.clientWidth),h=Math.max(1,doc.documentElement.clientHeight);nx=Math.max(-1,Math.min(1,(event.clientX/w-.5)*2));ny=Math.max(-1,Math.min(1,(event.clientY/h-.5)*2));kickTilt();};
 const pointerLeave=()=>{nx=ny=0;kickTilt();};
 const orientation=event=>{
  if(root.dataset.motionRunning!=='true'||event.beta==null||event.gamma==null)return;
  if(!sensorBase)sensorBase={beta:event.beta,gamma:event.gamma};
  let x=clamp((event.gamma-sensorBase.gamma)/22),y=clamp((event.beta-sensorBase.beta)/22);
  if((view?.screen?.orientation?.angle||0)%180)[x,y]=[y,-x];
  nx=x;ny=y;kickTilt();
 };
 const startSensor=()=>{
  if(sensorActive||!view?.DeviceOrientationEvent)return;
  view.addEventListener('deviceorientation',orientation);sensorActive=true;sensorBase=null;
 };
 const stopSensor=()=>{if(sensorActive)view?.removeEventListener('deviceorientation',orientation);sensorActive=false;sensorBase=null;};
 const requestSensor=async()=>{
  const api=view?.DeviceOrientationEvent;
  if(!api?.requestPermission)return;
  let answer='denied';try{answer=await api.requestPermission();}catch{}
  try{view.localStorage.setItem(tiltKey,answer==='granted'?'granted':'denied');}catch{}
  if(answer==='granted'){startSensor();sensorButton?.remove();}
 };
 const sensorButton=view?.DeviceOrientationEvent?.requestPermission?doc.createElement('button'):null;
 if(sensorButton){sensorButton.type='button';sensorButton.className='pod-tilt-request';sensorButton.textContent='Enable tilt';sensorButton.setAttribute('aria-label','Enable device tilt to look around');sensorButton.addEventListener('click',requestSensor);doc.querySelector('.ship-header')?.append(sensorButton);}
 const active=()=>{
  const workoutHome=doc.getElementById('portalWorkoutHome');
  const portalHome=doc.getElementById('portalHome');
  const portalShowing=!!portalHome&&!portalHome.hidden&&!workoutHome?.open;
  const covered=portalShowing||[...doc.querySelectorAll('dialog[open]')].some(dialog=>dialog.id!=='portalWorkoutHome');
  const onPod=body.dataset.screen==='pod'&&body.dataset.tracking!=='true'&&!covered;
  const running=onPod&&!doc.hidden&&!reduce?.matches;
  root.dataset.motionRunning=String(running);
  root.dataset.visible=String(onPod);
  if(running){
   let stored='';try{stored=view.localStorage.getItem(tiltKey)||'';}catch{}
   if(!view?.DeviceOrientationEvent?.requestPermission||stored==='granted')startSensor();
  }else{stopSensor();nx=ny=0;lastFrame=0;cancelAnimationFrame(tiltFrame);tiltFrame=0;clearTilt();}
 };
 const routeObserver=new MutationObserver(active);
 routeObserver.observe(body,{attributes:true,attributeFilter:['data-screen','data-tracking','open','hidden'],subtree:true});
 // Runtime portal dialogs are attached directly to body; this small observer detects their insertion.
 const modalObserver=new MutationObserver(active);
 modalObserver.observe(body,{childList:true});
 doc.addEventListener('visibilitychange',active);
 doc.addEventListener('pointermove',pointerMove,{passive:true});doc.defaultView?.addEventListener('blur',pointerLeave);
 reduce?.addEventListener?.('change',active);
  const onPageHide=event=>{if(!event.persisted)cleanup();else root.dataset.motionRunning='false';};
 const onPageShow=()=>active();
 view?.addEventListener('pagehide',onPageHide);
 view?.addEventListener('pageshow',onPageShow);
 active();
 function cleanup(){
  routeObserver.disconnect();modalObserver.disconnect();doc.removeEventListener('visibilitychange',active);
  doc.removeEventListener('pointermove',pointerMove);view?.removeEventListener('blur',pointerLeave);stopSensor();sensorButton?.remove();cancelAnimationFrame(tiltFrame);tiltFrame=0;lastFrame=0;clearTilt();
  reduce?.removeEventListener?.('change',active);
  view?.removeEventListener('pagehide',onPageHide);view?.removeEventListener('pageshow',onPageShow);
  root.dataset.motionRunning='false';root.dataset.visible='false';
 }
 return cleanup;
}
