import {exerciseFamily,nextChallenge,routeDay,ROUTE_LINES} from './workout-route.mjs';

export function mountWorkoutRoute({mode,busy,pending,onNext}){
 const card=document.createElement('section');card.className='workout-route';card.setAttribute('aria-label','Your exercise route');
 card.innerHTML='<p data-next role="status">Loading…</p><button type="button" data-follow>Next level ›</button>';
 document.querySelector('.difficulty-control .slider-scale').after(card);
 const levels=document.createElement('details');levels.className='workout-route';levels.innerHTML='<summary>Easy-to-hard route</summary><ol data-path></ol>';
 document.querySelector('#movementCards').before(levels);
 const rest=document.createElement('section');rest.className='workout-route rest-challenge';rest.hidden=true;rest.setAttribute('aria-label','Next round challenge');rest.innerHTML='<p data-line></p><strong data-next></strong><p data-rounds></p>';
 document.querySelector('.rest-receipt').after(rest);
 function current(){const route=window.coachProgress?.exerciseRoute;return route&&route.day===routeDay(Date.now(),route.timezone)?route:null;}
 function suggestion(){return pending()?null:nextChallenge(current(),mode());}
 function render(){
  const route=current(),group=route?.groups?.[exerciseFamily(mode())],next=suggestion(),waiting=pending();
  const roundsText=group?`${group.name} · round ${group.today} of ${route.limit}${group.mastered?' · top level':''}${next?.changedFamily?' · next: '+route.groups[next.group].name:''}`:'';
  card.querySelector('[data-next]').textContent=waiting?'Saving…':next?`${next.name} · ${next.goal} ${next.unit}${roundsText?' · '+roundsText:''}`:group?`Done for today.${roundsText?' · '+roundsText:''}`:'Loading…';
  const button=card.querySelector('[data-follow]');button.disabled=busy()||!next;button.textContent=next?.changedFamily?'Next focus ›':group?.mastered?'One more ›':'Next level ›';
  levels.querySelector('[data-path]').replaceChildren(...(group?.steps||[]).map(step=>{const li=document.createElement('li');li.textContent=`${step.complete?'✓ ':''}${step.level}. ${step.name}`;if(step.mode===next?.mode)li.setAttribute('aria-current','step');return li;}));
  if(!rest.hidden){rest.querySelector('[data-line]').textContent=waiting?'Reconnect to save this round.':next?.line||ROUTE_LINES.limit;rest.querySelector('[data-next]').textContent=next?`${next.name} · ${next.goal} ${next.unit}`:'Finished for today';rest.querySelector('[data-rounds]').textContent=next?`Round ${next.round} of ${route.limit} · Level ${next.level} of ${next.maxLevel}`:'';}
 }
 card.querySelector('[data-follow]').onclick=()=>{const next=suggestion();if(next&&!busy())onNext(next);};
 window.addEventListener('myr5:account-progress',render);window.addEventListener('myr5:account-cleared',render);window.addEventListener('myr5:movement-configured',render);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)render();});
 const refreshDay=setInterval(()=>{if(!document.hidden&&window.coachProgress?.exerciseRoute&&!current())void window.coachAccount?.refresh();},60000);window.addEventListener('pagehide',()=>clearInterval(refreshDay));
 render();return {render,suggestion,showResult(){rest.hidden=false;render();},hideResult(){rest.hidden=true;},canStart(id){return !pending()&&(current()?.groups?.[exerciseFamily(id)]?.remaining??1)>0;}};
}
