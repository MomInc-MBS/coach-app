const plain=value=>value&&typeof value==='object'&&!Array.isArray(value);
const text=(value,max=300)=>typeof value==='string'&&value.length>0&&value.length<=max&&value.trim()===value;
const hex=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const signature=value=>typeof value==='string'&&/^[A-Za-z0-9+/]+={0,2}$/.test(value)&&value.length>=80;
const exactVersion=value=>text(value,80)&&!/[\*\^~<>=|\s]/.test(value);
const safePath=value=>text(value,500)&&value.startsWith('/packs/')&&!value.includes('..')&&!/[?#]/.test(value);
const executable=value=>/\.(?:m?js|cjs|wasm|html?)$/i.test(value);
const stable=value=>Array.isArray(value)?value.map(stable):plain(value)?Object.fromEntries(Object.keys(value).sort().map(key=>[key,stable(value[key])])):value;
const base64Bytes=value=>Uint8Array.from((typeof atob==='function'?atob(value):Buffer.from(value,'base64').toString('binary')),char=>char.charCodeAt(0));
const identity=dependency=>JSON.stringify([dependency.name,dependency.version,dependency.sha256]);
const sameOriginHashed=(path,hash)=>safePath(path)&&path.toLowerCase().includes(hash.toLowerCase());

export const PACK_CATALOG_SCHEMA='mom-pack-catalog-v1';
export const PACK_CATALOG_PROTOCOL=1;
export const PACK_ASSET_MAX_BYTES=512*1024;
export const PACK_TOTAL_MAX_BYTES=2*1024*1024;
export const canonicalCatalogPayload=catalog=>JSON.stringify(stable({schema:catalog.schema,protocol:catalog.protocol,generation:catalog.generation,publishedAt:catalog.publishedAt,keyId:catalog.keyId,alg:catalog.alg,packs:catalog.packs}));

function validDependency(value){return plain(value)&&text(value.name,200)&&exactVersion(value.version)&&hex(value.sha256)&&Number.isSafeInteger(value.bytes)&&value.bytes>0&&value.bytes<=PACK_ASSET_MAX_BYTES&&sameOriginHashed(value.path,value.sha256)&&!executable(value.path)&&text(value.spdx,80)&&/^[-+.A-Za-z0-9]+$/.test(value.spdx)&&text(value.sourceUrl,1000)&&/^https:\/\//.test(value.sourceUrl)&&text(value.attribution,2000);}
function validPack(value){
 if(!plain(value)||!text(value.packId,200)||!exactVersion(value.version)||!text(value.fallbackId,200)||!value.fallbackId.startsWith('builtin:')||!plain(value.manifest)||!hex(value.manifest.sha256)||!Number.isSafeInteger(value.manifest.bytes)||value.manifest.bytes<=0||value.manifest.bytes>1024*1024||!sameOriginHashed(value.manifest.path,value.manifest.sha256)||!value.manifest.path.endsWith('.json')||!Array.isArray(value.dependencies)||value.dependencies.length>128||!value.dependencies.every(validDependency)||!Number.isSafeInteger(value.totalBytes)||value.totalBytes>PACK_TOTAL_MAX_BYTES||value.totalBytes!==value.manifest.bytes+value.dependencies.reduce((sum,item)=>sum+item.bytes,0))return false;
 return new Set(value.dependencies.map(identity)).size===value.dependencies.length;
}
export function isPackCatalog(value){return plain(value)&&value.schema===PACK_CATALOG_SCHEMA&&value.protocol===PACK_CATALOG_PROTOCOL&&Number.isSafeInteger(value.generation)&&value.generation>0&&Number.isSafeInteger(value.publishedAt)&&value.publishedAt>0&&text(value.keyId,200)&&value.alg==='Ed25519'&&signature(value.signature)&&Array.isArray(value.packs)&&value.packs.length>0&&value.packs.length<=200&&value.packs.every(validPack)&&new Set(value.packs.map(pack=>pack.packId)).size===value.packs.length;}
function keyFor(keyring,catalog){return Array.isArray(keyring)?keyring.find(entry=>entry?.keyId===catalog.keyId&&['release','recovery'].includes(entry.role)&&entry.protocols?.includes(catalog.protocol)):null;}
export async function verifyPackCatalog(catalog,keyring){
 if(!isPackCatalog(catalog))return false;const entry=keyFor(keyring,catalog),key=entry?.publicKey;if(key?.kty!=='OKP'||key.crv!=='Ed25519'||typeof key.x!=='string')return false;
 try{const subtle=globalThis.crypto?.subtle;if(!subtle)return false;const imported=await subtle.importKey('jwk',key,{name:'Ed25519'},false,['verify']);return await subtle.verify({name:'Ed25519'},imported,base64Bytes(catalog.signature),new TextEncoder().encode(canonicalCatalogPayload(catalog)));}catch{return false;}
}
export function dependencyIdentity(dependency){if(!validDependency(dependency))throw Error('Invalid catalog dependency.');return identity(dependency);}
