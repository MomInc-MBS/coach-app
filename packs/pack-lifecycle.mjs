/** P13C provenance: copied from prototypes/packs/pack-lifecycle.mjs (reviewed P13B fixture lifecycle), then adapted only through its explicit asset-source adapter. */
const CACHE_KEY = 'p13b.device-cache';
const hasSubtle = globalThis.crypto?.subtle;
const nodeCrypto = 'node:crypto';
async function digest(bytes) { if (hasSubtle) { const h = await globalThis.crypto.subtle.digest('SHA-256', bytes); return [...new Uint8Array(h)].map(x => x.toString(16).padStart(2, '0')).join(''); } const { createHash } = await import(nodeCrypto); return createHash('sha256').update(Buffer.from(bytes)).digest('hex'); }
const bytesOf = value => value instanceof Uint8Array ? value : Array.isArray(value) ? new Uint8Array(value) : new TextEncoder().encode(value);
const clone = value => new Uint8Array(value);
const joinBytes = chunks => { const joined = new Uint8Array(chunks.reduce((n, data) => n + data.byteLength, 0)); let offset = 0; for (const data of chunks) { joined.set(data, offset); offset += data.byteLength; } return joined; };
const snapshot = value => JSON.parse(JSON.stringify(value));
const retire = runtime => { try { runtime?.dispose(); } catch { /* Retired runtime cleanup is best effort. */ } };
const stale = () => Object.assign(new Error('Pack account or operation changed'), { code: 'pack_operation_changed' });
const parts = value => String(value).split('.').map(x => /^\d+$/.test(x) ? Number(x) : -1);
export const compareVersions = (left, right) => { const a = parts(left), b = parts(right); for (let i = 0; i < Math.max(a.length, b.length); i++) { const d = (a[i] ?? 0) - (b[i] ?? 0); if (d) return Math.sign(d); } return 0; };
export const PACK_STATES = Object.freeze(['absent', 'downloading', 'downloaded', 'verified', 'pending-equip', 'active', 'failed']);
export const memoryStore = () => { const map = new Map(); return { getItem: k => map.get(k) ?? null, setItem: (k, v) => map.set(k, String(v)), removeItem: k => map.delete(k) }; };

/** Demo/test adapter only (64 KiB by default), never a production download cache. */
export function fixtureAssetStore({ maxBytes = 64 * 1024 } = {}) { const map = new Map(); let used = 0; return { maxBytes, async get(k) { const v = map.get(k); return v ? clone(v) : null; }, async put(k, v) { const data = bytesOf(v), old = map.get(k)?.byteLength ?? 0; if (used - old + data.byteLength > maxBytes) throw new Error('fixture asset-store quota exceeded'); map.set(k, clone(data)); used += data.byteLength - old; }, async remove(k) { const old = map.get(k); if (old) { used -= old.byteLength; map.delete(k); } }, async removePrefix(prefix) { for (const key of [...map.keys()]) if (key.startsWith(prefix)) await this.remove(key); } }; }

