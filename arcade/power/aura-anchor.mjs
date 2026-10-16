// Pure geometry that pins auras to the skeleton: torso-relative sizes, fixed bone slots per sprite (no hopping),
// body-centred circles and pulses, bone capsule radii. Points are overlay fractions (0..1) with optional `alpha`
// (0..1 fade from the One Euro bank); pixel space is w x h. No DOM, no allocation in the per-frame helpers that
// take an `out` object.

// Tuning knobs (real phones need tuning). Radii and sizes are fractions of the on-screen torso length
// (shoulder to hip), so the aura is the same thickness near or far from the camera.
export const AURA_BODY = Object.freeze({
  // One Euro presets for overlay fractions: torso heavier, limbs lighter, hands lightest (they move fastest).
  FILTER: Object.freeze({
    // beta is per (overlay fraction / s): a fast squat moves the hips ~0.5/s, a punch the wrist 2-3/s. High beta and
    // dCutoff 2 open the filter quickly on fast moves (little lag) while minCutoff keeps a still body calm.
    // Swept offline (.r1017/scripts/tune.mjs, 45 ms lag, 30 Hz): vs raw lagged landmarks these cut the squat error
    // ~22% and the side-step error ~37% with less jitter at rest; hands stay nearly raw (a 0.2 s punch is too short
    // for any filter + prediction to beat the raw point).
    torso: Object.freeze({ minCutoff: 1, beta: 60, dCutoff: 3 }),
    limb: Object.freeze({ minCutoff: 1.2, beta: 90, dCutoff: 3.5 }),
    hand: Object.freeze({ minCutoff: 0.8, beta: 150, dCutoff: 5 }),
  }),
  PREDICT_CLAMP: 0.04,       // max forward lead per landmark, overlay fractions
  PREDICT_GAIN: 0.9,         // share of (velocity x lag) to lead by (one-euro.mjs caps the lag at 66 ms)
  FADE_MS: 250,              // whole-aura fade in/out instead of a hard pop
  // Halo outer radius per bone class at level 1 (the glow fades out to this distance from the bone).
  RADIUS: Object.freeze({ core: 0.62, head: 0.46, upper: 0.3, lower: 0.26, hip: 0.36 }),
  // The body itself (roughly the person's width) is cut out of the glow so it sits around, not over, them.
  BODY: Object.freeze({ core: 0.3, head: 0.21, upper: 0.09, lower: 0.075, hip: 0.13 }),
  LEVEL_BASE: 0.55, LEVEL_GAIN: 0.45, // halo radius scale = BASE + GAIN * level
  SPEED_WIDEN: 0.5, SPEED_REF: 1.5,   // widen by up to +50% at SPEED_REF torso lengths/s (hides sub-frame error)
  CUT: 0.85, CUT_ALPHA: 0.6,             // inner body punch-out: BODY radius x CUT at this strength (a rim stays)
  HALO_DOWNSCALE: 4,                  // halo drawn at 1/4 of the glow layer, upscaled = smooth falloff
  IMPACT_GAIN: 0.5, IMPACT_MS: 300,   // punch impact: glow gain bump and flare life
  PARTICLES: 96,                      // flame tongue pool (Q2+); Q1 has none
  EMIT_BASE: 26, EMIT_LEVEL: 90,      // tongues per second at level 0 / extra at level 1
  WISP_DECAY: 0.92, WISP_RISE: 2,     // silhouette feedback wisps (Q3): fade per frame, glow px risen per frame
  GLOW_WIDTH: 160,                    // glow layer logical width (CSS upscaled with smoothing = free blur)
  // Sprite placement as torso multiples (values chosen to match the old screen-fraction look at ~2.5 m).
  SHEET_SIZE: 0.95, ORBIT_SIZE: 0.85, CIRCLE_SIZE: 2.1, PULSE_SIZE: 1.5, FLOOR_SIZE: 0.6,
  BODY_ORBIT: Object.freeze([0.22, 0.14]), WIDE_ORBIT: Object.freeze([0.42, 0.3]),
  FALLBACK_TORSO: 0.19,               // torso as a fraction of height when no torso is visible
});

export const VISIBLE_ALPHA = 0.02;
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
export function pointAlpha(p) {
  if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) return 0;
  if (Number.isFinite(p.alpha)) return p.alpha;
  return (p.visibility ?? 1) >= 0.5 ? 1 : 0;
}
const seen = p => pointAlpha(p) > VISIBLE_ALPHA;

/** On-screen torso length in pixels (aspect-correct): the longest of left side, right side and shoulder line. */
export function torsoPx(points, w, h) {
  if (!points) return null;
  let best = 0;
  for (const [a, b] of [[11, 23], [12, 24], [11, 12]]) {
    const p = points[a], q = points[b];
    if (seen(p) && seen(q)) best = Math.max(best, Math.hypot((p.x - q.x) * w, (p.y - q.y) * h));
  }
  return best > 0 ? Math.max(best, 0.05 * h) : null;
}

