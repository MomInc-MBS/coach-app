// A prepared page keeps its workout lease until activation or an explicit abort.
// No timer silently releases the lease while a worker could still activate.
export function createUpdateParticipant({canPrepare,acquire,save,freeze,reload}){
 let held=null,preparing=null;
 function abort(id){if(held?.id!==id)return;const item=held;held=null;item.release();item.thaw?.();}
 async function message(data){
  const id=data?.id;if(typeof id!=='string'||!id)return {safe:false};
  if(data.type==='UPDATE_ABORT'){abort(id);return {safe:false};}
  if(data.type==='UPDATE_CONFIRM')return {safe:held?.id===id&&held.ready===true,protocol:2,id};
  if(data.type!=='UPDATE_SAFETY_CHECK')return {safe:false};
  if(held)return {safe:held.id===id&&held.ready===true,protocol:2,id};
  if(preparing||!canPrepare())return {safe:false};
  const release=acquire();if(!release)return {safe:false};
  const item={id,release,ready:false,thaw:null};held=item;
  try{
   item.thaw=freeze();preparing=Promise.resolve().then(save);await preparing;
   if(held!==item)return {safe:false};item.ready=true;
   return {safe:true,protocol:2,id};
  }catch{abort(id);return {safe:false};}finally{preparing=null;}
 }
 return {message,get prepared(){return !!held?.ready;},activated(){if(held?.ready){reload();return true;}return false;}};
}
