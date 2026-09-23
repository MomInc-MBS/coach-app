// Standalone customizer auth bridge. Never infer an account from URL or browser storage.
import {authFetch} from '/auth-client.mjs';
import {authTransitions} from '/auth-transition.mjs';
const ACCOUNT_URL='/api/account?core=1';
const OWNER_ID=/^[A-Za-z0-9](?:[A-Za-z0-9._:-]{0,127})$/;
let generation=0,controller=null,disposed=false,publishing=false,account=null;
const transitions=authTransitions();

function clearAccount(){
 account=null;window.myr5AuthenticatedAccount=null;
 publishing=true;window.dispatchEvent(new Event('myr5:account-cleared'));publishing=false;
}
function current(run){return !disposed&&run===generation;}
async function readAccount(signal){
 const response=await authFetch(ACCOUNT_URL,{redirect:'manual',signal,headers:{Accept:'application/json'}});
 if(!response.ok||response.redirected||response.type==='opaqueredirect'||!response.headers.get('content-type')?.toLowerCase().includes('application/json'))throw Error('Account unavailable');
 const value=await response.json();
 if(!value||typeof value!=='object'||Array.isArray(value)||!value.user||typeof value.user!=='object'||typeof value.user.id!=='string'||!OWNER_ID.test(value.user.id)||!Number.isSafeInteger(value.dataEpoch)||value.dataEpoch<1)throw Error('Invalid account snapshot');
 return value;
}
async function hydrate(){
 if(disposed)return;
 const run=++generation;controller?.abort();controller=new AbortController();const {signal}=controller;
 clearAccount();
 try{
  const ticket=transitions.capture();
  const first=await readAccount(signal);if(!current(run))return;
  transitions.assertCurrent(ticket);
  const verified=await readAccount(signal);if(!current(run))return;
  transitions.assertCurrent(ticket);
  if(first.user.id!==verified.user.id||first.dataEpoch!==verified.dataEpoch)throw Error('Account changed during verification');
  account=verified;window.myr5AuthenticatedAccount=verified;
  publishing=true;window.dispatchEvent(new CustomEvent('myr5:account-ready',{detail:verified}));publishing=false;
 }catch{
  if(current(run)){controller=null;clearAccount();}
 }
}
function invalidate(){++generation;controller?.abort();controller=null;clearAccount();}
// Logout invalidates before its network request finishes: do not immediately
// rehydrate against the old session cookie. A later focus/ready retries safely.
const unsubscribe=transitions.subscribe(invalidate);
window.addEventListener('myr5:account-ready',event=>{
 if(publishing&&event.detail===account)return;
 ++generation;controller?.abort();controller=null;clearAccount();void hydrate();
});
window.addEventListener('myr5:account-cleared',()=>{
 if(publishing)return;
 ++generation;controller?.abort();controller=null;clearAccount();
});
window.addEventListener('focus',()=>{void hydrate();});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')void hydrate();});
window.addEventListener('pagehide',()=>{disposed=true;unsubscribe();invalidate();},{once:true});
void hydrate();