function mid(points, a, b, w, h) {
  const p = points?.[a], q = points?.[b];
  if (seen(p) && seen(q)) return { x: (p.x + q.x) / 2 * w, y: (p.y + q.y) / 2 * h };
  if (seen(p)) return { x: p.x * w, y: p.y * h };
  if (seen(q)) return { x: q.x * w, y: q.y * h };
  return null;
}
/** Hip midpoint, chest (shoulder) midpoint and their centre in pixels; falls back to the screen centre. */
export function bodyCentre(points, w, h) {
  const hip = mid(points, 23, 24, w, h), chest = mid(points, 11, 12, w, h);
  const centre = hip && chest ? { x: (hip.x + chest.x) / 2, y: (hip.y + chest.y) / 2 } : hip || chest || { x: w * 0.5, y: h * 0.48 };
  return { hip: hip || centre, chest: chest || centre, centre, found: !!(hip || chest) };
}

/** Size scale: torso pixels, or the old screen fraction when no torso is visible. */
export function bodyScale(points, w, h, T = AURA_BODY) { return torsoPx(points, w, h) ?? T.FALLBACK_TORSO * h; }

// Bones: [a, b, radius class]. -1 = chest midpoint, -2 = hip midpoint (virtual joints).
export const BONES = Object.freeze([
  [-1, -2, 'core'], [11, 12, 'upper'], [23, 24, 'hip'], [11, 23, 'upper'], [12, 24, 'upper'],
  [0, 0, 'head'],
  [11, 13, 'upper'], [13, 15, 'lower'], [12, 14, 'upper'], [14, 16, 'lower'],
  [23, 25, 'upper'], [25, 27, 'lower'], [24, 26, 'upper'], [26, 28, 'lower'],
]);

/** Pixel position and fade of a (possibly virtual) joint into `out`; returns false if it is not tracked. */
export function jointPx(points, index, w, h, out) {
  if (index >= 0) {
    const p = points?.[index];
    if (!seen(p)) return false;
    out.x = p.x * w; out.y = p.y * h; out.a = clamp(pointAlpha(p), 0, 1); return true;
  }
  const [i, j] = index === -1 ? [11, 12] : [23, 24], p = points?.[i], q = points?.[j];
  if (!seen(p) || !seen(q)) return false;
  out.x = (p.x + q.x) / 2 * w; out.y = (p.y + q.y) / 2 * h; out.a = Math.min(pointAlpha(p), pointAlpha(q)); return true;
}

/** Capsule radius in pixels for a radius class at a growth level and limb speed (torso lengths/s). */
export function boneRadius(kind, torso, level = 0, speed = 0, T = AURA_BODY) {
  const widen = 1 + T.SPEED_WIDEN * clamp((speed || 0) / T.SPEED_REF, 0, 1);
  return torso * (T.RADIUS[kind] ?? T.RADIUS.lower) * (T.LEVEL_BASE + T.LEVEL_GAIN * clamp(level, 0, 1)) * widen;
}

// Fixed bone slots for sheet sprites, in reveal order (more sprites appear as the level rises). Sprite i always
// lives on SLOTS[i % n]: it never moves to another joint, so nothing teleports.
export const SHEET_SLOTS = Object.freeze([
  [-1, -2, 0.45], [11, 13, 0.5], [12, 14, 0.5], [23, 25, 0.5], [24, 26, 0.5], [13, 15, 0.6], [14, 16, 0.6], [25, 27, 0.55],
  [26, 28, 0.55], [11, 12, 0.5],
]);
export const LEG_SLOTS = Object.freeze([
  [23, 25, 0.35], [24, 26, 0.35], [25, 27, 0.4], [26, 28, 0.4], [23, 25, 0.8], [24, 26, 0.8], [25, 27, 0.85], [26, 28, 0.85],
  [-1, -2, 0.85], [23, 24, 0.5],
]);
export const ARM_SLOTS = Object.freeze([
  [13, 15, 0.85], [14, 16, 0.85], [11, 13, 0.6], [12, 14, 0.6], [13, 15, 0.4], [14, 16, 0.4], [11, 13, 0.2], [12, 14, 0.2],
]);

const A = { x: 0, y: 0, a: 0 }, B = { x: 0, y: 0, a: 0 };
/** Point at parameter t along a slot's bone (pixels) into `out`, with fade `a` and bone direction (dx, dy unit). */
export function slotPx(points, slot, w, h, out) {
  if (!jointPx(points, slot[0], w, h, A) || !jointPx(points, slot[1], w, h, B)) return false;
  const t = slot[2], dx = B.x - A.x, dy = B.y - A.y, len = Math.hypot(dx, dy) || 1;
  out.x = A.x + dx * t; out.y = A.y + dy * t; out.a = Math.min(A.a, B.a); out.dx = dx / len; out.dy = dy / len;
  return true;
}

