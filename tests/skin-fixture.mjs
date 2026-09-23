import {readFile} from 'node:fs/promises';
import {createHash,generateKeyPairSync,sign} from 'node:crypto';
import CATALOG from '../creature/source/creator/creature-skins.json' with {type:'json'};
import {canonicalChunkPayload} from '../modules/materials/chunk-delivery.mjs';
export const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
export function bundle(entries){let offset=0;const index=Object.fromEntries(entries.map(([name,bytes])=>{const row={offset,bytes:bytes.length,sha256:digest(bytes)};offset+=bytes.length;return[name,row];}));const header=Buffer.from(JSON.stringify(index)),prefix=Buffer.alloc(4);prefix.writeUInt32BE(header.length);return Buffer.concat([prefix,header,...entries.map(row=>row[1])]);}
export async function signedSkinFixture(origin='https://example.test'){
 const skin=CATALOG.skins.find(row=>row.track==='chest'),maps=Object.fromEntries(await Promise.all(Object.entries(skin.maps).map(async([name,meta])=>[name,await readFile(new URL('../plan/assets-inbox/creature-skins/forged-realms/'+meta.file,import.meta.url))]))),asset=bundle(Object.entries(maps).map(([name,bytes])=>[`${skin.id}/${name}`,bytes])),chunks=[];
 for(let offset=0;offset<asset.length;offset+=1024*1024){const bytes=asset.subarray(offset,offset+1024*1024);chunks.push({index:chunks.length,offset,bytes:bytes.length,sha256:digest(bytes),url:origin+'/materials/chest'});}
 const pair=generateKeyPairSync('ed25519'),trust=pair.publicKey.export({format:'jwk'}),manifest={schema:'mom-material-chunks-v1',packId:'track-chest',version:'1.0.0',keyId:'fixture-v1',assets:[{path:'assets/chest.m5bundle',bytes:asset.length,sha256:digest(asset),chunks}]};
 manifest.signature=sign(null,Buffer.from(canonicalChunkPayload(manifest)),pair.privateKey).toString('base64');return {skin,maps,asset,trust,manifest};
}
