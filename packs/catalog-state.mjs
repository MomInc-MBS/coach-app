import {canonicalCatalogPayload,dependencyIdentity,verifyPackCatalog} from './catalog-trust.mjs';

export const PACK_CATALOG_STATE_KEY='myr5-pack-catalog-v1';
const clone=value=>JSON.parse(JSON.stringify(value));
const memory=()=>{const values=new Map();return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,String(value)),removeItem:key=>values.delete(key)};};

export async function readLastGoodCatalog({storage=globalThis.localStorage??memory(),keyring}={}){
 let record;try{record=JSON.parse(storage.getItem(PACK_CATALOG_STATE_KEY)||'null');}catch{return null;}
 if(!record?.catalog||!await verifyPackCatalog(record.catalog,keyring))return null;
 return clone(record.catalog);
}
export async function promotePackCatalog({catalog,keyring,storage=globalThis.localStorage??memory(),now=()=>Date.now()}={}){
 if(!await verifyPackCatalog(catalog,keyring))throw Error('Pack catalog signature is invalid.');
 const previous=await readLastGoodCatalog({storage,keyring});
 if(previous){
  if(catalog.generation<previous.generation)throw Error('Pack catalog generation cannot move backward.');
  if(catalog.generation===previous.generation){if(canonicalCatalogPayload(catalog)!==canonicalCatalogPayload(previous)||catalog.signature!==previous.signature)throw Error('Pack catalog generation conflicts with the last good catalog.');return {catalog:previous,duplicate:true};}
 }
 storage.setItem(PACK_CATALOG_STATE_KEY,JSON.stringify({catalog:clone(catalog),verifiedAt:now()}));
 const restored=await readLastGoodCatalog({storage,keyring});if(!restored||restored.generation!==catalog.generation)throw Error('Pack catalog could not be restored after promotion.');
 return {catalog:restored,duplicate:false};
}
export function dependencyReferenceCounts(catalog,installedPackIds){
 const selected=new Set(installedPackIds),counts=new Map(),records=new Map();
 for(const pack of catalog?.packs??[])if(selected.has(pack.packId))for(const dependency of pack.dependencies){const id=dependencyIdentity(dependency);counts.set(id,(counts.get(id)||0)+1);records.set(id,clone(dependency));}
 return new Map([...counts].sort(([a],[b])=>a.localeCompare(b)).map(([id,count])=>[id,Object.freeze({count,dependency:Object.freeze(records.get(id))})]));
}
export function planPackRemoval(catalog,installedPackIds,removePackId){
 const before=dependencyReferenceCounts(catalog,installedPackIds),afterIds=[...installedPackIds].filter(id=>id!==removePackId),after=dependencyReferenceCounts(catalog,afterIds),remove=[];
 for(const [id,record] of before)if(!after.has(id))remove.push(record.dependency);
 return Object.freeze({installedPackIds:Object.freeze(afterIds),removeDependencies:Object.freeze(remove)});
}
export function aggregateCatalogLicenses(catalog,installedPackIds=(catalog?.packs??[]).map(pack=>pack.packId)){
 const refs=dependencyReferenceCounts(catalog,installedPackIds),seen=new Set(),records=[];
 for(const {dependency} of refs.values()){const key=JSON.stringify([dependency.name,dependency.version,dependency.spdx,dependency.sourceUrl,dependency.attribution]);if(!seen.has(key)){seen.add(key);records.push({name:dependency.name,version:dependency.version,spdx:dependency.spdx,sourceUrl:dependency.sourceUrl,attribution:dependency.attribution});}}
 return Object.freeze(records.sort((a,b)=>a.name.localeCompare(b.name)||a.version.localeCompare(b.version)).map(Object.freeze));
}
