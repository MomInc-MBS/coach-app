import {initCinematics} from './creature/cinematics.js';
import { MovementSession, MOVEMENTS } from './movement-engine.mjs';
import { initLibrary } from './menu.mjs';
import {CoachVoice,CueEvents} from './coach.mjs';
import {initPod} from './pod/pod.mjs';
import {mountHomeCharacter} from './pod/home-character.mjs';
import {initHardware} from './pod/hardware.mjs';
import {setFlipValue,countDigits,clockDigits} from './flip-display.mjs';
import {openCamera,listCameras,findUltrawide,deviceChoice,cameraFacing,widestZoom,cameraReport} from './camera.mjs';
const $=id=>document.getElementById(id),v=$('v'),c=$('c'),g=c.getContext('2d');
if(new URLSearchParams(location.search).has('debug'))$('trackingDiag').hidden=false;
const voice=new CoachVoice(text=>{$('coachCaption').textContent=text;if(!$('restScreen').hidden)$('restFeedback').textContent=text;},text=>$('voiceType').textContent=text),cues=new CueEvents();
document.addEventListener('pointerdown',()=>voice.unlock(),{capture:true});
document.addEventListener('keydown',()=>voice.unlock(),{capture:true});
if(!voice.available){$('voiceType').textContent='Speech unavailable in this browser';$('toggleVoice').disabled=true;}
let pod=null,tracker=null,draw=null,api=null,files=null,stream=null,frame=0,generation=0;
let lastTime=-1,frames=0,timing=0,windowStart=0,lastUi=0;
let session=new MovementSession('squat');
const state={version:'pod-1',phase:'idle',frames:0,poses:0,inferenceMs:0,rate:0,camera:null,delegate:null,error:null,motion:session.snapshot()};
window.myr5TestState=state;
function status(text){if($('status').textContent!==text)$('status').textContent=text;$('status').hidden=text==='Ready';}
const clock=seconds=>`${Math.floor(seconds/60)}:${String(Math.floor(seconds%60)).padStart(2,'0')}`;
function controls(busy){$('start').disabled=busy||pod?.canStart($('movement').value)===false;$('camera').disabled=busy&&state.phase!=='tracking';$('stop').disabled=!busy;$('goal').disabled=busy;$('restDuration').disabled=busy;$('widest').disabled=!stream||state.phase!=='tracking';document.body.dataset.tracking=String(busy);$('previewLabel').textContent=state.phase==='tracking'?'TRACKING':'CAMERA';}
async function refreshLenses(){
  const cameras=await listCameras(),selected=$('camera').value;
  $('camera').querySelectorAll('option[data-device]').forEach(o=>o.remove());
  cameras.forEach((camera,i)=>{const option=document.createElement('option');option.value=deviceChoice(camera.id);option.dataset.device='';option.textContent=camera.label||`Camera ${i+1}`;$('camera').append(option);});
  if([...$('camera').options].some(o=>o.value===selected))$('camera').value=selected;
  return cameras;
}
async function showLensInfo(track){
  let cameras=[];try{cameras=await refreshLenses();}catch{}
  const zoom=await widestZoom(track);if(!stream||!stream.getTracks().includes(track))return;
  const report=cameraReport(track,cameras,zoom);
  const actualId=track.getSettings().deviceId;if(cameras.some(d=>d.id===actualId))$('camera').value=deviceChoice(actualId);
  $('lensInfo').textContent=report.label+' · '+(zoom.applied?`widest exposed zoom ${zoom.zoom}×`:zoom.supported?'Wider zoom could not be applied.':'This lens exposes no zoom control.')+' Follow the camera cue for your exercise.';
  $('cameraDetails').textContent=JSON.stringify(report,null,2);
  // Send only the camera availability/settings shown above to the local test PC.
  // No camera images, body coordinates, or exercise history are sent.
  fetch('/camera-info',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(report)}).catch(()=>{});
}
function release(){
  cancelAnimationFrame(frame);if(tracker){try{tracker.close();}catch{}tracker=null;}draw=null;
  stream?.getTracks().forEach(t=>t.stop());stream=null;v.pause();v.srcObject=null;g.clearRect(0,0,c.width,c.height);
  state.camera=null;state.delegate=null;state.rate=0;
}
function resetMovement(){
  cues.reset();
  const mode=$('movement').value,config=MOVEMENTS[mode];
  pod?.configure(mode);
  const timed=['pace','steps','jumps'].includes(config.kind);$('roundControl').hidden=!timed;
  session=new MovementSession(mode);
  state.motion=session.snapshot();$('hint').textContent=config.hint;renderMotion(state.motion);
  window.dispatchEvent(new Event('myr5:movement-configured'));
  status(state.phase==='tracking'?config.hint:'Ready');
}
function renderMotion(m){
  $('movementName').textContent=m.name;
  const label=m.kind==='hold'?'hold time':m.kind==='pace'?'active time':m.kind==='steps'?'steps':m.kind==='jumps'?'jumps':'reps';
  setFlipValue($('primary'),m.kind==='hold'?clockDigits(m.totalHold):m.kind==='pace'?clockDigits(m.active):countDigits(m.count),label);
  $('primaryLabel').textContent=label;
  const time=m.remaining===null?`Session ${clock(m.elapsed)}`:`Remaining ${clock(m.remaining)}`;
  $('secondary').textContent=m.kind==='hold'?`Best ${clock(m.bestHold)} · Total ${clock(m.totalHold)}`:m.kind==='pace'?`Moving ${clock(m.active)} · Hand pace ${m.speed.toFixed(1)}×`:(m.kind==='steps'||m.kind==='jumps')?`${time} · ${Math.round(m.cadence)}/${m.kind==='steps'?'min':'min'}`:time;
  $('activity').style.width=`${Math.round(m.progress*100)}%`;
  $('measurement').textContent=m.measurement;
  $('jointReadings').textContent=m.jointReadings||'';
  $('countState').textContent=!m.tracking?'Waiting for joints':(['squat','pushup','jumping'].includes(m.mode)&&!m.calibrated)?'Setting start':m.phase==='bottom'?'Return to start to count':m.kind==='hold'?'Hold timer':m.kind==='pace'?'Round timer':'Counter ready';
  $('paceNote').hidden=m.kind!=='pace';
  pod?.render(m);
}
function stop(message='Stopped.'){
  voice.cancel();
  generation++;release();controls(false);state.phase='idle';status(message);$('countState').textContent='Camera stopped';$('detail').textContent='Camera off · Tracker closed';
  pod?.stopped();
}
function timeout(promise,ms,message){let timer;return Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error(message)),ms);})]).finally(()=>clearTimeout(timer));}
async function start(){
  const run=++generation;release();state.phase='camera';controls(true);state.error=null;resetMovement();
  $('trainingView').scrollIntoView({block:'start',behavior:'auto'});
  state.frames=0;state.poses=0;state.inferenceMs=0;status('Opening camera…');voice.say('Get into position.',{interrupt:true});$('detail').textContent='Waiting for video';
  try{
    await pod.beginSet(session.mode);
    if(run!==generation)return;
    if(!navigator.mediaDevices?.getUserMedia)throw new Error('Open Coach over HTTPS to use the camera.');
    const selected=$('camera').value;
    const incoming=await openCamera(selected);
    if(run!==generation){incoming.getTracks().forEach(t=>t.stop());return;}
    stream=incoming;v.srcObject=stream;v.muted=true;
    await timeout(v.play(),10000,'No video. Try the other camera.');
    if(run!==generation)return;
    state.camera=cameraFacing(stream.getVideoTracks()[0],selected);
    v.style.transform=c.style.transform=state.camera==='user'?'scaleX(-1)':'none';
    await showLensInfo(stream.getVideoTracks()[0]);if(run!==generation)return;
    status('Loading tracker…');$('detail').textContent=`Video ${v.videoWidth} × ${v.videoHeight}`;state.phase='model';
    api=api||await timeout(import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs'),20000,'Tracker didn’t download. Check your connection.');
    if(run!==generation)return;
    files=files||await timeout(api.FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'),20000,'Tracker didn’t download. Check your connection.');
    if(run!==generation)return;
    // This Pixel's GPU path lost its WebGL context. CPU is the measured baseline.
    let expired=false;
    const loading=api.PoseLandmarker.createFromOptions(files,{baseOptions:{modelAssetPath:'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',delegate:'CPU'},runningMode:'VIDEO',numPoses:1});
    loading.then(created=>{if(run!==generation||expired)created.close();},()=>{});
    let created;
    try{created=await timeout(loading,60000,'Tracker took too long. Tap Begin to retry.');}catch(error){expired=true;throw error;}
    if(run!==generation)return;
    tracker=created;draw=new api.DrawingUtils(g);state.delegate='CPU';state.phase='tracking';
    controls(true);
    lastTime=-1;frames=0;timing=0;windowStart=performance.now();lastUi=0;
    status(MOVEMENTS[session.mode].hint);voice.say(MOVEMENTS[session.mode].hint,{interrupt:true});loop(run);
  }catch(error){
    if(run!==generation)return;
    generation++;release();controls(false);pod.stopped();state.phase='error';state.error=error.message;
    status(error.name==='NotAllowedError'?'Allow camera access, then tap Begin.':error.message);voice.say($('status').textContent,{interrupt:true});$('detail').textContent='Camera off · Tracker closed';
  }
}
function loop(run){
  if(run!==generation||!tracker)return;
  try{
    const now=performance.now();
    if(v.readyState>=2&&v.currentTime!==lastTime){
      lastTime=v.currentTime;if(c.width!==v.videoWidth||c.height!==v.videoHeight){c.width=v.videoWidth;c.height=v.videoHeight;}
      g.clearRect(0,0,c.width,c.height);
      const before=performance.now(),result=tracker.detectForVideo(v,now),elapsed=performance.now()-before;
      state.frames++;frames++;timing+=elapsed;state.poses=result.landmarks.length;
      const p=result.landmarks[0]?.slice(0,27);
      if(p){draw.drawConnectors(p,api.PoseLandmarker.POSE_CONNECTIONS.filter(b=>b.start<=26&&b.end<=26),{color:'#bc89ff',lineWidth:3});draw.drawLandmarks(p.filter(q=>q.visibility>=.45),{color:'#aaffd9',radius:3});draw.drawLandmarks(p.filter(q=>q.visibility<.45),{color:'#ffad66',radius:3});}
      state.motion=session.update(p,now,v.videoWidth/v.videoHeight,result.worldLandmarks?.[0]);
      const cueMotion=['hold','pace'].includes(state.motion.kind)?{...state.motion,remaining:Math.max(0,pod.goal()-(state.motion.kind==='hold'?state.motion.totalHold:state.motion.active))}:state.motion;
      const events=cues.update(cueMotion,now),encouragement=pod.encouragement(state.motion,now,events);if(encouragement)events.push(encouragement);
      for(const cue of events){window.dispatchEvent(new CustomEvent('myr5:cue',{detail:{key:cue.key==='encouragement'?'time':cue.key}}));voice.say(cue.text,{key:cue.key,interrupt:cue.key==='complete'||cue.key==='ready'});}
      if(pod.consume(state.motion,Date.now())){renderMotion(state.motion);cinematics.play('post');return;}
      if(now-windowStart>=1000){state.rate=frames*1000/(now-windowStart);state.inferenceMs=timing/frames;frames=0;timing=0;windowStart=now;}
      if(now-lastUi>=160){renderMotion(state.motion);status(state.motion.message);$('detail').textContent=`${state.rate.toFixed(0)} tracking updates/s · ${state.inferenceMs.toFixed(0)} ms/update · ${v.videoWidth} × ${v.videoHeight}`;lastUi=now;}
      if(state.motion.complete){renderMotion(state.motion);stop('Round complete.');voice.say('Round complete. Well done.',{interrupt:true});return;}
    }
    frame=requestAnimationFrame(()=>loop(run));
  }catch(error){generation++;release();controls(false);pod.stopped();voice.cancel();state.phase='error';state.error=error.message;status('Tracking stopped: '+error.message);voice.say($('status').textContent,{interrupt:true});$('detail').textContent='Camera off · Tracker closed';}
}
for(const [id,config] of Object.entries(MOVEMENTS)){const option=document.createElement('option');option.value=id;option.textContent=config.name;$('movement').appendChild(option);}
$('start').addEventListener('click',()=>library.introduce());$('stop').addEventListener('click',()=>{stop();voice.say('Stopped.',{interrupt:true});});
$('reset').addEventListener('click',()=>{resetMovement();voice.say('Count reset. Return to your starting position.',{interrupt:true});});
$('goal').addEventListener('change',()=>{resetMovement();voice.say('Set goal. '+$('goal').selectedOptions[0].textContent+'.',{interrupt:true});});
$('movement').addEventListener('change',event=>{const active=state.phase==='tracking';if(!event.detail?.automatic)window.dispatchEvent(new Event('myr5:exercise-selected'));resetMovement();voice.say(MOVEMENTS[$('movement').value].name+' selected.',{interrupt:true});if(active)library.introduce();});
$('duration').addEventListener('change',()=>{resetMovement();voice.say(Number($('duration').value)?$('duration').value+' second round.':'Open timer.',{interrupt:true});});
function soundSwitch(){$('toggleVoice').textContent=voice.enabled?'ON':'OFF';$('toggleVoice').dataset.on=String(voice.enabled);$('toggleVoice').setAttribute('aria-checked',String(voice.enabled));}
$('toggleVoice').addEventListener('click',()=>{voice.setEnabled(!voice.enabled);soundSwitch();voice.say(voice.enabled?'Voice on.':'Voice off.',{interrupt:true});});
$('testVoice').addEventListener('click',()=>{voice.setEnabled(true);soundSwitch();voice.say('Coach ready. Move at your own pace. One. Two. Three. Thirty seconds left.',{interrupt:true});});
$('camera').addEventListener('change',()=>{voice.say('Camera selected.',{interrupt:true});if(state.phase==='tracking')start();});
$('widest').addEventListener('click',async()=>{
  const track=stream?.getVideoTracks()[0];if(!track)return;$('widest').disabled=true;
  try{const cameras=await refreshLenses(),wide=findUltrawide(cameras);if(state.camera!=='user'&&wide&&track.getSettings().deviceId!==wide.id){$('camera').value=deviceChoice(wide.id);await start();}else{await showLensInfo(track);if(state.phase==='tracking')resetMovement();}}
  catch(error){$('lensInfo').textContent='Could not change the lens: '+error.message;}
  finally{$('widest').disabled=state.phase!=='tracking';}
});
window.addEventListener('pagehide',()=>stop());document.addEventListener('visibilitychange',()=>{if(document.hidden&&state.phase!=='idle')stop('Paused. Tap Begin to continue.');});
pod=initPod({voice,movements:MOVEMENTS,onStop:()=>stop('Set ended.'),onNext:async next=>{await library.introduce(next?.mode);if(next)pod.setGoal(next.goal);}});
resetMovement();
initHardware();soundSwitch();
const library=initLibrary({movements:MOVEMENTS,voice,onOpen:()=>stop('Paused.'),onSelect:mode=>{$('movement').value=mode;window.dispatchEvent(new Event('myr5:exercise-selected'));resetMovement();},onStart:()=>{if(!document.hidden)start();},camera:()=>$('camera').value,movement:()=>$('movement').value});
$('variationName').addEventListener('click',()=>library.introduce($('movement').value));
mountHomeCharacter();

const cinematics=initCinematics({voice});
window.myr5Cinematics=cinematics;
