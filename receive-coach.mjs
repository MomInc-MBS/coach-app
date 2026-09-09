import {WEBSITE} from './onboarding-domain.mjs';
export function receiveCoach(store){
 const source=window.opener;if(!source)return Promise.reject(Error('Return to the final website setup and tap Unlock again. Keep that page open while Coach loads.'));
 return new Promise((resolve,reject)=>{let interval,timer;
  const cleanup=()=>{clearInterval(interval);clearTimeout(timer);window.removeEventListener('message',message);};
  function message(event){if(event.origin!==WEBSITE||event.source!==source||event.data?.type!=='myr5:coach-transfer')return;try{const v=event.data.profile,raw=JSON.stringify(v);if(!v||new TextEncoder().encode(raw).length>55000)throw Error('This transfer is too large.');store(raw);source.postMessage({type:'myr5:coach-received'},WEBSITE);cleanup();resolve(v);}catch(e){cleanup();reject(e);}}
  window.addEventListener('message',message);const ready=()=>source.postMessage({type:'myr5:ready-for-coach'},WEBSITE);interval=setInterval(ready,700);timer=setTimeout(()=>{cleanup();reject(Error('Return to the website and tap Unlock again. Your saved answers are still there.'));},120000);ready();
 });
}
