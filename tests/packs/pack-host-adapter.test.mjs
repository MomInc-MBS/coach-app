import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { PackLifecycle, fixtureAssetStore, memoryStore, sha256 } from '../../packs/pack-lifecycle.mjs';
import { fixtureEntitlementAccount } from '../../packs/isolated-pack-control.mjs';
import { packHostAssetSource } from '../../packs/pack-host-adapter.mjs';
import { PACK_HOST_BASE_URL } from '../../packs/pack-host-config.mjs';

const body = new TextEncoder().encode('Rank 2b pack host payload: served cross-origin with CORS headers.');
const tampered = new TextEncoder().encode('Rank 2b pack host payload: served cross-origin with CORS HEADERS!');

// Stands in for packs.mominc.online: a plain static file server on a
// different port, which is cross-origin from any page under test, sending
// the same Access-Control-Allow-Origin header GitHub Pages sends (PLAN.md §0).
async function foreignHost({ serve = body } = {}) {
  const instance = http.createServer((request, response) => {
    if (request.url === '/packs/style-chest/1.0.0/assets/asset.bin') {
      response.writeHead(200, { 'Content-Type': 'application/octet-stream', 'Access-Control-Allow-Origin': '*' });
      return response.end(serve);
    }
    response.writeHead(404);
    response.end();
  });
  await new Promise(resolve => instance.listen(0, '127.0.0.1', resolve));
  return { close: () => new Promise(resolve => instance.close(resolve)), baseUrl: `http://127.0.0.1:${instance.address().port}/` };
}

async function manifestFor(bytes) {
  const hash = await sha256(bytes);
  return { packId: 'style-chest', version: '1.0.0', minAppVersion: '1.0.0', sha256: hash, assets: [{ path: 'packs/style-chest/1.0.0/assets/asset.bin', bytes: bytes.byteLength, sha256: hash }] };
}

test('PACK_HOST_BASE_URL defaults to the D1 host and nothing else hardcodes a pack host', () => {
  assert.equal(PACK_HOST_BASE_URL, 'https://packs.mominc.online');
});

test('packHostAssetSource downloads and verifies a real pack across a CORS cross-origin host', async () => {
  const host = await foreignHost();
  try {
    const account = fixtureEntitlementAccount(['style-chest']);
    const workout = { saveAndConfirmIdle: async () => ({ saved: true, idle: true }) };
    const lifecycle = new PackLifecycle({ account, storage: memoryStore(), assetStore: fixtureAssetStore(), workout });
    lifecycle.manifest(await manifestFor(body), packHostAssetSource({ baseUrl: host.baseUrl }));
    assert.equal((await lifecycle.download('style-chest')).state, 'downloaded');
    assert.equal((await lifecycle.verify('style-chest')).state, 'verified');
  } finally {
    await host.close();
  }
});

test('a tampered cross-origin file is rejected by the existing signed-pack integrity check, not the adapter', async () => {
  const host = await foreignHost({ serve: tampered });
  try {
    const account = fixtureEntitlementAccount(['style-chest']);
    const workout = { saveAndConfirmIdle: async () => ({ saved: true, idle: true }) };
    const lifecycle = new PackLifecycle({ account, storage: memoryStore(), assetStore: fixtureAssetStore(), workout });
    // Manifest is pinned to the ORIGINAL body's hash/length; the host now serves different bytes.
    lifecycle.manifest(await manifestFor(body), packHostAssetSource({ baseUrl: host.baseUrl }));
    const downloaded = await lifecycle.download('style-chest');
    // Same length, different bytes: download "succeeds" (adapter can't know), but verify() must fail.
    assert.equal(downloaded.state, 'downloaded');
    const verified = await lifecycle.verify('style-chest');
    assert.equal(verified.state, 'failed');
    assert.match(verified.error, /integrity check failed/);
  } finally {
    await host.close();
  }
});

test('an oversized cross-origin response is rejected by the adapter itself', async () => {
  const host = await foreignHost({ serve: new TextEncoder().encode(new TextDecoder().decode(body) + ' plus extra bytes the manifest never promised') });
  try {
    const account = fixtureEntitlementAccount(['style-chest']);
    const workout = { saveAndConfirmIdle: async () => ({ saved: true, idle: true }) };
    const lifecycle = new PackLifecycle({ account, storage: memoryStore(), assetStore: fixtureAssetStore(), workout });
    lifecycle.manifest(await manifestFor(body), packHostAssetSource({ baseUrl: host.baseUrl }));
    const downloaded = await lifecycle.download('style-chest');
    assert.equal(downloaded.state, 'failed');
    assert.match(downloaded.error, /exceeds manifest length/);
  } finally {
    await host.close();
  }
});
