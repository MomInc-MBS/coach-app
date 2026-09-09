const $=id=>document.getElementById(id),clamp=(x,min,max)=>Math.max(min,Math.min(max,x));
export function initHardware(){
 const select=$('movement'),dial=$('exerciseDial'),goal=$('goal'),slider=$('goalSlider');let pointer=null,pending=null;
 function draw(index=select.selectedIndex){const n=select.options.length;if(!n)return;const name=select.options[index]?.textContent||'';dial.style.setProperty('--dial-angle',`${-135+270*index/Math.max(1,n-1)}deg`);dial.setAttribute('aria-valuenow',String(index));dial.setAttribute('aria-valuemax',String(n-1));dial.setAttribute('aria-valuetext',name);$('exerciseName').textContent=name;}
 function sync(){draw();const locked=goal.disabled;dial.setAttribute('aria-disabled',String(locked));for(const id of ['previousExercise','nextExercise','goalSlider'])$(id).disabled=locked;slider.max=Math.max(0,goal.options.length-1);slider.value=goal.selectedIndex;const chosen=goal.selectedOptions[0];if(!chosen)return;slider.setAttribute('aria-valuetext',chosen.textContent);$('goalSetting').textContent=chosen.textContent.toUpperCase();$('goalMin').textContent=goal.options[0].value;$('goalMax').textContent=goal.options[goal.options.length-1].value;slider.style.setProperty('--fill',`${100*goal.selectedIndex/Math.max(1,goal.options.length-1)}%`);}
 function choose(index){if(goal.disabled)return;index=clamp(index,0,select.options.length-1);if(index!==select.selectedIndex){select.selectedIndex=index;select.dispatchEvent(new Event('change',{bubbles:true}));}sync();}
 function position(e){const r=dial.getBoundingClientRect(),angle=Math.atan2(e.clientX-r.left-r.width/2,-(e.clientY-r.top-r.height/2))*180/Math.PI;return Math.round((clamp(angle,-135,135)+135)/270*(select.options.length-1));}
 dial.addEventListener('pointerdown',e=>{if(goal.disabled)return;e.preventDefault();dial.focus({preventScroll:true});pointer=e.pointerId;dial.setPointerCapture(pointer);pending=position(e);draw(pending);});
 dial.addEventListener('pointermove',e=>{if(pointer===e.pointerId){pending=position(e);draw(pending);}});
 dial.addEventListener('pointerup',e=>{if(pointer!==e.pointerId)return;const next=pending;pointer=pending=null;dial.releasePointerCapture(e.pointerId);choose(next);});
 dial.addEventListener('pointercancel',()=>{pointer=pending=null;sync();});
 dial.addEventListener('keydown',e=>{const delta={ArrowLeft:-1,ArrowDown:-1,ArrowRight:1,ArrowUp:1};if(e.key in delta){e.preventDefault();choose(select.selectedIndex+delta[e.key]);}else if(['Home','End'].includes(e.key)){e.preventDefault();choose(e.key==='Home'?0:select.options.length-1);}});
 $('previousExercise').onclick=()=>choose(select.selectedIndex-1);$('nextExercise').onclick=()=>choose(select.selectedIndex+1);
 slider.addEventListener('input',()=>{if(goal.disabled)return;goal.selectedIndex=Number(slider.value);goal.dispatchEvent(new Event('change',{bubbles:true}));sync();});
 select.addEventListener('change',sync);goal.addEventListener('change',sync);window.addEventListener('myr5:movement-configured',sync);
 const observer=new MutationObserver(sync);observer.observe(goal,{attributes:true,attributeFilter:['disabled'],childList:true});window.addEventListener('pagehide',()=>observer.disconnect());sync();
}
