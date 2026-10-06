const KEY = 'myr5-workout-session-owner-v1';

// The pod is the workout owner.  This intentionally persists only a local
// acknowledgement: account workout sync remains owned by launch.mjs.
export class WorkoutSessionOwner {
  constructor({ storage = globalThis.localStorage, saveProgress } = {}) {
    this.storage = storage;
    this.saveProgress = saveProgress;
    const prior = this.read();
    // A camera/tracker cannot survive a reload, so never revive an active run.
    this.phase = 'idle';
    this.revision = Math.max(0, Number(prior?.revision) || 0) + (prior?.phase === 'active' ? 1 : 0);
    this.lease = null;
    this.persist();
  }
  read() { try { return JSON.parse(this.storage?.getItem(KEY) || 'null'); } catch { return null; } }
  persist() { try { this.storage?.setItem(KEY, JSON.stringify({ version: 1, phase: this.phase, revision: this.revision })); return true; } catch { return false; } }
  snapshot() { return { phase: this.phase, revision: this.revision, transitioning: !!this.lease }; }
  canStart() { return this.phase === 'idle' && !this.lease; }
  start() { if (!this.canStart()) return false; this.phase = 'active'; this.revision++; this.persist(); return true; }
  // Idempotent release for every stop path (also drops a stale idle lease).
  stop() { this.lease = null; if (this.phase !== 'idle') { this.phase = 'idle'; this.revision++; this.persist(); } }
  async complete(payload) {
    if (this.phase !== 'active') return { saved: false, reason: 'no active workout' };
    let result;
    try { result = await this.saveProgress?.(payload); } catch (error) { return { saved: false, reason: error?.message || 'workout progress was not saved' }; }
    if (!result?.local) return { saved: false, reason: result?.reason || 'workout progress was not saved' };
    this.phase = 'idle'; this.revision++;
    const acknowledged=this.persist();
    // The workout database is the completion authority. A failed UI cache write
    // must not turn an already committed completion into an impossible retry.
    return { saved: true, acknowledged, ...result };
  }
  acquireIdleLease() {
    if (!this.canStart()) return null;
    const lease = { revision: this.revision, released: false };
    this.lease = lease;
    return lease;
  }
  releaseIdleLease(lease) { if (this.lease === lease) { lease.released = true; this.lease = null; } }
  async save() { return this.persist(); }
}
