// Pure workout power progression plus a small Canvas2D renderer. Reuses the repo's
// progression rules and CC0 pixel effect sheets; no new rendering dependency.
import { EXERCISES } from '../../exercise-library.mjs';
import { REP_CAP, HOLD_BLOCK_SECONDS, HOLD_CAP_SECONDS, repRate } from '../../progression-rules.mjs';
import { createGrowth, SPARSE_BOOST } from './aura-growth.mjs';
import { AURA_OPTIONS, EFFECT_GROUPS, effectGroupForExercise, readEffectChoices, resolveExerciseEffect } from './aura-options.mjs';
import { AURA_BODY, LEG_SLOTS, ARM_SLOTS, bodyScale, sheetSprite, slotPx, circlePlacement, pulsePlacement } from './aura-anchor.mjs';

export const POWER_STALE_MS = 1000;
const REP_BANDS = Array.from({ length: REP_CAP - 1 }, (_, i) => i + 2)
  .filter(rep => repRate('easy', rep) !== repRate('easy', rep - 1));
const FLOOR_DETECTORS = new Set(['pushup', 'bridge', 'plank', 'sideplank']);
const CONFIDENCE = 0.5;

function exerciseOf(exercise) { return typeof exercise === 'string' ? EXERCISES[exercise] : exercise; }
export function powerRoute(exercise) {
  const ex = exerciseOf(exercise);
  if (!ex || typeof ex !== 'object') return null;
  if (ex.group === 'boxing') return 'lightning';
  if (ex.group === 'cardio') return 'aura';
  if (ex.kind === 'pace') return null;
  if (ex.kind === 'hold') return ex.group === 'stances' ? 'aura' : null;
  if (ex.kind !== 'reps' && ex.kind !== 'steps') return null;
  if (FLOOR_DETECTORS.has(ex.detector)) return 'floor';
  if (ex.detector === 'raise' || ex.detector === 'press' || ex.group === 'shoulders') return 'lightning';
  if (['squat', 'split', 'hinge'].includes(ex.detector) || ['legs', 'hips'].includes(ex.group)) return 'aura';
  return 'aura';
}
/** Style used for saved avatar power, including styles that do not draw camera power. */
export function retainedPowerStyle(exercise) {
  const ex = exerciseOf(exercise);
  if (!ex || typeof ex !== 'object') return null;
  if (ex.kind === 'hold') {
    if (ex.group === 'stances') return 'aura';
    if (ex.group === 'core' || ex.group === 'balance') return 'blizzard';
    return null;
  }
  if (ex.group === 'boxing' || ex.group === 'cardio') return null; // retained avatar power stays rep-work only
  return powerRoute(ex);
}

