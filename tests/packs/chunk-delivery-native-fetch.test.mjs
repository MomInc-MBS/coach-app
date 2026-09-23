import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import {
  ChunkDownloader,
  DEFAULT_LOCAL_RESOURCE_POLICY,
  canonicalChunkPayload,
  memoryChunkStore,
  sha256Chunk
} from '../../modules/materials/chunk-delivery.mjs';

test('native fetch is called with its global receiver while injected fetch stays intact', async () => {
  const data = new Uint8Array([7, 8, 9]);
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  const manifest = {
    schema: 'mom-material-chunks-v1',
    packId: 'native-fetch',
    version: '1.0.0',
    keyId: 'test-v1',
    assets: [{
      path: 'assets/a.bin',
      bytes: data.byteLength,
      sha256: await sha256Chunk(data),
      chunks: [{
        index: 0,
        offset: 0,
        bytes: data.byteLength,
        sha256: await sha256Chunk(data),
        url: 'https://cdn.test/materials/a',
        etag: '"v1"'
      }]
    }]
  };
  manifest.signature = sign(null, Buffer.from(canonicalChunkPayload(manifest)), privateKey).toString('base64');

  const originalFetch = globalThis.fetch;
  let nativeCalls = 0;
  let injectedCalls = 0;
  const response = () => new Response(data, {
    status: 206,
    headers: { 'content-length': '3', 'content-range': 'bytes 0-2/3', etag: '"v1"' }
  });
  try {
    globalThis.fetch = async function (...args) {
      assert.equal(this, globalThis, 'native fetch receives the global object');
      assert.equal(args[0], 'https://cdn.test/materials/a');
      nativeCalls++;
      return response();
    };
    const options = {
      store: memoryChunkStore(),
      expectedVersion: '1.0.0',
      manifestPublicKey: publicKey.export({ format: 'jwk' }),
      ownership: async () => 'owner',
      policy: { ...DEFAULT_LOCAL_RESOURCE_POLICY, trustedOrigins: ['https://cdn.test'] }
    };
    const nativeDownloader = new ChunkDownloader(options);
    assert.equal((await nativeDownloader.download(manifest)).receivedBytes, data.byteLength);
    assert.equal(nativeCalls, 1);

    const injectedFetch = async function (...args) {
      assert.equal(args[0], 'https://cdn.test/materials/a');
      injectedCalls++;
      return response();
    };
    const injectedDownloader = new ChunkDownloader({ ...options, store: memoryChunkStore(), fetchImpl: injectedFetch });
    assert.equal(injectedDownloader.fetchImpl, injectedFetch, 'injected fetch function is retained unchanged');
    assert.equal((await injectedDownloader.download(manifest)).receivedBytes, data.byteLength);
    assert.equal(injectedCalls, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
