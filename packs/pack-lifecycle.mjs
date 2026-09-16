/** P13C provenance: copied from prototypes/packs/pack-lifecycle.mjs (reviewed P13B fixture lifecycle), then adapted only through its explicit asset-source adapter. */
const CACHE_KEY = 'p13b.device-cache';
const hasSubtle = globalThis.crypto?.subtle;
const nodeCrypto = 'node:crypto';
async function digest(bytes) { if (hasSubtle) { const h = await globalThis.crypto.subtle.digest('SHA-256', bytes); return [...new Uint8Array(h)].map(x => x.toString(16).padStart(2, '0')).join(''); } const { createHash } = await import(nodeCrypto); return createHash('sha256').update(Buffer.from(bytes)).digest('hex'); }
const bytesOf = value => value instanceof Uint8Array ? value : Array.isArray(value) ? new Uint8Array(value) : new TextEncoder().encode(value);
const clone = value => new Uint8Array(value);
const parts = value => String(value).split('.').map(x => /^\d+$/.test(x) ? Number(x) : -1);
export const compareVersions = (left, right) => { const a = parts(left), b = parts(right); for (let i = 0; i < Math.max(a.length, b.length); i++) { const d = (a[i] ?? 0) - (b[i] ?? 0); if (d) return Math.sign(d); } return 0; };
export const PACK_STATES = Object.freeze(['absent', 'downloading', 'downloaded', 'verified', 'pending-equip', 'active', 'failed']);
export const memoryStore = () => { const map = new Map(); return { getItem: k => map.get(k) ?? null, setItem: (k, v) => map.set(k, String(v)), removeItem: k => map.delete(k) }; };

/** Demo/test adapter only (64 KiB by default), never a production download cache. */
export function fixtureAssetStore({ maxBytes = 64 * 1024 } = {}) { const map = new Map(); let used = 0; return { maxBytes, async get(k) { const v = map.get(k); return v ? clone(v) : null; }, async put(k, v) { const data = bytesOf(v), old = map.get(k)?.byteLength ?? 0; if (used - old + data.byteLength > maxBytes) throw new Error('fixture asset-store quota exceeded'); map.set(k, clone(data)); used += data.byteLength - old; }, async remove(k) { const old = map.get(k); if (old) { used -= old.byteLength; map.delete(k); } }, async removePrefix(prefix) { for (const key of [...map.keys()]) if (key.startsWith(prefix)) await this.remove(key); } }; }

