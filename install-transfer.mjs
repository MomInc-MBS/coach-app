import {readIncomingCoach,saveIncomingCoach} from './pending-coach.mjs';
export async function prepareInstall(data,fetcher=fetch){
 const response=await fetcher('/api/install-draft',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({data})});
 if(!response.ok)throw Error('Your coach could not be prepared for installation. Please retry.');
}
export async function restoreInstall(fetcher=fetch,session=sessionStorage,local=localStorage,{signal}={}){
 const response=await fetcher('/api/install-draft',{credentials:'same-origin',cache:'no-store',signal});
 if(!response.ok)throw Object.assign(Error('Could not bring your coach into the app. Check your connection and retry.'),{status:response.status});
 const {data}=await response.json();signal?.throwIfAborted();
 if(data){saveIncomingCoach(data,session,local);await fetcher('/api/install-draft',{method:'DELETE',credentials:'same-origin',signal});return data;}
 return readIncomingCoach(session,local);
}
