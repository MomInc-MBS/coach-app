import {EXERCISES,GROUP_EXERCISES} from './exercise-library.mjs';
import {workoutEligibility,readPerformanceProgress} from './performance-progress.mjs';
import {workoutLevel,workoutKind} from './workout-levels.mjs';
import {DIFFICULTIES} from './progression-rules.mjs';
export function nextPerformanceChallenge(mode,options={}){
 const current=EXERCISES[mode];if(!current)return null;
 const level=workoutLevel(mode),choices=GROUP_EXERCISES[current.group].filter(e=>workoutKind(e.id)===level.kind),state=readPerformanceProgress(options);
 const cleared=Object.values(state.sessions).some(s=>{
  if(s.group!==current.group)return false;
  if(s.kind==='hold')return (s.perDifficultyContinuous?.[level.difficulty]??(s.difficulty===level.difficulty?s.continuous:0))>=300;
  return s.difficulty===level.difficulty&&(s.kind==='reps'?s.value>=15:s.kind==='sprint'?s.value>=5:s.value>=300);
 });
 const next=cleared?choices.find(e=>DIFFICULTIES.indexOf(workoutLevel(e.id).difficulty)>DIFFICULTIES.indexOf(level.difficulty))||current:current;
 const eligibility=workoutEligibility(next.id,options);if(!eligibility.allowed)return {allowed:false,reason:eligibility.reason};
 const info=workoutLevel(next.id);return {allowed:true,mode:next.id,name:next.name,goal:info.target,unit:info.unit,difficulty:info.label,line:info.unlock};
}
export function mountWorkoutRoute({mode,busy,pending,onNext}){
 const card=document.createElement('section');card.className='workout-route';card.setAttribute('aria-label','Your performance progression');
 card.innerHTML='<small>PERFORMANCE PROGRESSION</small><p data-next role="status"></p><p data-rounds></p><button type="button" data-follow>Preview exercise →</button><details><summary>Difficulty milestones</summary><ol data-path></ol><p>Choose any level when ready. Holds and working reps have separate targets. Cosmetic XP does not unlock exercises.</p></details>';
 document.querySelector('#podGoals .pod-goals-menu').append(card);
 const rest=document.createElement('section');rest.className='workout-route rest-challenge';rest.hidden=true;rest.setAttribute('aria-label','Next performance challenge');rest.innerHTML='<p data-line></p><strong data-next></strong><p data-rounds></p>';document.querySelector('.rest-receipt').after(rest);
 const suggestion=()=>pending()?null:nextPerformanceChallenge(mode());
 function render(){
  const next=suggestion(),level=workoutLevel(mode()),waiting=pending();
  card.querySelector('[data-next]').textContent=waiting?'Saving your performance…':next?.allowed?`${next.difficulty} · ${next.name}`:next?.reason||'Choose an exercise to see its milestones.';
  card.querySelector('[data-rounds]').textContent=level?level.unlock:'';
  const button=card.querySelector('[data-follow]');button.disabled=busy()||!next?.allowed;
  card.querySelector('[data-path]').replaceChildren(...DIFFICULTIES.map((d,i)=>{const li=document.createElement('li');li.textContent=`${d[0].toUpperCase()+d.slice(1)} · weapon tiers ${i*5+1}–${i*5+5}`;return li;}));
  if(!rest.hidden){rest.querySelector('[data-line]').textContent='Recover first. Tap the rest boss for daily pack rewards.';rest.querySelector('[data-next]').textContent=next?.allowed?`${next.difficulty} · ${next.name}`:next?.reason||'Performance saved';rest.querySelector('[data-rounds]').textContent=next?.allowed?next.line:'';}
 }
 card.querySelector('[data-follow]').onclick=()=>{const next=suggestion();if(next?.allowed&&!busy())onNext(next);};
 for(const event of ['myr5:account-progress','myr5:account-cleared','myr5:movement-configured','myr5:performance-progress'])window.addEventListener(event,render);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)render();});
 render();return {render,suggestion,showResult(){rest.hidden=false;render();},hideResult(){rest.hidden=true;},canStart(id){return !pending()&&workoutEligibility(id).allowed;}};
}
