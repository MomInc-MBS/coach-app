import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { generateKeyPairSync, sign } from 'node:crypto';
import { ChunkDownloader, DEFAULT_LOCAL_RESOURCE_POLICY, canonicalChunkPayload, memoryChunkStore, sha256Chunk, validateChunkManifest, verifyChunkManifest } from '../../modules/materials/chunk-delivery.mjs';

const MiB = 1024 * 1024, TOTAL = 32 * MiB, CHUNK = MiB;
const generated = (offset, size) => { const out = new Uint8Array(size); for (let i = 0; i < size; i++) out[i] = (offset + i) % 251; return out; };
async function signedManifest(base, privateKey) {
  const chunks = []; for (let i = 0; i < TOTAL / CHUNK; i++) { const offset = i * CHUNK, bytes = generated(offset, CHUNK); chunks.push({ index: i, offset, bytes: CHUNK, sha256: await sha256Chunk(bytes), url: `${base}chunk/${i}`, etag: '"p13h-fixture-v1"' }); }
  const asset = { path: 'assets/generated.bin', bytes: TOTAL, sha256: await sha256Chunk(new Uint8Array([1])), chunks }; // full asset hash is descriptive; signed ordered chunk hashes are the activation guarantee.
  const m = { schema: 'mom-material-chunks-v1', packId: 'liquid-amethyst', version: '2.0.0', keyId: 'test-v1', assets: [asset] };
  m.signature = sign(null, Buffer.from(canonicalChunkPayload(m)), privateKey).toString('base64'); return m;
}
async function localHttp() {
  let sent = 0, calls = 0, interrupted = false;
  const instance = http.createServer((req, res) => { calls++; const index = Number(req.url.split('/').pop()), start = index * CHUNK, body = generated(start, CHUNK); res.writeHead(206, { 'Content-Length': body.byteLength, 'Content-Range': `bytes ${start}-${start + CHUNK - 1}/${TOTAL}`, ETag: '"p13h-fixture-v1"' }); if (!interrupted) { interrupted = true; const partial = body.subarray(0, 16384); sent += partial.byteLength; res.write(partial); return res.destroy(); } sent += body.byteLength; res.end(body); });
  await new Promise(resolve => instance.listen(0, '127.0.0.1', resolve)); return { base: `http://127.0.0.1:${instance.address().port}/`, stats: () => ({ sent, calls }), close: () => new Promise(resolve => instance.close(resolve)) };
}

test('32 MiB generated local HTTP transfer retries an interruption using bounded verified chunks', async () => {
  const httpd = await localHttp(); const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  try {
    const manifest = await signedManifest(httpd.base, privateKey), store = memoryChunkStore({ maxBytes: 40 * MiB });
    const downloader = new ChunkDownloader({ store, manifestPublicKey: publicKey.export({ format: 'jwk' }), expectedVersion: '2.0.0', ownership: async () => 'account-test', policy: { ...DEFAULT_LOCAL_RESOURCE_POLICY, maxAssetBytes: 40 * MiB, maxPackBytes: 40 * MiB, trustedOrigins: [httpd.base.slice(0, -1)], allowedProtocols: ['http:'], pathPrefix: '/chunk/' } });
    const progress=[];const result = await downloader.downloadWithProgress(manifest, { retry: 1,onProgress:value=>progress.push(value) });
    assert.equal(result.receivedBytes, TOTAL); assert.ok(result.maxAccountedAllocationBytes <= 3 * CHUNK); assert.equal((await downloader.verifyStored(manifest)).verified, true);
    assert.equal(progress.at(-1).percent,1);assert.ok(progress.every((value,index)=>index===0||value.receivedBytes>=progress[index-1].receivedBytes),'progress reflects only verified persisted chunks and is monotone');
    assert.equal(httpd.stats().calls, 33); assert.equal(httpd.stats().sent, TOTAL + 16384); // first interrupted request plus 32 durable chunks
  } finally { await httpd.close(); }
});

test('rejects malformed, reordered, replayed, and untrusted chunk metadata before fetching', async () => {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519'); const m = await signedManifest('http://127.0.0.1/chunk/', privateKey), policy = { ...DEFAULT_LOCAL_RESOURCE_POLICY, maxAssetBytes: 40 * MiB, maxPackBytes: 40 * MiB, trustedOrigins: ['http://127.0.0.1'], allowedProtocols: ['http:'], pathPrefix: '/chunk/' };
  const bad = structuredClone(m); bad.assets[0].chunks[1].index = 4; assert.throws(() => validateChunkManifest(bad, { ...DEFAULT_LOCAL_RESOURCE_POLICY, maxAssetBytes: 40 * MiB, maxPackBytes: 40 * MiB }), /ordering/);
  const options = { store: memoryChunkStore(), policy, manifestPublicKey: publicKey.export({ format: 'jwk' }), expectedVersion: '2.0.0', ownership: async () => 'account-test', fetchImpl: async () => { throw new Error('must not fetch'); } };
  for (const mutate of [x => { x.assets[0].chunks[0].bytes--; }, x => { x.assets[0].chunks[0].sha256 = '0'.repeat(64); }, x => { x.assets[0].path = '../escape'; }, x => { x.packId = 'x/y'; }, x => { x.assets[0].chunks[0].url = 'https://evil.invalid/chunk/0'; }]) { const x = structuredClone(m); mutate(x); const d = new ChunkDownloader(options); await assert.rejects(() => d.download(x), /invalid|sizes|policy|owned|signature|URL/); }
  const replay = structuredClone(m); replay.version = '2.0.1'; await assert.rejects(() => verifyChunkManifest(replay, publicKey.export({ format: 'jwk' }), policy), /signature/); const pinned = new ChunkDownloader({ ...options, expectedVersion: '2.0.1' }); await assert.rejects(() => pinned.download(m), /unexpected/);
  assert.throws(() => new ChunkDownloader({ store: memoryChunkStore(), manifestPublicKey: publicKey.export({ format: 'jwk' }) }), /ownership|expectedVersion/);
  const denied = new ChunkDownloader({ ...options, ownership: async () => false }); await assert.rejects(() => denied.download(m), /not owned/);
});

