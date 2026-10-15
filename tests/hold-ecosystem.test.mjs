import test from 'node:test';
import assert from 'node:assert/strict';
import { createEcosystem, CRACK_SECONDS, MAX_DEBRIS, MAX_ENTITIES, MAX_POSE_GAP_MS, STILL_SECONDS } from '../arcade/hold/ecosystem.mjs';

function body({ dx = 0, dy = 0, wrist = 0, jitter = 0, missing = [] } = {}) {
  const points = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, visibility: 0.95 }));
  const xy = {
    0: [.5, .15], 11: [.42, .29], 12: [.58, .29], 13: [.35, .39], 14: [.65, .39],
    15: [.3, .48], 16: [.7, .48], 23: [.45, .55], 24: [.55, .55], 25: [.43, .68],
    26: [.57, .68], 27: [.42, .88], 28: [.58, .88], 29: [.4, .9], 30: [.6, .9],
    31: [.39, .91], 32: [.61, .91],
  };
  for (const [raw, [x, y]] of Object.entries(xy)) points[Number(raw)] = { x: x + dx + jitter, y: y + dy, visibility: 0.95 };
  points[15].x += wrist;
  for (const i of missing) points[i].visibility = 0.1;
  return points;
}
function input(engine, ms, options = {}) { return engine.pose({ points: body(options), now: ms, validHold: true }); }
function accrue(engine, end, interval = 100) { for (let ms = 0; ms <= end; ms += interval) input(engine, ms); }

test('requires five observed seconds; first pose and RAF time do not count', () => {
  const e = createEcosystem({ seed: 4 });
  input(e, 0);
  for (let i = 0; i < 120; i++) e.step(1 / 60);
  assert.equal(e.state.stillSeconds, 0);
  accrue(e, 4900);
  input(e, 4999);
  assert.ok(e.state.stillSeconds < STILL_SECONDS);
  assert.equal(e.state.entities.length, 0);
  input(e, 5000);
  assert.ok(Math.abs(e.state.stillSeconds - 5) < 1e-9);
  assert.equal(e.state.phase, 'growing');
  assert.equal(e.state.entities.length, 1);
});

test('duplicate/backward timestamps are ignored and long tracking gaps require a fresh five seconds', () => {
  const e = createEcosystem({ seed: 2 }); input(e, 1000); input(e, 1600);
  const credit = e.state.stillSeconds;
  input(e, 1600, { dx: 0.25 }); input(e, 1500, { dx: 0.25 });
  assert.equal(e.state.stillSeconds, credit);
  input(e, 2701);
  assert.equal(e.state.stillSeconds, 0);
  assert.equal(e.state.phase, 'waiting');
  input(e, 3000); input(e, 3600);
  assert.equal(e.state.stillSeconds, 0.899);
});

test('1.5 Hz valid pose stream still earns observed time', () => {
  const e = createEcosystem({ seed: 3 });
  for (let ms = 0; ms <= 5336; ms += 667) input(e, ms);
  assert.ok(e.state.stillSeconds >= 5);
  assert.equal(e.state.entities.length, 1);
});

test('small tracker jitter is tolerated while slow cumulative drift resets stillness', () => {
  const jittered = createEcosystem();
  for (let i = 0; i <= 60; i++) input(jittered, i * 100, { jitter: i % 2 ? 0.0005 : -0.0005 });
  assert.ok(jittered.state.stillSeconds > 5);

  const drift = createEcosystem();
  input(drift, 0);
  for (let i = 1; i <= 25; i++) input(drift, i * 100, { dx: i * 0.003 });
  assert.ok(drift.state.stillSeconds <= 0.1);
  assert.equal(drift.state.phase, 'waiting');
});

test('a single confident limb movement triggers escape; low confidence or loss clears eligibility', () => {
  const e = createEcosystem({ seed: 7 }); accrue(e, 5000);
  assert.equal(e.state.entities.length, 1);
  input(e, 5100, { wrist: 0.08 });
  assert.equal(e.state.stillSeconds, 0);
  assert.ok(['retreating', 'fleeing', 'cracking'].includes(e.state.entities[0].phase));
  input(e, 5200, { missing: [11] });
  assert.equal(e.state.stillSeconds, 0);
  assert.equal(e.state.phase, 'retreating');
  e.pose({ points: body(), now: 5300, validHold: false });
  assert.equal(e.state.stillSeconds, 0);
});

test('movement freezes existing anchors and restarts the growth cadence after a long hold', () => {
  const e = createEcosystem({ seed: 22 });
  accrue(e, 20000, 100);
  assert.ok(e.state.entities.length > 4);
  const before = e.state.entities.map(({ id, x, y }) => ({ id, x, y }));
  input(e, 20100, { dx: 0.15 });
  for (const old of before) {
    const current = e.state.entities.find(entity => entity.id === old.id);
    if (current) { assert.equal(current.x, old.x); assert.equal(current.y, old.y); assert.equal(current.anchor, null); }
  }
  const afterMovement = e.state.entities.length;
  for (let ms = 20200; ms <= 25100; ms += 100) input(e, ms, { dx: 0.15 });
  assert.ok(e.state.stillSeconds >= STILL_SECONDS - 1e-9);
  assert.equal(e.state.entities.length, afterMovement + 1);
});

