// Cracked-glass fracture core, vendored unchanged from https://github.com/kossik/cracked-glass v0.7.0 (commit 6cb13c6932eba3e532c52115efdddcef2b79cbf7), MIT licence — see LICENSES/cracked-glass.txt.
// src/core/math.ts
var TAU = Math.PI * 2;
function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}
function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
function lerp(a, b, t) {
  return a + (b - a) * t;
}
function degToRad(d) {
  return d * Math.PI / 180;
}
function smoothstep(t) {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
}
function easeOutCubic(t) {
  const x = clamp01(t);
  return 1 - (1 - x) * (1 - x) * (1 - x);
}
function easeOutQuart(t) {
  const x = clamp01(t);
  const y = 1 - x;
  return 1 - y * y * y * y;
}
function easeOutExpo(t) {
  const x = clamp01(t);
  return x >= 1 ? 1 : 1 - Math.pow(2, -10 * x);
}
function fmt(n, precision = 2) {
  if (!Number.isFinite(n)) return "0";
  let s = n.toFixed(precision);
  if (s.indexOf(".") >= 0) {
    s = s.replace(/0+$/, "");
    if (s.endsWith(".")) s = s.slice(0, -1);
  }
  if (s === "-0") s = "0";
  return s;
}

// src/core/geometry.ts
function signedArea(poly) {
  let a = 0;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i];
    const q = poly[(i + 1) % poly.length];
    a += p[0] * q[1] - q[0] * p[1];
  }
  return a / 2;
}
function ensurePositiveWinding(poly) {
  return signedArea(poly) >= 0 ? poly : poly.slice().reverse();
}
function pointInPolygon(p, poly) {
  let inside = false;
  const n = poly.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (a[1] > p[1] !== b[1] > p[1]) {
      const x = (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0];
      if (p[0] < x) inside = !inside;
    }
  }
  return inside;
}
function polygonCentroid(poly) {
  let a = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i];
    const q = poly[(i + 1) % poly.length];
    const cross = p[0] * q[1] - q[0] * p[1];
    a += cross;
    cx += (p[0] + q[0]) * cross;
    cy += (p[1] + q[1]) * cross;
  }
  a /= 2;
  if (Math.abs(a) < 1e-9) {
    let sx = 0;
    let sy = 0;
    for (const p of poly) {
      sx += p[0];
      sy += p[1];
    }
    return [sx / poly.length, sy / poly.length];
  }
  return [cx / (6 * a), cy / (6 * a)];
}
function dedupePolygon(poly, eps = 1e-7) {
  const out = [];
  for (const p of poly) {
    const last = out[out.length - 1];
    if (!last || Math.abs(last[0] - p[0]) > eps || Math.abs(last[1] - p[1]) > eps) {
      out.push(p);
    }
  }
  if (out.length > 1) {
    const first = out[0];
    const last = out[out.length - 1];
    if (Math.abs(first[0] - last[0]) <= eps && Math.abs(first[1] - last[1]) <= eps) {
      out.pop();
    }
  }
  return out;
}
function clipPolygonToRect(poly, w, h) {
  const edges = [
    { inside: (p) => p[0] >= 0, cut: (a, b) => cutX(a, b, 0) },
    { inside: (p) => p[0] <= w, cut: (a, b) => cutX(a, b, w) },
    { inside: (p) => p[1] >= 0, cut: (a, b) => cutY(a, b, 0) },
    { inside: (p) => p[1] <= h, cut: (a, b) => cutY(a, b, h) }
  ];
  let cur = poly;
  for (const e of edges) {
    if (cur.length === 0) return [];
    const next = [];
    for (let i = 0; i < cur.length; i++) {
      const a = cur[i];
      const b = cur[(i + 1) % cur.length];
      const ain = e.inside(a);
      const bin = e.inside(b);
      if (ain) {
        next.push(a);
        if (!bin) next.push(e.cut(a, b));
      } else if (bin) {
        next.push(e.cut(a, b));
      }
    }
    cur = next;
  }
  return dedupePolygon(cur);
}
function cutX(a, b, x) {
  const t = (x - a[0]) / (b[0] - a[0]);
  return [x, a[1] + (b[1] - a[1]) * t];
}
function cutY(a, b, y) {
  const t = (y - a[1]) / (b[1] - a[1]);
  return [a[0] + (b[0] - a[0]) * t, y];
}
function offsetPolygon(poly, dist, miterLimit = 3) {
  const n = poly.length;
  if (n < 3 || dist === 0) return poly.slice();
  const out = [];
  for (let i = 0; i < n; i++) {
    const prev = poly[(i - 1 + n) % n];
    const v = poly[i];
    const next = poly[(i + 1) % n];
    const n1 = edgeOutwardNormal(prev, v);
    const n2 = edgeOutwardNormal(v, next);
    let mx = n1[0] + n2[0];
    let my = n1[1] + n2[1];
    const ml = Math.hypot(mx, my);
    if (ml < 1e-9) {
      mx = n1[0];
      my = n1[1];
    } else {
      mx /= ml;
      my /= ml;
    }
    const dot = mx * n1[0] + my * n1[1];
    let scale = dot > 1e-6 ? 1 / dot : miterLimit;
    if (scale > miterLimit) scale = miterLimit;
    out.push([v[0] + mx * dist * scale, v[1] + my * dist * scale]);
  }
  return out;
}
function edgeOutwardNormal(a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const l = Math.hypot(dx, dy);
  if (l < 1e-9) return [0, 0];
  return [dy / l, -dx / l];
}
function segmentIntersection(a1, a2, b1, b2) {
  const dax = a2[0] - a1[0];
  const day = a2[1] - a1[1];
  const dbx = b2[0] - b1[0];
  const dby = b2[1] - b1[1];
  const den = dax * dby - day * dbx;
  if (Math.abs(den) < 1e-12) return null;
  const ex = b1[0] - a1[0];
  const ey = b1[1] - a1[1];
  const ta = (ex * dby - ey * dbx) / den;
  const tb = (ex * day - ey * dax) / den;
  if (ta < -1e-9 || ta > 1 + 1e-9 || tb < -1e-9 || tb > 1 + 1e-9) return null;
  return { p: [a1[0] + dax * ta, a1[1] + day * ta], ta, tb };
}
function cumulativeLengths(pts) {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) {
    cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  }
  return cum;
}
function pointAtLength(pts, cum, len) {
  const total = cum[cum.length - 1];
  if (len <= 0) return pts[0];
  if (len >= total) return pts[pts.length - 1];
  let lo = 0;
  let hi = cum.length - 1;
  while (lo + 1 < hi) {
    const mid = lo + hi >> 1;
    if (cum[mid] <= len) lo = mid;
    else hi = mid;
  }
  const segLen = cum[hi] - cum[lo];
  const t = segLen > 1e-12 ? (len - cum[lo]) / segLen : 0;
  return [
    pts[lo][0] + (pts[hi][0] - pts[lo][0]) * t,
    pts[lo][1] + (pts[hi][1] - pts[lo][1]) * t
  ];
}
function tangentAtLength(pts, cum, len) {
  let lo = 0;
  let hi = cum.length - 1;
  if (len <= 0) hi = 1;
  else if (len >= cum[cum.length - 1]) lo = cum.length - 2;
  else {
    while (lo + 1 < hi) {
      const mid = lo + hi >> 1;
      if (cum[mid] <= len) lo = mid;
      else hi = mid;
    }
  }
  const dx = pts[hi][0] - pts[lo][0];
  const dy = pts[hi][1] - pts[lo][1];
  const l = Math.hypot(dx, dy) || 1;
  return [dx / l, dy / l];
}
function toCssPolygon(poly, precision = 2) {
  const parts = [];
  for (let i = 0; i + 1 < poly.length; i += 2) {
    parts.push(`${fmt(poly[i], precision)}px ${fmt(poly[i + 1], precision)}px`);
  }
  return `polygon(${parts.join(", ")})`;
}
function toSvgPathD(poly, closed, precision = 2) {
  if (poly.length < 2) return "";
  let d = `M${fmt(poly[0], precision)} ${fmt(poly[1], precision)}`;
  for (let i = 2; i + 1 < poly.length; i += 2) {
    d += `L${fmt(poly[i], precision)} ${fmt(poly[i + 1], precision)}`;
  }
  return closed ? d + "Z" : d;
}
function insetPolygonTowardCentroid(flat, centroid, inset) {
  const out = [];
  for (let i = 0; i + 1 < flat.length; i += 2) {
    const dx = centroid[0] - flat[i];
    const dy = centroid[1] - flat[i + 1];
    const d = Math.hypot(dx, dy) || 1;
    const m = Math.min(inset, d * 0.45) / d;
    out.push(flat[i] + dx * m, flat[i + 1] + dy * m);
  }
  return out;
}
function reverseFlat(flat) {
  const out = [];
  for (let i = flat.length - 2; i >= 0; i -= 2) {
    out.push(flat[i], flat[i + 1]);
  }
  return out;
}
function ringPathD(outerFlat, innerFlat) {
  return toSvgPathD(outerFlat, true) + toSvgPathD(reverseFlat(innerFlat), true);
}
function toSvgPoints(poly, precision = 2) {
  const parts = [];
  for (let i = 0; i + 1 < poly.length; i += 2) {
    parts.push(`${fmt(poly[i], precision)},${fmt(poly[i + 1], precision)}`);
  }
  return parts.join(" ");
}
function flattenPts(pts) {
  const out = [];
  for (const p of pts) {
    out.push(p[0], p[1]);
  }
  return out;
}
function unflattenPts(flat) {
  const out = [];
  for (let i = 0; i + 1 < flat.length; i += 2) {
    out.push([flat[i], flat[i + 1]]);
  }
  return out;
}

// src/core/prng.ts
function hashString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function hashCombine(...vals) {
  let h = 2654435769;
  for (let i = 0; i < vals.length; i++) {
    let x = vals[i] >>> 0;
    x = Math.imul(x ^ x >>> 16, 2246822507);
    x = Math.imul(x ^ x >>> 13, 3266489909);
    x ^= x >>> 16;
    h = (Math.imul(h, 16777619) ^ x) >>> 0;
  }
  return h >>> 0;
}
function hashTo01(h) {
  return (h >>> 0) / 4294967296;
}
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = a + 1831565813 | 0;
    let t = a;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function rngFor(seed, subsystem, ...idx) {
  return mulberry32(hashCombine(seed >>> 0, hashString(subsystem), ...idx));
}
function rand01(seed, subsystem, ...idx) {
  return hashTo01(hashCombine(seed >>> 0, hashString(subsystem), ...idx));
}

// src/fracture/build.ts
function resolveFractureOptions(opts) {
  if (!Number.isFinite(opts.width) || opts.width <= 0) throw new Error("cracked-glass: width must be > 0");
  if (!Number.isFinite(opts.height) || opts.height <= 0) throw new Error("cracked-glass: height must be > 0");
  if (!Number.isFinite(opts.seed)) throw new Error("cracked-glass: seed must be a finite number");
  const seed = opts.seed >>> 0;
  const micro = opts.micro;
  const defaultMicroCount = opts.mode === "radial" ? 110 : opts.mode === "collapse" ? 90 : opts.mode === "hero" ? 0 : 36;
  const angleA = opts.collapse?.angleA ?? 14;
  let angleB = opts.collapse?.angleB ?? 76;
  const sep = Math.abs((angleB - angleA + 90) % 180 - 90);
  if (sep < 35) angleB = angleA + (angleB >= angleA ? 35 : -35);
  return {
    mode: opts.mode,
    width: opts.width,
    height: opts.height,
    seed,
    instanceId: opts.instanceId ?? `cg${seed.toString(36)}`,
    edgeDetail: clamp(Math.round(opts.edgeDetail ?? 2), 0, 3),
    jaggedness: clamp(opts.jaggedness ?? 0.5, 0, 1),
    seamOutsetPx: opts.seamOutsetPx ?? 0.4,
    deviation: clamp(opts.deviation ?? 0.35, 0, 1),
    microCount: micro === false ? 0 : Math.max(0, Math.round(micro?.count ?? defaultMicroCount)),
    microSizeRange: micro === false ? [0, 0] : micro?.sizeRange ?? [1.5, 5],
    stubs: opts.stubs === false ? false : {
      maxPerCrack: Math.max(0, Math.round(opts.stubs?.maxPerCrack ?? 4)),
      atJunctions: opts.stubs?.atJunctions ?? true
    },
    bands: {
      count: opts.bands?.count ?? [3, 5],
      waviness: clamp(opts.bands?.waviness ?? 0.5, 0, 1),
      diagonalChance: clamp(opts.bands?.diagonalChance ?? 0.6, 0, 1),
      tilt: clamp(opts.bands?.tilt ?? 0.6, 0, 1),
      splitters: clamp(Math.round(opts.bands?.splitters ?? 3), 1, 3),
      diagonal: clamp(opts.bands?.diagonal ?? 0.7, 0, 1)
    },
    impact: opts.impact ? [clamp(opts.impact.x, 0, opts.width), clamp(opts.impact.y, 0, opts.height)] : [opts.width / 2, opts.height / 2],
    impactHole: clamp(opts.impactHole ?? 1, 0.3, 3),
    rays: {
      // lower default ray count keeps the cell count (and thus per-shard DOM cost) sane;
      // the lab lets you crank it higher when you want a denser web.
      count: Math.max(3, Math.round(opts.rays?.count ?? 6)),
      angleJitter: clamp(opts.rays?.angleJitter ?? 0.6, 0, 1),
      waviness: clamp(opts.rays?.waviness ?? 0.5, 0, 1),
      doubling: opts.rays?.doubling ?? true,
      doublingStartRing: Math.max(1, Math.round(opts.rays?.doublingStartRing ?? 3))
    },
    rings: {
      count: Math.max(1, Math.round(opts.rings?.count ?? 4)),
      spacing: opts.rings?.spacing ?? "geometric",
      jitter: clamp(opts.rings?.jitter ?? 0.5, 0, 1),
      partial: clamp(opts.rings?.partial ?? 0.88, 0, 1),
      asymmetry: clamp(opts.rings?.asymmetry ?? 0.45, 0, 1)
    },
    collapse: {
      angleA,
      angleB,
      countA: opts.collapse?.countA ?? [3, 5],
      countB: opts.collapse?.countB ?? [4, 7],
      waviness: clamp(opts.collapse?.waviness ?? 0.5, 0, 1),
      merge: clamp(opts.collapse?.merge ?? 0.3, 0, 1)
    },
    hero: {
      count: clamp(Math.round(opts.hero?.count ?? 1), 1, 3),
      sizeFrac: clamp(opts.hero?.sizeFrac ?? 0.34, 0.05, 0.48),
      spread: clamp(opts.hero?.spread ?? 0.5, 0, 1),
      overlap: clamp(opts.hero?.overlap ?? 0, 0, 1)
    },
    web: {
      rays: Math.max(3, Math.round(opts.web?.rays ?? 9)),
      rings: Math.max(1, Math.round(opts.web?.rings ?? 4)),
      irregularity: clamp(opts.web?.irregularity ?? 0.6, 0, 1),
      dir: opts.web?.dir ?? 90,
      distance: clamp(opts.web?.distance ?? 1.2, 0.2, 6)
    },
    corners: opts.corners === false ? false : { relief: clamp(opts.corners?.relief ?? 0.55, 0, 1) }
  };
}
function makeCrack(seed, id, kind, pts, birth, growDuration, withTicks = true) {
  const cum = cumulativeLengths(pts);
  const totalLen = cum[cum.length - 1];
  const ticks = [];
  const rng = rngFor(seed, "ticks", hashString(id));
  const spacing = 11;
  for (let s = withTicks ? spacing * (0.5 + rng()) : totalLen; s < totalLen - 4; s += spacing * (0.7 + rng() * 0.8)) {
    const p = pointAt(pts, cum, s);
    const q = pointAt(pts, cum, Math.min(totalLen, s + 1.5));
    let dx = q[0] - p[0];
    let dy = q[1] - p[1];
    const l = Math.hypot(dx, dy) || 1;
    dx /= l;
    dy /= l;
    const side = rng() < 0.5 ? 1 : -1;
    const len = 1.6 + rng() * 3.2;
    const a = (55 + rng() * 25) * (Math.PI / 180) * side;
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    const tx = dx * cos - dy * sin;
    const ty = dx * sin + dy * cos;
    ticks.push(s, p[0], p[1], p[0] + tx * len, p[1] + ty * len);
  }
  return {
    id,
    kind,
    points: flattenPts(pts),
    cumLen: cum,
    totalLen,
    birth,
    growDuration,
    ticks
  };
}
function pointAt(pts, cum, len) {
  const total = cum[cum.length - 1];
  if (len <= 0) return pts[0];
  if (len >= total) return pts[pts.length - 1];
  let lo = 0;
  let hi = cum.length - 1;
  while (lo + 1 < hi) {
    const mid = lo + hi >> 1;
    if (cum[mid] <= len) lo = mid;
    else hi = mid;
  }
  const segLen = cum[hi] - cum[lo];
  const t = segLen > 1e-12 ? (len - cum[lo]) / segLen : 0;
  return [pts[lo][0] + (pts[hi][0] - pts[lo][0]) * t, pts[lo][1] + (pts[hi][1] - pts[lo][1]) * t];
}
function makeShard(seed, index, poly, ringIndex, z, seamOutsetPx) {
  const cleaned = dedupePolygon(poly);
  if (cleaned.length < 3) return null;
  const wound = ensurePositiveWinding(cleaned);
  const area = signedArea(wound);
  if (area < 2) return null;
  const outset = seamOutsetPx > 0 ? offsetPolygon(wound, seamOutsetPx) : wound;
  return {
    id: `s${index}`,
    polygon: flattenPts(wound),
    outsetPolygon: flattenPts(outset),
    centroid: polygonCentroid(wound),
    area,
    ringIndex,
    z,
    hash: hashCombine(seed, hashString("shard"), index)
  };
}
function shuffledRanks(seed, key, n) {
  const rng = rngFor(seed, key);
  const idx = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = idx[i];
    idx[i] = idx[j];
    idx[j] = tmp;
  }
  const ranks = new Array(n);
  for (let rank = 0; rank < n; rank++) ranks[idx[rank]] = rank;
  return ranks;
}
function stitchLoop(segments) {
  const out = [];
  for (const seg of segments) {
    const start = out.length === 0 ? 0 : 1;
    for (let i = start; i < seg.length; i++) out.push(seg[i]);
  }
  return dedupePolygon(out);
}
function reversePts(pts) {
  return pts.slice().reverse();
}