function pointAt(points, index) { return Array.isArray(points) ? points[index] : points?.[index] ?? points?.[String(index)]; }
function cleanPoints(points) {
  if (!points) return [];
  const length = Array.isArray(points) ? points.length : Math.max(-1, ...Object.keys(points).map(Number)) + 1;
  return Array.from({ length }, (_, index) => {
    const p = pointAt(points, index), visibility = Number(p?.visibility ?? p?.score ?? p?.confidence);
    if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y) || !Number.isFinite(visibility) || visibility < CONFIDENCE) return null;
    return { x: p.x, y: p.y, visibility };
  });
}
function visible(points, index) {
  const p = points[index];
  return p && p.visibility >= CONFIDENCE && p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1;
}
function sideIndices(points, side) {
  const left = side !== 'right';
  return left ? { shoulder: 11, elbow: 13, wrist: 15, hip: 23, knee: 25, ankle: 27, heel: 29, toe: 31 }
    : { shoulder: 12, elbow: 14, wrist: 16, hip: 24, knee: 26, ankle: 28, heel: 30, toe: 32 };
}
function footIndex(points, side) {
  const ix = sideIndices(points, side);
  return [ix.heel, ix.toe, ix.ankle].find(i => visible(points, i));
}
function toContacts(points, indices, w, h) {
  const unique = [...new Set(indices)].filter(i => Number.isInteger(i) && visible(points, i)).slice(0, 4);
  return unique.map(index => ({ index, x: points[index].x * w, y: points[index].y * h }));
}
function floorContacts(ex, points, w, h) {
  const d = ex?.detector;
  if (d === 'bridge') return toContacts(points, [footIndex(points, 'left'), footIndex(points, 'right'), 11, 12], w, h);
  if (d === 'sideplank') {
    const ix = sideIndices(points, ex.side);
    const limb = ex.support === 'knees' ? ix.knee : footIndex(points, ex.side);
    return toContacts(points, [ix.elbow, limb], w, h);
  }
  const arms = ex.forearm ? [13, 14] : [15, 16];
  const lowers = ex.support === 'knees' ? [25, 26] : [29, 30, 31, 32, 27, 28];
  const lower = ex.support === 'knees' ? lowers.filter(i => visible(points, i)).slice(0, 2)
    : [footIndex(points, 'left'), footIndex(points, 'right')].filter(Number.isInteger);
  return toContacts(points, [...arms, ...lower], w, h);
}
/** Metadata-based visible support anchors shared by floor power, Blizzard and avatar overlays. */
export function supportContacts(exercise, points, w = 360, h = 640) {
  const ex = exerciseOf(exercise);
  if (!ex) return [];
  if (FLOOR_DETECTORS.has(ex.detector)) return floorContacts(ex, cleanPoints(points), w, h);
  if (ex.kind !== 'hold') return [];
  const clean = cleanPoints(points);
  const left=footIndex(clean,'left'),right=footIndex(clean,'right');
  if(ex.group==='balance'){
    const supported=[left,right].filter(Number.isInteger).sort((a,b)=>clean[b].y-clean[a].y)[0];
    return toContacts(clean,[supported],w,h);
  }
  return toContacts(clean,[left,right],w,h);
}
function bandTier(reps) { return reps <= 0 ? 0 : REP_BANDS.filter(n => reps >= n).length + 1; }
function maxUnits(kind) { return kind === 'hold' ? HOLD_CAP_SECONDS / HOLD_BLOCK_SECONDS : REP_CAP; }
function progressFor(workout) {
  if (workout?.kind === 'hold') {
    const seconds = Number.isFinite(workout.activeSeconds) ? Math.min(HOLD_CAP_SECONDS, Math.max(0, workout.activeSeconds)) : 0;
    const units = Math.floor(seconds / HOLD_BLOCK_SECONDS);
    const max = maxUnits('hold');
    return { units, maxUnits: max, intensity: Math.sqrt(units / max), tier: units <= 0 ? 0 : Math.min(6, Math.ceil(Math.sqrt(units / max) * 6)) };
  }
  const reps = Number.isFinite(workout?.workingReps) ? Math.min(REP_CAP, Math.max(0, Math.floor(workout.workingReps))) : 0;
  return { units: reps, maxUnits: REP_CAP, intensity: reps / REP_CAP, tier: bandTier(reps) };
}
/** Authoritative progression units reused by retained character cosmetics. */
export function powerProgress(workout = {}) {
  const progress = progressFor(workout);
  return { ...progress, kind: workout.kind === 'hold' ? 'hold' : 'reps' };
}