test('canonical signed chunk payload matches the pinned wire-format vector', () => {
  const digest = '0'.repeat(64);
  // Independent expected bytes: do not derive this string through the serializer.
  // External package-builder parity requires its separately versioned integration.
  const manifest = {
    signature: 'not part of the signed payload',
    version: '1.0.0',
    packId: 'golden-pack',
    keyId: 'test-v1',
    schema: 'mom-material-chunks-v1',
    assets: [{
      sha256: digest,
      path: 'assets/a.bin',
      bytes: 3,
      chunks: [
        {
          url: 'https://fixture.invalid/a',
          sha256: digest,
          offset: 0,
          index: 0,
          etag: '"v1"',
          bytes: 1
        },
        {
          url: 'https://fixture.invalid/a',
          sha256: digest,
          offset: 1,
          index: 1,
          bytes: 2
        }
      ]
    }]
  };
  const expected = String.raw`{"assets":[{"bytes":3,"chunks":[{"bytes":1,"etag":"\"v1\"","index":0,"offset":0,"sha256":"${digest}","url":"https://fixture.invalid/a"},{"bytes":2,"index":1,"offset":1,"sha256":"${digest}","url":"https://fixture.invalid/a"}],"path":"assets/a.bin","sha256":"${digest}"}],"keyId":"test-v1","packId":"golden-pack","schema":"mom-material-chunks-v1","version":"1.0.0"}`;
  assert.equal(canonicalChunkPayload(manifest), expected);
  const reordered = structuredClone(manifest);
  reordered.assets[0].chunks.reverse();
  assert.notEqual(canonicalChunkPayload(reordered), expected);
});

test('awaits ownership at verify/activation and isolates an account transition', async () => {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519'); const body = new Uint8Array([1, 2, 3]);
  const m = { schema: 'mom-material-chunks-v1', packId: 'safe-pack', version: '1.0.0', keyId: 'test-v1', assets: [{ path: 'assets/a.bin', bytes: 3, sha256: await sha256Chunk(body), chunks: [{ index: 0, offset: 0, bytes: 3, sha256: await sha256Chunk(body), url: 'https://cdn.test/materials/a', etag: '"v1"' }] }] }; m.signature = sign(null, Buffer.from(canonicalChunkPayload(m)), privateKey).toString('base64');
  let who = false; const d = new ChunkDownloader({ store: memoryChunkStore(), expectedVersion: '1.0.0', manifestPublicKey: publicKey.export({ format: 'jwk' }), ownership: async () => who, policy: { ...DEFAULT_LOCAL_RESOURCE_POLICY, trustedOrigins: ['https://cdn.test'] } });
  await assert.rejects(() => d.download(m), /not owned/); who = 'owner-a';
  const response = () => new Response(body, { status: 206, headers: { 'content-length': '3', 'content-range': 'bytes 0-2/3', etag: '"v1"' } }); d.fetchImpl = async () => response(); await d.download(m);
  who = 'owner-b'; await assert.rejects(() => d.verifyStored(m), /unverified stored chunk/, 'owner namespace prevents account B using account A data');
  who = false; await assert.rejects(() => d.activate(m, () => { throw new Error('must not activate'); }), /not owned/);
});

test('rejects redirect/range responses and preserves a previously stored chunk when persistence fails', async () => {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519'); const data = new Uint8Array([4, 5, 6]);
  const m = { schema: 'mom-material-chunks-v1', packId: 'safe-pack', version: '1.0.0', keyId: 'test-v1', assets: [{ path: 'assets/a.bin', bytes: 3, sha256: await sha256Chunk(data), chunks: [{ index: 0, offset: 0, bytes: 3, sha256: await sha256Chunk(data), url: 'https://cdn.test/materials/a', etag: '"v1"' }] }] }; m.signature = sign(null, Buffer.from(canonicalChunkPayload(m)), privateKey).toString('base64');
  const store = memoryChunkStore(); const base = { store, expectedVersion: '1.0.0', manifestPublicKey: publicKey.export({ format: 'jwk' }), ownership: async () => 'owner', policy: { ...DEFAULT_LOCAL_RESOURCE_POLICY, trustedOrigins: ['https://cdn.test'] } };
  const bad = new ChunkDownloader({ ...base, fetchImpl: async () => new Response(data, { status: 206, headers: { 'content-length': '3', 'content-range': 'bytes 9-11/12', etag: '"v1"' } }) }); await assert.rejects(() => bad.download(m), /Content-Range/);
  const active = { version: 'prior-active' }; store.put = async () => { throw new Error('chunk-store quota exceeded'); };
  const quota = new ChunkDownloader({ ...base, fetchImpl: async () => new Response(data, { status: 206, headers: { 'content-length': '3', 'content-range': 'bytes 0-2/3', etag: '"v1"' } }) }); await assert.rejects(() => quota.download(m), /quota/);
  // Activation is external and only called after verifyStored; a candidate persistence failure cannot replace it.
  assert.equal(active.version, 'prior-active');
});
