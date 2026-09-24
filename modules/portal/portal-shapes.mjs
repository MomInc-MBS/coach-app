// portal-shapes.mjs
//
// Minimal shape recogniser for a phone board app.
// No external dependencies – pure ES‑module JavaScript.
//
// The recogniser works by resampling each template polyline into evenly spaced
// points and then comparing the trace against those points.  A candidate is
// accepted only if both the trace covers at least TOLERANCE.cover of the template and
// vice‑versa, using a distance tolerance of TOLERANCE.dist in board coordinates.
//
// The module exports:
//
//   SHAPE_IDS – array of the nine shape identifiers.
//   SHAPES    – mapping from id → array of polylines (each polyline is an
//                object with `points` and pre‑sampled `sampled` arrays).
//   recognizeShape(strokes) – returns one id string or null.
//
// The recogniser never throws; malformed input results in a null return.

// Match slack. Ian 2026-09-22: "the shapes should be more forgiving on all boards" — ~40 % looser than
// the original 0.09 / 0.85: dist = how far (board fractions) a trace point may sit from the template (and
// vice versa); 1 - cover = the share of the trace (overshoot) and of the template (closing gap, skipped
// corner) allowed to fall outside dist. maxLength: the trace's path length (wiggles under 0.05 dropped)
// may be at most this many times the template's — loose coverage alone would let a scribble that fills a
// thin shape (hdiamond) pass; a real trace, even one that goes round twice, stays well under it.
export const TOLERANCE = { dist: 0.125, cover: 0.79, maxLength: 3 };

/** Path length of polylines, ignoring moves shorter than `step` (finger jitter). */
const pathLength = (lines, step = 0.05) => {
  let len = 0;
  for (const pts of lines) {
    let last = null;
    for (const p of pts) {
      if (!last) { last = p; continue; }
      const d = dist(p, last);
      if (d >= step) { len += d; last = p; }
    }
  }
  return len;
};

// A single-stroke straight line is direction-aware: 'line-down'/'line-up' for the vertical template,
// 'line-lr'/'line-rl' for the horizontal one, named for the stroke's first vs last point (see recognizeShape).
const SHAPE_IDS = [
  'cross',
  'down',
  'hdiamond',
  'line-down',
  'line-lr',
  'line-rl',
  'line-up',
  'oval',
  'rect',
  'up',
  'vdiamond',
  'x',
];

// Shape frame: the sub-rect of a board's face (UV, v down) where the templates above actually sit —
// e.g. a painted door with a blank panel strip below the art, or a carved pattern inset from the
// edges. toFrame maps a face-UV point into the frame's own 0..1 space (a raw trace, before
// recognizeShape); fromFrame is the inverse (a template point, placed back onto the face for the
// cut, the portal-glass clip, and guide drawing). Default = the whole face, a no-op.
export const FULL_FRAME = { x0: 0, y0: 0, x1: 1, y1: 1 };
export const toFrame = (u, v, frame = FULL_FRAME) => [
  (u - frame.x0) / (frame.x1 - frame.x0),
  (v - frame.y0) / (frame.y1 - frame.y0),
];
export const fromFrame = (u, v, frame = FULL_FRAME) => [
  frame.x0 + u * (frame.x1 - frame.x0),
  frame.y0 + v * (frame.y1 - frame.y0),
];

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

/** Euclidean distance between two points. */
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

/**
 * Return the minimum distance from point `p` to any point in array `set`.
 * The set is expected to be small (< 500 points), so a linear scan is fine.
 */
const minDistToSet = (p, set) => {
  let best = Infinity;
  for (const q of set) {
    const d = dist(p, q);
    if (d < best) best = d;
  }
  return best;
};

/**
 * Sample a polyline into points spaced by `spacing` along its length.
 * The input is an array of [x,y] pairs.  The output includes the final
 * endpoint exactly.
 */
