// Fruit Ninja rest mode: the coach (top) throws space junk at the user's character; swipe slices, tap explodes,
// tilt (or arrow keys) dodges, holding still shields from the laser. Lazy-loaded by pod.mjs; engine = ./core.mjs.
import {createSlice,render} from './core.mjs';
import {createDodger,createSwipe,throwPlan,REST} from './rest-logic.mjs';
import {subscribePhoneMotion,requestPhoneMotion} from '../../character-phone-sensor.mjs';
import {performanceOwner} from '../../performance-progress.mjs';
import {createQuestProgressReporter} from '../quest-progress-reporter.mjs';

const W=180,GRAV=260;
export function mountRestGame(scene,{avatar,attackButton,feedback}){
 const canvas=document.createElement('canvas'),g=canvas.getContext('2d');
 canvas.className='slice-layer';canvas.setAttribute('aria-hidden','true');
 let e,dodger,frame=0,last=0,nextThrow=0,nextLaser=0,throws=0,swallow=false,unsub=()=>{},k=1,runOwner=null,reportQuest=null;
 const phone={gx:0,motion:0},pointer={down:false,x:0,y:0,speed:0};
 const swipe=createSwipe(),say=t=>{if(feedback)feedback.textContent=t;};
 const floorY=()=>e.h*.8,coachY=()=>e.h*.17;
 const toLogical=ev=>{const r=canvas.getBoundingClientRect();return {x:(ev.clientX-r.left)/r.width*e.w,y:(ev.clientY-r.top)/r.height*e.h};};
 function begin(){
  const b=scene.getBoundingClientRect();k=b.width/W;const h=Math.round(W*b.height/b.width);
  canvas.width=W;canvas.height=h;
  e=createSlice({w:W,h,mode:'rest',auto:false,coachX:W/2,onEvent:(type,d)=>{
   if(type==='laser-hit')say('Zapped! Hold still to shield next time.');
   if(type==='laser-shield')say('Shield up. Nice and steady.');
   if(type==='combo'){say(`COMBO x${d.n}!`);reportQuest?.record('fruit-streak',d.n);}
   if(type==='wave-end')say('Wave over. Keep going, your rest continues.');
  }});
  dodger=createDodger(W,14);throws=0;nextThrow=1;nextLaser=REST.laserEvery[0]/1000;
 }
 function throwRock(){
  const p=throwPlan(e.wave,e.coachX,dodger.x),y0=coachY(),vy=40,D=floorY()-y0,T=(-vy+Math.sqrt(vy*vy+2*GRAV*D))/GRAV;
  for(let i=0;i<p.count;i++)e.spawn({x:p.x+i*6,y:y0,vx:(p.aimX+(i?(i%2?1:-1)*22*i:0)-p.x)/T,vy,r:10+Math.random()*5});
  if(++throws%8===0)e.wave++;
  nextThrow=e.t+p.gap/1000;
 }
 // Core draws its laser from the bottom; rest draws the beam from the coach at the top instead.
 function laserDraw(){
  const L=e.laser;if(L.phase==='idle')return;const x0=e.coachX,y0=coachY();
  if(L.phase==='aim'){g.strokeStyle=(Math.floor(L.t*12)%2)?'#ff2a2a':'#ff8080';g.lineWidth=1;g.setLineDash([3,3]);g.beginPath();g.moveTo(x0,y0);g.lineTo(L.tx,L.ty);g.stroke();g.setLineDash([]);return;}
  g.strokeStyle='#f22';g.lineWidth=L.result==='hit'?3:2;g.beginPath();g.moveTo(x0,y0);g.lineTo(L.tx,L.ty-(L.result==='shield'?14:0));g.stroke();
  if(L.result==='shield'){g.fillStyle='rgba(120,200,255,.55)';for(let y=-14;y<=14;y+=4)for(let x=-12;x<=12;x+=4)if(x*x/144+y*y/196<=1)g.fillRect(L.tx+x,L.ty+y,3,3);}
 }
 function tick(now){
  frame=requestAnimationFrame(tick);const dt=last?Math.min(.05,(now-last)/1000):1/60;last=now;
  dodger.tilt(phone.gx);dodger.step(dt);
  if(avatar)avatar.style.transform=`translateX(${(dodger.x-W/2)*k}px)`;
  if(e.t>=nextThrow&&e.cool<=0)throwRock();
  if(e.t>=nextLaser&&e.laser.phase==='idle'&&e.cool<=0){e.laserStart(dodger.x,floorY(),REST.laserTelegraph/1000);nextLaser=e.t+(REST.laserEvery[0]+Math.random()*(REST.laserEvery[1]-REST.laserEvery[0]))/1000;}
  // Motion fed to the shield check = max(phone motion, finger motion) in screen heights/s.
  if(e.laser.phase==='aim')e.laser.tx=dodger.x;
  e.feedMotion(Math.max(phone.motion,pointer.down?pointer.speed:0));pointer.speed*=.9;
  e.step(dt);
  for(const o of e.objects)if(!o.hold&&!o.bonus&&o.vy>0&&Math.abs(o.x-dodger.x)<o.r+10&&Math.abs(o.y-(floorY()-6))<o.r+14){ // caught by the character: soft feedback, no strike
   o.alive=false;e.laser.flash=.12;say('Ouch. Dodge with a tilt.');window.myr5Creature?.play('rest');}
  g.clearRect(0,0,e.w,e.h);
  render(g,{...e,laser:{...e.laser,phase:'idle'}});laserDraw();
 }
 const down=ev=>{if(ev.target.closest?.('button:not(#attackCoach),a,select,input'))return;try{void requestPhoneMotion();}catch{}pointer.down=true;swallow=false;const p=toLogical(ev);pointer.x=p.x;pointer.y=p.y;swipe.down(p);};
 const move=ev=>{if(!pointer.down)return;const p=toLogical(ev),seg=swipe.move(p);if(!seg)return;
  pointer.speed=Math.hypot(p.x-pointer.x,p.y-pointer.y)/e.h*30;pointer.x=p.x;pointer.y=p.y;e.addTrail(p.x,p.y);
  if(e.hitSegment(seg[0],seg[1],{kind:'slice'}))swallow=true;};
 const up=()=>{if(!pointer.down)return;pointer.down=false;const tap=swipe.up();if(tap&&e.hitSegment(tap,tap,{kind:'explode'}))swallow=true;};
 const click=ev=>{if(swallow||swipe.moved){ev.stopImmediatePropagation();ev.preventDefault();swallow=false;}}; // slicing must not also punch the coach
 const keys=ev=>{const d=ev.key==='ArrowLeft'?-1:ev.key==='ArrowRight'?1:0;if(d)dodger.key(ev.type==='keydown'?d:0);};
 return {
  start(){
   if(frame)return;runOwner=performanceOwner();reportQuest=createQuestProgressReporter(runOwner);begin();scene.append(canvas);last=0;frame=requestAnimationFrame(tick);
   scene.addEventListener('pointerdown',down,{passive:true});scene.addEventListener('pointermove',move,{passive:true});
   addEventListener('pointerup',up);addEventListener('pointercancel',up);attackButton?.addEventListener('click',click,true);
   addEventListener('keydown',keys);addEventListener('keyup',keys);
   let pg=0;unsub=subscribePhoneMotion(s=>{phone.motion=Math.abs(s.shake||0)/20+Math.abs(s.angularSpeed||0)/3+Math.abs(s.gx-pg)*3;pg=s.gx;phone.gx=s.gx;});
  },
  stop(){
   cancelAnimationFrame(frame);frame=0;canvas.remove();unsub();unsub=()=>{};if(avatar)avatar.style.transform='';
   scene.removeEventListener('pointerdown',down);scene.removeEventListener('pointermove',move);
   removeEventListener('pointerup',up);removeEventListener('pointercancel',up);attackButton?.removeEventListener('click',click,true);
   removeEventListener('keydown',keys);removeEventListener('keyup',keys);
  },
  get engine(){return e;},
 };
}
