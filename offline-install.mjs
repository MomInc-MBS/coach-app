// Installation is ready only after the worker has saved the core offline app.
export async function prepareOfflineApp(serviceWorker=globalThis.navigator?.serviceWorker){
 if(!serviceWorker)throw Error('This browser cannot save Coach on this device. Open the installer in Chrome, Edge, or Safari.');
 const registration=await serviceWorker.register('/sw.js',{updateViaCache:'none'});
 const worker=registration.installing||registration.waiting||registration.active;
 if(!worker)throw Error('Coach could not finish downloading. Reconnect and retry.');
 await new Promise((resolve,reject)=>{
  function check(){
   if(['installed','activating','activated'].includes(worker.state)){worker.removeEventListener('statechange',check);resolve();}
   else if(worker.state==='redundant'){worker.removeEventListener('statechange',check);reject(Error('Coach could not be saved. Check your connection and free space, then retry.'));}
  }
  worker.addEventListener('statechange',check);check();
 });
 return registration;
}
