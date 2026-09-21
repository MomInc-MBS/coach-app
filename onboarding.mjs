import {signInPath} from './auth-paths.mjs';
import {authFetch} from './auth-client.mjs';
import {setupAllowed} from './install-context.mjs';
import {restoreInstall} from './install-transfer.mjs';
import {withQuickDefaults} from './quick-setup.mjs';
import {receiveCoach} from './receive-coach.mjs';
import {readIncomingCoach,saveIncomingCoach,clearIncomingCoach} from './pending-coach.mjs';
import {decodeHandoff,missingFields,WEBSITE,calendarDay} from './onboarding-domain.mjs?v=quick-install-v1';
import {mountProfileForm} from './onboarding-form.mjs?v=quick-install-v1';
import {createOfficeDraft} from './office-domain.mjs?v=office-short-v1';
import {openLocalCoach,probeOptionalAccount,probeOptionalTransfer} from './local-coach-runtime.mjs';
const status=document.getElementById('setupStatus'),host=document.getElementById('setupBody'),title=document.querySelector('h1');
const KEY='myr5-incoming-coach-v1',OFFICE_KEY='myr5-office-draft-v1',params=new URLSearchParams(location.search);
let account=null,localCoach=null,localScope=null,localIntake=null;
async function api(path,method='GET',data){const r=await authFetch(path,{method,credentials:'same-origin',headers:data?{'Content-Type':'application/json'}:undefined,body:data?JSON.stringify(data):undefined,cache:'no-store'});if(!r.headers.get('content-type')?.includes('application/json'))throw Object.assign(Error(r.status>=500?'Coach service is unavailable. Please retry.':'Sign in to save your coach.'),{status:r.status});const value=await r.json();if(!r.ok)throw Object.assign(Error(value.error||'Could not save. Please retry.'),{status:r.status});return value;}
function link(text,href,parent=host){const a=document.createElement('a');a.className='setup-action';a.textContent=text;a.href=href;a.target='_top';parent.append(a);return a;}
function readDraft(key){try{return JSON.parse(sessionStorage.getItem(key)||'null');}catch{return null;}}
function removeDraft(key){try{sessionStorage.removeItem(key);}catch{}}
function restore(appearance){for(const [key,v] of Object.entries(appearance||{}))if(['myr5-recipe-v1','myr5-motion-v1','mominc-avatar-v1'].includes(key))localStorage.setItem(key,typeof v==='string'?v:JSON.stringify(v));}
function signIn(returnTo){return signInPath(returnTo);}
function chooseRoute(){
 title.textContent='Set up Coach';
 status.textContent='Choose your route.';
 const choices=document.createElement('div');choices.className='setup-route-choices';
 for(const route of [
  {theme:'games',heading:'Play the character games',description:'Meet the crew. Build your coach.',label:'Take the fun route',href:WEBSITE+'/tv/?ch=mominc'},
  {theme:'office',heading:'Quick setup',description:'Three questions.',label:readDraft(OFFICE_KEY)?'Resume my paperwork':'Start setup',href:'/onboarding.html?route=office'}
 ]){const card=document.createElement('section');card.className='setup-route '+route.theme;const h=document.createElement('h2'),p=document.createElement('p');h.textContent=route.heading;p.textContent=route.description;card.append(h,p);link(route.label,route.href,card);choices.append(card);}
 host.replaceChildren(choices);
 if(!account)link('Already have a coach? Sign in',signIn('/onboarding.html'));
}
async function renderForm(data,{edit=false,autoSave=false}={}){
 if(!edit)data=withQuickDefaults(data);
 const office=data.entryRoute==='office',draftKey=office?OFFICE_KEY:KEY;
 document.body.classList.toggle('office-mode',office&&edit);document.body.classList.toggle('quick-mode',!edit);
 title.textContent=edit?'Settings':'Set up Coach';
 status.textContent=edit?'':office?'':'';
 const formHost=document.createElement('div'),notice=document.createElement('p');notice.role='status';notice.className='draft-notice';
 host.replaceChildren();


 host.append(formHost,notice);
 function remember(value){if(edit)return;try{if(office)sessionStorage.setItem(draftKey,JSON.stringify(value));else saveIncomingCoach(value);notice.textContent='';}catch{notice.textContent='Your browser cannot save a draft. Keep this page open and sign in before completing the form.';}}
 async function save(value){
   if(!account){const result=await localScope.saveSetup(value,{startDay:calendarDay(Date.now(),value.profile.timezone)});restore(result.intake.appearance);clearIncomingCoach();removeDraft(KEY);removeDraft(OFFICE_KEY);location.replace('/pose.html');return;}
  const result=await api('/api/onboarding','PUT',{data:value,revision:account.onboarding?.revision||0});
  try{restore(result.appearance);localStorage.setItem('myr5-coach-owner',account.user.id);}catch{}
  clearIncomingCoach();removeDraft(KEY);removeDraft(OFFICE_KEY);location.replace('/pose.html');
 }
 if(autoSave&&!missingFields(withQuickDefaults(data)).length){status.textContent=office?'Saving…':'Saving…';try{await save(data);return;}catch(e){status.textContent=e.message;}}
  mountProfileForm(formHost,data,{save,label:edit?'Save settings':'Start my coach',changed:remember,fullSettings:edit});
 if(edit)link('Back to Coach','/pose.html');
}
try{
 let incoming=readIncomingCoach();
 const raw=new URLSearchParams(location.hash.slice(1)).get('coach');
 if(raw){incoming=saveIncomingCoach(decodeHandoff(raw));history.replaceState(null,'',location.pathname+location.search);}
 if(params.get('receive')==='1'&&!incoming){status.textContent='Bringing your saved website choices aboard…';incoming=await receiveCoach(raw=>saveIncomingCoach(raw));}
 account=await probeOptionalAccount(()=>api('/api/account'));
 localCoach=await openLocalCoach();try{localScope=localCoach.forOwner(localCoach.guestOwnerId);localIntake=await localScope.getIntake();}catch(error){localCoach.close();localCoach=null;throw error;}window.addEventListener('pagehide',()=>localCoach?.close(),{once:true});
 const edit=params.get('edit')==='1',office=params.get('route')==='office';
 if(!edit&&!setupAllowed()&&!account?.onboarding){location.replace('/install.html'+(office?'?route=office':''));}else{
 if(setupAllowed()&&!edit&&!raw)incoming=(account?await restoreInstall():await probeOptionalTransfer(()=>restoreInstall()))||incoming;
 if(edit){
   if(!account&&!localIntake){status.textContent='Set up your coach on this device first.';link('Set up Coach','/onboarding.html');}
   else if(!account){await renderForm(structuredClone(localIntake),{edit:true});}
  else if(!account.onboarding)chooseRoute();
  else {const data=structuredClone(account.onboarding.data);for(const key of ['myr5-recipe-v1','myr5-motion-v1','mominc-avatar-v1'])if(account.profile[key])data.appearance[key]=JSON.parse(account.profile[key]);data.profile.coach=data.appearance['myr5-recipe-v1'].coach;await renderForm(data,{edit:true});}
 }else if(incoming&&!office){await renderForm(incoming,{autoSave:!!account});}
  else if(account?.onboarding){try{restore(account.profile);}catch{}location.replace('/pose.html');}
  else if(localIntake){try{restore(localIntake.appearance);}catch{}location.replace('/pose.html');}
 else if(office){let data=readDraft(OFFICE_KEY);if(data?.entryRoute!=='office')data=createOfficeDraft(Intl.DateTimeFormat().resolvedOptions().timeZone);await renderForm(data,{autoSave:params.get('submit')==='1'&&!!account});}
 else if(setupAllowed()){const draft=readDraft(OFFICE_KEY);await renderForm(draft?.entryRoute==='office'?draft:createOfficeDraft(Intl.DateTimeFormat().resolvedOptions().timeZone));}
 else chooseRoute();
 }
}catch(e){status.textContent=e.message;link('Retry coach setup','/onboarding.html');}