// src/core/noise.ts
function valueNoise1D(seed, x) {
  const xi = Math.floor(x);
  const xf = x - xi;
  const r0 = hashTo01(hashCombine(seed, xi | 0));
  const r1 = hashTo01(hashCombine(seed, xi + 1 | 0));
  return lerp(r0, r1, smoothstep(xf)) * 2 - 1;
}
function fbm1D(seed, x, octaves = 3, lacunarity = 2, gain = 0.5) {
  let amp = 1;
  let freq = 1;
  let sum = 0;
  let norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += amp * valueNoise1D(hashCombine(seed, o), x * freq);
    norm += amp;
    amp *= gain;
    freq *= lacunarity;
  }
  return norm > 0 ? sum / norm : 0;
}
function subdivideMidpoint(pts, depth, roughness, seed, maxOffset = Infinity) {
  let cur = pts;
  for (let level = 0; level < depth; level++) {
    const next = [cur[0]];
    const levelAmp = roughness * 0.5 * Math.pow(0.55, level);
    for (let i = 0; i < cur.length - 1; i++) {
      const a = cur[i];
      const b = cur[i + 1];
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const segLen = Math.hypot(dx, dy);
      if (segLen > 1e-9) {
        const nx = -dy / segLen;
        const ny = dx / segLen;
        const r = hashTo01(hashCombine(seed, level, i)) * 2 - 1;
        let off = r * levelAmp * segLen;
        if (off > maxOffset) off = maxOffset;
        if (off < -maxOffset) off = -maxOffset;
        next.push([(a[0] + b[0]) / 2 + nx * off, (a[1] + b[1]) / 2 + ny * off]);
      }
      next.push(b);
    }
    cur = next;
  }
  return cur;
}

// src/fracture/lines.ts
function makeExcursions(seed, group, lineKey, deviation, ampMax) {
  if (deviation <= 0) return [];
  const out = [];
  for (let idx = 0; idx < 2; idx++) {
    const p = idx === 0 ? deviation * 0.75 : deviation * 0.35;
    if (rand01(seed, `${group}:dev`, lineKey, idx) >= p) continue;
    const r1 = rand01(seed, `${group}:devA`, lineKey, idx);
    const r2 = rand01(seed, `${group}:devB`, lineKey, idx);
    const r3 = rand01(seed, `${group}:devC`, lineKey, idx);
    const r4 = rand01(seed, `${group}:devD`, lineKey, idx);
    const r5 = rand01(seed, `${group}:devE`, lineKey, idx);
    out.push({
      c: 0.15 + 0.7 * r1,
      half: 0.08 + 0.1 * r2,
      amp: (0.25 + 0.45 * r3) * ampMax * (r4 < 0.5 ? -1 : 1),
      kink: r5 < 0.5
    });
  }
  return out;
}
function excursionOffset(evts, u) {
  let v = 0;
  for (const e of evts) {
    const d = Math.abs(u - e.c);
    if (d >= e.half) continue;
    const x = 1 - d / e.half;
    v += e.amp * (e.kink ? x : 0.5 * (1 - Math.cos(Math.PI * x)));
  }
  return v;
}
function baseLine(o) {
  const waveSeed = hashCombine(o.seed, hashString(`${o.group}:wave`), o.key);
  const evts = makeExcursions(o.seed, o.group, o.key, o.deviation, o.devAmpMax);
  const u = [];
  const v = [];
  for (let i = 0; i <= o.segments; i++) {
    const f = i / o.segments;
    u.push(o.u0 + (o.u1 - o.u0) * f);
    v.push(o.offset + fbm1D(waveSeed, i * 0.85, 3) * o.waveAmp + excursionOffset(evts, f));
  }
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 1; i < v.length; i++) {
      const du = u[i] - u[i - 1];
      v[i] = clamp(v[i], v[i - 1] - o.slopeMax * du, v[i - 1] + o.slopeMax * du);
    }
    for (let i = 0; i < v.length; i++) {
      v[i] = clamp(v[i], o.offset - o.corridorHalf, o.offset + o.corridorHalf);
    }
  }
  return { u, v };
}

