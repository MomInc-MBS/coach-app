import {setupAllowed} from './install-context.mjs';
import {restoreInstall} from './install-transfer.mjs';
import {withQuickDefaults} from './quick-setup.mjs';
import {receiveCoach} from './receive-coach.mjs';
import {readIncomingCoach,saveIncomingCoach,clearIncomingCoach} from './pending-coach.mjs';
import {decodeHandoff,missingFields,WEBSITE} from './onboarding-domain.mjs?v=quick-install-v1';
import {mountProfileForm} from './onboarding-form.mjs?v=quick-install-v1';
import {createOfficeDraft} from './office-domain.mjs?v=office-short-v1';
const status=document.getElementById('setupStatus'),host=document.getElementById('setupBody'),title=document.querySelector('h1');
const KEY='myr5-incoming-coach-v1',OFFICE_KEY='myr5-office-draft-v1',params=new URLSearchParams(location.search);
let account=null;
async function api(path,method='GET',data){const r=await fetch(path,{method,credentials:'same-origin',headers:data?{'Content-Type':'application/json'}:undefined,body:data?JSON.stringify(data):undefined,cache:'no-store'});if(!r.headers.get('content-type')?.includes('application/json'))throw Object.assign(Error('Sign in to save your coach.'),{status:401});const value=await r.json();if(!r.ok)throw Object.assign(Error(value.error||'Could not save. Please retry.'),{status:r.status});return value;}
function link(text,href,parent=host){const a=document.createElement('a');a.className='setup-action';a.textContent=text;a.href=href;a.target='_top';parent.append(a);return a;}
function readDraft(key){try{return JSON.parse(sessionStorage.getItem(key)||'null');}catch{return null;}}
function removeDraft(key){try{sessionStorage.removeItem(key);}catch{}}
function restore(appearance){for(const [key,v] of Object.entries(appearance||{}))if(['myr5-recipe-v1','myr5-motion-v1','mominc-avatar-v1'].includes(key))localStorage.setItem(key,typeof v==='string'?v:JSON.stringify(v));}
function signIn(returnTo){return '/signin-with-chatgpt?return_to='+encodeURIComponent(returnTo);}
function chooseRoute(){
 title.textContent='Someone sent you a coach. Make it yours.';
 status.textContent='Play the character games, or answer three quick questions.';
 const choices=document.createElement('div');choices.className='setup-route-choices';
 for(const route of [
  {theme:'games',heading:'Play the character games',description:'Meet the crew, answer as you play, then finish Coach Armie and customize your coach. Your choices come with you.',label:'Take the fun route',href:WEBSITE+'/tv/?ch=mominc'},
  {theme:'office',heading:'Request the office form',description:'Your goal, session length, and movement limits. Then you’re ready.',label:readDraft(OFFICE_KEY)?'Resume my paperwork':'I choose paperwork',href:'/onboarding.html?route=office'}
 ]){const card=document.createElement('section');card.className='setup-route '+route.theme;const h=document.createElement('h2'),p=document.createElement('p');h.textContent=route.heading;p.textContent=route.description;card.append(h,p);link(route.label,route.href,card);choices.append(card);}
 host.replaceChildren(choices);
 if(!account)link('Already have a coach? Sign in',signIn('/onboarding.html'));
}
async function renderForm(data,{edit=false,autoSave=false}={}){
 if(!edit)data=withQuickDefaults(data);
 const office=data.entryRoute==='office',draftKey=office?OFFICE_KEY:KEY;
 document.body.classList.toggle('office-mode',office&&edit);document.body.classList.toggle('quick-mode',!edit);
 title.textContent=edit?'Your coach settings':'Three things, then we start.';
 status.textContent=edit?'Change any setting when you need it.':office?'Everything else can wait.':'Your saved coach and game answers are already included.';
 const formHost=document.createElement('div'),notice=document.createElement('p');notice.role='status';notice.className='draft-notice';
 host.replaceChildren();


 host.append(formHost,notice);
 function remember(value){if(edit)return;try{if(office)sessionStorage.setItem(draftKey,JSON.stringify(value));else saveIncomingCoach(value);notice.textContent='';}catch{notice.textContent='Your browser cannot save a draft. Keep this page open and sign in before completing the form.';}}
 async function save(value){
  if(!account){try{sessionStorage.setItem(draftKey,JSON.stringify(value));}catch{throw Error('Your browser blocked draft storage. Allow storage for Coach before signing in so your answers can come with you.');}location.assign(signIn(office?'/onboarding.html?route=office&submit=1':location.pathname+location.search));return;}
  const result=await api('/api/onboarding','PUT',{data:value,revision:account.onboarding?.revision||0});
  try{restore(result.appearance);localStorage.setItem('myr5-coach-owner',account.user.id);}catch{}
  clearIncomingCoach();removeDraft(KEY);removeDraft(OFFICE_KEY);location.replace('/pose.html');
 }
 if(autoSave&&!missingFields(withQuickDefaults(data)).length){status.textContent=office?'Filing your completed application and waking your coach…':'Saving your website choices and customized coach…';try{await save(data);return;}catch(e){status.textContent=e.message;}}
 mountProfileForm(formHost,data,{save,label:edit?'Save coach settings':account?'Start my coach':'Sign in & start Coach',changed:remember,fullSettings:edit});
 if(edit)link('Back to Coach','/pose.html');
}
try{
 let incoming=readIncomingCoach();
 const raw=new URLSearchParams(location.hash.slice(1)).get('coach');
 if(raw){incoming=saveIncomingCoach(decodeHandoff(raw));history.replaceState(null,'',location.pathname+location.search);}
 if(params.get('receive')==='1'&&!incoming){status.textContent='Bringing your saved website choices aboard…';incoming=await receiveCoach(raw=>saveIncomingCoach(raw));}
 try{account=await api('/api/account');}catch(e){if(e.status!==401)throw e;}
 const edit=params.get('edit')==='1',office=params.get('route')==='office';
 if(!edit&&!setupAllowed()&&!account?.onboarding){location.replace('/install.html'+(office?'?route=office':''));}else{
 if(setupAllowed()&&!edit)incoming=await restoreInstall()||incoming;
 if(edit){
  if(!account){status.textContent='Sign in to edit your coach settings.';link('Sign in to Coach',signIn('/onboarding.html?edit=1'));}
  else if(!account.onboarding)chooseRoute();
  else {const data=structuredClone(account.onboarding.data);for(const key of ['myr5-recipe-v1','myr5-motion-v1','mominc-avatar-v1'])if(account.profile[key])data.appearance[key]=JSON.parse(account.profile[key]);data.profile.coach=data.appearance['myr5-recipe-v1'].coach;await renderForm(data,{edit:true});}
 }else if(incoming&&!office){await renderForm(incoming,{autoSave:!!account});}
 else if(account?.onboarding){try{restore(account.profile);}catch{}location.replace('/pose.html');}
 else if(office){let data=readDraft(OFFICE_KEY);if(data?.entryRoute!=='office')data=createOfficeDraft(Intl.DateTimeFormat().resolvedOptions().timeZone);await renderForm(data,{autoSave:params.get('submit')==='1'&&!!account});}
 else if(setupAllowed()){const draft=readDraft(OFFICE_KEY);await renderForm(draft?.entryRoute==='office'?draft:createOfficeDraft(Intl.DateTimeFormat().resolvedOptions().timeZone));}
 else chooseRoute();
 }
}catch(e){status.textContent=e.message;link('Retry coach setup','/onboarding.html');}