const samplePolyline = (pts, spacing = 0.01) => {
  if (!Array.isArray(pts) || pts.length < 2) return [];
  const res = [];
  // Compute segment lengths and total length
  const segLens = [];
  let totalLen = 0;
  for (let i = 0; i < pts.length - 1; ++i) {
    const d = dist(pts[i], pts[i + 1]);
    segLens.push(d);
    totalLen += d;
  }
  if (totalLen === 0) return [pts[0]];

  let curSeg = 0;
  let segStart = pts[0];
  let segDist = 0; // distance travelled along current segment
  let nextSample = 0;

  while (nextSample <= totalLen + 1e-9) {
    // Advance to the segment that contains `nextSample`
    while (
      curSeg < segLens.length &&
      nextSample > segDist + segLens[curSeg] + 1e-9
    ) {
      segDist += segLens[curSeg];
      ++curSeg;
      segStart = pts[curSeg];
    }
    if (curSeg >= segLens.length) break;

    const t =
      segLens[curSeg] === 0
        ? 0
        : (nextSample - segDist) / segLens[curSeg];
    const [x1, y1] = segStart;
    const [x2, y2] = pts[curSeg + 1];
    res.push([x1 + (x2 - x1) * t, y1 + (y2 - y1) * t]);

    nextSample += spacing;
  }

  // Ensure the final endpoint is present
  if (
    res.length === 0 ||
    dist(res[res.length - 1], pts[pts.length - 1]) > 1e-9
  ) {
    res.push(pts[pts.length - 1]);
  }
  return res;
};

/** Helper to create a polyline object with pre‑sampled points. */
const makePoly = (points) => ({
  points,
  sampled: samplePolyline(points),
});

// Rank already-accepted candidates by shape after allowing the small placement/
// size differences of the carved boards. Keep the original coverage gate and
// bound this fit so it cannot turn a small/off-centre gesture into a valid one.
const registeredTemplate = (template, trace) => {
  const bounds = (points) => points.reduce((b, [x, y]) => [
    Math.min(b[0], x), Math.min(b[1], y), Math.max(b[2], x), Math.max(b[3], y),
  ], [Infinity, Infinity, -Infinity, -Infinity]);
  const a = bounds(template), b = bounds(trace);
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const sx = clamp((b[2] - b[0]) / (a[2] - a[0]), 0.8, 1.15);
  const sy = clamp((b[3] - b[1]) / (a[3] - a[1]), 0.8, 1.15);
  const cx = (a[0] + a[2]) / 2, cy = (a[1] + a[3]) / 2;
  const dx = clamp((b[0] + b[2]) / 2 - cx, -0.08, 0.08);
  const dy = clamp((b[1] + b[3]) / 2 - cy, -0.08, 0.08);
  return template.map(([x, y]) => [cx + (x - cx) * sx + dx, cy + (y - cy) * sy + dy]);
};

// Corner detection, used only to break ties when a trace passes the distance/coverage
// check against more than one template (e.g. a rect traced a few % smaller than its
// template happens to land closer, on raw mean distance alone, to the oval template than
// to its own — see recognizeShape). A raw trace's per-point finger jitter (up to ~0.045 in
// the sloppy-trace tests) is *larger* than the ~0.01 spacing between consecutive points, so
// it must be smoothed — not just scanned at a coarser step — before direction can mean
// anything: a box filter (smoothCorner) first, over a window well wider than the jitter,
// then a scan that measures the turn at each point using a neighbour CORNER_REACH away
// (rather than the adjacent sample) so a single noisy sample can't fake a corner, while a
// real corner still reads as sharp regardless of exactly where the scan lands on it. Flag
// direction changes sharper than CORNER_ANGLE and merge adjacent flags into one corner,
// since a real corner stays sharp for a whole CORNER_REACH-ish stretch either side of it.
// (Constants tuned against tests/portal-shapes.test.mjs's own jittered traces, amount<=.045.)
const CORNER_SMOOTH_RADIUS = 10; // samples of the .01-spaced fine resample, each side (~.1 window)
const CORNER_SCAN_STEP = 0.03;
const CORNER_REACH = 0.15;
const CORNER_ANGLE = 40; // degrees: real corners here are 47-90°, background noise stays well under this

