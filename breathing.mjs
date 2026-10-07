import {authTransitions} from './auth-transition.mjs';
import {recordDailyActivity,localDay} from './performance-progress.mjs';
import {createAccountSessionActions} from './account-session-actions.mjs';
import {BreathingSession,BREATHING_MS} from './combat.mjs';
import {BREATHING_MODES,SEATED_ONLY_NOTICE,NO_MEDICAL_CLAIM,GENTLE_DIALOGUE,GUIDED_ROUND_TIMING,GUIDED_ROUND_MS,buildScript,phaseAt,totalBreaths as countBreaths,breathsDone,revealRadius,pulseRadius,breathPhaseProgress} from './breathing-modes.mjs';
// R18 A5: a speech line fades in, stays ~4 s, fades out (CSS .bubble); re-adding the class restarts it.
export const bubble=(el,text)=>{el.textContent=text;el.classList.remove('bubble');void el.offsetWidth;el.classList.add('bubble');};

// Both modes use the existing account-owned breathing ticket and completion path. The guided
// round's timing lives in breathing-modes.mjs so cadence review can tune phases without changing ownership.
const DEFAULT_STATUS='Complete a session to double today’s workout XP.';
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
 // R20: one Begin button starts the guided round (Begin -> seated warning -> settle countdown -> breathing). Tai chi stays in
 // breathing-modes.mjs for anything that imports it but is no longer offered here. data-mode keeps older selectors working.
 controls.innerHTML='<div class="breath-modes" data-breath-modes><button type="button" class="breath-begin" data-begin data-mode="wim-hof">Begin</button></div>'
  +'<div class="breath-run" data-breath-run hidden><p class="breath-phase" data-phase-label></p><progress max="'+BREATHING_MS+'" value="0" aria-label="Breathing session progress"></progress>'
  +'<div class="breath-actions"><button type="button" data-retry hidden>Save breathing bonus</button><button type="button" data-skip-hold hidden>Skip · breathe normally</button></div>'
  +'<button type="button" class="breath-stance-link" data-stance-link hidden>Check this stance with the camera coach</button></div>'
  +'<p data-status role="status"></p><p class="breath-note">'+NO_MEDICAL_CLAIM+'</p>';
 scene.append(controls);
 // R18 A4: the seated warning is a full-scene overlay; nothing ticks until Accept, then it fades out (600 ms) and is hidden.
 const seated=document.createElement('div');seated.className='breath-seated-overlay';seated.dataset.seated='';seated.hidden=true;seated.innerHTML='<div role="alertdialog" aria-label="Before you begin"><p class="breath-seated-notice">'+SEATED_ONLY_NOTICE+'</p><button type="button" data-seated-accept>Accept</button></div>';dialog.append(seated);
 // R18 polish: after Accept the top panel fades to near-invisible; any tap brings it back for 4 s.
 let calmTimer=0;const calm=on=>dialog.classList.toggle('hud-calm',on),rest=()=>{clearTimeout(calmTimer);calmTimer=setTimeout(()=>ticket&&!held&&calm(true),4000);};
 let swallow=false;dialog.addEventListener('pointerdown',event=>{if(ticket&&!held){swallow=dialog.classList.contains('hud-calm')&&!event.target.closest?.('[data-breath-exit],[data-meditation-close]');calm(false);rest();}},true);
 dialog.addEventListener('click',event=>{if(swallow){swallow=false;event.stopPropagation();event.preventDefault();}},true); // the first tap on a faded panel only reveals it
 seated.querySelector('button').onclick=()=>{held=false;if(ticket)calm(true);seated.classList.add('fading');setTimeout(()=>{seated.hidden=true;seated.classList.remove('fading');},600);};
 controls.querySelector('.breath-actions').append(pause);
 const $=selector=>controls.querySelector(selector);
 const modesEl=$('[data-breath-modes]'),runEl=$('[data-breath-run]'),phaseEl=$('[data-phase-label]'),bar=$('progress'),stopCircle=scene.querySelector?.('[data-breathing-stop], [data-breath-exit]'),retry=$('[data-retry]'),skipHold=$('[data-skip-hold]'),stanceLink=$('[data-stance-link]'),statusEl=$('[data-status]'),countEl=scene.querySelector?.('[data-breath-count]'),sessionClock=scene.querySelector?.('[data-session-clock]'),directionEl=scene.querySelector?.('[data-breath-direction]'),cueEl=scene.querySelector?.('[data-breath-cue]'),settleEl=scene.querySelector?.('[data-settle-countdown]');
 // Both exercises and the decorative pose selector share a compact, reachable control strip.
 const speech=scene.querySelector?.('.meditation-speech'),reducedMotion=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
 let clock=new BreathingSession(),ticket=null,saving=false,finished=false,awaitingRetry=false,run=0,script=null,caption='',duration=BREATHING_MS,totalBreaths=0,held=false,completionDay=null;
 function renderPhase(ms){
  const p=phaseAt(script,ms);runEl.dataset.phase=p.key;skipHold.hidden=!['optional-hold','recovery-hold'].includes(p.key);
  phaseEl.textContent=({settle:'Settle gently',breathe:p.breath==='in'?'Breathe in':'Breathe out',transition:'Easy exhale','optional-hold':'Optional pause',recovery:'Easy inhale','recovery-hold':'Optional recovery',rest:'Breathe normally'})[p.key]||p.label;
  stanceLink.hidden=!p.stanceId;stanceLink.dataset.stance=p.stanceId||'';
  // Only on change, so a character-tap line stays until the next phase and the live region is not re-announced.
  let next=p.dialogue||captionFor(p,reducedMotion?.matches);
  if(p.key==='breathe'&&p.pace){const elapsed=p.ms-p.remainingMs,cycle=p.pace.inhaleMs+p.pace.exhaleMs,index=Math.floor(elapsed/cycle);next=GENTLE_DIALOGUE[1+Math.floor(index/6)%6];}
  if(speech&&next!==caption){caption=next;bubble(speech,next);}
  // R20: the in/out cue is the one rotating line that never fades (plain text swap, no animation); every other line is a fading bubble.
  if(cueEl){const cue=p.breath?(reducedMotion?.matches?IDLE_CAPTION:p.breath==='in'?'Breathe in':'Breathe out'):'';cueEl.hidden=!cue;if(cueEl.textContent!==cue)cueEl.textContent=cue;cueEl.dataset.breath=p.breath||'';}
  // R20: the settle phase is a visible countdown (whole seconds left, down to 0) before the first breath.
  if(settleEl){settleEl.hidden=p.key!=='settle';const left=String(Math.max(0,Math.floor((p.remainingMs||0)/1000)));if(p.key==='settle'&&settleEl.lastElementChild?.textContent!==left)settleEl.lastElementChild.textContent=left;}
  if(countEl){let remaining=p.remainingMs||0,progress=.5,value='\u2014',direction=p.key==='settle'?'READY':'REST';if(['settle','rest'].includes(p.key)){const cycle=GUIDED_ROUND_TIMING.inhaleMs+GUIDED_ROUND_TIMING.exhaleMs,elapsed=Math.max(0,p.ms-p.remainingMs),offset=elapsed%cycle,inhale=offset<GUIDED_ROUND_TIMING.inhaleMs;progress=inhale?offset/GUIDED_ROUND_TIMING.inhaleMs:1-(offset-GUIDED_ROUND_TIMING.inhaleMs)/GUIDED_ROUND_TIMING.exhaleMs;direction=inhale?'IN':'OUT';}else if(p.pace&&p.breath){const into=p.ms-p.remainingMs,cycle=p.pace.inhaleMs+p.pace.exhaleMs,offset=into%cycle,segment=p.breath==='in'?offset:offset-p.pace.inhaleMs;remaining=p.breath==='in'?p.pace.inhaleMs-offset:cycle-offset;progress=p.breath==='in'?offset/p.pace.inhaleMs:1-segment/p.pace.exhaleMs;value=String(Math.min(BREATHING_MODES['wim-hof'].breathsPerRound,Math.floor(into/cycle)+1));direction=p.breath==='in'?'IN':'OUT';}else if(p.key==='transition'){progress=1-(p.ms-p.remainingMs)/p.ms;direction='OUT';}else if(p.key==='optional-hold'){progress=0;value=String(Math.max(0,Math.ceil(remaining/1000)));direction='HOLD?';}else if(p.key==='recovery'){progress=(p.ms-p.remainingMs)/p.ms;direction='IN';}else if(p.key==='recovery-hold'){progress=1;value=String(Math.max(0,Math.ceil(remaining/1000)));direction='HOLD?';}else if(p.key==='complete'){value='30';direction='DONE';}countEl.textContent=value;countEl.dataset.breath=p.breath||'rest';countEl.parentElement?.style.setProperty('--breath-progress',String(Math.max(0,Math.min(1,progress))));countEl.parentElement?.style.setProperty('--breath-scale',String(.70+Math.max(0,Math.min(1,progress))*.42));if(directionEl)directionEl.textContent=direction;}
 }
  // R18 A3: grey veil over the whole stage with a hole centred on the character. R20: the hole pulses with the breath --
 // out to a growing peak on each exhale, back to the character on each inhale (pulseRadius), redrawn every tick.
 // Reduced motion keeps the R18 steady growth (revealRadius) instead of a fast pulse.
 function reveal(ms){
  const stage=scene.querySelector('.meditation-stage'),veil=stage?.querySelector('.meditation-grey'),who=scene.querySelector('.meditation-character');if(!veil||!who||!script)return;
  const s=stage.getBoundingClientRect(),c=who.getBoundingClientRect(),x=c.left+c.width/2-s.left,y=c.top+c.height/2-s.top,maxR=Math.hypot(Math.max(x,s.width-x),Math.max(y,s.height-y)),done=breathsDone(script,ms),{breath,progress}=breathPhaseProgress(script,ms);
  veil.style.setProperty('--cx',x+'px');veil.style.setProperty('--cy',y+'px');veil.style.setProperty('--reveal-r',(reducedMotion?.matches?revealRadius(done,totalBreaths,maxR):pulseRadius(done,totalBreaths,breath,progress,maxR,Math.min(c.width,c.height)/2))+'px');
  dialog.classList.toggle('meditation-colour',totalBreaths>0&&done>=totalBreaths);
 }
 function reset({keepPose=false}={}){
  run++;clock=new BreathingSession();duration=BREATHING_MS;ticket=null;completionDay=null;saving=false;finished=false;awaitingRetry=false;script=null;
  if(caption&&speech)bubble(speech,IDLE_CAPTION);caption='';totalBreaths=0;held=false;scene.querySelector?.('.meditation-grey')?.style.setProperty('--reveal-r','0px');if(cueEl)cueEl.hidden=true;if(settleEl)settleEl.hidden=true;clearTimeout(calmTimer);dialog.classList.remove('hud-calm');
  bar.max=BREATHING_MS;bar.value=0;sessionClock&&(sessionClock.textContent='3:30');countEl&&(countEl.textContent='—');directionEl&&(directionEl.textContent='READY');pause.disabled=true;pause.hidden=true;pause.textContent='Pause';dialog.classList.remove('breathing-paused');
  modesEl.hidden=false;runEl.hidden=true;seated.hidden=true;retry.hidden=true;skipHold.hidden=true;stanceLink.hidden=true;runEl.dataset.phase='';
  if(stopCircle)stopCircle.hidden=true;phaseEl.textContent='';statusEl.textContent=DEFAULT_STATUS;dialog.classList.remove('meditation-colour');
 }
 async function finish(){
  if(saving||finished||!ticket||!clock.complete)return;
  saving=true;awaitingRetry=false;retry.hidden=true;pause.disabled=true;statusEl.textContent='Saving your breathing bonus…';const current=run;completionDay??=localDay();
  try{
   const binding=ticket;await actions.completeBreathing(binding,clock.elapsed);
   if(current!==run||!transitions.isCurrent(binding.transitionTicket))return;
   recordDailyActivity('meditation',{id:binding.id,day:completionDay},{account:{user:{id:binding.ownerId},dataEpoch:binding.dataEpoch}});
   await onComplete?.();
   if(current!==run||!transitions.isCurrent(binding.transitionTicket))return;
   finished=true;statusEl.textContent='Meditation complete · ×2 workout XP today';sessionClock&&(sessionClock.textContent='0:00');countEl&&(countEl.textContent='30');directionEl&&(directionEl.textContent='DONE');phaseEl.textContent='Complete';runEl.dataset.phase='complete';stanceLink.hidden=true;pause.hidden=true;if(stopCircle)stopCircle.hidden=false;onSessionComplete?.();
  }catch(error){if(current===run){statusEl.textContent=error.message;retry.hidden=false;awaitingRetry=true;}}
  finally{if(current===run)saving=false;}
 }
 async function startSession(id){
  reset({keepPose:true});duration=id==='wim-hof'?GUIDED_ROUND_MS:BREATHING_MS;bar.max=duration;script=buildScript(id);held=!!BREATHING_MODES[id]?.seatedOnly;seated.hidden=!held;seated.classList.remove('fading');totalBreaths=countBreaths(script);reveal(0);if(held)seated.querySelector('button').focus();modesEl.hidden=true;runEl.hidden=false;statusEl.textContent='Starting…';sessionClock&&(sessionClock.textContent=formatTime(duration));renderPhase(0);void import('./modules/vault/vault-store.mjs').then(m=>m.bump('breath-mode',1,{key:id})).catch(()=>{});
  const current=run;
  try{
   const value=await actions.startBreathing(getAccount?.());
   if(current!==run||!transitions.isCurrent(value.transitionTicket))return;
   ticket=value;clock=new BreathingSession(duration);pause.disabled=false;pause.hidden=false;if(stopCircle)stopCircle.hidden=false;statusEl.textContent=formatTime(duration)+' remaining';if(!held)calm(true);
  }catch(error){if(current===run){reset();statusEl.textContent=error.message;}}
 }
 modesEl.querySelector('[data-begin]').onclick=()=>startSession('wim-hof');
 
 // Abandon the ticket before the exit animation. This path never calls completion/save.
 const stopNow=()=>{const early=!!ticket&&!finished&&!clock.complete,transitionTicket=ticket?.transitionTicket;reset();if(early)void onEarlyExit?.({isCurrent:()=>!transitionTicket||transitions.isCurrent(transitionTicket)});else if(dialog.open)dialog.close();};
 if(stopCircle)stopCircle.onclick=stopNow;
 skipHold.onclick=()=>{if(!script||!['optional-hold','recovery-hold'].includes(runEl.dataset.phase))return;const index=script.findIndex(p=>p.key===runEl.dataset.phase);script=script.map((p,i)=>i>=index?{key:'rest',label:'Breathe normally until the timer ends',ms:p.ms}:p);renderPhase(clock.elapsed);};
 retry.onclick=()=>finish();
 // D25: existing core/balance hold detection stays reachable -- leave breathing for the movement
 // library's own camera hold for this stance instead of re-implementing pose detection here.
 stanceLink.onclick=()=>{const id=stanceLink.dataset.stance;dialog.close();document.getElementById('openLibrary')?.click();document.querySelector(`[data-movement="${id}"]`)?.click();};
 const timer=setInterval(()=>{
  const active=!!ticket&&dialog.open&&!scene.hidden&&!document.hidden&&!dialog.classList.contains('breathing-paused')&&!held&&!dialog.classList.contains('snorting')&&!dialog.classList.contains('blacking-out');
  clock.sample(performance.now(),active);bar.value=clock.elapsed;
  if(ticket&&!finished&&!saving&&!clock.complete){const left=Math.ceil((duration-clock.elapsed)/1000);statusEl.textContent=formatTime(duration-clock.elapsed)+' remaining'+(active?'':' · Paused');sessionClock&&(sessionClock.textContent=formatTime(duration-clock.elapsed));renderPhase(clock.elapsed);reveal(clock.elapsed);}
  if(clock.complete&&!finished&&!saving&&!awaitingRetry)void finish();
 },50);
 const unsubscribe=transitions.subscribe(reset);
 dialog.addEventListener('close',reset);window.addEventListener('pagehide',event=>{reset();if(!event.persisted){unsubscribe();clearInterval(timer);}});
 reset();
}
function formatTime(ms){const seconds=Math.max(0,Math.ceil(ms/1000));return `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;}
