import {BreathingSession,BREATHING_MS} from './combat.mjs';

export function mountBreathing({dialog,scene,pause,api,onComplete}){
 const controls=document.createElement('div');controls.className='breathing-session';
 controls.innerHTML='<button type="button">Start 3-minute breathing</button><progress max="180000" value="0" aria-label="Breathing session progress"></progress><p role="status">Complete a session for today’s ×100 damage.</p>';
 scene.append(controls);
 const button=controls.querySelector('button'),bar=controls.querySelector('progress'),status=controls.querySelector('p');
 let clock=new BreathingSession(),ticket=null,saving=false,finished=false,run=0;
 pause.disabled=true;
 function reset(){run++;clock=new BreathingSession();ticket=null;saving=false;finished=false;bar.value=0;button.disabled=false;button.textContent='Start 3-minute breathing';pause.disabled=true;status.textContent='Complete a session for today’s ×100 damage.';}
 async function finish(){
  if(saving||finished||!ticket||!clock.complete)return;saving=true;button.disabled=true;pause.disabled=true;status.textContent='Saving your breathing bonus…';const current=run;
  try{await api('/api/breathing/complete','POST',{id:ticket.id,activeMs:clock.elapsed});await onComplete?.();if(current!==run)return;finished=true;status.textContent='Breathing complete · ×100 damage today';button.textContent='Completed';}
  catch(error){if(current===run){status.textContent=error.message;button.disabled=false;button.textContent='Save breathing bonus';}}
  finally{if(current===run)saving=false;}
 }
 button.onclick=async()=>{
  if(clock.complete)return finish();button.disabled=true;const current=run;
  try{const value=await api('/api/breathing/start','POST',{});if(current!==run)return;ticket=value;clock=new BreathingSession();dialog.classList.remove('breathing-paused');pause.textContent='Pause';pause.disabled=false;button.textContent='Breathing…';status.textContent='3:00 remaining';}
  catch(error){if(current===run){button.disabled=false;status.textContent=error.message;}}
 };
 const timer=setInterval(()=>{
  const active=!!ticket&&dialog.open&&!scene.hidden&&!document.hidden&&!dialog.classList.contains('breathing-paused')&&!dialog.classList.contains('snorting')&&!dialog.classList.contains('blacking-out');
  clock.sample(performance.now(),active);bar.value=clock.elapsed;
  if(ticket&&!finished&&!saving&&!clock.complete){const left=Math.ceil((BREATHING_MS-clock.elapsed)/1000);status.textContent=`${Math.floor(left/60)}:${String(left%60).padStart(2,'0')} remaining`+(active?'':' · Paused');}
  if(clock.complete&&button.textContent!=='Save breathing bonus')void finish();
 },250);
 dialog.addEventListener('close',reset);window.addEventListener('pagehide',()=>{clearInterval(timer);reset();},{once:true});
}
