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
  let bestId = null;
  let bestScore = Infinity; // lower mean distance is better

  for (const id of candidates) {
    if (id === 'line') {
      // Evaluate vertical (orientations[0]) and horizontal (orientations[1]) templates separately.
      if (tooLong(SHAPES['line'].slice(0, 1))) continue;
      const orientations = SHAPES['line'].map((poly) => poly.sampled);
      // Direction comes from the raw (un-filled-in) stroke's endpoints, not the template: normalized
      // coords, y grows downward. A single-stroke candidate means strokes.length === 1 here.
      const raw = strokes[0];
      const first = raw[0], last = raw[raw.length - 1];
      for (let i = 0; i < orientations.length; i++) {
        const templatePts = orientations[i];
        const traceWithin =
          tracePoints.filter((p) => minDistToSet(p, templatePts) <= tolerance)
            .length / tracePoints.length;
        const templateWithin =
          templatePts.filter(
            (tp) => minDistToSet(tp, tracePoints) <= tolerance
          ).length / templatePts.length;

        if (traceWithin >= TOLERANCE.cover && templateWithin >= TOLERANCE.cover) {
          let sum = 0;
          for (const p of tracePoints)
            sum += minDistToSet(p, templatePts);
          const mean = sum / tracePoints.length;
          if (mean < bestScore) {
            bestScore = mean;
            bestId = i === 0
              ? (last[1] >= first[1] ? 'line-down' : 'line-up')
              : (last[0] >= first[0] ? 'line-lr' : 'line-rl');
          }
        }
      }
    } else {
      if (tooLong(SHAPES[id])) continue;
      const templatePts = SHAPES[id].flatMap((poly) => poly.sampled);

      const traceWithin =
        tracePoints.filter((p) => minDistToSet(p, templatePts) <= tolerance)
          .length / tracePoints.length;
      const templateWithin =
        templatePts.filter(
          (tp) => minDistToSet(tp, tracePoints) <= tolerance
        ).length / templatePts.length;

      if (traceWithin >= TOLERANCE.cover && templateWithin >= TOLERANCE.cover) {
        const fitted = registeredTemplate(templatePts, tracePoints);
        let sum = 0;
        for (const p of tracePoints) sum += minDistToSet(p, fitted);
        const mean = sum / tracePoints.length;
        if (mean < bestScore) {
          bestScore = mean;
          bestId = id;
        }
      }
    }
  }

  return bestId;
};

export { SHAPE_IDS, SHAPES };
