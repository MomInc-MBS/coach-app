import {authTransitions} from './auth-transition.mjs';
import {createAccountSessionActions} from './account-session-actions.mjs';
import {BreathingSession,BREATHING_MS} from './combat.mjs';
import {BREATHING_MODES,MODE_IDS,SEATED_ONLY_NOTICE,NO_MEDICAL_CLAIM,GENTLE_DIALOGUE,GUIDED_ROUND_TIMING,GUIDED_ROUND_MS,buildScript,phaseAt} from './breathing-modes.mjs';
export const revealRadius=(done,total,maxR)=>{const pct=100*done/total;return `${Math.min(100,Math.max(0,pct))}%`};

// Both modes use the existing account-owned breathing ticket and completion path. The guided
// round's timing lives in breathing-modes.mjs so cadence review can tune phases without changing ownership.
const DEFAULT_STATUS='Complete a session for today’s ×100 damage.';
const IDLE_CAPTION='Breathe in. Breathe out.';
// The big caption follows the phase. Reduced motion keeps it steady through fast in/out breathing.
function captionFor(p,reduced){
 if(p.key==='settle')return 'Choose a comfortable position. Let your shoulders soften.';
 if(p.key==='optional-hold')return 'Breathe whenever you need to. Do not force the hold.';
 if(p.key==='recovery')return 'Return to easy breathing.';
 if(p.key==='recovery-hold')return 'Let breathing return to normal whenever you like.';
 if(p.key==='rest')return 'Breathe normally.';
 if(p.breath)return reduced?IDLE_CAPTION:p.breath==='in'?'Breathe in.':'Breathe out.';
 return p.key==='hold'?'Breathe out and hold.':IDLE_CAPTION;
}

