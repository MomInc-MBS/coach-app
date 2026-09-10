import {exerciseFamily,nextChallenge,routeDay,ROUTE_LINES} from './workout-route.mjs';

export function mountWorkoutRoute({mode,busy,pending,onNext}){
 const card=document.createElement('section');card.className='workout-route';card.setAttribute('aria-label','Your exercise route');
 card.innerHTML='<small>YOUR NEXT CHALLENGE</small><p data-next role="status">Connecting your exercise route…</p><p data-rounds></p><button type="button" data-follow>Preview next level →</button><details><summary>Easy-to-hard route</summary><ol data-path></ol><p>Try the next level when ready. You can choose an easier variation or stop.</p></details>';
 document.querySelector('.difficulty-control').after(card);
 const rest=document.createElement('section');rest.className='workout-route rest-challenge';rest.hidden=true;rest.setAttribute('aria-label','Next round challenge');rest.innerHTML='<p data-line></p><strong data-next></strong><p data-rounds></p>';
 document.querySelector('.rest-receipt').after(rest);
 function current(){const route=window.coachProgress?.exerciseRoute;return route&&route.day===routeDay(Date.now(),route.timezone)?route:null;}
 function suggestion(){return pending()?null:nextChallenge(current(),mode());}
 function render(){
  const route=current(),group=route?.groups?.[exerciseFamily(mode())],next=suggestion(),waiting=pending();
  card.querySelector('[data-next]').textContent=waiting?'Saving this round before the next challenge…':next?`${next.name} · ${next.goal} ${next.unit}`:group?'Route complete for today. Come back tomorrow.':'Connecting your exercise route…';
  card.querySelector('[data-rounds]').textContent=group?`${group.name}: ${group.today} of ${route.limit} rounds today${group.mastered?' · Top difficulty reached':''}${next?.changedFamily?' · Next: '+route.groups[next.group].name:''}`:'';
  const button=card.querySelector('[data-follow]');button.disabled=busy()||!next;button.textContent=next?.changedFamily?'Preview next exercise family →':group?.mastered?'Preview next round +1 →':'Preview next level →';
  const path=card.querySelector('[data-path]');path.replaceChildren(...(group?.steps||[]).map(step=>{const li=document.createElement('li');li.textContent=`${step.complete?'✓ ':''}${step.level}. ${step.name}`;if(step.mode===next?.mode)li.setAttribute('aria-current','step');return li;}));
  if(!rest.hidden){rest.querySelector('[data-line]').textContent=waiting?'Round complete. Reconnect to save it and see your next challenge.':next?.line||ROUTE_LINES.limit;rest.querySelector('[data-next]').textContent=next?`${next.name} · ${next.goal} ${next.unit}`:'Finished for today';rest.querySelector('[data-rounds]').textContent=next?`Round ${next.round} of ${route.limit} · Difficulty ${next.level} of ${next.maxLevel}`:'';}
 }
 card.querySelector('[data-follow]').onclick=()=>{const next=suggestion();if(next&&!busy())onNext(next);};
 window.addEventListener('myr5:account-progress',render);window.addEventListener('myr5:account-cleared',render);window.addEventListener('myr5:movement-configured',render);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)render();});
 const refreshDay=setInterval(()=>{if(!document.hidden&&window.coachProgress?.exerciseRoute&&!current())void window.coachAccount?.refresh();},60000);window.addEventListener('pagehide',()=>clearInterval(refreshDay));
 render();return {render,suggestion,showResult(){rest.hidden=false;render();},hideResult(){rest.hidden=true;},canStart(id){return !pending()&&(current()?.groups?.[exerciseFamily(id)]?.remaining??1)>0;}};
}
