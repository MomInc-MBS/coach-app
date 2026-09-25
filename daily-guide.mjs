// How to Play opens by itself once per local calendar day, the first time the app opens that day,
// separately for each signed-in account and for the guest on this device.
export const DAILY_GUIDE_KEY='myr5-how-to-play-day-v1';
export const localDay=(date=new Date())=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
export const guideOwner=(account=globalThis.myr5AuthenticatedAccount)=>{const id=account?.user?.id;return typeof id==='string'&&id?'account:'+id:'guest';};
const keyFor=owner=>`${DAILY_GUIDE_KEY}/${owner}`;
export function dailyGuideDue({owner=guideOwner(),date=new Date(),storage=globalThis.localStorage}={}){
 try{return storage.getItem(keyFor(owner))!==localDay(date);}catch{return false;}
}
export function markDailyGuide({owner=guideOwner(),date=new Date(),storage=globalThis.localStorage}={}){
 try{storage.setItem(keyFor(owner),localDay(date));return true;}catch{return false;}
}
