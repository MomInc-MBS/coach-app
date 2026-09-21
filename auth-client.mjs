import {safeReturn} from './auth-paths.mjs';
let settingsPromise,clerkPromise;
export function authSettings(){return settingsPromise??=fetch('/api/auth/config',{credentials:'same-origin',cache:'no-store'}).then(async r=>{if(!r.ok)throw Object.assign(Error('Login could not connect. Please retry.'),{status:r.status,code:'auth-config'});return r.json();}).catch(e=>{settingsPromise=null;throw e;});}
function script(src,key){return new Promise((resolve,reject)=>{const tag=document.createElement('script');tag.src=src;tag.crossOrigin='anonymous';if(key)tag.dataset.clerkPublishableKey=key;tag.onload=resolve;tag.onerror=()=>reject(Error('Login could not load. Check your connection and retry.'));document.head.append(tag);});}
export function loadLogin(){return clerkPromise??=(async()=>{const config=await authSettings();if(!config.enabled)return null;const origin=new URL(config.frontend).origin;await script(origin+'/npm/@clerk/ui@1/dist/ui.browser.js');await script(origin+'/npm/@clerk/clerk-js@6/dist/clerk.browser.js',config.publishableKey);await window.Clerk.load({ui:{ClerkUI:window.__internal_ClerkUICtor}});return window.Clerk;})().catch(e=>{clerkPromise=null;throw e;});}
export async function authFetch(path,options={}){
  const headers=new Headers(options.headers);const config=await authSettings();
  // Legacy users can continue without loading a new identity. A new login only
  // takes over after the user deliberately chooses it on the sign-in page.
  if(config.enabled&&localStorage.getItem('myr5-login-provider')==='clerk'){
    const clerk=await loadLogin(),token=await clerk?.session?.getToken();
    if(!token)throw Object.assign(Error('Sign in to Coach again.'),{status:401});
    headers.set('Authorization','Bearer '+token);
  }
  return fetch(path,{...options,headers,credentials:'same-origin',cache:'no-store'});
}
export async function signOut(returnTo='/pose.html'){
  if(localStorage.getItem('myr5-login-provider')==='clerk'){
    const clerk=await loadLogin();await clerk?.signOut();
  }
  localStorage.removeItem('myr5-login-provider');
  // Clear the old platform session too, so sign-out never switches accounts.
  location.assign('/signout-with-chatgpt?return_to='+encodeURIComponent(safeReturn(returnTo)));
}
