import {RELEASE} from './release-info.mjs';
import {safeToUpdate,releaseNotice,requestActivation} from './update-policy.mjs';

export function initAppUpdates({api,applyButton,onRegistration,onBeforeUpdate}) {
 const panel=document.getElementById('installPanel'),section=document.createElement('details');
 section.className='release-settings';
 section.innerHTML='<summary>App updates</summary><p>Turn on notifications in Reminders to get a download alert for every new app update.</p><p id="releaseVersion"></p><ul id="releaseNotes"></ul><button id="checkAppUpdate">Check for updates</button><p id="releaseStatus" role="status"></p><form id="releaseEmailForm"><label>Email me when an update is ready<input name="email" type="email" autocomplete="email" required maxlength="254" placeholder="you@example.com"></label><button type="submit" disabled>Email me updates</button><button id="stopReleaseEmails" type="button" hidden>Stop update emails</button><p id="releaseEmailStatus" role="status">Optional. Confirm your email first; unsubscribe any time.</p></form>';
 panel.append(section);
 section.open=new URLSearchParams(location.search).has('update');
 const $=id=>document.getElementById(id),banner=document.createElement('aside');
 banner.className='app-update-banner';banner.setAttribute('role','status');banner.hidden=true;
 banner.innerHTML='<span>A Coach update is ready.</span><button type="button" data-update>Update now</button><button type="button" data-notes>What’s new</button><button type="button" data-later aria-label="Dismiss update notice">Later</button>';
 document.body.append(banner);
 let storage;try{storage=localStorage;}catch{}
 const notice=releaseNotice(storage,RELEASE.id);
 let reg=null,latest=RELEASE,applying=false,switched=false,dismissed=false,poll=0,error='',lastInteraction=Date.now(),retryAt=0,checking=false;
 const hadController=!!navigator.serviceWorker?.controller;
 const safe=(automatic=true,background=false)=>safeToUpdate({tracking:document.body.dataset.tracking==='true',rest:document.body.dataset.screen==='rest',dialog:!!document.querySelector('dialog[open]:not(#installPanel):not(#coachSetupGate)'),editing:!!document.activeElement?.matches('input,textarea,select,[contenteditable=true]'),hidden:document.hidden&&!background,online:navigator.onLine,lastInteraction,automatic});
 const ready=()=>!!reg?.waiting||switched||(!('serviceWorker' in navigator)&&latest.id!==RELEASE.id);
 function showNotes(r){$('releaseVersion').textContent=r.title+' · '+r.date;$('releaseNotes').replaceChildren(...r.notes.map(text=>{const li=document.createElement('li');li.textContent=text;return li;}));}
 function paint(){
  applyButton.hidden=!ready();banner.hidden=ready()?dismissed:!notice.visible;
  banner.querySelector('span').textContent=ready()?'Coach will update when you’re idle.':'Updated: '+RELEASE.title;
  const b=banner.querySelector('[data-update]');b.hidden=!ready();b.disabled=!safe(false)||applying;applyButton.disabled=b.disabled;
  b.textContent=!safe(false)?'Finish what you’re doing':applying?'Updating…':'Update now';
  banner.querySelector('[data-later]').textContent=ready()?'Later':'Got it';
  $('releaseStatus').textContent=error||(ready()?'Updates install automatically when you’re idle.':latest.id!==RELEASE.id?'Downloading update…':'Automatic updates are on.');
 }
 async function apply(automatic=false){
  if(!safe(automatic)||applying||!ready())return;
  applying=true;error='';paint();
  try{
   await onBeforeUpdate?.();
   if(!safe(automatic)){applying=false;paint();return;}
   if(reg?.waiting)await requestActivation(reg.waiting);
   else location.reload();
  }catch(e){applying=false;retryAt=Date.now()+30000;error=e.message||'Save your progress before updating.';paint();}
 }
 applyButton.onclick=()=>apply(false);banner.querySelector('[data-update]').onclick=()=>apply(false);
 banner.querySelector('[data-later]').onclick=()=>{if(ready())dismissed=true;else notice.dismiss();paint();};
 banner.querySelector('[data-notes]').onclick=()=>{notice.dismiss();if(!panel.open)panel.showModal();section.open=true;section.scrollIntoView({block:'start'});paint();};
 function openDownload(){if(!panel.open)panel.showModal();section.open=true;section.scrollIntoView({block:'start'});void check();}
 async function check(){
  if(checking)return;checking=true;
  try{
   const value=await api('/api/releases/current');
   if(typeof value?.id==='string'&&Array.isArray(value.notes)&&value.notes.every(n=>typeof n==='string')){if(latest.id!==value.id)dismissed=false;latest=value;showNotes(latest);}
   await reg?.update();error='';paint();
  }catch{error='Could not check for an update. Reconnect and try again.';paint();}finally{checking=false;}
 }
 $('checkAppUpdate').onclick=check;
 async function emailStatus(){
  const form=$('releaseEmailForm'),button=form.querySelector('[type=submit]');
  try{
   const p=await api('/api/updates/subscription');button.disabled=!p.configured;
   if(p.email&&!form.elements.email.value)form.elements.email.value=p.email;
   $('stopReleaseEmails').hidden=!p.email;
   $('releaseEmailStatus').textContent=p.enabled?'Release emails are on.':p.email?'Check your inbox to confirm release emails.':p.configured?'Optional. Confirm your email first; unsubscribe any time.':'Email delivery is being connected. In-app updates are available now.';
  }catch{button.disabled=true;$('releaseEmailStatus').textContent='Sign in to choose email updates.';}
 }
 $('releaseEmailForm').onsubmit=async e=>{
  e.preventDefault();const form=e.currentTarget,b=form.querySelector('[type=submit]');b.disabled=true;
  try{const r=await api('/api/updates/subscription','POST',{email:form.elements.email.value});$('releaseEmailStatus').textContent=r.message;$('stopReleaseEmails').hidden=false;}
  catch(error){$('releaseEmailStatus').textContent=error.message;}finally{b.disabled=false;}
 };
 $('stopReleaseEmails').onclick=async()=>{try{await api('/api/updates/subscription','DELETE',{});$('stopReleaseEmails').hidden=true;$('releaseEmailStatus').textContent='Update emails are off.';}catch(error){$('releaseEmailStatus').textContent=error.message;}};
 document.querySelectorAll('[data-panel=install]').forEach(b=>b.addEventListener('click',emailStatus));
 if('serviceWorker' in navigator){
  navigator.serviceWorker.register('/sw.js',{updateViaCache:'none'}).then(value=>{
   reg=value;onRegistration?.(reg);paint();
   reg.addEventListener('updatefound',()=>{const w=reg.installing;w?.addEventListener('statechange',()=>{if(w.state==='installed'){dismissed=false;paint();}});});check();
  }).catch(()=>{error='Updates could not initialize. Refresh Coach to retry.';paint();});
  navigator.serviceWorker.addEventListener('controllerchange',()=>{
   if(!hadController&&!applying)return;
   switched=true;
   if(applying&&safe(false))location.reload();
   else {applying=false;paint();}
  });
  navigator.serviceWorker.addEventListener('message',async event=>{
   if(event.data?.type==='APP_UPDATE_AVAILABLE'){openDownload();event.ports[0]?.postMessage({handled:true});return;}
   if(event.data?.type!=='UPDATE_SAFETY_CHECK')return;
   let approved=safe(false,true);
   if(approved)try{await onBeforeUpdate?.();approved=safe(false,true);}catch{approved=false;}
   event.ports[0]?.postMessage({safe:approved});
  });
 }else check();
 showNotes(RELEASE);paint();
 const observer=new MutationObserver(paint);observer.observe(document.body,{subtree:true,attributes:true,attributeFilter:['data-tracking','data-screen','open']});
 const activity=()=>{lastInteraction=Date.now();};
 for(const type of ['pointerdown','keydown','input'])document.addEventListener(type,activity,{passive:true});
 const autoPoll=setInterval(()=>{paint();if(!dismissed&&Date.now()>=retryAt)void apply(true);},1000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)check();});window.addEventListener('online',check);
 poll=setInterval(()=>{if(!document.hidden)check();},300000);
 window.addEventListener('pagehide',event=>{if(!event.persisted){clearInterval(poll);clearInterval(autoPoll);observer.disconnect();for(const type of ['pointerdown','keydown','input'])document.removeEventListener(type,activity);}});emailStatus();
 return {check};
}
