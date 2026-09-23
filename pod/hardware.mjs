import {FOCUS_GROUPS,GROUP_EXERCISES,EXERCISES,exerciseAt,focusFor} from '../exercise-library.mjs';
const $=id=>document.getElementById(id),clamp=(x,min,max)=>Math.max(min,Math.min(max,x));
// #106 control board: a focus dial, a level knob, an easier/harder lever and a sound switch, all
// driving the same #movement/#goal state the pod already uses. Rotaries sweep 270° (−135° … +135°).
const SWEEP=270,tick=()=>{try{navigator.vibrate?.(8);}catch{}};
export const detentAngle=(i,n)=>n>1?-SWEEP/2+SWEEP*i/(n-1):0;
// Relative turn: the detent reached by rotating detent `start` of `n` by `turn` degrees.
export const detentFor=(start,turn,n)=>clamp(Math.round(start+turn*(n-1)/SWEEP),0,Math.max(0,n-1));

// Drag to turn (snaps and ticks at each detent), tap the left/right side to step, arrows/Home/End.
function rotary(el,{count,value,preview,commit,locked}){
 const ticks=el.querySelector('.cb-ticks');let drag=null;
 function paint(index,angle=detentAngle(index,count())){
  const n=count();
  if(ticks.childElementCount!==n)ticks.replaceChildren(...Array.from({length:n},(_,i)=>{const b=document.createElement('b');b.style.setProperty('--a',`${detentAngle(i,n)}deg`);return b;}));
  [...ticks.children].forEach((b,i)=>b.toggleAttribute('data-on',i===index));el.style.setProperty('--angle',`${angle}deg`);
 }
 function set(index){index=clamp(index,0,count()-1);if(locked())return;if(index!==value()){tick();commit(index);}else paint(index);}
 const angleOf=e=>{const r=el.getBoundingClientRect();return Math.atan2(e.clientX-r.left-r.width/2,-(e.clientY-r.top-r.height/2))*180/Math.PI;};
 el.addEventListener('pointerdown',e=>{if(locked())return;e.preventDefault();el.focus({preventScroll:true,focusVisible:false});el.setPointerCapture(e.pointerId);drag={id:e.pointerId,x:e.clientX,y:e.clientY,last:angleOf(e),turn:0,start:value(),at:value(),moved:false};el.classList.add('is-turning');});
 el.addEventListener('pointermove',e=>{
  if(drag?.id!==e.pointerId)return;const a=angleOf(e);let d=a-drag.last;d-=360*Math.round(d/360);drag.last=a;drag.turn+=d;
  if(!drag.moved&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<6)return;drag.moved=true;
  const n=count(),at=detentFor(drag.start,drag.turn,n);if(at!==drag.at){drag.at=at;tick();preview(at);}
  paint(at,clamp(detentAngle(drag.start,n)+drag.turn,-SWEEP/2,SWEEP/2));
 });
 function end(e,cancelled){
  if(drag?.id!==e.pointerId)return;const {moved,at,x}=drag;drag=null;el.classList.remove('is-turning');
  if(cancelled){paint(value());return preview(value());}
  if(moved)return set(at);const r=el.getBoundingClientRect();set(value()+(x<r.left+r.width/2?-1:1));
 }
 el.addEventListener('pointerup',e=>end(e,false));el.addEventListener('pointercancel',e=>end(e,true));
 el.addEventListener('keydown',e=>{
  const step={ArrowLeft:-1,ArrowDown:-1,PageDown:-1,ArrowRight:1,ArrowUp:1,PageUp:1}[e.key];
  if(step){e.preventDefault();set(value()+step);}else if(e.key==='Home'||e.key==='End'){e.preventDefault();set(e.key==='Home'?0:count()-1);}
 });
 return paint;
}