// src/fracture/title.ts
function generateTitleFracture(o) {
  const { width: w, height: h, seed } = o;
  const rngCount = rngFor(seed, "title:count");
  const bandCount = Array.isArray(o.bands.count) ? Math.round(
    clamp(
      o.bands.count[0] + rngCount() * (o.bands.count[1] - o.bands.count[0]),
      Math.min(o.bands.count[0], o.bands.count[1]),
      Math.max(o.bands.count[0], o.bands.count[1])
    )
  ) : Math.max(2, Math.round(o.bands.count));
  const gap = h / bandCount;
  const tiltOn = o.bands.tilt > 0;
  const offs = new Array(bandCount + 1).fill(0);
  const tilts = new Array(bandCount + 1).fill(0);
  for (let k = 1; k < bandCount; k++) {
    const rngB = rngFor(seed, "title:boundary", k);
    offs[k] = (rngB() - 0.5) * gap * 0.36;
    if (tiltOn) {
      const sign = k % 2 === 0 ? 1 : -1;
      tilts[k] = sign * (0.3 + 0.7 * rand01(seed, "title:tilt", k)) * 0.225 * o.bands.tilt * (gap / (w / 2));
    }
  }
  const yLine = (k, x) => {
    if (k <= 0) return 0;
    if (k >= bandCount) return h;
    return gap * k + offs[k] + tilts[k] * (x - w / 2);
  };
  const boundaries = [];
  const segments = Math.max(4, Math.round(w / 160));
  for (let k = 0; k <= bandCount; k++) {
    if (k === 0 || k === bandCount) {
      boundaries.push([
        [0, k === 0 ? 0 : h],
        [w, k === 0 ? 0 : h]
      ]);
      continue;
    }
    const waveAmp = o.bands.waviness * gap * 0.22;
    const waveSeed = hashCombine(seed, hashString("title:wave"), k);
    const excursions = o.deviation > 0 ? makeExcursions(seed, "title", k, o.deviation, gap) : [];
    const base = [];
    for (let i = 0; i <= segments; i++) {
      const x = w * i / segments;
      let y = yLine(k, x) + fbm1D(waveSeed, i * 0.85, 3) * waveAmp;
      if (excursions.length > 0) y += excursionOffset(excursions, i / segments);
      base.push([x, y]);
    }
    let jagged = subdivideMidpoint(
      base,
      o.edgeDetail,
      o.jaggedness * 0.5,
      hashCombine(seed, hashString("title:jag"), k),
      gap * 0.17
    );
    if (tiltOn) {
      jagged = jagged.map(([x, y]) => {
        const lo = (yLine(k - 1, x) + yLine(k, x)) / 2 + 0.06 * gap;
        const hi = (yLine(k, x) + yLine(k + 1, x)) / 2 - 0.06 * gap;
        return [x, y < lo ? lo : y > hi ? hi : y];
      });
    } else if (o.deviation > 0) {
      const lo = gap * k - gap * 0.45;
      const hi = gap * k + gap * 0.45;
      jagged = jagged.map(([x, y]) => [x, y < lo ? lo : y > hi ? hi : y]);
    }
    boundaries.push(jagged);
  }
  const raw = [];
  const cracks = [];
  const junctions = [];
  let crackIdx = 0;
  const order = boundaryBirthOrder(bandCount);
  for (let k = 1; k < bandCount; k++) {
    const rngC = rngFor(seed, "title:crack", k);
    const pts = k % 2 === 0 ? reversePts(boundaries[k]) : boundaries[k].slice();
    const rank = order.indexOf(k);
    const grow = 0.38 + rngC() * 0.14;
    const birth = Math.min(0.04 + rank / Math.max(1, bandCount - 2) * 0.38 + rngC() * 0.06, 0.97 - grow);
    cracks.push(makeCrack(seed, `c${crackIdx++}`, "band", pts, birth, grow));
  }
  for (let band = 0; band < bandCount; band++) {
    const top = boundaries[band];
    const bot = boundaries[band + 1];
    if (o.bands.splitters === 1) {
      const rngS = rngFor(seed, "title:split", band);
      const wantSplit = rngS() < o.bands.diagonalChance && top.length > 6 && bot.length > 6;
      if (!wantSplit) {
        raw.push({ poly: [...top, ...reversePts(bot)], band });
        continue;
      }
      const targetX = (0.3 + rngS() * 0.4) * w;
      const iT = nearestIndexByX(top, targetX, 2);
      const diag2 = o.bands.diagonal;
      const lean = (rngS() * 2 - 1) * (diag2 > 0 ? diag2 * 0.6 * gap : (0.35 + 0.9 * o.deviation) * gap);
      const iB = nearestIndexByX(bot, top[iT][0] + lean, 2);
      const a = top[iT];
      const b = bot[iB];
      const splitBase = [a, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], b];
      let splitter = subdivideMidpoint(
        splitBase,
        o.edgeDetail,
        o.jaggedness * 0.45,
        hashCombine(seed, hashString("title:splitjag"), band),
        gap * 0.16
      );
      if (diag2 > 0) splitter = clampSplitterToBand(splitter, top, bot, gap);
      const left = [...top.slice(0, iT + 1), ...splitter.slice(1), ...reversePts(bot.slice(0, iB))];
      const right = [
        ...top.slice(iT),
        ...reversePts(bot.slice(iB)),
        ...reversePts(splitter.slice(1, -1))
      ];
      raw.push({ poly: left, band });
      raw.push({ poly: right, band });
      const rngC = rngFor(seed, "title:splitcrack", band);
      const sGrow = 0.22 + rngC() * 0.1;
      cracks.push(
        makeCrack(seed, `c${crackIdx++}`, "split", splitter, Math.min(0.5 + rngC() * 0.18, 0.97 - sGrow), sGrow)
      );
      const ci1 = cracks.length - 1;
      junctions.push({ crackIndex: ci1, s: 0 }, { crackIndex: ci1, s: cracks[ci1].totalLen });
      continue;
    }
    if (top.length <= 6 || bot.length <= 6) {
      raw.push({ poly: [...top, ...reversePts(bot)], band });
      continue;
    }
    const m = o.bands.splitters;
    const q = o.bands.diagonalChance;
    const probs = [q, 0.45 * q, 0.2 * q].slice(0, m);
    const slotLo = 0.15 * w;
    const slotW = 0.7 * w / m;
    const diag = o.bands.diagonal;
    const bandSign = rand01(seed, "title:diagSign", band) < 0.5 ? -1 : 1;
    const cands = [];
    for (let j = 0; j < m; j++) {
      if (rand01(seed, "title:msplitG", band, j) >= probs[j]) continue;
      const r1 = rand01(seed, "title:msplitX", band, j);
      const r2 = rand01(seed, "title:msplitL", band, j);
      const targetX = slotLo + slotW * j + (0.25 + 0.5 * r1) * slotW;
      const iT = nearestIndexByX(top, targetX, 2);
      const lean = diag > 0 ? bandSign * Math.min((0.35 + 0.65 * r2) * diag, 0.6) * gap : (r2 * 2 - 1) * Math.min((0.35 + 0.9 * o.deviation) * gap, 0.2 * slotW);
      const iB = nearestIndexByX(bot, top[iT][0] + lean, 2);
      const a = top[iT];
      const b = bot[iB];
      const splitBase = [a, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], b];
      let pts = subdivideMidpoint(
        splitBase,
        o.edgeDetail,
        o.jaggedness * 0.45,
        hashCombine(seed, hashString("title:msplitjag"), band, j),
        Math.min(gap * 0.16, 0.1 * slotW)
      );
      if (diag > 0) pts = clampSplitterToBand(pts, top, bot, gap);
      cands.push({ iT, iB, pts });
    }
    cands.sort((a, b) => a.iT - b.iT);
    const acc = [];
    for (const c of cands) {
      const prev = acc[acc.length - 1];
      if (c.iT < 2 || c.iT > top.length - 3 || c.iB < 2 || c.iB > bot.length - 3) continue;
      if (prev && (c.iT - prev.iT < 4 || c.iB - prev.iB < 4)) continue;
      acc.push(c);
    }
    if (acc.length === 0) {
      raw.push({ poly: [...top, ...reversePts(bot)], band });
      continue;
    }
    raw.push({
      poly: [...top.slice(0, acc[0].iT + 1), ...acc[0].pts.slice(1), ...reversePts(bot.slice(0, acc[0].iB))],
      band
    });
    for (let j = 0; j + 1 < acc.length; j++) {
      raw.push({
        poly: [
          ...top.slice(acc[j].iT, acc[j + 1].iT + 1),
          ...acc[j + 1].pts.slice(1),
          ...reversePts(bot.slice(acc[j].iB, acc[j + 1].iB)),
          ...reversePts(acc[j].pts.slice(1, -1))
        ],
        band
      });
    }
    const last = acc[acc.length - 1];
    raw.push({
      poly: [...top.slice(last.iT), ...reversePts(bot.slice(last.iB)), ...reversePts(last.pts.slice(1, -1))],
      band
    });
    for (let j = 0; j < acc.length; j++) {
      const rB1 = rand01(seed, "title:msplitGrow", band, j);
      const rB2 = rand01(seed, "title:msplitBirth", band, j);
      const sGrow = 0.22 + rB1 * 0.1;
      cracks.push(
        makeCrack(seed, `c${crackIdx++}`, "split", acc[j].pts, Math.min(0.5 + rB2 * 0.18, 0.97 - sGrow), sGrow)
      );
      const ciM = cracks.length - 1;
      junctions.push({ crackIndex: ciM, s: 0 }, { crackIndex: ciM, s: cracks[ciM].totalLen });
    }
  }
  const ranks = shuffledRanks(seed, "title:z", raw.length);
  const shards = [];
  for (let i = 0; i < raw.length; i++) {
    const s = makeShard(seed, i, raw[i].poly, raw[i].band, ranks[i], o.seamOutsetPx);
    if (s) shards.push(s);
  }
  return { shards, cracks, junctions, stubScale: gap };
}
function boundaryBirthOrder(bandCount) {
  const ks = Array.from({ length: bandCount - 1 }, (_, i) => i + 1);
  const mid = bandCount / 2;
  return ks.sort((p, q) => Math.abs(p - mid) - Math.abs(q - mid) || p - q);
}
function interpY(poly, x) {
  if (x <= poly[0][0]) return poly[0][1];
  const last = poly[poly.length - 1];
  if (x >= last[0]) return last[1];
  for (let i = 0; i + 1 < poly.length; i++) {
    if (x >= poly[i][0] && x <= poly[i + 1][0]) {
      const t = (x - poly[i][0]) / Math.max(1e-9, poly[i + 1][0] - poly[i][0]);
      return poly[i][1] + (poly[i + 1][1] - poly[i][1]) * t;
    }
  }
  return last[1];
}
function clampSplitterToBand(pts, top, bot, gap) {
  const m = 0.05 * gap;
  return pts.map((p, i) => {
    if (i === 0 || i === pts.length - 1) return p;
    const lo = interpY(top, p[0]) + m;
    const hi = interpY(bot, p[0]) - m;
    return [p[0], p[1] < lo ? lo : p[1] > hi ? hi : p[1]];
  });
}
function nearestIndexByX(pts, x, margin) {
  let best = margin;
  let bestD = Infinity;
  for (let i = margin; i < pts.length - margin; i++) {
    const d = Math.abs(pts[i][0] - x);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

// src/fracture/radial.ts
function generateRadialFracture(o) {
  const { width: w, height: h, seed } = o;
  const [ix, iy] = o.impact;
  const N = o.rays.count;
  const M = o.rings.count;
  let doubling = o.rays.doubling && N >= 3;
  let dS = Math.min(Math.max(1, o.rays.doublingStartRing), M);
  if (dS >= M + 1) doubling = false;
  if (M < 2) doubling = false;
  const count = doubling ? 2 * N : N;
  const R = Math.max(
    Math.hypot(ix, iy),
    Math.hypot(w - ix, iy),
    Math.hypot(ix, h - iy),
    Math.hypot(w - ix, h - iy)
  ) * 1.08;
  const r0 = Math.max(6, 0.05 * Math.min(w, h)) * o.impactHole;
  const slot = TAU / N;
  const stepAtRing = (j) => !doubling ? 1 : j >= dS ? 1 : 2;
  const rayStartRing = (a) => !doubling || a % 2 === 0 ? 0 : dS;
  const asym = o.rings.asymmetry;
  const strongDir = rand01(seed, "radial:strongDir") * TAU;
  const keepArc = (j, a) => {
    if (j <= 0 || j >= M) return true;
    if (doubling && j === dS) return true;
    if (o.rings.partial <= 0) return true;
    const ramp = M >= 3 ? (j - 1) / (M - 2) : 1;
    let keepProb = 1 - o.rings.partial * (0.1 + 0.45 * ramp);
    if (asym > 0) {
      const side = 0.5 + 0.5 * Math.cos(angles[a] - strongDir);
      const dropScale = 1 + asym * 1.6 * (1 - side);
      keepProb = Math.max(0.02, 1 - (1 - keepProb) * dropScale);
    }
    return rand01(seed, "radial:arcKeep", j, a) < keepProb;
  };
  const baseAngles = [];
  for (let i = 0; i < N; i++) {
    const r = rand01(seed, "radial:baseAngle", i);
    baseAngles.push(slot * i + (r - 0.5) * 2 * 0.18 * slot * o.rays.angleJitter);
  }
  const angles = [];
  if (doubling) {
    for (let i = 0; i < N; i++) {
      angles.push(baseAngles[i]);
      const next = i + 1 < N ? baseAngles[i + 1] : baseAngles[0] + TAU;
      const r = rand01(seed, "radial:secAngle", i);
      angles.push((baseAngles[i] + next) / 2 + (r - 0.5) * 2 * 0.1 * slot);
    }
  } else {
    angles.push(...baseAngles);
  }
  const weights = [];
  {
    let sum = 0;
    for (let j = 1; j <= M; j++) {
      const wj = o.rings.spacing === "geometric" ? Math.pow(1.55, j - 1) : 1;
      weights.push(wj);
      sum += wj;
    }
    for (let j = 0; j < M; j++) weights[j] /= sum;
  }
  const radii = [];
  for (let a = 0; a < count; a++) {
    const row = [0];
    let cum = 0;
    for (let j = 1; j <= M; j++) {
      const jit = (rand01(seed, "radial:ring", a, j) - 0.5) * 2 * 0.35 * o.rings.jitter;
      cum += weights[j - 1] * (1 + jit);
      row.push(cum);
    }
    const total = row[M];
    for (let j = 0; j <= M; j++) row[j] = r0 + (R - r0) * row[j] / total;
    radii.push(row);
  }
  const wobAmp = (j) => 0.1 * o.rays.waviness * slot * (stepAtRing(j) === 2 || !doubling ? 1 : 0.5);
  const hasDeviation = o.deviation > 0;
  const budget = [];
  const kinkMag = [];
  const kinkRing = [];
  for (let a = 0; a < count; a++) {
    const prev = angles[(a - 1 + count) % count] - (a === 0 ? TAU : 0);
    const next = angles[(a + 1) % count] + (a === count - 1 ? TAU : 0);
    budget.push(0.32 * Math.min(angles[a] - prev, next - angles[a]));
    if (hasDeviation && rand01(seed, "radial:kink", a) < o.deviation * 0.55 && M > 1) {
      const jk = 1 + Math.floor(rand01(seed, "radial:kinkJ", a) * (M - 1));
      const sign = rand01(seed, "radial:kinkS", a) < 0.5 ? -1 : 1;
      kinkMag.push(sign * (0.5 + 0.5 * rand01(seed, "radial:kinkM", a)) * budget[a]);
      kinkRing.push(jk);
    } else {
      kinkMag.push(0);
      kinkRing.push(0);
    }
  }
  const anchorAngle = (a, j) => {
    const wobble = fbm1D(hashCombine(seed, hashString("radial:wob"), a), j * 0.8, 2) * wobAmp(j);
    if (!hasDeviation) return angles[a] + wobble;
    const kink = kinkMag[a] * Math.min(1, Math.max(0, j - kinkRing[a]) / 1.5);
    const phi = Math.max(-budget[a], Math.min(budget[a], wobble + kink));
    return angles[a] + phi;
  };
  const anchors = [];
  for (let a = 0; a < count; a++) {
    const row = [];
    for (let j = 0; j <= M; j++) {
      const ang = anchorAngle(a, j);
      row.push([ix + Math.cos(ang) * radii[a][j], iy + Math.sin(ang) * radii[a][j]]);
    }
    anchors.push(row);
  }
  const rayEdges = /* @__PURE__ */ new Map();
  for (let a = 0; a < count; a++) {
    for (let j = rayStartRing(a); j < M; j++) {
      const A = anchors[a][j];
      const B = anchors[a][j + 1];
      const rMid = (radii[a][j] + radii[a][j + 1]) / 2;
      const angMid = angles[a] + fbm1D(hashCombine(seed, hashString("radial:wob"), a), (j + 0.5) * 0.8, 2) * Math.min(wobAmp(j), wobAmp(j + 1));
      const mid = [ix + Math.cos(angMid) * rMid, iy + Math.sin(angMid) * rMid];
      const lateralGap = rMid * slot * (doubling && stepAtRing(j) === 1 ? 0.5 : 1);
      const pts = subdivideMidpoint(
        [A, mid, B],
        o.edgeDetail,
        o.jaggedness * 0.5,
        hashCombine(seed, hashString("radial:rayjag"), a, j),
        0.25 * lateralGap
      );
      rayEdges.set(`${a}:${j}`, pts);
    }
  }
  const arcEdges = /* @__PURE__ */ new Map();
  for (let j = 0; j <= M; j++) {
    const step = stepAtRing(j);
    for (let a = 0; a < count; a += step) {
      const b = (a + step) % count;
      const A = anchors[a][j];
      const B = anchors[b][j];
      const angA = anchorAngle(a, j);
      let angB = anchorAngle(b, j);
      if (angB <= angA) angB += TAU;
      const rA = radii[a][j];
      const rB = radii[b][j];
      const gapDown = j > 0 ? Math.min(rA - radii[a][j - 1], rB - radii[b][j - 1]) : r0;
      const gapUp = j < M ? Math.min(radii[a][j + 1] - rA, radii[b][j + 1] - rB) : gapDown;
      const minGap = Math.max(1, Math.min(gapDown, gapUp));
      const bulgeSeed = hashCombine(seed, hashString("radial:bulge"), j, a);
      const base = [A];
      const innerSamples = 2;
      for (let s = 1; s <= innerSamples; s++) {
        const f = s / (innerSamples + 1);
        const ang = lerp(angA, angB, f);
        const r = lerp(rA, rB, f) + fbm1D(bulgeSeed, f * 2.3, 2) * 0.14 * minGap * (0.4 + 0.6 * o.rings.jitter);
        base.push([ix + Math.cos(ang) * r, iy + Math.sin(ang) * r]);
      }
      base.push(B);
      const pts = subdivideMidpoint(
        base,
        o.edgeDetail,
        o.jaggedness * 0.4,
        hashCombine(seed, hashString("radial:arcjag"), j, a),
        0.22 * minGap
      );
      arcEdges.set(`${j}:${a}`, pts);
    }
  }
  const raw = [];
  {
    const segs = [];
    const step = stepAtRing(0);
    for (let a = 0; a < count; a += step) segs.push(arcEdges.get(`0:${a}`));
    const clipped = clipPolygonToRect(stitchLoop(segs), w, h);
    if (clipped.length >= 3) raw.push({ poly: clipped, ring: 0 });
  }
  for (let j = 0; j < M; j++) {
    const bandStep = stepAtRing(j);
    for (let aL = 0; aL < count; aL += bandStep) {
      if (!keepArc(j, aL)) continue;
      let j1 = j;
      while (j1 + 1 < M && !keepArc(j1 + 1, aL)) j1++;
      const aR = (aL + bandStep) % count;
      const segs = [];
      for (let jj = j; jj <= j1; jj++) segs.push(rayEdges.get(`${aL}:${jj}`));
      const outerStep = stepAtRing(j1 + 1);
      const nOuter = bandStep / outerStep;
      for (let s = 0; s < nOuter; s++) {
        segs.push(arcEdges.get(`${j1 + 1}:${(aL + s * outerStep) % count}`));
      }
      for (let jj = j1; jj >= j; jj--) segs.push(reversePts(rayEdges.get(`${aR}:${jj}`)));
      segs.push(reversePts(arcEdges.get(`${j}:${aL}`)));
      const poly = stitchLoop(segs);
      const clipped = clipPolygonToRect(poly, w, h);
      if (clipped.length >= 3) raw.push({ poly: clipped, ring: j + 1 });
    }
  }
  const ranks = shuffledRanks(seed, "radial:z", raw.length);
  const shards = [];
  for (let i = 0; i < raw.length; i++) {
    const s = makeShard(seed, i, raw[i].poly, raw[i].ring, ranks[i], o.seamOutsetPx);
    if (s) shards.push(s);
  }
  const cracks = [];
  let ci = 0;
  {
    const segs = [];
    const step = stepAtRing(0);
    for (let a = 0; a < count; a += step) segs.push(arcEdges.get(`0:${a}`));
    const loop = concatPolylines(segs);
    cracks.push(makeCrack(seed, `c${ci++}`, "crush", loop, 0, 0.12));
  }
  for (let a = 0; a < count; a++) {
    const start = rayStartRing(a);
    if (start >= M) continue;
    const segs = [];
    for (let j = start; j < M; j++) segs.push(rayEdges.get(`${a}:${j}`));
    const pts = concatPolylines(segs);
    const rngC = rngFor(seed, "radial:raybirth", a);
    const secondary = doubling && a % 2 === 1;
    const birth = secondary ? 0.32 + rngC() * 0.08 : 0.02 + rngC() * 0.08;
    const grow = secondary ? 0.3 : 0.48 + rngC() * 0.14;
    cracks.push(makeCrack(seed, `c${ci++}`, "ray", pts, birth, grow));
  }
  const junctions = [];
  for (let j = 1; j < M; j++) {
    const step = stepAtRing(j);
    const arcStarts = [];
    for (let a = 0; a < count; a += step) arcStarts.push(a);
    const kept = arcStarts.map((a) => keepArc(j, a));
    const rngC = rngFor(seed, "radial:ringbirth", j);
    const base = 0.34 + (j - 1) / Math.max(1, M - 2) * 0.38 + rngC() * 0.05;
    if (kept.every(Boolean)) {
      const segs = arcStarts.map((a) => arcEdges.get(`${j}:${a}`));
      const pts = concatPolylines(segs);
      cracks.push(makeCrack(seed, `c${ci++}`, "ring", pts, Math.min(base, 0.97 - 0.26), 0.26));
      continue;
    }
    if (!kept.some(Boolean)) continue;
    const n = arcStarts.length;
    for (let i = 0; i < n; i++) {
      if (!kept[i] || kept[(i - 1 + n) % n]) continue;
      const segs = [];
      for (let k = 0; k < n && kept[(i + k) % n]; k++) {
        segs.push(arcEdges.get(`${j}:${arcStarts[(i + k) % n]}`));
      }
      const pts = concatPolylines(segs);
      const birth = Math.min(base + 0.04 * rand01(seed, "radial:ringrun", j, arcStarts[i]), 0.97 - 0.26);
      cracks.push(makeCrack(seed, `c${ci++}`, "ring", pts, birth, 0.26));
      const ciRun = cracks.length - 1;
      junctions.push({ crackIndex: ciRun, s: 0 }, { crackIndex: ciRun, s: cracks[ciRun].totalLen });
    }
  }
  return {
    shards,
    cracks,
    maxRing: M,
    junctions,
    stubScale: Math.sqrt(w * h / Math.max(1, shards.length))
  };
}
function concatPolylines(segs) {
  const out = [];
  for (const seg of segs) {
    const start = out.length === 0 ? 0 : 1;
    for (let i = start; i < seg.length; i++) out.push(seg[i]);
  }
  return out;
}

// src/fracture/collapse.ts
function generateCollapseFracture(o) {
  const { width: w, height: h, seed } = o;
  const diag = Math.hypot(w, h);
  const pad = 0.6 * diag;
  const sep = Math.abs((o.collapse.angleB - o.collapse.angleA + 90) % 180 - 90);
  const theta = Math.min(16, (Math.max(sep, 35) - 20) / 2);
  const slopeMax = Math.tan(degToRad(theta));
  const rngA = rngFor(seed, "collapse:countA");
  const rngB = rngFor(seed, "collapse:countB");
  const countA = resolveCount(o.collapse.countA, rngA);
  const countB = resolveCount(o.collapse.countB, rngB);
  const famA = buildFamily(o, "A", o.collapse.angleA, countA, slopeMax, w, h, pad);
  const famB = buildFamily(o, "B", o.collapse.angleB, countB, slopeMax, w, h, pad);
  const nA = famA.length;
  const nB = famB.length;
  const cross = [];
  for (let i = 0; i < nA; i++) {
    const row = [];
    const A = famA[i];
    for (let j = 0; j < nB; j++) {
      const B = famB[j];
      let found = null;
      outer: for (let p = 0; p < A.pts.length - 1; p++) {
        for (let q = 0; q < B.pts.length - 1; q++) {
          const hit = segmentIntersection(A.pts[p], A.pts[p + 1], B.pts[q], B.pts[q + 1]);
          if (hit) {
            found = {
              p: hit.p,
              sA: A.cum[p] + hit.ta * (A.cum[p + 1] - A.cum[p]),
              sB: B.cum[q] + hit.tb * (B.cum[q + 1] - B.cum[q])
            };
            break outer;
          }
        }
      }
      if (!found) {
        const fallback = [w / 2, h / 2];
        found = { p: fallback, sA: A.cum[A.cum.length - 1] / 2, sB: B.cum[B.cum.length - 1] / 2 };
      }
      row.push(found);
    }
    cross.push(row);
  }
  const gapA = approxGap(famA);
  const gapB = approxGap(famB);
  const maxOff = 0.2 * Math.min(gapA, gapB);
  const sliceA = /* @__PURE__ */ new Map();
  const sliceB = /* @__PURE__ */ new Map();
  for (let i = 0; i < nA; i++) {
    for (let j = 0; j < nB - 1; j++) {
      sliceA.set(
        `${i}:${j}`,
        jagSlice(famA[i], cross[i][j].sA, cross[i][j + 1].sA, cross[i][j].p, cross[i][j + 1].p, o, hashCombine(seed, hashString("collapse:Ajag"), i, j), maxOff)
      );
    }
  }
  for (let j = 0; j < nB; j++) {
    for (let i = 0; i < nA - 1; i++) {
      sliceB.set(
        `${j}:${i}`,
        jagSlice(famB[j], cross[i][j].sB, cross[i + 1][j].sB, cross[i][j].p, cross[i + 1][j].p, o, hashCombine(seed, hashString("collapse:Bjag"), j, i), maxOff)
      );
    }
  }
  const keepB = (j, i) => {
    if (j <= 0 || j >= nB - 1) return true;
    if (o.collapse.merge <= 0) return true;
    return rand01(o.seed, "collapse:mergeB", j, i) >= o.collapse.merge;
  };
  const rows = nA - 1;
  const raw = [];
  for (let i = 0; i < nA - 1; i++) {
    for (let j = 0; j < nB - 1; j++) {
      if (!keepB(j, i)) continue;
      let j1 = j;
      while (j1 + 1 < nB - 1 && !keepB(j1 + 1, i)) j1++;
      const segs = [];
      for (let jj = j; jj <= j1; jj++) segs.push(sliceA.get(`${i}:${jj}`));
      segs.push(sliceB.get(`${j1 + 1}:${i}`));
      for (let jj = j1; jj >= j; jj--) segs.push(reversePts(sliceA.get(`${i + 1}:${jj}`)));
      segs.push(reversePts(sliceB.get(`${j}:${i}`)));
      const poly = stitchLoop(segs);
      const clipped = clipPolygonToRect(poly, w, h);
      if (clipped.length >= 3) raw.push({ poly: clipped, row: rows - 1 - i });
    }
  }
  const ranks = shuffledRanks(seed, "collapse:z", raw.length);
  const shards = [];
  for (let i = 0; i < raw.length; i++) {
    const s = makeShard(seed, i, raw[i].poly, raw[i].row, ranks[i], o.seamOutsetPx);
    if (s) shards.push(s);
  }
  const cracks = [];
  const junctions = [];
  let ci = 0;
  for (let li = 1; li < famA.length - 1; li++) {
    const segs = [];
    for (let k = 0; k < nB - 1; k++) {
      const s = sliceA.get(`${li}:${k}`);
      if (s) segs.push(s);
    }
    if (segs.length === 0) continue;
    let pts = concatPolylines2(segs);
    const rngC = rngFor(seed, "collapse:A:birth", li);
    if (li % 2 === 0) pts = reversePts(pts);
    const grow = 0.3 + rngC() * 0.12;
    const birth = Math.min(rngC() * 0.45, 0.97 - grow);
    cracks.push(makeCrack(seed, `c${ci++}`, "mesh", pts, birth, grow));
  }
  for (let li = 1; li < famB.length - 1; li++) {
    const rngC = rngFor(seed, "collapse:B:birth", li);
    const grow = 0.3 + rngC() * 0.12;
    const birthBase = Math.min(rngC() * 0.45, 0.97 - grow);
    const spans = nA - 1;
    const kept = [];
    for (let i = 0; i < spans; i++) kept.push(keepB(li, i));
    if (kept.every(Boolean)) {
      const segs = [];
      for (let k = 0; k < spans; k++) {
        const s = sliceB.get(`${li}:${k}`);
        if (s) segs.push(s);
      }
      if (segs.length === 0) continue;
      let pts = concatPolylines2(segs);
      if (li % 2 === 0) pts = reversePts(pts);
      cracks.push(makeCrack(seed, `c${ci++}`, "mesh", pts, birthBase, grow));
      continue;
    }
    for (let i0 = 0; i0 < spans; i0++) {
      if (!kept[i0] || i0 > 0 && kept[i0 - 1]) continue;
      const segs = [];
      for (let k = i0; k < spans && kept[k]; k++) {
        const s = sliceB.get(`${li}:${k}`);
        if (s) segs.push(s);
      }
      if (segs.length === 0) continue;
      let pts = concatPolylines2(segs);
      if (li % 2 === 0) pts = reversePts(pts);
      const birth = Math.min(birthBase + 0.05 * rand01(seed, "collapse:Brun", li, i0), 0.985 - grow);
      cracks.push(makeCrack(seed, `c${ci++}`, "mesh", pts, birth, grow));
      const ciRun = cracks.length - 1;
      junctions.push({ crackIndex: ciRun, s: 0 }, { crackIndex: ciRun, s: cracks[ciRun].totalLen });
    }
  }
  return { shards, cracks, rows, junctions, stubScale: Math.min(approxGap(famA), approxGap(famB)) };
}
function resolveCount(spec, rng) {
  if (Array.isArray(spec)) {
    const lo = Math.min(spec[0], spec[1]);
    const hi = Math.max(spec[0], spec[1]);
    return Math.max(1, Math.round(lo + rng() * (hi - lo)));
  }
  return Math.max(1, Math.round(spec));
}
function buildFamily(o, famKey, angleDeg, count, slopeMax, w, h, pad) {
  const a = degToRad(angleDeg);
  const dir = [Math.cos(a), Math.sin(a)];
  const nrm = [-Math.sin(a), Math.cos(a)];
  const corners = [
    [0, 0],
    [w, 0],
    [w, h],
    [0, h]
  ];
  let uMin = Infinity;
  let uMax = -Infinity;
  let vMin = Infinity;
  let vMax = -Infinity;
  for (const c of corners) {
    const u = c[0] * dir[0] + c[1] * dir[1];
    const v = c[0] * nrm[0] + c[1] * nrm[1];
    uMin = Math.min(uMin, u);
    uMax = Math.max(uMax, u);
    vMin = Math.min(vMin, v);
    vMax = Math.max(vMax, v);
  }
  const gap = (vMax - vMin) / (count + 1);
  const offsets = [vMin - 0.75 * gap];
  const rngJ = rngFor(o.seed, `collapse:${famKey}:offsets`);
  for (let k = 0; k < count; k++) {
    offsets.push(vMin + gap * (k + 1) + (rngJ() - 0.5) * gap * 0.55);
  }
  offsets.push(vMax + 0.75 * gap);
  const u0 = uMin - pad;
  const u1 = uMax + pad;
  const segments = Math.max(8, Math.round((u1 - u0) / 120));
  const lines = [];
  for (let li = 0; li < offsets.length; li++) {
    const gapPrev = li > 0 ? offsets[li] - offsets[li - 1] : gap;
    const gapNext = li < offsets.length - 1 ? offsets[li + 1] - offsets[li] : gap;
    const corridorHalf = 0.45 * Math.max(4, Math.min(gapPrev, gapNext));
    const { u, v } = baseLine({
      seed: o.seed,
      group: `collapse:${famKey}`,
      key: li,
      u0,
      u1,
      segments,
      offset: offsets[li],
      waveAmp: o.collapse.waviness * gap * 0.2,
      deviation: o.deviation,
      devAmpMax: gap,
      slopeMax,
      corridorHalf
    });
    const pts = u.map((uu, k) => [dir[0] * uu + nrm[0] * v[k], dir[1] * uu + nrm[1] * v[k]]);
    lines.push({ pts, cum: cumulativeLengths(pts) });
  }
  return lines;
}
function approxGap(fam) {
  if (fam.length < 2) return 40;
  const a = fam[0].pts[0];
  const b = fam[fam.length - 1].pts[0];
  return Math.max(8, Math.hypot(b[0] - a[0], b[1] - a[1]) / (fam.length - 1));
}
function jagSlice(line, s0, s1, p0, p1, o, jagSeed, maxOff) {
  const lo = Math.min(s0, s1);
  const hi = Math.max(s0, s1);
  const base = [lo === s0 ? p0 : p1];
  for (let i = 0; i < line.pts.length; i++) {
    if (line.cum[i] > lo + 0.5 && line.cum[i] < hi - 0.5) base.push(line.pts[i]);
  }
  base.push(lo === s0 ? p1 : p0);
  let out = subdivideMidpoint(base, o.edgeDetail, o.jaggedness * 0.45, jagSeed, maxOff);
  if (lo !== s0) out = reversePts(out);
  return out;
}
function concatPolylines2(segs) {
  const out = [];
  for (const seg of segs) {
    const start = out.length === 0 ? 0 : 1;
    for (let i = start; i < seg.length; i++) out.push(seg[i]);
  }
  return out;
}

// src/fracture/hero.ts
function generateHeroFracture(o) {
  const w = o.width;
  const h = o.height;
  const minDim = Math.min(w, h);
  const baseR = o.hero.sizeFrac * minDim;
  const centers = layoutCenters(o, baseR);
  const shards = [];
  for (let k = 0; k < centers.length; k++) {
    const rng = rngFor(o.seed, "hero", k);
    const nV = 11 + Math.floor(rng() * 5);
    const rotOff = rng() * TAU;
    const rScale = 0.88 + rng() * 0.24;
    const slot = TAU / nV;
    const ring = [];
    for (let i = 0; i < nV; i++) {
      const ang = rotOff + i * slot + (rng() - 0.5) * slot * 0.55;
      const rad = baseR * rScale * (0.76 + 0.46 * rng());
      ring.push([centers[k][0] + Math.cos(ang) * rad, centers[k][1] + Math.sin(ang) * rad]);
    }
    ring.push(ring[0]);
    const jagged = subdivideMidpoint(
      ring,
      o.edgeDetail,
      o.jaggedness * 0.5,
      rngFor(o.seed, "hero:jag", k)() * 4294967295,
      baseR * 0.12
    );
    jagged.pop();
    const shard = makeShard(o.seed, k, jagged, 0, k, o.seamOutsetPx);
    if (shard) shards.push(shard);
  }
  return { shards, cracks: [], junctions: [], stubScale: baseR };
}
function layoutCenters(o, baseR) {
  const cx = o.width / 2;
  const cy = o.height / 2;
  const K = o.hero.count;
  if (K === 1) return [[cx, cy]];
  const rng = rngFor(o.seed, "hero:layout");
  const sep = baseR * (1.05 + 0.9 * o.hero.spread) * (1 - 0.72 * o.hero.overlap);
  if (K === 2) {
    const dx = baseR * 0.22 * (rng() * 2 - 1);
    return [
      [cx + dx, cy - sep / 2],
      [cx - dx, cy + sep / 2]
    ];
  }
  const a0 = -Math.PI / 2 + (rng() - 0.5) * 0.5;
  const out = [];
  for (let k = 0; k < 3; k++) {
    const a = a0 + k * TAU / 3;
    out.push([cx + Math.cos(a) * sep * 0.62, cy + Math.sin(a) * sep * 0.62]);
  }
  return out;
}

// src/fracture/web.ts
function wrapAngle(d) {
  return ((d + Math.PI) % TAU + TAU) % TAU - Math.PI;
}
function webOrigin(w, h, dirDeg, distance) {
  const dirRad = degToRad(dirDeg);
  const maxDim = Math.max(w, h);
  const cx = w / 2;
  const cy = h / 2;
  const ux = -Math.cos(dirRad);
  const uy = -Math.sin(dirRad);
  let tBound = Infinity;
  if (ux > 1e-9) tBound = Math.min(tBound, (w - cx) / ux);
  else if (ux < -1e-9) tBound = Math.min(tBound, -cx / ux);
  if (uy > 1e-9) tBound = Math.min(tBound, (h - cy) / uy);
  else if (uy < -1e-9) tBound = Math.min(tBound, -cy / uy);
  if (!Number.isFinite(tBound)) tBound = maxDim;
  const dist = Math.max(distance * maxDim, tBound + 0.2 * maxDim);
  return [cx + ux * dist, cy + uy * dist];
}
function generateWebFracture(o) {
  const { width: w, height: h, seed } = o;
  const N = o.web.rays;
  const M = o.web.rings;
  const irr = o.web.irregularity;
  const ringDetail = Math.min(1, o.edgeDetail);
  const dirRad = degToRad(o.web.dir);
  const maxDim = Math.max(w, h);
  const P = webOrigin(w, h, o.web.dir, o.web.distance);
  const [px, py] = P;
  const corners = [
    [0, 0],
    [w, 0],
    [w, h],
    [0, h]
  ];
  let maxDev = 0;
  let maxCornerDist = 0;
  for (const c of corners) {
    const dev = Math.abs(wrapAngle(Math.atan2(c[1] - py, c[0] - px) - dirRad));
    if (dev > maxDev) maxDev = dev;
    const d = Math.hypot(c[0] - px, c[1] - py);
    if (d > maxCornerDist) maxCornerDist = d;
  }
  const slot0 = 2 * maxDev / Math.max(1, N - 1);
  const spread = Math.min(TAU * 0.95, 2 * maxDev + 2 * slot0);
  const slot = spread / Math.max(1, N - 1);
  const nearX = Math.max(0, Math.min(w, px));
  const nearY = Math.max(0, Math.min(h, py));
  const dNear = Math.hypot(px - nearX, py - nearY);
  const margin = 0.05 * maxDim;
  const r0 = Math.max(5, dNear - margin);
  const R = maxCornerDist / Math.max(0.2, Math.cos(slot / 2)) * 1.06 + margin;
  const asym = o.rings.asymmetry;
  const strongDir = dirRad + (rand01(seed, "web:strongDir") - 0.5) * spread;
  const keepArc = (j, a) => {
    if (j <= 0 || j >= M) return true;
    if (o.rings.partial <= 0) return true;
    const ramp = M >= 3 ? (j - 1) / (M - 2) : 1;
    let keepProb = 1 - o.rings.partial * (0.1 + 0.45 * ramp);
    if (asym > 0) {
      const side = 0.5 + 0.5 * Math.cos(angles[a] - strongDir);
      keepProb = Math.max(0.02, 1 - (1 - keepProb) * (1 + asym * 1.6 * (1 - side)));
    }
    return rand01(seed, "web:arcKeep", j, a) < keepProb;
  };
  const angles = [];
  for (let a = 0; a < N; a++) {
    const base = dirRad - spread / 2 + (N > 1 ? a / (N - 1) * spread : 0);
    const jit = (rand01(seed, "web:angle", a) - 0.5) * 2 * 0.15 * slot * o.rays.angleJitter;
    angles.push(base + jit);
  }
  const weights = [];
  {
    let sum = 0;
    for (let j = 1; j <= M; j++) {
      const wj = o.rings.spacing === "uniform" ? 1 : Math.pow(1.35, j - 1);
      weights.push(wj);
      sum += wj;
    }
    for (let j = 0; j < M; j++) weights[j] /= sum;
  }
  const ringR = [0];
  {
    let cum = 0;
    for (let j = 1; j <= M; j++) {
      const jit = (rand01(seed, "web:ringbase", j) - 0.5) * 2 * 0.3 * o.rings.jitter;
      cum += weights[j - 1] * (1 + jit);
      ringR.push(cum);
    }
    for (let j = 0; j <= M; j++) ringR[j] = r0 + (R - r0) * ringR[j] / cum;
  }
  const radii = [];
  for (let a = 0; a < N; a++) {
    const row = [r0];
    for (let j = 1; j <= M; j++) {
      if (j === M) {
        row.push(ringR[M]);
        continue;
      }
      const gUp = ringR[j + 1] - ringR[j];
      const gDn = ringR[j] - ringR[j - 1];
      const bound = 0.4 * Math.max(1, Math.min(gUp, gDn));
      const pert = (rand01(seed, "web:ringpert", a, j) - 0.5) * 2 * (0.3 + 0.7 * irr) * bound;
      row.push(ringR[j] + pert);
    }
    radii.push(row);
  }
  const wobAmp = (0.05 * o.rays.waviness + 0.04 * irr) * slot;
  const anchorAngle = (a, j) => angles[a] + fbm1D(hashCombine(seed, hashString("web:wob"), a), j * 0.8, 2) * wobAmp;
  const anchors = [];
  for (let a = 0; a < N; a++) {
    const row = [];
    for (let j = 0; j <= M; j++) {
      const ang = anchorAngle(a, j);
      row.push([px + Math.cos(ang) * radii[a][j], py + Math.sin(ang) * radii[a][j]]);
    }
    anchors.push(row);
  }
  const rayEdges = /* @__PURE__ */ new Map();
  for (let a = 0; a < N; a++) {
    for (let j = 0; j < M; j++) {
      const A = anchors[a][j];
      const B = anchors[a][j + 1];
      const mid = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2];
      const lateralGap = Math.min((radii[a][j] + radii[a][j + 1]) / 2 * slot, 0.12 * maxDim);
      rayEdges.set(
        `${a}:${j}`,
        subdivideMidpoint([A, mid, B], o.edgeDetail, o.jaggedness * 0.5, hashCombine(seed, hashString("web:rayjag"), a, j), 0.18 * lateralGap)
      );
    }
  }
  const ringEdges = /* @__PURE__ */ new Map();
  for (let j = 0; j <= M; j++) {
    for (let a = 0; a + 1 < N; a++) {
      const b = a + 1;
      const A = anchors[a][j];
      const B = anchors[b][j];
      const angA = anchorAngle(a, j);
      const angB = anchorAngle(b, j);
      const rA = radii[a][j];
      const rB = radii[b][j];
      const base = [A];
      for (let s = 1; s <= 2; s++) {
        const f = s / 3;
        const ang = lerp(angA, angB, f);
        const r = lerp(rA, rB, f);
        base.push([px + Math.cos(ang) * r, py + Math.sin(ang) * r]);
      }
      base.push(B);
      const gapDown = j > 0 ? Math.min(rA - radii[a][j - 1], rB - radii[b][j - 1]) : r0;
      const gapUp = j < M ? Math.min(radii[a][j + 1] - rA, radii[b][j + 1] - rB) : gapDown;
      const minGap = Math.max(1, Math.min(gapDown, gapUp, 0.1 * maxDim));
      ringEdges.set(
        `${j}:${a}`,
        subdivideMidpoint(base, ringDetail, o.jaggedness * 0.22, hashCombine(seed, hashString("web:ringjag"), j, a), 0.18 * minGap)
      );
    }
  }
  const raw = [];
  for (let j = 0; j < M; j++) {
    for (let aL = 0; aL + 1 < N; aL++) {
      if (!keepArc(j, aL)) continue;
      let j1 = j;
      while (j1 + 1 < M && !keepArc(j1 + 1, aL)) j1++;
      const aR = aL + 1;
      const segs = [];
      for (let jj = j; jj <= j1; jj++) segs.push(rayEdges.get(`${aL}:${jj}`));
      segs.push(ringEdges.get(`${j1 + 1}:${aL}`));
      for (let jj = j1; jj >= j; jj--) segs.push(reversePts(rayEdges.get(`${aR}:${jj}`)));
      segs.push(reversePts(ringEdges.get(`${j}:${aL}`)));
      const clipped = clipPolygonToRect(stitchLoop(segs), w, h);
      if (clipped.length >= 3) raw.push({ poly: clipped, ring: j + 1 });
    }
  }
  const ranks = shuffledRanks(seed, "web:z", raw.length);
  const shards = [];
  for (let i = 0; i < raw.length; i++) {
    const s = makeShard(seed, i, raw[i].poly, raw[i].ring, ranks[i], o.seamOutsetPx);
    if (s) shards.push(s);
  }
  const cracks = [];
  const junctions = [];
  let cid = 0;
  for (let a = 0; a < N; a++) {
    const pts = [];
    for (let j = 0; j < M; j++) {
      const e = rayEdges.get(`${a}:${j}`);
      for (let k = j === 0 ? 0 : 1; k < e.length; k++) pts.push(e[k]);
    }
    const birth = rand01(seed, "web:raybirth", a) * 0.06;
    cracks.push(makeCrack(seed, `wr${cid++}`, "ray", pts, birth, 0.42 + rand01(seed, "web:raygrow", a) * 0.12, true));
  }
  for (let j = 1; j < M; j++) {
    let a = 0;
    while (a + 1 < N) {
      if (!keepArc(j, a)) {
        a++;
        continue;
      }
      const runStart = a;
      const pts = [];
      while (a + 1 < N && keepArc(j, a)) {
        const e = ringEdges.get(`${j}:${a}`);
        for (let k = a === runStart ? 0 : 1; k < e.length; k++) pts.push(e[k]);
        a++;
      }
      if (pts.length >= 2) {
        const birth = 0.08 + j / M * 0.2 + rand01(seed, "web:ringbirth", j, runStart) * 0.05;
        cracks.push(makeCrack(seed, `wg${cid++}`, "ring", pts, Math.min(birth, 0.9), 0.28, false));
      }
    }
  }
  const stubScale = Math.sqrt(w * h / Math.max(1, shards.length));
  return { shards, cracks, maxRing: M, junctions, stubScale };
}

// src/fracture/corners.ts
function chordIsInterior(pts, ci, vi) {
  const n = pts.length;
  const A = pts[ci];
  const B = pts[vi];
  const mid = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2];
  if (!pointInPolygon(mid, pts)) return false;
  for (let j = 0; j < n; j++) {
    const k = (j + 1) % n;
    if (j === ci || k === ci || j === vi || k === vi) continue;
    const hit = segmentIntersection(pts[j], pts[k], A, B);
    if (hit && hit.ta > 1e-6 && hit.ta < 1 - 1e-6 && hit.tb > 1e-6 && hit.tb < 1 - 1e-6) return false;
  }
  return true;
}
function applyCornerRelief(o, shards, cracks) {
  if (o.corners === false || o.corners.relief <= 0 || o.mode === "hero") return;
  const { width: w, height: h, seed } = o;
  const relief = o.corners.relief;
  const eps = 1e-3;
  const onBorder = (a, b) => a[0] < eps && b[0] < eps || a[0] > w - eps && b[0] > w - eps || a[1] < eps && b[1] < eps || a[1] > h - eps && b[1] > h - eps;
  const baseN = shards.length;
  let maxZ = 0;
  for (const s of shards) if (s.z > maxZ) maxZ = s.z;
  let appended = 0;
  let crackId = 0;
  const corners = [
    [0, 0],
    [w, 0],
    [w, h],
    [0, h]
  ];
  for (let c = 0; c < corners.length; c++) {
    const C = corners[c];
    let ownerIdx = -1;
    let owners = 0;
    for (let si = 0; si < baseN; si++) {
      const poly = shards[si].polygon;
      for (let p = 0; p + 1 < poly.length; p += 2) {
        if (Math.abs(poly[p] - C[0]) < eps && Math.abs(poly[p + 1] - C[1]) < eps) {
          owners++;
          ownerIdx = si;
          break;
        }
      }
      if (owners > 1) break;
    }
    if (owners !== 1) continue;
    const owner = shards[ownerIdx];
    if ((o.mode === "radial" || o.mode === "web") && owner.ringIndex === 0) continue;
    const raw = unflattenPts(owner.polygon);
    const n = raw.length;
    if (n < 5) continue;
    let ci0 = -1;
    for (let i = 0; i < n; i++) {
      if (Math.abs(raw[i][0] - C[0]) < eps && Math.abs(raw[i][1] - C[1]) < eps) {
        ci0 = i;
        break;
      }
    }
    if (ci0 < 0) continue;
    if (!onBorder(raw[(ci0 - 1 + n) % n], C) || !onBorder(C, raw[(ci0 + 1) % n])) continue;
    const pts = [...raw.slice(ci0), ...raw.slice(0, ci0)];
    const jit = 0.8 + 0.4 * rand01(seed, "corner", c);
    const reach = relief * Math.min(0.55 * Math.sqrt(owner.area), 95) * jit;
    const distC = (i) => Math.hypot(pts[i][0] - C[0], pts[i][1] - C[1]);
    const mid = Math.floor(n / 2);
    const pick = (lo, hi, step) => {
      let best = -1;
      let bestErr = Infinity;
      for (let i = lo; step > 0 ? i <= hi : i >= hi; i += step) {
        if (i <= 1 || i >= n - 1) continue;
        if (distC(i) < 8) continue;
        if (!chordIsInterior(pts, 0, i)) continue;
        const err = Math.abs(distC(i) - reach);
        if (err < bestErr) {
          bestErr = err;
          best = i;
        }
      }
      return best;
    };
    const vF = pick(2, mid, 1);
    const vB = pick(n - 2, mid + 1, -1);
    const targets = [];
    if (vF > 0) targets.push(vF);
    if (vB > 0 && vB !== vF) targets.push(vB);
    targets.sort((a, b) => a - b);
    if (targets.length === 0) continue;
    const pieces = [];
    pieces.push(pts.slice(0, targets[0] + 1));
    for (let k = 0; k + 1 < targets.length; k++) {
      pieces.push([pts[0], ...pts.slice(targets[k], targets[k + 1] + 1)]);
    }
    pieces.push([pts[0], ...pts.slice(targets[targets.length - 1])]);
    const built = [];
    let ok = true;
    for (let k = 0; k < pieces.length; k++) {
      const idx = k === 0 ? ownerIdx : baseN + appended + (k - 1);
      const z = k === 0 ? owner.z : maxZ + 1 + appended + (k - 1);
      const sh = makeShard(seed, idx, pieces[k], owner.ringIndex, z, o.seamOutsetPx);
      if (!sh) {
        ok = false;
        break;
      }
      built.push(sh);
    }
    if (!ok) continue;
    shards[ownerIdx] = built[0];
    for (let k = 1; k < built.length; k++) shards.push(built[k]);
    appended += built.length - 1;
    const birth = 0 + 0.06 * rand01(seed, "corner:birth", c);
    for (const v of targets) {
      cracks.push(makeCrack(seed, `cr${crackId++}`, "split", [C, pts[v]], birth, 0.32, false));
    }
  }
}