/**
 * Sheet sprite i for a layout ('body' | 'orbit'): pinned to its own slot for its whole life, small orbit around it
 * scaled by torso. Writes {x, y, a, size, rotation} into out; false when its bone is not tracked (sprite hidden).
 */
export function sheetSprite(points, i, layout, time, w, h, torso, level, out, T = AURA_BODY) {
  const slot = SHEET_SLOTS[i % SHEET_SLOTS.length];
  if (!slotPx(points, slot, w, h, out)) return false;
  const orbit = layout === 'orbit', [rx, ry] = orbit ? T.WIDE_ORBIT : T.BODY_ORBIT;
  const phase = time * (orbit ? 0.8 : 0.35) + i * 2.399963229728653;
  out.x += Math.cos(phase) * rx * torso; out.y += Math.sin(phase) * ry * torso;
  out.size = torso * (orbit ? T.ORBIT_SIZE : T.SHEET_SIZE) * (0.6 + 0.4 * clamp(level, 0, 1));
  out.rotation = orbit ? phase : Math.sin(phase) * 0.25;
  return true;
}

/** Circle-layout effects and rep pulses: centred on the body (hip / torso centre) and sized by the torso. */
export function circlePlacement(points, w, h, level, T = AURA_BODY) {
  const torso = bodyScale(points, w, h, T), c = bodyCentre(points, w, h);
  return { x: c.hip.x, y: c.hip.y - torso * 0.1, size: torso * T.CIRCLE_SIZE * (0.45 + 0.55 * clamp(level, 0, 1)) };
}
export function pulsePlacement(points, w, h, T = AURA_BODY) {
  const torso = bodyScale(points, w, h, T), c = bodyCentre(points, w, h);
  return { x: c.centre.x, y: c.centre.y, size: torso * T.PULSE_SIZE };
}

/** Clamp a predicted landmark lead to `max` (overlay fractions) so a velocity spike never throws the aura off. */
export function clampLead(base, predicted, max = AURA_BODY.PREDICT_CLAMP) {
  const dx = predicted.x - base.x, dy = predicted.y - base.y, d = Math.hypot(dx, dy);
  if (!(d > max)) return predicted;
  const k = max / d; return { x: base.x + dx * k, y: base.y + dy * k };
}

/** Linear fade toward `target` (0 or 1) over fadeMs. */
export function fadeToward(alpha, target, dtMs, fadeMs = AURA_BODY.FADE_MS) {
  const step = fadeMs > 0 ? Math.max(0, dtMs) / fadeMs : 1;
  return target > alpha ? Math.min(target, alpha + step) : Math.max(target, alpha - step);
}

// Colour per effect: outer halo, mid, hot core (RGB 0..255).
const FIRE = [[255, 84, 18], [255, 168, 40], [255, 242, 196]];
export const AURA_PALETTES = Object.freeze({
  classic: FIRE, aura: FIRE, firespin: FIRE, sunburn: [[255, 120, 16], [255, 204, 64], [255, 250, 205]],
  floor: [[255, 104, 28], [255, 188, 76], [255, 246, 212]], lightning: [[52, 112, 255], [118, 200, 255], [236, 250, 255]],
  bluefire: [[28, 88, 255], [82, 182, 255], [222, 246, 255]], magicbubbles: [[196, 76, 255], [255, 140, 238], [255, 232, 255]],
  protectioncircle: [[255, 196, 56], [255, 234, 138], [255, 255, 232]], vortex: [[116, 58, 255], [178, 120, 255], [240, 222, 255]],
  flamelash: [[255, 56, 28], [255, 138, 40], [255, 230, 172]], weaponhit: [[255, 214, 86], [255, 248, 168], [255, 255, 240]],
  casting: [[56, 196, 255], [140, 240, 255], [230, 255, 255]], magicspell: [[255, 76, 196], [255, 160, 230], [255, 236, 250]],
  magic8: [[90, 255, 196], [178, 255, 230], [240, 255, 250]], magichit: [[176, 86, 255], [220, 170, 255], [250, 240, 255]],
  nebula: [[146, 58, 255], [255, 108, 220], [255, 230, 250]], phantom: [[76, 255, 176], [168, 255, 220], [236, 255, 246]],
  felspell: [[86, 255, 56], [178, 255, 108], [240, 255, 220]], midnight: [[68, 58, 210], [140, 120, 255], [230, 226, 255]],
  loading: [[76, 216, 255], [168, 240, 255], [240, 255, 255]], blizzard: [[116, 196, 255], [198, 240, 255], [246, 255, 255]],
});
export function auraPalette(effect, route) {
  return AURA_PALETTES[effect] ?? AURA_PALETTES[route] ?? FIRE;
}