test('alternating confident landmark subsets cannot accumulate unmatched tracking time', () => {
  const e = createEcosystem();
  input(e, 0);
  input(e, 100, { missing: [25, 26, 27, 28] });
  assert.equal(e.state.stillSeconds, 0.1);
  input(e, 200, { missing: [13, 14, 15, 16] });
  assert.equal(e.state.stillSeconds, 0);
  input(e, 300, { missing: [13, 14, 15, 16] });
  assert.equal(e.state.stillSeconds, 0.1);
});

test('a newly confident wrist is baselined on first sight and its next movement triggers escape', () => {
  const e = createEcosystem({ seed: 12 });
  for (let ms = 0; ms <= 5000; ms += 100) input(e, ms, { missing: [15] });
  assert.equal(e.state.entities.length, 1);
  const before = e.state.entities.map(({ id, x, y }) => ({ id, x, y }));
  input(e, 5100); // wrist 15 returns; unseen movement cannot be inferred on this sample
  assert.ok(Math.abs(e.state.stillSeconds - 5.1) < 1e-9);
  for (const old of before) {
    const current = e.state.entities.find(entity => entity.id === old.id);
    if (current) { assert.equal(current.x, old.x); assert.equal(current.y, old.y); }
  }
  input(e, 5200, { wrist: 0.08 }); // now the wrist has a reference and its movement is observable
  assert.equal(e.state.stillSeconds, 0);
  assert.ok(['retreating', 'fleeing', 'cracking'].includes(e.state.entities[0].phase));
});

test('step watchdog uses uncapped elapsed time and movement during growth departs immediately', () => {
  const e = createEcosystem({ seed: 9 }); accrue(e, 5000);
  e.step(MAX_POSE_GAP_MS / 1000 + 0.01);
  assert.equal(e.state.stillSeconds, 0);
  assert.ok(['retreating', 'fleeing', 'cracking'].includes(e.state.entities[0].phase));
  input(e, 5100); input(e, 5200);
  assert.equal(e.state.stillSeconds, 0.1);
  input(e, 5300, { dy: 0.2 });
  assert.ok(['retreating', 'fleeing', 'cracking'].includes(e.state.entities[0].phase));
});

test('invalid and stale poses cannot bank background time; a new still interval must be earned', () => {
  const e = createEcosystem({ seed: 8 }); accrue(e, 3000);
  e.pose({ points: body(), now: 3100, validHold: false });
  for (let i = 0; i < 600; i++) e.step(1 / 60);
  input(e, 4000);
  assert.equal(e.state.stillSeconds, 0);
  input(e, 5000);
  assert.equal(e.state.stillSeconds, 1);
  assert.equal(e.state.entities.length, 0);
});

test('mineral holds a visible crack phase, then debris falls below cached ground and fades', () => {
  const e = createEcosystem({ seed: 6 }); accrue(e, 5000);
  // Force the deterministic first entity into a mineral to exercise this transition independent of PRNG mix.
  Object.assign(e.state.entities[0], { kind: 'mineral', variant: 'rock', phase: 'settled', growth: 1, alpha: 0.5, phaseTime: 0 });
  input(e, 5100, { wrist: 0.08 });
  const rock = e.state.entities.find(x => x.kind === 'mineral');
  assert.equal(rock.phase, 'cracking');
  for (let i = 0; i < 5; i++) e.step(0.05);
  assert.equal(e.state.debris.length, 0);
  e.step(0.05);
  assert.ok(e.state.debris.length > 0);
  const shards = [...e.state.debris];
  assert.ok(shards.every(d => d.groundY === e.state.groundY));
  for (let i = 0; i < 400 && e.state.debris.length; i++) e.step(0.05);
  assert.equal(e.state.debris.length, 0);
  assert.ok(shards.some(d => d._below));
});

test('same seed produces identical growth and bounded long-running entity/debris arrays', () => {
  const a = createEcosystem({ seed: 123 }), b = createEcosystem({ seed: 123 });
  for (let ms = 0; ms <= 60000; ms += 100) { input(a, ms); input(b, ms); a.step(0.05); b.step(0.05); }
  assert.deepEqual(a.state.entities, b.state.entities);
  assert.deepEqual(a.state.debris, b.state.debris);
  assert.ok(a.state.entities.length <= MAX_ENTITIES);
  assert.ok(a.state.debris.length <= MAX_DEBRIS);
  assert.ok(a.state.entities.every(e => ['fern', 'vine', 'flower', 'mushroom', 'grass', 'reed', 'rabbit', 'fox', 'rock', 'crystal'].includes(e.variant)));
});

test('plant sampling can grow every atlas-backed variant', () => {
  const variants = new Set();
  for (let seed = 1; seed <= 80 && variants.size < 6; seed++) {
    const e = createEcosystem({ seed }); accrue(e, 5000);
    if (e.state.entities[0]?.kind === 'plant') variants.add(e.state.entities[0].variant);
  }
  assert.deepEqual([...variants].sort(), ['fern', 'flower', 'grass', 'mushroom', 'reed', 'vine']);
});

test('reset clears references, clocks, entities, and debris', () => {
  const e = createEcosystem({ seed: 5 }); accrue(e, 5000);
  e.state.debris.push({ id: -1 }); e.reset();
  assert.deepEqual(e.state.entities, []); assert.deepEqual(e.state.debris, []);
  assert.equal(e.state.stillSeconds, 0); assert.equal(e.state.phase, 'waiting');
  input(e, 3000); input(e, 3100); assert.equal(e.state.stillSeconds, 0.1);
});
