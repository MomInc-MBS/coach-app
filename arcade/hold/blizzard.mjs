// Blizzard hold model and Canvas2D renderer. Hold eligibility is delegated to
// createEcosystem so this style shares the exact stillness, movement and stale gates.
import { createEcosystem, STILL_SECONDS } from './ecosystem.mjs';
import { supportContacts } from '../power/power.mjs';

export const MAX_ICE_EDGES = 20;
export const MAX_SNOW = 48;
const CONFIDENCE = 0.5;
const GRAPH = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
  [11, 23], [12, 24], [23, 24],
  [23, 25], [25, 27], [27, 29], [29, 31],
  [24, 26], [26, 28], [28, 30], [30, 32],
];

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const pointAt = (points, i) => Array.isArray(points) ? points[i] : points?.[i] ?? points?.[String(i)];

function visiblePoints(points, w, h) {
  const out = new Map();
  for (let i = 0; i <= 32; i++) {
    const p = pointAt(points, i);
    const visibility = Number(p?.visibility ?? p?.score ?? p?.confidence);
    if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y) || !Number.isFinite(visibility) || visibility < CONFIDENCE || p.x < 0 || p.x > 1 || p.y < 0 || p.y > 1) continue;
    out.set(i, { x: Math.round(p.x * w), y: Math.round(p.y * h) });
  }
  return out;
}

