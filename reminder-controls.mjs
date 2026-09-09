import {TONES,CADENCES,CADENCE_LABELS,reminderMessage} from './reminder-settings.mjs';
export function mountReminderControls(){
 const $=id=>document.getElementById(id),form=$('reminderForm'),dial=$('toneDial'),slider=$('consistencySlider');
 let index=1,drag=null;
 function render(){
  const tone=TONES[index],days=CADENCES[Number(slider.value)];
  form.elements.tone.value=tone;form.elements.daysPerWeek.value=days;
  dial.setAttribute('aria-valuenow',index);dial.setAttribute('aria-valuetext',tone);dial.style.setProperty('--turn',`${(index-1)*110}deg`);
  $('toneValue').textContent=tone[0].toUpperCase()+tone.slice(1);$('reminderPreview').textContent=reminderMessage(form.elements.kind.value,tone);
  $('consistencyValue').textContent=CADENCE_LABELS[days];slider.setAttribute('aria-valuetext',CADENCE_LABELS[days]);slider.style.setProperty('--fill',`${Number(slider.value)/3*100}%`);
  $('gentlerTone').disabled=index===0;$('cheekierTone').disabled=index===2;
 }
 const change=value=>{index=Math.max(0,Math.min(2,value));render();};
 $('gentlerTone').onclick=()=>change(index-1);$('cheekierTone').onclick=()=>change(index+1);
 dial.onkeydown=e=>{const actions={ArrowLeft:index-1,ArrowDown:index-1,ArrowRight:index+1,ArrowUp:index+1,Home:0,End:2};if(Object.hasOwn(actions,e.key)){e.preventDefault();change(actions[e.key]);}};
 dial.onpointerdown=e=>{if(e.button!==0)return;drag={x:e.clientX,y:e.clientY,index,id:e.pointerId};dial.setPointerCapture(e.pointerId);dial.focus();};
 dial.onpointermove=e=>{if(drag?.id===e.pointerId)change(drag.index+Math.round(((e.clientX-drag.x)-(e.clientY-drag.y))/40));};
 dial.onpointerup=dial.onpointercancel=dial.onlostpointercapture=()=>{drag=null;};
 slider.oninput=render;form.elements.kind.addEventListener('change',render);
 render();
 return {load(tone='direct',days=7){index=Math.max(0,TONES.indexOf(tone));slider.value=Math.max(0,CADENCES.indexOf(days));render();}};
}
