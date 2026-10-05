// Standalone pages obtain ownership only from a verified account read. They do
// not treat device appearance, a cached ID or a login-provider flag as identity.
import {authFetch} from './auth-client.mjs';
import {mergeVerifiedPerformance} from './performance-progress.mjs';
import {authTransitions} from './auth-transition.mjs';
export function createStandaloneAccountContext({request=authFetch,transitions=authTransitions(),target=globalThis.window??globalThis,timeoutMs=8000}={}){
 let active=null,generation=0,disposed=false;
 const emit=(name,detail)=>{const event=new Event(name);if(detail!==undefined)Object.defineProperty(event,'detail',{value:detail});target.dispatchEvent?.(event);};
 function clear(){generation++;active=null;target.myr5AuthenticatedAccount=null;target.coachEntitlements=null;target.coachProgress=null;emit('myr5:account-cleared');}
 clear();const unsubscribe=transitions.subscribe(clear);
 async function read({ticket=transitions.capture()}={}){
  const current=++generation,controller=new AbortController();let timer;
  const deadline=new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Object.assign(Error('Account service timed out.'),{code:'account_timeout'}));},timeoutMs);});
  try{
   const response=await Promise.race([request('/api/account?core=1',{signal:AbortSignal.any([ticket.signal,controller.signal]),credentials:'same-origin',cache:'no-store'}),deadline]);
   transitions.assertCurrent(ticket);if(disposed||current!==generation)return null;
   if(!response.ok||response.redirected||!response.headers?.get('content-type')?.includes('application/json'))throw Error('Verified account unavailable.');
   const account=await Promise.race([response.json(),deadline]);transitions.assertCurrent(ticket);
   if(disposed||current!==generation)return null;
   if(typeof account?.user?.id!=='string'||!account.user.id||account.user.id.length>128||!Number.isSafeInteger(account.dataEpoch)||account.dataEpoch<1)throw Error('Invalid verified account.');
   if(active&&(active.user.id!==account.user.id||active.dataEpoch!==account.dataEpoch)){transitions.invalidate();return null;}
   mergeVerifiedPerformance(account);active=account;target.myr5AuthenticatedAccount=account;target.coachEntitlements=account.entitlements??null;target.coachProgress=account.progress??null;emit('myr5:account-ready',account);return account;
  }catch{
   if(!disposed&&current===generation&&transitions.isCurrent(ticket))clear();return null;
  }finally{clearTimeout(timer);controller.abort();}
 }
 async function refresh(){try{return await read({ticket:transitions.beginRefresh()});}catch{if(!disposed)clear();return null;}}
 return {read,refresh,clear,get account(){return active;},dispose(){disposed=true;generation++;unsubscribe?.();}};
}
