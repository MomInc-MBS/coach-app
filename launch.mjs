import {VOICE_MANIFEST,VOICE_CACHE} from './robot-audio.mjs';
import {initAppUpdates} from './app-updates.mjs';
import {mountCoachHub} from './coach-hub.mjs';
import {authFetch,signOut} from './auth-client.mjs';

import {mountGalaReturn} from './gala-handoff.mjs';
import {mountMeditation} from './meditation.mjs';
import {applyCoachAccount,applyLocalCoach,clearCoachAccount} from './coach-profile.mjs';
import {openLocalCoach} from './local-coach-runtime.mjs';
import {mountLaunch} from './launch-shell.mjs?v=quick-install-v1';
import {mountScoreboard} from './scoreboard.mjs';
import {mountMealNutrition} from './meal-nutrition.mjs';
import {MACROS,MICROS,displayNutrient} from './nutrition.mjs';
import {mountLiveReminders} from './reminder-live.mjs';
import {notificationBinding} from './device-notifications.mjs';
import {mountMealScanner} from './meal-scanner.mjs';
import {mountReminderControls} from './reminder-controls.mjs';
import {CADENCE_LABELS} from './reminder-settings.mjs';
import {canEnterPublicRoute,coachArmyComplete} from './public-access.mjs';
mountLaunch();
mountCoachHub({api});
mountGalaReturn();
mountMeditation({api,onComplete:refresh});
mountMealScanner();
const mealNutrition=mountMealNutrition();
const reminderControls=mountReminderControls();
window.addEventListener('myr5:reminder-defaults',e=>reminderControls.load(e.detail.tone,e.detail.days));
let editingReminder=null;
const $=id=>document.getElementById(id),keys=['myr5-recipe-v1','myr5-motion-v1','mominc-avatar-v1','myr5-pod-power-v1','handborne-recipe-v4','mbs-dj-identity-v1'];
let account=null,revision=0,registration=null,installPrompt=null,reminderSnapshot=null,deviceBusy=false,armyComplete=false;
let localHistoryRepository=null;
window.addEventListener('myr5:account-progress',()=>{armyComplete=coachArmyComplete(account);});
let expansionMounted=false;
async function mountVerifiedExpansion(value){
 if(expansionMounted||!coachArmyComplete(value)||!window.myr5WorkoutOwner)return;
 expansionMounted=true;
 try{
  const {mountExpansion}=await import('./modules/new/expansion-entry.mjs');
  const result=mountExpansion({account:value,workoutOwner:window.myr5WorkoutOwner});
  if(!result)expansionMounted=false;
 }catch(error){expansionMounted=false;console.warn('Optional expansion unavailable',error);}
}
window.addEventListener('myr5:account-ready',event=>{void mountVerifiedExpansion(event.detail);});
window.addEventListener('myr5:workout-owner-ready',()=>{if(account)void mountVerifiedExpansion(account);});
document.addEventListener('click',event=>{
 const target=event.target.closest?.('a,button');if(!target)return;
 const raw=target.dataset.accessRoute||target.getAttribute('href');if(!raw||raw.startsWith('#')||raw.startsWith('http'))return;
 let url;try{url=new URL(raw,location.origin);}catch{return;}
 if(url.origin===location.origin&&!canEnterPublicRoute(url.pathname,armyComplete)){event.preventDefault();event.stopImmediatePropagation();const status=document.getElementById('identityStatus')||document.getElementById('status');if(status)status.textContent='Complete Coach setup to unlock this room.';}
},true);
const scoreboard=mountScoreboard({api,getAccount:()=>account});
const deviceBinding=notificationBinding(api);
const liveReminders=mountLiveReminders({refresh,read:reminders,getAccount:()=>account,deviceReady:()=>deviceBinding.ready(account?.user.id)});
const set=(id,text)=>$(id).textContent=text;
export async function api(path,method='GET',data){const response=await authFetch(path,{method,credentials:'same-origin',headers:data?{'Content-Type':'application/json'}:undefined,body:data?JSON.stringify(data):undefined,cache:'no-store'});if(response.redirected||!response.headers.get('content-type')?.includes('application/json'))throw Error('Sign in to Coach again to reconnect.');const value=await response.json();if(!response.ok)throw Object.assign(Error(value.error||'Please try again.'),{status:response.status,code:value.code});return value;}
const button=(text,fn)=>{const b=document.createElement('button');b.type='button';b.textContent=text;b.onclick=fn;return b;};
function download(data,name,type='application/json'){const a=document.createElement('a'),url=URL.createObjectURL(new Blob([data],{type}));a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}
function publishProgress(p){window.coachProgress=p;if(account)account.progress=p;window.dispatchEvent(new CustomEvent('myr5:account-progress',{detail:p}));set('accountLevel',`Level ${p.level}`);set('accountSets',`${p.completedSets} completed sets`);$('rewardList').replaceChildren();for(const [label,key,sets] of [['Ember','ember',4],['Arc','arc',16],['Frost','frost',36],['Shield break','shieldBreak',196]]){const row=document.createElement('li');row.className='unlock-row';row.dataset.unlocked=String(p.unlocks[key]);const name=document.createElement('span'),state=document.createElement('span');name.textContent=label;state.textContent=p.unlocks[key]?'✓ Unlocked':`${Math.max(0,sets-p.completedSets)} sets left`;row.append(name,state);$('rewardList').append(row);}}
async function refresh(){try{const value=await api('/api/account');account=value;revision=value.revision;applyCoachAccount(value);$('signIn').hidden=true;$('accountContent').hidden=false;$('accountSettingsContent').hidden=false;set('accountName',value.user.provider==='clerk'?(window.Clerk?.user?.primaryEmailAddress?.emailAddress||value.user.email):value.user.email);publishProgress(value.progress);set('accountStatus','Progress synced');set('syncBadge','Synced');set('pushStatus',value.push.environment==='preview'?'Local preview · open the live app to connect notifications.':value.push.schedulerActive?'Online reminder sender is running. Enable notifications on each device.':'The reminder sender is connecting or temporarily unavailable. Try again shortly.');await syncDeviceSwitch();await flushSets();return value;}catch(e){if(e.status===401){account=null;scoreboard.clear();clearCoachAccount();$('signIn').hidden=false;$('accountContent').hidden=true;$('accountSettingsContent').hidden=true;$('workoutList').replaceChildren();$('mealList').replaceChildren();$('reminderList').replaceChildren();reminderSnapshot=null;liveReminders.update([]);await syncDeviceSwitch();set('accountName','Sign in to sync');set('syncBadge','Sign in to save progress');}else {if(account)account.push={...account.push,schedulerActive:false};liveReminders.render();set('syncBadge',navigator.onLine?e.message:'Offline · reconnect to sync');if(!account){clearCoachAccount();const gate=document.getElementById('coachSetupGate');gate.querySelector('h1').textContent='Reconnect Coach';gate.querySelector('p').textContent=navigator.onLine?'Your saved coach could not connect. Reload to retry.':'Connect to the internet, then reload Coach.';gate.querySelector('a').textContent='Reload Coach';gate.querySelector('a').href='/pose.html?reconnect='+Date.now();}}return null;}}
const pendingKey=user=>`myr5-pending-sets:${user}`;
function pending(user){try{return JSON.parse(localStorage.getItem(pendingKey(user))||'[]');}catch{return [];}}
async function flushSets(){if(!account)return;const user=account.user.id,queue=pending(user);for(const item of queue){try{const r=await api('/api/workouts/complete','POST',item);const rest=pending(user).filter(x=>x.id!==item.id);localStorage.setItem(pendingKey(user),JSON.stringify(rest));publishProgress({...r.progress,lastSyncedWorkoutId:item.id});}catch(e){if(e.code==='daily_round_limit'){const rest=pending(user).filter(x=>x.id!==item.id);localStorage.setItem(pendingKey(user),JSON.stringify(rest));set('syncBadge',e.message);window.dispatchEvent(new CustomEvent('myr5:round-rejected',{detail:{id:item.id,message:e.message}}));try{publishProgress((await api('/api/account')).progress);}catch{}continue;}set('syncBadge',`Set waiting to sync: ${e.message}`);break;}}}
window.coachAccount={refresh,async start(mode,goal){const ready=account||await refresh();if(!ready)throw Error('Sign in from Progress before starting a saved workout.');if(!ready.onboarding)throw Error('Complete your coach setup first.');await flushSets();if(pending(ready.user.id).length)throw Error('Reconnect to save your previous round before starting another.');return api('/api/workouts/start','POST',{mode,goal});},async complete(data){if(!account)return;const queue=pending(account.user.id);if(!queue.some(x=>x.id===data.id)){queue.push(data);localStorage.setItem(pendingKey(account.user.id),JSON.stringify(queue));}await flushSets();if(pending(account.user.id).some(item=>item.id===data.id))throw Error('Your round is waiting to sync.');}};
const localDate=()=>{const d=new Date();return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);};
$('mealForm').elements.eatenAt.value=localDate();$('reminderForm').elements.timezone.value=Intl.DateTimeFormat().resolvedOptions().timeZone;
async function meals(){try{const {items}=await api('/api/meals');$('mealList').replaceChildren();if(!items.length)set('mealList','No meals logged yet.');for(const item of items){
 const row=document.createElement('div');row.className='entry';const text=document.createElement('details'),name=document.createElement('summary');name.textContent=item.name;text.append(name);
 const detail=document.createElement('small');detail.textContent=item.portion+' · '+new Date(item.eaten_at).toLocaleString();text.append(detail);
 const breakdown=document.createElement('div');breakdown.className='saved-nutrients';const micros=typeof item.micros==='string'?JSON.parse(item.micros):item.micros||{};
 for(const [label,keys,values] of [['Macros',MACROS,item],['Micros',MICROS,micros]]){const p=document.createElement('p');p.textContent=label+': '+keys.map(([k,title,unit])=>title+' '+displayNutrient(values[k],unit)).join(' · ');breakdown.append(p);}text.append(breakdown);
 row.append(text,button('Remove',async()=>{try{await api('/api/meals/'+item.id,'DELETE');await meals();}catch(e){set('mealStatus',e.message);}}));$('mealList').append(row);}}catch(e){set('mealList',e.message);}}
