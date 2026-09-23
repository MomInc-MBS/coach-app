// Standalone customizer auth bridge. Never infer an account from URL or browser storage.
const ACCOUNT_URL='/api/account?core=1';
const OWNER_ID=/^[A-Za-z0-9](?:[A-Za-z0-9._:-]{0,127})$/;
let generation=0,controller=null,disposed=false,publishing=false,account=null;

function clearAccount(){
 account=null;window.myr5AuthenticatedAccount=null;
 publishing=true;window.dispatchEvent(new Event('myr5:account-cleared'));publishing=false;
}
function current(run){return !disposed&&run===generation;}
async function readAccount(signal){
 const response=await fetch(ACCOUNT_URL,{credentials:'same-origin',cache:'no-store',redirect:'manual',signal,headers:{Accept:'application/json'}});
 if(!response.ok||response.redirected||response.type==='opaqueredirect'||!response.headers.get('content-type')?.toLowerCase().includes('application/json'))throw Error('Account unavailable');
 const value=await response.json();
 if(!value||typeof value!=='object'||Array.isArray(value)||!value.user||typeof value.user!=='object'||!OWNER_ID.test(value.user.id)||!Number.isSafeInteger(value.dataEpoch)||value.dataEpoch<1)throw Error('Invalid account snapshot');
 return value;
}
async function hydrate(){
 const run=++generation;controller?.abort();controller=new AbortController();const {signal}=controller;
 try{
  const first=await readAccount(signal);if(!current(run))return;
  const verified=await readAccount(signal);if(!current(run))return;
  if(first.user.id!==verified.user.id||first.dataEpoch!==verified.dataEpoch)throw Error('Account changed during verification');
  account=verified;window.myr5AuthenticatedAccount=verified;
  publishing=true;window.dispatchEvent(new CustomEvent('myr5:account-ready',{detail:verified}));publishing=false;
 }catch{
  if(current(run)){controller=null;clearAccount();}
 }
}
window.addEventListener('myr5:account-ready',event=>{
 if(publishing&&event.detail===account)return;
 ++generation;controller?.abort();controller=null;clearAccount();void hydrate();
});
window.addEventListener('myr5:account-cleared',()=>{
 if(publishing)return;
 ++generation;controller?.abort();controller=null;clearAccount();
});
window.addEventListener('pagehide',()=>{disposed=true;++generation;controller?.abort();controller=null;account=null;window.myr5AuthenticatedAccount=null;},{once:true});
void hydrate();
