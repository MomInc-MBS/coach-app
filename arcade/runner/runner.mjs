// Cool Cardio runner over the camera workout: the 3D corridor fills the stage, the camera shrinks to a small mirrored
// selfie inset, the counter/timer stays and a tap on it finishes the run. A skin and controller only: cardio XP and time
// are still counted by performance-workout.mjs (endless gentle cardio); this reads pose events and nothing else.
// Endless: courses chain and get harder. Traps and unhit projectiles are stumbles. Stop jogging and the speed ramps to 0
// over 10 s while Coach closes in from behind; 10 s still and he catches you (onCaught finishes the set with its XP).
// Coach also throws junk straight down the hall from the far end; punch or slice it for a small bonus (throws.mjs).
// Lazy: app.mjs imports this only for Cool Cardio (external in scripts/build.mjs).
import * as THREE from 'three';
import {createRun,step,input,stumble,runSpeed,pathAt} from './maze-run.mjs';
import {createMazeScene} from './maze-scene.mjs';
import {createPoseInput} from './pose-input.mjs';
import {clayText} from './clay-text.mjs';
import {coachHand} from './coach-hand.mjs';
import {themeFor} from './themes.mjs';
import {createThrows,createStriker,mountThrowsView,THROW} from './throws.mjs';
const RUN_LINES=['Coach not mad.','Coach must help.','Job says catch.','Mom loves you. Run.','Coach hears your feet.','Coach feels torn.'];
const STUMBLE_LINES=['Coach gets closer.','Tripped? Coach saw.','Mom saw that.','Coach smells fear.','Coach getting close.'];
const CSS=`#cameraWorkout.runner-on>video{inset:auto;right:6px;bottom:max(6px,env(safe-area-inset-bottom));width:22vw;max-width:92px;height:auto;aspect-ratio:3/4;object-fit:cover;z-index:2;border-radius:10px;border:2px solid #fff8;box-shadow:0 4px 12px #000a;background:#000}
#cameraWorkout.runner-on #coachOverlay{visibility:hidden}
#cameraWorkout.runner-on .workout-performance-controls{left:6px;right:auto;bottom:max(6px,env(safe-area-inset-bottom));margin:0;padding:3px;gap:4px;background:#0008;border-radius:10px}
#cameraWorkout.runner-on .workout-performance-controls button,#cameraWorkout.runner-on .workout-performance-controls select{padding:4px 8px;font-size:12px;min-height:32px}
#cameraWorkout.runner-on .camera-workout-housing{filter:hue-rotate(var(--runner-hue,0deg)) saturate(1.25);transition:filter .6s}
#cameraWorkout .runner-layer{position:absolute;inset:0;z-index:0;pointer-events:none;overflow:hidden}
#cameraWorkout .runner-layer canvas.runner-view{position:absolute;inset:0;width:100%;height:100%;display:block}
#cameraWorkout .runner-flash{position:absolute;inset:0;background:radial-gradient(ellipse at center,#ff001840 20%,#ff0018ee);opacity:0}
#cameraWorkout .runner-flash.on{animation:runner-flash .9s ease-out}
@keyframes runner-flash{from{opacity:1}to{opacity:0}}
#cameraWorkout .runner-chaser{position:absolute;left:50%;bottom:0;width:0;height:0;transition:transform .25s linear;transform:translateY(calc((1 - var(--chase,0)) * 70vh))}
#cameraWorkout .runner-chaser .ar-coach-hand{position:absolute;left:0;top:0;transform:translate(-50%,-40vh) rotate(-90deg);filter:drop-shadow(0 0 18px #000);transition:transform .5s cubic-bezier(.3,1.6,.5,1)}
#cameraWorkout .runner-chaser.caught .ar-coach-hand{transform:translate(-50%,-55vh) rotate(-90deg) scale(2)}
#cameraWorkout .runner-say{position:absolute;z-index:4;top:calc(max(24px,env(safe-area-inset-top)) + 110px);left:8px;right:8px;display:flex;justify-content:center;pointer-events:none}
#cameraWorkout .runner-say[hidden]{display:none}
#cameraWorkout .runner-say canvas{max-width:100%;height:auto!important;filter:drop-shadow(0 4px 6px #000a)}
#cameraWorkout .runner-say.pop{animation:runner-pop .42s cubic-bezier(.3,1.6,.5,1) both}
@keyframes runner-pop{from{opacity:0;transform:translateY(-14px) scale(.6) rotate(-3deg)}to{opacity:1;transform:none}}
#cameraWorkout .runner-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
@media(prefers-reduced-motion:reduce){#cameraWorkout .runner-say.pop,#cameraWorkout .runner-flash.on{animation:none}#cameraWorkout .runner-chaser{transition:none}}`;
export function mountRunner({host,Session,sound=()=>{},onXp=()=>{},onCaught=()=>{},seed=Date.now()>>>0}){
  const style=document.createElement('style');style.textContent=CSS;document.head.append(style);
  const layer=document.createElement('div');layer.className='runner-layer';layer.setAttribute('aria-hidden','true');
  const canvas=document.createElement('canvas');canvas.className='runner-view';const flash=document.createElement('div');flash.className='runner-flash';
  const chaser=document.createElement('div');chaser.className='runner-chaser';const coach=coachHand({size:Math.min(340,innerWidth*.9)});chaser.append(coach);layer.append(canvas,flash,chaser);
  const say=document.createElement('div');say.className='runner-say';say.setAttribute('aria-live','polite');say.hidden=true;
  host.prepend(layer);host.append(say);host.classList.add('runner-on');
  const renderer=new THREE.WebGLRenderer({canvas,antialias:false,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(1.5,devicePixelRatio||1));
  const maze=createMazeScene(THREE),run=createRun(seed),body=createPoseInput({Session});
  const still=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Throws live in corridor space (distance ahead, lateral, height) and are drawn and hit-tested through the runner camera.
  const at=(d,x=0,y=0)=>{const p=pathAt(run.distance+d,run.course);return new THREE.Vector3(p.x+Math.cos(p.yaw)*x,y,p.z-Math.sin(p.yaw)*x);};
  const posOf=o=>at(o.d,o.x,o.y),view=mountThrowsView(THREE,maze.scene),strike=createStriker();
  const throws=createThrows({seed,onEvent:(type,d)=>{
    if(type==='hit'){view.hit(d,posOf(d));sound(d.kind==='slice'?'ice':'wood');}
    else if(type==='bonus'){onXp(d.xp);sound('dial');}
    else if(type==='miss')stumble(run,{type:'throw'});}});
  const coachAt=()=>{const c=run.course;let d=THROW.from+1;if(c.turnAt!=null&&run.distance<c.turnAt)d=Math.min(d,c.turnAt-run.distance);return at(d,0,.9);};
  const screen=o=>{const cam=maze.camera,v=posOf(o),depth=v.distanceTo(cam.position);v.project(cam);if(v.z>1||depth<.2)return null;const asp=(host.clientWidth||innerWidth)/(host.clientHeight||innerHeight);
    return {x:(v.x+1)/2*asp,y:(1-v.y)/2,r:o.r/(depth*2*Math.tan(cam.fov*Math.PI/360))};};
  let raf=0,last=0,lastPose=-Infinity,hideTimer=0,chatAt=performance.now()+5000,line=0,saying='',w=0,h=0,course=null,caughtAt=0,wasStill=0;
  function show(text,ms=2200){
    clearTimeout(hideTimer);hideTimer=setTimeout(()=>{say.hidden=true;saying='';},ms);if(saying===text&&!say.hidden)return;saying=text;
    const room=Math.min(innerWidth,host.clientWidth||innerWidth)-24,hh=innerWidth<420?34:44;let art=clayText(text,hh);const aw=parseFloat(art.style.width);if(aw>room)art=clayText(text,hh*room/aw);
    const sr=document.createElement('span');sr.className='runner-sr';sr.textContent=text;say.replaceChildren(art,sr);say.hidden=false;say.classList.remove('pop');void say.offsetWidth;say.classList.add('pop');
  }
  const pick=list=>list[line++%list.length];
  function feed(now){
    for(const f of run.feed.splice(0)){
      if(f.type==='stumble'){if(run.still<2)show(f.trap==='throw'?'Coach hit you.':pick(STUMBLE_LINES));flash.classList.remove('on');void flash.offsetWidth;flash.classList.add('on');sound('jelly');chatAt=now+6000;}
      else if(f.type==='course'){show(`Hall ${f.level+1}. Faster.`);sound('lever');chatAt=now+6000;}
      else if(f.type==='warn'){show('Coach is right behind you. Jog!',4000);sound('crt');chatAt=now+6000;}
      else if(f.type==='caught'){show('Coach caught you.',6000);chaser.classList.add('caught');coach.coach.roll(true);sound('main-control');caughtAt=now;}
    }
    if(wasStill>=2&&run.still===0&&run.status==='running'){show('Coach falls back.');chatAt=now+6000;}
    wasStill=run.still;
    if(now>chatAt&&run.status==='running'){chatAt=now+7000+Math.random()*4000;
      show(!body.calibrated?'Stand still. Coach measures.':!run.started?'Jog in place to run.':pick(RUN_LINES));}
  }
  function frame(now){
    // Wall-clock time (sub-stepped), so a slow phone neither slows the game nor stretches the 10 s stop clock.
    raf=requestAnimationFrame(frame);const dt=last?Math.min(.25,(now-last)/1000):0;last=now;
    if(now-lastPose>1500)run.jogging=false; // no body seen: the stop clock runs
    if(course!==run.course){course=run.course;throws.clear();view.clear();host.style.setProperty('--runner-hue',(themeFor(run.courses).hue-280)+'deg');}
    for(let left=dt;left>1e-6;left-=.05){const d=Math.min(.05,left);step(run,d);throws.step(d,runSpeed(run),run.started&&run.status==='running',run.level);}feed(now);
    // The chaser climbs into view as the stop clock (or stumble pressure) brings Coach close.
    const chase=run.status==='caught'?1:Math.max(run.chase,(run.pressure-.3)*.5);chaser.style.setProperty('--chase',chase.toFixed(3));coach.coach.pressure(Math.max(chase,run.pressure));
    if(caughtAt&&now-caughtAt>3200){caughtAt=0;onCaught();}
    const cw=host.clientWidth||innerWidth,ch=host.clientHeight||innerHeight;if(cw!==w||ch!==h){w=cw;h=ch;renderer.setSize(w,h,false);}
    maze.render(renderer,run,!still(),{pressure:Math.max(run.pressure,run.chase),before:(scene,camera)=>view.update(throws,posOf,coachAt(),camera,dt,now)});
  }
  raf=requestAnimationFrame(frame);show('Stand still. Coach measures.',3000);
  return {run,maze,body,show,throws,screenOf:screen,
    pose(detail){const r=body.update(detail);run.jogging=r.jogging;for(const a of r.actions)input(run,a);lastPose=performance.now();
      if(run.status==='running')for(const s of strike(detail,{width:host.clientWidth||innerWidth,height:host.clientHeight||innerHeight}))throws.strike(s.a,s.b,s.kind,screen);return r;},
    stop(){cancelAnimationFrame(raf);clearTimeout(hideTimer);view.dispose();coach.coach.destroy();renderer.dispose();renderer.forceContextLoss?.();layer.remove();say.remove();style.remove();host.classList.remove('runner-on');host.style.removeProperty('--runner-hue');}};
}
