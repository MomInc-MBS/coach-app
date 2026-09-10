// A browser subscription alone does not prove it belongs to the signed-in account.
export function notificationBinding(api){
 let binding=null,checkedAt=0;
 return {
  ready(user){return !!user&&binding?.user===user&&Date.now()-checkedAt<90000;},
  forget(){binding=null;checkedAt=0;},
  async verify(account,subscription){
   if(!account?.onboarding||!subscription){this.forget();return false;}
   const user=account.user.id,endpoint=subscription.endpoint;
   if(binding?.user===user&&binding.endpoint===endpoint&&Date.now()-checkedAt<60000)return true;
   this.forget();await api('/api/push/subscribe','POST',subscription.toJSON());binding={user,endpoint};checkedAt=Date.now();return true;
  }
 };
}
