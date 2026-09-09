import {decodeHandoff} from './onboarding-domain.mjs';
import {readIncomingCoach,saveIncomingCoach} from './pending-coach.mjs';
const button=document.getElementById('installCoach'),status=document.getElementById('installStatus'),saved=document.getElementById('coachSaved'),next=document.getElementById('continueCoach');
let prompt=null;
function guide(){
 const ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
 const android=/Android/i.test(navigator.userAgent);
 const steps=ios?['Open this page in Safari. Tap Share.','Choose Add to Home Screen. Leave Open as Web App on if shown, then tap Add.']:android?['Open this page in Chrome and tap the ⋮ menu.','Tap Install app or Add to Home screen, then confirm.']:['Open your browser’s menu or look for the install icon beside the address bar.','Choose Install MYR5 Coach. You can also continue in your browser.'];
 const list=document.getElementById('installSteps');list.replaceChildren(...steps.map(text=>{const li=document.createElement('li');li.textContent=text;return li;}));
 document.getElementById('installHelp').hidden=!ios;document.getElementById('installGuide').hidden=false;
 status.textContent=ios?'Use Safari’s Share menu to add Coach.':'If no install option appears, you can use Coach in this browser.';
}
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();prompt=event;button.textContent='Install Coach';status.textContent='Ready to add Coach to your home screen.';});
window.addEventListener('appinstalled',()=>{prompt=null;button.hidden=true;status.textContent='Coach is installed. Continue below to connect your saved coach.';});
button.onclick=async()=>{if(!prompt){guide();return;}const current=prompt;prompt=null;try{await current.prompt();const choice=await current.userChoice;status.textContent=choice.outcome==='accepted'?'Coach is installing. Continue below to connect your saved coach.':'You can install later or continue in your browser.';}catch{guide();}};
try{
 const raw=new URLSearchParams(location.hash.slice(1)).get('coach');
 const incoming=raw?saveIncomingCoach(decodeHandoff(raw)):readIncomingCoach();
 if(raw)history.replaceState(null,'',location.pathname+location.search);
 if(incoming){saved.textContent='Your coach and website choices are saved in this browser.';next.textContent='Continue with my coach →';}
 if(matchMedia('(display-mode: standalone)').matches||navigator.standalone===true){button.hidden=true;status.textContent='Coach is already running as an app.';}
 else if(/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1)){button.textContent='Add Coach to Home Screen';guide();}
}catch(error){saved.textContent=error.message;next.textContent='Return to my creature studio';next.href='https://mominc-mbs.github.io/tv/assets/armie-intro/creature-tv.html';}
if('serviceWorker'in navigator)navigator.serviceWorker.register('/sw.js',{updateViaCache:'none'}).then(reg=>{reg.waiting?.postMessage({type:'SKIP_WAITING'});reg.addEventListener('updatefound',()=>{const worker=reg.installing;worker?.addEventListener('statechange',()=>{if(worker.state==='installed')worker.postMessage({type:'SKIP_WAITING'});});});}).catch(()=>{});