export class PackLifecycle {
  constructor({ account, storage = globalThis.localStorage ?? memoryStore(), assetStore = fixtureAssetStore(), workout, appVersion = '1.0.0', runtimeFactory = () => ({ dispose() {} }), now = () => new Date().toISOString(), onChange = () => {}, verifyManifest = null, fail = {} } = {}) {
    if (!account?.getEntitlements) throw new Error('account adapter with getEntitlements() is required'); if (!assetStore?.get || !assetStore?.put || !assetStore?.removePrefix) throw new Error('assetStore adapter is required'); if (!workout?.saveAndConfirmIdle) throw new Error('workout adapter with saveAndConfirmIdle() is required');
    Object.assign(this, { account, storage, assetStore, workout, appVersion, runtimeFactory, now, onChange, verifyManifest, fail }); this.epoch = 0; this.disposed = false; this.identity = this.accountIdentity(); this.accountGeneration = this.account.getGeneration?.(); this.unsubscribe = this.account.subscribe?.(() => this.clear()); this.manifests = new Map(); this.runtime = null; const saved = this.readCache(); this.records = saved.packs ?? {}; this.candidates = saved.candidates ?? {}; this.equipped = saved.equipped ?? null; this.pending = saved.pending ?? null;
  }
  accountIdentity() { return this.account.getIdentity ? this.account.getIdentity() : (this.account.user?.id ?? this.account.id ?? this.account); }
  clear() { this.epoch++; const old = this.runtime; this.runtime = null; retire(old); }
  dispose() { this.disposed = true; this.clear(); this.unsubscribe?.(); }
  capture(id) {
    const identity = this.accountIdentity(), generation = this.account.getGeneration?.();
    if (identity !== this.identity || generation !== this.accountGeneration) { this.clear(); this.identity = identity; this.accountGeneration = generation; }
    if (this.disposed || !this.entitled(id)) { this.clear(); throw stale(); }
    return { epoch: this.epoch, identity, generation };
  }
  current(ticket, id) {
    const identity = this.accountIdentity(), generation = this.account.getGeneration?.();
    if (identity !== this.identity || generation !== this.accountGeneration || !this.entitled(id)) { this.clear(); this.identity = identity; this.accountGeneration = generation; }
    return !this.disposed && ticket.epoch === this.epoch && ticket.identity === identity && ticket.generation === generation && this.entitled(id);
  }
  assertCurrent(ticket, id) { if (!this.current(ticket, id)) throw stale(); }
  async checked(promise, ticket, id) { const value = await promise; this.assertCurrent(ticket, id); return value; }
  readCache() { try { return JSON.parse(this.storage.getItem(CACHE_KEY) || '{}'); } catch { return {}; } }
  persist() { this.storage.setItem(CACHE_KEY, JSON.stringify({ packs: this.records, candidates: this.candidates, equipped: this.equipped, pending: this.pending })); }
  emit(id) { this.persist(); this.onChange(this.status(id)); }
  pin(m) { if (!m.version || !m.sha256) throw new Error('manifest requires pinned version and sha256'); return { version: m.version, manifestHash: m.sha256 }; }
  key(id, pin, path) { return `${id}@${pin.version}@${pin.manifestHash}/${path}`; }
  prefix(id, pin) { return `${id}@${pin.version}@${pin.manifestHash}/`; }
  manifest(manifest, source = {}) { manifest = snapshot(manifest); const pin = this.pin(manifest); this.epoch++; this.manifests.set(manifest.packId, { manifest, source, pin }); this.records[manifest.packId] ??= { state: 'absent', receivedBytes: 0 }; return this.status(manifest.packId); }
  entitled(id) { return !!this.account.getEntitlements().some(x => (typeof x === 'string' ? x : x.packId) === id); }
  compatible(m) { return compareVersions(this.appVersion, m.minAppVersion) >= 0; }
  isPinned(r, entry) { return r?.version === entry.pin.version && r?.manifestHash === entry.pin.manifestHash; }
  candidateFor(id, e = this.manifests.get(id)) { const active = this.records[id]; return e && active?.state === 'active' && !this.isPinned(active, e) ? (this.candidates[id] ??= { state: 'absent', receivedBytes: 0, ...e.pin }) : active; }
  status(id) { const e = this.manifests.get(id), active = this.records[id] ?? { state: 'absent', receivedBytes: 0 }, candidate = this.candidates[id]; const r = active.state === 'active' ? active : (candidate ?? active); return { ...(e ? { packId: id, version: r.version ?? e.manifest.version } : { packId: id }), ...r, entitlement: this.entitled(id), equipped: this.equipped?.packId === id, pending: this.pending?.packId === id, ...(active.state === 'active' && candidate ? { candidate: { ...candidate } } : {}) }; }
  all() { return [...new Set([...this.manifests.keys(), ...Object.keys(this.records)])].map(id => this.status(id)); }
  reset(id, entry) { const target = this.candidateFor(id, entry); if (target === this.records[id]) this.records[id] = { state: 'absent', receivedBytes: 0, ...entry.pin }; else this.candidates[id] = { state: 'absent', receivedBytes: 0, ...entry.pin }; }
  async received(id, e, ticket) { let n = 0; for (const a of e.manifest.assets) n += (await this.checked(this.assetStore.get(this.key(id, e.pin, a.path)), ticket, id))?.byteLength ?? 0; return n; }
  async download(id, { resume = true } = {}) {
    const e = this.manifests.get(id); if (!e) throw new Error('unknown pack'); if (!this.entitled(id)) throw new Error('pack is not entitled');
    const ticket = this.capture(id);
    if (this.verifyManifest && !await this.checked(this.verifyManifest(e.manifest), ticket, id)) return this.failState(id, 'manifest signature is invalid');
    if (!this.compatible(e.manifest)) return this.failState(id, 'incompatible app version'); let r = this.candidateFor(id, e);
    if (!r || !this.isPinned(r, e) || !resume) { if (r && this.isPinned(r, e)) await this.checked(this.assetStore.removePrefix(this.prefix(id, e.pin)), ticket, id); this.reset(id, e); r = this.candidateFor(id, e); }
    r.state = 'downloading'; r.manifest = snapshot(e.manifest); delete r.error; this.emit(id);
    for (const a of e.manifest.assets) {
      const key = this.key(id, e.pin, a.path); let old = resume ? await this.checked(this.assetStore.get(key), ticket, id) : null;
      // A complete cached response is reusable only after its hash passes.
      if (old?.byteLength === a.bytes && await this.checked(digest(old), ticket, id) === a.sha256) continue;
      if (old?.byteLength >= a.bytes) old = null;
      if (this.fail.download) return this.failState(id, 'download interrupted; resume available');
      try {
        const raw = typeof e.source?.get === 'function' ? await this.checked(e.source.get(a, old), ticket, id) : e.source[a.path];
        this.assertCurrent(ticket, id);
        if (raw === undefined) return this.failState(id, `missing fixture ${a.path}`);
        await this.checked(this.assetStore.put(key, bytesOf(raw)), ticket, id);
      } catch (error) {
        this.assertCurrent(ticket, id);
        return this.failState(id, `asset storage/download failed: ${error?.message || 'unknown failure'}`);
      }
      r.receivedBytes = await this.received(id, e, ticket); this.assertCurrent(ticket, id); this.emit(id);
    }
    r.receivedBytes = await this.received(id, e, ticket); this.assertCurrent(ticket, id); r.state = 'downloaded'; this.emit(id); return this.status(id);
  }
  async validate(id, { markFailed = true, record, entry, ticket = this.capture(id) } = {}) {
    this.assertCurrent(ticket, id);
    const e = entry !== undefined ? entry : this.manifests.get(id), r = record ?? this.candidateFor(id, e); let reason;
    if (!e || !r) reason = 'missing manifest or cache record';
    else if (e.manifest.packId !== id || !this.isPinned(r, { pin: this.pin(e.manifest) }) || !this.isPinned(r, e)) reason = 'cached pack does not match pinned manifest';
    else if (this.verifyManifest && !await this.checked(this.verifyManifest(e.manifest), ticket, id)) reason = 'manifest signature is invalid';
    else if (!this.compatible(e.manifest)) reason = 'incompatible app version';
    const assembled = [];
    if (!reason) for (const a of e.manifest.assets) {
      const data = await this.checked(this.assetStore.get(this.key(id, e.pin, a.path)), ticket, id);
      if (!data || data.byteLength !== a.bytes || await this.checked(digest(data), ticket, id) !== a.sha256) { reason = `integrity check failed: ${a.path}`; break; }
      assembled.push(data);
    }
    if (!reason && await this.checked(digest(joinBytes(assembled)), ticket, id) !== e.manifest.sha256) reason = 'manifest integrity check failed';
    this.assertCurrent(ticket, id); if (reason && markFailed) this.failState(id, reason); return { ok: !reason, reason };
  }
  async verify(id) {
    const ticket = this.capture(id), r = this.candidateFor(id); if (!r || r.state !== 'downloaded') throw new Error('pack is not downloaded');
    if (this.fail.verify) return this.failState(id, 'integrity check failed');
    if (!(await this.validate(id, { ticket })).ok) return this.status(id); this.assertCurrent(ticket, id);
    r.state = 'verified'; r.manifest = snapshot(this.manifests.get(id).manifest); r.verifiedAt = this.now(); delete r.error; this.emit(id); return this.status(id);
  }
  async equipPending(id) {
    const ticket = this.capture(id), r = this.candidateFor(id); if (!r || r.state !== 'verified') throw new Error('only verified packs can be equipped');
    if (!(await this.validate(id, { ticket })).ok) return this.status(id); this.assertCurrent(ticket, id);
    if (this.pending && this.pending.packId !== id && this.records[this.pending.packId]?.state === 'pending-equip') this.records[this.pending.packId].state = 'verified';
    this.pending = { packId: id, ...this.manifests.get(id).pin }; r.state = 'pending-equip'; this.emit(id); return this.status(id);
  }
  savedEntry(r) { return r?.manifest ? { manifest: snapshot(r.manifest), pin: this.pin(r.manifest) } : null; }
  async activate(id, r, e, { restoring = false } = {}) {
    const ticket = this.capture(id); let safe, candidate, published = false;
    try {
      safe = await this.workout.saveAndConfirmIdle(); this.assertCurrent(ticket, id);
      if (!(safe === true || (safe?.saved === true && safe?.idle === true))) throw Object.assign(new Error('workout save/idle acknowledgment is required before activation'), { code: 'workout_not_idle' });
      const checked = await this.validate(id, { markFailed: false, record: r, entry: e, ticket }); this.assertCurrent(ticket, id);
      if (!checked.ok) {
        if (r) { r.state = 'failed'; r.error = checked.reason; }
        if (restoring) this.equipped = null; else this.pending = null;
        this.persist(); return this.all();
      }
      if (this.fail.activation) throw new Error('activation failed');
      candidate = await this.runtimeFactory(id, r, e.manifest); this.assertCurrent(ticket, id);
      if (!candidate?.dispose) throw new Error('runtime factory returned no disposable runtime');
      // Factories may prepare detached UI; only publish it after the final guard.
      candidate.activate?.(); this.assertCurrent(ticket, id);
      const old = this.runtime, previous = this.equipped?.packId;
      this.runtime = candidate; this.equipped = { packId: id, ...e.pin }; r.state = 'active'; r.manifest = snapshot(e.manifest); delete r.error;
      if (!restoring) { this.pending = null; this.records[id] = r; delete this.candidates[id]; }
      if (previous && previous !== id && this.records[previous]) this.records[previous].state = 'verified';
      this.persist(); published = true; retire(old); this.onChange(this.status(id)); return this.all();
    } catch (error) {
      if (!this.current(ticket, id)) throw stale();
      if (error.code === 'workout_not_idle') throw error;
      if (r) { r.state = restoring ? 'failed' : 'pending-equip'; r.error = `${restoring ? 'restore' : 'activation'} failed: ${error.message || 'runtime error'}`; }
      if (restoring) this.equipped = null;
      this.persist(); return this.all();
    } finally { if (!published) retire(candidate); safe?.release?.(); }
  }
  async restart() {
    if (!this.pending) return this.all(); const id = this.pending.packId;
    // Pending metadata is persisted alongside its exact signature, so a network
    // replacement cannot silently substitute another version at boot.
    const r = [this.candidates[id], this.records[id]].find(value => this.isPinned(value, { pin: this.pending }));
    const e = this.savedEntry(r) ?? this.manifests.get(id);
    return this.activate(id, r, e);
  }
  async restore() {
    if (!this.equipped) return this.all(); const id = this.equipped.packId, r = this.records[id];
    // Authenticate this exact persisted manifest, never a newly fetched one.
    return this.activate(id, r, this.savedEntry(r), { restoring: true });
  }
  async evict(id) { const ticket = this.capture(id), r = this.records[id], e = this.manifests.get(id); if (!r) return; if (this.equipped?.packId === id) throw new Error('cannot evict equipped pack'); if (e && this.isPinned(r, e)) await this.checked(this.assetStore.removePrefix(this.prefix(id, e.pin)), ticket, id); this.assertCurrent(ticket, id); this.records[id] = { state: 'absent', receivedBytes: 0 }; if (this.pending?.packId === id) this.pending = null; this.emit(id); }
  failState(id, reason) { const e = this.manifests.get(id), r = this.candidateFor(id, e) ?? (this.records[id] ??= { receivedBytes: 0 }); r.state = 'failed'; r.error = reason; if (this.pending?.packId === id) this.pending = null; this.emit(id); return this.status(id); }
}
export async function sha256(value) { return digest(bytesOf(value)); }

