import {receiveCoach} from './receive-coach.mjs';
import {readIncomingCoach,saveIncomingCoach,clearIncomingCoach} from './pending-coach.mjs';
import {decodeHandoff,missingFields,WEBSITE} from './onboarding-domain.mjs?v=office-short-v1';
import {mountProfileForm} from './onboarding-form.mjs?v=office-short-v1';
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
 status.textContent='Play the character games, or answer six essentials and start your coach.';
 const choices=document.createElement('div');choices.className='setup-route-choices';
 for(const route of [
  {theme:'games',heading:'Play the character games',description:'Meet the crew, answer as you play, then finish Coach Armie and customize your coach. Your choices come with you.',label:'Take the fun route',href:WEBSITE+'/tv/?ch=mominc'},
  {theme:'office',heading:'Request the office form',description:'Complete Form 03-B: Coach Acquisition. Six quick answers, zero boss battles. Your bored coach will roast your devotion to paperwork.',label:readDraft(OFFICE_KEY)?'Resume my paperwork':'I choose paperwork',href:'/onboarding.html?route=office'}
 ]){const card=document.createElement('section');card.className='setup-route '+route.theme;const h=document.createElement('h2'),p=document.createElement('p');h.textContent=route.heading;p.textContent=route.description;card.append(h,p);link(route.label,route.href,card);choices.append(card);}
 host.replaceChildren(choices);
 if(!account)link('Already have a coach? Sign in',signIn('/onboarding.html'));
}
async function renderForm(data,{edit=false,autoSave=false}={}){
 const office=data.entryRoute==='office',draftKey=office?OFFICE_KEY:KEY;
 document.body.classList.toggle('office-mode',office);
 title.textContent=office?'Form 03-B: Coach Acquisition':edit?'Your coach settings':'Your coach is coming aboard.';
 status.textContent=office?'DEPARTMENT OF PERSONAL IMPROVEMENT / Six answers required. Excess paperwork has been discontinued.':edit?'Adjust your coach and training preferences. Your starting date and earned progress stay with you.':'Finish the missing answers to unlock your coach.';
 const formHost=document.createElement('div'),notice=document.createElement('p');notice.role='status';notice.className='draft-notice';
 host.replaceChildren();
 if(office&&!edit){const nav=document.createElement('div');nav.className='office-exit';link('Rescue my coach — play the games',WEBSITE+'/tv/?ch=mominc',nav);host.append(nav);}
 if(!account){const p=document.createElement('p');p.textContent='Fill this out first, then sign in to save your own coach. Your answers stay in this tab during sign-in.';host.append(p);link('Sign in first',signIn(office?'/onboarding.html?route=office':location.pathname+location.search));}
 host.append(formHost,notice);
 function remember(value){if(edit)return;try{if(office)sessionStorage.setItem(draftKey,JSON.stringify(value));else saveIncomingCoach(value);notice.textContent=office?'Draft saved in this tab.':'Your coach setup is saved in this browser.';}catch{notice.textContent='Your browser cannot save a draft. Keep this page open and sign in before completing the form.';}}
 async function save(value){
  if(!account){try{sessionStorage.setItem(draftKey,JSON.stringify(value));}catch{throw Error('Your browser blocked draft storage. Allow storage for Coach before signing in so your answers can come with you.');}location.assign(signIn(office?'/onboarding.html?route=office&submit=1':location.pathname+location.search));return;}
  const result=await api('/api/onboarding','PUT',{data:value,revision:account.onboarding?.revision||0});
  try{restore(result.appearance);localStorage.setItem('myr5-coach-owner',account.user.id);}catch{}
  clearIncomingCoach();removeDraft(KEY);removeDraft(OFFICE_KEY);location.replace('/pose.html');
 }
 if(autoSave&&!missingFields(data).length){status.textContent=office?'Filing your completed application and waking your coach…':'Saving your website choices and customized coach…';try{await save(data);return;}catch(e){status.textContent=e.message;}}
 mountProfileForm(formHost,data,{save,label:edit?'Save coach settings':office?'File application & unlock Coach':'Unlock my Coach app',changed:remember,fullSettings:edit});
 if(edit)link('Back to Coach','/pose.html');
}
try{
 let incoming=readIncomingCoach();
 const raw=new URLSearchParams(location.hash.slice(1)).get('coach');
 if(raw){incoming=saveIncomingCoach(decodeHandoff(raw));history.replaceState(null,'',location.pathname+location.search);}
 if(params.get('receive')==='1'&&!incoming){status.textContent='Bringing your saved website choices aboard…';incoming=await receiveCoach(raw=>saveIncomingCoach(raw));}
 try{account=await api('/api/account');}catch(e){if(e.status!==401)throw e;}
 const edit=params.get('edit')==='1',office=params.get('route')==='office';
 if(edit){
  if(!account){status.textContent='Sign in to edit your coach settings.';link('Sign in to Coach',signIn('/onboarding.html?edit=1'));}
  else if(!account.onboarding)chooseRoute();
  else {const data=structuredClone(account.onboarding.data);for(const key of ['myr5-recipe-v1','myr5-motion-v1','mominc-avatar-v1'])if(account.profile[key])data.appearance[key]=JSON.parse(account.profile[key]);data.profile.coach=data.appearance['myr5-recipe-v1'].coach;await renderForm(data,{edit:true});}
 }else if(incoming&&!office){await renderForm(incoming,{autoSave:!!account});}
 else if(account?.onboarding){try{restore(account.profile);}catch{}location.replace('/pose.html');}
 else if(office){let data=readDraft(OFFICE_KEY);if(data?.entryRoute!=='office')data=createOfficeDraft(Intl.DateTimeFormat().resolvedOptions().timeZone);await renderForm(data,{autoSave:params.get('submit')==='1'&&!!account});}
 else chooseRoute();
}catch(e){status.textContent=e.message;link('Retry coach setup','/onboarding.html');}