const smoothPolyline = (pts, radius) => {
  const n = pts.length;
  const out = [];
  for (let i = 0; i < n; ++i) {
    let sx = 0, sy = 0, c = 0;
    for (let k = -radius; k <= radius; ++k) {
      const j = i + k;
      if (j < 0 || j >= n) continue;
      sx += pts[j][0]; sy += pts[j][1]; ++c;
    }
    out.push([sx / c, sy / c]);
  }
  return out;
};

const countCorners = (points, angleDeg = CORNER_ANGLE) => {
  const fine = samplePolyline(points, 0.01);
  const smoothed = smoothPolyline(fine, CORNER_SMOOTH_RADIUS);
  const pts = samplePolyline(smoothed, CORNER_SCAN_STEP);
  const n = pts.length;
  const reach = Math.round(CORNER_REACH / CORNER_SCAN_STEP);
  if (n < reach * 2 + 3) return 0;
  const closed = dist(pts[0], pts[n - 1]) < CORNER_SCAN_STEP * 3;
  const idxs = [];
  for (let i = 0; i < n; ++i) {
    if (!closed && (i - reach < 0 || i + reach >= n)) continue; // no far-enough neighbour at open endpoints
    idxs.push(i);
  }
  const isCorner = (i) => {
    const prev = pts[(i - reach + n) % n];
    const cur = pts[i];
    const next = pts[(i + reach) % n];
    const v1 = [cur[0] - prev[0], cur[1] - prev[1]];
    const v2 = [next[0] - cur[0], next[1] - cur[1]];
    const m1 = Math.hypot(v1[0], v1[1]);
    const m2 = Math.hypot(v2[0], v2[1]);
    if (m1 < 1e-6 || m2 < 1e-6) return false;
    const cos = Math.max(-1, Math.min(1, (v1[0] * v2[0] + v1[1] * v2[1]) / (m1 * m2)));
    return (Math.acos(cos) * 180) / Math.PI >= angleDeg;
  };
  const flags = idxs.map(isCorner);
  let count = 0;
  for (let i = 0; i < flags.length; ++i) {
    const prevFlag = i === 0 ? (closed ? flags[flags.length - 1] : false) : flags[i - 1];
    if (flags[i] && !prevFlag) count++;
  }
  return count;
};

/**
 * Generate an ellipse as a polyline of `n` points.
 * The ellipse is centered at (cx,cy) with radii rx and ry.
 */
const makeEllipse = (cx, cy, rx, ry, n = 200) => {
  const pts = [];
  for (let i = 0; i < n; ++i) {
    const t = (2 * Math.PI * i) / n;
    pts.push([cx + rx * Math.cos(t), cy + ry * Math.sin(t)]);
  }
  return makePoly(pts);
};

// ---------------------------------------------------------------------------
// Shape templates
// ---------------------------------------------------------------------------

const SHAPES = {
  rect: [
    makePoly([
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
      [0, 0], // closed
    ]),
  ],

  oval: [makeEllipse(0.5, 0.5, 0.5, 0.5)],

  up: [
    makePoly([
      [0.5, 0],
      [1, 0.71],
      [0, 0.71],
      [0.5, 0], // closed
    ]),
  ],

  down: [
    makePoly([
      [0, 0.29],
      [1, 0.29],
      [0.5, 1],
      [0, 0.29], // closed
    ]),
  ],

  vdiamond: [
    makePoly([
      [0.5, 0],
      [1, 0.5],
      [0.5, 1],
      [0, 0.5],
      [0.5, 0], // closed
    ]),
  ],

  hdiamond: [
    makePoly([
      [0, 0.5],
      [0.5, 0.29],
      [1, 0.5],
      [0.5, 0.71],
      [0, 0.5], // closed
    ]),
  ],

  x: [
    makePoly([[0, 0], [1, 1]]),
    makePoly([[1, 0], [0, 1]]),
  ],

  cross: [
    makePoly([[0.5, 0], [0.5, 1]]), // vertical
    makePoly([[0, 0.5], [1, 0.5]]), // horizontal
  ],

  line: [
    makePoly([[0.5, 0], [0.5, 1]]), // vertical
    makePoly([[0, 0.5], [1, 0.5]]), // horizontal
  ],
};