// src/fracture/stubs.ts
var MAX_TOTAL_STUBS = 200;
function addStubCracks(o, cracks, junctions, localScale) {
  if (o.stubs === false || o.stubs.maxPerCrack <= 0) return;
  const { width: w, height: h, seed } = o;
  const mainCount = cracks.length;
  const recs = [];
  const forkSeeds = [];
  const tryStub = (parentIdx, sStation, keyA, keyB, group, freeAngle) => {
    const c = cracks[parentIdx];
    const rs = (field) => rand01(seed, `${group}:${field}`, keyA, keyB);
    const pts = unflattenPts(c.points);
    const p = pointAtLength(pts, c.cumLen, sStation);
    if (p[0] < 2 || p[0] > w - 2 || p[1] < 2 || p[1] > h - 2) return;
    const tan = tangentAtLength(pts, c.cumLen, sStation);
    const side = rs("side") < 0.5 ? 1 : -1;
    const angDeg = freeAngle ? 25 + 55 * rs("ang") : 20 + 35 * rs("ang");
    const ang = degToRad(angDeg) * side;
    const cos = Math.cos(ang);
    const sin = Math.sin(ang);
    const dir = [tan[0] * cos - tan[1] * sin, tan[0] * sin + tan[1] * cos];
    const sinA = Math.max(0.2, Math.abs(Math.sin(ang)));
    const L = Math.min(45, (0.18 + 0.45 * rs("len")) * localScale, 0.55 * localScale / sinA);
    if (L < 4) return;
    const arrival = c.birth + c.growDuration * (1 - Math.pow(Math.max(0, 1 - sStation / Math.max(1e-6, c.totalLen)), 0.25));
    if (arrival > 0.965) return;
    const grow = Math.min(0.04 + 0.04 * rs("grow"), 0.985 - arrival);
    if (grow < 0.02) return;
    const curve = (rs("curve") - 0.5) * 0.24 * L;
    const perp = [-dir[1], dir[0]];
    const base = [
      p,
      [p[0] + dir[0] * 0.55 * L + perp[0] * curve, p[1] + dir[1] * 0.55 * L + perp[1] * curve],
      [p[0] + dir[0] * L, p[1] + dir[1] * L]
    ];
    const jag = subdivideMidpoint(
      base,
      Math.min(2, o.edgeDetail),
      o.jaggedness * 0.4,
      hashCombine(seed, hashString(`${group}:jag`), keyA, keyB),
      0.15 * L
    );
    const rec = { parent: parentIdx, pts: jag, birth: arrival, grow };
    recs.push(rec);
    if (rs("fork") < 0.25) forkSeeds.push({ rec, key: hashCombine(keyA, keyB) });
  };
  for (let ci = 0; ci < mainCount; ci++) {
    const c = cracks[ci];
    if (c.kind === "crush" || c.totalLen < 30) continue;
    const n = Math.min(1 + Math.floor(rand01(seed, "stub:n", ci) * 3.2), o.stubs.maxPerCrack);
    for (let k = 0; k < n; k++) {
      const s = (0.08 + 0.84 * rand01(seed, "stub:s", ci, k)) * c.totalLen;
      tryStub(ci, s, ci, k, "stub", false);
    }
  }
  if (o.stubs.atJunctions) {
    for (let ji = 0; ji < junctions.length; ji++) {
      if (rand01(seed, "stub:junction", ji) >= 0.3) continue;
      const jn = junctions[ji];
      tryStub(jn.crackIndex, jn.s, 1000003 + ji, 0, "stubj", true);
    }
  }
  const forkRecs = [];
  for (let fi = 0; fi < forkSeeds.length; fi++) {
    const { rec, key } = forkSeeds[fi];
    const rf = (field) => rand01(seed, `stubf:${field}`, key, fi);
    const cum = cumulativeLengths(rec.pts);
    const total = cum[cum.length - 1];
    const sF = 0.6 * total;
    const p = pointAtLength(rec.pts, cum, sF);
    const tan = tangentAtLength(rec.pts, cum, sF);
    const side = rf("side") < 0.5 ? 1 : -1;
    const ang = degToRad(15 + 15 * rf("ang")) * side;
    const cos = Math.cos(ang);
    const sin = Math.sin(ang);
    const dir = [tan[0] * cos - tan[1] * sin, tan[0] * sin + tan[1] * cos];
    const L = 0.4 * total;
    if (L < 4) continue;
    const forkBirth = rec.birth + rec.grow * (1 - Math.pow(1 - 0.6, 0.25));
    const forkGrow = Math.min(0.03 + 0.03 * rf("grow"), 0.985 - forkBirth);
    if (forkGrow < 0.02) continue;
    const base = [
      p,
      [p[0] + dir[0] * 0.5 * L, p[1] + dir[1] * 0.5 * L],
      [p[0] + dir[0] * L, p[1] + dir[1] * L]
    ];
    const jag = subdivideMidpoint(
      base,
      Math.min(2, o.edgeDetail),
      o.jaggedness * 0.4,
      hashCombine(seed, hashString("stubf:jag"), key, fi),
      0.15 * L
    );
    forkRecs.push({ parent: rec.parent, pts: jag, birth: forkBirth, grow: forkGrow });
  }
  const all = [...recs, ...forkRecs].slice(0, MAX_TOTAL_STUBS);
  for (let si = 0; si < all.length; si++) {
    const r = all[si];
    const crack = makeCrack(seed, `st${si}`, "stub", r.pts, r.birth, r.grow, false);
    crack.parent = r.parent;
    cracks.push(crack);
  }
}

