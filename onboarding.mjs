import {receiveCoach} from './receive-coach.mjs';
import {decodeHandoff,missingFields,WEBSITE} from './onboarding-domain.mjs';
import {mountProfileForm} from './onboarding-form.mjs';
const status=document.getElementById('setupStatus'),host=document.getElementById('setupBody'),KEY='myr5-incoming-coach-v1';
async function api(path,method='GET',data){const r=await fetch(path,{method,credentials:'same-origin',headers:data?{'Content-Type':'application/json'}:undefined,body:data?JSON.stringify(data):undefined,cache:'no-store'});if(!r.headers.get('content-type')?.includes('application/json'))throw Object.assign(Error('Sign in to save your coach.'),{status:401});const value=await r.json();if(!r.ok)throw Object.assign(Error(value.error||'Could not save. Please retry.'),{status:r.status});return value;}
function link(text,href){const a=document.createElement('a');a.className='setup-action';a.textContent=text;a.href=href;a.target='_top';host.append(a);}
function restore(appearance){for(const [key,v] of Object.entries(appearance||{}))if(['myr5-recipe-v1','myr5-motion-v1','mominc-avatar-v1'].includes(key))localStorage.setItem(key,typeof v==='string'?v:JSON.stringify(v));}
let incoming=null,account;
try{
 const raw=new URLSearchParams(location.hash.slice(1)).get('coach');
 if(raw){incoming=decodeHandoff(raw);sessionStorage.setItem(KEY,JSON.stringify(incoming));history.replaceState(null,'',location.pathname+location.search);}
 else incoming=JSON.parse(sessionStorage.getItem(KEY)||'null');
 if(new URLSearchParams(location.search).get('receive')==='1'&&!incoming){status.textContent='Bringing your saved website choices aboard…';incoming=await receiveCoach(raw=>sessionStorage.setItem(KEY,raw));}
 account=await api('/api/account');
 const edit=new URLSearchParams(location.search).get('edit')==='1';
 if(account.onboarding&&!edit&&!incoming){restore(account.profile);sessionStorage.removeItem(KEY);location.replace('/pose.html');}
 else if(!incoming&&!account.onboarding){status.textContent='Finish Coach Armie and customize your coach to unlock the app. Your saved website answers will come with you.';link('Continue Coach Armie',WEBSITE+'/tv/?ch=armie');}
 else {
  const data=edit?structuredClone(account.onboarding.data):incoming;
  if(edit){for(const key of ['myr5-recipe-v1','myr5-motion-v1','mominc-avatar-v1'])if(account.profile[key])data.appearance[key]=JSON.parse(account.profile[key]);data.profile.coach=data.appearance['myr5-recipe-v1'].coach;}
  async function save(value){const result=await api('/api/onboarding','PUT',{data:value,revision:account.onboarding?.revision||0});restore(result.appearance);sessionStorage.removeItem(KEY);localStorage.setItem('myr5-coach-owner',account.user.id);location.replace('/pose.html');}
  if(!edit&&!missingFields(data).length){status.textContent='Saving your website choices and customized coach…';try{await save(data);}catch(e){status.textContent=e.message;mountProfileForm(host,data,{save,label:'Retry unlocking Coach'});}}
  else {status.textContent=edit?'Adjust your coach and training preferences. Your starting date and earned progress stay with you.':'Finish the missing answers to unlock your coach.';mountProfileForm(host,data,{save,label:edit?'Save coach settings':'Unlock my Coach app',changed:v=>{if(!edit)sessionStorage.setItem(KEY,JSON.stringify(v));}});if(edit)link('Back to Coach','/pose.html');}
 }
}catch(e){status.textContent=e.message;if(e.status===401)link('Sign in and bring my coach aboard','/signin-with-chatgpt?return_to='+encodeURIComponent(location.pathname+location.search));else link('Return to coach setup',WEBSITE+'/coach-setup/');}