$('mealForm').onsubmit=async e=>{e.preventDefault();const form=e.target,submit=form.querySelector('[type=submit]');submit.disabled=true;$('foodCamera').disabled=true;const d={...Object.fromEntries(new FormData(form)),...mealNutrition.data()};try{d.id=crypto.randomUUID();d.eatenAt=new Date(d.eatenAt).toISOString();await api('/api/meals','POST',d);set('mealStatus','Meal saved');mealNutrition.reset();form.elements.eatenAt.value=localDate();$('foodStatus').textContent='';await meals();}catch(err){set('mealStatus',err.message);}finally{submit.disabled=false;$('foodCamera').disabled=false;}};
async function reminders(){try{
 const {items}=await api('/api/reminders');const snapshot=JSON.stringify(items);if(snapshot===reminderSnapshot){liveReminders.update(items);return;}reminderSnapshot=snapshot;$('reminderList').replaceChildren();if(!items.length)set('reminderList','No reminders saved yet.');
 for(const r of items){
  const row=document.createElement('div');row.className='entry reminder-entry';row.dataset.enabled=String(!!r.enabled);
  const text=document.createElement('div');text.className='entry-copy';text.textContent=r.kind[0].toUpperCase()+r.kind.slice(1)+' · '+r.time;
  const hint=document.createElement('small');hint.textContent=(CADENCE_LABELS[r.days_per_week??7])+' · '+(r.tone||'direct')+' · '+r.timezone+' · Quiet '+r.quiet_start+'–'+r.quiet_end;text.append(hint);
  const next=document.createElement('small');next.id='reminder-next-'+r.id;next.className='reminder-next';text.append(next);
  const controls=document.createElement('div');controls.className='reminder-controls';
  const toggle=button(r.enabled?'ON':'OFF',async()=>{toggle.disabled=true;try{await api('/api/reminders/'+r.id,'PATCH',{enabled:!r.enabled});r.enabled=r.enabled?0:1;toggle.textContent=r.enabled?'ON':'OFF';toggle.setAttribute('aria-checked',String(!!r.enabled));row.dataset.enabled=String(!!r.enabled);set('reminderStatus',r.enabled?'Reminder resumed.':'Reminder paused.');liveReminders.update(items);}catch(e){set('reminderStatus',e.message);}finally{toggle.disabled=false;}});
  toggle.className='hardware-toggle';toggle.setAttribute('role','switch');toggle.setAttribute('aria-label',r.kind+' reminder at '+r.time);toggle.setAttribute('aria-checked',String(!!r.enabled));
  controls.append(toggle,button('Edit',()=>{editingReminder=r.id;const form=$('reminderForm');for(const name of ['kind','time','timezone'])form.elements[name].value=r[name];form.elements.quietStart.value=r.quiet_start;form.elements.quietEnd.value=r.quiet_end;form.elements.enabled.checked=!!r.enabled;reminderControls.load(r.tone,r.days_per_week);set('saveReminder','Save changes');$('cancelReminderEdit').hidden=false;set('reminderStatus','Editing reminder');form.scrollIntoView({block:'start'});$('toneDial').focus({preventScroll:true});}),button('Remove',async()=>{try{await api('/api/reminders/'+r.id,'DELETE');if(editingReminder===r.id)resetReminderEdit();await reminders();}catch(e){set('reminderStatus',e.message);}}));row.append(text,controls);$('reminderList').append(row);
 }
liveReminders.update(items);
}catch(e){reminderSnapshot=null;set('reminderList',e.message);liveReminders.update([]);}}
function resetReminderEdit(){editingReminder=null;set('saveReminder','Save reminder');$('cancelReminderEdit').hidden=true;$('reminderForm').reset();$('reminderForm').elements.timezone.value=Intl.DateTimeFormat().resolvedOptions().timeZone;reminderControls.load();}
$('cancelReminderEdit').onclick=()=>{resetReminderEdit();set('reminderStatus','Ready for a new reminder.');};
$('reminderForm').onsubmit=async e=>{e.preventDefault();const form=e.target,b=form.querySelector('[type=submit]');b.disabled=true;$('cancelReminderEdit').disabled=true;try{const data=Object.fromEntries(new FormData(form));data.daysPerWeek=Number(data.daysPerWeek);data.enabled=form.elements.enabled.checked;data.id=editingReminder||crypto.randomUUID();await api(editingReminder?'/api/reminders/'+editingReminder:'/api/reminders',editingReminder?'PUT':'POST',data);set('reminderStatus',account?.push.schedulerActive?'Reminder saved.':'Reminder saved; delivery starts once the online sender is connected.');resetReminderEdit();await reminders();}catch(err){set('reminderStatus',err.message);}finally{b.disabled=false;$('cancelReminderEdit').disabled=false;}};
const fromBase64=text=>Uint8Array.from(atob(text.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(text.length/4)*4,'=')),c=>c.charCodeAt(0));
async function syncDeviceSwitch(){
 if(deviceBusy)return;
 try{
  const supported='Notification'in window&&'PushManager'in window&&'serviceWorker'in navigator;
  const reg=registration||await navigator.serviceWorker?.getRegistration(),sub=await reg?.pushManager?.getSubscription(),on=supported&&!!sub&&Notification.permission==='granted';
  $('notificationSwitch').setAttribute('aria-checked',String(on));set('notificationSwitch',on?'ON':'OFF');
  $('notificationSwitch').disabled=!account||!supported||(!on&&!account.push.configured);$('testPush').disabled=!on;
  if(on&&account?.push.configured)await deviceBinding.verify(account,sub);else deviceBinding.forget();
  set('pushStatus',!supported?'Install Coach to enable notifications.':!account?'Sign in to enable reminders.':Notification.permission==='denied'?'Allow notifications for Coach in your browser or phone settings.':!account.push.configured?'Notification service is reconnecting.':!account.push.schedulerActive?'Reconnecting… Reminders saved.':on?'Reminders and app update notifications on':'Turn on reminders and app updates for this device.');
  liveReminders.render();
 }catch{deviceBinding.forget();$('testPush').disabled=true;set('pushStatus','Reconnecting…');liveReminders.render();}
}
$('notificationSwitch').onclick=async()=>{
 const toggle=$('notificationSwitch'),turnOff=toggle.getAttribute('aria-checked')==='true';deviceBusy=true;deviceBinding.forget();toggle.disabled=true;
 try{
  if(!('Notification'in window)||!('PushManager'in window))throw Error('Install Coach on your home screen and use a browser that supports notifications.');
  if(turnOff){const reg=registration||await navigator.serviceWorker.ready,sub=await reg.pushManager.getSubscription();if(sub){await api('/api/push/unsubscribe','POST',{endpoint:sub.endpoint});await sub.unsubscribe();}set('pushStatus','Reminders are off on this device.');}
  else{
   if(account?.push.environment==='preview')throw Error('Notifications connect in the live app: myr5.mominc.online.');if(!account?.push.configured)throw Error('The notification sender could not connect. Retry while online.');
   if(await Notification.requestPermission()!=='granted')throw Error('Notifications were not allowed. Enable them in your phone settings.');
   const reg=registration||await navigator.serviceWorker.ready,existing=await reg.pushManager.getSubscription(),sub=existing||await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:fromBase64(account.push.publicKey)});
   try{await api('/api/push/subscribe','POST',sub.toJSON());}catch(e){if(!existing)await sub.unsubscribe();throw e;}
   set('pushStatus','This device is connected. Send a test to check delivery.');
  }
 }catch(e){deviceBusy=false;await syncDeviceSwitch();set('pushStatus',e.message);return;}finally{deviceBusy=false;}await syncDeviceSwitch();
};
$('testPush').onclick=async()=>{try{const reg=registration||await navigator.serviceWorker?.getRegistration(),sub=await reg?.pushManager?.getSubscription();if(!sub)throw Error('Turn reminders on for this device first.');await api('/api/push/test','POST',{endpoint:sub.endpoint});set('pushStatus','The notification service accepted the test. Check your phone.');}catch(e){set('pushStatus',e.message);}};
async function workouts(){return scoreboard.refresh();}
async function localHistory(){try{localHistoryRepository??=await openLocalCoach();const scope=localHistoryRepository.forOwner(localHistoryRepository.guestOwnerId),items=(await scope.listWorkouts()).filter(item=>item.status==='completed').sort((a,b)=>(b.completedAt??0)-(a.completedAt??0)),list=$('localHistoryList');list.replaceChildren();set('localHistoryStatus',items.length?`${items.length} completed workout${items.length===1?'':'s'} on this device.`:'No completed workouts on this device yet.');for(const item of items){const row=document.createElement('article'),title=document.createElement('strong'),detail=document.createElement('p');row.className='entry';title.textContent=item.metadata?.name||item.mode;detail.textContent=`${item.completion?.value??0} · ${new Date(item.completedAt).toLocaleString()}`;row.append(title,detail);list.append(row);}}catch(error){set('localHistoryStatus',error.message);}}
async function goals(){try{const {items}=await api('/api/goals');const list=$('goalList');list.replaceChildren();if(!items.length){list.textContent='No goals yet.';return;}for(const item of items){const row=document.createElement('article');row.className='goal-entry';row.dataset.status=item.status;const title=document.createElement('h4');title.textContent=item.title;row.append(title);if(item.note){const note=document.createElement('p');note.textContent=item.note;row.append(note);}const actions=document.createElement('div');actions.className='actions';if(item.status==='active')actions.append(button('Complete',async()=>{await updateGoal(item,{status:'completed'});}));if(item.status==='completed')actions.append(button('Reopen',async()=>{await updateGoal(item,{status:'active'});}));if(item.status!=='archived')actions.append(button('Archive',async()=>{await updateGoal(item,{status:'archived'});}));row.append(actions);list.append(row);}}catch(e){set('goalStatus',e.message);}}
async function updateGoal(item,data){try{await api('/api/goals/'+item.id,'PATCH',data);set('goalStatus','Goal saved.');await goals();}catch(e){set('goalStatus','Could not save goal: '+e.message);}}
$('goalForm').onsubmit=async e=>{e.preventDefault();const form=e.target,submit=form.querySelector('[type=submit]');submit.disabled=true;try{await api('/api/goals','POST',Object.fromEntries(new FormData(form)));form.reset();set('goalStatus','Goal saved.');await goals();}catch(err){set('goalStatus','Could not save goal: '+err.message);}finally{submit.disabled=false;}};
$('saveProfile').onclick=async()=>{try{const data=Object.fromEntries(keys.map(k=>[k,localStorage.getItem(k)]).filter(([,v])=>v!=null));const result=await api('/api/profile','PUT',{revision,data});revision=result.revision;await refresh();set('accountStatus','Appearance saved to your account.');}catch(e){set('accountStatus',e.message);}};
$('restoreProfile').onclick=async()=>{const value=await refresh();if(!value)return;for(const key of keys){const v=value.profile[key];if(v!=null){localStorage.setItem(key,v);window.dispatchEvent(new StorageEvent('storage',{key,newValue:v}));}}window.dispatchEvent(new Event('mominc-avatar-change'));set('accountStatus','Saved appearance restored.');};
$('refreshAccount').onclick=async()=>{await refresh();await workouts();};
$('exportData').onclick=async()=>{try{download(JSON.stringify(await api('/api/export'),null,2),'myr5-data.json');}catch(e){set('accountStatus',e.message);}};
$('signOut').onclick=async e=>{e.preventDefault();try{await flushSets();if(account&&pending(account.user.id).length)throw Error('A workout is waiting to sync. Reconnect before signing out.');const sub=await registration?.pushManager.getSubscription();if(sub){await api('/api/push/unsubscribe','POST',{endpoint:sub.endpoint});await sub.unsubscribe();}for(const k of [...keys,'myr5-workout-progress-v1'])localStorage.removeItem(k);clearCoachAccount();await signOut();}catch(err){set('accountStatus',err.message);}};
$('deleteAccount').onclick=async()=>{try{await api('/api/account','DELETE',{confirm:$('deleteConfirm').value});if(account)localStorage.removeItem(pendingKey(account.user.id));for(const k of [...keys,'myr5-workout-progress-v1'])localStorage.removeItem(k);clearCoachAccount();location.reload();}catch(e){set('accountStatus',e.message);}};
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;$('installApp').hidden=false;set('installStatus','Coach is ready to install on your home screen.');});window.addEventListener('appinstalled',()=>{set('installStatus','Coach is installed.');$('installApp').hidden=true;});
set('installStatus',matchMedia('(display-mode: standalone)').matches?'Coach is running as an installed app.':'Install Coach for a full-screen training pod.');
$('installApp').onclick=async()=>{if(installPrompt){await installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;$('installApp').hidden=true;}};
$('copyInstallLink').onclick=async()=>{try{await navigator.clipboard.writeText($('installLink').value);set('installShareStatus','Coach link copied. Your friend can install Coach, then answer three quick questions.');}catch{$('installLink').focus();$('installLink').select();set('installShareStatus','Link selected. Use Copy to share it.');}};
try{localStorage.setItem('myr5-voice-style','robot');}catch{}
$('downloadVoice').onclick=async()=>{const b=$('downloadVoice');b.disabled=true;try{const manifest=await(await fetch(VOICE_MANIFEST)).json(),urls=Object.values(manifest.phrases),cache=await caches.open(VOICE_CACHE);let i=0;await cache.add(VOICE_MANIFEST);for(const url of urls){if(!await cache.match(url)){const response=await fetch(url);if(!response.ok)throw Error('Download interrupted. Tap again to resume.');await cache.put(url,response);}set('downloadStatus',`Downloaded ${++i} of ${urls.length} voice clips.`);}set('downloadStatus','Robot voice pack is available offline on this device.');}catch(e){set('downloadStatus',e.message);}finally{b.disabled=false;}};
initAppUpdates({api,applyButton:$('applyUpdate'),onRegistration:reg=>{registration=reg;syncDeviceSwitch();},onBeforeUpdate:async()=>{await flushSets();if(account&&pending(account.user.id).length)throw Error('Your set is still syncing. Reconnect before updating.');}});
 for(const button of document.querySelectorAll('[data-panel]'))button.addEventListener('click',async()=>{if(button.dataset.panel==='history')await localHistory();if(button.dataset.panel==='meals')await meals();if(button.dataset.panel==='reminders')await liveReminders.sync();if(button.dataset.panel==='account'){await refresh();await workouts();await goals();}});
 window.addEventListener('myr5:local-history-refresh',localHistory);window.addEventListener('pagehide',()=>localHistoryRepository?.close(),{once:true});
const coachDayTimer=setInterval(()=>{if(!document.hidden)refresh();},60000);window.addEventListener('pagehide',()=>clearInterval(coachDayTimer));
window.addEventListener('online',refresh);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
 await applyLocalCoach();await refresh();const panel=new URLSearchParams(location.search).get('panel');if(['history','meals','reminders','account','install'].includes(panel))document.querySelector(`[data-panel=${panel}]`).click();
