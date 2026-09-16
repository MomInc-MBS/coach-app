/** P13C test fixture adapter; this is deliberately not a CDN integration. */
const concat = (left, right) => { const out = new Uint8Array(left.byteLength + right.byteLength); out.set(left); out.set(right, left.byteLength); return out; };

export function httpFixtureAssetSource({ baseUrl, fetchImpl = fetch, expectedEtag, expectedVersion }) {
  if (!baseUrl || !expectedEtag || !expectedVersion) throw new Error('fixture source requires baseUrl, expected ETag, and pinned version');
  return {
    async get(asset, previous = null) {
      const offset = previous?.byteLength || 0;
      const headers = { 'x-fixture-version': expectedVersion };
      if (offset) { headers.Range = `bytes=${offset}-`; headers['If-Range'] = expectedEtag; }
      const response = await fetchImpl(new URL(asset.path, baseUrl), { headers });
      if (!response.ok) throw new Error(`fixture HTTP ${response.status}`);
      if (response.headers.get('etag') !== expectedEtag) throw new Error('fixture asset changed (ETag mismatch)');
      if (response.headers.get('x-fixture-version') !== expectedVersion) throw new Error('fixture asset version changed');
      if (offset && response.status !== 206) throw new Error('fixture server refused resumable Range response');
      const received = new Uint8Array(await response.arrayBuffer());
      const full = offset ? concat(previous, received) : received;
      if (full.byteLength > asset.bytes) throw new Error('fixture asset exceeds manifest length');
      return full;
    }
  };
}
