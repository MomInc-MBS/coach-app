const validScope=value=>typeof value?.user?.id==='string'&&value.user.id&&Number.isSafeInteger(value.dataEpoch)&&value.dataEpoch>0;
const same=(account,scope)=>account?.user?.id===scope.owner&&account?.dataEpoch===scope.epoch;
const choose=(previous,next)=>{
 if(!next||next.state==='unknown')return previous??next;
 if(!previous||!Number.isSafeInteger(previous.startedAt))return next;
 if(!Number.isSafeInteger(next.startedAt)||next.startedAt<previous.startedAt||next.startedAt===previous.startedAt&&String(next.observationId)<String(previous.observationId))return previous;
 return next;
};
// Optional cache observations cannot establish sign-in or replace core account
// data. This helper retains no persisted browser authority and never retries.
export function createAccountReadinessRefresh({api,transitions,getAccount,apply}){
 let generation=0;
 transitions.subscribe(()=>generation++);
 async function refresh(){
  const account=getAccount();if(!validScope(account))return false;
  const scope={owner:account.user.id,epoch:account.dataEpoch},number=++generation;
  let ticket;try{
   ticket=transitions.capture();const result=await api('/api/account/readiness');
   if(!transitions.isCurrent(ticket)||number!==generation||!same(getAccount(),scope)||result.targetAccountId!==scope.owner||result.dataEpoch!==scope.epoch)return false;
   const current=getAccount(),readiness={reminders:choose(current.readiness?.reminders,result.readiness?.reminders),training:choose(current.readiness?.training,result.readiness?.training)};
   // Preserve the last successful push configuration on an independent failure.
   const health=readiness.reminders,push=health?.push?{...current.push,...health.push,status:health.state}:result.push&&['ready','available'].includes(result.push.status)&&(!health||health.state==='unknown')?{...current.push,...result.push}:health?{...current.push,status:health.state}:current.push;
   apply({readiness,push},scope);return true;
  }catch{return false;} // Optional observation failure does not mark core data stale.
 }
 return {refresh};
}
