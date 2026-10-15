// Deterministic, renderer-independent ecology engine for tracked workout holds.
// The small PRNG is adapted from arcade/slice/core.mjs so this feature adds no dependency.
export const STILL_SECONDS = 5;
export const MAX_POSE_GAP_MS = 1000;
export const MIN_VISIBILITY = 0.5;
export const MAX_ENTITIES = 36;
export const MAX_DEBRIS = 96;
export const CRACK_SECONDS = 0.3;

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
function rng(seed = 1) {
  return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
const PLANTS = ['fern', 'vine', 'flower'];
const ANIMALS = ['rabbit', 'fox'];
const MINERALS = ['rock', 'crystal'];
const COMPARABLE = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];
const TORSO = [11, 12, 23, 24];
const LIMBS = [13, 14, 15, 16, 25, 26, 27, 28];
const BODY_ATTACHMENTS = [0, 11, 12, 13, 14, 15, 16];

function readPoint(points, i) { return Array.isArray(points) ? points[i] : points?.[i] ?? points?.[String(i)]; }
function normalized(points, w, h, indices = COMPARABLE) {
  const out = new Map();
  for (const i of indices) {
    const p = readPoint(points, i), visibility = Number(p?.visibility ?? p?.score ?? p?.confidence);
    if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y) || !Number.isFinite(visibility) || visibility < MIN_VISIBILITY) continue;
    out.set(i, { x: p.x * w, y: p.y * h });
  }
  return out;
}
function torsoScale(points) {
  const pairs = [[11, 12], [23, 24], [11, 23], [12, 24]];
  const lengths = pairs.map(([a, b]) => points.has(a) && points.has(b) ? Math.hypot(points.get(a).x - points.get(b).x, points.get(a).y - points.get(b).y) : 0).filter(n => n > 0);
  if (!lengths.length) return 0;
  // Median-ish robust estimate: vertical torso length and shoulder/hip widths all describe body scale.
  lengths.sort((a, b) => a - b);
  return lengths[Math.floor(lengths.length / 2)] || lengths[0];
}
function enoughPose(points) {
  return TORSO.filter(i => points.has(i)).length >= 2 && LIMBS.filter(i => points.has(i)).length >= 2 && points.size >= 4;
}

