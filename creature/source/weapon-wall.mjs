import {authFetch} from '../../auth-client.mjs';
import {authTransitions} from '../../auth-transition.mjs';
import {createWarRoomApi} from '../../war-room/account-api.mjs';

export const GALA_WEAPONS=Object.freeze([
 ['rapier','Rapier'],['greatsword','Greatsword'],['dagger','Dagger'],['sabre','Sabre'],['axe','Axe'],
 ['hammer','Hammer'],['mace','Mace'],['flail','Flail'],['spear','Spear'],['trident','Trident'],
 ['halberd','Halberd'],['scythe','Scythe'],['bow','Bow'],['crossbow','Crossbow'],['chakram','Chakram'],
 ['gauntlets','Gauntlets'],['staff','Staff'],['wand','Wand'],['tome','Tome'],['cannon','Cannon']
]);
const TYPES=new Set(GALA_WEAPONS.map(([type])=>type));
const ownerOf=account=>typeof account==='string'?account:account?.user?.id;
const validState=state=>state&&Number.isSafeInteger(state.revision)&&state.revision>=0&&
 TYPES.has(state.loadout?.type)&&Number.isInteger(state.loadout?.tier)&&
 state.loadout.tier>=0&&state.loadout.tier<=20;

export function createWeaponWallController({
 request=authFetch,transitions=authTransitions(),
 getAccount=()=>globalThis.window?.myr5AuthenticatedAccount
}={}){
 const client=createWarRoomApi({request,transitions}),listeners=new Set();
 let generation=0,disposed=false,pending=false,owner=null;
 let snapshot={mode:'locked',message:'Sign in to view your War Room loadout.',loadout:null,revision:null};
 const set=next=>{snapshot={...snapshot,...next};for(const listener of listeners)listener({...snapshot});};
 const reset=()=>{generation++;pending=false;owner=null;client.clear();set({mode:'locked',message:'Account changed. Refresh the weapon wall.',loadout:null,revision:null});};
 const unsubscribe=transitions.subscribe(reset);
 const current=(run,ticket,expectedOwner)=>{
  if(disposed||run!==generation||ownerOf(getAccount())!==expectedOwner)return false;
  try{transitions.assertCurrent(ticket);return true;}catch{return false;}
 };
 async function refresh(message){
  if(disposed)return;
  const run=++generation,expectedOwner=ownerOf(getAccount());
  pending=false;owner=null;client.clear();
  if(!expectedOwner){set({mode:'locked',message:'Sign in to view your War Room loadout.',loadout:null,revision:null});return;}
  let ticket;
  try{ticket=transitions.capture();}catch{set({mode:'unavailable',message:'Account sync is unavailable. Refresh to retry.',loadout:null,revision:null});return;}
  set({mode:'loading',message:'Checking War Room access…',loadout:null,revision:null});
  try{
   const room=await client.api('/api/war-room');
   if(!current(run,ticket,expectedOwner))return;
   if(room.targetAccountId!==expectedOwner||!validState(room.state))throw Error('War Room returned an invalid account loadout.');
   owner=expectedOwner;
   set({mode:'ready',message:message||'Saved Gala loadout for this account.',loadout:{...room.state.loadout},revision:room.state.revision});
  }catch(error){
   if(!current(run,ticket,expectedOwner))return;
   const gated=error.status===403,unauthenticated=error.status===401;
   set({mode:gated?'gated':unauthenticated?'locked':'unavailable',
    message:gated?'Complete verified Coach Army access in the War Room.':unauthenticated?'Sign in to view your War Room loadout.':error.message||'War Room unavailable. Refresh to retry.',
    loadout:null,revision:null});
  }
 }
 async function save(type,tier){
  if(disposed||pending||snapshot.mode!=='ready'||!owner||ownerOf(getAccount())!==owner)return false;
  if(!TYPES.has(type)||!Number.isInteger(tier)||tier<0||tier>20){
   set({message:'Choose a valid Gala weapon and tier from 0 to 20.'});return false;
  }
  const run=generation,expectedOwner=owner,revision=snapshot.revision;
  let ticket;
  try{ticket=transitions.capture();}catch{reset();return false;}
  pending=true;set({mode:'saving',message:'Saving Gala loadout…'});
  try{
   const reply=await client.api('/api/war-room/loadout',{method:'PUT',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({revision,loadout:{type,tier}})});
   if(!current(run,ticket,expectedOwner))return false;
   if(!validState(reply.state))throw Error('War Room returned an invalid loadout.');
   set({mode:'ready',message:'Gala loadout saved.',loadout:{...reply.state.loadout},revision:reply.state.revision});
   return true;
  }catch(error){
   if(!current(run,ticket,expectedOwner))return false;
   if(error.status===409){await refresh('War Room changed on another device. Review the refreshed loadout before saving.');return false;}
   owner=null;client.clear();
   set({mode:error.status===403?'gated':error.status===401?'locked':'unavailable',
    message:error.message||'Could not save. Refresh to retry.',loadout:null,revision:null});
   return false;
  }finally{if(run===generation)pending=false;}
 }
 return {
  getState:()=>({...snapshot,loadout:snapshot.loadout&&{...snapshot.loadout}}),
  subscribe(listener){listeners.add(listener);listener({...snapshot});return()=>listeners.delete(listener);},
  refresh,save,
  dispose(){if(disposed)return;disposed=true;generation++;listeners.clear();unsubscribe?.();client.dispose();}
 };
}

