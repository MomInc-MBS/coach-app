// Earned cosmetic packs. Ownership is recorded with the existing battle-pass ledger;
// opening uses the existing material unlock store. Pack odds are category odds, not item odds.
import PALETTES from './creature/source/creator/palettes.json' with {type:'json'};
import {BOSSES,textureRewardPool} from './battle-pass-rewards.mjs';
import * as ledger from './unlock-ledger.mjs';
import * as store from './creature/source/creator/unlock-store.ts';

export const PACK_ODDS=Object.freeze({
 uncommon:Object.freeze({color:90,'64-bit':7,texture:3}),
 rare:Object.freeze({color:80,'64-bit':15,texture:5}),
 legendary:Object.freeze({color:70,'64-bit':20,texture:10}),
});
const KEY='myr5-opened-reward-packs-v1';
const ownerKey=()=>{const id=globalThis.myr5AuthenticatedAccount?.user?.id;return typeof id==='string'&&id?`${KEY}/${id}`:null;};
const safeRead=()=>{try{const key=ownerKey();return key?JSON.parse(localStorage.getItem(key)||'{}'):{};}catch{return {};}};
const save=data=>{try{const key=ownerKey();if(!key)return false;localStorage.setItem(key,JSON.stringify(data));return true;}catch{return false;}};
export const packItem=(tier,id)=>({kind:'reward-pack',id,name:`${tier[0].toUpperCase()+tier.slice(1)} Pack`,tier,line:'Open for one random cosmetic.'});
export function rollCategory(tier,random=Math.random){
 const odds=PACK_ODDS[tier];if(!odds)throw Error('Unknown pack tier');
 const roll=Math.min(0.9999999999999999,Math.max(0,random()))*100;
 return roll<odds.color?'color':roll<odds.color+odds['64-bit']?'64-bit':'texture';
}
const pools={
 color:PALETTES.filter(item=>item.unlockRule==='battle-pass').map(item=>({kind:'palette',id:item.id,name:item.name})),
 '64-bit':BOSSES.map(boss=>({kind:'boss-skin',id:boss.id+'-skin',name:boss.name+' Skin'})),
 texture:textureRewardPool(),
};
// The full texture inventory is filled from the existing catalog at startup, avoiding a second ID registry.
export function setTexturePool(items){pools.texture=items.filter(item=>item.kind==='texture').map(({kind,id,name})=>({kind,id,name}));}
export const openedPack=id=>safeRead()[id]||null;
export const unopenedPacks=()=>ledger.grantedIds('reward-pack').filter(id=>{
 const opened=openedPack(id),reward=opened?.reward;
 return !reward||!(reward.kind==='boss-skin'?ledger:store).isGranted(reward.kind,reward.id);
});
export function openRewardPack(item,{random=Math.random}={}){
 if(item?.kind!=='reward-pack'||!PACK_ODDS[item.tier]||!ledger.isGranted('reward-pack',item.id))return null;
 const grantReward=reward=>{
  if(reward.kind==='boss-skin')ledger.grantUnlock(reward.kind,reward.id);
  else store.grantUnlock(reward.kind,reward.id);
  return (reward.kind==='boss-skin'?ledger:store).isGranted(reward.kind,reward.id);
 };
 const previous=openedPack(item.id);if(previous)return grantReward(previous.reward)?previous:null;
 const category=rollCategory(item.tier,random),pool=pools[category];
 if(!pool?.length)throw Error(`Empty reward category: ${category}`);
 const available=pool.filter(candidate=>!(candidate.kind==='boss-skin'?ledger:store).isGranted(candidate.kind,candidate.id));
 const choices=available.length?available:pool;
 const reward=choices[Math.floor(Math.min(0.9999999999999999,Math.max(0,random()))*choices.length)];
 const result={tier:item.tier,category,reward};
 const current=safeRead();if(current[item.id])return current[item.id];
 if(!save({...current,[item.id]:result}))return null;
 return grantReward(reward)?result:null;
}
export function grantDailyPack({date=new Date(),account=globalThis.myr5AuthenticatedAccount}={}){
 const owner=account?.user?.id;if(typeof owner!=='string'||!owner)return null;
 const day=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
 const item=packItem('uncommon',`daily:${owner}:${day}`);
 return ledger.grantUnlock('reward-pack',item.id,{account})?item:null;
}
