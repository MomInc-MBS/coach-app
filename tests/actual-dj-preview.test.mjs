import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createDJPreviewServer } from '../scripts/actual-dj-preview.mjs';

let server, base, media;
test.before(async () => {
  media = await readFile(new URL('../audio/music/hey-man-idk.m4a', import.meta.url));
  server = createDJPreviewServer(); await new Promise(done => server.listen(0, '127.0.0.1', done));
  base = `http://127.0.0.1:${server.address().port}`;
});
test.after(async () => { server.closeAllConnections(); await new Promise(done => server.close(done)); });
const music = '/audio/music/hey-man-idk.m4a';

test('preview supplies real media length, MIME and byte-range capability', async () => {
  const response = await fetch(base + music);
  assert.equal(response.status, 200); assert.equal(response.headers.get('content-type'), 'audio/mp4');
  assert.equal(response.headers.get('content-length'), String(media.length));
  assert.equal(response.headers.get('accept-ranges'), 'bytes');
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), media);
});

test('closed, open-ended, suffix and oversized-end single ranges return the exact requested bytes', async () => {
  for (const [range, start, end] of [['bytes=0-15', 0, 15], ['bytes=100-', 100, media.length - 1],
    ['bytes=-20', media.length - 20, media.length - 1], ['bytes=10-999999999', 10, media.length - 1]]) {
    const response = await fetch(base + music, { headers: { Range: range } });
    assert.equal(response.status, 206, range);
    assert.equal(response.headers.get('content-range'), `bytes ${start}-${end}/${media.length}`);
    assert.equal(response.headers.get('content-length'), String(end - start + 1));
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), media.subarray(start, end + 1));
  }
});

test('malformed, multiple and unsatisfiable ranges return 416 with the representation size', async () => {
  for (const range of ['bytes=999999-', 'bytes=30-20', 'bytes=-0', 'bytes=-', 'bytes=0-1,4-5', 'bananas=0-1', 'bytes=9007199254740993-']) {
    const response = await fetch(base + music, { headers: { Range: range } });
    assert.equal(response.status, 416, range);
    assert.equal(response.headers.get('content-range'), `bytes */${media.length}`);
    assert.equal((await response.arrayBuffer()).byteLength, 0);
  }
});

test('HEAD retains full-file headers without a body and protected paths remain inaccessible', async () => {
  const response = await fetch(base + music, { method: 'HEAD', headers: { Range: 'bytes=0-5' } });
  assert.equal(response.status, 200); assert.equal(response.headers.get('content-length'), String(media.length));
  assert.equal(response.headers.get('accept-ranges'), 'bytes'); assert.equal((await response.arrayBuffer()).byteLength, 0);
  for (const path of ['/scripts/actual-dj-preview.mjs', '/tests/actual-dj-preview.test.mjs', '/%2e%2e%2fpackage.json', '/.env']) {
    assert.equal((await fetch(base + path)).status, 404, path);
  }
});
