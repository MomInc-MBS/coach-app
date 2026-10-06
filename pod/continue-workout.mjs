// #19 (revised): today's newest paused/interrupted workout is offered as a Continue popup on the pod page
// itself, never on the portal quilt. The popup lives inside #homeScreen, so it travels with the pod when the
// portal hosts it in its full-screen workout dialog and is never left outside a modal (inert).
export function podShown(doc=document){
 const home=doc.getElementById('homeScreen');if(!home||home.hidden||doc.hidden||doc.body.dataset.screen==='rest')return false;
 const host=home.closest('dialog');if(host)return host.open;
 return doc.getElementById('portalHome')?.hidden!==false;
}
export const continueVisible=({shown,idle,row,dismissed})=>!!row&&shown&&idle&&dismissed!==row.id;
export function continuePrompt(row,label,access){
 const legacyManual=row.metadata?.control==='manual';
 return {allowed:access.allowed,text:access.allowed?(legacyManual?'Saved manual set · Start with camera · ':'Continue · ')+label:`Saved ${label}. ${access.reason||'This workout path is locked.'} Your set remains in history.`,action:legacyManual?'Start with camera':'Continue'};
}
export function mountContinueWorkout({doc=document,unfinished,idle,label,onContinue,canContinue=()=>({allowed:true})}){
 const home=doc.getElementById('homeScreen');
 const card=doc.createElement('section');card.className='continue-workout';card.hidden=true;card.setAttribute('role','dialog');card.setAttribute('aria-labelledby','continueWorkoutTitle');
 card.innerHTML='<p class="continue-eyebrow">UNFINISHED SET</p><h2 id="continueWorkoutTitle"></h2><div class="continue-actions"><button type="button" class="primary-action" data-continue>Continue</button><button type="button" data-dismiss>Not now</button></div>';
 home.append(card);
 let row=null,dismissed=null,queued=0,run=0;
 const hide=()=>{if(!card.hidden)card.hidden=true;};
 async function refresh(){
  const ticket=++run;
  if(!podShown(doc)||!idle()){hide();return;}
  let next=null;try{next=await unfinished();}catch{}
  if(ticket!==run)return;
  row=next;
  if(!continueVisible({shown:podShown(doc),idle:idle(),row,dismissed})){hide();return;}
  const prompt=continuePrompt(row,label(row),canContinue(row));if(card.querySelector('h2').textContent!==prompt.text)card.querySelector('h2').textContent=prompt.text;
  card.querySelector('[data-continue]').hidden=!prompt.allowed;
  card.querySelector('[data-continue]').textContent=prompt.action;
  // Sit just above the bottom bar, whatever height it has on this phone.
  const bar=doc.getElementById('coachDock')?.getBoundingClientRect(),bottom=bar?.height?Math.max(16,innerHeight-bar.top+12)+'px':'';
  if(card.style.bottom!==bottom)card.style.bottom=bottom;
  if(card.hidden)card.hidden=false;
 }
 const queue=()=>{queued||=setTimeout(()=>{queued=0;void refresh();});};
 const observer=new MutationObserver(queue);
 const onVisibility=()=>{if(doc.hidden){run++;hide();}else queue();};
 doc.addEventListener('visibilitychange',onVisibility);
 observer.observe(doc.body,{subtree:true,attributes:true,attributeFilter:['hidden','open','aria-current','data-screen','data-tracking']});
 card.querySelector('[data-dismiss]').onclick=()=>{dismissed=row?.id??null;hide();};
 card.querySelector('[data-continue]').onclick=()=>{const chosen=row;hide();if(!chosen||!idle()||doc.hidden)return;if(!canContinue(chosen).allowed){dismissed=chosen.id;return;}onContinue(chosen);};
 queue();
 return {refresh,dispose(){observer.disconnect();doc.removeEventListener('visibilitychange',onVisibility);clearTimeout(queued);card.remove();}};
}