// The cage mounts this after its own scene admission; the server checks Coach Army clearance again.
export function mountWeaponWall({host,request,transitions,getAccount,eventTarget=globalThis.window}){
 if(!host?.ownerDocument)throw Error('Weapon wall needs a host element.');
 const doc=host.ownerDocument,controller=createWeaponWallController({request,transitions,getAccount});
 const root=doc.createElement('section'),heading=doc.createElement('h2'),status=doc.createElement('p');
 const type=doc.createElement('select'),tier=doc.createElement('input'),save=doc.createElement('button');
 const refresh=doc.createElement('button'),link=doc.createElement('a');
 root.className='cage-weapon-wall';heading.textContent='Weapon wall';status.setAttribute('role','status');
 type.setAttribute('aria-label','Gala weapon');
 for(const [id,label] of GALA_WEAPONS){const option=doc.createElement('option');option.value=id;option.textContent=label;type.append(option);}
 tier.type='number';tier.min='0';tier.max='20';tier.step='1';tier.setAttribute('aria-label','Saved tier');
 save.type='button';save.textContent='Save loadout';refresh.type='button';refresh.textContent='Refresh';
 link.href='/war-room/';link.textContent='Open War Room';
 root.append(heading,status,type,tier,save,refresh,link);host.append(root);
 const unsubscribe=controller.subscribe(state=>{
  status.textContent=state.message;const editable=state.mode==='ready';
  type.disabled=tier.disabled=save.disabled=!editable;
  refresh.disabled=state.mode==='loading'||state.mode==='saving';
  if(state.loadout){type.value=state.loadout.type;tier.value=String(state.loadout.tier);}
 });
 const onSave=()=>void controller.save(type.value,tier.value?Number(tier.value):NaN);
 const onRefresh=()=>void controller.refresh();
 save.addEventListener('click',onSave);refresh.addEventListener('click',onRefresh);
 eventTarget?.addEventListener('myr5:account-ready',onRefresh);
 eventTarget?.addEventListener('myr5:account-cleared',onRefresh);
 void controller.refresh();
 return {controller,dispose(){
  unsubscribe();controller.dispose();
  save.removeEventListener('click',onSave);refresh.removeEventListener('click',onRefresh);
  eventTarget?.removeEventListener('myr5:account-ready',onRefresh);
  eventTarget?.removeEventListener('myr5:account-cleared',onRefresh);root.remove();
 }};
}