// src/fracture/micro.ts
function seedMicroShards(o, allCracks, ringIndexAt) {
  const cracks = allCracks.filter((c) => c.kind !== "stub");
  if (o.microCount <= 0 || cracks.length === 0) return [];
  const cumTotals = [];
  let total = 0;
  for (const c of cracks) {
    total += c.totalLen;
    cumTotals.push(total);
  }
  if (total <= 0) return [];
  const out = [];
  for (let i = 0; i < o.microCount; i++) {
    const rng = rngFor(o.seed, "micro", i);
    const pickLen = rng() * total;
    let ci = 0;
    while (ci < cumTotals.length - 1 && cumTotals[ci] <= pickLen) ci++;
    const crack = cracks[ci];
    const pts = unflattenPts(crack.points);
    const s = rng() * crack.totalLen;
    const p = pointAtLength(pts, crack.cumLen, s);
    const offAng = rng() * TAU;
    const offDist = 1 + rng() * 4;
    const origin = [p[0] + Math.cos(offAng) * offDist, p[1] + Math.sin(offAng) * offDist];
    const sizeT = Math.pow(rng(), 1.6);
    const size = lerp(o.microSizeRange[0], o.microSizeRange[1], sizeT);
    const nPts = rng() < 0.6 ? 3 : 4;
    const baseAng = rng() * TAU;
    const elong = 0.45 + rng() * 0.55;
    const poly = [];
    for (let k = 0; k < nPts; k++) {
      const a = baseAng + k / nPts * TAU + (rng() - 0.5) * 0.9;
      const r = size * (0.5 + rng() * 0.6);
      poly.push(Math.cos(a) * r, Math.sin(a) * r * elong);
    }
    const birth = clamp01(crack.birth + s / Math.max(1e-6, crack.totalLen) * crack.growDuration);
    out.push({
      id: `m${i}`,
      polygon: poly,
      origin,
      hash: hashCombine(o.seed, hashString("micro"), i),
      birth,
      ringIndex: ringIndexAt(origin)
    });
  }
  return out;
}

// src/fracture/index.ts
function generateFracture(opts) {
  const o = resolveFractureOptions(opts);
  let shards;
  let cracks;
  let junctions;
  let stubScale;
  let ringIndexAt;
  if (o.mode === "title") {
    const res = generateTitleFracture(o);
    shards = res.shards;
    cracks = res.cracks;
    junctions = res.junctions;
    stubScale = res.stubScale;
    const bandH = o.height / Math.max(1, Math.max(...shards.map((s) => s.ringIndex)) + 1);
    ringIndexAt = (origin) => Math.max(0, Math.min(Math.floor(origin[1] / bandH), 64));
  } else if (o.mode === "hero") {
    const res = generateHeroFracture(o);
    shards = res.shards;
    cracks = res.cracks;
    junctions = res.junctions;
    stubScale = res.stubScale;
    ringIndexAt = () => 0;
  } else if (o.mode === "web") {
    const res = generateWebFracture(o);
    shards = res.shards;
    cracks = res.cracks;
    junctions = res.junctions;
    stubScale = res.stubScale;
    const [Px, Py] = webOrigin(o.width, o.height, o.web.dir, o.web.distance);
    let dMin = Infinity;
    let dMax = 0;
    for (const c of [[0, 0], [o.width, 0], [o.width, o.height], [0, o.height]]) {
      const d = Math.hypot(c[0] - Px, c[1] - Py);
      if (d < dMin) dMin = d;
      if (d > dMax) dMax = d;
    }
    ringIndexAt = (origin) => {
      const d = Math.hypot(origin[0] - Px, origin[1] - Py);
      return Math.max(0, Math.min(Math.round((d - dMin) / Math.max(1, dMax - dMin) * (res.maxRing + 1)), res.maxRing + 1));
    };
  } else if (o.mode === "collapse") {
    const res = generateCollapseFracture(o);
    shards = res.shards;
    cracks = res.cracks;
    junctions = res.junctions;
    stubScale = res.stubScale;
    const rowH = o.height / Math.max(1, res.rows);
    ringIndexAt = (origin) => Math.max(0, Math.min(Math.floor((o.height - origin[1]) / rowH), res.rows - 1));
  } else {
    const res = generateRadialFracture(o);
    shards = res.shards;
    cracks = res.cracks;
    junctions = res.junctions;
    stubScale = res.stubScale;
    const R = Math.hypot(Math.max(o.impact[0], o.width - o.impact[0]), Math.max(o.impact[1], o.height - o.impact[1]));
    ringIndexAt = (origin) => {
      const d = Math.hypot(origin[0] - o.impact[0], origin[1] - o.impact[1]);
      return Math.max(0, Math.min(Math.round(d / Math.max(1, R) * (res.maxRing + 1)), res.maxRing + 1));
    };
  }
  applyCornerRelief(o, shards, cracks);
  addStubCracks(o, cracks, junctions, stubScale);
  const micro = seedMicroShards(o, cracks, ringIndexAt);
  const pattern = {
    version: 7,
    mode: o.mode,
    width: o.width,
    height: o.height,
    seed: o.seed,
    instanceId: o.instanceId,
    impact: o.impact,
    shards,
    cracks,
    micro
  };
  return deepFreeze(pattern);
}
function deepFreeze(obj) {
  if (obj && typeof obj === "object" && !Object.isFrozen(obj)) {
    Object.freeze(obj);
    for (const key of Object.keys(obj)) {
      deepFreeze(obj[key]);
    }
  }
  return obj;
}

// src/motion/timeline.ts
function resolvePhase(t, tl) {
  const crackProgress = tl.crackEnd <= tl.crackStart ? t >= tl.crackEnd ? 1 : 0 : clamp01((t - tl.crackStart) / (tl.crackEnd - tl.crackStart));
  const shattering = Number.isFinite(tl.shatterStart) && t >= tl.shatterStart;
  const shatterTau = shattering ? t - tl.shatterStart : 0;
  let phase;
  if (shattering) phase = "shattering";
  else if (crackProgress <= 0) phase = "intact";
  else if (crackProgress < 1) phase = "cracking";
  else phase = "cracked";
  return { phase, crackProgress, shatterTau };
}
var staticCrackedTimeline = {
  crackStart: -1,
  crackEnd: 0,
  shatterStart: Infinity
};

// src/motion/kinematics.ts
function classifyOutlier(hash, outliers) {
  const r = hashTo01(hashCombine(hash, hashString("outlier")));
  if (r < outliers.dropFraction) return "dropped";
  if (r < outliers.dropFraction + outliers.slipFraction) return "slipped";
  if (r < outliers.dropFraction + outliers.slipFraction + outliers.rebelFraction) return "rebel";
  return "none";
}
function assignOutliers(pattern, outliers) {
  const kinds = [];
  let hasException = false;
  for (const s of pattern.shards) {
    if (pattern.mode === "radial" && s.ringIndex === 0) {
      kinds.push("none");
      continue;
    }
    const k = classifyOutlier(s.hash, outliers);
    if (k !== "none") hasException = true;
    kinds.push(k);
  }
  if (outliers.dropFraction > 0) {
    const maxDrop = Math.max(1, Math.ceil(pattern.shards.length * outliers.dropFraction));
    const dropped = [];
    for (let i = 0; i < kinds.length; i++) {
      if (kinds[i] === "dropped") {
        dropped.push({ i, r: hashTo01(hashCombine(pattern.shards[i].hash, hashString("outlier"))) });
      }
    }
    if (dropped.length > maxDrop) {
      dropped.sort((a, b) => b.r - a.r || a.i - b.i);
      for (let k = 0; k < dropped.length - maxDrop; k++) kinds[dropped[k].i] = "slipped";
    }
  }
  if (!hasException && pattern.mode !== "hero" && // free-floating heroes get no forced exception
  pattern.shards.length <= 12 && outliers.slipFraction + outliers.rebelFraction > 0) {
    let best = -1;
    let bestR = Infinity;
    for (let i = 0; i < pattern.shards.length; i++) {
      if (kinds[i] !== "none") continue;
      if (pattern.mode === "radial" && pattern.shards[i].ringIndex === 0) continue;
      const r = hashTo01(hashCombine(pattern.shards[i].hash, hashString("outlier")));
      if (r < bestR) {
        bestR = r;
        best = i;
      }
    }
    if (best >= 0) kinds[best] = "slipped";
  }
  return kinds;
}
function flightOffset(tau, v0, g, drag) {
  if (tau <= 0) return [0, 0];
  if (drag <= 1e-6) {
    return [v0[0] * tau + 0.5 * g[0] * tau * tau, v0[1] * tau + 0.5 * g[1] * tau * tau];
  }
  const e = Math.exp(-drag * tau);
  const a = (1 - e) / drag;
  const b = (drag * tau - 1 + e) / (drag * drag);
  return [v0[0] * a + g[0] * b, v0[1] * a + g[1] * b];
}
function flightSpeed(tau, v0, g, drag) {
  if (tau < 0) tau = 0;
  let vx;
  let vy;
  if (drag <= 1e-6) {
    vx = v0[0] + g[0] * tau;
    vy = v0[1] + g[1] * tau;
  } else {
    const e = Math.exp(-drag * tau);
    vx = v0[0] * e + g[0] * (1 - e) / drag;
    vy = v0[1] * e + g[1] * (1 - e) / drag;
  }
  return Math.hypot(vx, vy);
}
function shardMotion(pattern, shard, fx, kind = "none") {
  const rng = rngFor(shard.hash, "motion");
  const sh = fx.shatter;
  const jitter = (amount) => 1 + (rng() * 2 - 1) * sh.jitter * amount;
  let dirX;
  let dirY;
  let speed;
  if (typeof sh.direction === "number") {
    const a = degToRad(sh.direction);
    dirX = Math.cos(a);
    dirY = Math.sin(a);
    speed = sh.speed * jitter(0.5);
  } else if (pattern.mode === "radial" || pattern.mode === "web") {
    const dx = shard.centroid[0] - pattern.impact[0];
    const dy = shard.centroid[1] - pattern.impact[1];
    const d = Math.hypot(dx, dy) || 1;
    const scatter = (rng() * 2 - 1) * 0.22;
    const cos = Math.cos(scatter);
    const sin = Math.sin(scatter);
    dirX = dx / d * cos - dy / d * sin;
    dirY = dx / d * sin + dy / d * cos;
    speed = sh.speed * jitter(0.6) / (1 + 0.35 * shard.ringIndex);
  } else if (pattern.mode === "collapse") {
    dirX = (rng() * 2 - 1) * 0.18;
    dirY = 0.15 + rng() * 0.25;
    const n = Math.hypot(dirX, dirY) || 1;
    dirX /= n;
    dirY /= n;
    speed = sh.speed * 0.18 * jitter(0.6);
  } else {
    const side = shard.centroid[0] < pattern.width / 2 ? -1 : 1;
    if (sh.spread === "apart") {
      dirX = side * (0.85 + rng() * 0.15);
      dirY = 0.12 + rng() * 0.18;
    } else if (sh.spread === "slide") {
      dirX = side * (0.5 + rng() * 0.25);
      dirY = 0.35 + rng() * 0.3;
    } else {
      dirX = (rng() * 2 - 1) * 0.35;
      dirY = 0.45 + rng() * 0.4;
    }
    const n = Math.hypot(dirX, dirY) || 1;
    dirX /= n;
    dirY /= n;
    speed = sh.speed * 0.55 * jitter(0.6);
  }
  const sizeFactor = 1 / Math.max(0.45, Math.pow(shard.area / 12e3, 0.25));
  const omega = (rng() * 2 - 1) * sh.spinDegMax * sizeFactor;
  const tumbleX = (rng() * 2 - 1) * sh.tumbleDegMax * sizeFactor;
  const tumbleY = (rng() * 2 - 1) * sh.tumbleDegMax * sizeFactor;
  let birthDelay = shard.ringIndex * sh.staggerPerRing * jitter(1);
  if (pattern.mode === "collapse") {
    birthDelay += rng() * sh.staggerPerRing * 1.5;
  }
  let vx = dirX * speed;
  let vy = dirY * speed;
  let omegaOut = omega;
  if (kind === "rebel") {
    const rr = rngFor(shard.hash, "rebel");
    const ang = (rr() * 2 - 1) * 0.6;
    const cos = Math.cos(ang);
    const sin = Math.sin(ang);
    const rvx = (vx * cos - vy * sin) * 1.35;
    const rvy = (vx * sin + vy * cos) * 1.35;
    vx = rvx;
    vy = rvy;
    omegaOut = omega * 1.6;
    birthDelay = rr() < 0.5 ? birthDelay * 0.15 : birthDelay * 1.8 + 0.05;
  }
  return { v0: [vx, vy], omega: omegaOut, tumbleX, tumbleY, birthDelay };
}
function microMotion(pattern, origin, hash, ringIndex, fx) {
  const rng = rngFor(hash, "micromotion");
  const sh = fx.shatter;
  let dirX;
  let dirY;
  if (pattern.mode === "radial" || pattern.mode === "web") {
    const dx = origin[0] - pattern.impact[0];
    const dy = origin[1] - pattern.impact[1];
    const d = Math.hypot(dx, dy) || 1;
    const scatter = (rng() * 2 - 1) * 0.5;
    const cos = Math.cos(scatter);
    const sin = Math.sin(scatter);
    dirX = dx / d * cos - dy / d * sin;
    dirY = dx / d * sin + dy / d * cos;
  } else if (pattern.mode === "collapse") {
    dirX = (rng() * 2 - 1) * 0.3;
    dirY = 0.5 + rng() * 0.5;
    const n = Math.hypot(dirX, dirY) || 1;
    dirX /= n;
    dirY /= n;
  } else if (fx.shatter.spread !== "fall") {
    const side = origin[0] < pattern.width / 2 ? -1 : 1;
    const lateral = fx.shatter.spread === "apart" ? 0.8 : 0.5;
    dirX = side * lateral + (rng() * 2 - 1) * 0.2;
    dirY = (fx.shatter.spread === "apart" ? 0.2 : 0.5) + rng() * 0.4;
    const n = Math.hypot(dirX, dirY) || 1;
    dirX /= n;
    dirY /= n;
  } else {
    const a = rng() * TAU;
    dirX = Math.cos(a) * 0.4;
    dirY = 0.6 + rng() * 0.5;
    const n = Math.hypot(dirX, dirY) || 1;
    dirX /= n;
    dirY /= n;
  }
  const speed = sh.speed * fx.micro.speedScale * (0.35 + rng() * 0.75) / (1 + 0.25 * ringIndex);
  const omega = (rng() * 2 - 1) * sh.spinDegMax * 3;
  const birthDelay = ringIndex * sh.staggerPerRing * (0.6 + rng() * 0.8);
  return { v0: [dirX * speed, dirY * speed], omega, tumbleX: 0, tumbleY: 0, birthDelay };
}

