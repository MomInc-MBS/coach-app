import {renderPersonalTracker,updateTrackerProgress} from './personal-tracker.mjs';
import {officeEncouragement} from './office-domain.mjs?v=office-short-v1';
import {EXERCISES} from './onboarding-domain.mjs?v=quick-install-v1';

import {readIncomingCoach} from './pending-coach.mjs';
const gate=document.createElement('section');gate.id='coachSetupGate';gate.className='coach-setup-notice';gate.setAttribute('aria-label','Coach account');gate.hidden=true;
gate.innerHTML='<p>Explore Coach. Set up your account to save workouts.</p><a href="/onboarding.html">Set up / sign in</a><button type="button" aria-label="Dismiss setup notice">Later</button>';document.querySelector('.deck-strip').after(gate);
let dismissed=false;
gate.querySelector('button').onclick=()=>{dismissed=true;gate.hidden=true;};
let applied='',restored=false;
window.coachPersonalCue=personalCue;
window.addEventListener('myr5:account-progress',event=>updateTrackerProgress(event.detail));
const get=k=>{try{return localStorage.getItem(k);}catch{return null;}};
function offerSetup(){
 gate.hidden=dismissed;gate.querySelector('p').textContent='Explore Coach. Set up your account to save workouts.';
 gate.querySelector('a').href='/onboarding.html';gate.querySelector('a').textContent='Set up / sign in';
 if(readIncomingCoach()){gate.querySelector('p').textContent='Your saved coach is ready.';gate.querySelector('a').textContent='Continue with my coach';}
}
export function clearCoachAccount(){window.coachPlan=null;restored=false;applied='';document.getElementById('dailyCoachPlan')?.remove();document.getElementById('coachNutritionTargets')?.remove();offerSetup();}
export function applyCoachAccount(account){
 const o=account.onboarding;
 if(!o){offerSetup();return;}
 gate.hidden=true;window.coachPlan=o;
 if(!restored){const owner=get('myr5-coach-owner'),baseline=get('myr5-synced-appearance'),keys=['myr5-recipe-v1','myr5-motion-v1','mominc-avatar-v1','myr5-pod-power-v1','handborne-recipe-v4','mbs-dj-identity-v1'];const current=JSON.stringify(Object.fromEntries(keys.map(k=>[k,get(k)]).filter(([,v])=>v!=null)));const dirty=owner===account.user.id&&baseline&&baseline!==current;
  if(!dirty){for(const key of keys){const v=account.profile[key];if(v!=null){localStorage.setItem(key,v);window.dispatchEvent(new StorageEvent('storage',{key,newValue:v}));}else if(owner&&owner!==account.user.id)localStorage.removeItem(key);}window.dispatchEvent(new Event('mominc-avatar-change'));localStorage.setItem('myr5-synced-appearance',JSON.stringify(Object.fromEntries(keys.map(k=>[k,get(k)]).filter(([,v])=>v!=null))));}localStorage.setItem('myr5-coach-owner',account.user.id);restored=true;
 }
 let plate=document.getElementById('dailyCoachPlan');if(!plate){plate=document.createElement('section');plate.id='dailyCoachPlan';document.querySelector('.crew-footer').before(plate);}
 const p=o.data.profile,t=o.targets;renderPersonalTracker(plate,p,t,EXERCISES,account.progress);
 let nutrition=document.getElementById('coachNutritionTargets');if(!nutrition){nutrition=document.createElement('p');nutrition.id='coachNutritionTargets';document.getElementById('mealForm').before(nutrition);}nutrition.textContent=t.proteinGrams?`Today: ${t.proteinGrams} g protein · ${t.waterOz} oz water`:'';
 const signature=o.revision+':'+t.date;if(applied!==signature){const first=!applied;applied=signature;const movement=document.getElementById('movement');if(first&&movement&&p.exercises.includes(p.exercises[0])){movement.value=p.exercises[0];movement.dispatchEvent(new CustomEvent('change',{bubbles:true,detail:{automatic:true}}));}window.dispatchEvent(new Event('myr5:coach-plan'));const reminder=document.getElementById('reminderForm');if(first&&reminder){reminder.elements.time.value=p.trainingTime;reminder.elements.timezone.value=p.timezone;window.dispatchEvent(new CustomEvent('myr5:reminder-defaults',{detail:{tone:p.reminderTone,days:Number(p.reminderDays)}}));}}
}
export function personalCue(text,key){const p=window.coachPlan?.data?.profile;if(!p)return text;if(p.guidance==='Quiet'&&['encouragement','time'].includes(key)&&!/^\d/.test(text))return null;if(key!=='encouragement')return text;
 const lines={supportive:'You are making progress. One comfortable movement at a time.',direct:'Stay with the next movement. Keep control.',analytical:'Keep your movement consistent. Notice the control in each repetition.',playful:'One tiny quest at a time. You have this.',calm:'Breathe. Move at your own pace.',mom:'MOM Inc. has recorded your effort. Please proceed comfortably.'};
 const tips={'Controlled reps':'Move with control.','Gradual progression':'One small step today.','Technique first':'Make the next movement smooth.'};let result=(text.startsWith('Halfway')?'Halfway. ':'')+(officeEncouragement(window.coachPlan.data,window.coachPlan.targets.day)||lines[p.coach]);if(p.guidance==='Detailed')result+=' '+tips[p.trainingStyle];
 // Respect explicitly listed words/phrases the visitor does not want to hear.
 const blocked=window.coachPlan.data.answers?.djscratch?.q3||'';if(blocked.split(/[,;\n]/).some(s=>s.trim().length>=3&&!/^none\.?$/i.test(s.trim())&&result.toLowerCase().includes(s.trim().toLowerCase())))return null;return result;
}
