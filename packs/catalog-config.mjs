import {PUBLIC_PACK_CATALOG_KEYS} from './catalog-keys.generated.mjs';

const usable=entry=>entry&&typeof entry==='object'&&typeof entry.keyId==='string'&&entry.keyId.length>0
 && ['release','recovery'].includes(entry.role)&&Array.isArray(entry.protocols)&&entry.protocols.includes(1)
 && entry.publicKey?.kty==='OKP'&&entry.publicKey?.crv==='Ed25519'&&typeof entry.publicKey.x==='string'
 && /^[A-Za-z0-9_-]{43}$/.test(entry.publicKey.x)&&!/^A+$/.test(entry.publicKey.x);
export function productionCatalogKeyring(){
 const entries=PUBLIC_PACK_CATALOG_KEYS.filter(usable).map(entry=>Object.freeze({keyId:entry.keyId,role:entry.role,protocols:Object.freeze([...entry.protocols]),publicKey:Object.freeze({kty:'OKP',crv:'Ed25519',x:entry.publicKey.x,ext:true})}));
 return Object.freeze(entries);
}
