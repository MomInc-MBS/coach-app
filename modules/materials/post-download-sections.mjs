import { DEFAULT_LOCAL_RESOURCE_POLICY, verifyChunkManifest } from './chunk-delivery.mjs';
import { productionMaterialTrust } from './material-config.mjs';

// Metadata is intentionally small and core-safe. Track bundles combine both skin collections;
// the source manifests/chunk bytes stay on the post-download host and require a real signature.
import { selectedTracks } from '../../battle-pass.mjs';

export const POST_DOWNLOAD_SECTIONS = Object.freeze([
  ...['chest','quads','glutes','arms','yoga','martial-arts','cardio','meditation'].map(track => Object.freeze({ id:`track-${track}`, track, title:track==='arms'?'Arms & Shoulders':track[0].toUpperCase()+track.slice(1), kind:'creature-skins', path:`/materials/track-${track}/chunk-manifest.json`, version:'1.0.0' })),
  Object.freeze({ id:'coach-ships-biomes', title:'Ships and worlds', kind:'ships-biomes', path:'/materials/coach-ships-biomes/chunk-manifest.json', version:'1.0.0' }),
]);

const TRACK_PACKET_ALIAS=Object.freeze({'arms-shoulders':'arms'});
export function starterPostDownloadSectionIds(account=globalThis.myr5AuthenticatedAccount){
  return Object.freeze([...new Set([...selectedTracks(account)].map(track=>TRACK_PACKET_ALIAS[track]??track))].map(track=>`track-${track}`));
}
export function fullPostDownloadSectionIds(){ return Object.freeze(POST_DOWNLOAD_SECTIONS.map(section=>section.id)); }

const base64Signature = value => typeof value === 'string' && /^[A-Za-z0-9+/]+={0,2}$/.test(value) && value.length >= 80;

export async function resolvePostDownloadSection(id, { fetchImpl = globalThis.fetch, trust = productionMaterialTrust(), policy = DEFAULT_LOCAL_RESOURCE_POLICY } = {}) {
  const section = POST_DOWNLOAD_SECTIONS.find(row => row.id === id);
  if (!section) throw new Error('Unknown post-download section.');
  if (!trust) throw new Error('This section is unavailable until a production signing key is configured.');
  const response = await fetchImpl(section.path, { credentials:'same-origin', redirect:'error', cache:'no-store' });
  if (!response.ok || response.redirected) throw new Error('The signed section manifest could not be loaded.');
  const manifest = await response.json();
  if (manifest.packId !== section.id || manifest.version !== section.version || !base64Signature(manifest.signature)) throw new Error('The section has no valid published signature.');
  await verifyChunkManifest(manifest, trust, policy);
  return Object.freeze({ section, manifest, trust, policy });
}

export function postDownloadSectionStatus(id, { trust = productionMaterialTrust(), manifest = null } = {}) {
  const section = POST_DOWNLOAD_SECTIONS.find(row => row.id === id);
  if (!section) return Object.freeze({ available:false, reason:'unknown-section' });
  if (!trust) return Object.freeze({ available:false, reason:'signing-key-not-configured' });
  if (!manifest || manifest.packId !== id || manifest.version !== section.version || !base64Signature(manifest.signature)) return Object.freeze({ available:false, reason:'signed-hosted-manifest-required' });
  return Object.freeze({ available:true });
}
