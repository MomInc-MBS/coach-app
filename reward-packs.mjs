// Packs contain coach-specific cosmetics. Rolls are committed before grants so a
// retry repairs interrupted storage without rerolling or duplicating rewards.
import {colourRewardPool,textureRewardPool} from './battle-pass-rewards.mjs';
import * as ledger from './unlock-ledger.mjs';
import * as store from './creature/source/creator/unlock-store.ts';
import {unlockedCoachIds,performanceOwner,coachAccess} from './performance-progress.mjs';
import {PACK_SIZES,COSMETIC_PACK_ODDS} from './progression-rules.mjs';
export const PACK_ODDS=COSMETIC_PACK_ODDS;
export {PACK_SIZES};
// Achievement Vault packs (id `reward-pack:secret:vault-<goal>`) are holographic secret packs with no 64-bit items (colour 75 / texture 25).
// Size follows the goal's tier (legendary 3, rare 2; its first slot is then a texture). vault-store notes the goal tier at grant time so the
// core never imports the vault goal list.
export const VAULT_PACK=Object.freeze({rare:2,legendary:3,odds:Object.freeze({secret:Object.freeze({color:75,'64-bit':0})})});
export const isVaultPack=item=>String(item?.id).includes(':vault-');
const VT_KEY='myr5-vault-pack-tier-v1';
export const noteVaultPack=(id,tier)=>{try{const d=JSON.parse(localStorage.getItem(VT_KEY)||'{}');if(d[id]!==tier){d[id]=tier;localStorage.setItem(VT_KEY,JSON.stringify(d));}}catch{/* private mode */}};
const vaultSize=id=>{try{return VAULT_PACK[JSON.parse(localStorage.getItem(VT_KEY)||'{}')[id]]||VAULT_PACK.rare;}catch{return VAULT_PACK.rare;}};
export const packSize=item=>isVaultPack(item)?vaultSize(item.id):PACK_SIZES[item.tier];
const KEY='myr5-opened-reward-packs-v2';
const ownerKey=()=>`${KEY}/${encodeURIComponent(performanceOwner())}`;
const safeRead=()=>{try{const data=JSON.parse(localStorage.getItem(ownerKey())||'{}');return data&&typeof data==='object'&&!Array.isArray(data)?data:{};}catch{return {};}};
const save=data=>{try{localStorage.setItem(ownerKey(),JSON.stringify(data));return true;}catch{return false;}};
export const packItem=(tier,id)=>({kind:'reward-pack',id,name:`${tier[0].toUpperCase()+tier.slice(1)} Pack`,tier,line:`Open for ${packSize({id,tier})} coach cosmetic${packSize({id,tier})===1?'':'s'}.`});
const unit=random=>{const value=random();if(!Number.isFinite(value))throw RangeError('Invalid random value.');return Math.min(1-Number.EPSILON,Math.max(0,value));};
export function rollCategory(tier,random=Math.random,table=PACK_ODDS){
 const odds=table[tier];if(!odds)throw Error('Unknown pack tier');
 const roll=unit(random)*100;
 return roll<odds.color?'color':roll<odds.color+odds['64-bit']?'64-bit':'texture';
}
const pools={color:colourRewardPool(),texture:textureRewardPool()};
export function setTexturePool(items){pools.texture=items.filter(item=>item.kind==='texture').map(({kind,id,name})=>({kind,id,name}));}
const identity=reward=>store.cosmeticId(reward.coachId,reward.id);
export const hasCosmetic=reward=>reward.kind==='boss-skin'?ledger.isGranted('boss-skin',identity(reward)):store.isGranted(reward.kind,reward.id,reward.coachId);
const categoryPool=(category,coaches)=>coaches.flatMap(coachId=>category==='64-bit'?[{kind:'boss-skin',id:`${coachId}-skin`,name:'64-bit Pixel Finish',coachId}]:pools[category].map(item=>({...item,coachId})));
export function remainingCosmetics({coaches=unlockedCoachIds()}={}){
 const owned=[...new Set(coaches)].filter(coach=>coachAccess(coach));
 const grants=Object.fromEntries(['color','palette','texture'].map(kind=>[kind,new Set(store.ownerGrantedIds(kind))]));grants['boss-skin']=new Set(ledger.grantedIds('boss-skin'));
 return ['color','64-bit','texture'].flatMap(category=>categoryPool(category,owned).map(reward=>({...reward,category}))).filter(reward=>!grants[reward.kind].has(identity(reward)));
}
const rewardsOf=opened=>opened?.rewards|| (opened?.reward?[{...opened.reward,category:opened.category}]:[]);
export const openedPack=id=>{
 const current=safeRead();if(current[id])return current[id];
 // Earlier one-item packs keep their saved roll; migrate it onto the saved coach.
 try{const owner=globalThis.myr5AuthenticatedAccount?.user?.id;if(!owner)return null;const legacy=JSON.parse(localStorage.getItem(`myr5-opened-reward-packs-v1/${owner}`)||'{}')[id];if(!legacy?.reward)return null;const preferred=store.currentCosmeticCoach(),coaches=unlockedCoachIds(),coachId=coaches.includes(preferred)?preferred:coaches[0];if(!coachId)return null;const reward={...legacy.reward,...(legacy.reward.kind==='boss-skin'?{id:`${coachId}-skin`}:{}),coachId,category:legacy.category};const result={...legacy,reward,rewards:[reward],legacy:true};return save({...current,[id]:result})?result:null;}catch{return null;}
};
export const unopenedPacks=()=>ledger.grantedIds('reward-pack').filter(id=>{const opened=openedPack(id);return !opened||rewardsOf(opened).some(reward=>!hasCosmetic(reward));});
function grantReward(reward){
 if(!coachAccess(reward.coachId))return false;
 if(reward.kind==='boss-skin')ledger.grantUnlock(reward.kind,identity(reward));
 else store.grantUnlock(reward.kind,reward.id,reward.coachId);
 return hasCosmetic(reward);
}
export function openRewardPack(item,{random=Math.random}={}){
 if(item?.kind!=='reward-pack'||!PACK_ODDS[item.tier]||!ledger.isGranted('reward-pack',item.id))return null;
 const previous=openedPack(item.id);
 if(previous)return rewardsOf(previous).every(grantReward)?previous:null;
 const coaches=unlockedCoachIds().filter(coach=>coachAccess(coach));if(!coaches.length)return null;
 const rewards=[];const selected=new Set(),unowned=remainingCosmetics({coaches});
 const vault=isVaultPack(item);
 for(let slot=0;slot<packSize(item);slot++){
  const rolled=vault&&vaultSize(item.id)===VAULT_PACK.legendary&&slot===0?'texture':rollCategory(item.tier,random,vault?VAULT_PACK.odds:PACK_ODDS);
  // Preserve category odds until that category is exhausted; then award another
  // unowned category rather than a duplicate while the collection is incomplete.
  const order=[rolled,...['color','64-bit','texture'].filter(category=>category!==rolled&&!(vault&&category==='64-bit'))];
  let category=rolled,choices=[];
  for(const candidate of order){const available=unowned.filter(reward=>reward.category===candidate&&!selected.has(identity(reward)+':'+reward.kind));if(available.length){category=candidate;choices=available;break;}}
  if(!choices.length)break; // Complete collection: do not manufacture duplicates.
  const reward={...choices[Math.floor(unit(random)*choices.length)],category};
  selected.add(identity(reward)+':'+reward.kind);rewards.push(reward);
 }
 const result={tier:item.tier,rewards,category:rewards[0]?.category||'complete',reward:rewards[0]||null,complete:rewards.length===0};
 const current=safeRead();if(current[item.id])return current[item.id];
 if(!save({...current,[item.id]:result}))return null;
 return rewards.every(grantReward)?result:null;
}
// Cross-tab UI openings serialize the saved roll and grant repair when Web Locks
// are available. The synchronous primitive also remains useful offline/in tests.
export async function openRewardPackExclusive(item,options={}){
 try{const owner=performanceOwner(),run=()=>performanceOwner()===owner?openRewardPack(item,options):null;
 return await (globalThis.navigator?.locks?.request?globalThis.navigator.locks.request(`${KEY}/${owner}/${item?.id}`,run):run());}catch{return null;}
}
// The final cosmetic level is a collection completion reward. Only currently
// unlocked coaches qualify; coaches earned later remain collectible afterwards.
export function completeCosmeticCollection(){
 const remaining=remainingCosmetics();
 const materials=remaining.filter(reward=>reward.kind!=='boss-skin'),skins=remaining.filter(reward=>reward.kind==='boss-skin');
 store.grantUnlocks(materials);ledger.grantUnlocks('boss-skin',skins.map(identity));
 const ungranted=remainingCosmetics().length;return {granted:remaining.length-ungranted,remaining:ungranted};
}
export function grantDailyPack({date=new Date(),account=globalThis.myr5AuthenticatedAccount}={}){
 const owner=account?.user?.id;if(typeof owner!=='string'||!owner)return null;
 const day=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
 const item=packItem('uncommon',`daily:${owner}:${day}`);
 return ledger.grantUnlock('reward-pack',item.id,{account})?item:null;
}
