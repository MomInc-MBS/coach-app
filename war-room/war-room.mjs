import {createStandaloneAccountContext} from '../standalone-account-context.mjs';
import {authFetch} from '../auth-client.mjs';
import {equipmentProgress} from '../pod/rest-arena.mjs';
import {authTransitions} from '../auth-transition.mjs';
import {createWarRoomApi} from './account-api.mjs';
const css=document.createElement('link');css.rel='stylesheet';css.href='/war-room/war-room.css';document.head.append(css);
const bayCss=document.createElement('link');bayCss.rel='stylesheet';bayCss.href='/war-room/gala-bay.css';document.head.append(bayCss);
const $=id=>document.getElementById(id);
const CHECKS=[['djscratch','DJ Scratch'],['gala','Gala'],['lilboyfriend','Lil Boyfriend'],['corgi','Corgi'],['hand','Helping Hand'],['armie','Coach Armie']];
const transitions=authTransitions(),{api}=createWarRoomApi({request:authFetch,transitions}),accountContext=createStandaloneAccountContext({transitions});
const time=ms=>{if(!Number.isFinite(Number(ms)))return '—';const s=Math.max(0,Math.round(Number(ms)/1000));return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;};
const GUEST='Sign in to use your saved run and loadouts.';
let arsenal=null;
// Gala weapon upgrades unlock from the signed-in account's training, as in the pod; guests keep base tiers.
const galaProgress=progress=>{window.GalaProgress=progress?{read:()=>equipmentProgress(progress)}:undefined;window.dispatchEvent(new Event('mominc-avatar-change'));};
transitions.subscribe(()=>{$('refresh').disabled=false;galaProgress(null);arsenal=null;$('saveLoadout').disabled=true;$('arsenalStatus').textContent='Account changed. Refresh the War Room.';});
function renderArsenal(state){arsenal=state;$('saveLoadout').disabled=false;$('weaponType').value=state.loadout.type;$('weaponTier').value=String(state.loadout.tier);$('arsenalStatus').textContent=state.updatedAt?'Saved to this account.':'No saved loadout yet.';}
function renderRun(run){$('runStatus').textContent=run?'Run '+(run.completedAt?'complete':'in progress')+'.':'No saved Gala run found.';$('identity').textContent=run?.djName||'No DJ identity attached.';$('checks').replaceChildren(...CHECKS.map(([key,label])=>{const row=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=run?.completed?.includes(key)?'✓ complete':'— pending';row.append(dt,dd);return row;}));}
function renderBoard(board){const rows=board.items||[];$('leaderRows').replaceChildren(...rows.map(item=>{const tr=document.createElement('tr');for(const value of [String(item.rank).padStart(2,'0'),item.djName||'Unnamed DJ',time(item.durationMs)]){const td=document.createElement('td');td.textContent=value;tr.append(td);}return tr;}));$('boardStatus').textContent=rows.length?'Live escapee records.':'No ranked runs yet.';}
// Public room and leaderboard; saved run and arsenal need a signed-in account and the server API.
async function load(){
 const ticket=transitions.beginRefresh();arsenal=null;$('saveLoadout').disabled=true;$('refresh').disabled=true;
 const board=api('/api/gala/leaderboard').then(value=>{if(transitions.isCurrent(ticket))renderBoard(value);},error=>{if(transitions.isCurrent(ticket))$('boardStatus').textContent='Leaderboard unavailable: '+error.message;});
 try{
  const account=await accountContext.read({ticket});transitions.assertCurrent(ticket);
  if(!account){galaProgress(null);$('access').textContent='Public War Room';$('runStatus').textContent=GUEST;$('checks').replaceChildren();$('arsenalStatus').textContent=GUEST;return;}
  $('access').textContent='Signed-in War Room';galaProgress(account.progress);
  const [runReply,room]=await Promise.all([api('/api/gala/install-draft'),api('/api/war-room')]);transitions.assertCurrent(ticket);renderRun(runReply.data);renderArsenal(room.state);
 }catch(error){if(!transitions.isCurrent(ticket))return;$('runStatus').textContent=error.message;$('arsenalStatus').textContent='Arsenal unavailable: '+error.message;$('access').textContent='Signed in · service unavailable';}
 finally{await board;if(transitions.isCurrent(ticket))$('refresh').disabled=false;}
}
$('refresh').addEventListener('click',load);window.addEventListener('myr5:login-ready',()=>void load());window.addEventListener('pageshow',event=>{if(event.persisted){accountContext.clear();void load();}});load();
$('saveLoadout').addEventListener('click',async()=>{if(!arsenal)return;const ticket=transitions.capture(),button=$('saveLoadout');button.disabled=true;try{const reply=await api('/api/war-room/loadout',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({revision:arsenal.revision,loadout:{type:$('weaponType').value,tier:Number($('weaponTier').value)}})});transitions.assertCurrent(ticket);renderArsenal(reply.state);}catch(error){if(transitions.isCurrent(ticket))$('arsenalStatus').textContent=error.message;}finally{if(transitions.isCurrent(ticket))button.disabled=false;}});

// The character bay dresses the player's own 64-bit Gala character in the cage room. It never opens the
// coach customizer, so it needs no ship admission; guests use it too, saving to this device.
function mountCharacterBay(){
 const host=$('warRoomGalaHost'),status=$('characterBayStatus');
 if(!host||!status)return;
 const tell=text=>{status.textContent=text;};
 let bay=null,module=null,generation=0;
 const close=()=>{generation++;bay?.dispose();bay=null;window.warRoomGala=null;};
 const open=()=>{
  if(document.hidden||!host.isConnected||bay)return;
  const run=++generation;
  module??=import('/war-room/gala-bay.js');
  module.then(({mountGalaBay})=>{
   if(run!==generation||document.hidden||!host.isConnected)return;
   bay=mountGalaBay(host,{tell});window.warRoomGala=bay;tell('Tap the room or your character.');
  }).catch(()=>{if(run===generation)tell('Bay unavailable on this device.');});
 };
 addEventListener('pagehide',close);
 addEventListener('pageshow',event=>{if(event.persisted)open();});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)close();else open();});
 open();
}
mountCharacterBay();
