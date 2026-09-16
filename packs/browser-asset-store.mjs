/**
 * P13C durable browser byte store.  Pack metadata remains in the lifecycle's
 * small metadata store; never place pack bytes in localStorage.
 */
const bytes = value => value instanceof Uint8Array ? value : new Uint8Array(value);

export function cacheStorageAssetStore({ cacheName = 'myr5-pack-assets-v1', cachesApi = globalThis.caches } = {}) {
  if (!cachesApi?.open) throw new Error('CacheStorage is unavailable');
  const request = key => new Request(`https://myr5.invalid/packs/${encodeURIComponent(key)}`);
  const cache = () => cachesApi.open(cacheName);
  return {
    async get(key) { const response = await (await cache()).match(request(key)); return response ? new Uint8Array(await response.arrayBuffer()) : null; },
    async put(key, value) {
      try { await (await cache()).put(request(key), new Response(bytes(value), { headers: { 'content-type': 'application/octet-stream' } })); }
      catch (error) { throw new Error(`durable asset write failed (quota/storage): ${error?.message || error}`); }
    },
    async remove(key) { await (await cache()).delete(request(key)); },
    async removePrefix(prefix) {
      const target = await cache();
      await Promise.all((await target.keys()).filter(request => decodeURIComponent(new URL(request.url).pathname.split('/').pop() || '').startsWith(prefix)).map(request => target.delete(request)));
    }
  };
}

/** Test-only injection wrapper for deterministic quota/storage failures. */
export function quotaInjectingStore(store, { failPut = () => false } = {}) {
  return { ...store, async put(key, value) { if (failPut(key, value)) throw new Error('injected quota exceeded'); return store.put(key, value); } };
}
