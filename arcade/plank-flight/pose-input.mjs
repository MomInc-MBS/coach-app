// Front-facing image geometry, not a contact/pressure or exercise-technique measurement.
// `mirrored` describes preview CSS. MediaPipe points remain in raw camera coordinates.
// Provisional timeout: the integrated browser host delivered ~3.75 pose Hz with
// >350 ms jitter. This accommodates that observed CPU cadence; phones remain
// unmeasured. Explicit invalid observations still invalidate immediately.
export const freshnessMs = 750;
export const PLANK_TUNING = Object.freeze({
  visibility: .65, dwellMs: 650, minSamples: 5, maxGapMs: freshnessMs, freshnessMs, resetGapMs: 2500,
  minSpan: .08, minHeightRange: .18, minLeanRange: .13, noise: .035,
  maxDepthDrift: .25, maxLeanCoupling: .35, wristDrift: .22,
  minScaleRatio: .72, maxScaleRatio: 1.32, smoothingMs: 80, deadband: .08,
  postureDwellMs: 350, maxHeightLeak: .14, maxSteerLeak: .22,
  minRestRange: .18, minArmHeight: -.20, restEnterFraction: .18, restExitFraction: .30, maxBottomDrift: .12,
});
const UPPER = [11, 12, 13, 14, 15, 16], LOWER = [23, 24, 25, 26];
const STAGES = ['high', 'low', 'left', 'right', 'mid', 'mixed-left', 'mixed-right', 'bottom'];
const PROMPTS = {
  high: 'Face the camera with both hands in view. Hold your comfortable high plank.',
  low: 'Lower into a comfortable push-up. Hold briefly; keep your shoulders centered.',
  left: 'Return high. Keep both hands down and lean gently toward your LEFT arm.',
  right: 'Stay high. Keep both hands down and lean gently toward your RIGHT arm.',
  mid: 'Return to the middle. Hold halfway between your high and low positions.',
  'mixed-left': 'At that comfortable middle height, lean gently toward your LEFT arm.',
  'mixed-right': 'At middle height, lean gently toward your RIGHT arm.',
  bottom: 'Center yourself and rest your chest fully on the floor. Keep both shoulders, elbows and hands visible; hold briefly.',
  ready: 'Rest down to fly low. Return to your measured middle to fly in the middle; rise to fly high. Lean with both hands down.',
};
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const dot = (a, b) => a.x * b.x + a.y * b.y;
const sub = (a, b) => ({x: a.x - b.x, y: a.y - b.y});
const mid = (a, b) => ({x: (a.x + b.x) / 2, y: (a.y + b.y) / 2});
const length = a => Math.hypot(a.x, a.y);
const median = a => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
const angle = (a, b, c) => {
  const u = ['x', 'y', 'z'].map(k => (a[k] ?? 0) - (b[k] ?? 0));
  const v = ['x', 'y', 'z'].map(k => (c[k] ?? 0) - (b[k] ?? 0));
  const d = Math.hypot(...u) * Math.hypot(...v);
  return d > 1e-8 ? Math.acos(clamp(u.reduce((s, x, i) => s + x * v[i], 0) / d, -1, 1)) * 180 / Math.PI : 0;
};

function geometry(detail, T) {
  const {points: p, width, height} = detail;
  if (!Array.isArray(p) || !Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0)
    return {reason: 'Show your shoulders, elbows and both wrists in the camera.'};
  const clear = i => p[i] && [p[i].x, p[i].y, p[i].visibility].every(Number.isFinite)
    && p[i].visibility >= T.visibility && p[i].x >= .015 && p[i].x <= .985 && p[i].y >= .015 && p[i].y <= .985;
  if (!UPPER.every(clear)) return {reason: 'Keep both shoulders, elbows and wrists clearly in view.'};
  const aspect = width / height, pt = i => ({x: p[i].x * aspect, y: p[i].y});
  const s = mid(pt(11), pt(12)), w = mid(pt(15), pt(16));
  const shoulderSpan = length(sub(pt(11), pt(12))), wrists = sub(pt(16), pt(15));
  if (wrists.x < 0) { wrists.x *= -1; wrists.y *= -1; }
  const wristSpan = length(wrists);
  if (shoulderSpan < T.minSpan || wristSpan < T.minSpan || Math.abs(wrists.x) / wristSpan < .8)
    return {reason: 'Face the camera squarely; show space between both hands.'};
  const t = {x: wrists.x / wristSpan, y: wrists.y / wristSpan}, n = {x: -t.y, y: t.x};
  const armHeight = -dot(sub(s, w), n) / shoulderSpan;
  // A frontal resting chest can project at, or just below, the hand line.
  // Visibility and learned separation, not an assumed image height, admit rest.
  if (armHeight < T.minArmHeight || armHeight > 2.5) return {reason: 'Keep your shoulders and both hands in the calibrated camera view.'};
  return {s, w, t, n, shoulderSpan, wristSpan, clear, pt, confidence: Math.min(...UPPER.map(i => p[i].visibility))};
}

