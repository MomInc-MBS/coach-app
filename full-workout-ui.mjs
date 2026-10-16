// FULL WORKOUT dropdown + runner. The circuit logic is in full-workout.mjs; every exercise runs through
// the normal camera workout (app.mjs start()), so reps/holds, XP, locks and rest rewards are unchanged.
import {EXERCISES} from './exercise-library.mjs';
import {FULL_WORKOUT,circuitStyles,buildFullWorkout,styleLadder,maxLevel,tapLevel,sectionPicks} from './full-workout.mjs';
import {ROPE,makeRope,stepRope,rotate,ropePath} from './rope.mjs';
import {subscribePhoneMotion,requestPhoneMotion} from './character-phone-sensor.mjs';

const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const clock=s=>`${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
const wait=ms=>new Promise(r=>setTimeout(r,ms));

/** deps: canUse(id)->bool, reason(id)->string, select(id,goal), start(), leaveRest(), voice, storage */
export function mountFullWorkout({canUse,reason,select,start,leaveRest,voice,storage=globalThis.localStorage}){
 const details=document.createElement('details');details.id='podFullWorkout';details.className='pod-goals';
 details.innerHTML='<summary aria-label="Full workout circuit">FULL <span data-fw-status></span></summary><div class="pod-goals-menu fw-menu"></div>';
 document.getElementById('podGoals').after(details);
 const menu=details.querySelector('.fw-menu'),status=details.querySelector('[data-fw-status]');
 const hud=document.createElement('section');hud.id='fullWorkoutHud';hud.hidden=true;hud.setAttribute('aria-live','polite');document.body.append(hud);
 // Camera-only mode hides every other body child, so the HUD rides inside the camera stage while it is up.
 new MutationObserver(()=>{const stage=document.getElementById('cameraWorkout'),target=document.body.dataset.cameraWorkout&&stage?stage:document.body;if(hud.parentNode!==target)target.append(hud);hud.inert=false;}).observe(document.body,{attributes:true,attributeFilter:['data-camera-workout']});

 // Persistence: which sections are plugged in, and each section's engaged ladder level (switches 1..level are on).
 const load=()=>{try{const v=JSON.parse(storage.getItem(FULL_WORKOUT.storageKey));if(v&&!Array.isArray(v))return {powered:new Set(v.powered||[]),levels:v.levels||{}};}catch{}return {powered:new Set(),levels:{}};};
 const st=load();
 const save=()=>{try{storage.setItem(FULL_WORKOUT.storageKey,JSON.stringify({powered:[...st.powered],levels:st.levels}));}catch{}};
 const styles=circuitStyles();
 const cap=id=>maxLevel(id,canUse);
 const lvl=id=>Math.min(st.levels[id]??0,cap(id));
 const picks=()=>sectionPicks({powered:st.powered,levels:st.levels,canUse});
 const selection=picks;
 const detent=kind=>{window.dispatchEvent(new CustomEvent('myr5:hardware-detent',{detail:{kind}}));try{navigator.vibrate?.(kind==='lever'?14:8);}catch{}};
 const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
 const connected=new Set(); // plugs that have clicked home (lamps only light then)

 function paintHead(){
  const n=picks().length;status.textContent=`${n} section${n===1?'':'s'}`;
  const c=menu.querySelector('.fw-count');if(c)c.textContent=`${n} section${n===1?'':'s'} in the circuit`;
  const s=menu.querySelector('[data-fw-start]');if(s){s.disabled=!n;s.textContent='START FULL WORKOUT'+(n?` · ${n}`:'');}
  menu.querySelector('.fw-hub')?.setAttribute('data-lit',String(connected.size>0));
 }
 function paintLadder(id,k=0){
  const sec=menu.querySelector(`.fw-style[data-style="${id}"]`);if(!sec)return;const lv=lvl(id),l=styleLadder(id);
  sec.querySelectorAll('.fw-row input').forEach((input,i)=>{input.checked=i<lv;input.closest('.fw-row').style.setProperty('--d',Math.abs(i+1-k));});
  sec.querySelector('.fw-pick').textContent=!st.powered.has(id)?(cap(id)?'OFF':'LOCKED'):lv?l[lv-1].name:'NO SWITCH';
  paintHead();
 }
 function render(){
  const open=[...menu.querySelectorAll('.fw-style[open]')].map(d=>d.dataset.style),top=menu.scrollTop;
  menu.innerHTML=`<div class="fw-body"><svg class="fw-wires" aria-hidden="true">${styles.map(s=>`<path class="fw-w-sh" data-w="${s.id}"/><path class="fw-w" data-w2="${s.id}"/>`).join('')}</svg>
   <div class="fw-power"><i class="fw-screw l"></i><span class="fw-plate">Power source</span><button type="button" class="fw-hub" data-hub aria-label="Power all sections" data-lit="false"><span aria-hidden="true">⏻</span></button><i class="fw-screw r"></i></div>
   <div class="fw-bay" aria-hidden="true"></div>
   <p class="fw-count"></p>
   ${styles.map(style=>{
    const ids=style.exercises.map(e=>e.id),max=cap(style.id),on=st.powered.has(style.id),lv=lvl(style.id),capped=max===0,hint=capped?(reason(ids[0])||'Locked'):'';
    return `<details class="fw-style" data-style="${style.id}" data-power="${on&&connected.has(style.id)?'on':'off'}"${capped?' data-capped':''}><summary><span class="fw-plate">${esc(style.name)}</span><span class="fw-pick"></span><i class="fw-socket" data-socket="${style.id}"></i></summary>
     ${capped?`<p class="fw-hint">${esc(hint)}</p>`:''}
     ${style.exercises.map((e,i)=>{const ok=canUse(e.id);return `<label class="fw-row${ok?'':' fw-locked'}${on?'':' fw-dead'}" style="--r:${i}"><input type="checkbox" value="${e.id}" data-k="${i+1}"${i<lv?' checked':''}${on&&i<max?'':' disabled'}><i class="fw-lamp" aria-hidden="true"></i><span class="fw-name"><b class="fw-lv">${i+1}</b> ${esc(e.name)}</span><i class="fw-tog" aria-hidden="true">${ok?'':'<b class="fw-guard">LOCK</b>'}</i>${ok?'':`<small>${esc(reason(e.id)||'Locked')}</small>`}</label>`;}).join('')}
    </details>`;}).join('')}
   <button type="button" class="fw-start" data-fw-start>START FULL WORKOUT</button>
   ${styles.map(s=>{const capped=cap(s.id)===0;return `<button type="button" class="fw-plug${capped?' fw-capped':''}" data-plug="${s.id}" aria-pressed="${st.powered.has(s.id)}" aria-label="Power ${esc(s.name)}"${capped?' aria-disabled="true"':''} title="${capped?esc(reason(s.exercises[0].id)||'Locked'):'Power '+esc(s.name)}"><i aria-hidden="true"></i></button>`;}).join('')}
  </div>`;
  for(const d of menu.querySelectorAll('.fw-style'))if(open.includes(d.dataset.style))d.open=true;
  for(const s of styles)paintLadder(s.id);
  menu.scrollTop=top;rig.rebind();
 }

 // ---- power cables: one hub, one verlet rope per section, gravity from the app's tilt source ----
 const rig=(()=>{
  const R={};let body,pos,raf=0,unsub=null,tilt=null,tiltAt=-1e9,grav={gx:0,gy:1},last=0,plugs={},paths={},paths2={};
  const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const measure=()=>{
   body=menu.querySelector('.fw-body');if(!body)return false;const b=body.getBoundingClientRect(),c=e=>{const r=e.getBoundingClientRect();return {x:r.left+r.width/2-b.left,y:r.top+r.height/2-b.top};};
   const hub=c(body.querySelector('.fw-hub'));pos={hub:{x:hub.x,y:hub.y+22},sock:{},b};
   for(const s of styles){const e=body.querySelector(`[data-socket="${s.id}"]`);pos.sock[s.id]=e&&e.offsetParent?c(e):null;}return true;};
  const rebind=()=>{plugs={};paths={};paths2={};for(const s of styles){plugs[s.id]=menu.querySelector(`[data-plug="${s.id}"]`);paths[s.id]=menu.querySelector(`[data-w="${s.id}"]`);paths2[s.id]=menu.querySelector(`[data-w2="${s.id}"]`);}
   if(details.open){if(!measure())return;if(reduced())settle();else if(!raf)loop();}};
  const state=(s,i)=>R[s.id]??=(()=>{const hub=pos.hub,looseLen=ROPE.looseLength+(i%2)*ROPE.looseStagger,sock=pos.sock[s.id],on=st.powered.has(s.id)&&sock;
   const c={i,looseLen,len:looseLen,rope:makeRope(hub.x,hub.y,looseLen),pin:null,drag:null};
   if(on){c.pin={...sock};c.len=dist(hub,sock)*ROPE.plugSlack;c.rope=makeRope(hub.x,hub.y,c.len);c.rope.pts.forEach((p,j,a)=>{const f=j/(a.length-1);p.x=p.px=hub.x+(sock.x-hub.x)*f;p.y=p.py=hub.y+(sock.y-hub.y)*f;});connected.add(s.id);paintPower(s.id);}
   return c;})();
  function tick(dt,t,instant){
   const target=tilt&&t-tiltAt<1500?tilt:{gx:Math.sin(t/1000*Math.PI*2*ROPE.swayHz)*ROPE.sway,gy:1};
   const k=instant?1:Math.min(1,dt*10);grav={gx:grav.gx+(target.gx-grav.gx)*k,gy:grav.gy+(target.gy-grav.gy)*k};
   styles.forEach((s,i)=>{
    const c=state(s,i),sock=pos.sock[s.id],hub=pos.hub,powered=st.powered.has(s.id)&&sock;let end=null,len=c.looseLen;
    if(c.drag){end={x:c.drag.cx-pos.b.left,y:c.drag.cy-pos.b.top};len=Math.max(c.looseLen,dist(hub,end)*1.03+8);c.pin=null;}
    else if(powered){
     c.pin??={...c.rope.pts.at(-1)};const f=instant?1:Math.min(1,dt*14);c.pin.x+=(sock.x-c.pin.x)*f;c.pin.y+=(sock.y-c.pin.y)*f;
     if(dist(c.pin,sock)<1.5){c.pin={...sock};if(!connected.has(s.id)){connected.add(s.id);home(s.id);}}
     end=c.pin;len=Math.max(dist(hub,end)*ROPE.plugSlack,dist(hub,end)+6);
    }else{c.pin=null;if(connected.delete(s.id))paintPower(s.id);}
    c.len+=(len-c.len)*(instant?1:Math.min(1,dt*10));if(end)c.len=Math.max(c.len,dist(hub,end)+2);
    const g=powered&&!c.drag?grav:rotate(grav,(i-(styles.length-1)/2)*ROPE.fanDeg);
    stepRope(c.rope,dt,g,{anchor:hub,end,length:c.len});
   });
  }
  function draw(){
   styles.forEach(s=>{const c=R[s.id];if(!c)return;const pts=c.rope.pts,e=pts.at(-1),q=pts.at(-2),a=Math.atan2(e.y-q.y,e.x-q.x)*180/Math.PI-90,d=ropePath(pts);
    paths[s.id]?.setAttribute('d',d);paths2[s.id]?.setAttribute('d',d);paths2[s.id]?.classList.toggle('on',connected.has(s.id));
    const p=plugs[s.id];if(p)p.style.transform=`translate(${(e.x-22).toFixed(1)}px,${(e.y-22).toFixed(1)}px) rotate(${a.toFixed(1)}deg)`;});
  }
  function frame(now){raf=0;if(!details.open||!body?.isConnected)return;const dt=Math.min(1/30,(now-(last||now))/1000||1/60);last=now;
   if(!measure())return;edgeScroll();tick(dt,now,false);draw();raf=requestAnimationFrame(frame);}
  function loop(){last=0;raf=requestAnimationFrame(frame);}
  function settle(){if(!measure())return;grav={gx:0,gy:1};for(let i=0;i<ROPE.settleSteps;i++)tick(1/60,0,true);draw();}
  const edgeScroll=()=>{const d=styles.map(s=>R[s.id]?.drag).find(Boolean);if(!d)return;const r=menu.getBoundingClientRect();if(d.cy<r.top+40)menu.scrollTop-=10;else if(d.cy>r.bottom-40)menu.scrollTop+=10;};
  function home(id){ // the plug clicked in: spark, click sound, lamps power up in sequence
   detent('lever');const sec=menu.querySelector(`.fw-style[data-style="${id}"]`),sock=menu.querySelector(`[data-socket="${id}"]`);
   paintPower(id);sec?.classList.add('fw-pulse');sock?.classList.add('fw-spark');setTimeout(()=>{sec?.classList.remove('fw-pulse');sock?.classList.remove('fw-spark');},1300);}
  return {R,rebind,
   open(){if(unsub)return;measure();unsub=subscribePhoneMotion(g=>{tilt={gx:g.gx,gy:g.gy};tiltAt=performance.now();});if(reduced())settle();else if(!raf)loop();},
   close(){unsub?.();unsub=null;tilt=null;cancelAnimationFrame(raf);raf=0;},
   resettle(){if(details.open&&reduced())settle();},
   dragStart(id,e){const c=R[id];if(!c)return;c.drag={cx:e.clientX,cy:e.clientY,sx:e.clientX,sy:e.clientY,moved:false};},
   dragMove(id,e){const d=R[id]?.drag;if(!d)return;d.cx=e.clientX;d.cy=e.clientY;if(Math.hypot(d.cx-d.sx,d.cy-d.sy)>6)d.moved=true;},
   dragEnd(id){const c=R[id],d=c?.drag;if(!d)return null;measure();const end={x:d.cx-pos.b.left,y:d.cy-pos.b.top},sock=pos.sock[id];c.drag=null;c.pin={...end};return {moved:d.moved,near:!!sock&&dist(end,sock)<64};}};
 })();
 const paintPower=id=>{const sec=menu.querySelector(`.fw-style[data-style="${id}"]`);if(sec)sec.dataset.power=st.powered.has(id)&&connected.has(id)?'on':'off';paintHead();};
 function setPower(id,on){
  if(cap(id)===0||on===st.powered.has(id))return;
  on?st.powered.add(id):st.powered.delete(id);save();detent(on?'switch':'lever');
  const sec=menu.querySelector(`.fw-style[data-style="${id}"]`),max=cap(id);
  sec?.querySelectorAll('.fw-row').forEach((row,i)=>{row.classList.toggle('fw-dead',!on);row.querySelector('input').disabled=!on||i>=max;});
  menu.querySelector(`[data-plug="${id}"]`)?.setAttribute('aria-pressed',String(on));
  if(!on)connected.delete(id);paintPower(id);paintLadder(id);rig.resettle();
  if(on&&reduced()){connected.add(id);paintPower(id);}
 }
 menu.addEventListener('click',event=>{
  const b=event.target.closest('button');if(!b)return;
  if(b.matches('[data-fw-start]'))begin();
  else if(b.matches('[data-hub]')){const open=styles.filter(s=>cap(s.id)>0),all=open.every(s=>st.powered.has(s.id));open.forEach(s=>setPower(s.id,!all));}
  else if(b.matches('.fw-plug')){if(b.classList.contains('fw-capped'))menu.querySelector(`.fw-style[data-style="${b.dataset.plug}"]`).open=true;else if(event.detail===0)setPower(b.dataset.plug,!st.powered.has(b.dataset.plug));}
 });
 menu.addEventListener('pointerdown',event=>{const b=event.target.closest('.fw-plug');if(!b||b.classList.contains('fw-capped'))return;b.setPointerCapture?.(event.pointerId);rig.dragStart(b.dataset.plug,event);});
 menu.addEventListener('pointermove',event=>{const b=event.target.closest('.fw-plug');if(b)rig.dragMove(b.dataset.plug,event);});
 const release=event=>{const b=event.target.closest?.('.fw-plug');if(!b)return;const id=b.dataset.plug,r=rig.dragEnd(id);if(!r)return;setPower(id,r.moved?r.near:!st.powered.has(id));};
 menu.addEventListener('pointerup',release);menu.addEventListener('pointercancel',release);
 menu.addEventListener('change',event=>{
  const i=event.target.closest('input[type=checkbox]');if(!i)return;const id=i.closest('.fw-style').dataset.style,k=Number(i.dataset.k);
  st.levels[id]=tapLevel(lvl(id),k,cap(id));save();detent('switch');paintLadder(id,k);
 });
 menu.addEventListener('toggle',()=>rig.resettle(),true);
 details.addEventListener('keydown',event=>{if(event.key==='Escape'&&details.open){details.open=false;details.querySelector('summary').focus();}});
 document.addEventListener('pointerdown',event=>{if(details.open&&!details.contains(event.target))details.open=false;});
 const goals=document.getElementById('podGoals');
 details.addEventListener('toggle',()=>{if(details.open){goals.open=false;rig.open();}else rig.close();});goals.addEventListener('toggle',()=>{if(goals.open)details.open=false;});
 details.querySelector('summary').addEventListener('click',()=>{try{if(!localStorage.getItem('myr5.tiltPermission'))void requestPhoneMotion();}catch{}});

 // ---- runner ----
 let run=null;
 const nameOf=id=>EXERCISES[id]?.name??id;
 const paint=html=>{hud.innerHTML=html;hud.hidden=false;};
 const bar=()=>{const exTotal=run.steps.filter(s=>s.type==='exercise').length,n=run.done.length+1;paint(`<div class="fw-top"><b>FULL WORKOUT ${n}/${exTotal}</b><span>${esc(nameOf(run.steps[run.i].id))}</span><button type="button" data-fw-end>END</button></div>`);hud.dataset.mode='exercise';};
 function finish(reasonText){
  if(!run)return;const r=run;run=null;
  const xp=r.done.reduce((t,d)=>t+(d.xp||0),0),secs=Math.round((Date.now()-r.t0)/1000);
  hud.dataset.mode='summary';
  paint(`<div class="fw-panel"><h2>${reasonText==='ended'?'Workout ended':'Full workout done'}</h2>
   <p class="fw-big">${r.done.length} of ${r.steps.filter(s=>s.type==='exercise').length} exercises · ${clock(secs)}${xp?` · +${xp} XP`:''}</p>
   <ol>${r.done.map(d=>`<li>${esc(nameOf(d.id))} <span>${Math.round(d.value)}${d.unit}</span></li>`).join('')||'<li>No sets finished.</li>'}</ol>
   <button type="button" data-fw-close>Done</button></div>`);
  if(reasonText!=='ended')voice?.say('Full workout complete. Great work.',{interrupt:true});
 }
 hud.addEventListener('click',event=>{
  const b=event.target.closest('button');if(!b)return;
  if('fwEnd' in b.dataset){const r=run;document.getElementById('stop')?.click();if(run===r)finish('ended');}
  if('fwClose' in b.dataset){hud.hidden=true;hud.innerHTML='';if(document.body.dataset.screen==='rest')void leaveRest?.();}
  if('fwSkip' in b.dataset&&run)run.skip=true;
 });
 const unitOf=id=>{const k=EXERCISES[id]?.kind;return k==='hold'||k==='pace'?'s':k==='steps'?' steps':' reps';};

 async function playBreak(r,step){
  const end=Date.now()+step.seconds*1000;r.skip=false;hud.dataset.mode='break';
  voice?.say(`${step.between==='styles'?'Style change. ':''}Rest. Next up, ${nameOf(step.next.id)}.`,{interrupt:true});
  while(run===r&&!r.skip&&Date.now()<end){
   const left=Math.ceil((end-Date.now())/1000),style=circuitStyles().find(s=>s.id===step.next.style)?.name;
   paint(`<div class="fw-panel"><p class="fw-eyebrow">${step.between==='styles'?'STYLE BREAK':'BREATHER'}</p><div class="fw-clock" role="timer">${clock(left)}</div>
    <p>Next up</p><p class="fw-big">${esc(nameOf(step.next.id))}</p><p class="fw-sub">${esc(style||'')} · ${r.steps.find(s=>s.id===step.next.id).goal}${unitOf(step.next.id)}</p>
    <button type="button" data-fw-skip>Skip rest</button> <button type="button" data-fw-end>End workout</button></div>`);
   await wait(250);
  }
 }
 async function play(r){
  while(run===r&&r.i<r.steps.length){
   const step=r.steps[r.i];
   if(step.type==='break'){await playBreak(r,step);if(run!==r)return;await leaveRest?.();for(let t=0;t<40&&document.body.dataset.screen==='rest';t++)await wait(150);r.i++;continue;}
   bar();select(step.id,step.goal);
   const completed=new Promise(res=>{r.onSet=res;}),aborted=new Promise(res=>{r.onAbort=()=>res(null);}),result=await Promise.race([Promise.resolve(start()).then(()=>completed),aborted]);
   if(run!==r)return;
   if(!result){finish('ended');return;}
   r.done.push({id:step.id,value:result.value,xp:result.xp,unit:unitOf(step.id)});r.i++;
  }
  if(run===r)finish('done');
 }
 function begin(){
  if(run||document.body.dataset.tracking==='true'||!selection().length)return;
  const steps=buildFullWorkout(selection(),{seed:Date.now()});
  details.open=false;run={steps,i:0,done:[],t0:Date.now()};void play(run);
 }
 window.addEventListener('myr5:set-complete',event=>{if(run&&event.detail?.mode===run.steps[run.i]?.id)run.onSet?.(event.detail);});
 window.addEventListener('myr5:workout-stopped',()=>{if(run&&run.steps[run.i]?.type==='exercise')run.onAbort?.();});
 for(const name of ['myr5:performance-progress','myr5:account-ready'])window.addEventListener(name,render);
 render();
 return {render,selection,get running(){return !!run;}};
}
