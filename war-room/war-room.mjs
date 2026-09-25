import {authFetch} from '../auth-client.mjs';
import {SHIP_GATE,SHIP_GATE_TOKEN} from '../modules/ships/ship-scene-domain.mjs';
import {authTransitions} from '../auth-transition.mjs';
import {createWarRoomApi} from './account-api.mjs';
const css=document.createElement('link');css.rel='stylesheet';css.href='/war-room/war-room.css';document.head.append(css);
const $=id=>document.getElementById(id);
const CHECKS=[['djscratch','DJ Scratch'],['gala','Gala'],['lilboyfriend','Lil Boyfriend'],['corgi','Corgi'],['hand','Helping Hand'],['armie','Coach Armie']];
const transitions=authTransitions(),{api}=createWarRoomApi({request:authFetch,transitions});
const time=ms=>{if(!Number.isFinite(Number(ms)))return '—';const s=Math.max(0,Math.round(Number(ms)/1000));return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;};
let arsenal=null;
transitions.subscribe(()=>{arsenal=null;$('saveLoadout').disabled=true;$('arsenalStatus').textContent='Account changed. Refresh the War Room.';});
function renderArsenal(state){arsenal=state;$('saveLoadout').disabled=false;$('weaponType').value=state.loadout.type;$('weaponTier').value=String(state.loadout.tier);$('arsenalStatus').textContent=state.updatedAt?'Saved to this account.':'No saved loadout yet.';}
function renderRun(run){$('runStatus').textContent=run?'Run '+(run.completedAt?'complete':'in progress')+'.':'No saved Gala run found.';$('identity').textContent=run?.djName||'No DJ identity attached.';$('checks').replaceChildren(...CHECKS.map(([key,label])=>{const row=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=run?.completed?.includes(key)?'✓ complete':'— pending';row.append(dt,dd);return row;}));}
async function load(){ const ticket=transitions.beginRefresh();arsenal=null;$('saveLoadout').disabled=true;$('refresh').disabled=true;$('access').textContent='Verified Coach Army access';try{const [runReply,board,room]=await Promise.all([api('/api/gala/install-draft'),api('/api/gala/leaderboard'),api('/api/war-room')]);transitions.assertCurrent(ticket);renderRun(runReply.data);renderArsenal(room.state);const rows=board.items||[];$('leaderRows').replaceChildren(...rows.map(item=>{const tr=document.createElement('tr');for(const value of [String(item.rank).padStart(2,'0'),item.djName||'Unnamed DJ',time(item.durationMs)]){const td=document.createElement('td');td.textContent=value;tr.append(td);}return tr;}));$('boardStatus').textContent=rows.length?'Live escapee records.':'No ranked runs yet.';}catch(error){if(!transitions.isCurrent(ticket))return;$('runStatus').textContent=error.message;$('boardStatus').textContent='Leaderboard unavailable: '+error.message;$('arsenalStatus').textContent='Arsenal unavailable: '+error.message;$('access').textContent='Verified access · service unavailable';}finally{if(transitions.isCurrent(ticket))$('refresh').disabled=false;}}
$('refresh').addEventListener('click',load);load();
$('saveLoadout').addEventListener('click',async()=>{if(!arsenal)return;const ticket=transitions.capture(),button=$('saveLoadout');button.disabled=true;try{const reply=await api('/api/war-room/loadout',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({revision:arsenal.revision,loadout:{type:$('weaponType').value,tier:Number($('weaponTier').value)}})});transitions.assertCurrent(ticket);renderArsenal(reply.state);}catch(error){if(transitions.isCurrent(ticket))$('arsenalStatus').textContent=error.message;}finally{if(transitions.isCurrent(ticket))button.disabled=false;}});

// The customizer admits itself once per ship-gate token; this room is already behind the Coach Army
// gate, so it hands the editor a fresh token each time it (re)opens the embedded bay.
function mountCharacterBay(){
 const host=$('warRoomEditorHost'),status=$('characterBayStatus');
 if(!host||!status)return;
 const frame=document.createElement('iframe');frame.title='3D character customizer';frame.className='character-bay-editor';
 const retry=document.createElement('button');retry.type='button';retry.textContent='Reopen character bay';retry.hidden=true;
 const fail=text=>{status.textContent=text;retry.hidden=false;frame.remove();};
 function open(){
  retry.hidden=true;status.textContent='Opening your character bay…';
  try{sessionStorage.setItem(SHIP_GATE,SHIP_GATE_TOKEN);}catch{fail('Character bay needs session storage on this device.');return;}
  frame.src='/creature/index.html';if(!frame.isConnected)host.prepend(frame);
 }
 frame.addEventListener('load',()=>{
  let doc;try{doc=frame.contentWindow.location.pathname==='/creature/index.html'&&frame.contentDocument;}catch{}
  if(!doc){fail('Character bay could not open.');return;}
  const style=doc.createElement('style');style.textContent='.coach-dock{display:none!important}';doc.head.append(style);
  for(const link of doc.querySelectorAll('a[href^="/"]')){if(link.getAttribute('href')==='/pose.html')link.href='/pose.html#portal';link.target='_top';}
  status.textContent='Design your 64-bit character. Changes save to this phone.';
 });
 retry.onclick=open;host.append(retry);
 // A restored page must not revive the editor's spent admission; reopen it with a new token.
 addEventListener('pagehide',()=>frame.remove());
 addEventListener('pageshow',event=>{if(event.persisted)open();});
 open();
}
mountCharacterBay();
