// Grant-time "new" markers behind the unlock sparkle (unlock-seen.mjs). A grant that just succeeded marks its one item
// pending; viewing clears it. Grants that predate this record have no marker, so they stay quiet. No imports, so the
// ledger and unlock-store can both use it without a cycle. Scope mirrors the ledger: account kinds per account, rest per device.
export const PENDING_KEY='myr5-unlock-pending-v1';
export const ACCOUNT_SCOPED_LEDGER_KINDS=Object.freeze(['creature-skin','ship','reward-pack']);
const accountKinds=new Set(ACCOUNT_SCOPED_LEDGER_KINDS);
const keyOf=(kind,{account=globalThis.myr5AuthenticatedAccount}={})=>{
 if(!accountKinds.has(kind))return PENDING_KEY;
 const id=typeof account==='string'?account:account?.user?.id;
 return typeof id==='string'&&/^[A-Za-z0-9](?:[A-Za-z0-9._:-]{0,127})$/.test(id)?`${PENDING_KEY}/account/${id}`:null;
};
const read=key=>{try{const d=JSON.parse(localStorage.getItem(key)||'{}');return d&&typeof d==='object'&&!Array.isArray(d)?d:{};}catch{return {};}};
const idsOf=(data,kind)=>Array.isArray(data[kind])?data[kind]:[];

export const isPending=(kind,id,options)=>{const key=keyOf(kind,options);return !!key&&idsOf(read(key),kind).includes(id);};
function update(kind,options,change){
 const key=keyOf(kind,options);if(!key)return;
 const data=read(key),ids=idsOf(data,kind),next=change(ids);
 if(next===ids)return;
 try{localStorage.setItem(key,JSON.stringify({...data,[kind]:next}));}catch{/* storage unavailable: the item just isn't sparkled */}
}
export const markPending=(kind,id,options)=>update(kind,options,ids=>ids.includes(id)?ids:[...ids,id]);
export const clearPending=(kind,id,options)=>update(kind,options,ids=>ids.includes(id)?ids.filter(x=>x!==id):ids);

// Items unlocked by derived state (no grant call, e.g. body Species from section completion): the first call per kind
// only snapshots what is already unlocked (no historical flood); later calls mark just the ids added since. Device-scoped.
export const BASELINE_KEY='myr5-unlock-baseline-v1';
export function noteUnlocked(kind,ids){
 const data=read(BASELINE_KEY),known=Array.isArray(data[kind])?data[kind]:null,fresh=known?ids.filter(id=>!known.includes(id)):ids;
 if(known&&!fresh.length)return;
 try{localStorage.setItem(BASELINE_KEY,JSON.stringify({...data,[kind]:[...(known||[]),...fresh]}));}catch{return;}
 if(known)for(const id of fresh)markPending(kind,id);
}
