import {authTransitions} from './auth-transition.mjs';
import {createAccountSessionActions} from './account-session-actions.mjs';
import {BreathingSession,BREATHING_MS} from './combat.mjs';
import {BREATHING_MODES,MODE_IDS,SEATED_ONLY_NOTICE,NO_MEDICAL_CLAIM,buildScript,phaseAt} from './breathing-modes.mjs';

// D9/D25: both modes are skins over the one existing clock/ticket/completion call
// (BreathingSession + actions.completeBreathing, re-checked in server/combat.mjs). circuit.mjs
// counts a day with *any* completed breathing_sessions row, so either mode is the day's single
// meditation step and a second completion the same day adds nothing.
const DEFAULT_STATUS='Complete a session for today’s ×100 damage.';
const IDLE_CAPTION='Breathe in. Breathe out.';
// The big caption follows the phase. Reduced motion keeps it steady through fast in/out breathing.
function captionFor(p,reduced){
 if(p.key==='recover')return 'Breathe in and hold.';
 if(p.key==='rest')return 'Breathe normally.';
 if(p.breath)return reduced?IDLE_CAPTION:p.breath==='in'?'Breathe in.':'Breathe out.';
 return p.key==='hold'?'Breathe out and hold.':IDLE_CAPTION;
}

export function mountBreathing({dialog,scene,pause,api,onComplete,getAccount,transitions=authTransitions()}){
 const actions=createAccountSessionActions({api,transitions});
 const controls=document.createElement('div');controls.className='breathing-session';
 controls.innerHTML='<div class="breath-modes" data-breath-modes>'+MODE_IDS.map(id=>{const m=BREATHING_MODES[id];return `<button type="button" class="breath-mode-card" data-mode="${id}"><strong>${m.title}</strong><small>${m.subtitle}</small>`+(m.seatedOnly?`<small class="breath-seated-notice">${SEATED_ONLY_NOTICE}</small>`:'')+'</button>';}).join('')+'</div>'
  +'<div class="breath-run" data-breath-run hidden><p class="breath-seated-notice" data-seated hidden>'+SEATED_ONLY_NOTICE+'</p><p class="breath-phase" data-phase-label></p><progress max="'+BREATHING_MS+'" value="0" aria-label="Breathing session progress"></progress>'
  +'<div class="breath-actions"><button type="button" class="breath-exit" data-breath-exit>Stop now</button><button type="button" data-retry hidden>Save breathing bonus</button></div>'
  +'<button type="button" class="breath-stance-link" data-stance-link hidden>Check this stance with the camera coach</button></div>'
  +'<p data-status role="status"></p><p class="breath-note">'+NO_MEDICAL_CLAIM+'</p>';
 scene.append(controls);
 const $=selector=>controls.querySelector(selector);
 const modesEl=$('[data-breath-modes]'),runEl=$('[data-breath-run]'),seated=$('[data-seated]'),phaseEl=$('[data-phase-label]'),bar=$('progress'),exit=$('[data-breath-exit]'),retry=$('[data-retry]'),stanceLink=$('[data-stance-link]'),statusEl=$('[data-status]');
 const speech=scene.querySelector?.('.meditation-speech'),reducedMotion=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
 let clock=new BreathingSession(),ticket=null,saving=false,finished=false,awaitingRetry=false,run=0,script=null,caption='';
 function renderPhase(ms){
  const p=phaseAt(script,ms);runEl.dataset.phase=p.key;
  phaseEl.textContent=[p.label,p.breath&&'breathe '+p.breath,p.remainingMs>0&&Math.ceil(p.remainingMs/1000)+'s'].filter(Boolean).join(' · ');
  stanceLink.hidden=!p.stanceId;stanceLink.dataset.stance=p.stanceId||'';
  // Only on change, so a character-tap line stays until the next phase and the live region is not re-announced.
  const next=captionFor(p,reducedMotion?.matches);if(speech&&next!==caption){caption=next;speech.textContent=next;}
 }
 function reset(){
  run++;clock=new BreathingSession();ticket=null;saving=false;finished=false;awaitingRetry=false;script=null;
  if(caption&&speech)speech.textContent=IDLE_CAPTION;caption='';
  bar.value=0;pause.disabled=true;pause.hidden=true;pause.textContent='Pause';dialog.classList.remove('breathing-paused');
  modesEl.hidden=false;runEl.hidden=true;seated.hidden=true;retry.hidden=true;stanceLink.hidden=true;runEl.dataset.phase='';
  exit.textContent='Stop now';phaseEl.textContent='';statusEl.textContent=DEFAULT_STATUS;
 }
 async function finish(){
  if(saving||finished||!ticket||!clock.complete)return;
  saving=true;awaitingRetry=false;retry.hidden=true;pause.disabled=true;statusEl.textContent='Saving your breathing bonus…';const current=run;
  try{
   const binding=ticket;await actions.completeBreathing(binding,clock.elapsed);
   if(current!==run||!transitions.isCurrent(binding.transitionTicket))return;
   await onComplete?.();
   if(current!==run||!transitions.isCurrent(binding.transitionTicket))return;
   finished=true;statusEl.textContent='Breathing complete · ×100 damage today';phaseEl.textContent='Complete';runEl.dataset.phase='complete';stanceLink.hidden=true;pause.hidden=true;exit.textContent='Done';
  }catch(error){if(current===run){statusEl.textContent=error.message;retry.hidden=false;awaitingRetry=true;}}
  finally{if(current===run)saving=false;}
 }
 async function startSession(id){
  reset();script=buildScript(id);seated.hidden=!BREATHING_MODES[id].seatedOnly;modesEl.hidden=true;runEl.hidden=false;statusEl.textContent='Starting…';renderPhase(0);
  const current=run;
  try{
   const value=await actions.startBreathing(getAccount?.());
   if(current!==run||!transitions.isCurrent(value.transitionTicket))return;
   ticket=value;clock=new BreathingSession();pause.disabled=false;pause.hidden=false;statusEl.textContent='3:00 remaining';
  }catch(error){if(current===run){reset();statusEl.textContent=error.message;}}
 }
 for(const id of MODE_IDS)$(`[data-mode="${id}"]`).onclick=()=>startSession(id);
 // Immediate exit: abandons the session (nothing is saved) and never waits on the network.
 exit.onclick=()=>reset();
 retry.onclick=()=>finish();
 // D25: existing core/balance hold detection stays reachable -- leave breathing for the movement
 // library's own camera hold for this stance instead of re-implementing pose detection here.
 stanceLink.onclick=()=>{const id=stanceLink.dataset.stance;dialog.close();document.getElementById('openLibrary')?.click();document.querySelector(`[data-movement="${id}"]`)?.click();};
 const timer=setInterval(()=>{
  const active=!!ticket&&dialog.open&&!scene.hidden&&!document.hidden&&!dialog.classList.contains('breathing-paused')&&!dialog.classList.contains('snorting')&&!dialog.classList.contains('blacking-out');
  clock.sample(performance.now(),active);bar.value=clock.elapsed;
  if(ticket&&!finished&&!saving&&!clock.complete){const left=Math.ceil((BREATHING_MS-clock.elapsed)/1000);statusEl.textContent=`${Math.floor(left/60)}:${String(left%60).padStart(2,'0')} remaining`+(active?'':' · Paused');renderPhase(clock.elapsed);}
  if(clock.complete&&!finished&&!saving&&!awaitingRetry)void finish();
 },250);
 const unsubscribe=transitions.subscribe(reset);
 dialog.addEventListener('close',reset);window.addEventListener('pagehide',()=>{unsubscribe();clearInterval(timer);reset();},{once:true});
 reset();
}
