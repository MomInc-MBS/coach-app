// Never-throw network helper for coach paths: timeout, 5xx and offline all resolve to {ok:false,fallback}.
// After a failure the net is treated as down for COOLDOWN ms (no 5 s waits on every cue); then the next call probes again.
const COOLDOWN=10000;let downUntil=0;
if(typeof window!=='undefined')window.addEventListener('online',()=>{downUntil=0;});
export const coachOnline=(now=Date.now())=>now>=downUntil&&globalThis.navigator?.onLine!==false;
export const resetCoachNet=()=>{downUntil=0;};
const down=fallback=>({ok:false,data:fallback,fallback:true});
export async function coachFetch(url,opts={},{timeoutMs=8000,fallback=null,parse='json',local=false,retry=0,backoffMs=400,fetchImpl=globalThis.fetch}={}){
 if(local){ // downloaded packs answer from the Cache API even when the network is down
  try{const hit=await globalThis.caches?.match(url);if(hit?.ok)return {ok:true,data:parse==='response'?hit:await hit[parse](),fallback:false,status:200};}catch{}
 }
 if(!coachOnline())return down(fallback);
 for(let attempt=0;;attempt++){
  // Plain controller + timer: AbortSignal.any is missing before Safari 17.4 and would mute every older iPhone.
  const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),timeoutMs),relay=()=>ctl.abort();
  opts.signal?.addEventListener('abort',relay,{once:true});
  try{
   const response=await fetchImpl(url,{...opts,signal:ctl.signal});
   if(response.status<500){ // 4xx is an answer, not an outage
    const data=!response.ok?fallback:parse==='response'?response:await response[parse]();
    downUntil=0;return {ok:response.ok,data,fallback:!response.ok,status:response.status};
   }
  }catch(error){if(opts.signal?.aborted)return down(fallback);}
  finally{clearTimeout(timer);opts.signal?.removeEventListener('abort',relay);}
  if(attempt>=retry)break;
  await new Promise(r=>setTimeout(r,backoffMs));
 }
 downUntil=Date.now()+COOLDOWN;return down(fallback);
}
