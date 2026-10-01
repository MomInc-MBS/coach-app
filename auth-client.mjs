import {authTransitions} from './auth-transition.mjs';
import {safeReturn} from './auth-paths.mjs';

let settingsPromise,settingsGen=0;
let clerkPromise=null; // shared init promise per attempt
let clerkGen=0; // generation nonce for init
let clerkIdentityListenerUnsub=null; // current unsubscribe function
let loginReadyDispatched=false;

export function authSettings({force=false}={}){
  if(force){settingsGen++; settingsPromise=null;}
  const gen=settingsGen;
  return settingsPromise ??=(async()=>{
    const res=await fetch(`/api/auth/config?t=${Date.now()}`,{credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(5000)});
    if(!res.ok)throw Object.assign(Error('Login could not connect. Please retry.'),{status:res.status,code:'auth-config'});
    return res.json();
  })().then(r=>{
    if(settingsGen===gen){
      if(r.enabled)settingsPromise=r; else settingsPromise=null;
    }
    return r;
  }).catch(e=>{if(settingsGen===gen){settingsPromise=null;}throw e;});
}

function script(src,key){return new Promise((resolve,reject)=>{
  const tag=document.createElement('script');
  tag.src=src;tag.crossOrigin='anonymous';
  if(key)tag.dataset.clerkPublishableKey=key;
  tag.onload=()=>{resolve();};
  tag.onerror=()=>reject(Error('Login could not load. Check your connection and retry.'));
  document.head.append(tag);
});}

export function loadLogin(){
  if (clerkPromise) return clerkPromise;
  const attemptGen = ++clerkGen;

  let deadlineTimer = null;
  const cleanup = () => {
    if (deadlineTimer) {
      clearTimeout(deadlineTimer);
      deadlineTimer = null;
    }
  };

  const attemptPromise = new Promise((resolve, reject) => {
    const timeoutReject = Object.assign(new Error('Account timed out'),{code:'account_timeout'});
    const raceInit = (async () => {
      try {
        let config;
        try {
          config = await authSettings();
          if (clerkGen !== attemptGen) throw timeoutReject;
        } catch (e) {
          cleanup();
          throw e;
        }

        if (!config.enabled) {
          cleanup();
          return null;
        }

        const origin = new URL(config.frontend).origin;
        await script(origin + '/npm/@clerk/ui@1/dist/ui.browser.js');
        if (clerkGen !== attemptGen) throw timeoutReject;

        await script(origin + '/npm/@clerk/clerk-js@6/dist/clerk.browser.js', config.publishableKey);
        if (clerkGen !== attemptGen) throw timeoutReject;

        const Clerk = window.Clerk;
        await Clerk.load({ ui: { ClerkUI: window.__internal_ClerkUICtor } });
        if (clerkGen !== attemptGen) throw timeoutReject;

        const clerk = Clerk;
        authTransitions().observeIdentity('clerk', clerk.session?.id, clerk.user?.id);

        if (clerkIdentityListenerUnsub) {
          clerkIdentityListenerUnsub();
          clerkIdentityListenerUnsub = null;
        }

        const observe = () => {
          if (clerkGen === attemptGen) {
            authTransitions().observeIdentity('clerk', clerk.session?.id, clerk.user?.id);
          }
        };

        clerkIdentityListenerUnsub = clerk.addListener(observe);

        if (!loginReadyDispatched) {
          window.dispatchEvent(new Event('myr5:login-ready'));
          loginReadyDispatched = true;
        }

        resolve(clerk);
      } catch (e) {
        cleanup();
        reject(e);
      }
    })();

    deadlineTimer = setTimeout(() => {
      if (clerkPromise === attemptPromise) {
        clerkGen++;
        cleanup();
        reject(timeoutReject);
      }
    }, 20000);

    raceInit.then(resolve, reject).finally(cleanup);
  });

  clerkPromise = attemptPromise;
  clerkPromise
    .then((value) => {cleanup(); if (value===null && clerkPromise===attemptPromise) clerkPromise=null;}, () => {
      cleanup();
      if (clerkPromise === attemptPromise) clerkPromise = null;
    });

  return attemptPromise;
}
function boundedAuthWait(promise,signal,timeoutMs=5000){
  return new Promise((resolve,reject)=>{
    let settled=false;
    const finish=(fn,value)=>{if(settled)return;settled=true;clearTimeout(timer);signal.removeEventListener('abort',aborted);fn(value);}
    const aborted=()=>finish(reject,Object.assign(Error('Account changed. Refresh to continue.'),{code:'auth_transition'}));
    const timer=setTimeout(()=>finish(reject,Object.assign(Error('Account service timed out. Please retry.'),{status:503,code:'account_timeout'})),timeoutMs);
    signal.addEventListener('abort',aborted,{once:true});
    if(signal.aborted)aborted();
    Promise.resolve(promise).then(value=>finish(resolve,value),error=>finish(reject,error));
  });
}

export async function authFetch(path,options={}){
  const transitions=authTransitions(),ticket=transitions.capture(),headers=new Headers(options.headers);
  const config=await boundedAuthWait(authSettings(),ticket.signal); // 5s timeout
  transitions.assertCurrent(ticket);
  const provider=localStorage.getItem('myr5-login-provider');
  if(config.enabled&&provider==='clerk'){
    const clerk=await boundedAuthWait(loadLogin(),ticket.signal,20000); // 20s timeout
    transitions.assertCurrent(ticket);
    transitions.observeIdentity('clerk',clerk?.session?.id,clerk?.user?.id);
    transitions.assertCurrent(ticket);
    const token=await boundedAuthWait(clerk?.session?.getToken(),ticket.signal); // 5s timeout
    transitions.observeIdentity('clerk',clerk?.session?.id,clerk?.user?.id);
    transitions.assertCurrent(ticket);
    if(!token)throw Object.assign(Error('Sign in to Coach again.'),{status:401});
    headers.set('Authorization','Bearer '+token);
  }
  transitions.assertCurrent(ticket);
  const signal=AbortSignal.any([ticket.signal,...(options.signal?[options.signal]:[]),AbortSignal.timeout(8000)]);
  const response=await fetch(path,{...options,signal,headers,credentials:'same-origin',cache:'no-store'});
  transitions.assertCurrent(ticket);return response;
}

export async function signOut(returnTo='/pose.html'){
  try{authTransitions().invalidate();}catch{}
  let provider,timer;try{provider=localStorage.getItem('myr5-login-provider');}catch{}
  try{
    await Promise.race([
      (async()=>{const clerk=window.Clerk||(provider==='clerk'?await loadLogin():null);await clerk?.signOut();})(),
      new Promise(resolve=>{timer=setTimeout(resolve,3000);}),
    ]);
  }catch{}finally{
    clearTimeout(timer);try{localStorage.removeItem('myr5-login-provider');}catch{}
    location.assign(safeReturn(returnTo));
  }
}