export function createPower({ w = 360, h = 640, seed = 1, onEvent = () => {} } = {}) {
  const state = { w, h, route: null, effect: null, active: false, units: 0, maxUnits: REP_CAP, intensity: 0, tier: 0, level: 0, speed: 0, pulse: 0, contacts: [], points: [], time: 0 };
  const growth = createGrowth();
  let lastBumps = 0;
  let sessionId = null, mode = null, workoutKind = null, baseline = false, lastUnits = 0;
  let effectKey = null, effectRandomState = (Number(seed) >>> 0) || 0x9e3779b9;
  const effectRandom = () => { effectRandomState ^= effectRandomState << 13; effectRandomState ^= effectRandomState >>> 17; effectRandomState ^= effectRandomState << 5; return (effectRandomState >>> 0) / 0x100000000; };
  let lastNow = null, poseAge = Infinity, suppressNextPulse = true;
  const emit = (type, payload) => { try { onEvent(type, payload); } catch { /* cosmetic observers never affect workout flow */ } };
  function clearVisible() { state.active = false; state.pulse = 0; state.level = 0; state.speed = 0; state.contacts = []; state.points = []; growth.reset(); lastBumps = 0; }
  function clearProgress() {
    state.units = 0; state.intensity = 0; state.tier = 0; state.maxUnits = REP_CAP;
    lastUnits = 0; baseline = false; workoutKind = null;
  }
  function hideForStale() { clearVisible(); poseAge = Infinity; lastNow = null; suppressNextPulse = true; }
  function reset() {
    clearVisible(); clearProgress(); state.route = null; state.effect = null; state.time = 0; effectKey = null;
    sessionId = mode = null; lastNow = null; poseAge = Infinity; suppressNextPulse = true;
    return state;
  }
  function invalidate() { hideForStale(); return state; }
  function updateProgress(workout, { allowPulse }) {
    const progress = progressFor(workout), kind = workout.kind === 'hold' ? 'hold' : 'reps';
    const changedKind = workoutKind !== null && workoutKind !== kind;
    if (changedKind) { clearProgress(); }
    state.maxUnits = progress.maxUnits;
    state.units = progress.units; state.intensity = progress.intensity; state.tier = progress.tier;
    if (!baseline) {
      lastUnits = progress.units; baseline = true; workoutKind = kind; state.pulse = 0;
      return;
    }
    const delta = progress.units - lastUnits;
    lastUnits = progress.units; workoutKind = kind;
    if (delta > 0 && allowPulse && !suppressNextPulse) {
      state.pulse = 1;
      emit('pulse', { route: state.route, intensity: state.intensity, units: state.units, deltaUnits: delta, kind, difficulty: workout.difficulty });
    } else if (delta < 0 || !allowPulse || suppressNextPulse) state.pulse = 0;
  }
  function pose({ points, now, workout } = {}) {
    if (!workout || !Number.isFinite(now)) { hideForStale(); return state; }
    // Pace/step work (boxing, marching) has no rep ledger; its counter must not fire rep pulses every frame.
    if (!['reps', 'hold'].includes(EXERCISES[workout.mode]?.kind) && workout.workingReps) workout = { ...workout, workingReps: 0 };
    const nextMode = workout.mode ?? null, nextSession = workout.sessionId ?? null;
    const route = powerRoute(nextMode);
    const newIdentity = sessionId !== nextSession || mode !== nextMode;
    if (newIdentity) {
      clearProgress(); clearVisible(); sessionId = nextSession; mode = nextMode; state.route = route;
      lastNow = null; poseAge = Infinity; suppressNextPulse = true;
    } else state.route = route;
    const group = effectGroupForExercise(nextMode, { camera: true }), choices = readEffectChoices();
    const selection = group ? choices[group] : null, nextEffectKey = group ? `${group}:${selection}` : null;
    if (newIdentity || nextEffectKey !== effectKey) {
      state.effect = group ? resolveExerciseEffect(nextMode, choices, effectRandom, { camera: true }) : null;
      effectKey = nextEffectKey;
    }
    if (!route) { clearVisible(); lastNow = now; poseAge = 0; return state; }
    if (lastNow != null && now <= lastNow) return state;
    const staleGap = lastNow != null && now - lastNow > POWER_STALE_MS;
    if (staleGap) { clearVisible(); suppressNextPulse = true; }
    const clean = cleanPoints(points);
    const working = typeof workout.stage === 'string' && !['preparation-rest', 'sprint-rest'].includes(workout.stage); // warm-up reps grow the aura too
    if (!clean.some(Boolean) || workout.active !== true || !working || (workout.kind === 'hold' && workout.validHold !== true)) {
      updateProgress(workout, { allowPulse: false });
      clearVisible(); lastNow = now; poseAge = 0; suppressNextPulse = true;
      return state;
    }
    const supportedKind = workout.kind === 'hold' ? (route === 'aura' && workout.validHold === true) : true;
    if (!supportedKind) { clearVisible(); lastNow = now; poseAge = 0; return state; }
    const contacts = route === 'floor' ? floorContacts(EXERCISES[nextMode], clean, w, h) : [];
    const allowPulse = !newIdentity && !staleGap && !suppressNextPulse && (route !== 'floor' || contacts.length > 0);
    updateProgress(workout, { allowPulse });
    const wasSuppressed = suppressNextPulse;
    suppressNextPulse = false;
    state.active = true; state.points = clean;
    state.contacts = contacts;
    if (route === 'floor' && state.contacts.length === 0) state.pulse = 0;
    if (route !== 'floor' && state.units === 0) state.pulse = 0;
    if (wasSuppressed) state.pulse = 0;
    const exKind = EXERCISES[nextMode]?.kind;
    const growKind = workout.kind === 'hold' ? 'hold' : exKind === 'reps' ? 'reps' : 'move';
    growth.update({ now, points: clean, kind: growKind, units: progressFor(workout).units, valid: workout.validHold === true });
    state.level = growth.state.level; state.speed = growth.state.speed;
    if (growKind === 'move' && growth.state.bumps > lastBumps) {
      state.pulse = 1; emit('pulse', { route: state.route, intensity: growth.state.goal, units: state.units, deltaUnits: 1, kind: 'move', difficulty: workout.difficulty });
    }
    lastBumps = growth.state.bumps;
    lastNow = now; poseAge = 0;
    return state;
  }
  function step(rawDt = 0) {
    const dtRaw = Number.isFinite(rawDt) && rawDt > 0 ? rawDt : 0;
    state.time += Math.min(0.05, dtRaw);
    poseAge += dtRaw * 1000;
    state.pulse = Math.max(0, state.pulse - Math.min(0.05, dtRaw) * 2.5);
    growth.step(dtRaw); if (state.active) state.level = growth.state.level;
    if (poseAge > POWER_STALE_MS && lastNow != null) hideForStale();
    return state;
  }
  return { state, pose, step, reset, invalidate };
}

