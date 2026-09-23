// Global battle-pass ledger (rank 6b) for the items unlock-store.ts doesn't hold: weapons, pets,
// boss looks, specials, auras, Food bonuses (D32). Textures/colours/palettes stay in unlock-store.ts. Same API
// shape as unlock-store.ts, one localStorage key, not per-coach (unlocks are global).
export const LEDGER_KEY='myr5-battle-pass-ledger-v1';
export const LEDGER_KINDS=Object.freeze(['weapon','pet','boss-texture','boss-skin','special','aura','bonus','creature-skin','ship']);

function read(){
 try{
  const d=JSON.parse(localStorage.getItem(LEDGER_KEY)||'{}');
  return Object.fromEntries(LEDGER_KINDS.map(k=>[k,Array.isArray(d[k])?d[k]:[]]));
 }catch{return Object.fromEntries(LEDGER_KINDS.map(k=>[k,[]]));}
}

export const ACCOUNT_SCOPED_LEDGER_KINDS=Object.freeze(['creature-skin','ship']);
const accountKinds=new Set(ACCOUNT_SCOPED_LEDGER_KINDS);
const ownerKey=({account=globalThis.myr5AuthenticatedAccount}={})=>{
 const id=typeof account==='string'?account:account?.user?.id;
 return typeof id==='string'&&/^[A-Za-z0-9](?:[A-Za-z0-9._:-]{0,127})$/.test(id)?`${LEDGER_KEY}/account/${id}`:null;
};
function accountRead(options){try{const key=ownerKey(options);if(!key)return {};const data=JSON.parse(localStorage.getItem(key)||'{}');return data&&typeof data==='object'&&!Array.isArray(data)?data:{};}catch{return {};}}
export const grantedIds=(kind,options)=>{const value=(accountKinds.has(kind)?accountRead(options):read())[kind];return Array.isArray(value)?value:[];};
export const isGranted=(kind,id,options)=>grantedIds(kind,options).includes(id);
/** Idempotent: true only the first time `id` is granted for `kind`. */
export function grantUnlock(kind,id,options){
 if(accountKinds.has(kind)){
  const key=ownerKey(options);if(!key)return false;
  const data=accountRead(options),ids=Array.isArray(data[kind])?data[kind]:[];
  if(ids.includes(id))return false;data[kind]=[...ids,id];
  try{localStorage.setItem(key,JSON.stringify(data));return true;}catch{return false;}
 }
 const store=read();
 if(!store[kind]||store[kind].includes(id))return false;
 store[kind].push(id);
 try{localStorage.setItem(LEDGER_KEY,JSON.stringify(store));}catch{return false;}
 return true;
}
