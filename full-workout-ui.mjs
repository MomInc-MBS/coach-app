// FULL WORKOUT dropdown + runner. The circuit logic is in full-workout.mjs; every exercise runs through
// the normal camera workout (app.mjs start()), so reps/holds, XP, locks and rest rewards are unchanged.
import {EXERCISES} from './exercise-library.mjs';
import {FULL_WORKOUT,circuitStyles,circuitExercises,buildFullWorkout} from './full-workout.mjs';

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

 // Persistence: the ids the user left checked. Never saved yet = everything unlocked is checked.
 const load=()=>{try{const v=JSON.parse(storage.getItem(FULL_WORKOUT.storageKey));return Array.isArray(v)?new Set(v):null;}catch{return null;}};
 let checked=load();
 const save=()=>{try{storage.setItem(FULL_WORKOUT.storageKey,JSON.stringify([...checked]));}catch{}};
 const unlocked=()=>circuitExercises().filter(e=>canUse(e.id));
 const isOn=id=>canUse(id)&&(checked?checked.has(id):true);
 const selection=()=>unlocked().filter(e=>isOn(e.id)).map(e=>e.id);
 const setAll=(ids,on)=>{checked??=new Set(unlocked().map(e=>e.id));for(const id of ids)if(canUse(id))on?checked.add(id):checked.delete(id);save();render();};

 function render(){
  const open=menu.querySelector('details[open]')&&[...menu.querySelectorAll('details[open]')].map(d=>d.dataset.style),top=menu.scrollTop;
  const total=unlocked().length,count=selection().length;
  status.textContent=`${count}/${total}`;
  menu.innerHTML=`<div class="fw-bar"><button type="button" data-all="1">Check all</button><button type="button" data-all="0">Uncheck all</button></div>
   <p class="fw-count">${count} of ${total} unlocked exercises selected</p>
   ${circuitStyles().map(style=>{
    const ids=style.exercises.map(e=>e.id),n=ids.filter(isOn).length,usable=ids.filter(canUse).length;
    return `<details class="fw-style" data-style="${style.id}"><summary>${esc(style.name)} <span>${n}/${usable||0}${usable<ids.length?` · ${ids.length-usable} locked`:''}</span></summary>
     <div class="fw-style-bar"><button type="button" data-style-all="${style.id}" data-on="1">All</button><button type="button" data-style-all="${style.id}" data-on="0">None</button></div>
     ${style.exercises.map(e=>{const ok=canUse(e.id);return `<label class="fw-row${ok?'':' fw-locked'}"><input type="checkbox" value="${e.id}"${isOn(e.id)?' checked':''}${ok?'':' disabled'}><span>${esc(e.name)}</span>${ok?'':`<small>${esc(reason(e.id)||'Locked')}</small>`}</label>`;}).join('')}
    </details>`;}).join('')}
   <button type="button" class="fw-start" data-fw-start${count?'':' disabled'}>START FULL WORKOUT${count?` · ${count}`:''}</button>`;
  for(const d of menu.querySelectorAll('details'))if(open?.includes(d.dataset.style))d.open=true;
  menu.scrollTop=top;
 }
 menu.addEventListener('click',event=>{
  const b=event.target.closest('button');if(!b)return;
  if(b.dataset.all)setAll(circuitExercises().map(e=>e.id),b.dataset.all==='1');
  else if(b.dataset.styleAll)setAll(circuitStyles().find(s=>s.id===b.dataset.styleAll).exercises.map(e=>e.id),b.dataset.on==='1');
  else if('fwStart' in b.dataset)begin();
 });
 menu.addEventListener('change',event=>{const i=event.target.closest('input[type=checkbox]');if(!i)return;checked??=new Set(unlocked().map(e=>e.id));i.checked?checked.add(i.value):checked.delete(i.value);save();render();});
 details.addEventListener('keydown',event=>{if(event.key==='Escape'&&details.open){details.open=false;details.querySelector('summary').focus();}});
 document.addEventListener('pointerdown',event=>{if(details.open&&!details.contains(event.target))details.open=false;});
 const goals=document.getElementById('podGoals');
 details.addEventListener('toggle',()=>{if(details.open)goals.open=false;});goals.addEventListener('toggle',()=>{if(goals.open)details.open=false;});

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
  const steps=buildFullWorkout(selection().filter(canUse),{seed:Date.now()});
  details.open=false;run={steps,i:0,done:[],t0:Date.now()};void play(run);
 }
 window.addEventListener('myr5:set-complete',event=>{if(run&&event.detail?.mode===run.steps[run.i]?.id)run.onSet?.(event.detail);});
 window.addEventListener('myr5:workout-stopped',()=>{if(run&&run.steps[run.i]?.type==='exercise')run.onAbort?.();});
 for(const name of ['myr5:performance-progress','myr5:account-ready'])window.addEventListener(name,render);
 render();
 return {render,selection,get running(){return !!run;}};
}
