import test from 'node:test';
import assert from 'node:assert/strict';
import { createEcosystem, STILL_SECONDS, MAX_POSE_GAP_MS } from '../arcade/hold/ecosystem.mjs';
import { createPower, retainedPowerStyle } from '../arcade/power/power.mjs';
import { createRetainedPower } from '../arcade/power/retained-power.mjs';
import { saveEffectChoice } from '../arcade/power/aura-options.mjs';
import { EXERCISES } from '../exercise-library.mjs';

class MemoryStorage {
  values = new Map();
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, String(value)); }
}

function points() {
  const result = Array.from({ length: 33 }, () => null);
  for (const [index, x, y] of [[11,.4,.25],[12,.6,.25],[13,.34,.37],[14,.66,.37],[15,.29,.49],[16,.71,.49],
    [23,.43,.53],[24,.57,.53],[25,.42,.67],[26,.58,.67],[27,.41,.86],[28,.59,.86],
    [29,.4,.88],[30,.6,.88],[31,.39,.89],[32,.61,.89]]) result[index] = { x, y, visibility: .95 };
  return result;
}

function withStorage(storage, run) {
  const old = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
  try { return run(); }
  finally { if (old) Object.defineProperty(globalThis, 'localStorage', old); else delete globalThis.localStorage; }
}

function workout(mode, now, overrides = {}) {
  const exercise = EXERCISES[mode];
  return { points: points(), now, workout: { sessionId: 'group-test', mode, kind: exercise.kind, stage: 'working', active: true,
    workingReps: 1, activeSeconds: 15, validHold: true, ...overrides } };
}

test('camera power applies the current exercise group choice and leaves cardio/boxing without effects', () => withStorage(new MemoryStorage(), () => {
  const storage = globalThis.localStorage;
  assert.equal(saveEffectChoice('legs', 'firespin', { storage, target: null }), true);
  assert.equal(saveEffectChoice('shoulders', 'magic8', { storage, target: null }), true);
  assert.equal(saveEffectChoice('floor', 'bluefire', { storage, target: null }), true);
  assert.equal(saveEffectChoice('core', 'protectioncircle', { storage, target: null }), true);
  const engine = createPower({ seed: 9 });
  engine.pose(workout('squat', 10)); assert.equal(engine.state.effect, 'firespin'); assert.equal(engine.state.route, 'aura');
  engine.pose(workout('front-raise', 20)); assert.equal(engine.state.effect, 'magic8'); assert.equal(engine.state.route, 'lightning');
  engine.pose(workout('pushup', 30)); assert.equal(engine.state.effect, 'bluefire'); assert.equal(engine.state.route, 'floor');
  assert.ok(engine.state.contacts.length, 'floor variation retains actual support contacts');
  engine.pose(workout('high-plank', 40)); assert.equal(engine.state.effect, 'protectioncircle'); assert.equal(engine.state.route, null);
  engine.pose(workout('boxing', 50)); assert.equal(engine.state.effect, null); assert.equal(engine.state.route, null);
  engine.pose(workout('jogging', 60)); assert.equal(engine.state.effect, null); assert.equal(engine.state.route, null);
}));

function spawnSelected(ecology) {
  const engine = createEcosystem({ w: 360, h: 640, seed: 4, ecology });
  const pose = points();
  for (let now = 0; now <= STILL_SECONDS * 1000; now += 100) engine.pose({ points: pose, now, validHold: true });
  return { engine, pose };
}

test('selected yoga ecology keeps the existing valid-hold gate and kind-specific movement behavior', () => {
  const { engine: fungi, pose } = spawnSelected({ kind: 'plant', variant: 'mushroom' });
  assert.equal(fungi.state.entities.length, 1);
  assert.equal(fungi.state.entities[0].kind, 'plant');
  assert.equal(fungi.state.entities[0].variant, 'mushroom');
  fungi.pose({ points: pose.map((p, i) => i === 15 ? { ...p, x: .6 } : p), now: 5100, validHold: true });
  assert.equal(fungi.state.entities[0].phase, 'retreating');

  const { engine: bear, pose: bearPose } = spawnSelected({ kind: 'animal', variant: 'bear' });
  assert.equal(bear.state.entities.length, 1);
  assert.equal(bear.state.entities[0].kind, 'animal');
  assert.equal(bear.state.entities[0].variant, 'bear');
  bear.pose({ points: bearPose.map((p, i) => i === 15 ? { ...p, x: .6 } : p), now: 5100, validHold: true });
  assert.equal(bear.state.entities[0].phase, 'fleeing');

  const gap = createEcosystem({ seed: 4, ecology: { kind: 'plant', variant: 'fern' } });
  const still = points();
  for (let now = 0; now < 4000; now += 100) gap.pose({ points: still, now, validHold: true });
  gap.pose({ points: still, now: 4000 + MAX_POSE_GAP_MS + 1, validHold: true });
  assert.equal(gap.state.stillSeconds, 0, 'the selected variant does not bypass the stale-pose reset');
  assert.equal(gap.state.entities.length, 0, 'stale tracking cannot spawn the selected ecology');
});

test('retained exercise style metadata follows the observed exercise group without changing progression', () => {
  const retained = createRetainedPower({ storage: new MemoryStorage(), ownerId: 'guest:grouped-effect' });
  const observe = (mode, sessionId) => retained.observe({ now: 1000, workout: { ownerId: 'guest:grouped-effect', sessionId,
    mode, kind: EXERCISES[mode].kind, stage: 'working', workingReps: 5, activeSeconds: 15 } });
  assert.equal(observe('front-raise', 'shoulder-session'), true);
  assert.equal(retained.read().styles.lightning.group, 'shoulders');
  assert.equal(retained.read().styles.lightning.mode, 'front-raise');
  assert.equal(observe('squat', 'leg-session'), true);
  assert.equal(retained.read().styles.aura.group, 'legs');
  assert.equal(retained.read().styles.aura.mode, 'squat');
  assert.equal(retainedPowerStyle('squat'), 'aura');
  assert.equal(retainedPowerStyle('front-raise'), 'lightning');
});
