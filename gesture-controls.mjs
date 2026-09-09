import {ExerciseRecognizer,GestureConfirmation} from './exercise-gestures.mjs';
import {openCamera,cameraFacing,widestZoom} from './camera.mjs';
const timeout=(promise,ms,message)=>{let t;return Promise.race([promise,new Promise((_,reject)=>{t=setTimeout(()=>reject(new Error(message)),ms);})]).finally(()=>clearTimeout(t));};
export class HandControl {
 constructor(options){Object.assign(this,options);this.recognizer=new ExerciseRecognizer();this.confirmation=new GestureConfirmation();this.running=false;this.models=[];this.frame=0;this.lastVideo=-1;this.lastInference=-Infinity;}
 async start(){
  this.running=true;
  try{
   const stream=await openCamera(this.camera,20);if(!this.running){stream.getTracks().forEach(t=>t.stop());return;}this.stream=stream;this.video.srcObject=stream;
   await timeout(this.video.play(),10000,'No camera frames. Try the other camera.');if(!this.running)return;
   await widestZoom(stream.getVideoTracks()[0]);if(!this.running)return;
   this.video.style.transform=cameraFacing(stream.getVideoTracks()[0],this.camera)==='user'?'scaleX(-1)':'none';this.video.hidden=false;
   this.message('Loading gesture recognition…');
   const api=await timeout(import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs'),20000,'Gesture library download timed out.');if(!this.running)return;
   const files=await timeout(api.FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'),20000,'Gesture runtime download timed out.');if(!this.running)return;
   const create=async(Type,modelAssetPath,options)=>{let expired=false;const loading=Type.createFromOptions(files,{baseOptions:{modelAssetPath,delegate:'CPU'},runningMode:'VIDEO',...options});loading.then(model=>{if(!this.running||expired)model.close();},()=>{});try{const model=await timeout(loading,60000,'Gesture model loading timed out.');if(this.running)this.models.push(model);return model;}catch(error){expired=true;throw error;}};
   this.pose=await create(api.PoseLandmarker,'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',{numPoses:1});if(!this.running)return;
   this.hand=await create(api.HandLandmarker,'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',{numHands:2,minHandDetectionConfidence:.6,minTrackingConfidence:.6});if(!this.running)return;
   this.message('Make an exercise gesture, then hold thumbs up to confirm.');this.loop();
  }catch(error){this.stop();throw error;}
 }
 stop(){this.running=false;cancelAnimationFrame(this.frame);this.models.splice(0).forEach(m=>{try{m.close();}catch{}});this.stream?.getTracks().forEach(t=>t.stop());this.stream=null;this.video.pause();this.video.srcObject=null;this.video.hidden=true;this.confirmation.reset();}
 loop(){
  if(!this.running)return;
  try{
   const now=performance.now();
   // Two small trackers run only in this optional menu, at most eight passes/s.
   if(now-this.lastInference>=125&&this.video.readyState>=2&&this.video.currentTime!==this.lastVideo){
    this.lastInference=now;this.lastVideo=this.video.currentTime;
    const pose=this.pose.detectForVideo(this.video,now),hands=this.hand.detectForVideo(this.video,now);
    const input=this.recognizer.update(pose.landmarks[0],hands.landmarks,now,this.video.videoWidth/this.video.videoHeight);
    this.onGesture(this.confirmation.update(input,now));
   }
   if(this.running)this.frame=requestAnimationFrame(()=>this.loop());
  }catch(error){this.stop();this.onError('Gesture tracking stopped. '+error.message);}
 }
}
