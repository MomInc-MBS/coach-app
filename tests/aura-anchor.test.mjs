import test from 'node:test';
import assert from 'node:assert/strict';
import { AURA_BODY, torsoPx, bodyCentre, boneRadius, sheetSprite, circlePlacement, pulsePlacement, clampLead, fadeToward, SHEET_SLOTS } from '../arcade/power/aura-anchor.mjs';
import { createAuraTracker } from '../arcade/power/aura-body.mjs';
import { createQualityMonitor, EFFECT_QUALITY } from '../arcade/workout-effects.mjs';

// Standing figure in overlay fractions; `dx`/`dy` translate it, `k` scales it about (0.5, 0.5).
function figure({ dx = 0, dy = 0, k = 1 } = {}) {
  const P = Array.from({ length: 33 }, () => null);
  const put = (i, x, y) => { P[i] = { x: 0.5 + (x - 0.5) * k + dx, y: 0.5 + (y - 0.5) * k + dy, visibility: 0.95 }; };
  put(0, .5, .2); put(11, .42, .3); put(12, .58, .3); put(13, .38, .4); put(14, .62, .4); put(15, .36, .5); put(16, .64, .5);
  put(23, .45, .55); put(24, .55, .55); put(25, .45, .7); put(26, .55, .7); put(27, .45, .85); put(28, .55, .85);
  return P;
}
const W = 360, H = 800;

test('torso length is measured in pixels with the aspect ratio applied', () => {
  const P = figure();
  // shoulder->hip on the left: dx .03*360, dy .25*800
  assert.ok(Math.abs(torsoPx(P, W, H) - Math.hypot(0.03 * W, 0.25 * H)) < 1e-6);
  assert.equal(torsoPx([], W, H), null);
});

test('sheet sprites stay pinned to their own bone slot across whole seconds (no 1 s joint hop)', () => {
  const P = figure(), torso = torsoPx(P, W, H), a = {}, b = {};
  for (let i = 0; i < 8; i++) {
    assert.ok(sheetSprite(P, i, 'body', 0.98, W, H, torso, 1, a));
    assert.ok(sheetSprite(P, i, 'body', 1.02, W, H, torso, 1, b));
    // 40 ms apart across the second boundary: only the slow orbit moves it (old code jumped to another joint)
    assert.ok(Math.hypot(a.x - b.x, a.y - b.y) < torso * 0.02, `sprite ${i} moved ${Math.hypot(a.x - b.x, a.y - b.y)}`);
  }
  // and it lives within its orbit of its slot's bone point at any time
  const slot = SHEET_SLOTS[1], [rx, ry] = AURA_BODY.BODY_ORBIT;
  const bx = (P[slot[0]].x + (P[slot[1]].x - P[slot[0]].x) * slot[2]) * W, by = (P[slot[0]].y + (P[slot[1]].y - P[slot[0]].y) * slot[2]) * H;
  for (const t of [0, 3.3, 17.9]) { sheetSprite(P, 1, 'body', t, W, H, torso, 1, a); assert.ok(Math.abs(a.x - bx) <= rx * torso + 1e-6 && Math.abs(a.y - by) <= ry * torso + 1e-6); }
});

test('sprites follow the body when it moves and hide when their bone is not tracked', () => {
  const near = figure(), moved = figure({ dx: 0.2, dy: 0.05 }), a = {}, b = {};
  const torso = torsoPx(near, W, H);
  sheetSprite(near, 3, 'orbit', 2, W, H, torso, 1, a); sheetSprite(moved, 3, 'orbit', 2, W, H, torso, 1, b);
  assert.ok(Math.abs(b.x - a.x - 0.2 * W) < 1e-6 && Math.abs(b.y - a.y - 0.05 * H) < 1e-6);
  const lost = figure(); lost[25] = null;
  assert.equal(sheetSprite(lost, 3, 'body', 2, W, H, torso, 1, a), false, 'slot 3 is the left thigh (23-25)');
});

test('sizes and radii scale with the on-screen torso, not the canvas', () => {
  const small = figure({ k: 0.5 }), big = figure({ k: 1 }), a = {}, b = {};
  const ts = torsoPx(small, W, H), tb = torsoPx(big, W, H);
  assert.ok(Math.abs(tb / ts - 2) < 1e-6);
  sheetSprite(small, 0, 'body', 0, W, H, ts, 1, a); sheetSprite(big, 0, 'body', 0, W, H, tb, 1, b);
  assert.ok(Math.abs(b.size / a.size - 2) < 1e-6);
  assert.ok(Math.abs(circlePlacement(big, W, H, 1).size / circlePlacement(small, W, H, 1).size - 2) < 1e-6);
  assert.ok(Math.abs(boneRadius('upper', tb, .5) / boneRadius('upper', ts, .5) - 2) < 1e-6);
});

