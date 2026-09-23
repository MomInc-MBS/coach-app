import { ChunkDownloader, DEFAULT_LOCAL_RESOURCE_POLICY, indexedDbChunkStore } from './chunk-delivery.mjs';
import { resolvePostDownloadSection } from './post-download-sections.mjs';
import { productionMaterialTrust } from './material-config.mjs';

const stable=id=>typeof id==='string'&&/^[A-Za-z0-9](?:[A-Za-z0-9._:-]{0,127})$/.test(id);
const getOwner=account=>account?.user?.id;

/** Resumable section delivery for a signed-in owner, invoked only after an explicit user action. */
export async function downloadPostDownloadSection({id,account=globalThis.myr5AuthenticatedAccount,authorize=()=>false,fetchImpl=globalThis.fetch,store=indexedDbChunkStore(),policy=DEFAULT_LOCAL_RESOURCE_POLICY,trust=productionMaterialTrust(),signal,onProgress}={}){
 const owner=getOwner(account);if(!stable(owner))throw new Error('Sign in before downloading a post-download section.');
 if(!authorize(id,account))throw new Error('Section access has not been authorized.');
 // An explicit null is a logout, never permission to reuse the captured account.
 const current=()=>Object.hasOwn(globalThis,'myr5AuthenticatedAccount')?globalThis.myr5AuthenticatedAccount:account;
 const allowed=()=>getOwner(current())===owner&&authorize(id,current());
 if(signal?.aborted||!allowed())throw new Error('Section download cancelled or account changed.');
 const resolved=await resolvePostDownloadSection(id,{fetchImpl,policy,trust,signal});
 const downloader=new ChunkDownloader({store,fetchImpl,policy,expectedVersion:resolved.manifest.version,manifestPublicKey:resolved.trust,ownership:async info=>info.packId===id&&allowed()?owner:false});
 const result=await downloader.downloadWithProgress(resolved.manifest,{signal,onProgress});await downloader.verifyStored(resolved.manifest);
 return Object.freeze({section:resolved.section,manifest:resolved.manifest,downloader,result,isOwned:()=>allowed()});
}

export async function downloadAllPostDownloadSections(options={}){
 options={...options,account:options.account??globalThis.myr5AuthenticatedAccount};
 const {fullPostDownloadSectionIds}=await import('./post-download-sections.mjs');const output=[];
 for(const id of fullPostDownloadSectionIds()){if(options.signal?.aborted)throw new Error('section download paused; resume is available');output.push(await downloadPostDownloadSection({...options,id}));}
 return Object.freeze(output);
}

/** Starter set: exactly the selected exercise packets plus Meditation. */
export async function downloadStarterPostDownloadSections(options={}){
 options={...options,account:options.account??globalThis.myr5AuthenticatedAccount};
 const {POST_DOWNLOAD_SECTIONS,starterPostDownloadSectionIds}=await import('./post-download-sections.mjs');
 const ids=starterPostDownloadSectionIds(options.account??globalThis.myr5AuthenticatedAccount);
 const output=[];
 for(const id of ids){if(options.signal?.aborted)throw new Error('section download paused; resume is available');output.push(await downloadPostDownloadSection({...options,id}));}
 return Object.freeze(output);
}