// Expected corner count per template, for the tie-break in recognizeShape: polygons carry
// their real vertex count (closed `points` list repeats the first point, so length - 1
// unique corners); oval and line are smooth/straight and never register a corner.
const CORNER_COUNTS = Object.fromEntries(
  ['rect', 'up', 'down', 'vdiamond', 'hdiamond'].map((id) => [id, SHAPES[id][0].points.length - 1])
);
CORNER_COUNTS.oval = 0;
CORNER_COUNTS.line = 0;

// ---------------------------------------------------------------------------
// Recogniser
// ---------------------------------------------------------------------------

/**
 * Recognise a shape from an array of strokes.
 *
 * @param {Array<Array<[number, number]>>} strokes
 * @returns {string|null}
 */
export const recognizeShape = (strokes) => {
  // Basic validation – never throw on malformed input.
  if (!Array.isArray(strokes)) return null;
  const tracePoints = [];
  for (const stroke of strokes) {
    if (!Array.isArray(stroke)) return null;
    for (const pt of stroke) {
      if (
        !Array.isArray(pt) ||
        pt.length !== 2 ||
        typeof pt[0] !== 'number' ||
        typeof pt[1] !== 'number' ||
        !Number.isFinite(pt[0]) ||
        !Number.isFinite(pt[1])
      )
        return null;
      tracePoints.push([pt[0], pt[1]]);
    }
  }
  if (tracePoints.length === 0) return null;
  // Fast swipes arrive as a few far-apart points; fill in each stroke so coverage is measured along the path.
  const dense = strokes.flatMap((stroke) => stroke.length > 1 ? samplePolyline(stroke) : stroke);
  tracePoints.length = 0;
  tracePoints.push(...dense);

  const strokeCount = strokes.length;
  let candidates = [];
  if (strokeCount === 1)
    candidates = [
      'rect',
      'up',
      'down',
      'vdiamond',
      'hdiamond',
      'oval',
      'line',
    ];
  else if (strokeCount === 2) candidates = ['x', 'cross'];
  else return null;

  const tolerance = TOLERANCE.dist;
  const traceLength = pathLength(strokes);
  const tooLong = (polys) => traceLength > TOLERANCE.maxLength * pathLength(polys.map((p) => p.points), 0);
  // Corner count of the trace, computed once and used as the primary tie-break below: more
  // than one template can pass the distance/coverage check at once (a board's carved
  // pattern can sit a few % off the ideal template — see countCorners above), and on raw
  // mean distance alone a smooth template (oval) can numerically edge out a cornered
  // template that's the visually obvious match, or vice versa.
  const traceCorners = strokeCount === 1 ? countCorners(tracePoints) : 0;
  let bestId = null;
  let bestCornerDiff = Infinity; // primary: |expected corners - trace corners|
  let bestScore = Infinity; // secondary: mean distance, both ways

  const consider = (id, templatePts) => {
    const traceWithin =
      tracePoints.filter((p) => minDistToSet(p, templatePts) <= tolerance).length /
      tracePoints.length;
    const templateWithin =
      templatePts.filter((tp) => minDistToSet(tp, tracePoints) <= tolerance).length /
      templatePts.length;
    if (traceWithin < TOLERANCE.cover || templateWithin < TOLERANCE.cover) return;

    let sum = 0;
    for (const p of tracePoints) sum += minDistToSet(p, templatePts);
    let sum2 = 0;
    for (const tp of templatePts) sum2 += minDistToSet(tp, tracePoints);
    const score = (sum / tracePoints.length + sum2 / templatePts.length) / 2;
    const cornerDiff = strokeCount === 1 ? Math.abs((CORNER_COUNTS[id] ?? 0) - traceCorners) : 0;

    if (cornerDiff < bestCornerDiff || (cornerDiff === bestCornerDiff && score < bestScore)) {
      bestCornerDiff = cornerDiff;
      bestScore = score;
      bestId = id;
    }
  };

  for (const id of candidates) {
    if (id === 'line') {
      // Evaluate vertical and horizontal orientations separately.
      if (tooLong(SHAPES['line'].slice(0, 1))) continue;
      for (let i=0;i<SHAPES.line.length;i++) {const raw=strokes[0],first=raw[0],last=raw[raw.length-1];const name=i===0?(last[1]>=first[1]?'line-down':'line-up'):(last[0]>=first[0]?'line-lr':'line-rl');consider(name,SHAPES.line[i].sampled);}
    } else {
      if (tooLong(SHAPES[id])) continue;
      consider(id, SHAPES[id].flatMap((poly) => poly.sampled));
    }
  }

  return bestId;
};

