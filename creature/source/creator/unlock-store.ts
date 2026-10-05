// Cosmetic ownership follows the account/guest and the coach wearing the item.
import { markPending } from '../../../unlock-pending.mjs';
import { performanceOwner } from '../../../performance-progress.mjs';
export type UnlockKind = 'texture' | 'color' | 'palette';
const KEY = 'myr5-unlocks-v2';
type Store = Record<UnlockKind, string[]>;
const empty = (): Store => ({ texture: [], color: [], palette: [] });
export const cosmeticId = (coachId: string, id: string) => `coach:${encodeURIComponent(coachId)}:${id}`;
export function currentCosmeticCoach(): string {
 try { return JSON.parse(localStorage.getItem('myr5-recipe-v1') || '{}').body || 'myr5'; } catch { return 'myr5'; }
}
const ownerKey = () => `${KEY}/${encodeURIComponent(performanceOwner())}`;
function read(): Store {
 try {
  const d = JSON.parse(localStorage.getItem(ownerKey()) || '{}');
  return Object.fromEntries(['texture','color','palette'].map(kind => [kind, Array.isArray(d[kind]) ? d[kind].filter((id: unknown) => typeof id === 'string') : []])) as Store;
 } catch { return empty(); }
}
function write(store: Store) { try { localStorage.setItem(ownerKey(), JSON.stringify(store)); return true; } catch { return false; } }
export const isGranted = (kind: UnlockKind, id: string, coachId = currentCosmeticCoach()) => read()[kind]?.includes(cosmeticId(coachId,id)) ?? false;
export function grantUnlock(kind: UnlockKind, id: string, coachId = currentCosmeticCoach()) {
 if (!['texture','color','palette'].includes(kind) || typeof id !== 'string' || !id || typeof coachId !== 'string' || !coachId) return false;
 const s = read(), scoped = cosmeticId(coachId,id);
 if (s[kind].includes(scoped)) return false;
 s[kind].push(scoped); if (!write(s)) return false;
 markPending(kind,scoped); return true;
}
export const grantedIds = (kind: UnlockKind, coachId = currentCosmeticCoach()) => {
 const prefix = cosmeticId(coachId,''); return (read()[kind] || []).filter(id => id.startsWith(prefix)).map(id => id.slice(prefix.length));
};
// Preserve a saved look without copying historical device-wide grants onto every coach.
export function migrateSavedCosmetics(recipe?: {body?:string;materials?:Record<string,{textureId?:string;colorId?:string}|undefined>}) {
 const coachId=recipe?.body;if(!coachId)return;
 try {
  const migration=`${ownerKey()}/saved-look/${encodeURIComponent(coachId)}`;
  if(localStorage.getItem(migration))return;
  const old=JSON.parse(localStorage.getItem('myr5-unlocks-v1')||'{}');
  for(const choice of Object.values(recipe.materials||{})){
   if(choice?.textureId&&old.texture?.includes(choice.textureId))grantUnlock('texture',choice.textureId,coachId);
   if(choice?.colorId)for(const kind of ['color','palette'] as UnlockKind[])if(old[kind]?.includes(choice.colorId))grantUnlock(kind,choice.colorId,coachId);
  }
  localStorage.setItem(migration,'1');
 }catch{/* Legacy storage is optional. */}
}