// src/render/params.ts
var defaultEffectParams = {
  quality: "normal",
  // glass cracks fast, holds (the money frame), then the pieces fall
  timeline: { crackStart: 0.02, crackEnd: 0.2, shatterStart: 0.32 },
  medium: "content",
  refraction: { offsetPx: 6, rotateDeg: 0.9, scaleAmp: 0.016, tiltDeg: 1.6, perspectivePx: 800 },
  optics: { brightnessAmp: 0.13, contrastAmp: 0.07, blurPx: 0.5, lightAngleDeg: -60, grainOpacity: 0.06, trackLight: false },
  chroma: {
    mode: "shadow",
    offsetPx: 2.6,
    angleDeg: 14,
    opacity: 0.5,
    blendMode: "screen",
    colorA: "rgba(255,42,84,0.55)",
    colorB: "rgba(0,212,255,0.55)"
  },
  facet: {
    strength: 0.55,
    tint: "rgba(185,215,255,0.05)",
    opacity: 0.55,
    blendMode: "overlay"
  },
  crackStyle: {
    coreColor: "rgba(255,255,255,0.92)",
    coreWidth: 1.1,
    shadowColor: "rgba(0,0,0,0.5)",
    shadowWidth: 2.4,
    shadowOffsetPx: 1.4,
    widthVariance: 0.6,
    doubleEdge: 0.5,
    subCracks: 0.6,
    brightnessVar: 0.65,
    hackleDensity: 0.55,
    sparkle: true,
    growth: "snap",
    blendMode: "multiply"
  },
  bevel: {
    widthPx: 1.5,
    intensity: 0.7,
    glintStrength: 0.6,
    lightColor: "rgba(255,255,255,0.95)",
    darkColor: "rgba(8,12,18,0.75)",
    blendMode: "screen",
    scatter: 0.65,
    facetVariation: 0.6
  },
  crush: { punch: true, scaleTo: 0.9 },
  outliers: {
    dropFraction: 0.05,
    slipFraction: 0.09,
    rebelFraction: 0.12,
    slipPx: 10,
    slipRotDeg: 2.5
  },
  spectrum: {
    count: 2,
    opacity: 0.3,
    bandWidth: 0.6,
    blendMode: "screen",
    edgeOnly: 0
  },
  edgeDistortion: { widthPx: 10, strength: 0, blurPx: 0.6 },
  shatter: {
    speed: 950,
    gravity: [0, 1250],
    drag: 1.6,
    spinDegMax: 170,
    tumbleDegMax: 70,
    staggerPerRing: 0.035,
    jitter: 0.4,
    fadeOut: [0.86, 1],
    spread: "fall",
    preSpreadPx: 0
  },
  motionBlur: { dt: 0.012, opacityFalloff: 0.5, speedThreshold: 140, smearPx: 14, smearBlurPx: 1.2 },
  micro: { opacity: 0.85, speedScale: 1.5, fill: "rgba(255,255,255,0.85)", fillAlt: "rgba(20,26,34,0.6)" },
  settle: { amplitudePx: 0, frequency: 2.2 },
  float: { bobPx: 10, swayPx: 6, rotDeg: 2.5, cycles: 1 }
};
function normalizeEffectParams(fx) {
  const d = defaultEffectParams;
  if (!fx) return d;
  return {
    quality: fx.quality ?? d.quality,
    timeline: { ...d.timeline, ...fx.timeline },
    medium: fx.medium ?? d.medium,
    refraction: { ...d.refraction, ...fx.refraction },
    optics: { ...d.optics, ...fx.optics },
    chroma: { ...d.chroma, ...fx.chroma },
    facet: { ...d.facet, ...fx.facet },
    crackStyle: { ...d.crackStyle, ...fx.crackStyle },
    bevel: { ...d.bevel, ...fx.bevel },
    crush: { ...d.crush, ...fx.crush },
    outliers: { ...d.outliers, ...fx.outliers },
    spectrum: { ...d.spectrum, ...fx.spectrum },
    edgeDistortion: { ...d.edgeDistortion, ...fx.edgeDistortion },
    shatter: { ...d.shatter, ...fx.shatter },
    motionBlur: { ...d.motionBlur, ...fx.motionBlur },
    micro: { ...d.micro, ...fx.micro },
    settle: { ...d.settle, ...fx.settle },
    float: { ...d.float, ...fx.float }
  };
}

// src/render/quality.ts
var qualityPresets = {
  draft: { chromaGhosts: 0, motionGhosts: 0, smearGhosts: 0, bevel: false, edgeDistortion: false, spectrum: false, stubCap: 0, maxBlurPx: 0, grain: false, microShardCap: 40 },
  normal: { chromaGhosts: 2, motionGhosts: 0, smearGhosts: 2, bevel: true, edgeDistortion: true, spectrum: true, stubCap: 80, maxBlurPx: 2, grain: false, microShardCap: 140 },
  high: { chromaGhosts: 2, motionGhosts: 0, smearGhosts: 3, bevel: true, edgeDistortion: true, spectrum: true, stubCap: 200, maxBlurPx: 4, grain: true, microShardCap: 400 }
};
function resolveQuality(q) {
  if (q === void 0) return qualityPresets.normal;
  if (typeof q === "string") return qualityPresets[q] ?? qualityPresets.normal;
  return { ...qualityPresets.normal, ...q };
}

// src/render/cracks.ts
function crackLayer(pattern, info, fx, q) {
  const style = fx.crackStyle;
  const growthVis = (local) => {
    if (style.growth === "quart") return easeOutQuart(local);
    if (style.growth === "expo") return easeOutExpo(local);
    return local >= 0.4 ? 1 : easeOutQuart(local / 0.4);
  };
  const shAng = degToRad(fx.optics.lightAngleDeg + 180);
  const sox = Math.cos(shAng) * style.shadowOffsetPx;
  const soy = Math.sin(shAng) * style.shadowOffsetPx;
  const shadowRatio = style.shadowWidth / Math.max(1e-3, style.coreWidth);
  const bv = clamp01(style.brightnessVar);
  let core = "";
  let coreDim = "";
  let stubD = "";
  let shadow = "";
  let highlight = "";
  let hackle = "";
  let stubOrdinal = -1;
  for (let ci = 0; ci < pattern.cracks.length; ci++) {
    const crack = pattern.cracks[ci];
    if (crack.kind === "stub") {
      stubOrdinal++;
      if (stubOrdinal >= q.stubCap || style.subCracks <= 0) continue;
      if (hashTo01(hashCombine(pattern.seed, hashString("stub:pick"), stubOrdinal)) >= style.subCracks) continue;
      const local2 = clamp01((info.crackProgress - crack.birth) / Math.max(1e-6, crack.growDuration));
      if (local2 <= 0) continue;
      const vis2 = growthVis(local2) * crack.totalLen;
      const part2 = partialPolylineWithS(unflattenPts(crack.points), crack.cumLen, vis2);
      if (part2.pts.length < 2) continue;
      const frame2 = miterFrame(part2.pts);
      const wSeed2 = hashCombine(pattern.seed, hashString("stubribbon"), stubOrdinal);
      const halfs = [];
      for (let i = 0; i < part2.pts.length; i++) {
        const profile = clamp(1 + style.widthVariance * 1.25 * fbm1D(wSeed2, part2.s[i] * 0.06), 0.35, 2.2);
        const taper = Math.min(1, (vis2 - part2.s[i]) / 9);
        const base = 0.5 * style.coreWidth * 0.4 * profile * Math.max(0, taper);
        halfs.push(Math.min(base, frame2.maxHalf[i]));
      }
      stubD += ribbonPath(part2.pts, frame2, halfs, 0, 0);
      continue;
    }
    const local = clamp01((info.crackProgress - crack.birth) / Math.max(1e-6, crack.growDuration));
    if (local <= 0) continue;
    const vis = growthVis(local) * crack.totalLen;
    const all = unflattenPts(crack.points);
    const part = partialPolylineWithS(all, crack.cumLen, vis);
    if (part.pts.length < 2) continue;
    let brightAt = null;
    if (bv > 0) {
      const rngD = rngFor(pattern.seed, "coreDim", ci);
      const kB = 2 + Math.floor(3 * rngD());
      const bounds = [];
      for (let b = 0; b < kB; b++) bounds.push(rngD() * crack.totalLen);
      bounds.sort((a, b) => a - b);
      brightAt = (s) => {
        if (s < 15) return 1;
        let idx = 0;
        while (idx < bounds.length && bounds[idx] <= s) idx++;
        const inBright = idx % 2 === 0;
        const dPrev = idx > 0 ? s - bounds[idx - 1] : Infinity;
        const dNext = idx < bounds.length ? bounds[idx] - s : Infinity;
        const d = Math.min(dPrev, dNext);
        if (d >= 3) return inBright ? 1 : 0;
        const f = 0.5 + d / 3 * 0.5;
        return inBright ? f : 1 - f;
      };
      const stations = [];
      for (const b of bounds) stations.push(b - 3, b, b + 3);
      insertStations(part, stations.sort((a, b) => a - b), vis);
    }
    const frame = miterFrame(part.pts);
    const wSeed = hashCombine(pattern.seed, hashString("ribbon"), ci);
    const halfCore = [];
    const halfDim = [];
    const halfShadow = [];
    for (let i = 0; i < part.pts.length; i++) {
      const profile = clamp(1 + style.widthVariance * 1.25 * fbm1D(wSeed, part.s[i] * 0.06), 0.35, 2.2);
      const taper = Math.min(1, (vis - part.s[i]) / 9);
      const base = 0.5 * style.coreWidth * profile * Math.max(0, taper);
      const bright = brightAt ? brightAt(part.s[i]) : 1;
      halfCore.push(Math.min(base * bright, frame.maxHalf[i]));
      if (brightAt) halfDim.push(Math.min(base, frame.maxHalf[i]));
      halfShadow.push(Math.min(base * shadowRatio, frame.maxHalf[i] * 1.6));
    }
    core += ribbonPath(part.pts, frame, halfCore, 0, 0);
    if (brightAt) coreDim += ribbonPath(part.pts, frame, halfDim, 0, 0);
    shadow += ribbonPath(part.pts, frame, halfShadow, sox, soy);
    if (style.doubleEdge > 0) {
      const nF = rand01(pattern.seed, "fil", ci) < style.doubleEdge ? rand01(pattern.seed, "fil2", ci) < 0.4 ? 2 : 1 : 0;
      for (let k = 0; k < nF; k++) {
        const r1 = rand01(pattern.seed, "filA", ci, k);
        const r2 = rand01(pattern.seed, "filB", ci, k);
        const r3 = rand01(pattern.seed, "filC", ci, k);
        const r4 = rand01(pattern.seed, "filD", ci, k);
        const s0 = r1 * crack.totalLen * 0.7;
        const sEnd = Math.min(s0 + (0.12 + 0.18 * r2) * crack.totalLen, crack.totalLen, vis);
        if (sEnd - s0 < 6) continue;
        const side = r3 < 0.5 ? 1 : -1;
        const dist = 1.5 + 1.5 * r4;
        let d = "";
        let started = false;
        for (let i = 0; i < part.pts.length; i++) {
          if (part.s[i] < s0 || part.s[i] > sEnd) {
            started = false;
            continue;
          }
          const x = part.pts[i][0] + frame.mx[i] * frame.scale[i] * side * dist;
          const y = part.pts[i][1] + frame.my[i] * frame.scale[i] * side * dist;
          d += `${started ? "L" : "M"}${fmt(x)} ${fmt(y)}`;
          started = true;
        }
        if (d.indexOf("L") >= 0) highlight += d;
      }
    }
    if (style.hackleDensity > 0) {
      const ticks = crack.ticks;
      for (let ti = 0, j = 0; ti + 4 < ticks.length; ti += 5, j++) {
        if (ticks[ti] > vis) continue;
        if (hashTo01(hashCombine(ci, j)) >= style.hackleDensity) continue;
        hackle += `M${fmt(ticks[ti + 1])} ${fmt(ticks[ti + 2])}L${fmt(ticks[ti + 3])} ${fmt(ticks[ti + 4])}`;
      }
    }
  }
  let fadeWindow = 0.07;
  if (fx.medium === "glass") {
    let maxRing = 0;
    for (const s of pattern.shards) if (s.ringIndex > maxRing) maxRing = s.ringIndex;
    fadeWindow = maxRing * fx.shatter.staggerPerRing * 1.4 + 0.07;
  }
  const opacity = info.phase === "shattering" ? clamp01(1 - info.shatterTau / fadeWindow) : 1;
  let sparkle = null;
  if (style.sparkle && pattern.mode === "radial") {
    const [ix, iy] = pattern.impact;
    const rMax = Math.max(
      Math.hypot(ix, iy),
      Math.hypot(pattern.width - ix, iy),
      Math.hypot(ix, pattern.height - iy),
      Math.hypot(pattern.width - ix, pattern.height - iy)
    );
    const punch = fx.crush.punch ? easeOutCubic(clamp01((info.crackProgress - 0.1) * 2.2)) : 0;
    sparkle = {
      cx: ix,
      cy: iy,
      r: rMax * 0.045 * (0.5 + 0.5 * easeOutCubic(info.crackProgress)),
      opacity: easeOutCubic(info.crackProgress) * 0.9 * (1 - punch)
    };
  }
  return {
    corePath: core,
    coreDimPath: coreDim,
    stubPath: stubD,
    shadowPath: shadow,
    highlightPath: highlight,
    hacklePath: hackle,
    coreDimOpacity: Math.max(0.35, 1 - 0.65 * bv),
    coreOpacity: bv > 0 ? Math.min(1, bv / 0.25) : 1,
    opacity,
    style,
    sparkle
  };
}
function partialPolylineWithS(pts, cum, vis) {
  const total = cum[cum.length - 1];
  if (vis <= 0) return { pts: [], s: [] };
  if (vis >= total) return { pts: pts.slice(), s: cum.slice() };
  const outP = [pts[0]];
  const outS = [0];
  for (let i = 1; i < pts.length; i++) {
    if (cum[i] <= vis) {
      outP.push(pts[i]);
      outS.push(cum[i]);
    } else {
      const segLen = cum[i] - cum[i - 1];
      const t = segLen > 1e-12 ? (vis - cum[i - 1]) / segLen : 0;
      outP.push([
        pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t,
        pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t
      ]);
      outS.push(vis);
      break;
    }
  }
  return { pts: outP, s: outS };
}
function insertStations(part, stations, vis) {
  for (const st of stations) {
    if (st <= 0.05 || st >= Math.min(vis, part.s[part.s.length - 1]) - 0.05) continue;
    let i = 0;
    while (i < part.s.length && part.s[i] <= st) i++;
    if (i === 0 || i >= part.s.length) continue;
    if (st - part.s[i - 1] < 0.05 || part.s[i] - st < 0.05) continue;
    const t = (st - part.s[i - 1]) / (part.s[i] - part.s[i - 1]);
    part.pts.splice(i, 0, [
      part.pts[i - 1][0] + (part.pts[i][0] - part.pts[i - 1][0]) * t,
      part.pts[i - 1][1] + (part.pts[i][1] - part.pts[i - 1][1]) * t
    ]);
    part.s.splice(i, 0, st);
  }
}
function miterFrame(pts) {
  const n = pts.length;
  const segNx = [];
  const segNy = [];
  const segL = [];
  for (let i = 0; i < n - 1; i++) {
    const dx = pts[i + 1][0] - pts[i][0];
    const dy = pts[i + 1][1] - pts[i][1];
    const l = Math.hypot(dx, dy) || 1e-9;
    segNx.push(-dy / l);
    segNy.push(dx / l);
    segL.push(l);
  }
  const mx = [];
  const my = [];
  const scale = [];
  const maxHalf = [];
  for (let i = 0; i < n; i++) {
    const a = i === 0 ? 0 : i - 1;
    const b = i === n - 1 ? n - 2 : i;
    let x = segNx[a] + segNx[b];
    let y = segNy[a] + segNy[b];
    const l = Math.hypot(x, y);
    if (l < 1e-9) {
      x = segNx[b];
      y = segNy[b];
    } else {
      x /= l;
      y /= l;
    }
    const dot = x * segNx[b] + y * segNy[b];
    mx.push(x);
    my.push(y);
    scale.push(Math.min(2, 1 / Math.max(0.35, dot)));
    maxHalf.push(0.4 * Math.min(segL[a], segL[b]));
  }
  return { mx, my, scale, maxHalf };
}
function ribbonPath(pts, frame, halfWs, ox, oy) {
  const n = pts.length;
  if (n < 2) return "";
  let left = "";
  let right = "";
  for (let i = 0; i < n; i++) {
    const w = halfWs[i] * frame.scale[i];
    const lx = pts[i][0] + frame.mx[i] * w + ox;
    const ly = pts[i][1] + frame.my[i] * w + oy;
    left += `${i === 0 ? "M" : "L"}${fmt(lx)} ${fmt(ly)}`;
    const rx = pts[i][0] - frame.mx[i] * w + ox;
    const ry = pts[i][1] - frame.my[i] * w + oy;
    right = `L${fmt(rx)} ${fmt(ry)}` + right;
  }
  return left + right + "Z";
}

