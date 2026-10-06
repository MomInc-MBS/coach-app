import test from 'node:test';
import assert from 'node:assert/strict';
import { WorkoutSessionOwner } from '../pod/workout-session-owner.mjs';

const memory = () => { const m = new Map(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) }; };

test('stop releases the owner and any idle lease so the next start is clean', () => {
  const owner = new WorkoutSessionOwner({ storage: memory() });
  assert.equal(owner.start(), true);
  assert.equal(owner.start(), false);
  owner.stop();
  owner.stop();
  assert.equal(owner.snapshot().phase, 'idle');
  const lease = owner.acquireIdleLease();
  assert.ok(lease);
  owner.stop();
  assert.equal(owner.snapshot().transitioning, false);
  assert.equal(owner.start(), true);
});

test('a throwing save reports failure instead of rejecting, and stop still releases', async () => {
  const owner = new WorkoutSessionOwner({ storage: memory(), saveProgress: async () => { throw new Error('disk full'); } });
  owner.start();
  assert.deepEqual(await owner.complete({}), { saved: false, reason: 'disk full' });
  owner.stop();
  assert.equal(owner.canStart(), true);
});

test('a reload never revives an active run', () => {
  const storage = memory();
  new WorkoutSessionOwner({ storage }).start();
  assert.equal(new WorkoutSessionOwner({ storage }).canStart(), true);
});
