import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const revision='40911d5761c2e8167664c3416fb37580246c74b9';
const files=[['myr5.glb','1593467f0aa641119d56f28b2a98af3877fe08ec'],['anatomy.glb','1035a26eb090e8a0436495a3c62839ad67a718b6'],['hands-v2.glb','83713fc5689b8e78ced779fcb5435d14b04d4c7a']];
const blobId=bytes=>createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
export async function ensureHandAssets(){
 const path='handborne/models/family-20.glb',expected='e77adfca6536a7221d9006048717a8f4fce0552e';
 await mkdir('handborne/models',{recursive:true});
 let bytes;try{bytes=await readFile(path);}catch{
  const url='https://raw.githubusercontent.com/MomInc-MBS/mominc-mbs.github.io/b625d640418dddf988ce5a028a0a0a10da87fd32/handborne/models/family-20.glb';
  const response=await fetch(url);if(!response.ok)throw Error(`Could not download the Fluffy hand model: ${response.status}`);bytes=Buffer.from(await response.arrayBuffer());
 }
 if(blobId(bytes)!==expected)throw Error('Fluffy hand model content check failed.');
 await writeFile(path,bytes);
}
export async function ensureAssets(){await mkdir('creature/models',{recursive:true});for(const [name,expected]of files){const path=`creature/models/${name}`;let bytes;try{bytes=await readFile(path);}catch{if(name==='hands-v2.glb')throw Error('Restore the authored hands-v2.glb from the project source.');const url=`https://raw.githubusercontent.com/MomInc-MBS/mominc-mbs.github.io/${revision}/tv/assets/armie-intro/myr5/models/${name}`;const response=await fetch(url);if(!response.ok)throw Error(`Could not download ${name}: ${response.status}`);bytes=Buffer.from(await response.arrayBuffer());}if(blobId(bytes)!==expected)throw Error(`Model content check failed: ${name}`);await writeFile(path,bytes);}}