// Renderer ---------------------------------------------------------------
const imageCache = new Map();
const frameCache = new Map();
const spriteSources = {
  // Crop boxes are the union of nontransparent pixel bounds across populated cells
  // (PIL alpha>8). Frames are 100x100, row-major; normalize each crop to a 64px
  // cache while preserving its aspect ratio and bottom-aligning the sprite pivot.
  fire: ['/arcade/power/assets/11_fire_spritesheet.png', 100, 8, 61, [40, 27, 65, 78]],
  brightfire: ['/arcade/power/assets/9_brightfire_spritesheet.png', 100, 8, 61, [45, 37, 61, 69]],
  lightning: ['/arcade/power/assets/pixelated_tilesheet.png', 64, 4, 8, [0, 0, 64, 64]],
};
function loadImage(key) {
  if (imageCache.has(key)) return imageCache.get(key);
  if (typeof Image === 'undefined') return null;
  const image = new Image(); imageCache.set(key, image);
  image.onload = () => {}; image.onerror = () => imageCache.delete(key); image.src = spriteSources[key][0];
  return image;
}
function drawSheetFrame(ctx, key, frame, x, y, size, alpha = 1, rotation = 0) {
  const image = loadImage(key), [, frameSize, columns, frameCount, bounds] = spriteSources[key];
  if (!image?.complete || !image.naturalWidth || typeof document === 'undefined') return;
  const sourceFrame = ((frame % frameCount) + frameCount) % frameCount;
  const cacheKey = `${key}:${sourceFrame}`;
  let sprite = frameCache.get(cacheKey);
  if (!sprite) {
    sprite = document.createElement('canvas'); sprite.width = sprite.height = 64;
    const source = sprite.getContext('2d');
    if (!source) return;
    source.imageSmoothingEnabled = false;
    const [left, top, right, bottom] = bounds, cropWidth = right - left, cropHeight = bottom - top;
    const scale = 64 / Math.max(cropWidth, cropHeight), drawWidth = cropWidth * scale, drawHeight = cropHeight * scale;
    const destX = (64 - drawWidth) / 2, destY = 64 - drawHeight;
    source.drawImage(image, (sourceFrame % columns) * frameSize + left, Math.floor(sourceFrame / columns) * frameSize + top,
      cropWidth, cropHeight, destX, destY, drawWidth, drawHeight);
    frameCache.set(cacheKey, sprite);
  }
  ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(Math.round(x), Math.round(y));
  if (rotation) ctx.rotate(rotation);
  ctx.drawImage(sprite, -size / 2, -size / 2, size, size);
  ctx.restore();
}
const auraSources = new Map(AURA_OPTIONS.filter(option => option.asset).map(option => [option.id, {
  path: `/arcade/${option.id === 'blizzard' ? 'hold' : 'power'}/assets/${option.asset}`,
  columns: option.columns, rows: option.rows, layout: option.layout ?? 'body',
}]));
function loadAuraImage(id) {
  const source = auraSources.get(id);
  if (!source) return null;
  const key = `aura:${id}`;
  if (imageCache.has(key)) return imageCache.get(key);
  if (typeof Image === 'undefined') return null;
  const image = new Image(); imageCache.set(key, image);
  image.onerror = () => imageCache.delete(key); image.src = source.path;
  return image;
}
/** Start decoding the sprite sheet(s) for an effect so the first frame is not waiting on the network. */
export function preloadAura(id) {
  loadAuraImage(id);
  if (typeof Image !== 'undefined' && !auraSources.has(id)) for (const key of ['fire', 'brightfire', 'lightning']) loadImage(key);
}
/** Warm every sheet the exercise's group can pick (all of them when the saved choice is Random). */
export function preloadAuraForMode(mode, choices = readEffectChoices()) {
  const group = effectGroupForExercise(mode, { camera: true });
  if (!group) return;
  const pick = choices[group];
  const ids = pick && pick !== 'random' ? [pick] : EFFECT_GROUPS.find(g => g.id === group)?.options.filter(id => id !== 'random') ?? [];
  for (const id of ids) preloadAura(id);
}
function drawAuraFrame(ctx, id, frame, x, y, size, alpha = 1, rotation = 0) {
  const source = auraSources.get(id), image = loadAuraImage(id);
  if (!source || !image?.complete || !image.naturalWidth || typeof document === 'undefined') return;
  const frameCount = source.columns * source.rows;
  const sourceFrame = ((frame % frameCount) + frameCount) % frameCount;
  const cacheKey = `aura:${id}:${sourceFrame}`;
  let sprite = frameCache.get(cacheKey);
  if (!sprite) {
    sprite = document.createElement('canvas'); sprite.width = sprite.height = 64;
    const sourceContext = sprite.getContext('2d');
    if (!sourceContext) return;
    sourceContext.imageSmoothingEnabled = false;
    const frameSize = 100;
    sourceContext.drawImage(image, (sourceFrame % source.columns) * frameSize,
      Math.floor(sourceFrame / source.columns) * frameSize, frameSize, frameSize, 0, 0, 64, 64);
    frameCache.set(cacheKey, sprite);
  }
  ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(Math.round(x), Math.round(y));
  if (rotation) ctx.rotate(rotation);
  size *= SPARSE_BOOST[id] ?? 1;
  ctx.drawImage(sprite, -size / 2, -size / 2, size, size); ctx.restore();
}
function drawPixelCrack(ctx, x, y, size, tier, time, seed) {
  const branches = Math.min(6, 2 + Math.floor(tier * 0.7));
  const arm = Math.max(4, Math.round(size * (0.55 + tier * 0.03)));
  ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.strokeStyle = '#ffc65a'; ctx.lineWidth = 1;
  ctx.globalAlpha = 0.68 + Math.min(0.27, tier * 0.045) + Math.sin(time * 8 + seed) * 0.025;
  for (let i = 0; i < branches; i++) {
    const side = i % 2 ? 1 : -1, start = (Math.floor(i / 2) - 1) * 2;
    ctx.beginPath(); ctx.moveTo(start, 0); ctx.lineTo(start + side * Math.round(arm * 0.22), Math.round(arm * 0.22));
    ctx.lineTo(start + side * Math.round(arm * 0.5), Math.round(arm * 0.38));
    if (tier >= 3) ctx.lineTo(start + side * Math.round(arm * 0.68), Math.round(arm * 0.22));
    ctx.stroke();
  }
  ctx.restore();
}
function pointPixel(state, index) {
  const points = state.points ?? [], p = points[index];
  return visible(points, index) ? { x: p.x * state.w, y: p.y * state.h, a: Number.isFinite(p.alpha) ? p.alpha : 1 } : null;
}
/** Floor contacts follow the drawn (filtered, predicted) landmark of the same index. */
function contactPixel(state, contact) { return (contact.index != null && pointPixel(state, contact.index)) || contact; }
// Classic fire: small flames pinned along the legs (each to its own bone slot), pushed out from the bone and
// flickering around that spot. Sizes are torso multiples so the flames match the body near or far.
const SLOT = { x: 0, y: 0, a: 0, dx: 0, dy: 1 };
function auraAccents(state, torso) {
  const count = Math.min(18, 3 + Math.floor(state.tier * 2.5)), out = [];
  for (let i = 0; i < count; i++) {
    if (!slotPx(state.points, LEG_SLOTS[i % LEG_SLOTS.length], state.w, state.h, SLOT)) continue;
    const angle = (i * 2.399963229728653) + state.time * (0.25 + state.intensity * 0.2), side = i % 2 ? 1 : -1;
    const push = torso * (0.07 + (i % 4) * (0.016 + state.tier * 0.004)), wobble = torso * 0.03;
    out.push({ index: 23 + (i % 6), x: SLOT.x - SLOT.dy * push * side + Math.cos(angle) * wobble, y: SLOT.y + SLOT.dx * push * side + Math.sin(angle) * wobble, angle, a: SLOT.a });
  }
  return out;
}
function lightningAccents(state, torso) {
  const count = Math.min(12, 2 + state.tier * 2), out = [];
  for (let i = 0; i < count; i++) {
    if (!slotPx(state.points, ARM_SLOTS[i % ARM_SLOTS.length], state.w, state.h, SLOT)) continue;
    const phase = state.time * 4 + i * 1.37, j = torso * (0.02 + state.tier * 0.007);
    out.push({ index: 11 + (i % 6), x: SLOT.x + Math.sin(phase) * j, y: SLOT.y + Math.cos(phase) * j * 0.6, frame: Math.floor(state.time * 9 + i) % 8, a: SLOT.a });
  }
  return out;
}
const SPRITE = { x: 0, y: 0, a: 0, dx: 0, dy: 1, size: 0, rotation: 0 };
/**
 * opts.points: drawn landmarks (filtered + predicted, with per-point `alpha`) instead of state.points;
 * opts.alpha: whole-layer fade (0..1). Sizes scale with the on-screen torso, not the canvas.
 */
