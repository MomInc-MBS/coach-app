export const UPDATE_IDLE_MS=15000;
export const RELEASE_SEEN_KEY='myr5-release-seen-v1';

export function safeToUpdate({tracking=false,rest=false,dialog=false,editing=false,hidden=false,online=true,lastInteraction=0,now=Date.now(),automatic=true}={}){
 return !tracking&&!rest&&!dialog&&!editing&&!hidden&&online&&(!automatic||now-lastInteraction>=UPDATE_IDLE_MS);
}

export function releaseNotice(storage,id){
 let seen=false;
 try{seen=storage.getItem(RELEASE_SEEN_KEY)===id;}catch{}
 return {get visible(){return !seen;},dismiss(){seen=true;try{storage.setItem(RELEASE_SEEN_KEY,id);}catch{}}};
}

export function requestActivation(worker,{timeout=10000}={}){
 return new Promise((resolve,reject)=>{
  const channel=new MessageChannel();
  const finish=(error)=>{clearTimeout(timer);channel.port1.close();error?reject(error):resolve();};
  const timer=setTimeout(()=>finish(Error('Coach is still preparing the update. It will retry automatically.')),timeout);
  channel.port1.onmessage=event=>finish(event.data?.activated?null:Error('Coach is waiting for another session to finish saving. It will retry automatically.'));
  try{worker.postMessage({type:'PREPARE_UPDATE'},[channel.port2]);}catch(error){finish(error);}
 });
}
