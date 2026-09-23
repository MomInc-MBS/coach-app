import { DEFAULT_LOCAL_RESOURCE_POLICY, indexedDbChunkStore } from '../materials/chunk-delivery.mjs';
import { downloadPostDownloadSection } from '../materials/post-download-controller.mjs';
import { createVerifiedShipAssetBridge } from './verified-ship-assets.mjs';
import { ownedShipIds } from './ship-access.mjs';

const ownerId=account=>account?.user?.id;
const stable=id=>typeof id==='string'&&/^[A-Za-z0-9](?:[A-Za-z0-9._:-]{0,127})$/.test(id);

/** User-triggered ship section download; requires signed hosted metadata and explicit access authorization. */
export async function downloadOwnedShipSection({account=globalThis.myr5AuthenticatedAccount,authorize=()=>false,fetchImpl=globalThis.fetch,store=indexedDbChunkStore(),policy=DEFAULT_LOCAL_RESOURCE_POLICY,signal,onProgress}={}){
 const owner=ownerId(account);if(!stable(owner)||!ownedShipIds().length)throw new Error('Sign in and unlock a ship before downloading this section.');
 if(!authorize('coach-ships-biomes',account))throw new Error('Ship section access has not been authorized.');
 const delivery=await downloadPostDownloadSection({id:'coach-ships-biomes',account,authorize:(_id,current)=>ownerId(current)===owner&&authorize(_id,current)&&ownedShipIds().length>0,fetchImpl,store,policy,signal,onProgress});
 return Object.freeze({manifest:delivery.manifest,downloader:delivery.downloader,createBridge:()=>createVerifiedShipAssetBridge({downloader:delivery.downloader,manifest:delivery.manifest,isOwned:id=>id==='coach-ships-biomes'&&delivery.isOwned()&&ownedShipIds().length>0,canUseShip:ownedShipIds})});
}
