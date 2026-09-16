import {renderPersonalTracker,updateTrackerProgress} from './personal-tracker.mjs';
import {officeEncouragement} from './office-domain.mjs?v=office-short-v1';
import {EXERCISES} from './onboarding-domain.mjs?v=quick-install-v1';
import {setupAllowed} from './install-context.mjs';
import {signInPath} from './auth-paths.mjs';
import {readIncomingCoach} from './pending-coach.mjs';
import {nextChallenge} from './workout-route.mjs';
const gate=document.createElement('dialog');gate.id='coachSetupGate';gate.setAttribute('aria-label','Coach activation');gate.addEventListener('cancel',e=>e.preventDefault());gate.style.cssText='position:fixed;inset:0;margin:0;width:100vw;height:100dvh;max-width:none;max-height:none;border:0;z-index:2147483646;background:#17111ef5;display:grid;place-content:center;padding:28px;color:#f5e4ba;font:18px/1.6 Arial;text-align:center';
gate.innerHTML='<h1>Connecting…</h1><p></p><a href="/pose.html?reconnect=1" style="color:#b8e9cf">Reload Coach</a>';document.body.append(gate);gate.showModal();
let applied='',restored=false;
window.coachPersonalCue=personalCue;
window.addEventListener('myr5:account-progress',event=>updateTrackerProgress(event.detail));
const get=k=>{try{return localStorage.getItem(k);}catch{return null;}};
function showIncomingCoach(){if(!readIncomingCoach())return;gate.querySelector('h1').textContent='Coach ready';gate.querySelector('p').textContent='Saved setup loaded.';gate.querySelector('a').textContent='Continue with my coach';gate.querySelector('a').href='/onboarding.html?from=install';}
function beginSetup(){return setupAllowed()?'/onboarding.html?from=install':'/install.html';}
export function clearCoachAccount(){document.documentElement.dataset.publicState='locked';window.coachProgress=null;window.dispatchEvent(new Event('myr5:account-cleared'));window.coachPlan=null;restored=false;applied='';gate.hidden=false;gate.style.display='grid';if(!gate.open)gate.showModal();gate.querySelector('h1').textContent='Set up Coach';gate.querySelector('p').textContent='Choose games or quick setup.';gate.querySelector('a').href='/onboarding.html';gate.querySelector('a').textContent=setupAllowed()?'Sign in to Coach':'Open installed Coach';gate.querySelector('a').href=setupAllowed()?signInPath('/onboarding.html'):beginSetup();gate.querySelector('p').textContent='Sign in to reconnect your saved coach.';}
export function applyCoachAccount(account){
 window.coachEntitlements=account.entitlements;window.myr5AuthenticatedAccount=account;window.myr5VerifiedOptionalAccess=account.entitlements?.coachArmy?.status==='completed'&&Number.isSafeInteger(account.entitlements.coachArmy.completedAt);document.documentElement.dataset.publicState=window.myr5VerifiedOptionalAccess?'unlocked':'locked';window.dispatchEvent(new CustomEvent('myr5:account-ready',{detail:account}));
 window.coachProgress=account.progress;
 const o=account.onboarding;
 if(!o){gate.hidden=false;gate.style.display='grid';if(!gate.open)gate.showModal();gate.querySelector('h1').textContent='Set up Coach';gate.querySelector('p').textContent='Choose games or quick setup.';gate.querySelector('a').href='/onboarding.html';gate.querySelector('a').textContent='Continue coach setup';gate.querySelector('a').href=beginSetup();if(setupAllowed())showIncomingCoach();return;}
 gate.close();gate.hidden=true;gate.style.display='none';window.coachPlan=o;
 if(!restored){const owner=get('myr5-coach-owner'),baseline=get('myr5-synced-appearance'),keys=['myr5-recipe-v1','myr5-motion-v1','mominc-avatar-v1','myr5-pod-power-v1','handborne-recipe-v4','mbs-dj-identity-v1'];const current=JSON.stringify(Object.fromEntries(keys.map(k=>[k,get(k)]).filter(([,v])=>v!=null)));const dirty=owner===account.user.id&&baseline&&baseline!==current;
  if(!dirty){for(const key of keys){const v=account.profile[key];if(v!=null){localStorage.setItem(key,v);window.dispatchEvent(new StorageEvent('storage',{key,newValue:v}));}else if(owner&&owner!==account.user.id)localStorage.removeItem(key);}window.dispatchEvent(new Event('mominc-avatar-change'));localStorage.setItem('myr5-synced-appearance',JSON.stringify(Object.fromEntries(keys.map(k=>[k,get(k)]).filter(([,v])=>v!=null))));}localStorage.setItem('myr5-coach-owner',account.user.id);restored=true;
 }
 let plate=document.getElementById('dailyCoachPlan');if(!plate){plate=document.createElement('section');plate.id='dailyCoachPlan';document.querySelector('.crew-footer').before(plate);}
 const p=o.data.profile,t=o.targets;renderPersonalTracker(plate,p,t,EXERCISES,account.progress);
 let nutrition=document.getElementById('coachNutritionTargets');if(!nutrition){nutrition=document.createElement('p');nutrition.id='coachNutritionTargets';document.getElementById('mealForm').before(nutrition);}nutrition.textContent=t.proteinGrams?`Today: ${t.proteinGrams} g protein · ${t.waterOz} oz water`:'';
 const signature=o.revision+':'+t.date;if(applied!==signature){const first=!applied;applied=signature;const movement=document.getElementById('movement');if(first&&movement&&p.exercises.includes(p.exercises[0])){movement.value=nextChallenge(account.progress.exerciseRoute,p.exercises[0])?.mode||p.exercises[0];movement.dispatchEvent(new CustomEvent('change',{bubbles:true,detail:{automatic:true}}));}window.dispatchEvent(new Event('myr5:coach-plan'));const reminder=document.getElementById('reminderForm');if(first&&reminder){reminder.elements.time.value=p.trainingTime;reminder.elements.timezone.value=p.timezone;window.dispatchEvent(new CustomEvent('myr5:reminder-defaults',{detail:{tone:p.reminderTone,days:Number(p.reminderDays)}}));}}
}
export function personalCue(text,key){const p=window.coachPlan?.data?.profile;if(!p)return text;if(p.guidance==='Quiet'&&['encouragement','time'].includes(key)&&!/^\d/.test(text))return null;if(key!=='encouragement')return text;
 const lines={supportive:'You are making progress. One comfortable movement at a time.',direct:'Stay with the next movement. Keep control.',analytical:'Keep your movement consistent. Notice the control in each repetition.',playful:'One tiny quest at a time. You have this.',calm:'Breathe. Move at your own pace.',mom:'MOM Inc. has recorded your effort. Please proceed comfortably.'};
 const tips={'Controlled reps':'Move with control.','Gradual progression':'One small step today.','Technique first':'Make the next movement smooth.'};let result=(text.startsWith('Halfway')?'Halfway. ':'')+(officeEncouragement(window.coachPlan.data,window.coachPlan.targets.day)||lines[p.coach]);if(p.guidance==='Detailed')result+=' '+tips[p.trainingStyle];
 // Respect explicitly listed words/phrases the visitor does not want to hear.
 const blocked=window.coachPlan.data.answers?.djscratch?.q3||'';if(blocked.split(/[,;\n]/).some(s=>s.trim().length>=3&&!/^none\.?$/i.test(s.trim())&&result.toLowerCase().includes(s.trim().toLowerCase())))return null;return result;
}
