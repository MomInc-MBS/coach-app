const fail=code=>{throw Object.assign(Error('Account changed. Refresh before continuing.'),{code});};
function scope(account){
 if(typeof account?.user?.id!=='string'||!account.user.id||!Number.isSafeInteger(account.dataEpoch)||account.dataEpoch<1)fail('account_scope_unavailable');
 return Object.freeze({ownerId:account.user.id,dataEpoch:account.dataEpoch});
}
const headers=target=>({'X-Target-Account':target.ownerId,'X-Expected-Data-Epoch':String(target.dataEpoch)});
export function createAccountSessionActions({api,transitions}){
 const fresh=async(target,ticket)=>{
  transitions.assertCurrent(ticket);
  const live=scope(await api('/api/account?core=1'));
  transitions.assertCurrent(ticket);
  if(live.ownerId!==target.ownerId||live.dataEpoch!==target.dataEpoch)fail('account_scope_changed');
 };
 const receipt=(result,target)=>{if(result?.targetAccountId!==target.ownerId||result?.dataEpoch!==target.dataEpoch)fail('invalid_breathing_receipt');};
 return Object.freeze({
  async saveOnboarding(displayedAccount,value){
   const target=scope(displayedAccount),ticket=transitions.capture(),revision=displayedAccount.onboarding?.revision??0,data=structuredClone(value);
   if(!Number.isSafeInteger(revision)||revision<0)fail('invalid_onboarding_revision');
   await fresh(target,ticket);transitions.assertCurrent(ticket);
   const result=await api('/api/onboarding','PUT',{data,revision},headers(target));
   transitions.assertCurrent(ticket);return Object.freeze({result,ownerId:target.ownerId,dataEpoch:target.dataEpoch,transitionTicket:ticket});
  },
  async startBreathing(displayedAccount){
   const target=scope(displayedAccount),ticket=transitions.capture();
   await fresh(target,ticket);transitions.assertCurrent(ticket);
   const result=await api('/api/breathing/start','POST',{},headers(target));
   transitions.assertCurrent(ticket);receipt(result,target);
   if(typeof result.id!=='string'||!result.id||result.id.length>128||!Number.isSafeInteger(result.startedAt)||result.startedAt<0||!Number.isSafeInteger(result.durationMs)||result.durationMs<=0)fail('invalid_breathing_ticket');
   return Object.freeze({id:result.id,startedAt:result.startedAt,durationMs:result.durationMs,...target,transitionTicket:ticket});
  },
  async completeBreathing(binding,activeMs){
   if(!binding||typeof binding.id!=='string'||!Number.isFinite(activeMs)||activeMs<0)fail('invalid_breathing_ticket');
   const target=scope({user:{id:binding.ownerId},dataEpoch:binding.dataEpoch}),ticket=binding.transitionTicket;
   await fresh(target,ticket);transitions.assertCurrent(ticket);
   const result=await api('/api/breathing/complete','POST',{id:binding.id,activeMs},headers(target));
   transitions.assertCurrent(ticket);receipt(result,target);return result;
  },
 });
}