// The projected fallback intentionally requires the torso to recede ABOVE the
// shoulders in this floor/front framing. Ambiguous or heavily foreshortened poses
// remain uncredited. World coordinates supplement visible joints; they never
// rescue an occluded hip/knee or establish ground contact.
function proneEvidence(detail, g) {
  if (!LOWER.every(g.clear)) return false;
  const w = detail.world, ids = [...UPPER, ...LOWER];
  const hasWorld = Array.isArray(w) && ids.every(i => w[i] && ['x', 'y', 'z'].every(k => Number.isFinite(w[i][k])));
  if (hasWorld) {
    const span = Math.hypot(w[11].x - w[12].x, w[11].y - w[12].y, w[11].z - w[12].z);
    if (span < .15 || span > .8) return false;
    return [[11, 23, 25, 15], [12, 24, 26, 16]].every(([si, hi, ki, wi]) => {
      const s = w[si], h = w[hi], k = w[ki], hand = w[wi];
      const torso = Math.hypot(h.x - s.x, h.y - s.y, h.z - s.z);
      const thigh = Math.hypot(k.x - h.x, k.y - h.y, k.z - h.z);
      return torso > .18 && torso < .9 && thigh > .12 && thigh < .8
        && angle(s, h, k) >= 150 && Math.abs(h.z - s.z) / torso >= .65
        && Math.abs(h.y - s.y) / torso <= .55 && (h.z - s.z) * (k.z - h.z) > 0
        && hand.y - s.y > .04;
    });
  }
  return [[11, 23, 25], [12, 24, 26]].every(([si, hi, ki]) => {
    const s = g.pt(si), h = g.pt(hi), k = g.pt(ki), torso = sub(h, s), thigh = sub(k, h);
    return length(torso) / g.shoulderSpan >= .12 && length(thigh) / g.shoulderSpan >= .08
      && dot(torso, g.n) / g.shoulderSpan < -.10 && dot(thigh, g.n) / g.shoulderSpan < -.05
      && Math.abs(dot(torso, g.t)) / g.shoulderSpan < .45 && angle(s, h, k) >= 155;
  });
}

