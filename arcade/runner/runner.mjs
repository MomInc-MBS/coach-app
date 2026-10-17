// Cool Cardio uses the app's existing pose stream and owns no camera or exercise-XP timer.
import * as THREE from 'three';
import {createRun,step,stumble} from './maze-run.mjs';
import {createPoseInput,POSE_TUNING} from './pose-input.mjs';
import {distPointSeg} from '../slice/core.mjs';
import {createThrows,createStriker,mountThrowsView,THROW} from './throws.mjs';
import {createWorldRun,advance,act,resolveThrowMiss,emitRunEvent,punchCourse,WORLDS} from './worlds/worlds.mjs';
import {jumpHeight,courseHazards} from './worlds/course.mjs';
// Private runner tuning: exercise detectors and the app camera retain their original settings.
export const RUNNER_POSE_TUNING={...POSE_TUNING,smooth:.045,settle:.12,lean:{...POSE_TUNING.lean,in:.2,out:.09,dwell:.05,cooldown:.25}};
import {createWorldScene} from './worlds/scene.mjs';
import {CSS} from './worlds/host-style.mjs';
const NAMES={magnet:'Coin magnet',shield:'Relic shield',doubleCoins:'Double coins',boost:'Dash aura',jetpack:'Jetpack',superJump:'Jump shoes',board:'Hoverboard',headstart:'Head start',scoreBoost:'Score x2',phase:'Phase aura',pogo:'Pogo launch',recovery:'Recovery wings',coinTier:'Triple-value coins'};
const EXTRA=`.runner-hud{position:absolute;z-index:4;top:calc(env(safe-area-inset-top,0px) + 88px);left:10px;right:10px;display:flex;justify-content:space-between;gap:8px;color:#fff;font:700 12px system-ui;text-shadow:0 2px 5px #261736;pointer-events:none}.runner-hud b{display:block;font-size:14px}.runner-hud select{pointer-events:auto;max-width:155px;background:#281c3bd9;color:#fff;border:1px solid #cda5f0;border-radius:8px;padding:8px;font:600 12px system-ui;min-height:36px}.runner-buffs{position:absolute;z-index:3;top:calc(env(safe-area-inset-top,0px) + 164px);left:10px;display:grid;gap:3px;pointer-events:none;color:#fff;font:600 11px system-ui}.runner-buffs span{border-left:3px solid #e8c475;background:#281c3bba;border-radius:0 5px 5px 0;padding:4px 7px}.runner-vortex{position:absolute;z-index:5;inset:0;display:grid;place-content:center;background:radial-gradient(ellipse,#fff 0,#ecc0ff 4%,#8843ce 18%,#1d0d45 60%,#080416);overflow:hidden;color:#fff;font:800 17px system-ui;letter-spacing:4px}.runner-vortex[hidden]{display:none}.runner-vortex i{position:absolute;inset:-75%;border-radius:50%;background:repeating-conic-gradient(transparent 0 12deg,#f4c8ff70 13deg 15deg,transparent 16deg 30deg);animation:runner-vortex 1.8s linear infinite}.runner-vortex b{z-index:1;text-shadow:0 2px 8px #251336}@keyframes runner-vortex{to{transform:rotate(360deg)}}.runner-stopped{z-index:6!important}.runner-say{top:auto!important;bottom:23%;font:700 15px system-ui;color:#fff;text-align:center;text-shadow:0 2px 5px #1b0d2b}.runner-say span{background:#261a38d9;border:1px solid #dfb5ef66;border-radius:10px;padding:10px 14px}@media(prefers-reduced-motion:reduce){.runner-vortex i{animation:none}}`;
export function mountRunner({host,Session,sound=()=>{},onXp=()=>{},onCaught=()=>{},seed=Date.now()>>>0,ownerId='guest'}){
 const key=`myr5-cardio-worlds-v1:${String(ownerId||'guest')}`;let unlocked=0;try{unlocked=Number(localStorage.getItem(key))||0;}catch{}
 let worldRun=createWorldRun({unlocked});const run=createRun(seed),body=createPoseInput({Session,tuning:RUNNER_POSE_TUNING});run.events=[];run.course.length=Infinity;
 const el=(tag,cls)=>{const e=document.createElement(tag);if(cls)e.className=cls;return e;};
 const style=el('style');style.textContent=CSS+EXTRA;document.head.append(style);
 const layer=el('div','runner-layer');layer.setAttribute('aria-hidden','true');const canvas=el('canvas','runner-view'),flash=el('div','runner-flash'),chaser=el('div','runner-chaser'),shadow=el('div','runner-hand-shadow');chaser.append(shadow);layer.append(canvas,flash,chaser);
 const hud=el('div','runner-hud'),info=el('div'),title=el('b'),route=el('small'),replay=el('select'),score=el('div'),buffs=el('div','runner-buffs'),say=el('div','runner-say'),stopped=el('div','runner-stopped'),vortex=el('div','runner-vortex');
 replay.setAttribute('aria-label','Replay unlocked area');info.append(title,route,el('br'),replay);hud.append(info,score);say.setAttribute('role','status');say.hidden=true;stopped.setAttribute('role','alert');stopped.hidden=true;stopped.innerHTML='<b>YOU ARE<br>STOPPED</b><span>Jog to keep going</span>';vortex.hidden=true;vortex.innerHTML='<i></i><b>BETWEEN WORLDS</b>';
 host.prepend(layer);host.append(hud,buffs,say,stopped,vortex);host.classList.add('runner-on');
 let disposed=false,raf=0,last=0,lastPose=-Infinity,lastLaneAction=-Infinity,hideTimer=0,caughtAt=0,seenWorld=-1,seenLoop=-1,seenLeg=-1,seenPickup=0,seenEvent=0,lastBuffs='',frameDt=0,frameNow=0,throws,view;
 const at=(d,x=0,y=0)=>new THREE.Vector3(x*2.8,(worldRun.elevation||0)+y,-d),posOf=o=>at(o.d,o.x,o.y);
 const maze=createWorldScene(canvas,{beforeRender:(scene,camera)=>{if(view&&throws)view.update(throws,posOf,at(THROW.from+1,0,.9),camera,frameDt,frameNow);}});
 view=mountThrowsView(THREE,maze.scene,{showCoach:false});const strike=createStriker();
 function show(text,ms=2200){clearTimeout(hideTimer);const span=el('span');span.textContent=text;say.replaceChildren(span);say.hidden=false;hideTimer=setTimeout(()=>say.hidden=true,ms);}
 throws=createThrows({seed,onEvent:(type,d)=>{if(type==='hit'){view.hit(d,posOf(d));emitRunEvent(worldRun,'punch',{id:'throw-'+d.id,kind:'throw',lane:d.x,distance:worldRun.distance+d.d,result:'destroyed'});sound(d.kind==='slice'?'ice':'wood');}else if(type==='bonus'){onXp(d.xp);sound('dial');}else if(type==='miss')resolveThrowMiss(worldRun,d);}});
 const screen=o=>{const v=posOf(o),depth=v.distanceTo(maze.camera.position);v.project(maze.camera);if(v.z>1||depth<.2)return null;return {x:(v.x+1)/2*(host.clientWidth||innerWidth)/(host.clientHeight||innerHeight),y:(1-v.y)/2,r:o.r/(depth*2*Math.tan(maze.camera.fov*Math.PI/360))};};
 function updateReplay(){replay.replaceChildren(...WORLDS.map((w,i)=>{const o=el('option');o.value=String(i);o.disabled=i>worldRun.unlocked;o.textContent=`${i>worldRun.unlocked?'Locked: ':''}${w.name}`;return o;}));replay.value=String(worldRun.world);}
 replay.onchange=()=>{const i=Number(replay.value);if(i>worldRun.unlocked||!Number.isInteger(i)||i<0||i>2)return;worldRun=createWorldRun({unlocked:worldRun.unlocked});worldRun.world=i;seenWorld=-1;seenPickup=0;seenEvent=0;seenLeg=-1;throws.clear();view.clear();show(`${WORLDS[i].name}. Keep jogging.`);};
 function reflect(){run.lane=worldRun.lane+1;run.jumpTime=worldRun.jump;run.slideTime=worldRun.slide;run.height=(worldRun.elevation||0)+jumpHeight(worldRun);run.duck=worldRun.slide>0?1:0;run.distance=worldRun.distance;run.total=worldRun.totalDistance;run.level=worldRun.loop;run.courses=worldRun.loop*6+worldRun.world*2+worldRun.leg;}
 function frame(now){
  if(disposed)return;raf=requestAnimationFrame(frame);frameDt=last?Math.min(.25,(now-last)/1000):0;last=now;frameNow=now;if(now-lastPose>750)run.jogging=false;
  for(let left=frameDt;left>1e-6;left-=.05){const dt=Math.min(.05,left);step(run,dt);if(run.status==='running')advance(worldRun,dt,{moving:run.started,pace:run.gait*(run.stumble>0?.3:1)});throws.step(dt,12*run.gait,run.started&&run.status==='running'&&worldRun.phase==='run',run.level);}
  reflect();
  if(seenWorld!==worldRun.world||seenLoop!==worldRun.loop||seenLeg!==worldRun.leg){seenWorld=worldRun.world;seenLoop=worldRun.loop;seenLeg=worldRun.leg;throws.clear();view.clear();updateReplay();try{localStorage.setItem(key,String(worldRun.unlocked));}catch{}show(`${WORLDS[worldRun.world].name} - ${worldRun.leg?'Return route - mirrored':'Outbound route'}${worldRun.loop?` - Circuit ${worldRun.loop+1}`:''}`);sound('lever');}
  if((worldRun.pickupSerial||0)!==seenPickup){seenPickup=worldRun.pickupSerial||0;if(worldRun.lastPickup){show(`${NAMES[worldRun.lastPickup]}!`);sound('dial');}}
  for(const event of worldRun.events.filter(e=>e.serial>seenEvent)){
    seenEvent=event.serial;
    if(event.type==='hit'&&event.result==='stumble'){stumble(run,{type:event.kind||event.type});flash.classList.remove('on');void flash.offsetWidth;flash.classList.add('on');show('Bump! Your pursuer gets closer.');sound('jelly');}
    else if(event.type==='hit'&&event.result==='absorbed')show('Protection absorbed the hit.');
    else if(event.type==='dodge')show('Clear dodge!',850);
    else if(event.type==='punch')show('Smashed!',850);
  }
  for(const event of run.feed.splice(0)){if(event.type==='warn')show('Coach is right behind you. Jog!',4000);if(event.type==='caught'){show('Coach caught you.',6000);chaser.classList.add('caught');caughtAt=now;}}
  const chase=run.status==='caught'?1:Math.max(run.chase,(run.pressure-.3)*.5);chaser.style.setProperty('--chase',chase.toFixed(3));worldRun.chase=chase;worldRun.pressure=run.pressure;worldRun.bumpCount=worldRun.stumbles;shadow.style.setProperty('--bumps',String(worldRun.stumbles));stopped.hidden=!(run.started&&!run.jogging&&run.status==='running');vortex.hidden=worldRun.phase!=='wormhole';
  if(worldRun.phase==='portal'&&say.hidden)show(worldRun.leg===0?'Halfway! Raise both arms to return through the portal.':'Raise both arms to enter the next world.',4000);
  title.textContent=WORLDS[worldRun.world].name;route.textContent=`Pass ${worldRun.leg+1}/2 ? ${worldRun.leg?'Return':'Outbound'} ? ${Math.floor(worldRun.distance)} / 600 m${worldRun.elevation>.5?' - Rooftop':''}`;score.textContent=`${worldRun.coins} coins / ${Math.floor(worldRun.score)} score`;
  const text=Object.entries(worldRun.powers).filter(([,n])=>n>0).map(([id,n])=>`${NAMES[id]} - ${Math.ceil(n)}s`).join('|');if(text!==lastBuffs){lastBuffs=text;buffs.replaceChildren(...text.split('|').filter(Boolean).map(t=>{const s=el('span');s.textContent=t;return s;}));}
  try{maze.render(worldRun,now/1000,run.started&&run.status==='running'&&worldRun.phase==='run');}catch(error){cancelAnimationFrame(raf);run.paused=true;show('Graphics interrupted. Finish this set and reopen Cool Cardio.',60000);console.warn('Cool Cardio rendering stopped:',error);}
  if(caughtAt&&now-caughtAt>3200){caughtAt=0;onCaught();}
 }
 const onVisibility=()=>{last=0;if(document.hidden)run.jogging=false;};document.addEventListener('visibilitychange',onVisibility);updateReplay();raf=requestAnimationFrame(frame);show('Jog to run. Lean to steer. Arms up to jump.',4000);
 return {run,maze,body,show,throws,get worldRun(){return worldRun},screenOf:screen,
  pose(detail){const result=body.update(detail),visible=[0,11,12].every(i=>(detail.points?.[i]?.visibility??0)>=.5);run.jogging=visible&&result.jogging;lastPose=performance.now();if(visible&&run.status==='running')for(const a of result.actions){const laneAction=['left','right','moveLeft','moveRight'].includes(a),stamp=Number.isFinite(detail.now)?detail.now:performance.now();if(laneAction){if(stamp-lastLaneAction<250)continue;lastLaneAction=stamp;}act(worldRun,a);}reflect();if(visible&&run.status==='running'&&worldRun.phase==='run')for(const s of strike(detail,{width:host.clientWidth||innerWidth,height:host.clientHeight||innerHeight})){
    throws.strike(s.a,s.b,s.kind,screen);
    for(const h of courseHazards(worldRun.world,worldRun.loop,worldRun.leg)){
      const d=h.distance-worldRun.distance;if(d<0||d>THROW.reach||worldRun.hazardsSeen[h.id])continue;
      const target=screen({d,x:h.lane,y:h.type==='jump'?.45:1.3,r:.65});
      if(target&&distPointSeg(target,s.a,s.b)<=target.r+THROW.pad)punchCourse(worldRun,h.id);
    }
  }return result;},
  stop(){if(disposed)return;disposed=true;cancelAnimationFrame(raf);clearTimeout(hideTimer);document.removeEventListener('visibilitychange',onVisibility);view.dispose();maze.dispose();for(const e of [layer,hud,buffs,say,stopped,vortex,style])e.remove();host.classList.remove('runner-on');}
 };
}
