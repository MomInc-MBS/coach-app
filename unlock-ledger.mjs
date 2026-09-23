// Global battle-pass ledger (rank 6b) for the items unlock-store.ts doesn't hold: weapons, pets,
// boss looks, specials, auras, Food bonuses (D32). Textures/colours/palettes stay in unlock-store.ts. Same API
// shape as unlock-store.ts, one localStorage key, not per-coach (unlocks are global).
export const LEDGER_KEY='myr5-battle-pass-ledger-v1';
export const LEDGER_KINDS=Object.freeze(['weapon','pet','boss-texture','boss-skin','special','aura','bonus']);

function read(){
 try{
  const d=JSON.parse(localStorage.getItem(LEDGER_KEY)||'{}');
  return Object.fromEntries(LEDGER_KINDS.map(k=>[k,Array.isArray(d[k])?d[k]:[]]));
 }catch{return Object.fromEntries(LEDGER_KINDS.map(k=>[k,[]]));}
}

export const isGranted=(kind,id)=>read()[kind]?.includes(id)??false;
export const grantedIds=kind=>read()[kind]??[];
/** Idempotent: true only the first time `id` is granted for `kind`. */
export function grantUnlock(kind,id){
 const store=read();
 if(!store[kind]||store[kind].includes(id))return false;
 store[kind].push(id);
 try{localStorage.setItem(LEDGER_KEY,JSON.stringify(store));}catch{return false;}
 return true;
}
