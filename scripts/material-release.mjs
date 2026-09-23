import { createHash, createPrivateKey, createPublicKey, sign } from 'node:crypto';
import { mkdir, readFile, writeFile, readdir } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { canonicalChunkPayload, DEFAULT_LOCAL_RESOURCE_POLICY, validateChunkManifest, verifyChunkManifest } from '../modules/materials/chunk-delivery.mjs';

export const MATERIAL_SECTION_IDS=Object.freeze(['track-arms','track-cardio','track-chest','track-glutes','track-martial-arts','track-meditation','track-quads','track-yoga','coach-ships-biomes']);
const SHA=/^[a-f0-9]{40}$/;
const safeSegment=value=>typeof value==='string'&&/^[A-Za-z0-9_.-]{1,100}$/.test(value)&&value!=='.'&&value!=='..';

/** Only a full commit object ID is accepted: branch and movable tag names are not immutable pins. */
export function parseMaterialsBaseUrl(value){
 let url;try{url=new URL(value);}catch{throw new Error('MYR5_MATERIALS_BASE_URL must be a commit-pinned raw.githubusercontent.com URL.');}
 const match=url.pathname.match(/^\/([^/]+)\/([^/]+)\/([a-f0-9]{40})\/materials$/);
 if(url.origin!=='https://raw.githubusercontent.com'||!match||!safeSegment(match[1])||!safeSegment(match[2])||!SHA.test(match[3])||url.username||url.password||url.search||url.hash)throw new Error('MYR5_MATERIALS_BASE_URL must be https://raw.githubusercontent.com/<owner>/<repo>/<40-char-commit>/materials.');
 return Object.freeze({baseUrl:url.href.replace(/\/$/,''),trustedOrigins:Object.freeze([url.origin]),allowedProtocols:Object.freeze(['https:']),pathPrefix:`/${match[1]}/${match[2]}/${match[3]}/materials/`});
}

export function publicJwkFromPrivate(input){
 let value;try{value=typeof input==='string'?JSON.parse(input):input;}catch{throw new Error('Material signing key must be an Ed25519 private JWK.');}
 if(!value||value.kty!=='OKP'||value.crv!=='Ed25519'||typeof value.d!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(value.d)||typeof value.x!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(value.x))throw new Error('Material signing key must be an Ed25519 private JWK.');
 try{const privateKey=createPrivateKey({key:value,format:'jwk'}),derived=createPublicKey(privateKey).export({format:'jwk'});if(derived.x!==value.x)throw new Error();return Object.freeze({kty:'OKP',crv:'Ed25519',x:derived.x});}catch{throw new Error('Material signing key is invalid.');}
}

export function loadMaterialPublicBuildConfig(env=process.env){
 const rawKey=env.MYR5_MATERIAL_PUBLIC_SIGNING_JWK,base=env.MYR5_MATERIALS_BASE_URL;
 if(!rawKey&&!base)return Object.freeze({configured:false,defines:Object.freeze({}),policy:null,publicJwk:null});
 if(!rawKey||!base)throw new Error('Set both MYR5_MATERIAL_PUBLIC_SIGNING_JWK and MYR5_MATERIALS_BASE_URL, or neither.');
 const host=parseMaterialsBaseUrl(base);let key;try{key=JSON.parse(rawKey);}catch{throw new Error('MYR5_MATERIAL_PUBLIC_SIGNING_JWK must be a public Ed25519 JWK.');}
 if(!key||key.kty!=='OKP'||key.crv!=='Ed25519'||typeof key.x!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(key.x)||'d'in key||Object.keys(key).some(field=>!['kty','crv','x','alg','use','key_ops','ext'].includes(field))||(key.key_ops&&(!Array.isArray(key.key_ops)||key.key_ops.some(op=>op!=='verify'))))throw new Error('MYR5_MATERIAL_PUBLIC_SIGNING_JWK must be a public Ed25519 JWK without private fields.');
 const publicJwk=Object.freeze({kty:'OKP',crv:'Ed25519',x:key.x}),policy=Object.freeze({trustedOrigins:host.trustedOrigins,allowedProtocols:host.allowedProtocols,pathPrefix:host.pathPrefix});
 return Object.freeze({configured:true,publicJwk,policy,defines:Object.freeze({__MYR5_MATERIAL_PUBLIC_JWK__:JSON.stringify(publicJwk),__MYR5_MATERIAL_RESOURCE_POLICY__:JSON.stringify(policy)})});
}

