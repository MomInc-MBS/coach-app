import test from 'node:test';
import assert from 'node:assert/strict';
import { createGrowth, AURA_TUNING as T } from '../arcade/power/aura-growth.mjs';
import { createPower } from '../arcade/power/power.mjs';
import { EXERCISES } from '../exercise-library.mjs';

function pose(dx = 0) {
  const p = Array.from({ length: 33 }, () => ({ x: .5, y: .5, visibility: .95 }));
  for (const [i, x, y] of [[11,.4,.25],[12,.6,.25],[13,.34,.37],[14,.66,.37],[15,.29 + dx,.49],[16,.71,.49],[23,.43,.53],[24,.57,.53],[25,.42,.67],[26,.58,.67],[27,.41,.86],[28,.59,.86]]) p[i] = { x, y, visibility: .95 };
  return p;
}

test('visible at once, then steps up per rep and decays smoothly when the user stops', () => {
  const g = createGrowth();
  g.update({ now: 0, points: pose(), kind: 'reps', units: 0 });
  g.step(0.05);
  assert.ok(g.state.level >= T.START - 1e-9, 'visible on the very first frame');
  let now = 100, goal = g.state.goal;
  for (let rep = 1; rep <= 5; rep++) {
    g.update({ now: now += 100, points: pose(), kind: 'reps', units: rep });
    assert.ok(g.state.goal >= goal + T.REP_STEP - 1e-9, `rep ${rep} steps up`);
    goal = g.state.goal;
  }
  for (let i = 0; i < 40; i++) { g.update({ now: now += 100, points: pose(), kind: 'reps', units: 5 }); g.step(0.1); }
  assert.ok(g.state.goal < goal, 'decays when idle');
  assert.ok(g.state.goal >= T.START, 'decay never drops below the start level while active');
});

test('holds grow per valid second only; invalid holds do not grow', () => {
  const g = createGrowth();
  g.update({ now: 0, points: pose(), kind: 'hold', valid: true });
  for (let t = 100; t <= 5000; t += 100) g.update({ now: t, points: pose(), kind: 'hold', valid: true });
  assert.ok(Math.abs(g.state.goal - (T.START + 5 * T.HOLD_PER_SEC)) < 0.02);
  const before = g.state.goal;
  g.update({ now: 5100, points: pose(), kind: 'hold', valid: false });
  assert.equal(g.state.goal, before);
});

test('punches grow the pace/step level and the cap holds', () => {
  const g = createGrowth();
  let now = 0;
  g.update({ now, points: pose(0), kind: 'move' });
  for (let i = 0; i < 40; i++) { for (const dx of [0, .25, 0]) g.update({ now: now += 80, points: pose(dx), kind: 'move' }); }
  assert.ok(g.state.bumps >= 20, 'every punch is a step');
  assert.equal(g.state.goal, T.MAX);
});

test('createPower shows at start, includes boxing/cardio, and warm-up stage grows too', () => {
  const run = (mode, stage, units) => {
    const e = createPower({ seed: 3 });
    e.pose({ points: pose(), now: 10, workout: { sessionId: 's', mode, kind: EXERCISES[mode].kind === 'hold' ? 'hold' : EXERCISES[mode].kind === 'reps' ? 'reps' : 'gentle', stage, active: true, workingReps: units, activeSeconds: 0, validHold: true } });
    e.step(0.05); return e.state;
  };
  for (const [mode, stage] of [['squat', 'working'], ['squat', 'preparation-easy'], ['front-raise', 'working'], ['pushup', 'working'], ['horse', 'working'], ['boxing', 'working'], ['jogging', 'working']]) {
    const s = run(mode, stage, 0);
    assert.equal(s.active, true, `${mode}/${stage} active at 0 reps`);
    assert.ok(s.level >= T.START - 1e-9, `${mode}/${stage} visible level`);
    assert.ok(s.effect, `${mode} has an effect`);
  }
  assert.equal(run('squat', 'preparation-rest', 0).active, false);
});

import { auraLevel } from '../arcade/power/aura-growth.mjs';
test('discrete aura levels: L1 at start, L3 after a set\'s worth of reps, event on change, hysteresis on the way down', () => {
  const bus = new EventTarget(), prior = globalThis.dispatchEvent;
  globalThis.dispatchEvent = e => bus.dispatchEvent(e);
  const seen = [];
  const on = e => seen.push(e.detail.level);
  bus.addEventListener('myr5:aura-level', on);
  const g = createGrowth();
  g.update({ now: 0, points: pose(), kind: 'reps', units: 0 });
  assert.equal(g.state.auraLevel, 1);
  let now = 0, reps = 0;
  while (g.state.auraLevel < 3 && reps < 30) { reps++; now += 1500; g.update({ now, points: pose(), kind: 'reps', units: reps }); }
  assert.equal(g.state.auraLevel, 3);
  assert.ok(reps >= 5 && reps <= 12, 'L3 within a normal set, took ' + reps);
  assert.deepEqual(seen, [1, 2, 3]);
  assert.equal(auraLevel(T.LEVELS[2] - 0.05, 3), 3, 'still L3 just under the threshold');
  assert.equal(auraLevel(T.LEVELS[2] - 0.05, 2), 2, 'but not gained there');
  g.reset();
  assert.equal(g.state.auraLevel, 0);
  assert.equal(seen.at(-1), 0);
  globalThis.dispatchEvent = prior;
});
