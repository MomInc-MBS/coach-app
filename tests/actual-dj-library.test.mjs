import test, { beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createDJLibrary, MYR5_DJ_TRACKS } from '../actual-dj-library.mjs';

const savedGlobals = { indexedDB: globalThis.indexedDB, fetch: globalThis.fetch,
  createObjectURL: URL.createObjectURL, revokeObjectURL: URL.revokeObjectURL };
let libraries, objectUrls, revoked;
beforeEach(() => {
  libraries = []; objectUrls = []; revoked = [];
  globalThis.indexedDB = undefined;
  globalThis.fetch = async () => ({ ok: false });
  URL.createObjectURL = blob => { const url = `blob:test-${objectUrls.length}`; objectUrls.push({ url, blob }); return url; };
  URL.revokeObjectURL = url => revoked.push(url);
});
afterEach(() => {
  libraries.forEach(library => library.dispose());
  globalThis.indexedDB = savedGlobals.indexedDB; globalThis.fetch = savedGlobals.fetch;
  URL.createObjectURL = savedGlobals.createObjectURL; URL.revokeObjectURL = savedGlobals.revokeObjectURL;
});
function library(options) { const result = createDJLibrary(options); libraries.push(result); return result; }
function file(name, type = 'audio/mpeg', bytes = 'sample audio') { return new File([bytes], name, { type }); }

// Minimal asynchronous IDB fixture exercises transaction completion and failures.
function storage({ failWrite = false, failDelete = false } = {}) {
  const rows = new Map();
  let closed = false;
  const database = {
    createObjectStore() {}, close() { closed = true; },
    transaction() {
      const tx = { error: null, objectStore: () => ({
        getAll() { const req = {}; queueMicrotask(() => { req.result = [...rows.values()]; req.onsuccess?.(); }); return req; },
        put(record) { if (failWrite) tx.error = new Error('QuotaExceededError'); else rows.set(record.id, record); },
        delete(id) { if (failDelete) tx.error = new Error('Delete failed'); else rows.delete(id); },
      }) };
      // request success runs first; then the entire transaction commits.
      queueMicrotask(() => queueMicrotask(() => tx.error ? tx.onabort?.() : tx.oncomplete?.()));
      return tx;
    },
  };
  const indexedDB = { open() {
    closed = false; const request = {};
    queueMicrotask(() => { request.result = database; request.onupgradeneeded?.(); request.onsuccess?.(); });
    return request;
  } };
  return { indexedDB, rows, get closed() { return closed; } };
}

test('built-in files and measured BPM exactly match the real music manifest', async () => {
  const manifest = JSON.parse(await readFile(new URL('../audio/music/manifest.json', import.meta.url), 'utf8'));
  for (const track of MYR5_DJ_TRACKS) {
    assert.equal(track.url, manifest.tracks[track.id].url);
    assert.equal(track.bpm, manifest.tracks[track.id].bpm);
    await readFile(new URL(`..${track.url}`, import.meta.url));
  }
  assert.equal((await library().list()).length, 6);
});

test('manifest refresh accepts measured BPM and refuses URL substitution', async () => {
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ tracks: {
    'hey-man-idk': { url: '/audio/music/hey-man-idk.m4a', bpm: 190 },
    'guarded-gate': { url: 'https://other.invalid/music', bpm: 160 },
  } }) });
  const tracks = await library().list();
  assert.equal(tracks[0].bpm, 190); assert.equal(tracks[1].bpm, 121.3);
});

test('unavailable storage keeps imports playable with unknown BPM, removal and disposal revoke URLs', async () => {
  const errors = [], lib = library({ onError: error => errors.push(error.message) });
  const imported = await lib.importFiles([file('Workout.mp3'), file('Tape.wav', 'audio/wav')]);
  assert.equal(imported.length, 2); assert.equal(imported[0].title, 'Workout');
  assert.equal(imported[0].bpm, null); assert.equal(imported[0].persistent, false);
  assert.match(imported[0].url, /^blob:/); assert.equal(errors.length, 1);
  assert.equal((await lib.list()).length, 8);
  assert.equal(await lib.remove(imported[0].id), true);
  assert.deepEqual(revoked, [imported[0].url]);
  assert.equal(await lib.remove('main-theme-one'), false);
  lib.dispose(); assert.deepEqual(revoked, imported.map(track => track.url));
  await assert.rejects(lib.list(), /closed/);
});

test('invalid MIME, empty files and oversized files cannot enter the library', async () => {
  const errors = [], lib = library({ onError: error => errors.push(error.message) });
  const oversized = file('huge.mp3'); Object.defineProperty(oversized, 'size', { value: 101 * 1024 * 1024 });
  const imported = await lib.importFiles([
    file('payload.mp3', 'text/html'), file('picture.png', 'image/png'),
    file('empty.mp3', 'audio/mpeg', ''), oversized,
    file('good.m4a', ''),
  ]);
  assert.equal(imported.length, 1); assert.equal(imported[0].title, 'good');
  assert.equal(objectUrls.length, 1); assert.equal(errors.length, 5);
});

test('persisted imports survive library replacement and delete from storage', async () => {
  const disk = storage(); globalThis.indexedDB = disk.indexedDB;
  const first = library(), [imported] = await first.importFiles([file('Saved.mp3')]);
  assert.equal(imported.persistent, true); assert.equal(disk.rows.size, 1);
  first.dispose();
  const second = library(), restored = (await second.list()).find(track => track.id === imported.id);
  assert.ok(restored); assert.notEqual(restored.url, imported.url); assert.equal(restored.title, 'Saved');
  assert.equal(await second.remove(imported.id), true); assert.equal(disk.rows.size, 0);
});

test('quota failures retain a playable session import and clearly report persistence failure', async () => {
  const disk = storage({ failWrite: true }); globalThis.indexedDB = disk.indexedDB;
  const errors = [], lib = library({ onError: error => errors.push(error.message) });
  const [imported] = await lib.importFiles([file('Big.mp3')]);
  assert.equal(imported.persistent, false); assert.equal(disk.rows.size, 0);
  assert.equal((await lib.list()).length, 7);
  assert.match(errors[0], /remains playable for this session/);
});

test('failed persisted deletion preserves local track and its URL', async () => {
  const disk = storage({ failDelete: true }); globalThis.indexedDB = disk.indexedDB;
  const lib = library(), [imported] = await lib.importFiles([file('Keep.mp3')]);
  await assert.rejects(lib.remove(imported.id), /Delete failed/);
  assert.equal(revoked.length, 0); assert.equal((await lib.list()).length, 7);
});
