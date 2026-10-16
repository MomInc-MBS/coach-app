import {createHeadBob,createUpperBody,POSE_TUNING} from './pose-input.mjs';

// Reuse the app's treadmill recognizers. No keyboard, touch or simulated-run fallback.
export function createMotionDriver(){
  const bob=createHeadBob(),body=createUpperBody();let lastBob=-Infinity,lastSeen=-Infinity;
  return {get calibrated(){return body.calibrated},update(points,now,aspect=1){
    const valid=[0,11,12].every(i=>points?.[i]&&Number.isFinite(points[i].x)&&Number.isFinite(points[i].y)&&(points[i].visibility??1)>=POSE_TUNING.minVisibility);
    if(!valid)return {visible:false,calibrated:body.calibrated,jogging:false,actions:[]};
    lastSeen=now;if(bob.update(points,now/1000,aspect))lastBob=now;
    const actions=body.update(points,now/1000,aspect)||[];
    return {visible:true,calibrated:body.calibrated,jogging:body.calibrated&&now-lastBob<POSE_TUNING.jogHold*1000,actions};
  },fresh(now){return now-lastSeen<750;}};
}

export async function startCameraTracking(video,onFrame,{signal}={}){
  if(!isSecureContext)throw Error('Camera needs HTTPS or localhost.');
  let stream,model,stopped=false,raf=0,videoCallback=0,last=-Infinity;
  const stop=()=>{stopped=true;signal?.removeEventListener('abort',stop);cancelAnimationFrame(raf);if(video.cancelVideoFrameCallback)video.cancelVideoFrameCallback(videoCallback);stream?.getTracks().forEach(t=>t.stop());video.srcObject=null;if(model){model.close();model=null;}};
  signal?.addEventListener('abort',stop,{once:true});
  const check=()=>{if(stopped||signal?.aborted)throw Error('Camera start cancelled.');};
  try{
    check();
    stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:'user',width:{ideal:640},height:{ideal:480},frameRate:{ideal:20,max:30}}});
    check();
    video.srcObject=stream;await video.play();
    const base=new URL('../vendor/mediapipe/0.10.14/',import.meta.url).href;
    const {FilesetResolver,PoseLandmarker}=await import(base+'vision_bundle.mjs');
    const files=await FilesetResolver.forVisionTasks(base+'wasm');
    check();
    model=await PoseLandmarker.createFromOptions(files,{baseOptions:{modelAssetPath:base+'pose_landmarker_lite.task',delegate:'CPU'},runningMode:'VIDEO',numPoses:1,minPoseDetectionConfidence:.5,minTrackingConfidence:.5});
    check();
    function frame(now){
      if(stopped)return;
      if(now-last>=65&&video.readyState>=2){last=now;try{const result=model.detectForVideo(video,now);onFrame(result.landmarks?.[0]||null,now,video.videoWidth/Math.max(1,video.videoHeight));}catch(error){stop();onFrame(null,now,1,error);return;}}
      if(video.requestVideoFrameCallback)videoCallback=video.requestVideoFrameCallback(frame);else raf=requestAnimationFrame(frame);
    }
    frame(performance.now());check();return {stop};
  }catch(error){stop();throw error;}
}
