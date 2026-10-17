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

 // Cable identity is independent of socket identity. Legacy powered sections restore identity wires.
 const styles=circuitStyles(),valid=new Set(styles.map(s=>s.id));
 const load=()=>{try{const v=JSON.parse(storage.getItem(FULL_WORKOUT.storageKey));if(v&&typeof v==='object'&&!Array.isArray(v)){
  const cables={},occupied=new Set();
  const old=Array.isArray(v.powered)?Object.fromEntries(v.powered.map(id=>[id,id])):{};
  for(const [wire,socket] of Object.entries(v.cables&&typeof v.cables==='object'?v.cables:old))if(valid.has(wire)&&valid.has(socket)&&!occupied.has(socket)){cables[wire]=socket;occupied.add(socket);}
  return {cables,powered:new Set(Object.values(cables)),levels:v.levels&&typeof v.levels==='object'?v.levels:{}};
 }}catch{}return {cables:{},powered:new Set(),levels:{}};};
 const st=load();
 const save=()=>{try{storage.setItem(FULL_WORKOUT.storageKey,JSON.stringify({powered:[...st.powered],levels:st.levels,cables:st.cables}));}catch{}};
 const cap=id=>maxLevel(id,canUse);
 const lvl=id=>Math.min(st.levels[id]??0,cap(id));
 const picks=()=>sectionPicks({powered:st.powered,levels:st.levels,canUse});
 const selection=picks;
 const detent=kind=>{window.dispatchEvent(new CustomEvent('myr5:hardware-detent',{detail:{kind}}));try{navigator.vibrate?.(kind==='lever'?14:8);}catch{}};
 const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
 const connected=new Set(); // cable IDs whose tips have clicked into their mapped sockets
 const wireFor=id=>Object.keys(st.cables).find(wire=>st.cables[wire]===id);
 // The library's canonical exercise posters, also rendered by menu.mjs.
 const icon=id=>`<img src="/models/previews/${esc(id)}.png" alt="" aria-hidden="true" width="32" height="32" loading="lazy">`;
 function paintHead(){
  const n=picks().length;status.textContent=`${n} section${n===1?'':'s'}`;
  const c=menu.querySelector('.fw-count');if(c)c.textContent=`${n} section${n===1?'':'s'} in the circuit`;
  const s=menu.querySelector('[data-fw-start]');if(s){s.disabled=!n;s.textContent='START FULL WORKOUT'+(n?` · ${n}`:'');}
  menu.querySelector('.fw-hub')?.setAttribute('data-lit',String(connected.size>0));
 }
 function paintLadder(id,k=0){
  const sec=menu.querySelector(`.fw-style[data-style="${id}"]`);if(!sec)return;const lv=lvl(id),l=styleLadder(id);
  sec.querySelectorAll('.fw-row input').forEach((input,i)=>{input.checked=i<lv;input.closest('.fw-row').style.setProperty('--d',Math.abs(i+1-k));});
  const pick=sec.querySelector('.fw-pick');pick.innerHTML=lv?icon(l[lv-1].id):'&#9675;';pick.title=lv?l[lv-1].name:'No exercise selected';
  paintHead();
 }
 function render(){
  const top=menu.scrollTop;
  menu.innerHTML=`<div class="fw-body"><svg class="fw-wires" aria-hidden="true">${styles.map(s=>`<g class="fw-cord" data-w="${s.id}"><path class="fw-c-sh"/><path class="fw-c-jk"/><path class="fw-c-hl"/><path class="fw-c-pl"/></g>`).join('')}</svg>
   <div class="fw-power"><i class="fw-screw l"></i><div class="fw-pw-l"><span class="fw-plate" aria-hidden="true">&#9889;</span><p class="fw-count"></p></div><button type="button" class="fw-hub" data-hub aria-label="Power all sections" title="Power all sections" data-lit="false"><span aria-hidden="true">&#9211;</span></button><i class="fw-screw r"></i>
    <div class="fw-anchors" aria-hidden="true">${styles.map(s=>`<i data-anchor="${s.id}"></i>`).join('')}</div></div>
   <div class="fw-bay" aria-hidden="true"></div>
   ${styles.map(style=>{
    const max=cap(style.id),lv=lvl(style.id),hint=max===0?(reason(style.exercises[0].id)||'Locked'):'';
    return `<section class="fw-style" data-style="${style.id}" aria-label="${esc(style.name)}" data-power="off"${max===0?' data-capped':''}>
     <div class="fw-section-head" title="${esc(style.name)}"><span class="fw-plate" aria-hidden="true">${icon(style.exercises[0].id)}</span><span class="fw-pick" aria-hidden="true"></span><i class="fw-socket" data-socket="${style.id}" aria-label="${esc(style.name)} socket${max===0?', exercises locked':''}" data-locked="${max===0}" title="${esc(hint||style.name+' socket')}"></i></div>
     ${hint?`<p class="fw-hint">${esc(hint)}</p>`:''}
     <div class="fw-switches">${style.exercises.map((e,i)=>{const ok=i<max,label=e.name+(ok?'':': '+(reason(e.id)||'Locked'));return `<label title="${esc(label)}" class="fw-row${ok?'':' fw-locked'}" style="--r:${i}"><input type="checkbox" value="${e.id}" aria-label="${esc(label)}" data-k="${i+1}"${i<lv?' checked':''}${ok?'':' disabled'}><i class="fw-lamp" aria-hidden="true"></i><span class="fw-name" aria-hidden="true">${icon(e.id)}</span><i class="fw-tog" aria-hidden="true">${ok?'':'<b class="fw-guard">&#128274;</b>'}</i></label>`;}).join('')}</div>
    </section>`;}).join('')}
   <button type="button" class="fw-start" data-fw-start>START FULL WORKOUT</button>
   ${styles.map((s,i)=>`<button type="button" class="fw-plug" data-plug="${s.id}" aria-pressed="${!!st.cables[s.id]}" aria-label="Cable ${i+1}" title="Cable ${i+1}: drag to any unlocked socket"><i aria-hidden="true"></i></button>`).join('')}
  </div>`;
  for(const s of styles){paintLadder(s.id);paintPower(s.id);}
  menu.scrollTop=top;rig.rebind();
 }

 // ---- power cables: one hub, one verlet rope per section, gravity from the app's tilt source ----
 const rig=(()=>{
  const R={};let body,pos,raf=0,unsub=null,tilt=null,tiltAt=-1e9,grav={gx:0,gy:1},last=0,plugs={},paths={};
  const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const measure=()=>{
   body=menu.querySelector('.fw-body');if(!body)return false;const b=body.getBoundingClientRect(),c=e=>{const r=e.getBoundingClientRect();return {x:r.left+r.width/2-b.left,y:r.top+r.height/2-b.top};};
   // Keep the animated SVG backing surface as small as the scrollport, even on long circuits.
   // Its viewBox retains body coordinates so ropes and socket hit testing stay aligned.
   const svg=body.querySelector('.fw-wires'),y=menu.getBoundingClientRect().top+menu.clientTop-b.top,h=menu.clientHeight;
   svg.style.top=`${y}px`;svg.style.height=`${h}px`;svg.setAttribute('viewBox',`0 ${y} ${b.width} ${h}`);
   pos={anchor:{},sock:{},b,bayBottom:body.querySelector('.fw-bay').getBoundingClientRect().bottom-b.top-6};
   for(const s of styles){pos.anchor[s.id]=c(body.querySelector(`[data-anchor="${s.id}"]`));const e=body.querySelector(`[data-socket="${s.id}"]`);pos.sock[s.id]=e&&e.offsetParent?c(e):null;}return true;};
  const rebind=()=>{plugs={};paths={};for(const s of styles){plugs[s.id]=menu.querySelector(`[data-plug="${s.id}"]`);paths[s.id]=menu.querySelector(`[data-w="${s.id}"]`);}
   if(details.open){if(!measure())return;if(reduced())settle();else if(!raf)loop();}};
  const slackOf=i=>ROPE.plugSlack+(i%5)*ROPE.slackSpread;
  const state=(s,i)=>R[s.id]??=(()=>{const hub=pos.anchor[s.id],looseLen=105+(i%3)*27,sock=pos.sock[st.cables[s.id]],on=!!sock;
   const c={i,looseLen,len:looseLen,rope:makeRope(hub.x,hub.y,looseLen),pin:null,drag:null};
   if(on){c.pin={...sock};c.len=dist(hub,sock)*slackOf(i);c.rope=makeRope(hub.x,hub.y,c.len);c.rope.pts.forEach((p,j,a)=>{const f=j/(a.length-1);p.x=p.px=hub.x+(sock.x-hub.x)*f;p.y=p.py=hub.y+(sock.y-hub.y)*f;});connected.add(s.id);paintPower(st.cables[s.id]);}
   return c;})();
  function tick(dt,t,instant){
   const target=tilt&&t-tiltAt<1500?tilt:{gx:Math.sin(t/1000*Math.PI*2*ROPE.swayHz)*ROPE.sway,gy:1};
   const k=instant?1:Math.min(1,dt*10);grav={gx:grav.gx+(target.gx-grav.gx)*k,gy:grav.gy+(target.gy-grav.gy)*k};
   styles.forEach((s,i)=>{
    const c=state(s,i),socketId=st.cables[s.id],sock=pos.sock[socketId],hub=pos.anchor[s.id],powered=!!sock;let end=null,len=c.looseLen;
    if(c.drag){end={x:c.drag.cx-pos.b.left,y:c.drag.cy-pos.b.top};len=Math.max(c.looseLen,dist(hub,end)*1.03+8);c.pin=null;}
    else if(powered){
     c.pin??={...c.rope.pts.at(-1)};const f=instant?1:Math.min(1,dt*14);c.pin.x+=(sock.x-c.pin.x)*f;c.pin.y+=(sock.y-c.pin.y)*f;
     if(dist(c.pin,sock)<1.5){c.pin={...sock};if(!connected.has(s.id)){connected.add(s.id);home(socketId);}}
     end=c.pin;len=Math.max(dist(hub,end)*slackOf(i),dist(hub,end)+6);
    }else{c.pin=null;if(connected.delete(s.id))styles.forEach(s=>paintPower(s.id));}
    c.len+=(len-c.len)*(instant?1:Math.min(1,dt*10));if(end)c.len=Math.max(c.len,dist(hub,end)+2);
    const g=powered&&!c.drag?grav:rotate(grav,((i>>1)*2+(i&1))*ROPE.fanDeg);
    stepRope(c.rope,dt,g,{anchor:hub,end,length:c.len});
    // Endpoints remain pinned. Below the hanging bundle, the heavy cords run along the right-hand loom.
    const W=pos.b.width,pts=c.rope.pts;
    for(let j=1;j<pts.length-(end?1:0);j++){const q=pts[j],lo=end&&!c.drag&&q.y>pos.bayBottom?W-52:20,hi=W-20;
     q.x=Math.min(hi,Math.max(lo,q.x));
     if(!end&&!c.drag)q.y=Math.min(pos.bayBottom-18,Math.max(hub.y+22,q.y));
    }

   });
  }
  function draw(){
   styles.forEach(s=>{const c=R[s.id];if(!c)return;const pts=c.rope.pts,e=pts.at(-1),q=pts.at(-2),a=Math.atan2(e.y-q.y,e.x-q.x)*180/Math.PI-90,d=ropePath(pts),g=paths[s.id];
    g?.querySelectorAll('path').forEach(pa=>pa.setAttribute('d',d));g?.classList.toggle('on',connected.has(s.id));
    const p=plugs[s.id];if(p)p.dataset.connectedSocket=st.cables[s.id]||'';if(p)p.style.transform=`translate(${(e.x-22).toFixed(1)}px,${(e.y-22).toFixed(1)}px) rotate(${a.toFixed(1)}deg)`;});
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
   open(){if(unsub)return;settle();unsub=subscribePhoneMotion(g=>{tilt={gx:g.gx,gy:g.gy};tiltAt=performance.now();});if(!reduced()&&!raf)loop();},
   close(){unsub?.();unsub=null;tilt=null;cancelAnimationFrame(raf);raf=0;},
   resettle(){if(!details.open)return;if(reduced())settle();else{measure();if(!raf)loop();}},
   dragStart(id,e){const c=R[id];if(!c)return;c.drag={cx:e.clientX,cy:e.clientY,sx:e.clientX,sy:e.clientY,moved:false};if(reduced())settle();},
   dragMove(id,e){const d=R[id]?.drag;if(!d)return;d.cx=e.clientX;d.cy=e.clientY;if(Math.hypot(d.cx-d.sx,d.cy-d.sy)>6)d.moved=true;if(reduced())settle();},
   dragEnd(id){const c=R[id],d=c?.drag;if(!d)return null;measure();const end={x:d.cx-pos.b.left,y:d.cy-pos.b.top};c.drag=null;c.pin={...end};const nearest=Object.entries(pos.sock).filter(([,p])=>p).sort((a,b)=>dist(end,a[1])-dist(end,b[1]))[0];return {moved:d.moved,socket:nearest&&dist(end,nearest[1])<32?nearest[0]:null};}};
 })();
 const paintPower=id=>{const sec=menu.querySelector(`.fw-style[data-style="${id}"]`);if(sec)sec.dataset.power=connected.has(wireFor(id))?'on':'off';paintHead();};
 function connect(wire,socket){
  const occupant=socket&&wireFor(socket);
  if(occupant&&occupant!==wire){delete st.cables[occupant];connected.delete(occupant);}
  delete st.cables[wire];connected.delete(wire);
  if(socket)st.cables[wire]=socket;
  st.powered=new Set(Object.values(st.cables));save();detent(socket?'switch':'lever');
  for(const s of styles){paintPower(s.id);paintLadder(s.id);const p=menu.querySelector(`[data-plug="${s.id}"]`);p?.setAttribute('aria-pressed',String(!!st.cables[s.id]));if(p)p.dataset.connectedSocket=st.cables[s.id]||'';}
  rig.resettle();
 }
 function autoPlug(wire){if(st.cables[wire]){connect(wire,null);return;}
  const socket=styles.find(s=>s.id===wire&&cap(s.id)>0&&!st.powered.has(s.id))||styles.find(s=>cap(s.id)>0&&!st.powered.has(s.id));if(socket)connect(wire,socket.id);
 }
 menu.addEventListener('click',event=>{
  const b=event.target.closest('button');if(!b)return;
  if(b.matches('[data-fw-start]'))begin();
  else if(b.matches('[data-hub]')){const open=styles.filter(s=>cap(s.id)>0),all=open.every(s=>st.powered.has(s.id));
   if(all)Object.keys(st.cables).forEach(wire=>connect(wire,null));
   else for(const socket of open)if(!st.powered.has(socket.id)){const wire=styles.find(s=>!st.cables[s.id]);if(wire)connect(wire.id,socket.id);}
  }else if(b.matches('.fw-plug')&&event.detail===0)autoPlug(b.dataset.plug);
 });
 menu.addEventListener('pointerdown',event=>{const b=event.target.closest('.fw-plug');if(!b)return;event.preventDefault();b.setPointerCapture?.(event.pointerId);rig.dragStart(b.dataset.plug,event);});
 menu.addEventListener('pointermove',event=>{const b=event.target.closest('.fw-plug');if(b)rig.dragMove(b.dataset.plug,event);});
 const release=event=>{const b=event.target.closest?.('.fw-plug');if(!b)return;const id=b.dataset.plug,r=rig.dragEnd(id);if(!r)return;if(event.type==='pointercancel'){rig.resettle();return;}if(r.moved)connect(id,r.socket);else autoPlug(id);};
 menu.addEventListener('pointerup',release);menu.addEventListener('pointercancel',release);
 menu.addEventListener('change',event=>{
  const i=event.target.closest('input[type=checkbox]');if(!i)return;const id=i.closest('.fw-style').dataset.style,k=Number(i.dataset.k);
  st.levels[id]=tapLevel(lvl(id),k,cap(id));save();detent('switch');paintLadder(id,k);
 });
 menu.addEventListener('toggle',()=>rig.resettle(),true);
 menu.addEventListener('scroll',()=>rig.resettle(),{passive:true});
 details.addEventListener('keydown',event=>{if(event.key==='Escape'&&details.open){details.open=false;details.querySelector('summary').focus();}});
 document.addEventListener('pointerdown',event=>{if(details.open&&!details.contains(event.target))details.open=false;});
 const goals=document.getElementById('podGoals');
 details.addEventListener('toggle',()=>{if(details.open){goals.open=false;rig.open();}else rig.close();});goals.addEventListener('toggle',()=>{if(goals.open)details.open=false;});
 details.querySelector('summary').addEventListener('click',()=>{try{if(!localStorage.getItem('myr5.tiltPermission'))void requestPhoneMotion();}catch{}});

 // ---- runner ----
 let run=null;
 const nameOf=id=>EXERCISES[id]?.name??id;
 const badge=id=>`<span class="fw-workout-symbol" role="img" aria-label="${esc(nameOf(id))}" title="${esc(nameOf(id))}">${icon(id)}</span>`;
 const paint=html=>{hud.innerHTML=html;hud.hidden=false;};
 const bar=()=>{const exTotal=run.steps.filter(s=>s.type==='exercise').length,n=run.done.length+1;paint(`<div class="fw-top"><b>FULL WORKOUT ${n}/${exTotal}</b>${badge(run.steps[run.i].id)}<button type="button" data-fw-end>END</button></div>`);hud.dataset.mode='exercise';};
 function finish(reasonText){
  if(!run)return;const r=run;run=null;
  const xp=r.done.reduce((t,d)=>t+(d.xp||0),0),secs=Math.round((Date.now()-r.t0)/1000);
  hud.dataset.mode='summary';
  paint(`<div class="fw-panel"><h2>${reasonText==='ended'?'Workout ended':'Full workout done'}</h2>
   <p class="fw-big">${r.done.length} of ${r.steps.filter(s=>s.type==='exercise').length} exercises · ${clock(secs)}${xp?` · +${xp} XP`:''}</p>
   <ol>${r.done.map(d=>`<li>${badge(d.id)} <span>${Math.round(d.value)}${d.unit}</span></li>`).join('')||'<li>No sets finished.</li>'}</ol>
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
    <p>Next up</p><p class="fw-big">${badge(step.next.id)}</p><p class="fw-sub">${r.steps.find(s=>s.id===step.next.id).goal}${unitOf(step.next.id)}</p>
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
