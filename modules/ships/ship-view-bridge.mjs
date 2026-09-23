// Statically imported by app.mjs ONLY (never by modules/ships/ship-view.mjs, which scripts/build.mjs
// serves unbundled in production — see external list). Being a static import of app.mjs means this
// module, and everything under it (material-config.mjs's build-time trust key define,
// post-download-sections.mjs -> battle-pass.mjs -> a .ts file), gets compiled into app-runtime.mjs
// instead of being fetched raw by the browser, where the define would be undefined and the .ts file
// would 404. tests/ship-view-import-graph.test.mjs enforces that ship-view.mjs never re-acquires
// this chain.
import {ownedShipIds} from './ship-access.mjs';
import {createVerifiedShipAssetBridge} from './verified-ship-assets.mjs';
import {productionMaterialTrust} from '../materials/material-config.mjs';
import {resolvePostDownloadSection} from '../materials/post-download-sections.mjs';
import {ChunkDownloader, indexedDbChunkStore, DEFAULT_LOCAL_RESOURCE_POLICY} from '../materials/chunk-delivery.mjs';

export {ownedShipIds};

/** Read-only: resolves to a ready ship/background asset bridge only if this account's owned ship
 * section is already downloaded and verified on this device. Never fetches chunk bytes — a
 * missing/partial pack always resolves to null, so opening the ship view can never start the 60MB
 * download on its own. */
export async function localVerifiedBridge() {
 const account = globalThis.myr5AuthenticatedAccount, owner = account?.user?.id;
 if (!owner || !ownedShipIds().length) return null;
 const trust = productionMaterialTrust(); if (!trust) return null;
 const resolved = await resolvePostDownloadSection('coach-ships-biomes', { trust });
 const downloader = new ChunkDownloader({ store: indexedDbChunkStore(), policy: DEFAULT_LOCAL_RESOURCE_POLICY, expectedVersion: resolved.manifest.version, manifestPublicKey: resolved.trust, ownership: async () => owner });
 await downloader.verifyStored(resolved.manifest); // local store reads + hash checks only, no network
 return createVerifiedShipAssetBridge({ downloader, manifest: resolved.manifest, isOwned: id => id === 'coach-ships-biomes', canUseShip: ownedShipIds });
}
