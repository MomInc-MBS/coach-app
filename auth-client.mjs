import {authTransitions} from './auth-transition.mjs';
import {safeReturn} from './auth-paths.mjs';
let settingsPromise,clerkPromise;
export function authSettings(){return settingsPromise??=fetch('/api/auth/config',{credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(5000)}).then(async r=>{if(!r.ok)throw Object.assign(Error('Login could not connect. Please retry.'),{status:r.status,code:'auth-config'});return r.json();}).catch(e=>{settingsPromise=null;throw e;});}
function script(src,key){return new Promise((resolve,reject)=>{const tag=document.createElement('script');tag.src=src;tag.crossOrigin='anonymous';if(key)tag.dataset.clerkPublishableKey=key;tag.onload=resolve;tag.onerror=()=>reject(Error('Login could not load. Check your connection and retry.'));document.head.append(tag);});}
export function loadLogin(){return clerkPromise??=(async()=>{const config=await authSettings();if(!config.enabled)return null;const origin=new URL(config.frontend).origin;await script(origin+'/npm/@clerk/ui@1/dist/ui.browser.js');await script(origin+'/npm/@clerk/clerk-js@6/dist/clerk.browser.js',config.publishableKey);await window.Clerk.load({ui:{ClerkUI:window.__internal_ClerkUICtor}});const clerk=window.Clerk,observe=()=>authTransitions().observeIdentity('clerk',clerk.session?.id,clerk.user?.id);observe();clerk.addListener(observe);return clerk;})().catch(e=>{clerkPromise=null;throw e;});}
// Bound authentication waits as well as the final network request. A late
// credential resolution cannot continue the abandoned call.
function boundedAuthWait(promise,signal){
 return new Promise((resolve,reject)=>{
  let settled=false;
  const finish=(fn,value)=>{if(settled)return;settled=true;clearTimeout(timer);signal.removeEventListener('abort',aborted);fn(value);};
  const aborted=()=>finish(reject,Object.assign(Error('Account changed. Refresh to continue.'),{code:'auth_transition'}));
  const timer=setTimeout(()=>finish(reject,Object.assign(Error('Account service timed out. Please retry.'),{status:503,code:'account_timeout'})),5000);
  signal.addEventListener('abort',aborted,{once:true});
  if(signal.aborted)aborted();
  Promise.resolve(promise).then(value=>finish(resolve,value),error=>finish(reject,error));
 });
}
export async function authFetch(path,options={}){
 const transitions=authTransitions(),ticket=transitions.capture(),headers=new Headers(options.headers);
 const config=await boundedAuthWait(authSettings(),ticket.signal);transitions.assertCurrent(ticket);
 const provider=localStorage.getItem('myr5-login-provider');
 if(config.enabled&&provider==='clerk'){
  const clerk=await boundedAuthWait(loadLogin(),ticket.signal);transitions.assertCurrent(ticket);
  transitions.observeIdentity('clerk',clerk?.session?.id,clerk?.user?.id);transitions.assertCurrent(ticket);
  const token=await boundedAuthWait(clerk?.session?.getToken(),ticket.signal);
  transitions.observeIdentity('clerk',clerk?.session?.id,clerk?.user?.id);transitions.assertCurrent(ticket);
  if(!token)throw Object.assign(Error('Sign in to Coach again.'),{status:401});
  headers.set('Authorization','Bearer '+token);
 }
 transitions.assertCurrent(ticket);
 const signal=AbortSignal.any([ticket.signal,...(options.signal?[options.signal]:[]),AbortSignal.timeout(8000)]);
 const response=await fetch(path,{...options,signal,headers,credentials:'same-origin',cache:'no-store'});
 transitions.assertCurrent(ticket);return response;
}
export async function signOut(returnTo='/pose.html'){
 // Revoking credentials must not depend on synchronization or local storage.
 try{authTransitions().invalidate();}catch{}
 let provider,timer;try{provider=localStorage.getItem('myr5-login-provider');}catch{}
 try{
  await Promise.race([
   (async()=>{const clerk=window.Clerk||(provider==='clerk'?await loadLogin():null);await clerk?.signOut();})(),
   new Promise(resolve=>{timer=setTimeout(resolve,3000);}),
  ]);
 }catch{}finally{
  clearTimeout(timer);try{localStorage.removeItem('myr5-login-provider');}catch{}
  // Always clear the old platform session too, even when Clerk is unavailable.
  location.assign('/signout-with-chatgpt?return_to='+encodeURIComponent(safeReturn(returnTo)));
 }
}