/**
 * #21 "almost": the closest candidate even when it fails TOLERANCE.cover, for a near-miss hint.
 * Reuses recognizeShape's own coverage math (same candidates, same tolerance, same tooLong guard)
 * without the pass/fail gate, so it stays in lockstep with what recognizeShape accepts.
 *
 * @param {Array<Array<[number, number]>>} strokes
 * @returns {{id:string,score:number}|null} score is min(traceWithin,templateWithin) in [0,1); recognizeShape
 *  would accept the same candidate once that reaches TOLERANCE.cover. Never throws; null on malformed input,
 *  no strokes, or a trace too long/short-stroked to score against anything.
 */
export const nearestShape = (strokes) => {
  if (!Array.isArray(strokes)) return null;
  const tracePoints = [];
  for (const stroke of strokes) {
    if (!Array.isArray(stroke)) return null;
    for (const pt of stroke) {
      if (
        !Array.isArray(pt) ||
        pt.length !== 2 ||
        typeof pt[0] !== 'number' ||
        typeof pt[1] !== 'number' ||
        !Number.isFinite(pt[0]) ||
        !Number.isFinite(pt[1])
      )
        return null;
      tracePoints.push(pt);
    }
  }
  if (tracePoints.length === 0) return null;
  const dense = strokes.flatMap((stroke) => stroke.length > 1 ? samplePolyline(stroke) : stroke);
  const points = dense.length ? dense : tracePoints;

  const strokeCount = strokes.length;
  let candidates = [];
  if (strokeCount === 1)
    candidates = ['rect', 'up', 'down', 'vdiamond', 'hdiamond', 'oval', 'line'];
  else if (strokeCount === 2) candidates = ['x', 'cross'];
  else return null;

  const tolerance = TOLERANCE.dist;
  const traceLength = pathLength(strokes);
  const tooLong = (polys) => traceLength > TOLERANCE.maxLength * pathLength(polys.map((p) => p.points), 0);
  let best = null;
  const consider = (id, templatePts) => {
    const traceWithin =
      points.filter((p) => minDistToSet(p, templatePts) <= tolerance).length / points.length;
    const templateWithin =
      templatePts.filter((tp) => minDistToSet(tp, points) <= tolerance).length / templatePts.length;
    const score = Math.min(traceWithin, templateWithin);
    if (!best || score > best.score) best = { id, score };
  };

  for (const id of candidates) {
    if (id === 'line') {
      if (tooLong(SHAPES.line.slice(0, 1))) continue;
      const raw = strokes[0], first = raw[0], last = raw[raw.length - 1];
      SHAPES.line.forEach((poly, i) => {
        const name = i === 0
          ? (last[1] >= first[1] ? 'line-down' : 'line-up')
          : (last[0] >= first[0] ? 'line-lr' : 'line-rl');
        consider(name, poly.sampled);
      });
    } else {
      if (tooLong(SHAPES[id])) continue;
      consider(id, SHAPES[id].flatMap((poly) => poly.sampled));
    }
  }
  return best;
};

export { SHAPE_IDS, SHAPES };
