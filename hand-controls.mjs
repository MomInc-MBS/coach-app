import {PinchGesture,cursorPoint} from './hand-gesture.mjs';
import {openCamera,cameraFacing,widestZoom} from './camera.mjs';
const timeout=(promise,ms,message)=>{let t;return Promise.race([promise,new Promise((_,reject)=>{t=setTimeout(()=>reject(new Error(message)),ms);})]).finally(()=>clearTimeout(t));};
export class HandControl {
  constructor(options){Object.assign(this,options);this.gesture=new PinchGesture();this.running=false;this.tracker=null;this.stream=null;this.frame=0;this.hover=null;this.held=null;this.lastVideo=-1;this.lastInference=0;}
  async start(){
    this.running=true;
    try{
      if(!navigator.mediaDevices?.getUserMedia)throw new Error('Open the forwarded localhost page to use the camera.');
      const stream=await openCamera(this.camera,24);
      if(!this.running){stream.getTracks().forEach(t=>t.stop());return;}this.stream=stream;this.video.srcObject=stream;
      await timeout(this.video.play(),10000,'No camera frames. Try the other camera in the workout controls.');if(!this.running)return;
      await widestZoom(stream.getVideoTracks()[0]);if(!this.running)return;
      this.mirrored=cameraFacing(stream.getVideoTracks()[0],this.camera)==='user';this.video.style.transform=this.mirrored?'scaleX(-1)':'none';this.video.hidden=false;
      this.message('Loading hand tracker…');
      const api=await timeout(import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs'),20000,'Hand tracker download failed. Check your connection.');if(!this.running)return;
      const files=await timeout(api.FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'),20000,'Hand runtime download timed out.');if(!this.running)return;
      let expired=false;const loading=api.HandLandmarker.createFromOptions(files,{baseOptions:{modelAssetPath:'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',delegate:'CPU'},runningMode:'VIDEO',numHands:1,minHandDetectionConfidence:.65,minHandPresenceConfidence:.6,minTrackingConfidence:.6});
      loading.then(tracker=>{if(!this.running||expired)tracker.close();},()=>{});
      try{this.tracker=await timeout(loading,45000,'Hand model loading timed out.');}catch(error){expired=true;throw error;}
      if(!this.running){this.tracker=null;return;}
      this.message('Show an open hand, then point and pinch.');this.loop();
    }catch(error){this.stop();throw error;}
  }
  clearAim(){this.hover?.classList.remove('hand-hover');this.held?.classList?.remove('hand-down');this.hover=null;this.held=null;this.dragging=false;this.cursor.hidden=true;}
  stop(){this.running=false;cancelAnimationFrame(this.frame);try{this.tracker?.close();}catch{}this.tracker=null;this.stream?.getTracks().forEach(t=>t.stop());this.stream=null;this.video.pause();this.video.srcObject=null;this.video.hidden=true;this.gesture.reset();this.clearAim();}
  loop(){
    if(!this.running||!this.tracker)return;
    try{
      const now=performance.now();
      // Hand menus only need ~15 updates/s; no pose tracker runs at the same time.
      if(now-this.lastInference>=65&&this.video.readyState>=2&&this.video.currentTime!==this.lastVideo){
        this.lastInference=now;this.lastVideo=this.video.currentTime;
        const result=this.tracker.detectForVideo(this.video,now),p=this.gesture.update(result.landmarks[0],now,this.video.videoWidth/this.video.videoHeight);
        if(!p){this.clearAim();this.message('Show an open hand to regain control.');}
        else{
          const r=this.root.getBoundingClientRect(),clip={left:r.left,top:r.top,width:r.width,height:r.height};
          const point=cursorPoint(p,clip,this.mirrored),hit=document.elementFromPoint(point.x,point.y);
          const button=hit?.closest('button[data-hand]:not(:disabled)'),target=button&&this.root.contains(button)?button:null;
          this.cursor.hidden=false;this.cursor.style.left=point.x+'px';this.cursor.style.top=point.y+'px';this.cursor.classList.toggle('pinched',p.pinched);
          if(target!==this.hover){this.hover?.classList.remove('hand-hover');this.hover=target;target?.classList.add('hand-hover');this.hoverSince=now;}
          if(p.down){
            this.downAt=now;this.held=target&&now-this.hoverSince>=100?target:null;this.held?.classList.add('hand-down');
            this.dragging=!target&&!!hit?.closest('#holoStage');
          }
          if(p.pinched&&this.dragging&&this.previous){this.rotate((point.x-this.previous.x)*.008,(point.y-this.previous.y)*.006);}
          if(p.up){const chosen=this.held;const activate=chosen&&chosen===target&&now-this.downAt>=80;this.held?.classList.remove('hand-down');this.held=null;this.dragging=false;if(activate)chosen.click();}
          if(p.canceled){this.held?.classList.remove('hand-down');this.held=null;this.dragging=false;}
          this.previous=point;if(this.running)this.message(!p.armed?'Open your hand to begin.':this.dragging?'Move your pinched hand to rotate the hologram.':p.pinched?'Release to select.':'Point at a button, pinch, then release.');
        }
      }
      if(this.running)this.frame=requestAnimationFrame(()=>this.loop());
    }catch(error){this.stop();this.onError('Hand tracking stopped. '+error.message);}
  }
}
