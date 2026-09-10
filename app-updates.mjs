import {RELEASE} from './release-info.mjs';

export function initAppUpdates({api,applyButton,onRegistration,onBeforeUpdate}) {
 const panel=document.getElementById('installPanel'),section=document.createElement('details');
 section.className='release-settings';
 section.innerHTML='<summary>App updates</summary><p id="releaseVersion"></p><ul id="releaseNotes"></ul><button id="checkAppUpdate">Check for updates</button><p id="releaseStatus" role="status"></p><form id="releaseEmailForm"><label>Email me when an update is ready<input name="email" type="email" autocomplete="email" required maxlength="254" placeholder="you@example.com"></label><button type="submit" disabled>Email me updates</button><button id="stopReleaseEmails" type="button" hidden>Stop update emails</button><p id="releaseEmailStatus" role="status">Optional. Confirm your email first; unsubscribe any time.</p></form>';
 panel.append(section);
 const $=id=>document.getElementById(id),banner=document.createElement('aside');
 banner.className='app-update-banner';banner.setAttribute('role','status');banner.hidden=true;
 banner.innerHTML='<span>A Coach update is ready.</span><button type="button" data-update>Update now</button><button type="button" data-notes>What’s new</button><button type="button" data-later aria-label="Dismiss update notice">Later</button>';
 document.body.append(banner);
 let reg=null,latest=RELEASE,applying=false,switched=false,dismissed=false,poll=0,error='';
 const hadController=!!navigator.serviceWorker?.controller;
 const busy=()=>document.body.dataset.tracking==='true'||document.body.dataset.screen==='rest';
 const ready=()=>!!reg?.waiting||switched||(!('serviceWorker' in navigator)&&latest.id!==RELEASE.id);
 function showNotes(r){$('releaseVersion').textContent=r.title+' · '+r.date;$('releaseNotes').replaceChildren(...r.notes.map(text=>{const li=document.createElement('li');li.textContent=text;return li;}));}
 function paint(){
  applyButton.hidden=!ready();banner.hidden=!ready()||dismissed;
  const b=banner.querySelector('[data-update]');b.disabled=busy()||applying;applyButton.disabled=b.disabled;
  b.textContent=busy()?'Finish set first':applying?'Updating…':'Update now';
  $('releaseStatus').textContent=error||(ready()?'Update ready':latest.id!==RELEASE.id?'Downloading the update. Keep Coach open.':'Up to date');
 }
 async function apply(){
  if(busy()||applying||!ready())return;
  applying=true;error='';paint();
  try{
   await onBeforeUpdate?.();
   if(busy()){applying=false;paint();return;}
   if(reg?.waiting)reg.waiting.postMessage({type:'SKIP_WAITING'});
   else location.reload();
  }catch(e){applying=false;error=e.message||'Save your progress before updating.';paint();}
 }
 applyButton.onclick=apply;banner.querySelector('[data-update]').onclick=apply;
 banner.querySelector('[data-later]').onclick=()=>{dismissed=true;paint();};
 banner.querySelector('[data-notes]').onclick=()=>{if(!panel.open)panel.showModal();section.open=true;section.scrollIntoView({block:'start'});};
 async function check(){
  try{
   const value=await api('/api/releases/current');
   if(typeof value?.id==='string'&&Array.isArray(value.notes)&&value.notes.every(n=>typeof n==='string')){if(latest.id!==value.id)dismissed=false;latest=value;showNotes(latest);}
   await reg?.update();error='';paint();
  }catch{error='Could not check for an update. Reconnect and try again.';paint();}
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
   if(applying&&!busy())location.reload();
   else {applying=false;paint();}
  });
 }else check();
 showNotes(RELEASE);paint();
 const observer=new MutationObserver(paint);observer.observe(document.body,{attributes:true,attributeFilter:['data-tracking','data-screen']});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)check();});window.addEventListener('online',check);
 poll=setInterval(()=>{if(!document.hidden)check();},300000);
 window.addEventListener('pagehide',event=>{if(!event.persisted){clearInterval(poll);observer.disconnect();}});emailStatus();
 return {check};
}