export function createEcosystem({ w = 360, h = 640, seed = 1, onEvent = () => {}, spawnEntities = true } = {}) {
  const rand = rng(seed), choose = list => list[Math.floor(rand() * list.length)];
  const state = { w, h, phase: 'waiting', stillSeconds: 0, groundY: h - 6, entities: [], debris: [] };
  let reference = null, previous = null, lastTimestamp = null, poseAge = Infinity;
  let nextGrowth = STILL_SECONDS, nextId = 1, elapsed = 0, growthOrdinal = 0;

  const emit = (type, payload) => { try { onEvent(type, payload); } catch { /* cosmetic observers cannot break tracking */ } };
  function beginDeparture() {
    let changed = false;
    for (const e of state.entities) {
      if (['retreating', 'fleeing', 'cracking'].includes(e.phase)) continue;
      e.anchor = null;
      e.phase = e.kind === 'plant' ? 'retreating' : e.kind === 'animal' ? 'fleeing' : 'cracking';
      e.phaseTime = 0;
      if (e.kind === 'animal') e.facing = e.x < w / 2 ? -1 : 1;
      changed = true;
    }
    if (changed) emit('retreat', { reason: 'movement-or-invalid-pose' });
    state.phase = changed || state.entities.some(e => ['retreating', 'fleeing', 'cracking'].includes(e.phase)) ? 'retreating' : 'waiting';
  }
  function clearEligibility({ depart = true } = {}) {
    state.stillSeconds = 0;
    reference = previous = null;
    lastTimestamp = null;
    poseAge = Infinity;
    nextGrowth = STILL_SECONDS;
    if (depart) beginDeparture(); else state.phase = 'waiting';
  }
  function getGround(points) {
    const lower = [27, 28, 29, 30, 31, 32].map(i => readPoint(points, i))
      .filter(p => p && Number.isFinite(p.x) && Number.isFinite(p.y) && Number(p.visibility ?? p.score ?? p.confidence) >= MIN_VISIBILITY);
    if (!lower.length) return h - 6;
    return clamp(Math.max(...lower.map(p => p.y * h)) + 2, h * 0.35, h - 2);
  }
  function pickAnchor(points) {
    const choices = BODY_ATTACHMENTS.map(i => [i, readPoint(points, i)])
      .filter(([, p]) => p && Number.isFinite(p.x) && Number.isFinite(p.y) && Number(p.visibility ?? p.score ?? p.confidence) >= MIN_VISIBILITY);
    if (choices.length && rand() < 0.65) {
      const [index, p] = choose(choices);
      return { type: 'joint', index, dx: (rand() - 0.5) * 18, dy: (rand() - 0.5) * 12, targetX: p.x * w, targetY: p.y * h };
    }
    return { type: 'ground', x: w * (0.12 + rand() * 0.76) };
  }
  function anchorTarget(anchor, points) {
    if (anchor?.type === 'joint') {
      const p = readPoint(points, anchor.index);
      if (p && Number.isFinite(p.x) && Number.isFinite(p.y) && Number(p.visibility ?? p.score ?? p.confidence) >= MIN_VISIBILITY) {
        anchor.targetX = p.x * w; anchor.targetY = p.y * h;
      }
      return { x: anchor.targetX + anchor.dx, y: anchor.targetY + anchor.dy };
    }
    return { x: anchor?.x ?? w / 2, y: state.groundY };
  }
  function spawnEntity(points) {
    if (state.entities.length >= MAX_ENTITIES) return;
    const anchor = pickAnchor(points), target = anchorTarget(anchor, points), roll = rand();
    const kind = roll < 0.57 ? 'plant' : roll < 0.78 ? 'animal' : 'mineral';
    const variant = kind === 'plant' ? choose(PLANTS) : kind === 'animal' ? choose(ANIMALS) : choose(MINERALS);
    const e = {
      id: nextId++, kind, variant, phase: 'landing', x: target.x, y: target.y - 22,
      size: 16 + Math.floor(rand() * 37), facing: rand() < 0.5 ? -1 : 1,
      growth: 0, alpha: 0.2, phaseTime: 0, anchor,
    };
    e._targetY = target.y;
    state.entities.push(e);
    emit('growth', { id: e.id, kind, variant });
  }
  function movementDetected(current, now) {
    if (!reference || !previous || lastTimestamp == null) return false;
    const comparable = COMPARABLE.filter(i => current.has(i) && previous.has(i) && reference.has(i));
    if (comparable.length < 4 || TORSO.filter(i => comparable.includes(i)).length < 2 || LIMBS.filter(i => comparable.includes(i)).length < 2) return null;
    const scale = Math.max(1, torsoScale(current));
    const prevScale = Math.max(1, torsoScale(previous));
    const norm = (a, b, s) => Math.hypot(a.x - b.x, a.y - b.y) / s;
    const dt = (now - lastTimestamp) / 1000;
    for (const i of comparable) {
      const p = current.get(i), q = previous.get(i), r = reference.get(i);
      if (!p || !q || !r) continue;
      const delta = norm(p, q, (scale + prevScale) / 2);
      if ((delta > 0.04 && delta / dt > 0.8) || norm(p, r, scale) > 0.15) return true;
    }
    return false;
  }
  function syncAnchors(points) {
    for (const e of state.entities) {
      if (!e.anchor || ['retreating', 'fleeing', 'cracking'].includes(e.phase)) continue;
      const target = anchorTarget(e.anchor, points);
      e._targetY = target.y;
      // Smooth pose noise while retaining direct, low-latency body attachment.
      e.x += (target.x - e.x) * 0.55;
      if (e.phase === 'settled' || e.phase === 'growing') e.y += (target.y - e.y) * 0.55;
    }
  }

  function pose({ points, now, validHold } = {}) {
    if (!validHold || !Number.isFinite(now) || !points) { clearEligibility(); return state; }
    const current = normalized(points, w, h);
    if (!enoughPose(current)) { clearEligibility(); return state; }
    if (lastTimestamp != null && now <= lastTimestamp) return state;
    const ground = getGround(points);
    state.groundY += (ground - state.groundY) * 0.35;
    if (lastTimestamp != null && now - lastTimestamp > MAX_POSE_GAP_MS) {
      clearEligibility();
      // The current observation starts a fresh reference, but earns no time.
      reference = new Map(current); previous = new Map(current); lastTimestamp = now; poseAge = 0;
      return state;
    }
    if (lastTimestamp == null) {
      reference = new Map(current); previous = new Map(current); lastTimestamp = now; poseAge = 0;
      state.phase = state.entities.some(e => ['retreating', 'fleeing', 'cracking'].includes(e.phase)) ? 'retreating' : 'waiting';
      return state;
    }
    // A landmark first seen confidently on this pose has no trustworthy history.
    // Baseline it now without comparing unseen movement; subsequent poses can track it.
    for (const [index, point] of current) if (!reference.has(index)) reference.set(index, { ...point });
    const moved = movementDetected(current, now);
    if (moved) {
      beginDeparture(); state.stillSeconds = 0;
      nextGrowth = STILL_SECONDS; growthOrdinal = 0;
      reference = new Map(current); previous = new Map(current); lastTimestamp = now; poseAge = 0;
      return state;
    }
    if (moved === null) {
      clearEligibility();
      reference = new Map(current); previous = new Map(current); lastTimestamp = now; poseAge = 0;
      return state;
    }
    syncAnchors(points);
    const dt = (now - lastTimestamp) / 1000;
    state.stillSeconds += dt;
    previous = new Map(current); lastTimestamp = now; poseAge = 0;
    if (state.stillSeconds >= STILL_SECONDS - 1e-9) {
      state.phase = 'growing';
      if (spawnEntities) {
        while (state.stillSeconds >= nextGrowth - 1e-9 && state.entities.length < MAX_ENTITIES) {
          spawnEntity(points); growthOrdinal++;
          nextGrowth += Math.min(2.4, 0.75 + growthOrdinal * 0.035); // slows as ecosystem becomes fuller
        }
      }
    } else if (!state.entities.some(e => ['retreating', 'fleeing', 'cracking'].includes(e.phase))) state.phase = 'waiting';
    return state;
  }

  function step(rawDt = 0) {
    const dtRaw = Number.isFinite(rawDt) && rawDt > 0 ? rawDt : 0;
    poseAge += dtRaw * 1000; // watchdog uses uncapped wall elapsed, not physics delta
    if (poseAge > MAX_POSE_GAP_MS && lastTimestamp != null) clearEligibility();
    const dt = Math.min(0.05, dtRaw);
    elapsed += dt;
    for (const e of state.entities) {
      e.phaseTime += dt;
      if (e.phase === 'landing') {
        const t = clamp(e.phaseTime / 0.8, 0, 1); e.y += ((e._targetY ?? e.y) - e.y) * Math.min(1, dt * 7);
        e.growth = 0.18 + t * 0.34; e.alpha = 0.32 + t * 0.58;
        if (t >= 1) { e.phase = 'growing'; e.phaseTime = 0; }
      } else if (e.phase === 'growing') {
        e.growth = Math.min(1, e.growth + dt * (e.kind === 'plant' ? 0.26 : 0.13));
        e.alpha = 0.4 + e.growth * 0.5;
        if (e.growth >= 1) { e.phase = 'settled'; e.phaseTime = 0; }
      } else if (e.phase === 'retreating') {
        e.y += 12 * dt; e.growth = Math.max(0, e.growth - dt * 1.1); e.alpha = Math.max(0, e.alpha - dt * 0.85);
      } else if (e.phase === 'fleeing') {
        e.x += e.facing * (28 + e.size * 0.6) * dt; e.y -= Math.sin(e.phaseTime * 8) * 5 * dt;
        e.alpha = Math.max(0, e.alpha - dt * 0.22);
      } else if (e.phase === 'cracking' && e.phaseTime >= CRACK_SECONDS) {
        e._shattered = true;
        const n = Math.min(5, MAX_DEBRIS - state.debris.length);
        for (let i = 0; i < n; i++) {
          const angle = rand() * Math.PI * 2, speed = 22 + rand() * 54;
          state.debris.push({ id: nextId++, x: e.x, y: e.y - e.size * 0.3, vx: Math.cos(angle) * speed,
            vy: -26 - rand() * 55, size: 2 + Math.floor(rand() * 4), rotation: rand() * 6,
            alpha: 0.8, color: e.variant === 'crystal' ? '#8be7ff' : '#a99579', groundY: state.groundY,
            _age: 0, _below: false });
        }
        emit('shatter', { id: e.id, count: n });
      }
    }
    state.entities = state.entities.filter(e => {
      if (e.phase === 'cracking' && e._shattered) return false;
      if (e.phase === 'retreating') return e.phaseTime < 1.05 && e.alpha > 0.02;
      if (e.phase === 'fleeing') return e.phaseTime < 2.5 && e.alpha > 0.03 && e.x > -60 && e.x < w + 60;
      return true;
    });
    for (const d of state.debris) {
      d._age += dt; d.x += d.vx * dt; d.y += d.vy * dt; d.vy += 180 * dt; d.rotation += d.vx * dt * 0.025;
      if (d.y >= d.groundY + 12) d._below = true;
      if (d._below) d.alpha = Math.max(0, d.alpha - dt * 0.7);
    }
    state.debris = state.debris.filter(d => d.alpha > 0.01 && d._age < 8);
    if (state.entities.length > MAX_ENTITIES) state.entities.splice(0, state.entities.length - MAX_ENTITIES);
    if (state.debris.length > MAX_DEBRIS) state.debris.splice(0, state.debris.length - MAX_DEBRIS);
    return state;
  }
  function reset() {
    state.phase = 'waiting'; state.stillSeconds = 0; state.entities.length = 0; state.debris.length = 0;
    reference = previous = null; lastTimestamp = null; poseAge = Infinity; nextGrowth = STILL_SECONDS; growthOrdinal = 0; elapsed = 0;
    state.groundY = h - 6;
    return state;
  }
  return { state, pose, step, reset };
}