export function mountBreathing({dialog,scene,pause,api,onComplete,onSessionComplete,onEarlyExit,getAccount,transitions=authTransitions()}){
 const actions=createAccountSessionActions({api,transitions});
 const controls=document.createElement('div');controls.className='breathing-session';
 controls.innerHTML='<div class="breath-modes" data-breath-modes>'+MODE_IDS.map(id=>{const m=BREATHING_MODES[id];return `<button type="button" class="breath-mode-card" data-mode="${id}"><strong>${m.title}</strong><small>${m.subtitle}</small>`+(m.seatedOnly?`<small class="breath-seated-notice">${SEATED_ONLY_NOTICE}</small>`:'')+'</button>';}).join('')+'</div>'
  +'<div class="breath-run" data-breath-run hidden><p class="breath-seated-notice" data-seated hidden>'+SEATED_ONLY_NOTICE+'</p><p class="breath-phase" data-phase-label></p><progress max="'+BREATHING_MS+'" value="0" aria-label="Breathing session progress"></progress>'
  +'<div class="breath-actions"><button type="button" data-retry hidden>Save breathing bonus</button><button type="button" data-skip-hold hidden>Skip · breathe normally</button></div>'
  +'<button type="button" class="breath-stance-link" data-stance-link hidden>Check this stance with the camera coach</button></div>'
  +'<p data-status role="status"></p><p class="breath-note">'+NO_MEDICAL_CLAIM+'</p>';
 scene.append(controls);
 controls.querySelector('.breath-actions').append(pause);
 const $=selector=>controls.querySelector(selector);
 const modesEl=$('[data-breath-modes]'),runEl=$('[data-breath-run]'),seated=$('[data-seated]'),phaseEl=$('[data-phase-label]'),bar=$('progress'),stopCircle=scene.querySelector?.('[data-breathing-stop], [data-breath-exit]'),retry=$('[data-retry]'),skipHold=$('[data-skip-hold]'),stanceLink=$('[data-stance-link]'),statusEl=$('[data-status]'),countEl=scene.querySelector?.('[data-breath-count]'),sessionClock=scene.querySelector?.('[data-session-clock]'),directionEl=scene.querySelector?.('[data-breath-direction]');
 // Both exercises and the decorative pose selector share a compact, reachable control strip.
 const speech=scene.querySelector?.('.meditation-speech'),reducedMotion=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
 let clock=new BreathingSession(),ticket=null,saving=false,finished=false,awaitingRetry=false,run=0,script=null,caption='',duration=BREATHING_MS;
 function renderPhase(ms){
  const p=phaseAt(script,ms);runEl.dataset.phase=p.key;skipHold.hidden=!['optional-hold','recovery-hold'].includes(p.key);
  phaseEl.textContent=({settle:'Settle gently',breathe:p.breath==='in'?'Breathe in':'Breathe out',transition:'Easy exhale','optional-hold':'Optional pause',recovery:'Easy inhale','recovery-hold':'Optional recovery',rest:'Breathe normally'})[p.key]||p.label;
  stanceLink.hidden=!p.stanceId;stanceLink.dataset.stance=p.stanceId||'';
  // Only on change, so a character-tap line stays until the next phase and the live region is not re-announced.
  let next=p.dialogue||captionFor(p,reducedMotion?.matches);
  if(p.key==='breathe'&&p.pace){const elapsed=p.ms-p.remainingMs,cycle=p.pace.inhaleMs+p.pace.exhaleMs,index=Math.floor(elapsed/cycle);next=GENTLE_DIALOGUE[1+Math.floor(index/6)%6];}
  if(speech&&next!==caption){caption=next;speech.textContent=next;}
  if(countEl){let remaining=p.remainingMs||0,progress=.5,value='\u2014',direction=p.key==='settle'?'READY':'REST';if(['settle','rest'].includes(p.key)){const cycle=GUIDED_ROUND_TIMING.inhaleMs+GUIDED_ROUND_TIMING.exhaleMs,elapsed=Math.max(0,p.ms-p.remainingMs),offset=elapsed%cycle,inhale=offset<GUIDED_ROUND_TIMING.inhaleMs;progress=inhale?offset/GUIDED_ROUND_TIMING.inhaleMs:1-(offset-GUIDED_ROUND_TIMING.inhaleMs)/GUIDED_ROUND_TIMING.exhaleMs;direction=inhale?'IN':'OUT';}else if(p.pace&&p.breath){const into=p.ms-p.remainingMs,cycle=p.pace.inhaleMs+p.pace.exhaleMs,offset=into%cycle,segment=p.breath==='in'?offset:offset-p.pace.inhaleMs;remaining=p.breath==='in'?p.pace.inhaleMs-offset:cycle-offset;progress=p.breath==='in'?offset/p.pace.inhaleMs:1-segment/p.pace.exhaleMs;value=String(Math.min(BREATHING_MODES['wim-hof'].breathsPerRound,Math.floor(into/cycle)+1));direction=p.breath==='in'?'IN':'OUT';const breathCount=parseInt(value),radiusPercent=revealRadius(breathCount,BREATHING_MODES['wim-hof'].breathsPerRound,50);document.querySelector('.meditation-stage')?.style.setProperty('--reveal-radius',radiusPercent);}else if(p.key==='transition'){progress=1-(p.ms-p.remainingMs)/p.ms;direction='OUT';}else if(p.key==='optional-hold'){progress=0;value=String(Math.max(0,Math.ceil(remaining/1000)));direction='HOLD?';}else if(p.key==='recovery'){progress=(p.ms-p.remainingMs)/p.ms;direction='IN';}else if(p.key==='recovery-hold'){progress=1;value=String(Math.max(0,Math.ceil(remaining/1000)));direction='HOLD?';}else if(p.key==='complete'){value='30';direction='DONE';}countEl.textContent=value;countEl.dataset.breath=p.breath||'rest';countEl.parentElement?.style.setProperty('--breath-progress',String(Math.max(0,Math.min(1,progress))));countEl.parentElement?.style.setProperty('--breath-scale',String(.70+Math.max(0,Math.min(1,progress))*.42));if(directionEl)directionEl.textContent=direction;}
 }
 function reset({keepPose=false}={}){
  run++;clock=new BreathingSession();duration=BREATHING_MS;ticket=null;saving=false;finished=false;awaitingRetry=false;script=null;
  if(caption&&speech)speech.textContent=IDLE_CAPTION;caption='';
  bar.max=BREATHING_MS;bar.value=0;sessionClock&&(sessionClock.textContent='3:30');countEl&&(countEl.textContent='—');directionEl&&(directionEl.textContent='READY');pause.disabled=true;pause.hidden=true;pause.textContent='Pause';dialog.classList.remove('breathing-paused');
  modesEl.hidden=false;runEl.hidden=true;seated.hidden=true;retry.hidden=true;skipHold.hidden=true;stanceLink.hidden=true;runEl.dataset.phase='';
  if(stopCircle)stopCircle.hidden=true;phaseEl.textContent='';statusEl.textContent=DEFAULT_STATUS;
 }
 async function finish(){
  if(saving||finished||!ticket||!clock.complete)return;
  saving=true;awaitingRetry=false;retry.hidden=true;pause.disabled=true;statusEl.textContent='Saving your breathing bonus…';const current=run;
  try{
   const binding=ticket;await actions.completeBreathing(binding,clock.elapsed);
   if(current!==run||!transitions.isCurrent(binding.transitionTicket))return;
   await onComplete?.();
   if(current!==run||!transitions.isCurrent(binding.transitionTicket))return;
   finished=true;statusEl.textContent='Breathing complete · ×100 damage today';sessionClock&&(sessionClock.textContent='0:00');countEl&&(countEl.textContent='30');directionEl&&(directionEl.textContent='DONE');phaseEl.textContent='Complete';runEl.dataset.phase='complete';stanceLink.hidden=true;pause.hidden=true;if(stopCircle)stopCircle.hidden=false;onSessionComplete?.();
  }catch(error){if(current===run){statusEl.textContent=error.message;retry.hidden=false;awaitingRetry=true;}}
  finally{if(current===run)saving=false;}
 }
 async function startSession(id){
  reset({keepPose:true});duration=id==='wim-hof'?GUIDED_ROUND_MS:BREATHING_MS;bar.max=duration;script=buildScript(id);seated.hidden=!BREATHING_MODES[id]?.seatedOnly;modesEl.hidden=true;runEl.hidden=false;statusEl.textContent='Starting…';sessionClock&&(sessionClock.textContent=formatTime(duration));renderPhase(0);
  const current=run;
  try{
   const value=await actions.startBreathing(getAccount?.());
   if(current!==run||!transitions.isCurrent(value.transitionTicket))return;
   ticket=value;clock=new BreathingSession(duration);pause.disabled=false;pause.hidden=false;if(stopCircle)stopCircle.hidden=false;statusEl.textContent=formatTime(duration)+' remaining';
  }catch(error){if(current===run){reset();statusEl.textContent=error.message;}}
 }
 for(const id of MODE_IDS)modesEl.querySelector(`[data-mode="${id}"]`).onclick=()=>startSession(id);
 
 // Abandon the ticket before the exit animation. This path never calls completion/save.
 const stopNow=()=>{const early=!!ticket&&!finished&&!clock.complete,transitionTicket=ticket?.transitionTicket;reset();if(early)void onEarlyExit?.({isCurrent:()=>!transitionTicket||transitions.isCurrent(transitionTicket)});else if(dialog.open)dialog.close();};
 if(stopCircle)stopCircle.onclick=stopNow;
 skipHold.onclick=()=>{if(!script||!['optional-hold','recovery-hold'].includes(runEl.dataset.phase))return;const index=script.findIndex(p=>p.key===runEl.dataset.phase);script=script.map((p,i)=>i>=index?{key:'rest',label:'Breathe normally until the timer ends',ms:p.ms}:p);renderPhase(clock.elapsed);};
 retry.onclick=()=>finish();
 // D25: existing core/balance hold detection stays reachable -- leave breathing for the movement
 // library's own camera hold for this stance instead of re-implementing pose detection here.
 stanceLink.onclick=()=>{const id=stanceLink.dataset.stance;dialog.close();document.getElementById('openLibrary')?.click();document.querySelector(`[data-movement="${id}"]`)?.click();};
 const timer=setInterval(()=>{
  const active=!!ticket&&dialog.open&&!scene.hidden&&!document.hidden&&!dialog.classList.contains('breathing-paused')&&!dialog.classList.contains('snorting')&&!dialog.classList.contains('blacking-out');
  clock.sample(performance.now(),active);bar.value=clock.elapsed;
  if(ticket&&!finished&&!saving&&!clock.complete){const left=Math.ceil((duration-clock.elapsed)/1000);statusEl.textContent=formatTime(duration-clock.elapsed)+' remaining'+(active?'':' · Paused');sessionClock&&(sessionClock.textContent=formatTime(duration-clock.elapsed));renderPhase(clock.elapsed);}
  if(clock.complete&&!finished&&!saving&&!awaitingRetry)void finish();
 },50);
 const unsubscribe=transitions.subscribe(reset);
 dialog.addEventListener('close',reset);window.addEventListener('pagehide',event=>{reset();if(!event.persisted){unsubscribe();clearInterval(timer);}});
 reset();
}
function formatTime(ms){const seconds=Math.max(0,Math.ceil(ms/1000));return `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;}