function seeded(seed = 1) {
  let s = seed | 0;
  return () => { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

function bodyBounds(points, w, h) {
  const joints = [...points.entries()].filter(([i]) => [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32].includes(i)).map(([, p]) => p);
  if (!joints.length) return { x: w / 2, y: h / 2, rx: w * 0.12, ry: h * 0.2 };
  const xs = joints.map(p => p.x), ys = joints.map(p => p.y);
  const left = Math.min(...xs), right = Math.max(...xs), top = Math.min(...ys), bottom = Math.max(...ys);
  return { x: (left + right) / 2, y: (top + bottom) / 2, rx: clamp((right - left) * 0.34, 12, w * 0.14), ry: clamp((bottom - top) * 0.34, 18, h * 0.14) };
}

function graphEdges(points, contacts, elapsed) {
  const support = new Set(contacts.filter(c => Number.isInteger(c.index) && points.has(c.index)).map(c => c.index));
  if (!support.size) return [];
  const adj = new Map();
  const valid = GRAPH.filter(([a, b]) => points.has(a) && points.has(b));
  for (const [a, b] of valid) {
    if (!adj.has(a)) adj.set(a, []); if (!adj.has(b)) adj.set(b, []);
    adj.get(a).push(b); adj.get(b).push(a);
  }
  const distance = new Map([...support].map(i => [i, 0])), queue = [...support];
  for (let q = 0; q < queue.length; q++) {
    const node = queue[q];
    for (const next of adj.get(node) || []) if (!distance.has(next)) { distance.set(next, distance.get(node) + 1); queue.push(next); }
  }
  const out = [];
  for (const [a, b] of valid) {
    if (!distance.has(a) || !distance.has(b)) continue;
    const rank = Math.min(distance.get(a), distance.get(b));
    const delay = rank * 0.88;
    const growth = clamp((elapsed - delay + 0.05) / 0.72, 0, 1);
    if (growth <= 0) continue;
    const from = distance.get(a) <= distance.get(b) ? a : b;
    const to = from === a ? b : a;
    const p1 = points.get(from), p2 = points.get(to);
    out.push({ from, to, x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, growth, alpha: 0.72 + growth * 0.18 });
  }
  return out.slice(0, MAX_ICE_EDGES);
}

function readReducedMotion() {
  try { return !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches; } catch { return false; }
}

export function createBlizzard({ w = 360, h = 640, seed = 1, stillSeconds = STILL_SECONDS } = {}) {
  const stillness = createEcosystem({ w, h, seed, spawnEntities: false, stillSeconds });
  const reducedMotion = readReducedMotion();
  const rand = seeded(seed ^ 0xB11A2D);
  const count = reducedMotion ? 16 : 32;
  const snow = Array.from({ length: Math.min(MAX_SNOW, count) }, () => ({ x: 0, y: 0, size: 1 + Math.floor(rand() * 3), alpha: 0 }));
  const paths = snow.map(() => ({ phase: rand() * Math.PI * 2, rx: 0.35 + rand() * 0.75, ry: 0.35 + rand() * 0.8, speed: (2.8 + rand() * 2.8) * (reducedMotion ? 0.28 : 1), direction: rand() < 0.5 ? -1 : 1, alpha: 0.3 + rand() * 0.42 }));
  const state = { w, h, phase: 'waiting', stillSeconds: 0, still: stillSeconds, iceEdges: [], snow };
  let currentPoints = new Map(), currentContacts = [], origin = { x: w / 2, y: h / 2, rx: w * 0.12, ry: h * 0.2 };
  let elapsed = 0, fadeSpeed = reducedMotion ? 0.65 : 1.35;

  function placeSnow(alphaScale = 1) {
    for (let i = 0; i < snow.length; i++) {
      const path = paths[i], angle = path.phase + elapsed * path.speed * path.direction;
      snow[i].x = Math.round(origin.x + Math.cos(angle) * origin.rx * path.rx);
      snow[i].y = Math.round(origin.y + Math.sin(angle * 1.17) * origin.ry * path.ry);
      snow[i].alpha = Math.max(0, Math.min(0.72, alphaScale * path.alpha));
    }
  }

  function fade() {
    if (state.phase !== 'growing') return;
    state.phase = 'retreating';
    // Preserve coordinates during the departure fade.
  }

  function clearVisuals() {
    state.iceEdges.length = 0;
    for (const flake of snow) flake.alpha = 0;
    state.phase = 'waiting';
    state.stillSeconds = stillness.state.stillSeconds;
  }

  function pose({ points, now, validHold, mode } = {}) {
    const wasGrowing = state.phase === 'growing';
    stillness.pose({ points, now, validHold });
    state.stillSeconds = stillness.state.stillSeconds;
    currentPoints = visiblePoints(points, w, h);
    if (validHold && currentPoints.size) origin = bodyBounds(currentPoints, w, h);
    const ready = stillness.state.phase === 'growing';

    if (ready) {
      if (!wasGrowing) { state.iceEdges.length = 0; state.phase = 'growing'; }
      currentContacts = supportContacts(mode, points, w, h);
      const age = Math.max(0, state.stillSeconds - stillSeconds);
      state.iceEdges = graphEdges(currentPoints, currentContacts, age);
      placeSnow(Math.min(1, 0.38 + age * (reducedMotion ? 0.1 : 0.18)));
    } else {
      currentContacts = [];
      if (wasGrowing) fade();
      if (!validHold && state.phase === 'waiting') clearVisuals();
    }
    return state;
  }

  function step(dt = 0) {
    const raw = Number.isFinite(dt) && dt > 0 ? dt : 0;
    stillness.step(raw);
    elapsed += Math.min(0.05, raw) * (reducedMotion ? 0.35 : 1);
    state.stillSeconds = stillness.state.stillSeconds;
    if (state.phase === 'growing' && stillness.state.phase !== 'growing') fade();
    if (state.phase === 'growing') {
      placeSnow(Math.min(1, 0.38 + Math.max(0, state.stillSeconds - stillSeconds) * (reducedMotion ? 0.1 : 0.18)));
    } else if (state.phase === 'retreating') {
      for (const edge of state.iceEdges) edge.alpha = Math.max(0, edge.alpha - fadeSpeed * Math.min(0.05, raw));
      for (const flake of snow) flake.alpha = Math.max(0, flake.alpha - fadeSpeed * Math.min(0.05, raw));
      if (!state.iceEdges.some(e => e.alpha > 0.01) && !snow.some(f => f.alpha > 0.01)) clearVisuals();
    }
    return state;
  }

  function reset() {
    stillness.reset(); state.phase = 'waiting'; state.stillSeconds = 0; state.iceEdges.length = 0;
    for (const flake of snow) { flake.x = 0; flake.y = 0; flake.alpha = 0; }
    currentPoints.clear(); currentContacts = []; elapsed = 0; origin = { x: w / 2, y: h / 2, rx: w * 0.12, ry: h * 0.2 };
    return state;
  }

  return { state, pose, step, reset };
}

const ASSET = '/arcade/hold/assets/19_freezing_spritesheet.png';
let freezeImage = null, spriteCache = new Map(), loadStarted = false;
function preload() {
  if (loadStarted || typeof Image === 'undefined') return;
  loadStarted = true;
  const image = new Image();
  image.onload = () => {
    if (typeof document === 'undefined') return;
    for (let frame = 0; frame < 10; frame++) {
      // FreeFX frames are 100px cells with a small, consistent transparent border.
      // Inspect alpha in the browser so the original pixels remain the source of truth.
      const probe = document.createElement('canvas'); probe.width = probe.height = 100;
      const pctx = probe.getContext('2d', { willReadFrequently: true }); if (!pctx) continue;
      pctx.drawImage(image, frame * 100, 0, 100, 100, 0, 0, 100, 100);
      let pixels;
      try { pixels = pctx.getImageData(0, 0, 100, 100).data; } catch { continue; }
      let left = 100, top = 100, right = -1, bottom = -1;
      for (let y = 0; y < 100; y++) for (let x = 0; x < 100; x++) {
        if (pixels[(y * 100 + x) * 4 + 3] === 0) continue;
        if (x < left) left = x; if (x > right) right = x;
        if (y < top) top = y; if (y > bottom) bottom = y;
      }
      if (right < left || bottom < top) continue;
      const sw = right - left + 1, sh = bottom - top + 1;
      const scale = 52 / Math.max(sw, sh), dw = Math.max(1, Math.round(sw * scale)), dh = Math.max(1, Math.round(sh * scale));
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64;
      const g = canvas.getContext('2d'); if (!g) continue;
      g.imageSmoothingEnabled = false;
      g.drawImage(image, frame * 100 + left, top, sw, sh, Math.floor((64 - dw) / 2), Math.floor((64 - dh) / 2), dw, dh);
      spriteCache.set(frame, canvas);
    }
    freezeImage = image;
  };
  image.onerror = () => { freezeImage = null; };
  image.src = ASSET;
}

function drawSnow(ctx, state, start, end) {
  for (let i = start; i < end; i++) {
    const flake = state.snow[i]; if (!flake || flake.alpha <= 0.01) continue;
    ctx.globalAlpha = flake.alpha;
    ctx.fillStyle = i % 2 ? '#b8f6ff' : '#f3fdff';
    ctx.fillRect(Math.round(flake.x), Math.round(flake.y), flake.size, flake.size);
  }
}

function drawIceEdge(ctx, edge) {
  const dx = edge.x2 - edge.x1, dy = edge.y2 - edge.y1, length = Math.hypot(dx, dy), growth = clamp(edge.growth, 0, 1);
  const visibleLength = length * growth, steps = Math.max(1, Math.ceil(visibleLength / 3));
  ctx.globalAlpha = clamp(edge.alpha, 0, 1);
  for (let i = 0; i <= steps; i++) {
    const t = length <= 0 ? 0 : Math.min(growth, i * 3 / length);
    const x = Math.round(edge.x1 + dx * t), y = Math.round(edge.y1 + dy * t), size = i % 3 === 0 ? 3 : 2;
    ctx.fillStyle = i % 2 ? '#6ddfff' : '#d8faff';
    ctx.fillRect(x - 1, y - 1, size, size);
  }
}

function drawContactAccent(ctx, state, edge) {
  if (!freezeImage || edge.growth <= 0) return;
  const frame = Math.floor(Math.max(0, state.stillSeconds - (state.still ?? STILL_SECONDS)) * 2) % 10;
  const sprite = spriteCache.get(frame);
  if (!sprite) return;
  ctx.globalAlpha = Math.min(0.55, edge.growth * 0.5, clamp(edge.alpha, 0, 1) * 0.6);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sprite, Math.round(edge.x1 - 7), Math.round(edge.y1 - 7), 14, 14);
}

export function renderBlizzard(ctx, state) {
  if (!ctx || !state) return;
  preload();
  ctx.imageSmoothingEnabled = false;
  ctx.globalCompositeOperation = 'source-over';
  const snow = Array.isArray(state.snow) ? state.snow : [];
  drawSnow(ctx, state, 0, Math.floor(snow.length / 2));
  const accented = new Set();
  for (const edge of Array.isArray(state.iceEdges) ? state.iceEdges : []) {
    if (!Number.isFinite(edge.x1) || !Number.isFinite(edge.y1) || !Number.isFinite(edge.x2) || !Number.isFinite(edge.y2)) continue;
    if (!accented.has(edge.from)) { drawContactAccent(ctx, state, edge); accented.add(edge.from); }
    drawIceEdge(ctx, edge);
  }
  drawSnow(ctx, state, Math.floor(snow.length / 2), snow.length);
  ctx.globalAlpha = 1;
}
