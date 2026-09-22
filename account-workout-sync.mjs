// Legacy account queue only. Never reads or drains the guest Dexie outbox.
export const accountPendingKey=owner=>`myr5-pending-sets:${owner}`;
const TICKET_KEY='myr5-server-workout-tickets-v1',UNBOUND_KEY='myr5-unbound-server-completions-v1';
const failure=code=>Object.assign(Error('Your round is waiting for account reconciliation.'),{code});
const scope=value=>value?.user?.id&&Number.isSafeInteger(value.dataEpoch)&&value.dataEpoch>0?{owner:value.user.id,epoch:value.dataEpoch}:null;
export function validateAccountDeletionReceipt(value,owner,requestedEpoch){
 if(!value||value.ownerId!==owner||value.deletedEpoch!==requestedEpoch||typeof value.alreadyDeleted!=='boolean'||value.deleted!==!value.alreadyDeleted||!Number.isSafeInteger(requestedEpoch)||requestedEpoch<1||!Number.isSafeInteger(value.currentDataEpoch)||!Number.isSafeInteger(value.deletedThroughEpoch)||value.deletedThroughEpoch<requestedEpoch||value.currentDataEpoch!==value.deletedThroughEpoch+1||(!value.alreadyDeleted&&value.deletedThroughEpoch!==requestedEpoch))throw failure('invalid_account_deletion_receipt');
 return value.deletedThroughEpoch;
}
export function createAccountWorkoutSync({storage,api,transitions,getAccount,publishProgress}){
 const read=(key,fallback)=>{try{const value=storage.getItem(key);return value===null?fallback:JSON.parse(value);}catch{throw failure('account_queue_unavailable');}};
 const write=(key,value)=>{try{const text=JSON.stringify(value);storage.setItem(key,text);if(storage.getItem(key)!==text)throw Error();}catch{throw failure('account_queue_unavailable');}};
 const pending=owner=>{const rows=read(accountPendingKey(owner),[]);if(!Array.isArray(rows))throw failure('account_queue_unavailable');return rows;};
 const assertScope=(ticket,expected)=>{transitions.assertCurrent(ticket);const selected=scope(getAccount());if(!selected||selected.owner!==expected.owner||selected.epoch!==expected.epoch)throw failure('account_scope_changed');};
 const fresh=async(ticket,expected)=>{assertScope(ticket,expected);const value=await api('/api/account?core=1');assertScope(ticket,expected);const live=scope(value);if(!live||live.owner!==expected.owner||live.epoch!==expected.epoch)throw failure('account_scope_changed');return value;};
 let flushing;
 async function drain(){
  const selected=scope(getAccount());if(!selected)return;
  const ticket=transitions.capture(),queue=pending(selected.owner);
  for(const item of queue){
   assertScope(ticket,selected);
   // Old untagged completions remain parked; never label them with today's epoch.
   if(!item||item.targetAccountId!==selected.owner||item.targetDataEpoch!==selected.epoch)throw failure('account_queue_unbound');
   await fresh(ticket,selected);assertScope(ticket,selected);
   const {targetAccountId,targetDataEpoch,...body}=item;
   const response=await api('/api/workouts/complete','POST',body,{'X-Target-Account':targetAccountId,'X-Expected-Data-Epoch':String(targetDataEpoch)});
   assertScope(ticket,selected);
   if(response?.targetAccountId!==targetAccountId||response?.dataEpoch!==targetDataEpoch)throw failure('invalid_completion_receipt');
   if(!response?.progress||!Number.isSafeInteger(response.progress.completedSets)||response.progress.completedSets<0||!Number.isSafeInteger(response.progress.xp)||response.progress.xp<0)throw failure('invalid_completion_response');
   const latest=pending(selected.owner),index=latest.findIndex(row=>row.id===item.id);
   if(index<0)continue;
   if(JSON.stringify(latest[index])!==JSON.stringify(item))throw failure('account_queue_changed');
   write(accountPendingKey(selected.owner),latest.filter((_,i)=>i!==index));
   assertScope(ticket,selected);publishProgress({...response.progress,lastSyncedWorkoutId:item.id});
  }
 }
 const flush=()=>flushing??=(async()=>{try{return await drain();}finally{flushing=null;}})();
 return Object.freeze({
  pending,flush,
  forgetDeletedAccount(owner,deletedThroughEpoch){
   if(typeof owner!=='string'||!owner||!Number.isSafeInteger(deletedThroughEpoch)||deletedThroughEpoch<1)throw failure('invalid_account_deletion_receipt');
   const covered=row=>row?.targetAccountId===owner&&Number.isSafeInteger(row.targetDataEpoch)&&row.targetDataEpoch>0&&row.targetDataEpoch<=deletedThroughEpoch;
   const tickets=read(TICKET_KEY,{});if(!tickets||typeof tickets!=='object'||Array.isArray(tickets))throw failure('account_queue_unavailable');
   write(accountPendingKey(owner),pending(owner).filter(row=>!covered(row)));
   write(TICKET_KEY,Object.fromEntries(Object.entries(tickets).filter(([,ticket])=>!covered(ticket))));
  },
  async start(mode,goal){
   const selected=scope(getAccount());if(!selected)throw failure('account_scope_changed');
   const ticket=transitions.capture();await flush();assertScope(ticket,selected);await fresh(ticket,selected);
   const result=await api('/api/workouts/start','POST',{mode,goal},{'X-Target-Account':selected.owner,'X-Expected-Data-Epoch':String(selected.epoch)});
   assertScope(ticket,selected);
   if(typeof result.id!=='string'||!result.id||result.id.length>128||!Number.isSafeInteger(result.startedAt)||result.startedAt<0||result.targetAccountId!==selected.owner||result.dataEpoch!==selected.epoch)throw failure('invalid_workout_ticket');
   const tickets=read(TICKET_KEY,{});
   if(!tickets||typeof tickets!=='object'||Array.isArray(tickets)||Object.hasOwn(tickets,result.id))throw failure('account_ticket_conflict');
   Object.defineProperty(tickets,result.id,{value:{id:result.id,targetAccountId:selected.owner,targetDataEpoch:selected.epoch,startedAt:result.startedAt},enumerable:true,writable:true,configurable:true});
   write(TICKET_KEY,tickets);return result;
  },
  async complete(data){
   const selected=scope(getAccount());if(!selected)throw failure('account_scope_changed');
   const ticket=transitions.capture(),tickets=read(TICKET_KEY,{}),binding=Object.hasOwn(tickets,data.id)?tickets[data.id]:null;
   if(binding&&(binding.targetAccountId!==selected.owner||binding.targetDataEpoch!==selected.epoch))throw failure('account_scope_changed');
   if(!binding){const unbound=read(UNBOUND_KEY,[]);if(!Array.isArray(unbound))throw failure('account_queue_unavailable');if(!unbound.some(row=>row.id===data.id)){assertScope(ticket,selected);write(UNBOUND_KEY,[...unbound,{id:data.id,value:data.value,...(data.active===undefined?{}:{active:data.active})}]);}throw failure('account_queue_unbound');}
   const queue=pending(selected.owner);
   if(!queue.some(row=>row.id===data.id)){
    // An unrecognized legacy ticket is retained without invented account epoch.
    const item={id:data.id,value:data.value,...(data.active===undefined?{}:{active:data.active}),...(binding?{targetAccountId:binding.targetAccountId,targetDataEpoch:binding.targetDataEpoch}:{})};
    assertScope(ticket,selected);write(accountPendingKey(selected.owner),[...queue,item]);
   }
   await flush();assertScope(ticket,selected);
   if(pending(selected.owner).some(row=>row.id===data.id))throw failure('account_completion_pending');
  },
 });
}
