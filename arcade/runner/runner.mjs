// Cardio runner over the camera workout: the 3D corridor fills the stage, the camera shrinks to a mirrored selfie inset,
// the counter/timer and tap-to-stop stay as they are. A skin and controller only: cardio XP and time are still
// counted by performance-workout.mjs; this reads pose events and the workout stage, nothing else.
// Lazy: app.mjs imports this only for march-type cardio (external in scripts/build.mjs).
import * as THREE from 'three';
import {createRun,step,input,setRest} from './maze-run.mjs';
import {createMazeScene} from './maze-scene.mjs';
import {createPoseInput} from './pose-input.mjs';
import {clayText} from './clay-text.mjs';
const RUN_LINES=['Coach not mad.','Coach must help.','Job says catch.','Mom loves you. Run.','Coach hears your feet.','Coach feels torn.'];
const STUMBLE_LINES=['Coach gets closer.','Tripped? Coach saw.','Mom saw that.','Coach smells fear.','Coach getting close.'];
const REST_LINES=['Walk. Coach waits.','Breathe. Coach counts.','Rest hall. Mom is proud.'];
const CSS=`#cameraWorkout.runner-on>video{inset:auto;right:10px;bottom:calc(max(14px,env(safe-area-inset-bottom)) + 160px);width:31vw;max-width:150px;height:auto;aspect-ratio:3/4;object-fit:cover;z-index:2;border-radius:14px;border:2px solid #b07acc;box-shadow:0 6px 18px #000a;background:#000}
#cameraWorkout.runner-on #coachOverlay{visibility:hidden}
#cameraWorkout .runner-layer{position:absolute;inset:0;z-index:0;pointer-events:none;overflow:hidden}
#cameraWorkout .runner-layer canvas.runner-view{position:absolute;inset:0;width:100%;height:100%;display:block}
#cameraWorkout .runner-flash{position:absolute;inset:0;background:radial-gradient(ellipse at center,#ff001840 20%,#ff0018ee);opacity:0}
#cameraWorkout .runner-flash.on{animation:runner-flash .9s ease-out}
@keyframes runner-flash{from{opacity:1}to{opacity:0}}
#cameraWorkout .runner-say{position:absolute;z-index:4;top:calc(max(24px,env(safe-area-inset-top)) + 150px);left:8px;right:8px;display:flex;justify-content:center;pointer-events:none}
#cameraWorkout .runner-say[hidden]{display:none}
#cameraWorkout .runner-say canvas{max-width:100%;height:auto!important;filter:drop-shadow(0 4px 6px #000a)}
#cameraWorkout .runner-say.pop{animation:runner-pop .42s cubic-bezier(.3,1.6,.5,1) both}
@keyframes runner-pop{from{opacity:0;transform:translateY(-14px) scale(.6) rotate(-3deg)}to{opacity:1;transform:none}}
#cameraWorkout .runner-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
@media(prefers-reduced-motion:reduce){#cameraWorkout .runner-say.pop,#cameraWorkout .runner-flash.on{animation:none}}`;
export function mountRunner({host,Session,workout=()=>null,sound=()=>{},seed=Date.now()>>>0}){
  const style=document.createElement('style');style.textContent=CSS;document.head.append(style);
  const layer=document.createElement('div');layer.className='runner-layer';layer.setAttribute('aria-hidden','true');
  const canvas=document.createElement('canvas');canvas.className='runner-view';const flash=document.createElement('div');flash.className='runner-flash';layer.append(canvas,flash);
  const say=document.createElement('div');say.className='runner-say';say.setAttribute('aria-live','polite');say.hidden=true;
  host.prepend(layer);host.append(say);host.classList.add('runner-on');
  const renderer=new THREE.WebGLRenderer({canvas,antialias:false,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(1.5,devicePixelRatio||1));
  const maze=createMazeScene(THREE),run=createRun(seed),body=createPoseInput({Session});
  const still=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
  let raf=0,last=0,lastPose=-Infinity,hideTimer=0,chatAt=performance.now()+5000,line=0,saying='',w=0,h=0;
  function show(text,ms=2200){
    clearTimeout(hideTimer);hideTimer=setTimeout(()=>{say.hidden=true;saying='';},ms);if(saying===text&&!say.hidden)return;saying=text;
    const room=Math.min(innerWidth,host.clientWidth||innerWidth)-24,hh=innerWidth<420?34:44;let art=clayText(text,hh);const aw=parseFloat(art.style.width);if(aw>room)art=clayText(text,hh*room/aw);
    const sr=document.createElement('span');sr.className='runner-sr';sr.textContent=text;say.replaceChildren(art,sr);say.hidden=false;say.classList.remove('pop');void say.offsetWidth;say.classList.add('pop');
  }
  const pick=list=>list[line++%list.length];
  function feed(now){
    for(const f of run.feed.splice(0)){
      if(f.type==='stumble'){show(pick(STUMBLE_LINES));flash.classList.remove('on');void flash.offsetWidth;flash.classList.add('on');sound('jelly');chatAt=now+6000;}
      else if(f.type==='course'){show(f.rest?pick(REST_LINES):`Hall ${f.level+1}. Faster.`,f.rest?5000:2200);sound('lever');chatAt=now+(f.rest?5500:6000);}
    }
    if(now>chatAt){chatAt=now+(run.rest?5500:7000+Math.random()*4000);
      show(run.rest?pick(REST_LINES):!body.calibrated?'Stand still. Coach measures.':run.pace<.15?'Jog, baby. Coach waits.':pick(RUN_LINES),run.rest?5000:2200);}
  }
  function frame(now){
    raf=requestAnimationFrame(frame);const dt=last?Math.min(.05,(now-last)/1000):0;last=now;
    setRest(run,workout()?.stage==='sprint-rest');
    if(now-lastPose>1000)run.pace=Math.max(0,run.pace-dt*1.5); // no body seen: the runner slows to a stop
    step(run,dt);feed(now);
    const cw=host.clientWidth||innerWidth,ch=host.clientHeight||innerHeight;if(cw!==w||ch!==h){w=cw;h=ch;renderer.setSize(w,h,false);}
    maze.render(renderer,run,!still(),{pressure:run.pressure});
  }
  raf=requestAnimationFrame(frame);show('Stand still. Coach measures.',3000);
  return {run,maze,body,show,
    pose(detail){const r=body.update(detail);run.pace=r.pace;for(const a of r.actions)input(run,a);lastPose=performance.now();return r;},
    stop(){cancelAnimationFrame(raf);clearTimeout(hideTimer);renderer.dispose();renderer.forceContextLoss?.();layer.remove();say.remove();style.remove();host.classList.remove('runner-on');}};
}
