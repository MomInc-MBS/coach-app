import {decodeHandoff} from './onboarding-domain.mjs';
import {captureGala,mountGalaReturn,saveInstalledRun,prepareGalaInstall} from './gala-handoff.mjs';
try{captureGala();mountGalaReturn();}catch{}
import {readIncomingCoach,saveIncomingCoach} from './pending-coach.mjs';
import {isInstalled,setupAllowed} from './install-context.mjs';
import {prepareInstall} from './install-transfer.mjs';
import {prepareOfflineApp} from './offline-install.mjs';
const button=document.getElementById('installCoach'),status=document.getElementById('installStatus'),saved=document.getElementById('coachSaved');
const ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1),android=/Android/i.test(navigator.userAgent);
let prompt=null,ready=false;
function guide(){
 const steps=ios?['Tap Share, then Add to Home Screen.','Leave Open as Web App on if shown, then tap Add.','Open the MYR5 icon on your home screen.']:android?['Open the ⋮ menu and tap Install app or Add to Home screen.','Confirm, then open MYR5 from your home screen.']:['Use your browser’s install icon beside the address bar, or its Install app menu item.','Open MYR5 from your apps.'];
 const list=document.getElementById('installSteps');list.replaceChildren(...steps.map(text=>{const li=document.createElement('li');li.textContent=text;return li;}));
 document.getElementById('installHelp').hidden=!ios;document.getElementById('installGuide').hidden=false;
 status.textContent=ios?'Add Coach, then open its home-screen icon.':'Install Coach, then open it from your apps. If installation is unavailable, use Chrome or Edge.';
}
function installed(){prompt=null;button.hidden=true;document.getElementById('installGuide').hidden=true;status.textContent='Installed. Open MYR5 to start.';}
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();prompt=event;if(ready){button.textContent='Install Coach';status.textContent='Ready to install';}});
window.addEventListener('appinstalled',installed);
button.onclick=async()=>{if(!ready){await prepare();return;}if(!prompt){guide();return;}const current=prompt;prompt=null;try{await current.prompt();const choice=await current.userChoice;if(choice.outcome==='accepted')installed();else{status.textContent='Install cancelled';}}catch{guide();}};
async function prepare(){
 button.disabled=true;
 try{
  status.textContent='Saving Coach on this device…';
  try{await prepareGalaInstall();}catch{mountGalaReturn();}
  const raw=new URLSearchParams(location.hash.slice(1)).get('coach'),incoming=raw?saveIncomingCoach(decodeHandoff(raw)):readIncomingCoach();
  if(incoming){await prepareInstall(incoming);saved.textContent='Coach saved';}
  if(raw)history.replaceState(null,'',location.pathname+location.search);
  await prepareOfflineApp();
  ready=true;button.disabled=false;button.textContent=ios?'Add Coach to Home Screen':'Install Coach';status.textContent='';
  if(ios)guide();
 }catch(error){status.textContent=error.message;button.textContent='Retry';button.disabled=false;}
}
if(isInstalled()){await saveInstalledRun().catch(()=>{});setupAllowed();location.replace('/onboarding.html?from=install'+location.hash);}else await prepare();
