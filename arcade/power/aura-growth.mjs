// One growth model for every aura group. Pure and renderer-free so holds, reps, punches and steps share it.
// level 0..1 is what the renderers draw: it starts visible the instant an exercise is active, steps up on every
// counted rep / detected punch or step, creeps up per second held or moved, and eases back down when you stop.
export const AURA_TUNING = Object.freeze({
  START: 0.26,          // level the moment the exercise is active (small but clearly visible)
  REP_STEP: 0.08,       // instant step per counted rep
  BURST_STEP: 0.045,    // instant step per punch / knee lift / jump (fast limb burst) on pace and step work
  HOLD_FIRST_S: 0.25,   // still-hold seconds before the first plant/animal/ice shows (engine default is 5 s)
  HOLD_PER_SEC: 0.05,   // growth per second of valid hold
  MOVE_PER_SEC: 0.1,    // continuous growth per second at MOVE_CAP body-lengths/s of limb speed
  MOVE_CAP: 1.6,        // limb speed (torso lengths per second) that earns full MOVE_PER_SEC
  MOVE_MIN: 0.25,       // slower than this is not movement
  BURST_SPEED: 1.1,     // limb speed that counts as a punch / step
  BURST_COOLDOWN_S: 0.22,
  IDLE_GRACE_S: 1.2,    // seconds of no progress before decay starts
  DECAY_PER_SEC: 0.1,   // decay toward START (never to nothing while the exercise is active)
  EASE_PER_SEC: 9,      // drawn level chases the goal at this rate (smooth, but a step is seen within ~0.1 s)
  // Discrete aura levels (1 = the aura is on, 2, 3 = the 3D coach joins). Thresholds on the growth goal (0..1).
  // L3 is about 8 good reps (~12 s of steady work) or ~13 s of valid hold from a fresh start: roughly mid-set.
  LEVELS: [0.26, 0.6, 0.92],
  LEVEL_HYST: 0.15,     // goal must fall this far below a threshold to lose that level (no flicker on a short pause)
  MAX: 1,
  PULSE_FALL_PER_SEC: 2.5,
  MAX_DT_S: 0.25,
  LAYER_OPACITY: 0.85,   // effect canvas opacity over the camera (was capped at 0.3, which hid the auras)
});

// Sheets whose frames are mostly empty (measured alpha coverage) draw larger so every pick is readable on a phone.
export const SPARSE_BOOST = Object.freeze({ casting: 2, magichit: 2, weaponhit: 1.8, bluefire: 1.7, flamelash: 1.7, magicspell: 1.5, magicbubbles: 1.5, firespin: 1.4, phantom: 1.4, midnight: 1.4, protectioncircle: 1.3 });

const LIMBS = [15, 16, 25, 26, 27, 28]; // hands, knees, ankles
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const ok = p => p && Number.isFinite(p.x) && Number.isFinite(p.y) && (p.visibility ?? 1) >= 0.5;

function torso(points) {
  const a = points[11], b = points[23], c = points[12], d = points[24];
  const L = [[a, b], [c, d], [a, c]].filter(([p, q]) => ok(p) && ok(q)).map(([p, q]) => Math.hypot(p.x - q.x, p.y - q.y));
  return L.length ? Math.max(0.05, Math.max(...L)) : 0.25;
}

/** Discrete level for a growth goal, with hysteresis from the previous level. */
export function auraLevel(goal, previous = 0, T = AURA_TUNING) {
  let level = 0;
  T.LEVELS.forEach((at, i) => { if (goal >= at - 1e-9 || (previous > i && goal >= at - T.LEVEL_HYST)) level = i + 1; });
  return level;
}
function announce(level, previous) {
  try { if (typeof CustomEvent === 'function' && globalThis.dispatchEvent) globalThis.dispatchEvent(new CustomEvent('myr5:aura-level', { detail: { level, previous } })); } catch { /* cosmetic */ }
}

export function createGrowth(tuning = AURA_TUNING) {
  const T = { ...AURA_TUNING, ...tuning };
  const s = { level: 0, goal: 0, pulse: 0, speed: 0, started: false, bumps: 0, auraLevel: 0 };
  const setAura = next => { if (next !== s.auraLevel) { const previous = s.auraLevel; s.auraLevel = next; announce(next, previous); } };
  let prev = null, lastNow = null, lastGain = 0, lastBurst = -Infinity, lastUnits = null, burstArmed = true;

  function reset() { Object.assign(s, { level: 0, goal: 0, pulse: 0, speed: 0, started: false, bumps: 0 }); setAura(0); prev = lastNow = lastUnits = null; lastGain = 0; lastBurst = -Infinity; burstArmed = true; return s; }
  function bump(amount, now) { s.goal = Math.min(T.MAX, s.goal + amount); lastGain = now; s.pulse = 1; s.bumps++; }

  /** kind: 'hold' | 'reps' | 'move' (pace / steps). units: counted reps. valid: hold is valid. points: normalized landmarks. */
  function update({ now, points, kind, units = 0, valid = true }) {
    if (!s.started) { s.started = true; s.goal = s.level = T.START; lastGain = now; }
    const dt = lastNow == null ? 0 : clamp((now - lastNow) / 1000, 0, T.MAX_DT_S);
    lastNow = now;
    // limb speed in torso lengths per second
    let speed = 0;
    if (points && prev && dt > 0) {
      const scale = torso(points), v = [];
      for (const i of LIMBS) if (ok(points[i]) && ok(prev[i])) v.push(Math.hypot(points[i].x - prev[i].x, points[i].y - prev[i].y) / scale / dt);
      if (v.length) speed = Math.max(...v);
    }
    if (points) prev = points.map(p => (ok(p) ? { x: p.x, y: p.y, visibility: p.visibility } : null));
    s.speed = speed;
    if (kind === 'hold') {
      if (valid && dt) { s.goal = Math.min(T.MAX, s.goal + T.HOLD_PER_SEC * dt); lastGain = now; }
    } else {
      if (kind === 'reps') {
        if (lastUnits != null && units > lastUnits) bump(T.REP_STEP * Math.min(3, units - lastUnits), now);
        lastUnits = units;
      } else if (speed >= T.BURST_SPEED && burstArmed && now / 1000 - lastBurst >= T.BURST_COOLDOWN_S) {
        bump(T.BURST_STEP, now); lastBurst = now / 1000; burstArmed = false;
      }
      if (speed < T.BURST_SPEED * 0.6) burstArmed = true;
      if (speed >= T.MOVE_MIN && dt) { s.goal = Math.min(T.MAX, s.goal + T.MOVE_PER_SEC * Math.min(1, speed / T.MOVE_CAP) * dt); lastGain = now; }
    }
    if (dt && (now - lastGain) / 1000 > T.IDLE_GRACE_S) s.goal = Math.max(T.START, s.goal - T.DECAY_PER_SEC * dt);
    setAura(auraLevel(s.goal, s.auraLevel, T));
    return s;
  }

  /** Per frame: ease the drawn level toward the goal and fall the pulse. */
  function step(rawDt = 0) {
    const dt = Math.min(0.05, Math.max(0, Number(rawDt) || 0));
    s.level += (s.goal - s.level) * Math.min(1, dt * T.EASE_PER_SEC);
    s.pulse = Math.max(0, s.pulse - dt * T.PULSE_FALL_PER_SEC);
    return s;
  }
  return { state: s, update, step, reset, tuning: T };
}