export function renderPower(ctx, raw, opts = {}) {
  const level = raw?.level ?? raw?.intensity ?? 0;
  if (!ctx || !raw?.active || level <= 0) return;
  // Draw tier and intensity follow the shared growth level, not the XP ledger.
  const state = { ...raw, points: opts.points ?? raw.points, intensity: level, tier: Math.max(1, Math.ceil(level * 6)) };
  const canvas = ctx.canvas;
  if (!canvas || typeof document === 'undefined') return;
  const width = Math.max(1, Math.ceil(state.w)), height = Math.max(1, Math.ceil(state.h));
  if (!renderPower.layer || renderPower.layer.width !== width || renderPower.layer.height !== height) {
    renderPower.layer = document.createElement('canvas'); renderPower.layer.width = width; renderPower.layer.height = height;
    renderPower.layerContext = renderPower.layer.getContext('2d');
  }
  const layer = renderPower.layerContext;
  if (!layer) return;
  layer.clearRect(0, 0, width, height); layer.imageSmoothingEnabled = false; layer.globalCompositeOperation = 'source-over';
  const frame = Math.floor(state.time * 7), torso = bodyScale(state.points, state.w, state.h), T = AURA_BODY;
  const sheet = state.effect && state.effect !== 'classic' && auraSources.has(state.effect);
  if (sheet) {
    const source = auraSources.get(state.effect);
    if (state.route === 'floor') {
      for (const contact of state.contacts.slice(0, 4)) {
        const c = contactPixel(state, contact);
        drawAuraFrame(layer, state.effect, frame + (contact.index ?? 0) * 7, c.x, c.y, torso * T.FLOOR_SIZE * (0.6 + 0.4 * level), .9 * (c.a ?? 1), 0);
      }
    } else if (source.layout === 'circle') {
      const c = circlePlacement(state.points, state.w, state.h, level);
      drawAuraFrame(layer, state.effect, frame, c.x, c.y, c.size, .76, state.time * .08);
    } else {
      const full = state.effect === 'magicbubbles' ? 8 : source.layout === 'orbit' ? 5 : 4;
      const count = Math.max(1, Math.round(full * (0.3 + 0.7 * level)));
      for (let i = 0; i < count; i++) {
        if (!sheetSprite(state.points, i, source.layout, state.time, state.w, state.h, torso, level, SPRITE)) continue;
        drawAuraFrame(layer, state.effect, frame + i * 7, SPRITE.x, SPRITE.y, SPRITE.size, .78 * SPRITE.a, SPRITE.rotation);
      }
    }
  } else if (state.route === 'aura') {
    for (const a of auraAccents(state, torso)) drawSheetFrame(layer, 'brightfire', frame + a.index * 3, a.x, a.y,
      torso * (0.107 + Math.max(0, state.tier - 1) * 0.023), 0.95 * a.a, a.angle);
  } else if (state.route === 'lightning') {
    for (const a of lightningAccents(state, torso)) drawSheetFrame(layer, 'lightning', a.frame, a.x, a.y, torso * (0.1 + state.tier * 0.017), 0.95 * a.a, 0);
  } else if (state.route === 'floor') {
    for (const contact of state.contacts.slice(0, 4)) {
      const c = contactPixel(state, contact);
      drawPixelCrack(layer, c.x, c.y, torso * (0.073 + state.tier * 0.011), state.tier, state.time, contact.index);
      drawSheetFrame(layer, 'fire', frame + contact.index * 4, c.x, c.y, torso * (0.12 + state.tier * 0.017), 0.95 * (c.a ?? 1), 0);
    }
  }
  if (state.pulse > 0) {
    if (sheet && state.route === 'floor') {
      for (const contact of state.contacts.slice(0, 4)) {
        const c = contactPixel(state, contact);
        drawAuraFrame(layer, state.effect, frame + 23 + (contact.index ?? 0) * 7, c.x, c.y, torso * (0.33 + state.tier * 0.033), .9 * state.pulse, 0);
      }
    } else if (sheet) {
      const p = pulsePlacement(state.points, state.w, state.h);
      drawAuraFrame(layer, state.effect, frame + 23, p.x, p.y, p.size, .9 * state.pulse, 0);
    } else {
      const accents = state.route === 'lightning' ? lightningAccents(state, torso).slice(0, 4) : state.route === 'aura' ? auraAccents(state, torso).slice(0, 6)
        : state.contacts.slice(0, 4).map(contact => ({ ...contactPixel(state, contact), index: contact.index }));
      for (const point of accents) {
        if (state.route === 'floor' && point.index != null) drawSheetFrame(layer, 'fire', frame + 9, point.x, point.y, torso * (0.1 + state.tier * 0.01), 0.9 * state.pulse, 0);
        else if (state.route === 'lightning') drawSheetFrame(layer, 'lightning', frame % 8, point.x, point.y, torso * (0.1 + state.tier * 0.009), 0.9 * state.pulse, 0);
        else drawSheetFrame(layer, 'brightfire', frame + 17, point.x, point.y, torso * (0.107 + state.tier * 0.011), 0.9 * state.pulse, 0);
      }
    }
  }
  ctx.save(); ctx.imageSmoothingEnabled = false; ctx.globalCompositeOperation = 'source-over';
  // The wrapper applies the shared .3 effects-layer filter cap. This local alpha
  // keeps early rep accents readable while the composed ecology+power layer stays translucent.
  const fade = Math.max(0, Math.min(1, opts.alpha ?? state.alpha ?? 1));
  ctx.globalAlpha = (0.7 + 0.3 * level) * fade; ctx.drawImage(renderPower.layer, 0, 0, width, height); ctx.restore();
}
