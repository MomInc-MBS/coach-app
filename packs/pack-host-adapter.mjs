/**
 * Cross-origin asset source for the public pack host (packs.mominc.online,
 * see pack-host-config.mjs). Unlike http-fixture-adapter.mjs (a local test
 * fixture that pins ETag/x-fixture-version headers no real static host
 * sends), this is a plain CORS GET: every asset is already pinned to an
 * exact sha256 + byte length by the pack's signed manifest, so
 * pack-lifecycle.mjs's own digest check (`validate()`) is what rejects a
 * tampered or mismatched file — this adapter only needs to fetch bytes.
 */
import { PACK_HOST_BASE_URL } from './pack-host-config.mjs';

export function packHostAssetSource({ baseUrl = PACK_HOST_BASE_URL, fetchImpl = fetch } = {}) {
  if (!baseUrl) throw new Error('pack host adapter requires a baseUrl');
  return {
    // ponytail: no Range/resume — a retry re-fetches the whole asset. Safe to
    // add later (Range + If-Range) without touching pack-lifecycle.mjs, since
    // the sha256 pin already makes a bad resume detectable, just not cheap.
    async get(asset) {
      const response = await fetchImpl(new URL(asset.path, baseUrl), { mode: 'cors', cache: 'no-store' });
      if (!response.ok) throw new Error(`pack host HTTP ${response.status} for ${asset.path}`);
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes.byteLength > asset.bytes) throw new Error(`pack host asset exceeds manifest length: ${asset.path}`);
      return bytes;
    }
  };
}
