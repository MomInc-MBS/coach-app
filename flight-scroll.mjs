// Negative above the center, positive below it; quadratic acceleration at the edges.
export function flightScrollSpeed(clientY,top,height){
 if(!Number.isFinite(clientY)||!(height>0))return 0;
 const offset=Math.max(-1,Math.min(1,2*(clientY-top)/height-1));
 return Math.sign(offset)*offset*offset*1600;
}

export function mountFlightScroll(viewport,{requestFrame=requestAnimationFrame,cancelFrame=cancelAnimationFrame,now=()=>performance.now()}={}){
 let pointerY=null,frame=0,last=0;
 const tick=time=>{
  if(pointerY===null)return;
  const rect=viewport.getBoundingClientRect(),dt=Math.min(50,Math.max(0,time-last));last=time;
  viewport.scrollTop+=flightScrollSpeed(pointerY,rect.top,rect.height)*dt/1000;
  frame=requestFrame(tick);
 };
 return {
  aim(clientY){pointerY=clientY;if(!frame){last=now();frame=requestFrame(tick);}},
  stop(){pointerY=null;if(frame)cancelFrame(frame);frame=0;},
 };
}
