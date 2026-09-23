import CATALOG from '../../creature/source/creator/creature-skins.json' with { type:'json' };
import { ACCOUNT_SCOPED_LEDGER_KINDS, isGranted, grantedIds } from '../../unlock-ledger.mjs';
import { ChunkDownloader, DEFAULT_LOCAL_RESOURCE_POLICY, indexedDbChunkStore, sha256Chunk } from './chunk-delivery.mjs';
import { resolvePostDownloadSection } from './post-download-sections.mjs';
import { unpackVerifiedBundle } from './verified-bundle.mjs';

const safeOwner=value=>typeof value==='string'&&/^[A-Za-z0-9](?:[A-Za-z0-9._:-]{0,127})$/.test(value);
const mapNames=Object.freeze({basecolor:'basecolor',normal:'normal',roughness:'roughness',height:'height',metalness:'metalness',tintMask:'tintMask',ao:'ao',opacity:'opacity',emissive:'emissive',preview:'preview'});

/** Read-only installed-pack seam. It verifies the hosted signature and already-stored chunks;
 * it never downloads missing chunks. The caller owns disposal and must replace it on account changes. */
export function createInstalledCreatureSkinSource({account=globalThis.myr5AuthenticatedAccount,fetchImpl=globalThis.fetch,store,policy=DEFAULT_LOCAL_RESOURCE_POLICY,trust}={}){
 const owner=typeof account==='string'?account:account?.user?.id;
 if(!safeOwner(owner))return Object.freeze({owner:null,list:async()=>[],resolve:async()=>null,dispose(){}});
 if(!ACCOUNT_SCOPED_LEDGER_KINDS?.includes('creature-skin'))return Object.freeze({owner:null,list:async()=>[],resolve:async()=>null,dispose(){}});
 let disposed=false;const tracks=new Map(),available=new Map();
 const current=()=>!disposed&&(typeof globalThis.myr5AuthenticatedAccount==='string'?globalThis.myr5AuthenticatedAccount:globalThis.myr5AuthenticatedAccount?.user?.id)===owner;
 const owned=id=>current()&&isGranted('creature-skin',id,{account:owner});
 async function loadTrack(track){
  if(tracks.has(track))return tracks.get(track);
  const work=(async()=>{
   if(!current())throw new Error('Skin owner changed.');
   const sectionId=`track-${track}`,resolved=await resolvePostDownloadSection(sectionId,{fetchImpl,policy,...(trust?{trust}:{})});
   const sectionStore=store??indexedDbChunkStore();
   const downloader=new ChunkDownloader({store:sectionStore,fetchImpl,policy,expectedVersion:resolved.manifest.version,manifestPublicKey:resolved.trust,ownership:async info=>current()&&info.packId===sectionId?owner:false});
   await downloader.verifyStored(resolved.manifest);
   const path=`assets/${track}.m5bundle`,asset=await downloader.readVerifiedAsset(resolved.manifest,path);
   const entries=await unpackVerifiedBundle(asset.bytes);
   if(!current())throw new Error('Skin owner changed.');
   return entries;
  })();
  tracks.set(track,work);try{return await work}catch(error){tracks.delete(track);throw error;}
 }
 async function list(){
  if(!current())return Object.freeze([]);
  const ids=new Set(grantedIds('creature-skin',{account:owner}));
  const rows=CATALOG.skins.filter(skin=>ids.has(skin.id)&&owned(skin.id));
  const groups=new Map();for(const skin of rows){if(!groups.has(skin.track))groups.set(skin.track,[]);groups.get(skin.track).push(skin);}
  const found=[];
  for(const [track,skins] of groups){
   let bundle;try{bundle=await loadTrack(track)}catch{continue;}
   for(const skin of skins){if(!owned(skin.id))continue;const maps={};let valid=true;for(const name of Object.keys(mapNames)){const expected=skin.maps[name],bytes=bundle.get(`${skin.id}/${name}`);if(!bytes)continue;if(!expected||bytes.byteLength!==expected.bytes||await sha256Chunk(bytes)!==expected.sha256){valid=false;break;}maps[name]=bytes;}
    if(valid&&Object.keys(maps).length){const item=Object.freeze({id:skin.id,displayName:skin.displayName,track,collection:skin.collection,maps:Object.freeze(maps)});available.set(skin.id,item);found.push(item);}
   }
  }
  if(!current()){available.clear();return Object.freeze([]);}
  return Object.freeze(found);
 }
 async function resolve(id){
  if(!owned(id))return null;
  if(!available.has(id))await list();
  if(!owned(id))return null;
  return available.get(id)??null;
 }
 return Object.freeze({owner,list,resolve,dispose(){disposed=true;available.clear();tracks.clear();}});
}

export const CREATURE_SKIN_MAP_SEMANTICS=Object.freeze({
 basecolor:'srgb',tintMask:'srgb',emissive:'srgb',normal:'linear',roughness:'linear',height:'linear',metalness:'linear',ao:'linear',opacity:'linear',
 normalConvention:'OpenGL +Y',tint:'linear-space triad lookup driven by the decoded grayscale tint mask',
});