// src/motion/settle.ts
function floatOffset(t, shardHash, f) {
  if (f.bobPx <= 0 && f.swayPx <= 0 && f.rotDeg <= 0) return { dx: 0, dy: 0, rot: 0 };
  const phaseA = hashTo01(hashCombine(shardHash, 41)) * TAU;
  const phaseB = hashTo01(hashCombine(shardHash, 53)) * TAU;
  const phaseC = hashTo01(hashCombine(shardHash, 67)) * TAU;
  const w = TAU * f.cycles;
  return {
    dx: Math.sin(w * t + phaseA) * f.swayPx,
    dy: Math.sin(w * t + phaseB) * f.bobPx,
    rot: Math.sin(w * t + phaseC) * f.rotDeg
  };
}
function settleOffset(t, shardHash, amplitudePx, frequency, sinceT) {
  if (amplitudePx <= 0) return { dx: 0, dy: 0, rot: 0 };
  const tau = Math.max(0, t - sinceT);
  const damp = Math.exp(-3.2 * tau);
  const phaseA = hashTo01(hashCombine(shardHash, 11)) * TAU;
  const phaseB = hashTo01(hashCombine(shardHash, 23)) * TAU;
  const w = TAU * frequency;
  return {
    dx: Math.sin(w * tau + phaseA) * amplitudePx * damp,
    dy: Math.cos(w * tau * 0.9 + phaseB) * amplitudePx * 0.7 * damp,
    rot: Math.sin(w * tau * 0.75 + phaseA + phaseB) * amplitudePx * 0.12 * damp
  };
}

// src/render/shardStyle.ts
var BEVEL_SECTORS = 12;
var staticCache = /* @__PURE__ */ new WeakMap();
function staticShardStrings(pattern) {
  let entry = staticCache.get(pattern);
  if (!entry) {
    entry = {
      clip: pattern.shards.map((s) => toCssPolygon(s.outsetPolygon)),
      innerClip: pattern.shards.map((s) => toCssPolygon(s.polygon)),
      origin: pattern.shards.map((s) => `${fmt(s.centroid[0])}px ${fmt(s.centroid[1])}px`),
      bevel: pattern.shards.map((s) => bevelSectors(s, pattern.width, pattern.height))
    };
    staticCache.set(pattern, entry);
  }
  return entry;
}
var BEVEL_SCATTER_KEY = hashString("bevelScatter");
var BEVEL_SPEC_FRACTION = 0.3;
var BEVEL_INTRINSIC_KEY = hashString("bevelIntrinsic");
var BEVEL_JITTER_KEY = hashString("bevelJitter");
function bevelSectors(shard, w, h) {
  const poly = shard.polygon;
  const n = poly.length / 2;
  const full = new Array(BEVEL_SECTORS).fill("");
  const spec = new Array(BEVEL_SECTORS).fill("");
  const shaded = new Array(BEVEL_SECTORS).fill("");
  const eps = 0.75;
  const onSameBorder = (x1, y1, x2, y2) => x1 < eps && x2 < eps || x1 > w - eps && x2 > w - eps || y1 < eps && y2 < eps || y1 > h - eps && y2 > h - eps;
  for (let i = 0; i < n; i++) {
    const x1 = poly[i * 2];
    const y1 = poly[i * 2 + 1];
    const j = (i + 1) % n;
    const x2 = poly[j * 2];
    const y2 = poly[j * 2 + 1];
    if (onSameBorder(x1, y1, x2, y2)) continue;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    if (len < 0.5) continue;
    let ang = Math.atan2(-dx, dy);
    if (ang < 0) ang += TAU;
    const sector = Math.min(BEVEL_SECTORS - 1, Math.floor(ang / TAU * BEVEL_SECTORS));
    const seg = `M${fmt(x1)} ${fmt(y1)}L${fmt(x2)} ${fmt(y2)}`;
    full[sector] += seg;
    if (hashTo01(hashCombine(shard.hash, BEVEL_SCATTER_KEY, i)) < BEVEL_SPEC_FRACTION) {
      spec[sector] += seg;
    } else {
      shaded[sector] += seg;
    }
  }
  const out = [];
  for (let s = 0; s < BEVEL_SECTORS; s++) {
    if (full[s]) {
      out.push({
        dFull: full[s],
        dSpec: spec[s],
        dShaded: shaded[s],
        angle: (s + 0.5) / BEVEL_SECTORS * TAU,
        intrinsic: 0.45 + 0.55 * hashTo01(hashCombine(shard.hash, BEVEL_INTRINSIC_KEY, s)),
        jitter: (hashTo01(hashCombine(shard.hash, BEVEL_JITTER_KEY, s)) - 0.5) * 0.8
      });
    }
  }
  return out;
}
function shardPose(hash, fx) {
  const rng = rngFor(hash, "pose");
  return {
    refrAngle: rng() * TAU,
    refrMag: fx.refraction.offsetPx * (0.4 + 0.6 * rng()),
    rotZ: fx.refraction.rotateDeg * (rng() * 2 - 1),
    scaleDev: fx.refraction.scaleAmp * (rng() * 2 - 1),
    tiltAxis: rng() * TAU,
    tiltMag: fx.refraction.tiltDeg * (0.35 + 0.65 * rng()),
    facetAngle: rng() * 360,
    facetMag: 0.6 + 0.4 * rng(),
    contrastSign: rng() < 0.5 ? -1 : 1,
    chromaMagF: 0.55 + 0.45 * rng()
  };
}
function rotate2D(x, y, rad) {
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return [x * c - y * s, x * s + y * c];
}
function gravityDir(g) {
  const l = Math.hypot(g[0], g[1]);
  return l > 1e-6 ? [g[0] / l, g[1] / l] : [0, 1];
}
function buildShardFrame(t, pattern, shard, shardIndex, info, fx, q, pose, kind, spectral) {
  const statics = staticShardStrings(pattern);
  const ease = easeOutCubic(info.crackProgress);
  const lightRad = degToRad(fx.optics.lightAngleDeg);
  const motion = shardMotion(pattern, shard, fx, kind);
  const tau = Math.max(0, info.shatterTau - motion.birthDelay);
  const flying = info.phase === "shattering" && tau > 0;
  const [fdx, fdy] = flightOffset(tau, motion.v0, fx.shatter.gravity, fx.shatter.drag);
  const spin = motion.omega * tau;
  const tumX = clamp(motion.tumbleX * tau, -78, 78);
  const tumY = clamp(motion.tumbleY * tau, -78, 78);
  const speed = flying ? flightSpeed(tau, motion.v0, fx.shatter.gravity, fx.shatter.drag) : 0;
  const speedStrength = clamp01((speed - fx.motionBlur.speedThreshold) / (fx.motionBlur.speedThreshold * 2));
  const st = info.phase === "cracked" ? settleOffset(t, shard.hash, fx.settle.amplitudePx, fx.settle.frequency, 0) : { dx: 0, dy: 0, rot: 0 };
  let preDx = 0;
  if (info.phase === "cracked" && pattern.mode === "title" && fx.shatter.preSpreadPx > 0) {
    const side = shard.centroid[0] < pattern.width / 2 ? -1 : 1;
    preDx = side * fx.shatter.preSpreadPx * ease;
  }
  let opacity = 1;
  if (info.phase === "shattering") {
    const [f0, f1] = fx.shatter.fadeOut;
    opacity = 1 - clamp01((t - f0) / Math.max(1e-6, f1 - f0));
  }
  const isCrush = pattern.mode === "radial" && shard.ringIndex === 0;
  const punch = isCrush && fx.crush.punch ? easeOutCubic(clamp01((info.crackProgress - 0.1) * 2.2)) : 0;
  let dropEase = 0;
  if (kind === "dropped") {
    const dropStart = 0.45 + 0.3 * hashTo01(hashCombine(shard.hash, hashString("outlier:dropT")));
    dropEase = easeOutCubic(clamp01((info.crackProgress - dropStart) / 0.25));
  }
  const vanish = Math.max(punch, dropEase);
  opacity *= 1 - vanish;
  const gdir = gravityDir(fx.shatter.gravity);
  const sinkPx = clamp(0.12 * Math.sqrt(shard.area / Math.PI), 1.5, 5) * vanish;
  const rigidScale = (1 - (1 - fx.crush.scaleTo) * punch) * (1 - 0.05 * dropEase);
  let slipDx = 0;
  let slipDy = 0;
  let slipRot = 0;
  if (kind === "slipped") {
    const slipMagF = hashTo01(hashCombine(shard.hash, hashString("outlier:slipMag")));
    const slipSign = hashTo01(hashCombine(shard.hash, hashString("outlier:slipRot"))) < 0.5 ? -1 : 1;
    const slipJit = hashTo01(hashCombine(shard.hash, hashString("outlier:slipDir")));
    let dir;
    if (pattern.mode === "radial" || pattern.mode === "web") {
      const dx = shard.centroid[0] - pattern.impact[0];
      const dy = shard.centroid[1] - pattern.impact[1];
      const l = Math.hypot(dx, dy) || 1;
      dir = [dx / l, dy / l];
    } else {
      dir = gdir;
    }
    const rotated = rotate2D(dir[0], dir[1], (slipJit - 0.5) * 0.9);
    const mag = fx.outliers.slipPx * (0.6 + 0.8 * slipMagF) * ease;
    slipDx = rotated[0] * mag;
    slipDy = rotated[1] * mag;
    slipRot = slipSign * fx.outliers.slipRotDeg * (0.5 + slipMagF) * ease;
  }
  const fl = pattern.mode === "hero" ? floatOffset(t, shard.hash, fx.float) : { dx: 0, dy: 0, rot: 0 };
  const rigidDx = fdx + st.dx + slipDx + fl.dx + preDx + gdir[0] * sinkPx;
  const rigidDy = fdy + st.dy + slipDy + fl.dy + gdir[1] * sinkPx;
  const rigidRot = spin + st.rot + slipRot + fl.rot;
  const glass = fx.medium === "glass";
  const glassInv = glass ? {
    dx: Number(fmt(rigidDx)),
    dy: Number(fmt(rigidDy)),
    rot: Number(fmt(rigidRot, 3)),
    scale: Number(fmt(Math.max(rigidScale, 0.05), 4))
  } : null;
  const glassWrap = (core) => glassInv ? `scale(${fmt(1 / glassInv.scale, 6)}) rotate(${fmt(-glassInv.rot, 3)}deg) ${core} translate(${fmt(-glassInv.dx)}px, ${fmt(-glassInv.dy)}px)` : core;
  let shardTransform;
  if (glassInv) {
    shardTransform = `translate(${fmt(glassInv.dx)}px, ${fmt(glassInv.dy)}px) rotate(${fmt(glassInv.rot, 3)}deg) scale(${fmt(glassInv.scale, 4)})`;
  } else {
    shardTransform = `translate(${fmt(rigidDx)}px, ${fmt(rigidDy)}px)`;
    if (fx.shatter.tumbleDegMax > 0 && flying) {
      shardTransform += ` perspective(${fmt(fx.refraction.perspectivePx)}px) rotateX(${fmt(tumX, 3)}deg) rotateY(${fmt(tumY, 3)}deg)`;
    }
    shardTransform += ` rotate(${fmt(rigidRot, 3)}deg) scale(${fmt(rigidScale, 4)})`;
  }
  const refDx = Math.cos(pose.refrAngle) * pose.refrMag * ease;
  const refDy = Math.sin(pose.refrAngle) * pose.refrMag * ease;
  const refRot = pose.rotZ * ease;
  const refScale = 1 + pose.scaleDev * ease;
  const tiltX = Math.sin(pose.tiltAxis) * pose.tiltMag * ease;
  const tiltY = Math.cos(pose.tiltAxis) * pose.tiltMag * ease;
  let refrCore = `translate(${fmt(refDx)}px, ${fmt(refDy)}px)`;
  if (fx.refraction.tiltDeg > 0) {
    refrCore += ` perspective(${fmt(fx.refraction.perspectivePx)}px) rotateX(${fmt(tiltX, 3)}deg) rotateY(${fmt(tiltY, 3)}deg)`;
  }
  refrCore += ` rotate(${fmt(refRot, 3)}deg) scale(${fmt(refScale, 4)})`;
  const contentTransform = glassWrap(refrCore);
  const live = fx.optics.trackLight;
  const lightDot = live ? Math.cos(pose.tiltAxis + degToRad(rigidRot) - lightRad) * (0.35 + 0.65 * (pose.tiltMag / Math.max(1e-3, fx.refraction.tiltDeg || 1))) : Math.cos(pose.tiltAxis - lightRad) * (0.35 + 0.65 * (pose.tiltMag / Math.max(1e-3, fx.refraction.tiltDeg || 1)));
  const brightness = 1 + fx.optics.brightnessAmp * lightDot * ease;
  const contrast = 1 + fx.optics.contrastAmp * pose.contrastSign * ease;
  const smearBlurAdd = flying ? fx.motionBlur.smearBlurPx * speedStrength : 0;
  const blurPx = clamp(clamp(fx.optics.blurPx, 0, q.maxBlurPx) * ease + smearBlurAdd, 0, q.maxBlurPx);
  const chromaScale = (ease + (flying ? Math.min(1, tau * 2.2) : 0)) * pose.chromaMagF;
  let chDx;
  let chDy;
  if (live) {
    const chRadLive = degToRad(fx.chroma.angleDeg - rigidRot);
    chDx = Math.cos(chRadLive) * fx.chroma.offsetPx * chromaScale;
    chDy = Math.sin(chRadLive) * fx.chroma.offsetPx * chromaScale;
  } else {
    const chRad = degToRad(fx.chroma.angleDeg);
    chDx = Math.cos(chRad) * fx.chroma.offsetPx * chromaScale;
    chDy = Math.sin(chRad) * fx.chroma.offsetPx * chromaScale;
  }
  let contentFilter = `brightness(${fmt(brightness, 3)}) contrast(${fmt(contrast, 3)})`;
  const smearFilter = contentFilter;
  if (blurPx > 0.02) contentFilter += ` blur(${fmt(blurPx, 2)}px)`;
  if (fx.chroma.mode === "shadow" && fx.chroma.offsetPx > 0) {
    contentFilter += ` drop-shadow(${fmt(chDx)}px ${fmt(chDy)}px 0 ${fx.chroma.colorA}) drop-shadow(${fmt(-chDx)}px ${fmt(-chDy)}px 0 ${fx.chroma.colorB})`;
  }
  const chroma = [];
  if (fx.chroma.mode === "ghost" && q.chromaGhosts > 0 && fx.chroma.offsetPx > 0) {
    let gChDx = chDx;
    let gChDy = chDy;
    if (glass) {
      const gRad = degToRad(live ? fx.chroma.angleDeg : fx.chroma.angleDeg + rigidRot);
      gChDx = Math.cos(gRad) * fx.chroma.offsetPx * chromaScale;
      gChDy = Math.sin(gRad) * fx.chroma.offsetPx * chromaScale;
    }
    const signs = q.chromaGhosts === 1 ? [1] : [1, -1];
    for (const sign of signs) {
      chroma.push({
        transform: glassWrap(
          `translate(${fmt(refDx + sign * gChDx)}px, ${fmt(refDy + sign * gChDy)}px) rotate(${fmt(refRot, 3)}deg) scale(${fmt(refScale, 4)})`
        ),
        filter: `hue-rotate(${sign > 0 ? 115 : -115}deg) saturate(1.7)`,
        mixBlendMode: fx.chroma.blendMode,
        opacity: fx.chroma.opacity * ease * opacity
      });
    }
  }
  const facetAngleOut = live ? pose.facetAngle - rigidRot : pose.facetAngle;
  const facetWhite = fx.facet.strength * 0.65 * pose.facetMag;
  const facetBlack = fx.facet.strength * 0.5 * pose.facetMag;
  let facet = null;
  if (fx.facet.opacity > 0 && fx.facet.strength > 0) {
    let background = `linear-gradient(${fmt(facetAngleOut, 1)}deg, rgba(255,255,255,${fmt(facetWhite, 3)}) 0%, rgba(255,255,255,0) 38%, rgba(0,0,0,0) 62%, rgba(0,0,0,${fmt(facetBlack, 3)}) 100%)`;
    if (fx.facet.tint) background += `, linear-gradient(0deg, ${fx.facet.tint}, ${fx.facet.tint})`;
    facet = {
      background,
      mixBlendMode: fx.facet.blendMode,
      opacity: fx.facet.opacity * ease * opacity
    };
  }
  const wantEdge = q.edgeDistortion && fx.edgeDistortion.strength > 0 && fx.edgeDistortion.widthPx > 0.5;
  const wantSpectrumRing = spectral !== null && fx.spectrum.edgeOnly > 0;
  let ringD = "";
  let ringClipCss = "";
  if (wantEdge || wantSpectrumRing) {
    const inner = insetPolygonTowardCentroid(shard.polygon, shard.centroid, fx.edgeDistortion.widthPx);
    ringD = ringPathD(shard.polygon, inner);
    ringClipCss = `path("${ringD}")`;
  }
  let edge = null;
  if (wantEdge) {
    const k = 1 + 1.6 * fx.edgeDistortion.strength;
    const eDx = refDx * k;
    const eDy = refDy * k;
    const eRot = refRot * (1 + 0.6 * fx.edgeDistortion.strength);
    const eScale = refScale * (1 + 0.045 * fx.edgeDistortion.strength * ease);
    let edgeCore = `translate(${fmt(eDx)}px, ${fmt(eDy)}px)`;
    if (fx.refraction.tiltDeg > 0) {
      edgeCore += ` perspective(${fmt(fx.refraction.perspectivePx)}px) rotateX(${fmt(tiltX, 3)}deg) rotateY(${fmt(tiltY, 3)}deg)`;
    }
    edgeCore += ` rotate(${fmt(eRot, 3)}deg) scale(${fmt(eScale, 4)})`;
    const eBlur = clamp(fx.edgeDistortion.blurPx, 0, q.maxBlurPx);
    let edgeFilter = contentFilter;
    if (eBlur > 0.02) edgeFilter += ` blur(${fmt(eBlur, 2)}px)`;
    edge = {
      clipPath: ringClipCss,
      d: ringD,
      transform: glassWrap(edgeCore),
      filter: edgeFilter,
      opacity: ease,
      // ramps in with the crack network; the wrapper already carries shard opacity
      dx: eDx,
      dy: eDy,
      rot: eRot,
      scale: eScale
    };
  }
  let spectrum = null;
  if (spectral) {
    const specAngle = live ? fx.optics.lightAngleDeg - rigidRot : fx.optics.lightAngleDeg;
    const cssAngle = live ? specAngle + 90 : fx.optics.lightAngleDeg + 90;
    const c = spectral.center01 * 100;
    const hw = spectral.width01 * 100 / 2;
    const stops = `rgba(255,70,70,0) ${fmt(c - hw, 2)}%, rgba(255,70,70,0.85) ${fmt(c - hw * 0.6, 2)}%, rgba(255,210,70,0.85) ${fmt(c - hw * 0.25, 2)}%, rgba(110,255,150,0.85) ${fmt(c, 2)}%, rgba(80,200,255,0.85) ${fmt(c + hw * 0.35, 2)}%, rgba(170,100,255,0.85) ${fmt(c + hw * 0.65, 2)}%, rgba(170,100,255,0) ${fmt(c + hw, 2)}%`;
    const glint = Math.max(0, Math.cos(degToRad(rigidRot)));
    spectrum = {
      background: `linear-gradient(${fmt(cssAngle, 1)}deg, ${stops})`,
      mixBlendMode: fx.spectrum.blendMode,
      opacity: fx.spectrum.opacity * ease * opacity * glint,
      angleDeg: specAngle,
      center01: spectral.center01,
      width01: spectral.width01
    };
    if (wantSpectrumRing) {
      spectrum.clipPath = ringClipCss;
      spectrum.d = ringD;
    }
  }
  const bevel = [];
  if (q.bevel && fx.bevel.intensity > 0) {
    const spinRad = degToRad(rigidRot);
    const glintBoost = flying ? 1 + fx.bevel.glintStrength * Math.min(1, tau * 3) : 1;
    const sigma = clamp01(fx.bevel.scatter);
    const fv = clamp01(fx.bevel.facetVariation);
    const fl2 = (x) => fv > 0 && x < 1e-6 ? 0 : x;
    for (const sec of statics.bevel[shardIndex]) {
      const Lang = fv > 0 ? sec.angle + fv * sec.jitter : sec.angle;
      const L = Math.cos(Lang + spinRad - lightRad);
      const im = fv > 0 ? 1 - fv + fv * sec.intrinsic : 1;
      if (sigma <= 0) {
        const lit = L > 0;
        const mag = Math.min(1, Math.pow(Math.abs(L), 1.2) * fx.bevel.intensity * ease * opacity * glintBoost);
        bevel.push({ d: sec.dFull, stroke: fx.bevel.lightColor, mixBlendMode: fx.bevel.blendMode, opacity: fl2((lit ? mag : 0) * im) });
        bevel.push({ d: sec.dFull, stroke: fx.bevel.darkColor, mixBlendMode: "normal", opacity: fl2((lit ? 0 : Math.min(1, mag * 0.5)) * im) });
        continue;
      }
      const base = fx.bevel.intensity * ease * opacity * im;
      const gP = Math.pow(Math.max(0, L), 1.2) * glintBoost;
      const gM = Math.pow(Math.max(0, -L), 1.2) * glintBoost;
      const att = 1 - sigma;
      if (sec.dSpec) {
        const litOp = Math.min(1, base * (gP + sigma * (0.35 + 0.65 * gP - gP)));
        const darkOp = Math.min(1, 0.5 * base * att * att * gM);
        bevel.push({ d: sec.dSpec, stroke: fx.bevel.darkColor, mixBlendMode: "normal", opacity: fl2(darkOp) });
        bevel.push({ d: sec.dSpec, stroke: fx.bevel.lightColor, mixBlendMode: fx.bevel.blendMode, opacity: fl2(litOp) });
      }
      if (sec.dShaded) {
        const cross = 1 - 0.88 * sigma;
        const litOp = Math.min(1, base * gP * cross * cross);
        const darkOp = Math.min(1, 0.5 * base * (gM + sigma * (0.75 + 0.25 * gM - gM)));
        bevel.push({ d: sec.dShaded, stroke: fx.bevel.darkColor, mixBlendMode: "normal", opacity: fl2(darkOp) });
        bevel.push({ d: sec.dShaded, stroke: fx.bevel.lightColor, mixBlendMode: fx.bevel.blendMode, opacity: fl2(litOp) });
      }
    }
  }
  const smear = [];
  if (q.smearGhosts > 0) {
    const active = !glass && flying && speedStrength > 0;
    let deltas = [];
    if (active) {
      const raw = [];
      for (let k = 1; k <= q.smearGhosts; k++) {
        const tk = Math.max(0, tau - k * fx.motionBlur.dt);
        const [gx, gy] = flightOffset(tk, motion.v0, fx.shatter.gravity, fx.shatter.drag);
        raw.push([gx - fdx, gy - fdy]);
      }
      const last = raw[raw.length - 1];
      const lastLen = Math.hypot(last[0], last[1]);
      const capScale = lastLen > 1e-6 ? Math.min(1, fx.motionBlur.smearPx / lastLen) : 0;
      deltas = raw.map(([x, y]) => rotate2D(x * capScale, y * capScale, -degToRad(rigidRot)));
    }
    for (let k = 0; k < q.smearGhosts; k++) {
      const d = deltas[k];
      const op = active && d ? opacity * speedStrength * Math.pow(fx.motionBlur.opacityFalloff, k + 1) : 0;
      smear.push({
        transform: d ? `translate(${fmt(d[0])}px, ${fmt(d[1])}px) ${contentTransform}` : contentTransform,
        dx: d ? d[0] : 0,
        dy: d ? d[1] : 0,
        opacity: op
      });
    }
  }
  const ghosts = [];
  const ghostCount = glass ? 0 : Math.min(q.motionGhosts, fx.motionBlur.ghosts ?? q.motionGhosts);
  if (flying && ghostCount > 0 && speedStrength > 0) {
    for (let k = 1; k <= ghostCount; k++) {
      const tk = tau - k * fx.motionBlur.dt;
      if (tk <= 0) break;
      const [gx, gy] = flightOffset(tk, motion.v0, fx.shatter.gravity, fx.shatter.drag);
      let gt = `translate(${fmt(gx + st.dx)}px, ${fmt(gy + st.dy)}px)`;
      if (fx.shatter.tumbleDegMax > 0) {
        gt += ` perspective(${fmt(fx.refraction.perspectivePx)}px) rotateX(${fmt(clamp(motion.tumbleX * tk, -78, 78), 3)}deg) rotateY(${fmt(clamp(motion.tumbleY * tk, -78, 78), 3)}deg)`;
      }
      gt += ` rotate(${fmt(motion.omega * tk, 3)}deg)`;
      ghosts.push({
        shardTransform: gt,
        opacity: opacity * speedStrength * Math.pow(fx.motionBlur.opacityFalloff, k)
      });
    }
  }
  return {
    id: shard.id,
    clipPath: statics.clip[shardIndex],
    innerClipPath: statics.innerClip[shardIndex],
    transformOrigin: statics.origin[shardIndex],
    shardTransform,
    contentTransform,
    contentFilter,
    opacity,
    zIndex: (shard.z + 1) * 10,
    facet,
    spectrum,
    edge,
    chroma,
    ghosts,
    smear,
    smearFilter,
    bevel,
    raw: {
      // glass: tumble is hard-disabled and the scale is clamped (matches raw.glass and the
      // emitted strings, so a consumer composing from raw.rigid stays in lockstep)
      rigid: {
        dx: rigidDx,
        dy: rigidDy,
        rotZ: rigidRot,
        rotX: glass ? 0 : tumX,
        rotY: glass ? 0 : tumY,
        scale: glassInv ? glassInv.scale : rigidScale
      },
      refraction: { dx: refDx, dy: refDy, rot: refRot, scale: refScale, tiltX, tiltY },
      glass: glassInv,
      brightness,
      contrast,
      blurPx,
      chromaDx: chDx,
      chromaDy: chDy,
      facetAngleDeg: facetAngleOut,
      facetWhite,
      facetBlack
    }
  };
}

