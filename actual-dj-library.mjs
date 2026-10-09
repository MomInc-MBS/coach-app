// BPM values are measured values from audio/music/manifest.json, refreshed by list().
export const MYR5_DJ_TRACKS = Object.freeze([
  ['hey-man-idk', 'Hey Man IDK', 188.43],
  ['guarded-gate', 'Guarded Gate', 121.3],
  ['daemon-time', 'Daemon Time', 90.16],
  ['sick-with-science', 'Sick with Science', 140.5],
  ['laboratory-violence', 'Laboratory Violence', 120],
  ['main-theme-one', 'Main Theme One', 120],
].map(([id, title, bpm]) => Object.freeze({ id, title, artist: 'MYR5', bpm,
  url: `/audio/music/${id}.m4a`, local: false })));

const MAX_BYTES = 100 * 1024 * 1024;
const AUDIO_EXTENSION = /\.(mp3|m4a|aac|wav|ogg|oga|opus|flac|aif|aiff|webm)$/i;
const DB_NAME = 'myr5-actual-dj';

export function createDJLibrary({ onError = () => {} } = {}) {
  const records = new Map();
  let db = null, disposed = false, ready = null, manifestReady = null;
  let defaults = MYR5_DJ_TRACKS.map(track => ({ ...track }));
  const report = error => { if (!disposed) onError(error instanceof Error ? error : new Error(String(error))); };
  const assertOpen = () => { if (disposed) throw new Error('DJ library has been closed.'); };
  const expose = record => ({ id: record.id, title: record.title, artist: record.artist,
    url: record.url, bpm: record.bpm ?? null, local: true, size: record.blob.size,
    persistent: record.persistent });
  function add(record, persistent) {
    if (!record || typeof record.id !== 'string' || !(record.blob instanceof Blob)) return;
    if (!record.blob.size || record.blob.size > MAX_BYTES) return;
    const previous = records.get(record.id);
    if (previous) URL.revokeObjectURL(previous.url);
    records.set(record.id, { ...record, persistent, url: URL.createObjectURL(record.blob) });
  }
  function transaction(mode, action) {
    return new Promise((resolve, reject) => {
      let tx;
      try {
        tx = db.transaction('tracks', mode);
        tx.oncomplete = () => resolve();
        tx.onerror = tx.onabort = () => reject(tx.error || new Error('Audio storage failed.'));
        action(tx.objectStore('tracks'));
      } catch (error) { reject(error); }
    });
  }
  async function initialize() {
    if (ready) return ready;
    ready = (async () => {
      try {
        if (!globalThis.indexedDB) throw new Error('Local audio storage is unavailable. Imports will last for this session.');
        const database = await new Promise((resolve, reject) => {
          const request = indexedDB.open(DB_NAME, 1);
          let failed = false;
          request.onupgradeneeded = () => request.result.createObjectStore('tracks', { keyPath: 'id' });
          request.onerror = () => { failed = true; reject(request.error || new Error('Local audio storage is unavailable.')); };
          request.onblocked = () => { failed = true; reject(new Error('Audio storage is busy. Imports will last for this session.')); };
          request.onsuccess = () => { if (failed || disposed) request.result.close(); resolve(request.result); };
        });
        if (disposed) { database.close(); return; }
        db = database;
        db.onversionchange = () => { db?.close(); db = null; };
        await transaction('readonly', store => {
          const request = store.getAll();
          request.onsuccess = () => {
            if (!disposed) for (const record of request.result) add(record, true);
          };
        });
      } catch (error) { report(error); db?.close(); db = null; }
    })();
    return ready;
  }
  function readManifest() {
    if (manifestReady) return manifestReady;
    manifestReady = (async () => {
      try {
        const response = await fetch('/audio/music/manifest.json');
        if (!response.ok) return;
        const manifest = await response.json();
        if (disposed) return;
        defaults = defaults.map(track => {
          const source = manifest.tracks?.[track.id];
          // Never accept replacement URLs from cached or malformed metadata.
          return source?.url === track.url && Number.isFinite(source.bpm) && source.bpm >= 30 && source.bpm <= 300
            ? { ...track, bpm: source.bpm } : track;
        });
      } catch { /* Built-in metadata remains available offline. */ }
    })();
    return manifestReady;
  }
  async function list() {
    assertOpen(); await Promise.all([initialize(), readManifest()]); assertOpen();
    return [...defaults.map(track => ({ ...track })), ...Array.from(records.values(), expose)];
  }
  async function importFiles(files) {
    assertOpen();
    const supplied = Array.from(files || []);
    const valid = [];
    for (const file of supplied) {
      if (!(file instanceof Blob) || !file.name || (!AUDIO_EXTENSION.test(file.name) && !/^audio\//i.test(file.type))) {
        report(new TypeError('Choose an audio file such as MP3, M4A, WAV or OGG.')); continue;
      }
      if (!file.size || file.size > MAX_BYTES) {
        report(new RangeError(`${file.name}: audio files must be between 1 byte and 100 MB.`)); continue;
      }
      // An explicit non-audio MIME is rejected even if the filename looks like audio.
      if (file.type && !/^audio\//i.test(file.type) && !['application/octet-stream', 'video/webm'].includes(file.type)) {
        report(new TypeError(`${file.name} is not an audio file.`)); continue;
      }
      valid.push(file);
    }
    await initialize(); assertOpen();
    const imported = [];
    for (const file of valid) {
      const record = { id: `local-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`}`,
        title: file.name.replace(AUDIO_EXTENSION, ''), artist: 'Local audio',
        blob: file, bpm: null };
      add(record, false);
      if (db) {
        try {
          await transaction('readwrite', store => store.put(record));
          const saved = records.get(record.id);
          if (saved) saved.persistent = true;
        } catch (error) {
          report(new Error(`Could not save ${file.name}. It remains playable for this session. ${error.message || ''}`));
        }
      }
      if (disposed) throw new Error('DJ library has been closed.');
      const current = records.get(record.id);
      if (current) imported.push(expose(current));
    }
    return imported;
  }
  async function remove(id) {
    assertOpen(); await initialize(); assertOpen();
    const record = records.get(id);
    if (!record) return false;
    // Keep the playable record if a persisted delete fails; don't resurrect it silently on next load.
    if (record.persistent) {
      if (!db) throw new Error('Audio storage is unavailable. Reopen the DJ before deleting this saved track.');
      await transaction('readwrite', store => store.delete(id));
    }
    assertOpen(); records.delete(id); URL.revokeObjectURL(record.url); return true;
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    for (const record of records.values()) URL.revokeObjectURL(record.url);
    records.clear(); db?.close(); db = null;
  }
  return { list, importFiles, remove, dispose };
}
