import {accountPackGrants,packAccountIdentity} from './pack-entitlements.mjs';

export const PACK_GRANT_CACHE_KEY='myr5-pack-grants-v1';
const plain=value=>value&&typeof value==='object'&&!Array.isArray(value);
const owner=value=>typeof value==='string'&&value.length>0&&value.length<=200&&value.trim()===value?value:null;
const epoch=value=>Number.isSafeInteger(value)&&value>0?value:null;
const grant=value=>plain(value)&&typeof value.packId==='string'&&value.packId.length>0&&value.packId.length<=200&&value.packId.trim()===value.packId&&value.status==='owned'&&Number.isSafeInteger(value.grantedAt)&&value.grantedAt>=0;
const clone=value=>JSON.parse(JSON.stringify(value));

export function memoryGrantStorage(){const values=new Map();return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,String(value)),removeItem:key=>values.delete(key)};}
function read(storage){
 try{
  const value=JSON.parse(storage.getItem(PACK_GRANT_CACHE_KEY)||'{}');
  if(!plain(value)||value.version!==1||!(value.activeOwner===null||owner(value.activeOwner))||!plain(value.owners))return {version:1,activeOwner:null,owners:{}};
  const owners={};
  for(const [id,record] of Object.entries(value.owners))if(owner(id)===id&&plain(record)&&epoch(record.dataEpoch)&&Number.isSafeInteger(record.confirmedAt)&&record.confirmedAt>=0&&Array.isArray(record.grants)&&record.grants.every(grant))owners[id]={dataEpoch:record.dataEpoch,confirmedAt:record.confirmedAt,grants:clone(record.grants)};
  return {version:1,activeOwner:owners[value.activeOwner]?value.activeOwner:null,owners};
 }catch{return {version:1,activeOwner:null,owners:{}};}
}

export function createPackGrantCache({storage=globalThis.localStorage??memoryGrantStorage(),now=()=>Date.now()}={}){
 let state=read(storage);
 const persist=()=>storage.setItem(PACK_GRANT_CACHE_KEY,JSON.stringify(state));
 return Object.freeze({
  confirm(account){
   const id=packAccountIdentity(account),dataEpoch=epoch(account?.dataEpoch);if(!id||!dataEpoch)throw Error('A canonical account scope is required to confirm pack grants.');
   const grants=accountPackGrants(account,id).map(item=>({packId:item.packId,status:'owned',grantedAt:item.grantedAt}));
   state={version:1,activeOwner:id,owners:{...state.owners,[id]:{dataEpoch,confirmedAt:now(),grants}}};persist();return account;
  },
  active(){const id=state.activeOwner,record=id&&state.owners[id];return record?Object.freeze({user:Object.freeze({id}),dataEpoch:record.dataEpoch,entitlements:Object.freeze({ownedPacks:Object.freeze(clone(record.grants))}),offlineGrantSnapshot:true}):null;},
  forOwner(id){id=owner(id);const record=id&&state.owners[id];return record?Object.freeze({user:Object.freeze({id}),dataEpoch:record.dataEpoch,entitlements:Object.freeze({ownedPacks:Object.freeze(clone(record.grants))}),offlineGrantSnapshot:true}):null;},
  deactivate(){if(state.activeOwner===null)return;state={...state,activeOwner:null};persist();},
  remove(id){id=owner(id);if(!id)return;const owners={...state.owners};delete owners[id];state={version:1,activeOwner:state.activeOwner===id?null:state.activeOwner,owners};persist();},
  inspect(){return clone(state);}
 });
}
