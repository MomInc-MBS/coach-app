// This page has no module, sign-in, or cached-page dependency.
export const RECOVERY_HTML=String.raw`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Repair Coach</title>
<style>body{margin:0;min-height:100svh;display:grid;place-items:center;background:#241c35;color:#fff7de;font:17px/1.6 system-ui,sans-serif}main{max-width:420px;padding:32px;text-align:center}img{width:160px;height:160px;object-fit:contain}progress{display:block;width:100%;height:14px;accent-color:#edc866}button,a{font:inherit}button{padding:12px 24px;min-height:48px;background:#edc866;border:0;border-radius:8px;color:#241c35}a{color:#fff7de}button[hidden]{display:none}</style></head>
<body><main><img src="/icons/myr5-alien-192.png" alt="MYR5 Coach"><h1>Repairing Coach</h1><progress id="progress" max="100" aria-label="Coach download"></progress><p id="status" role="status">Connecting to the update…</p><p>Keep this page open. Your saved progress stays here.</p><button id="retry" hidden>Try again</button><noscript><p>Open this link in Chrome or Safari with JavaScript enabled.</p></noscript></main>
<script>
(()=>{'use strict';
const status=document.getElementById('status'),retry=document.getElementById('retry'),meter=document.getElementById('progress'),sw=navigator.serviceWorker;
let currentWorker;
sw?.addEventListener('message',event=>{
 if(event.data?.type==='UPDATE_SAFETY_CHECK'){event.ports[0]?.postMessage({safe:true});return;}
 if(event.data?.type!=='OFFLINE_PROGRESS'||event.source!==currentWorker)return;
 const p=event.data;if(!p.totalBytes)return;
 const percent=Math.min(99,Math.floor(100*p.bytes/p.totalBytes));meter.value=percent;
 status.textContent='Saving Coach on this device: '+percent+'% · '+p.files+' of '+p.totalFiles+' files. Large models can take a few minutes.';
});
function state(worker,allowed){return new Promise((resolve,reject)=>{
 const finish=error=>{clearTimeout(timer);worker.removeEventListener('statechange',check);error?reject(error):resolve();};
 const check=()=>{if(allowed.includes(worker.state))finish();else if(worker.state==='redundant')finish(Error('The download did not finish. Check your connection and free space, then try again.'));};
 const timer=setTimeout(()=>finish(Error('The download is taking longer than expected. Check your connection, then try again.')),20*60*1000);
 worker.addEventListener('statechange',check);check();
});}
function activate(worker){return new Promise((resolve,reject)=>{
 const channel=new MessageChannel();
 const finish=error=>{clearTimeout(timer);channel.port1.close();error?reject(error):resolve();};
 const timer=setTimeout(()=>finish(Error('Close the other Coach windows, keep this repair page open, then try again.')),10000);
 channel.port1.onmessage=event=>finish(event.data?.activated?null:Error('Close the other Coach windows, keep this repair page open, then try again.'));
 try{worker.postMessage({type:'PREPARE_UPDATE'},[channel.port2]);}catch(error){finish(error);}
});}
async function update(){
 retry.hidden=true;meter.removeAttribute('value');status.textContent='Connecting to the update…';
 try{
  if(!sw)throw Error('Open this repair link in Chrome, Edge, or Safari.');
  const reg=await sw.register('/sw.js',{updateViaCache:'none'});await reg.update();
  const worker=reg.installing||reg.waiting||reg.active;if(!worker)throw Error('Coach could not start downloading. Try again while online.');
  currentWorker=worker;worker.postMessage({type:'OFFLINE_STATUS'});
  status.textContent='Downloading the complete Coach app. Large models can take a few minutes.';
  await state(worker,['installed','activating','activated']);
  if(reg.waiting){status.textContent='Applying the repair…';await activate(reg.waiting);}
  await state(worker,['activated']);
  meter.value=100;status.textContent='Coach is ready. Opening your app…';
  location.replace('/pose.html?panel=install&update=repaired');
 }catch(error){status.textContent=error.message;retry.hidden=false;}
}
retry.onclick=update;update();
})();
</script></body></html>`;
