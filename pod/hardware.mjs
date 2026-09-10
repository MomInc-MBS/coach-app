import {FOCUS_GROUPS,GROUP_EXERCISES,EXERCISES,exerciseAt,focusFor} from '../exercise-library.mjs';
const $=id=>document.getElementById(id),clamp=(x,min,max)=>Math.max(min,Math.min(max,x));
export function initHardware(){
 const select=$('movement'),dial=$('exerciseDial'),goal=$('goal'),slider=$('difficultySlider');
 let pointer=null,pending=null,group=focusFor(select.value);const remembered=new Map();
 function groupIndex(){return Math.max(0,FOCUS_GROUPS.findIndex(g=>g.id===group));}
 function draw(index=groupIndex()){
  const name=FOCUS_GROUPS[index].name;dial.style.setProperty('--dial-angle',`${-135+270*index/(FOCUS_GROUPS.length-1)}deg`);
  dial.setAttribute('aria-valuenow',String(index));dial.setAttribute('aria-valuemax',String(FOCUS_GROUPS.length-1));dial.setAttribute('aria-valuetext',name);$('exerciseName').textContent=name;
 }
 function sync(){
  group=focusFor(select.value);const choices=GROUP_EXERCISES[group],index=Math.max(0,choices.findIndex(m=>m.id===select.value));
  remembered.set(group,index);draw();const locked=goal.disabled;dial.setAttribute('aria-disabled',String(locked));
  for(const id of ['previousExercise','nextExercise','difficultySlider','goalSlider'])$(id).disabled=locked;
  slider.max=choices.length-1;slider.value=index;const m=EXERCISES[select.value]??choices[index];
  slider.setAttribute('aria-valuetext',`${m.name}, level ${index+1} of ${choices.length}`);slider.style.setProperty('--fill',`${100*index/Math.max(1,choices.length-1)}%`);
  $('variationName').textContent=m.name;$('difficultySetting').textContent=`${index+1} / ${choices.length}`;
  $('variationHint').textContent=m.hint;$('trackingScope').textContent='Camera estimates; not a form or safety check. '+m.measurement+' · '+m.limits;
  const target=$('goalSlider');target.max=Math.max(0,goal.options.length-1);target.value=goal.selectedIndex;
  const chosen=goal.selectedOptions[0];if(chosen){target.setAttribute('aria-valuetext',chosen.textContent);$('goalSetting').textContent=chosen.textContent;$('goalMin').textContent=goal.options[0].value;$('goalMax').textContent=goal.options[goal.options.length-1].value;target.style.setProperty('--fill',`${100*goal.selectedIndex/Math.max(1,goal.options.length-1)}%`);}
 }
 function selectExercise(id){if(goal.disabled)return;window.dispatchEvent(new Event('myr5:exercise-selected'));if(id!==select.value){select.value=id;select.dispatchEvent(new Event('change',{bubbles:true}));}sync();}
 function choose(index){if(goal.disabled)return;const next=FOCUS_GROUPS[clamp(index,0,FOCUS_GROUPS.length-1)].id;selectExercise(exerciseAt(next,remembered.get(next)??0).id);}
 function position(e){const r=dial.getBoundingClientRect(),angle=Math.atan2(e.clientX-r.left-r.width/2,-(e.clientY-r.top-r.height/2))*180/Math.PI;return Math.round((clamp(angle,-135,135)+135)/270*(FOCUS_GROUPS.length-1));}
 dial.addEventListener('pointerdown',e=>{if(goal.disabled)return;e.preventDefault();dial.focus({preventScroll:true});pointer=e.pointerId;dial.setPointerCapture(pointer);pending=position(e);draw(pending);});
 dial.addEventListener('pointermove',e=>{if(pointer===e.pointerId){pending=position(e);draw(pending);}});
 dial.addEventListener('pointerup',e=>{if(pointer!==e.pointerId)return;const next=pending;pointer=pending=null;dial.releasePointerCapture(e.pointerId);choose(next);});
 dial.addEventListener('pointercancel',()=>{pointer=pending=null;sync();});
 dial.addEventListener('keydown',e=>{const delta={ArrowLeft:-1,ArrowDown:-1,ArrowRight:1,ArrowUp:1};if(e.key in delta){e.preventDefault();choose(groupIndex()+delta[e.key]);}else if(['Home','End'].includes(e.key)){e.preventDefault();choose(e.key==='Home'?0:FOCUS_GROUPS.length-1);}});
 $('previousExercise').onclick=()=>choose(groupIndex()-1);$('nextExercise').onclick=()=>choose(groupIndex()+1);
 slider.addEventListener('input',()=>selectExercise(exerciseAt(group,slider.value).id));
 $('goalSlider').addEventListener('input',()=>{if(goal.disabled)return;goal.selectedIndex=Number($('goalSlider').value);goal.dispatchEvent(new Event('change',{bubbles:true}));sync();});
 select.addEventListener('change',sync);goal.addEventListener('change',sync);window.addEventListener('myr5:movement-configured',sync);
 const observer=new MutationObserver(sync);observer.observe(goal,{attributes:true,attributeFilter:['disabled'],childList:true});window.addEventListener('pagehide',()=>observer.disconnect());sync();
}
