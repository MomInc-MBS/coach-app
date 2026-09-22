const changed=()=>Object.assign(Error('Account changed. Refresh the War Room before saving.'),{code:'account_scope_changed'});
// Scope comes only from an authenticated, epoch-consistent room read. It never
// refreshes or relabels a pending body when the account generation changes.
export function createWarRoomApi({request,transitions}){
 let scope=null,readGeneration=0;
 const clear=()=>{scope=null;readGeneration++;};
 transitions.subscribe(clear);
 async function api(path,options={}){
  const ticket=transitions.capture(),method=(options.method||'GET').toUpperCase();
  const roomRead=path==='/api/war-room'&&method==='GET',write=path.startsWith('/api/war-room/')&&!['GET','HEAD'].includes(method);
  const expected=scope,generation=roomRead?++readGeneration:readGeneration,headers=new Headers(options.headers);
  if(roomRead)scope=null;
  if(write){if(!expected)throw changed();headers.set('X-Target-Account',expected.owner);headers.set('X-Expected-Data-Epoch',String(expected.epoch));}
  const response=await request(path,{...options,method,headers,signal:ticket.signal,credentials:'same-origin',cache:'no-store'});
  transitions.assertCurrent(ticket);
  const value=await response.json();transitions.assertCurrent(ticket);
  if((roomRead&&generation!==readGeneration)||(write&&scope!==expected))throw changed();
  if(!response.ok)throw Object.assign(Error(value.error||'The War Room service is unavailable.'),{status:response.status,code:value.code});
  if(roomRead){if(typeof value.targetAccountId!=='string'||!value.targetAccountId||!Number.isSafeInteger(value.dataEpoch)||value.dataEpoch<1)throw changed();scope=Object.freeze({owner:value.targetAccountId,epoch:value.dataEpoch});}
  return value;
 }
 return {api,clear};
}
