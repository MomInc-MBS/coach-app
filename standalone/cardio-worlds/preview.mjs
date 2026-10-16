import {createWorldRun,advance,act,collectPower,hit,collectCoin} from './worlds.mjs';
import {createWorldScene} from './scene.mjs';
import {createMotionDriver,startCameraTracking} from './tracking/motion.mjs';
const $=s=>document.querySelector(s),canvas=$('#view'),video=$('#selfie');
let saved=0;try{saved=Math.max(0,Math.min(2,Number(localStorage.getItem('myr5-cardio-worlds-v1'))||0));}catch{}
let run=createWorldRun({unlocked:saved}),camera=null,controller=null,loading=false,coachMode=false,last=0,seenWorld=-1,noticeUntil=0,driver=createMotionDriver();
let tracked={visible:false,jogging:false,calibrated:false,actions:[]};
const scene=createWorldScene(canvas);
const names=['Crown Foundry','Verdant Ruins','Neon Transit'];
const descriptions=[
  'An elevated metal catwalk inside curved gold ribs. Exposed pipes, cylindrical reactors, giant toothed flywheels and engraved alloy replace the square corridor. Clear spools and duck hanging machinery.',
  'An open ravine crossed on cracked, uneven stone slabs. Stepped ziggurats, leaning guardian faces, hanging roots, rope rails and broad jungle canopies. Jump boulders and duck fallen branches.',
  'A rail yard with six rails, gravel ballast and wooden sleepers. A raised station platform and curved canopy on one side; long train cars, signals and staggered city towers on the other.'
];
const powerNames={magnet:'Coin magnet',shield:'Relic shield',doubleCoins:'Double coins',boost:'Dash aura',jetpack:'Jetpack',superJump:'Jump shoes',board:'Hoverboard',headstart:'Head start',scoreBoost:'Score x2',phase:'Phase aura',pogo:'Pogo launch',recovery:'Recovery wings',coinTier:'Triple-value coins'};
function say(text){$('#message').textContent=text;noticeUntil=performance.now()+2500;}
function nav(){ $('#worlds').replaceChildren(...names.map((name,i)=>{const b=document.createElement('button');b.disabled=i>run.unlocked;b.setAttribute('aria-pressed',String(i===run.world));b.innerHTML=`0${i+1} / ${name}<small>${i>run.unlocked?'LOCKED - REACH THROUGH PORTAL':'REPLAY AVAILABLE'}</small>`;b.onclick=()=>{run=createWorldRun({unlocked:run.unlocked});run.world=i;seenWorld=-1;driver=createMotionDriver();tracked={visible:false,jogging:false,calibrated:false,actions:[]};say(`${name}. Stand in view to calibrate.`);};return b;})); }
for(const name of Object.values(powerNames)){const chip=document.createElement('span');chip.className='power-chip';chip.textContent=name;$('#powers').append(chip);}
function stopCamera(message='Camera off. Enable tracking to run.'){
  controller?.abort();controller=null;camera?.stop();camera=null;tracked={visible:false,jogging:false,calibrated:false,actions:[]};video.hidden=true;$('#start').textContent='Enable motion tracking';$('#trackingStatus').textContent='Camera off';say(message);
}
$('#start').onclick=async()=>{
  if(loading)return;if(camera){stopCamera();return;}
  controller=new AbortController();loading=true;$('#start').disabled=true;$('#start').textContent='Opening camera...';$('#trackingStatus').textContent='Loading tracker';driver=createMotionDriver();
  try{
    camera=await startCameraTracking(video,(points,now,aspect,error)=>{
      if(error){stopCamera(`Tracking stopped: ${error.message}`);return;}
      tracked=driver.update(points,now,aspect);
      if(tracked.visible&&tracked.calibrated&&!coachMode)for(const a of tracked.actions)act(run,a);
    },{signal:controller.signal});
    if(document.hidden){stopCamera();return;}
    video.hidden=false;$('#start').textContent='Stop camera';say('Stand naturally for calibration, then jog.');
  }catch(error){const unsupported=/not supported/i.test(error.message);stopCamera(unsupported?'This browser cannot capture camera video. Open this page in a camera-enabled browser.':`Camera unavailable: ${error.message}. Allow camera access and retry.`);noticeUntil=Infinity;}
  finally{loading=false;$('#start').disabled=false;}
};
$('#coach').onclick=()=>{coachMode=!coachMode;scene.setCoach(coachMode);$('#coach').setAttribute('aria-pressed',String(coachMode));say(coachMode?'Coach material study - Sakura ink and textured cloth':'Back to motion-tracked run');};
canvas.addEventListener('coin',()=>collectCoin(run));canvas.addEventListener('power',e=>{collectPower(run,e.detail);say(`${powerNames[e.detail]} collected`);});canvas.addEventListener('hit',()=>{const before=run.stumbles;hit(run);say(run.stumbles>before?'Stumble. Keep jogging!':'Protection absorbed the hit.');});
function frame(now){
  const dt=last?Math.min(.25,(now-last)/1000):0;last=now;
  const visible=!!camera&&driver.fresh(now)&&tracked.visible,moving=visible&&tracked.calibrated&&tracked.jogging&&!coachMode;
  if(camera&&!coachMode)advance(run,dt,{moving});
  if(seenWorld!==run.world){seenWorld=run.world;$('#worldTitle').textContent=names[run.world];$('#worldCopy').textContent=descriptions[run.world];$('#chapter').textContent=`0${run.world+1} / ${names[run.world].toUpperCase()}`;nav();try{localStorage.setItem('myr5-cardio-worlds-v1',String(run.unlocked));}catch{say('Replay unlock lasts for this visit; browser storage is unavailable.');}}
  $('#distance').textContent=`${Math.floor(run.distance)} m`;$('#progress').textContent=`${Math.floor(run.distance)} / 600 M`;$('#bar').style.width=`${run.distance/6}%`;$('#coins').textContent=run.coins;$('#score').textContent=`${Math.floor(run.score)} SCORE`;
  $('#vortex').hidden=run.phase!=='wormhole';$('#buffs').replaceChildren(...Object.entries(run.powers).filter(([,n])=>n>0).map(([id,n])=>{const s=document.createElement('span');s.textContent=`${powerNames[id]} - ${n.toFixed(1)}s`;return s;}));
  $('#pace').textContent=moving?'12 M/S - CONSTANT PACE':'MOTION REQUIRED';
  if(camera)$('#trackingStatus').textContent=!visible?'Move into camera view':!tracked.calibrated?'Calibrating...':tracked.jogging?'Jog detected':'Standing - run paused';
  if(now>noticeUntil)$('#message').textContent=coachMode?'Coach art study':!camera?'Enable camera. Your movement drives the run.':!visible?'Head and shoulders must stay in view.':!tracked.calibrated?'Stand naturally while the camera calibrates.':run.phase==='portal'?'RAISE BOTH ARMS TO JUMP THROUGH THE PORTAL':!moving?'JOG TO RUN - lean to steer, arms up to jump, crouch to slide':run.distance>520?'Purple portal ahead. Get ready to raise both arms.':'Keep jogging. Follow the gold.';
  scene.render(run,now/1000,moving&&run.phase==='run');requestAnimationFrame(frame);
}
// Read-only inspection; movement is accepted only from camera landmarks.
window.cardioLab={get run(){return run;},get motion(){return {...tracked,active:!!camera,fresh:driver.fresh(performance.now())}}};
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopCamera('Camera stopped while this page was hidden.');last=0;});
addEventListener('pagehide',()=>{stopCamera();scene.dispose();},{once:true});requestAnimationFrame(frame);
