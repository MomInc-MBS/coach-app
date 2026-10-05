import {performanceOwner,localDay} from './performance-progress.mjs';
import {grantUnlock,isGranted} from './unlock-ledger.mjs';
export const REST_BOSS_REWARDS_KEY='myr5-rest-boss-rewards-v1';
export const REST_BOSS_PACKS=Object.freeze([{count:1,tier:'uncommon'},{count:5,tier:'legendary'}]);
export function captureRestBossContext({storage=globalThis.localStorage,account=globalThis.myr5AuthenticatedAccount??null,day=localDay()}={}){
 const captured=account?structuredClone(account):null;return {storage,account:captured,owner:performanceOwner(storage,captured),day};
}
function context(options={}){return options.owner?options:captureRestBossContext(options);}
function key(c){return `${REST_BOSS_REWARDS_KEY}/${encodeURIComponent(c.owner)}`;}
function read(c){try{const value=JSON.parse(c.storage.getItem(key(c))||'{}');return value?.version===1&&value.days&&typeof value.days==='object'?value:{version:1,days:{}};}catch{return {version:1,days:{}};}}
function dayIds(data,day){const values=data.days[day];return Array.isArray(values)?[...new Set(values.filter(x=>typeof x==='string'&&x.length<=256))]:[];}
export function restBossPackId(day,tier){return `reward-pack:${tier}:rest-boss-v1:${day}`;}
export function hasRestBossDefeat(id,options={}){const c=context(options),data=read(c);return Object.keys(data.days).some(day=>dayIds(data,day).includes(id));}
export function readRestBossRewards(options={}){const c=context(options),ids=dayIds(read(c),c.day);return {owner:c.owner,day:c.day,count:ids.length,defeatIds:ids,packs:REST_BOSS_PACKS.map(p=>({...p,id:restBossPackId(c.day,p.tier),earned:ids.length>=p.count,granted:isGranted('reward-pack',restBossPackId(c.day,p.tier),{account:c.account})}))};}
/** Captured owner and day are passed by the actual rest encounter. Replaying an
 * encounter repairs a missing grant, but never counts the defeat again. */
export function recordRestBossDefeat(defeatId,options={}){
 if(typeof defeatId!=='string'||!defeatId||defeatId.length>256)throw RangeError('Invalid rest boss encounter.');
 const c=context(options);if(!/^\d{4}-\d{2}-\d{2}$/.test(c.day))throw RangeError('Invalid rest boss day.');
 const data=read(c),ids=dayIds(data,c.day),already=Object.keys(data.days).some(day=>dayIds(data,day).includes(defeatId));if(!already){ids.push(defeatId);data.days[c.day]=ids;try{c.storage.setItem(key(c),JSON.stringify(data));}catch{return {recorded:false,granted:[],...readRestBossRewards(c)};}}
 const granted=[];for(const p of REST_BOSS_PACKS)if(ids.length>=p.count){const id=restBossPackId(c.day,p.tier);if(grantUnlock('reward-pack',id,{account:c.account}))granted.push({kind:'reward-pack',id,tier:p.tier});}
 const result={...readRestBossRewards(c),recorded:!already,granted};if((!already||granted.length)&&typeof window!=='undefined')window.dispatchEvent(new CustomEvent('myr5:rest-boss-rewards',{detail:result}));return result;
}

export function recordRestBossDefeatExclusive(id,options={}){const c=context(options),locks=globalThis.navigator?.locks;return locks?.request?locks.request(key(c),()=>recordRestBossDefeat(id,c)):Promise.resolve(recordRestBossDefeat(id,c));}
