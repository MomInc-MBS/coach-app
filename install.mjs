import {decodeHandoff} from './onboarding-domain.mjs';
import {readIncomingCoach,saveIncomingCoach} from './pending-coach.mjs';
import {isInstalled,setupAllowed} from './install-context.mjs';
import {prepareInstall} from './install-transfer.mjs';
const button=document.getElementById('installCoach'),status=document.getElementById('installStatus'),saved=document.getElementById('coachSaved');
const ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1),android=/Android/i.test(navigator.userAgent);
let prompt=null,ready=false;
function guide(){
 const steps=ios?['Tap Share, then Add to Home Screen.','Leave Open as Web App on if shown, then tap Add.','Open the MYR5 icon on your home screen.']:android?['Open the ⋮ menu and tap Install app or Add to Home screen.','Confirm, then open MYR5 from your home screen.']:['Use your browser’s install icon beside the address bar, or its Install app menu item.','Open MYR5 from your apps.'];
 const list=document.getElementById('installSteps');list.replaceChildren(...steps.map(text=>{const li=document.createElement('li');li.textContent=text;return li;}));
 document.getElementById('installHelp').hidden=!ios;document.getElementById('installGuide').hidden=false;
 status.textContent=ios?'Add Coach, then open its home-screen icon.':'Install Coach, then open it from your apps. If installation is unavailable, use Chrome or Edge.';
}
function installed(){prompt=null;button.hidden=true;document.getElementById('installGuide').hidden=true;status.textContent='Installed. Open the MYR5 icon to finish your three-question setup.';}
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();prompt=event;if(ready){button.textContent='Install Coach';status.textContent='Ready to add Coach to your home screen.';}});
window.addEventListener('appinstalled',installed);
button.onclick=async()=>{if(!ready){await prepare();return;}if(!prompt){guide();return;}const current=prompt;prompt=null;try{await current.prompt();const choice=await current.userChoice;if(choice.outcome==='accepted')installed();else{status.textContent='Installation was cancelled. Tap Install Coach when you’re ready.';}}catch{guide();}};
async function prepare(){
 button.disabled=true;
 try{
  const raw=new URLSearchParams(location.hash.slice(1)).get('coach'),incoming=raw?saveIncomingCoach(decodeHandoff(raw)):readIncomingCoach();
  if(incoming){await prepareInstall(incoming);saved.textContent='Your saved coach is ready to come with you.';}
  if(raw)history.replaceState(null,'',location.pathname+location.search);
  ready=true;button.disabled=false;button.textContent=ios?'Add Coach to Home Screen':'Install Coach';status.textContent='Install now. Setup comes after you open the app.';
  if(ios)guide();
 }catch(error){status.textContent=error.message;button.textContent='Retry';button.disabled=false;}
}
if(isInstalled()){setupAllowed();location.replace('/onboarding.html?from=install'+location.hash);}else await prepare();
if('serviceWorker'in navigator)navigator.serviceWorker.register('/sw.js',{updateViaCache:'none'}).then(reg=>{reg.waiting?.postMessage({type:'SKIP_WAITING'});reg.addEventListener('updatefound',()=>{const worker=reg.installing;worker?.addEventListener('statechange',()=>{if(worker.state==='installed')worker.postMessage({type:'SKIP_WAITING'});});});}).catch(()=>{});
