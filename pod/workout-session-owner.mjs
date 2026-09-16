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
  stop() { if (this.phase !== 'idle') { this.phase = 'idle'; this.revision++; this.persist(); } }
  async complete(payload) {
    if (this.phase !== 'active') return { saved: false, reason: 'no active workout' };
    const result = await this.saveProgress?.(payload);
    if (!result?.local) return { saved: false, reason: result?.reason || 'workout progress was not saved' };
    this.phase = 'idle'; this.revision++;
    if (!this.persist()) return { saved: false, reason: 'workout session acknowledgement was not saved' };
    return { saved: true, ...result };
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