const safeOutput=(root,path)=>{const full=resolve(path),base=resolve(root);if(full===base||!full.startsWith(base+sep))throw new Error('Output path must be a dedicated child directory.');return full;};
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const expectedPaths=id=>id==='coach-ships-biomes'?['supportive','direct','analytical','playful','calm','mom'].map(ship=>`assets/ships/${ship}.glb`).concat('assets/biomes.m5bundle'):[`assets/${id.slice(6)}.m5bundle`];
function validateSectionInventory(manifest,host){
 const expected=expectedPaths(manifest.packId).sort(),actual=manifest.assets.map(asset=>asset.path).sort();
 if(JSON.stringify(actual)!==JSON.stringify(expected))throw new Error(`Section asset inventory mismatch: ${manifest.packId}.`);
 for(const asset of manifest.assets){const filename=asset.path.split('/').at(-1),expectedUrl=`${host.baseUrl}/${manifest.packId}/1.0.0/${filename}`;if(asset.chunks.some(chunk=>chunk.url!==expectedUrl))throw new Error(`Section asset URL mismatch: ${manifest.packId}/${asset.path}.`);}
}

/** Signs all nine manifests, stages host bytes without overwriting conflicts, and stages only manifests for Sites. */
export async function signAndStageMaterialSections({inputDir,hostRoot,siteRoot,baseUrl,privateJwk,keyId='mom-material-production-v1'}={}){
 if(!inputDir||!hostRoot||!siteRoot||!privateJwk)throw new Error('Input, host stage, Site manifest stage, and signing key are required.');
 const host=parseMaterialsBaseUrl(baseUrl),input=resolve(inputDir),hostOut=resolve(hostRoot),siteOut=resolve(siteRoot);
 const inside=(parent,child)=>child===parent||child.startsWith(parent+sep);
 if(inside(input,hostOut)||inside(input,siteOut)||inside(hostOut,siteOut)||inside(siteOut,hostOut))throw new Error('Input, host stage, and Site manifest stage must be separate directory trees.');
 if(hostOut.split(sep).some(part=>['dist','client'].includes(part.toLowerCase())))throw new Error('Raw-host asset staging must remain outside deployable Sites directories.');
 await mkdir(hostOut,{recursive:true});await mkdir(siteOut,{recursive:true});if((await readdir(siteOut)).length)throw new Error('Site manifest staging must be an empty dedicated directory.');
 if(!/^[A-Za-z0-9][A-Za-z0-9._-]{0,62}$/.test(keyId))throw new Error('Material key ID is invalid.');
 const publicJwk=publicJwkFromPrivate(privateJwk),privateKey=createPrivateKey({key:typeof privateJwk==='string'?JSON.parse(privateJwk):privateJwk,format:'jwk'}),policy={...DEFAULT_LOCAL_RESOURCE_POLICY,...host};
 const sectionSummaries=[];
 for(const id of MATERIAL_SECTION_IDS){
  const dir=join(input,id);let manifest;try{manifest=JSON.parse(await readFile(join(dir,'chunk-manifest.unsigned.json'),'utf8'));}catch{throw new Error(`Missing unsigned manifest for ${id}.`);}
  if(manifest.schema!=='mom-material-chunks-v1'||manifest.packId!==id||manifest.version!=='1.0.0'||!Array.isArray(manifest.assets)||!manifest.assets.length)throw new Error(`Unsigned manifest identity mismatch for ${id}.`);
  manifest.keyId=keyId;manifest.signature='';validateChunkManifest(manifest,policy);validateSectionInventory(manifest,host);
  const hostedPaths=new Set();for(const asset of manifest.assets){
   const urls=new Set(asset.chunks.map(chunk=>chunk.url));if(urls.size!==1)throw new Error(`Asset URLs must resolve to one immutable file: ${id}/${asset.path}`);
   const url=new URL([...urls][0]),expectedPrefix=`${host.baseUrl}/${id}/1.0.0/`,filename=decodeURIComponent(url.pathname.split('/').at(-1)||'');
   if(url.origin!==host.trustedOrigins[0]||!url.href.startsWith(expectedPrefix)||url.search||url.hash)throw new Error(`Chunk URL escapes the configured immutable host: ${id}/${asset.path}`);
   const bytes=await readFile(join(dir,asset.path));if(bytes.byteLength!==asset.bytes||await digest(bytes)!==asset.sha256)throw new Error(`Asset bytes do not match manifest: ${id}/${asset.path}`);
   for(const chunk of asset.chunks)if(await digest(bytes.subarray(chunk.offset,chunk.offset+chunk.bytes))!==chunk.sha256)throw new Error(`Asset chunk hash mismatch: ${id}/${asset.path}/${chunk.index}`);
   if(!safeSegment(filename)||url.pathname!==`${host.pathPrefix}${id}/1.0.0/${filename}`)throw new Error(`Chunk URL has an unsafe asset path: ${id}/${asset.path}`);
   if(hostedPaths.has(url.pathname))throw new Error(`Two assets map to one hosted path: ${id}/${url.pathname}`);hostedPaths.add(url.pathname);
   const destination=safeOutput(hostOut,join(hostOut,'materials',id,'1.0.0',filename));await mkdir(dirname(destination),{recursive:true});
   try{const hosted=await readFile(destination);if(!hosted.equals(bytes))throw new Error(`Existing raw-host file differs from the signed source: ${id}/${filename}`);}catch(error){if(error?.code!=='ENOENT')throw error;await writeFile(destination,bytes,{flag:'wx'});}
  }
  // Publish only authenticated wire-format fields, never arbitrary input metadata.
  manifest=JSON.parse(canonicalChunkPayload(manifest));manifest.signature=sign(null,Buffer.from(canonicalChunkPayload(manifest)),privateKey).toString('base64');
  await verifyChunkManifest(manifest,publicJwk,policy);validateSectionInventory(manifest,host);
  const siteManifest=safeOutput(siteOut,join(siteOut,'materials',id,'chunk-manifest.json'));await mkdir(dirname(siteManifest),{recursive:true});await writeFile(siteManifest,JSON.stringify(manifest,null,2)+'\n');
  sectionSummaries.push({id,assets:manifest.assets.length,bytes:manifest.assets.reduce((n,a)=>n+a.bytes,0)});
 }
 return Object.freeze({signed:true,publicJwk,policy,sections:Object.freeze(sectionSummaries)});
}

