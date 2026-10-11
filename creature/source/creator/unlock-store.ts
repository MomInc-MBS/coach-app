// Cosmetic ownership follows the account/guest and the coach wearing the item.
import { markPending,markPendingMany } from '../../../unlock-pending.mjs';
import { performanceOwner } from '../../../performance-progress.mjs';
import { replacementTextureId } from './texture-policy.mjs';
export type UnlockKind = 'texture' | 'color' | 'palette';
const KEY = 'myr5-unlocks-v2';
type Store = Record<UnlockKind, string[]>;
const empty = (): Store => ({ texture: [], color: [], palette: [] });
export const cosmeticId = (coachId: string, id: string) => `coach:${encodeURIComponent(coachId)}:${id}`;
// R25: a grant of a removed texture is a grant of its kept twin (Jelly -> Opal Jelly, Bubble Glass ->
// Glitter Resin). Reads translate old entries, and the next write stores the twin in their place.
const keptId = (kind: string, id: string) => kind === 'texture' ? replacementTextureId(id) : id;
const keptScoped = (kind: string, scoped: string) => { const m = /^(coach:[^:]*:)(.*)$/.exec(scoped); return m ? m[1] + keptId(kind, m[2]) : scoped; };
export function currentCosmeticCoach(): string {
 try { return JSON.parse(localStorage.getItem('myr5-recipe-v1') || '{}').body || 'myr5'; } catch { return 'myr5'; }
}
const ownerKey = () => `${KEY}/${encodeURIComponent(performanceOwner())}`;
function read(): Store {
 try {
  const d = JSON.parse(localStorage.getItem(ownerKey()) || '{}');
  return Object.fromEntries(['texture','color','palette'].map(kind => [kind, Array.isArray(d[kind]) ? [...new Set<string>(d[kind].filter((id: unknown) => typeof id === 'string').map((id: string) => keptScoped(kind, id)))] : []])) as Store;
 } catch { return empty(); }
}
function write(store: Store) { try { localStorage.setItem(ownerKey(), JSON.stringify(store)); return true; } catch { return false; } }
const hasScopedGrant = (kind:UnlockKind,id:string,coachId:string) => read()[kind]?.includes(cosmeticId(coachId,keptId(kind,id))) ?? false;
// The original MYR5 coach is the account's shared material showcase. A cosmetic
// earned for any coach is also available there, while every other coach remains
// coach-scoped. This reads the current owner's ledger, so account and guest data
// never cross boundaries.
function grantedToAnyCoach(kind: UnlockKind, id: string) {
 const normalized=keptId(kind,id);
 return (read()[kind]||[]).some(scoped=>{
  const match=/^coach:([^:]+):(.*)$/.exec(scoped);
  if(!match||match[2]!==normalized)return false;
  try{return decodeURIComponent(match[1])!=='myr5';}catch{return false;}
 });
}
export const isGrantedToOriginalCoach = (kind: UnlockKind,id: string) =>
 hasScopedGrant(kind,id,'myr5') || grantedToAnyCoach(kind,id);
export const isGranted = (kind: UnlockKind, id: string, coachId = currentCosmeticCoach()) =>
 coachId==='myr5' ? isGrantedToOriginalCoach(kind,id) : hasScopedGrant(kind,id,coachId);
function emitCosmeticsUnlocked(granted:{kind:UnlockKind;id:string;coachId:string}[]) {
 const EventCtor=globalThis.CustomEvent;
 if(typeof globalThis.dispatchEvent!=='function'||typeof EventCtor!=='function'||!granted.length)return;
 try{globalThis.dispatchEvent(new EventCtor('myr5:cosmetics-unlocked',{detail:{owner:performanceOwner(),granted}}));}catch{/* The grant remains saved if a listener cannot receive its notice. */}
}
export function grantUnlock(kind: UnlockKind, id: string, coachId = currentCosmeticCoach()) {
 if (!['texture','color','palette'].includes(kind) || typeof id !== 'string' || !id || typeof coachId !== 'string' || !coachId) return false;
 const s = read(), scoped = cosmeticId(coachId,keptId(kind,id));
 if (s[kind].includes(scoped)) return false;
 s[kind].push(scoped); if (!write(s)) return false;
 const normalized=keptId(kind,id),granted=[{kind,id:normalized,coachId}];
 markPending(kind,scoped);
 // Keep the original coach's new-item marker and notify the live 3D reward preview.
 if(coachId!=='myr5')markPending(kind,cosmeticId('myr5',normalized));
 emitCosmeticsUnlocked(granted);return true;
}
export const grantedIds = (kind: UnlockKind, coachId = currentCosmeticCoach()) => {
 const values=read()[kind]||[],prefix=cosmeticId(coachId,'');
 const own=values.filter(id=>id.startsWith(prefix)).map(id=>id.slice(prefix.length));
 if(coachId!=='myr5')return own;
 const inherited=values.flatMap(scoped=>{const match=/^coach:([^:]+):(.*)$/.exec(scoped);if(!match||!match[2])return[];try{return decodeURIComponent(match[1])==='myr5'?[]:[match[2]];}catch{return[];}});
 return [...new Set([...own,...inherited])];
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

// Collection completion writes once per owner, rather than once per cosmetic.
export const ownerGrantedIds=(kind:UnlockKind)=>{
 const values=read()[kind]||[],inherited=values.flatMap(scoped=>{const match=/^coach:([^:]+):(.*)$/.exec(scoped);if(!match||!match[2])return[];try{return decodeURIComponent(match[1])==='myr5'?[]:[cosmeticId('myr5',match[2])];}catch{return[];}});
 return [...new Set([...values,...inherited])];
};
export function grantUnlocks(items:{kind:UnlockKind;id:string;coachId:string}[]){
 const data=read(),sets=Object.fromEntries(['texture','color','palette'].map(kind=>[kind,new Set(data[kind as UnlockKind])])) as Record<UnlockKind,Set<string>>;
 const added:{kind:UnlockKind;id:string;coachId:string}[]=[];
 for(const item of items){if(!sets[item.kind]||typeof item.id!=='string'||!item.id||typeof item.coachId!=='string'||!item.coachId)continue;const normalized=keptId(item.kind,item.id),id=cosmeticId(item.coachId,normalized);if(sets[item.kind].has(id))continue;sets[item.kind].add(id);data[item.kind].push(id);added.push({kind:item.kind,id:normalized,coachId:item.coachId});}
 if(!added.length||!write(data))return 0;
 const pending=added.flatMap(({kind,id,coachId})=>[{kind,id:cosmeticId(coachId,id)},...(coachId==='myr5'?[]:[{kind,id:cosmeticId('myr5',id)}])]);
 markPendingMany(pending);emitCosmeticsUnlocked(added);return added.length;
}