export function initHardware(){
 const select=$('movement'),goal=$('goal'),dial=$('exerciseDial'),knob=$('difficultySlider'),lever=document.querySelector('.cb-lever');
 let group=focusFor(select.value);const remembered=new Map();
 const groupIndex=()=>Math.max(0,FOCUS_GROUPS.findIndex(g=>g.id===group));
 const levelIndex=()=>Math.max(0,GROUP_EXERCISES[group].findIndex(m=>m.id===select.value));
 const levelText=(i,n)=>`LV ${i+1}/${n}`;
 function selectExercise(id){if(goal.disabled)return;window.dispatchEvent(new Event('myr5:exercise-selected'));if(id!==select.value){select.value=id;select.dispatchEvent(new Event('change',{bubbles:true}));}sync();}
 const locked=()=>goal.disabled;
 const paintDial=rotary(dial,{count:()=>FOCUS_GROUPS.length,value:groupIndex,locked,preview:i=>{$('exerciseName').textContent=FOCUS_GROUPS[i].name;},
  commit:i=>{const next=FOCUS_GROUPS[i].id;selectExercise(exerciseAt(next,remembered.get(next)??0).id);}});
 const paintKnob=rotary(knob,{count:()=>GROUP_EXERCISES[group].length,value:levelIndex,locked,preview:i=>{$('difficultySetting').textContent=levelText(i,GROUP_EXERCISES[group].length);},
  commit:i=>selectExercise(exerciseAt(group,i).id)});
 function sync(){
  group=focusFor(select.value);const choices=GROUP_EXERCISES[group],index=levelIndex(),n=choices.length,focus=FOCUS_GROUPS[groupIndex()];
  remembered.set(group,index);const isLocked=locked(),m=EXERCISES[select.value]??choices[index];
  dial.setAttribute('aria-valuenow',String(groupIndex()));dial.setAttribute('aria-valuemax',String(FOCUS_GROUPS.length-1));dial.setAttribute('aria-valuetext',focus.name);$('exerciseName').textContent=focus.name;
  knob.setAttribute('aria-valuenow',String(index+1));knob.setAttribute('aria-valuemax',String(n));knob.setAttribute('aria-valuetext',`${m.name}, level ${index+1} of ${n}`);$('difficultyMax').textContent=n;
  for(const el of [dial,knob])el.setAttribute('aria-disabled',String(isLocked));
  for(const id of ['harder','easier','goalSlider'])$(id).disabled=isLocked;
  paintDial(groupIndex());paintKnob(index);
  $('variationName').textContent=m.name;$('difficultySetting').textContent=levelText(index,n);
  $('variationHint').textContent=m.hint;$('trackingScope').textContent='Camera estimates; not a form or safety check. '+m.measurement+' · '+m.limits;
  const target=$('goalSlider');target.max=Math.max(0,goal.options.length-1);target.value=goal.selectedIndex;
  const chosen=goal.selectedOptions[0];if(chosen){target.setAttribute('aria-valuetext',chosen.textContent);$('goalSetting').textContent=chosen.textContent;$('goalMin').textContent=goal.options[0].value;$('goalMax').textContent=goal.options[goal.options.length-1].value;target.style.setProperty('--fill',`${100*goal.selectedIndex/Math.max(1,goal.options.length-1)}%`);}
 }
 // Spring-loaded lever: tap HARDER/EASIER, or throw the handle up/down and let go. Arrow keys work on either end.
 const handle=lever.querySelector('i');let pull=null,thrown=-Infinity;
 function nudge(step,animate=true){
  if(locked())return;const n=GROUP_EXERCISES[group].length,next=clamp(levelIndex()+step,0,n-1);
  if(animate&&!matchMedia('(prefers-reduced-motion: reduce)').matches)handle.animate([{transform:'translateY(0)'},{transform:`translateY(${-step*24}px)`},{transform:'translateY(0)'}],{duration:260,easing:'ease-out'});
  if(next!==levelIndex()){tick();selectExercise(exerciseAt(group,next).id);}
 }
 $('harder').onclick=()=>{if(performance.now()-thrown>400)nudge(1);};$('easier').onclick=()=>{if(performance.now()-thrown>400)nudge(-1);};
 lever.addEventListener('pointerdown',e=>{if(!locked())pull={id:e.pointerId,y:e.clientY,held:false};});
 lever.addEventListener('pointermove',e=>{
  if(pull?.id!==e.pointerId)return;const dy=clamp(e.clientY-pull.y,-26,26);
  if(!pull.held&&Math.abs(dy)>6){pull.held=true;lever.setPointerCapture(e.pointerId);lever.classList.add('is-pulling');}
  if(pull.held)lever.style.setProperty('--pull',`${dy}px`);
 });
 function release(e,cancelled){
  if(pull?.id!==e.pointerId)return;const dy=clamp(e.clientY-pull.y,-26,26),held=pull.held;pull=null;
  lever.classList.remove('is-pulling');lever.style.removeProperty('--pull');
  if(held){thrown=performance.now();if(!cancelled&&Math.abs(dy)>=14)nudge(dy<0?1:-1,false);}
 }
 lever.addEventListener('pointerup',e=>release(e,false));lever.addEventListener('pointercancel',e=>release(e,true));
 lever.addEventListener('keydown',e=>{const step={ArrowUp:1,ArrowRight:1,ArrowDown:-1,ArrowLeft:-1}[e.key];if(step){e.preventDefault();nudge(step);}});
 // Toggle switch: app.mjs owns the click (voice on/off); the board adds the tick and arrow keys.
 const sound=$('toggleVoice');sound.addEventListener('click',tick);
 sound.addEventListener('keydown',e=>{const on={ArrowUp:true,ArrowRight:true,ArrowDown:false,ArrowLeft:false}[e.key];if(on===undefined)return;e.preventDefault();if(!sound.disabled&&(sound.dataset.on==='true')!==on)sound.click();});
 $('goalSlider').addEventListener('input',()=>{if(goal.disabled)return;goal.selectedIndex=Number($('goalSlider').value);goal.dispatchEvent(new Event('change',{bubbles:true}));sync();});
 select.addEventListener('change',sync);goal.addEventListener('change',sync);window.addEventListener('myr5:movement-configured',sync);
 const observer=new MutationObserver(sync);observer.observe(goal,{attributes:true,attributeFilter:['disabled'],childList:true});window.addEventListener('pagehide',()=>observer.disconnect());sync();
}