export async function copySignedMaterialManifests({sourceDir,siteRoot,baseUrl,publicJwk}={}){
 if(!sourceDir||!siteRoot||!publicJwk)throw new Error('Signed manifest source, Site root, and public trust key are required.');
 if(publicJwk.kty!=='OKP'||publicJwk.crv!=='Ed25519'||typeof publicJwk.x!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(publicJwk.x)||'d'in publicJwk)throw new Error('Signed manifest copy requires a public Ed25519 verification key.');
 const host=parseMaterialsBaseUrl(baseUrl),source=resolve(sourceDir),site=resolve(siteRoot),inside=(parent,child)=>child===parent||child.startsWith(parent+sep);
 if(inside(site,source))throw new Error('Signed manifests must be staged outside the Sites archive.');
 const policy={...DEFAULT_LOCAL_RESOURCE_POLICY,...host},copied=[];
 for(const id of MATERIAL_SECTION_IDS){
  const path=join(source,'materials',id,'chunk-manifest.json');let manifest,bytes;try{bytes=await readFile(path);manifest=JSON.parse(bytes.toString('utf8'));}catch{throw new Error(`Missing signed Site manifest for ${id}.`);}
  if(manifest.packId!==id||manifest.version!=='1.0.0'||!manifest.signature)throw new Error(`Signed manifest identity mismatch for ${id}.`);
  await verifyChunkManifest(manifest,publicJwk,policy);validateSectionInventory(manifest,host);
  if(!isDeepStrictEqual(manifest,{...JSON.parse(canonicalChunkPayload(manifest)),signature:manifest.signature}))throw new Error(`Signed manifest contains unauthenticated metadata: ${id}.`);
  const destination=safeOutput(site,join(site,'materials',id,'chunk-manifest.json'));await mkdir(dirname(destination),{recursive:true});await writeFile(destination,bytes);copied.push(id);
 }
 return Object.freeze(copied);
}

async function stdinSecret(){if(process.stdin.isTTY)throw new Error('Provide the signing JWK through MYR5_MATERIAL_SIGNING_PRIVATE_JWK or stdin.');let text='';for await(const chunk of process.stdin)text+=chunk;if(!text.trim())throw new Error('Signing JWK input is empty.');return text.trim();}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{const inputDir=process.env.MYR5_POST_DOWNLOAD_INPUT_DIR,hostRoot=process.env.MYR5_MATERIAL_HOST_STAGE_DIR,siteRoot=process.env.MYR5_MATERIAL_SITE_MANIFESTS,baseUrl=process.env.MYR5_MATERIALS_BASE_URL,secret=process.env.MYR5_MATERIAL_SIGNING_PRIVATE_JWK??await stdinSecret();const result=await signAndStageMaterialSections({inputDir,hostRoot,siteRoot,baseUrl,privateJwk:secret,keyId:process.env.MYR5_MATERIAL_SIGNING_KEY_ID||undefined});process.stdout.write(JSON.stringify(result)+'\n');}
 catch(error){process.stderr.write(`${error.message}\n`);process.exitCode=1;}
}