// src/render/frame.ts
function computeFrame(t, pattern, fxPartial) {
  const tc = clamp01(t);
  const fx = normalizeEffectParams(fxPartial);
  const q = resolveQuality(fx.quality);
  const info = resolvePhase(tc, fx.timeline);
  const poses = pattern.shards.map((s) => shardPose(s.hash, fx));
  const kinds = assignOutliers(pattern, fx.outliers);
  const spectral = selectSpectral(pattern, poses, fx, q.spectrum);
  const shards = pattern.shards.map(
    (s, i) => buildShardFrame(tc, pattern, s, i, info, fx, q, poses[i], kinds[i], spectral[i])
  );
  const cracks = crackLayer(pattern, info, fx, q);
  const microCount = Math.min(pattern.micro.length, q.microShardCap);
  const micro = [];
  for (let i = 0; i < microCount; i++) {
    const m = pattern.micro[i];
    const visible = clamp01((info.crackProgress - m.birth) / 0.05);
    const mm = microMotion(pattern, m.origin, m.hash, m.ringIndex, fx);
    const tau = info.phase === "shattering" ? Math.max(0, info.shatterTau - mm.birthDelay) : 0;
    const [fdx, fdy] = flightOffset(tau, mm.v0, fx.shatter.gravity, fx.shatter.drag);
    const twinklePhase = hashTo01(hashCombine(m.hash, 77)) * 6.283;
    const twinkle = 0.8 + 0.2 * Math.sin(tc * 21 + twinklePhase);
    let opacity = visible * fx.micro.opacity * twinkle;
    if (info.phase === "shattering") {
      const [f0, f1] = fx.shatter.fadeOut;
      opacity *= 1 - clamp01((tc - (f0 - 0.04)) / Math.max(1e-6, f1 - f0));
    }
    micro.push({
      id: m.id,
      points: toSvgPoints(m.polygon),
      transform: `translate(${fmt(m.origin[0] + fdx)} ${fmt(m.origin[1] + fdy)}) rotate(${fmt(mm.omega * tau, 2)})`,
      opacity: Math.max(0, Math.min(1, opacity)),
      fill: hashTo01(hashCombine(m.hash, 5)) < 0.72 ? fx.micro.fill : fx.micro.fillAlt
    });
  }
  return {
    t: tc,
    phase: info.phase,
    shards,
    cracks,
    micro,
    grain: q.grain ? { opacity: fx.optics.grainOpacity } : null
  };
}
function selectSpectral(pattern, poses, fx, enabled) {
  const out = pattern.shards.map(() => null);
  if (!enabled || fx.spectrum.count <= 0 || fx.spectrum.opacity <= 0) return out;
  const lightRad = degToRad(fx.optics.lightAngleDeg);
  const dirX = Math.cos(lightRad);
  const dirY = Math.sin(lightRad);
  const w = pattern.width;
  const h = pattern.height;
  const corners = [
    [0, 0],
    [w, 0],
    [w, h],
    [0, h]
  ];
  let tMin = Infinity;
  let tMax = -Infinity;
  for (const c of corners) {
    const p = c[0] * dirX + c[1] * dirY;
    if (p < tMin) tMin = p;
    if (p > tMax) tMax = p;
  }
  const span = Math.max(1e-6, tMax - tMin);
  const minArea = 0.02 * w * h;
  let candidates = [];
  for (let i = 0; i < pattern.shards.length; i++) {
    if (pattern.shards[i].area >= minArea) candidates.push(i);
  }
  if (candidates.length === 0) candidates = pattern.shards.map((_, i) => i);
  const edgeOnly = clamp(fx.spectrum.edgeOnly, 0, 1);
  let maxArea = 1;
  if (edgeOnly > 0) {
    for (const i of candidates) maxArea = Math.max(maxArea, pattern.shards[i].area);
  }
  const score = (i) => {
    const align = Math.cos(poses[i].tiltAxis - lightRad);
    return edgeOnly > 0 ? align + 1.2 * edgeOnly * (1 - pattern.shards[i].area / maxArea) : align;
  };
  candidates.sort((a, b) => score(b) - score(a) || a - b);
  const picked = candidates.slice(0, Math.min(fx.spectrum.count, candidates.length));
  for (const i of picked) {
    const s = pattern.shards[i];
    const rng = rngFor(s.hash, "spectrum");
    const centroidT = (s.centroid[0] * dirX + s.centroid[1] * dirY - tMin) / span;
    let eMin = Infinity;
    let eMax = -Infinity;
    for (let p = 0; p + 1 < s.polygon.length; p += 2) {
      const pr = s.polygon[p] * dirX + s.polygon[p + 1] * dirY;
      if (pr < eMin) eMin = pr;
      if (pr > eMax) eMax = pr;
    }
    const extent01 = (eMax - eMin) / span;
    const baseCenter = clamp(centroidT + (rng() - 0.5) * 0.12, 0.05, 0.95);
    const baseWidth = clamp(extent01 * fx.spectrum.bandWidth, 0.02, 0.5);
    const rimCenter = clamp((eMax - tMin) / span - baseWidth * 0.3, 0.05, 0.95);
    out[i] = {
      center01: baseCenter + (rimCenter - baseCenter) * edgeOnly,
      width01: baseWidth * (1 - 0.55 * edgeOnly)
    };
  }
  return out;
}

// src/motion/presets.ts
var impactTimeline = { crackStart: 0, crackEnd: 0.2, shatterStart: 0.25 };
var suspenseTimeline = { crackStart: 0, crackEnd: 0.55, shatterStart: 0.72 };
var hardBlastShatter = {
  speed: 1600,
  gravity: [0, 420],
  drag: 1,
  spinDegMax: 200,
  tumbleDegMax: 80,
  staggerPerRing: 0.03
};
var gentleCrumbleShatter = {
  speed: 280,
  gravity: [0, 2200],
  drag: 0.6,
  spinDegMax: 70,
  tumbleDegMax: 28,
  staggerPerRing: 0.07
};
var motionPresets = {
  impact: { label: "Impact - hard blast", timeline: impactTimeline, shatter: hardBlastShatter },
  suspense: { label: "Suspense - long crack, late shatter", timeline: suspenseTimeline },
  crumble: { label: "Crumble - reluctant gravity fall", shatter: gentleCrumbleShatter },
  poster: { label: "Poster - static cracked, no shatter", timeline: staticCrackedTimeline }
};

// src/index.ts
var collapseShatterPreset = {
  speed: 300,
  gravity: [0, 2200],
  drag: 0.6,
  spinDegMax: 80,
  tumbleDegMax: 30,
  staggerPerRing: 0.05
};
export {
  collapseShatterPreset,
  computeFrame,
  defaultEffectParams,
  flightOffset,
  flightSpeed,
  generateFracture,
  gentleCrumbleShatter,
  hardBlastShatter,
  impactTimeline,
  motionPresets,
  normalizeEffectParams,
  qualityPresets,
  resolvePhase,
  resolveQuality,
  staticCrackedTimeline,
  suspenseTimeline
};
