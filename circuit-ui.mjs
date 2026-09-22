// Daily-circuit display (VISUAL-CHANGES-HANDOFF.md §9): a visible meter, outside camera-only
// mode, that advances after every step. Mirrors workout-route-ui.mjs's structure/anchors so it
// sits alongside the existing 10-family ladder without touching it.
import {CIRCUIT_STEPS} from './circuit.mjs';
const utcDay=now=>Math.floor(now/86400000);
const LABEL={pushups:'Push-ups',squats:'Squats',situps:'Sit-ups',meditation:'Meditation',food:'Food photo'};
// Exact `default` lines from plan/muse/voice-lines.csv (one variant per step -- only one voice
// style exists today). Food gets no line (D9/D15: "Food photo gets no voice line").
const NEXT_LINE={pushups:'Next up: pushups. Chest day energy.',squats:'Next: squats. Legs, assemble.',situps:'Situps next. Crunch time, literally.',meditation:'Next: meditation. Sit. Breathe. Done.'};
const CIRCUIT_DONE_LINE='Circuit done. Rest, champion.';

export function mountCircuitUI({voice,onNext,busy,pending,cached}){
 const card=document.createElement('section');card.className='daily-circuit';card.setAttribute('aria-label','Your daily circuit');
 card.innerHTML='<small>DAILY CIRCUIT</small><meter min="0" max="5" value="0" aria-label="Circuit steps completed today"></meter><p data-circuit-status role="status">Connecting your daily circuit…</p><ol data-circuit-steps></ol><button type="button" data-circuit-next hidden>Start next step →</button>';
 document.querySelector('.difficulty-control').after(card);
 const rest=document.createElement('section');rest.className='daily-circuit rest-circuit';rest.hidden=true;rest.setAttribute('aria-label','Daily circuit progress');
 rest.innerHTML='<meter min="0" max="5" value="0" aria-label="Circuit steps completed today"></meter><p data-circuit-status role="status"></p>';
 document.querySelector('.rest-receipt').after(rest);
 let announced=null; // {day, doneCount} -- baseline so reopening the app never re-speaks history.
 function data(){
  const today=utcDay(Date.now());
  const fresh=window.coachProgress?.circuit;if(fresh&&fresh.day===today)return fresh;
  // No fresh server payload yet (e.g. app just reopened) -- fall back to the last-synced
  // snapshot cached in localStorage so a same-day circuit-in-progress survives close/reopen.
  const stale=cached?.();return stale&&stale.day===today?stale:null;
 }
 function nextStep(today){return CIRCUIT_STEPS.find(step=>!today.stepDone[step.key])||null;}
 // The meter tracks the fixed 5-step CIRCUIT checklist (this card's own job). today.stepsToday
 // is a different D15 pass-track count (up to 3 styles + food + meditation, for battle-pass
 // leveling) and can be lower than the checklist count -- e.g. the sit-ups stand-in exercise
 // completes a circuit step but is not a "chosen style", so it earns no pass-track step.
 function doneCount(today){return CIRCUIT_STEPS.filter(step=>today.stepDone[step.key]).length;}
 function render(){
  const p=data(),today=p?.today;
  for(const meter of [card.querySelector('meter'),rest.querySelector('meter')])meter.value=today?doneCount(today):0;
  const status=today?`${doneCount(today)} of ${CIRCUIT_STEPS.length} circuit steps today`+(nextStep(today)?` · Next: ${LABEL[nextStep(today).key]}`:' · Circuit complete today'):'Connecting your daily circuit…';
  card.querySelector('[data-circuit-status]').textContent=status;rest.querySelector('[data-circuit-status]').textContent=status;
  card.querySelector('[data-circuit-steps]').replaceChildren(...CIRCUIT_STEPS.map(step=>{const li=document.createElement('li');li.textContent=`${today?.stepDone?.[step.key]?'✓ ':''}${LABEL[step.key]}`;if(today&&!today.stepDone[step.key]&&step===nextStep(today))li.setAttribute('aria-current','step');return li;}));
  const button=card.querySelector('[data-circuit-next]'),next=today?nextStep(today):null;
  button.hidden=!next;
  if(next){button.textContent='Start '+LABEL[next.key]+' →';button.disabled=busy()||pending();}
 }
 card.querySelector('[data-circuit-next]').onclick=()=>{
  const p=data(),today=p?.today,next=today?nextStep(today):null;if(!next||busy()||pending())return;
  if(next.key==='meditation')document.querySelector('.meditation-entry')?.click();
  else if(next.key==='food')document.querySelector('[data-panel="meals"]')?.click();
  else onNext(next);
 };
 function speakTransition(){
  const p=data();if(!p)return;
  const count=doneCount(p.today);
  if(!announced||announced.day!==p.day){announced={day:p.day,doneCount:count};return;} // new day/session: don't replay history
  if(count<=announced.doneCount)return;
  announced.doneCount=count;
  const next=nextStep(p.today);
  if(next&&next.voice)voice.say(NEXT_LINE[next.key],{key:'circuit',interrupt:true});
  else if(!next)voice.say(CIRCUIT_DONE_LINE,{key:'circuit',interrupt:true});
 }
 window.addEventListener('myr5:account-progress',()=>{speakTransition();render();});
 window.addEventListener('myr5:account-cleared',render);
 window.addEventListener('myr5:movement-configured',render);
 render();
 return {render};
}