export class PackLifecycle {
  constructor({ account, storage = globalThis.localStorage ?? memoryStore(), assetStore = fixtureAssetStore(), workout, appVersion = '1.0.0', runtimeFactory = () => ({ dispose() {} }), now = () => new Date().toISOString(), onChange = () => {}, fail = {} } = {}) {
    if (!account?.getEntitlements) throw new Error('account adapter with getEntitlements() is required'); if (!assetStore?.get || !assetStore?.put || !assetStore?.removePrefix) throw new Error('assetStore adapter is required'); if (!workout?.saveAndConfirmIdle) throw new Error('workout adapter with saveAndConfirmIdle() is required');
    Object.assign(this, { account, storage, assetStore, workout, appVersion, runtimeFactory, now, onChange, fail }); this.manifests = new Map(); this.runtime = null; const saved = this.readCache(); this.records = saved.packs ?? {}; this.candidates = saved.candidates ?? {}; this.equipped = saved.equipped ?? null; this.pending = saved.pending ?? null;
  }
  readCache() { try { return JSON.parse(this.storage.getItem(CACHE_KEY) || '{}'); } catch { return {}; } }
  persist() { this.storage.setItem(CACHE_KEY, JSON.stringify({ packs: this.records, candidates: this.candidates, equipped: this.equipped, pending: this.pending })); }
  emit(id) { this.persist(); this.onChange(this.status(id)); }
  pin(m) { if (!m.version || !m.sha256) throw new Error('manifest requires pinned version and sha256'); return { version: m.version, manifestHash: m.sha256 }; }
  key(id, pin, path) { return `${id}@${pin.version}@${pin.manifestHash}/${path}`; }
  prefix(id, pin) { return `${id}@${pin.version}@${pin.manifestHash}/`; }
  manifest(manifest, source = {}) { const pin = this.pin(manifest); this.manifests.set(manifest.packId, { manifest, source, pin }); this.records[manifest.packId] ??= { state: 'absent', receivedBytes: 0 }; return this.status(manifest.packId); }
  entitled(id) { return !!this.account.getEntitlements().some(x => (typeof x === 'string' ? x : x.packId) === id); }
  compatible(m) { return compareVersions(this.appVersion, m.minAppVersion) >= 0; }
  isPinned(r, entry) { return r?.version === entry.pin.version && r?.manifestHash === entry.pin.manifestHash; }
  candidateFor(id, e = this.manifests.get(id)) { const active = this.records[id]; return e && active?.state === 'active' && !this.isPinned(active, e) ? (this.candidates[id] ??= { state: 'absent', receivedBytes: 0, ...e.pin }) : active; }
  status(id) { const e = this.manifests.get(id), active = this.records[id] ?? { state: 'absent', receivedBytes: 0 }, candidate = this.candidates[id]; const r = active.state === 'active' ? active : (candidate ?? active); return { ...(e ? { packId: id, version: r.version ?? e.manifest.version } : { packId: id }), ...r, entitlement: this.entitled(id), equipped: this.equipped?.packId === id, pending: this.pending?.packId === id, ...(active.state === 'active' && candidate ? { candidate: { ...candidate } } : {}) }; }
  all() { return [...this.manifests.keys()].map(id => this.status(id)); }
  reset(id, entry) { const target = this.candidateFor(id, entry); if (target === this.records[id]) this.records[id] = { state: 'absent', receivedBytes: 0, ...entry.pin }; else this.candidates[id] = { state: 'absent', receivedBytes: 0, ...entry.pin }; }
  async received(id, e) { let n = 0; for (const a of e.manifest.assets) n += (await this.assetStore.get(this.key(id, e.pin, a.path)))?.byteLength ?? 0; return n; }
  async download(id, { resume = true } = {}) {
    const e = this.manifests.get(id); if (!e) throw new Error('unknown pack'); if (!this.entitled(id)) throw new Error('pack is not entitled'); if (!this.compatible(e.manifest)) return this.failState(id, 'incompatible app version'); let r = this.candidateFor(id, e);
    if (!r || !this.isPinned(r, e) || !resume) { if (r && this.isPinned(r, e)) await this.assetStore.removePrefix(this.prefix(id, e.pin)); this.reset(id, e); r = this.candidateFor(id, e); } r.state = 'downloading'; delete r.error; this.emit(id);
    for (const a of e.manifest.assets) {
      const key = this.key(id, e.pin, a.path), old = resume ? await this.assetStore.get(key) : null;
      if (old?.byteLength === a.bytes) continue;
      if (this.fail.download) return this.failState(id, 'download interrupted; resume available');
      try {
        // A source may be a static fixture map or the P13C HTTP fixture adapter.
        const raw = typeof e.source?.get === 'function' ? await e.source.get(a, old) : e.source[a.path];
        if (raw === undefined) return this.failState(id, `missing fixture ${a.path}`);
        await this.assetStore.put(key, bytesOf(raw));
      } catch (error) {
        return this.failState(id, `asset storage/download failed: ${error?.message || 'unknown failure'}`);
      }
      r.receivedBytes = await this.received(id, e); this.emit(id);
    }
    r.receivedBytes = await this.received(id, e); r.state = 'downloaded'; this.emit(id); return this.status(id);
  }
  async validate(id, { markFailed = true, record, entry } = {}) {
    const e = entry ?? this.manifests.get(id), r = record ?? this.candidateFor(id, e); let reason; if (!e || !r) reason = 'missing manifest or cache record'; else if (!this.entitled(id)) reason = 'pack is not entitled'; else if (!this.compatible(e.manifest)) reason = 'incompatible app version'; else if (!this.isPinned(r, e)) reason = 'cached pack does not match pinned manifest'; const assembled = [];
    if (!reason) for (const a of e.manifest.assets) { const data = await this.assetStore.get(this.key(id, e.pin, a.path)); if (!data || data.byteLength !== a.bytes || await digest(data) !== a.sha256) { reason = `integrity check failed: ${a.path}`; break; } assembled.push(...data); }
    if (!reason && await digest(new Uint8Array(assembled)) !== e.manifest.sha256) reason = 'manifest integrity check failed'; if (reason && markFailed) this.failState(id, reason); return { ok: !reason, reason };
  }
  async verify(id) { const r = this.candidateFor(id); if (!r || r.state !== 'downloaded') throw new Error('pack is not downloaded'); if (this.fail.verify) return this.failState(id, 'integrity check failed'); if (!(await this.validate(id)).ok) return this.status(id); r.state = 'verified'; r.verifiedAt = this.now(); delete r.error; this.emit(id); return this.status(id); }
  async equipPending(id) { const r = this.candidateFor(id); if (!r || r.state !== 'verified') throw new Error('only verified packs can be equipped'); if (!(await this.validate(id)).ok) return this.status(id); if (this.pending && this.pending.packId !== id && this.records[this.pending.packId]?.state === 'pending-equip') this.records[this.pending.packId].state = 'verified'; this.pending = { packId: id, ...this.manifests.get(id).pin }; r.state = 'pending-equip'; this.emit(id); return this.status(id); }
  async restart() {
    if (!this.pending) return this.all(); const safe = await this.workout.saveAndConfirmIdle(); if (!(safe === true || (safe?.saved === true && safe?.idle === true))) throw new Error('workout save/idle acknowledgment is required before activation');
    try { const id = this.pending.packId, r = this.candidateFor(id); if (!(await this.validate(id)).ok) { this.pending = null; this.persist(); return this.all(); }
      if (this.fail.activation) throw new Error('activation failed');
      const e = this.manifests.get(id), candidate = await this.runtimeFactory(id, r, e.manifest); if (!candidate?.dispose) throw new Error('runtime factory returned no disposable runtime'); const old = this.runtime, previous = this.equipped?.packId; this.runtime = candidate; this.equipped = { packId: id, ...e.pin }; this.pending = null; r.state = 'active'; r.manifest = e.manifest; delete r.error; this.records[id] = r; delete this.candidates[id]; if (previous && previous !== id && this.records[previous]) this.records[previous].state = 'verified'; this.persist(); this.onChange(this.status(id)); try { old?.dispose(); } catch { /* old runtime is already retired; disposal is best effort */ } return this.all(); }
    catch (error) { const id = this.pending?.packId; const r = this.candidateFor(id); if (r) { r.state = 'pending-equip'; r.error = `activation failed: ${error.message || 'runtime error'}`; } this.persist(); return this.all(); }
    finally { safe?.release?.(); }
  }
  async restore() { if (!this.equipped) return this.all(); const id = this.equipped.packId, r = this.records[id], manifest = r?.manifest; const entry = manifest ? { manifest, pin: { version: r.version, manifestHash: r.manifestHash } } : null; const checked = await this.validate(id, { markFailed: false, record: r, entry }); if (!checked.ok) { if (r) { r.state = 'failed'; r.error = checked.reason; } this.equipped = null; this.persist(); return this.all(); } try { const runtime = await this.runtimeFactory(id, r, manifest); if (!runtime?.dispose) throw new Error('runtime factory returned no disposable runtime'); this.runtime = runtime; r.state = 'active'; this.persist(); return this.all(); } catch (error) { r.state = 'failed'; r.error = `restore failed: ${error.message || 'runtime error'}`; this.equipped = null; this.persist(); return this.all(); } }
  async evict(id) { const r = this.records[id], e = this.manifests.get(id); if (!r) return; if (this.equipped?.packId === id) throw new Error('cannot evict equipped pack'); if (e && this.isPinned(r, e)) await this.assetStore.removePrefix(this.prefix(id, e.pin)); this.records[id] = { state: 'absent', receivedBytes: 0 }; if (this.pending?.packId === id) this.pending = null; this.emit(id); }
  failState(id, reason) { const e = this.manifests.get(id), r = this.candidateFor(id, e) ?? (this.records[id] ??= { receivedBytes: 0 }); r.state = 'failed'; r.error = reason; if (this.pending?.packId === id) this.pending = null; this.emit(id); return this.status(id); }
}
export async function sha256(value) { return digest(bytesOf(value)); }