export function createPlankInput(options = {}) {
  const T = {...PLANK_TUNING, ...(options.tuning ?? {})};
  let index, samples, anchors, reference, model, lastTime, identity, filtered, postureSince, resting;
  function clearCalibration() { index = 0; samples = []; anchors = {}; reference = null; model = null; filtered = null; postureSince = null; resting = false; }
  function reset() { clearCalibration(); lastTime = null; identity = null; }
  reset();
  const stage = () => STAGES[index] ?? 'ready';
  const result = (now, extra = {}) => ({height01: .5, steer: 0, controlValid: false, exerciseEligible: false, resting: false, posture: 'unknown',
    confidence: 0, reason: '', stage: stage(), prompt: PROMPTS[stage()], calibrated: index === STAGES.length,
    calibrationProgress: index / STAGES.length, leanSide: 'both', supportHint: 'unknown', timestamp: now, ...extra});
  function invalid(now, reason) { samples = []; filtered = null; postureSince = null; resting = false; return result(now, {reason}); }
  function coordinates(f) {
    const depth = (f.h - anchors.high.h - model.coupling * (f.l - anchors.high.l)) / model.denominator;
    // Below the verified middle anchor, interpolate to the separately
    // observed resting center instead of extrapolating active depth/lean drift.
    const restFraction = anchors.bottom && 1 - depth < anchors.mid.height
      ? (anchors.mid.height - (1 - depth)) / (anchors.mid.height - anchors.bottom.height) : 0;
    const center = restFraction ? anchors.mid.l + restFraction * (anchors.bottom.l - anchors.mid.l)
      : anchors.high.l + depth * model.depthL;
    const lateral = f.l - center;
    return {height: 1 - depth, steer: lateral / (lateral >= 0 ? model.left : -model.right)};
  }
  function fit() {
    const H = anchors.high, L = anchors.low, A = anchors.left, B = anchors.right;
    const coupling = (A.h - B.h) / (A.l - B.l), depthL = L.l - H.l;
    const denominator = L.h - H.h - coupling * depthL;
    if (!Number.isFinite(coupling) || Math.abs(coupling) > T.maxLeanCoupling || Math.abs(denominator) < T.minHeightRange)
      return false;
    model = {coupling, depthL, denominator, left: 1, right: -1};
    const residual = f => {
      const d = (f.h - H.h - coupling * (f.l - H.l)) / denominator;
      return f.l - H.l - d * depthL;
    };
    model.left = residual(A); model.right = residual(B);
    return model.left >= T.minLeanRange && model.right <= -T.minLeanRange;
  }
  function stageReason(f) {
    const S = stage(), H = anchors.high;
    if (S === 'high') return '';
    if (S === 'low') {
      if (H.h - f.h < T.minHeightRange) return 'Lower a little within your comfortable range, then hold.';
      if (Math.abs(f.l - H.l) > (H.h - f.h) * T.maxDepthDrift) return 'Keep your shoulders centered while lowering.';
      return '';
    }
    if (S === 'left' || S === 'right') {
      if (Math.abs(f.h - H.h) > (H.h - anchors.low.h) * .24) return 'Return to your comfortable high position before leaning.';
      if (S === 'left' ? f.l - H.l < T.minLeanRange : H.l - f.l < T.minLeanRange)
        return S === 'left' ? 'Lean toward your LEFT arm, keeping both hands down.' : 'Lean toward your RIGHT arm, keeping both hands down.';
      return '';
    }
    const c = coordinates(f);
    if (S === 'bottom') {
      if ((anchors.mid.height - c.height) * Math.abs(model.denominator) < T.minRestRange)
        return 'Rest fully down, below your measured middle position. Keep your hands still.';
      if (Math.abs(f.l - anchors.mid.l) > T.maxSteerLeak * Math.min(model.left, -model.right))
        return 'Center your shoulders between your hands for the resting position.';
      return '';
    }
    if (Math.abs(c.height - .5) > .22) return 'Find a comfortable middle height and hold briefly.';
    if (S === 'mid' && Math.abs(c.steer) > T.maxSteerLeak) return 'Center your shoulders at middle height.';
    if (S === 'mixed-left' && (c.steer < .5 || c.steer > 1.25)) return 'At middle height, lean gently toward your LEFT arm.';
    if (S === 'mixed-right' && (c.steer > -.5 || c.steer < -1.25)) return 'At middle height, lean gently toward your RIGHT arm.';
    if (S !== 'mid' && Math.abs(c.height - anchors.mid.height) > T.maxHeightLeak)
      return 'Keep the same middle height while leaning; ease the lean if needed.';
    return '';
  }
  return {
    reset, get stage() { return stage(); }, get calibrated() { return index === STAGES.length; },
    update(detail = {}) {
      const now = detail.now;
      if (!Number.isFinite(now) || now < 0) return invalid(null, 'Waiting for a fresh camera frame.');
      const key = `${detail.cameraGeneration ?? ''}/${detail.width}/${detail.height}`;
      if (identity !== null && key !== identity) { clearCalibration(); lastTime = null; }
      identity = key;
      if (lastTime !== null && now <= lastTime) {
        if (now < lastTime) clearCalibration();
        return invalid(now, 'Waiting for a newer camera frame.');
      }
      const dt = lastTime === null ? 0 : now - lastTime; lastTime = now;
      if (dt > T.maxGapMs) {
        if (dt > T.resetGapMs) clearCalibration();
        return invalid(now, 'Camera paused. Hold steady while tracking returns.');
      }
      const g = geometry(detail, T);
      if (g.reason) return invalid(now, g.reason);
      if (!reference) reference = {w: g.w, t: g.t, n: g.n, scale: g.shoulderSpan, wristSpan: g.wristSpan};
      const scale = g.shoulderSpan / reference.scale;
      if (scale < T.minScaleRatio || scale > T.maxScaleRatio || length(sub(g.w, reference.w)) / reference.scale > T.wristDrift
        || Math.abs(g.wristSpan / reference.wristSpan - 1) > .22 || dot(g.t, reference.t) < .97) {
        clearCalibration(); return invalid(now, 'Camera or hands moved. Settle into position to recalibrate.');
      }
      const displacement = sub(g.s, reference.w);
      const f = {h: -dot(displacement, reference.n) / reference.scale, l: dot(displacement, reference.t) / reference.scale, t: now};
      if (!this.calibrated) {
        const reason = stageReason(f);
        if (reason) return invalid(now, reason);
        // Preserve enough observations to satisfy minSamples even at the slowest
        // accepted cadence. A duration-only window can otherwise stall calibration
        // forever while every individual sample is considered fresh.
        const calibrationWindow=Math.max(T.dwellMs,T.maxGapMs*(T.minSamples-1))+T.maxGapMs;
        samples.push(f); samples = samples.filter(s => now - s.t <= calibrationWindow);
        const h = median(samples.map(s => s.h)), l = median(samples.map(s => s.l));
        if (samples.some(s => Math.abs(s.h - h) > T.noise || Math.abs(s.l - l) > T.noise)) {
          samples = [f]; return result(now, {reason: 'Hold steady briefly so the camera can measure your range.'});
        }
        const elapsed = now - samples[0].t, progress = Math.min(1, elapsed / T.dwellMs);
        if (elapsed >= T.dwellMs && samples.length >= T.minSamples) {
          anchors[stage()] = {h, l, ...(model ? coordinates({h, l}) : {})};
          if (stage() === 'right' && !fit()) { clearCalibration(); return invalid(now, 'Height and lean overlap too much. Adjust camera framing and try again.'); }
          index++; samples = []; filtered = null; postureSince = null;
        }
        return result(now, {confidence: g.confidence, calibrationProgress: Math.min(1, (index + (samples.length ? progress : 0)) / STAGES.length),
          reason: this.calibrated ? 'Calibration complete. Hold steady to begin.' : 'Measuring your comfortable range.'});
      }
      const c = coordinates(f);
      if (c.height < anchors.bottom.height - T.maxBottomDrift / Math.abs(model.denominator)) {
        clearCalibration(); return invalid(now, 'Your resting baseline changed. Settle your hands and recalibrate.');
      }
      if (c.height > 1.22 || Math.abs(c.steer) > 1.3)
        return invalid(now, 'Return within your calibrated comfortable range.');
      // Only high/mid side lean and low-neutral were observed. Never fabricate
      // calibration evidence for a deep push-up combined with an extreme lean.
      if (Math.abs(c.steer) > Math.max(.18, clamp(c.height * 2, 0, 1)) + .15)
        return invalid(now, 'Ease toward the middle before lowering further.');
      const restFraction = (c.height - anchors.bottom.height) / (anchors.mid.height - anchors.bottom.height);
      resting = restFraction <= (resting ? T.restExitFraction : T.restEnterFraction);
      const mappedHeight = c.height >= anchors.mid.height
        ? .5 + .5 * (c.height - anchors.mid.height) / (1 - anchors.mid.height) : .5 * restFraction;
      const raw = {height01: clamp(mappedHeight, 0, 1), steer: clamp(-c.steer, -1, 1)}; // image-right = player-left
      if (Math.abs(raw.steer) <= T.deadband) raw.steer = 0;
      const alpha = filtered ? 1 - Math.exp(-dt / T.smoothingMs) : 1;
      filtered = filtered ? {height01: filtered.height01 + (raw.height01 - filtered.height01) * alpha,
        steer: filtered.steer + (raw.steer - filtered.steer) * alpha} : raw;
      const prone = proneEvidence(detail, g);
      if (!prone || resting) postureSince = null; else postureSince ??= now;
      const exerciseEligible = !resting && prone && now - postureSince >= T.postureDwellMs;
      return result(now, {...filtered, controlValid: true, exerciseEligible, resting,
        posture: resting ? 'rest' : prone ? 'active' : 'unknown', confidence: g.confidence,
        leanSide: filtered.steer < -T.deadband ? 'left' : filtered.steer > T.deadband ? 'right' : 'both',
        reason: resting ? 'Resting position estimated. Flight continues; exercise credit is paused.' : exerciseEligible ? '' : prone ? 'Hold steady while posture tracking settles.' : 'Control rehearsal only: show your hips and knees in a clear front-facing plank.'});
    },
  };
}