test('circle effects and rep pulses centre on the body, not the screen', () => {
  const P = figure({ dx: -0.25, dy: 0.1 }), c = circlePlacement(P, W, H, 1), p = pulsePlacement(P, W, H), centre = bodyCentre(P, W, H);
  assert.ok(Math.abs(c.x - 0.25 * W) < 1e-6, 'hip midpoint x');
  assert.ok(Math.abs(p.x - centre.centre.x) < 1e-6 && Math.abs(p.y - centre.centre.y) < 1e-6);
  const none = circlePlacement([], W, H, 1);
  assert.ok(Math.abs(none.x - W * 0.5) < 1e-6, 'no body: old screen-centre fallback');
});

test('capsule radius grows with level and widens with speed up to +50%', () => {
  const t = 200, r0 = boneRadius('lower', t, 0), r1 = boneRadius('lower', t, 1);
  assert.ok(r1 > r0);
  assert.ok(Math.abs(boneRadius('lower', t, 1, 99) / r1 - (1 + AURA_BODY.SPEED_WIDEN)) < 1e-9);
  assert.ok(Math.abs(boneRadius('lower', t, 1, AURA_BODY.SPEED_REF / 2) / r1 - (1 + AURA_BODY.SPEED_WIDEN / 2)) < 1e-9);
});

test('prediction lead is clamped and fades are linear over FADE_MS', () => {
  const c = clampLead({ x: 0.5, y: 0.5 }, { x: 0.9, y: 0.5 }, 0.04);
  assert.ok(Math.abs(c.x - 0.54) < 1e-9 && c.y === 0.5);
  assert.deepEqual(clampLead({ x: 0.5, y: 0.5 }, { x: 0.51, y: 0.5 }, 0.04), { x: 0.51, y: 0.5 });
  let a = 0; for (let i = 0; i < 5; i++) a = fadeToward(a, 1, 50);
  assert.ok(Math.abs(a - 1) < 1e-9, '5 x 50 ms = 250 ms');
  assert.ok(Math.abs(fadeToward(1, 0, 125) - 0.5) < 1e-9);
});

test('tracker: filtered + predicted points stay closer to a fast-moving joint than the raw lagging sample', () => {
  const tr = createAuraTracker();
  const speed = 1.2; // overlay fractions per second (a fast side step / punch)
  let errPred = 0, errRaw = 0, n = 0;
  for (let f = 0; f <= 30; f++) {
    const capture = f * 33.3, lag = 45; // detection lands 45 ms after capture
    const P = figure({ dx: speed * capture / 1000 - 0.3 });
    tr.pose(P, capture);
    if (f < 10) continue;
    const now = capture + lag, truth = 0.5 + (0.45 - 0.5) + speed * now / 1000 - 0.3; // hip 23 x at display time
    const drawn = tr.points(now)[23];
    errPred += Math.abs(drawn.x - truth); errRaw += Math.abs(P[23].x - truth); n++;
  }
  assert.ok(errPred / n < errRaw / n, `predicted ${errPred / n} vs raw ${errRaw / n}`);
});

test('tracker: a lost joint holds its place and fades out instead of popping', () => {
  const tr = createAuraTracker();
  for (let f = 0; f < 12; f++) tr.pose(figure(), f * 33);
  assert.ok(tr.points(400)[15].alpha > 0.9);
  const before = { ...tr.points(400)[15] };
  let t = 12 * 33, seenFrames = 0;
  for (let f = 0; f < 12; f++) { const P = figure(); P[15] = { ...P[15], visibility: 0.1 }; tr.pose(P, t); t += 33; if (tr.points(t)[15].alpha > 0) seenFrames++; }
  const after = tr.points(t)[15];
  assert.equal(after.alpha, 0); assert.ok(seenFrames >= 4, `faded over ${seenFrames} frames`);
  assert.ok(Math.abs(after.x - before.x) < 0.01);
});

test('quality ladder steps down on slow frames, earns Q3 slowly, and stays capped after losing Q3', () => {
  const q = createQualityMonitor();
  assert.equal(q.tier, EFFECT_QUALITY.START);
  for (let i = 0; i < 300; i++) q.frame(16.7); // 5 s smooth
  assert.equal(q.tier, 3);
  for (let i = 0; i < 80; i++) q.frame(40);
  assert.ok(q.tier <= 2); assert.equal(q.cap, 2);
  for (let i = 0; i < 60; i++) q.frame(40);
  assert.ok(q.tier <= 1);
  for (let i = 0; i < 600; i++) q.frame(16.7);
  assert.equal(q.tier, 2, 'recovers but never back to the mask tier this session');
  q.reset(); assert.equal(q.tier, EFFECT_QUALITY.START);
  for (let i = 0; i < 30; i++) q.frame(1000); // tab switches are ignored
  assert.equal(q.tier, EFFECT_QUALITY.START);
});
