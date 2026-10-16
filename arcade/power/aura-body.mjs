// Body-anchored aura glow for the camera layers (power and hold). It owns:
//  - a One Euro landmark bank on overlay fractions, fed with the frame's capture time, plus damped prediction across
//    the inference lag (createAuraTracker, pure, unit tested);
//  - a low-res glow canvas that sits right above the <video> with mix-blend-mode:screen (light added to the camera
//    image), drawn as soft capsules along the bones, flame tongues rising off them, a punch-impact flare, and on the
//    top quality tier the person's silhouette mask with rising feedback wisps, all cut out of the body itself so the
//    glow reads as behind / around the person;
//  - a ~250 ms fade instead of hard clears.
// Quality tiers come from the shared monitor in workout-effects.mjs: Q3 mask+wisps, Q2 capsules+tongues, Q1 capsules,
// Q0 nothing here (sprites only).
import { createLandmarkBank } from '../one-euro.mjs';
import { AURA_BODY, BONES, VISIBLE_ALPHA, jointPx, boneRadius, torsoPx, bodyCentre, auraPalette, fadeToward, clampLead } from './aura-anchor.mjs';
import { effectQuality, videoRectInOverlay } from '../workout-effects.mjs';

const HAND = new Set([15, 16, 17, 18, 19, 20, 21, 22]), LIMB = new Set([13, 14, 25, 26, 27, 28, 29, 30, 31, 32]);
export function auraPreset(index, T = AURA_BODY) { return HAND.has(index) ? T.FILTER.hand : LIMB.has(index) ? T.FILTER.limb : T.FILTER.torso; }

/** Filter + predict mapped overlay points. pose(points, captureMs) per detection; points(nowMs) per drawn frame. */
export function createAuraTracker(T = AURA_BODY) {
  const bank = createLandmarkBank(i => auraPreset(i, T));
  const N = 33, raw = Array.from({ length: N }, () => ({ x: 0, y: 0, seen: false }));
  const filt = Array.from({ length: N }, () => ({ x: 0, y: 0, alpha: 0, visibility: 0 }));
  const out = Array.from({ length: N }, () => ({ x: 0, y: 0, alpha: 0, visibility: 0 }));
  let frameMs = null;
  function pose(points, tMs) {
    if (!Number.isFinite(tMs) || (frameMs != null && tMs <= frameMs)) return false;
    frameMs = tMs;
    for (let i = 0; i < N; i++) {
      const p = points?.[i], r = raw[i];
      let v;
      if (p && Number.isFinite(p.x) && Number.isFinite(p.y)) { r.x = p.x; r.y = p.y; r.seen = true; v = Number.isFinite(p.visibility) ? p.visibility : 0; }
      else if (r.seen) v = 0; // lost: hold the last position and let the bank fade it out
      else continue;
      const f = bank.update(i, r.x, r.y, v, tMs), o = filt[i];
      o.x = f.x; o.y = f.y; o.alpha = f.alpha; o.visibility = f.alpha > VISIBLE_ALPHA ? 1 : 0;
    }
    return true;
  }
  function points(nowMs) {
    const lag = frameMs == null ? 0 : Math.max(0, nowMs - frameMs);
    for (let i = 0; i < N; i++) {
      const f = filt[i], o = out[i];
      o.alpha = f.alpha; o.visibility = f.visibility; o.x = f.x; o.y = f.y;
      if (lag > 0 && raw[i].seen && f.visibility) {
        const p = bank.predict(i, Math.min(lag, 66) * T.PREDICT_GAIN / 0.6); // predict() damps by 0.6 itself
        if (p) { const c = clampLead(f, p, T.PREDICT_CLAMP); o.x = c.x; o.y = c.y; }
      }
    }
    return out;
  }
  function reset() { for (let i = 0; i < N; i++) { bank.reset(i); raw[i].seen = false; filt[i].alpha = filt[i].visibility = 0; } frameMs = null; }
  return { pose, points, reset, get frameMs() { return frameMs; } };
}

// Shared sprites ----------------------------------------------------------------------------------------------
const paletteCache = new WeakMap();
function paletteStyles(pal) {
  let s = paletteCache.get(pal);
  if (!s) { s = pal.map(([r, g, b]) => `rgb(${r},${g},${b})`); s.dots = null; paletteCache.set(pal, s); }
  return s;
}
function softDot(color) {
  const c = document.createElement('canvas'); c.width = c.height = 32;
  const x = c.getContext('2d'), grad = x.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, color); grad.addColorStop(0.35, color.replace('rgb(', 'rgba(').replace(')', ',.55)')); grad.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = grad; x.fillRect(0, 0, 32, 32); return c;
}
let noiseTile = null;
function flameNoise() {
  if (noiseTile) return noiseTile;
  const W = 32, H = 64, c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d'), img = x.createImageData(W, H), col = new Float32Array(W);
  let seed = 0x2545f491; const rnd = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) / 4294967296; };
  for (let i = 0; i < W; i++) col[i] = rnd();
  for (let y = 0; y < H; y++) for (let i = 0; i < W; i++) {
    // vertical streaks that wander slowly: tileable in y (sin of y), smooth in x
    const phase = col[i] * 6.283 + (y / H) * 6.283 * (1 + (i % 3)), v = 0.5 + 0.5 * Math.sin(phase) * (0.6 + 0.4 * col[(i + 1) % W]);
    img.data[(y * W + i) * 4 + 3] = Math.round(255 * Math.max(0, Math.min(1, v * v)));
  }
  x.putImageData(img, 0, 0); return (noiseTile = c);
}

/** Mount the glow layer for an overlay host (#coachOverlay). */
export function createAuraBody({ host, quality = effectQuality, T = AURA_BODY, target = globalThis } = {}) {
  const tracker = createAuraTracker(T);
  const canvas = document.createElement('canvas'); canvas.className = 'workout-aura-glow-canvas'; canvas.setAttribute('aria-hidden', 'true');
  // Above the <video> in the camera stage (outside #coachOverlay's stacking context) so `screen` adds light to the
  // camera image; same box as the overlay host. Falls back to the host itself when there is no video sibling.
  const stage = host.parentElement, video = stage && [...stage.children].find(el => el.tagName === 'VIDEO');
  canvas.style.cssText = `position:absolute;inset:0;width:100%;height:100%;pointer-events:none;display:none;mix-blend-mode:${video ? 'screen' : 'normal'}`;
  if (video) video.after(canvas); else host.prepend(canvas);
  const g = canvas.getContext('2d', { alpha: true });
  let GW = T.GLOW_WIDTH, GH = 1, hostW = 1, hostH = 1, alpha = 0, shown = false, wantMask = false, last = 0, emitCarry = 0, disposed = false;
  const snap = { level: 0, speed: 0, route: null, effect: null, pulse: 0 };
  const A = { x: 0, y: 0, a: 0 }, B = { x: 0, y: 0, a: 0 };
  // particles: x, y, vx, vy, age, life, size, kind
  const P = new Float32Array(T.PARTICLES * 8); let pNext = 0;
  const impacts = Array.from({ length: 4 }, () => ({ t: -1e9, x: 0, y: 0, s: 0 })); let iNext = 0;
  let halo = null, haloCtx = null, maskCanvas = null, maskCtx = null, maskImage = null, maskInfo = null, fb = null, fbCtx = null;

  function resize() {
    const r = host.getBoundingClientRect(); if (!(r.width > 0 && r.height > 0)) return;
    hostW = r.width; hostH = r.height;
    const h = Math.max(1, Math.round(GW * r.height / r.width));
    if (canvas.width !== GW || canvas.height !== h) { canvas.width = GW; canvas.height = h; GH = h; fb = null; }
  }
  resize();
  const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null; ro?.observe(host);

  function onImpact(event) {
    const d = event?.detail; if (!d || !Number.isFinite(d.x) || !Number.isFinite(d.y)) return;
    let x = d.x, y = d.y;
    if (x > 1.5 || y > 1.5) { const r = host.getBoundingClientRect(); x = (x - r.left) / (r.width || 1); y = (y - r.top) / (r.height || 1); }
    const slot = impacts[iNext++ % impacts.length];
    slot.t = performance.now(); slot.x = x; slot.y = y; slot.s = Math.max(0.2, Math.min(1, Number(d.strength) || 0.7));
  }
  target.addEventListener?.('myr5:punch-impact', onImpact);

  function setWantMask(on) { if (on !== wantMask) { wantMask = on; globalThis.myr5AuraWantsMask = on; } }

  /** New detection: mapped overlay points, capture time, optional mask {w,h,data} and video geometry. */
  function pose(points, tMs, mask = null, geometry = null) {
    if (disposed) return;
    tracker.pose(points, tMs);
    if (!mask?.data || !geometry || quality.tier < 3) { maskInfo = null; return; }
    if (!maskCanvas || maskCanvas.width !== mask.w || maskCanvas.height !== mask.h) {
      maskCanvas = document.createElement('canvas'); maskCanvas.width = mask.w; maskCanvas.height = mask.h;
      maskCtx = maskCanvas.getContext('2d'); maskImage = maskCtx.createImageData(mask.w, mask.h);
    }
    const [r, gg, b] = auraPalette(snap.effect, snap.route)[0], d = maskImage.data, m = mask.data;
    for (let k = 0, j = 0; k < m.length; k++, j += 4) { d[j] = r; d[j + 1] = gg; d[j + 2] = b; d[j + 3] = m[k]; }
    maskCtx.putImageData(maskImage, 0, 0);
    const rect = videoRectInOverlay({ videoWidth: geometry.videoWidth, videoHeight: geometry.videoHeight, hostWidth: hostW, hostHeight: hostH });
    const hip = bodyCentre(points, 1, 1).hip; // raw hip of the mask's own frame (same inference)
    maskInfo = rect ? { rect, mirrored: !!geometry.mirrored, hx: hip.x, hy: hip.y, at: performance.now() } : null;
  }

  function drawMask(ctx, scale, dx, dy, cx, cy) {
    const { rect, mirrored } = maskInfo, x0 = rect.x * GW, y0 = rect.y * GH, rw = rect.w * GW, rh = rect.h * GH;
    ctx.save(); ctx.translate(cx, cy); ctx.scale(scale, scale); ctx.translate(dx - cx, dy - cy);
    if (mirrored) { ctx.translate(2 * x0 + rw, 0); ctx.scale(-1, 1); }
    ctx.drawImage(maskCanvas, x0, y0, rw, rh); ctx.restore();
  }

  function emit(points, torso, level, speed, dt, styles) {
    const rate = (T.EMIT_BASE + T.EMIT_LEVEL * level) * (1 + Math.min(1, speed / T.SPEED_REF));
    emitCarry += rate * dt;
    let guard = 0;
    while (emitCarry >= 1 && guard++ < 24) {
      emitCarry -= 1;
      const bone = BONES[(Math.random() * BONES.length) | 0];
      if (!jointPx(points, bone[0], GW, GH, A) || !jointPx(points, bone[1], GW, GH, B) || Math.min(A.a, B.a) < 0.5) continue;
      const t = Math.random(), r = boneRadius(bone[2], torso, level, speed, T), ex = B.x - A.x, ey = B.y - A.y, len = Math.hypot(ex, ey) || 1;
      const off = (Math.random() - 0.5) * 0.9 * r, k = pNext++ % T.PARTICLES * 8;
      P[k] = A.x + ex * t - ey / len * off; P[k + 1] = A.y + ey * t + ex / len * off;
      P[k + 2] = (Math.random() - 0.5) * 0.25 * torso; P[k + 3] = -(0.7 + 0.7 * Math.random()) * torso;
      P[k + 4] = 0; P[k + 5] = 0.32 + 0.34 * Math.random(); P[k + 6] = r * (0.3 + 0.25 * Math.random()); P[k + 7] = Math.random() < 0.4 ? 2 : 1;
    }
    if (!styles.dots) styles.dots = [null, softDot(styles[0]), softDot(styles[1]), softDot(styles[2])];
  }
  function drawParticles(dt, gain, styles) {
    for (let k = 0; k < P.length; k += 8) {
      if (!(P[k + 5] > 0)) continue;
      P[k + 4] += dt; const life = P[k + 4] / P[k + 5];
      if (life >= 1) { P[k + 5] = 0; continue; }
      P[k] += P[k + 2] * dt; P[k + 1] += P[k + 3] * dt; P[k + 2] *= 0.97;
      const size = P[k + 6] * (1 - life * 0.55);
      g.globalAlpha = Math.min(1, gain * 0.6 * (1 - life) ** 1.3);
      g.drawImage(styles.dots[P[k + 7]], P[k] - size / 2, P[k + 1] - size * 0.8, size, size * 1.6);
    }
  }

  /**
   * Per animation frame. live: {active, level, speed, route, effect, pulse} (engine state); points: drawn landmarks
   * from points(now). Returns the layer fade alpha (0..1) so the caller fades its sprites with the glow.
   */
  function draw(now, live, points) {
    if (disposed) return 0;
    const dt = last ? Math.min(0.05, Math.max(0, (now - last) / 1000)) : 0; last = now;
    const on = !!(live?.active && live.level > 0);
    if (on) { snap.level = live.level; snap.speed = live.speed || 0; snap.route = live.route; snap.effect = live.effect; snap.pulse = live.pulse || 0; }
    else snap.pulse = 0;
    alpha = fadeToward(alpha, on ? 1 : 0, dt * 1000, T.FADE_MS);
    const tier = quality.tier;
    setWantMask(tier >= 3 && alpha > 0);
    if (alpha <= 0 || tier < 1) { if (shown) { g.clearRect(0, 0, canvas.width, canvas.height); canvas.style.display = 'none'; shown = false; } return alpha; }
    if (!shown) { canvas.style.display = 'block'; shown = true; }
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, GW, GH);
    const torso = torsoPx(points, GW, GH); if (!torso) return alpha;
    const level = snap.level, speed = snap.speed, styles = paletteStyles(auraPalette(snap.effect, snap.route));
    let impact = 0;
    for (const im of impacts) { const k = (now - im.t) / T.IMPACT_MS; if (k >= 0 && k < 1) impact = Math.max(impact, im.s * (1 - k)); }
    const gain = alpha * (0.5 + 0.5 * level) * (1 + T.IMPACT_GAIN * impact + 0.4 * snap.pulse);
    g.globalCompositeOperation = 'lighter'; g.lineCap = 'round'; g.lineJoin = 'round';

    // Q3: silhouette halo + rising wisps from the person mask (falls back to capsules alone without a mask).
    const centre = bodyCentre(points, GW, GH);
    if (tier >= 3 && maskInfo && now - maskInfo.at < 400) {
      if (!fb || fb.width !== GW || fb.height !== GH) { fb = document.createElement('canvas'); fb.width = GW; fb.height = GH; fbCtx = fb.getContext('2d'); }
      const hip = centre.hip, dx = hip.x - maskInfo.hx * GW, dy = hip.y - maskInfo.hy * GH; // follow the predicted body
      fbCtx.globalCompositeOperation = 'copy'; fbCtx.globalAlpha = T.WISP_DECAY; fbCtx.drawImage(fb, 0, -T.WISP_RISE);
      fbCtx.globalCompositeOperation = 'lighter'; fbCtx.globalAlpha = Math.min(1, 0.4 * gain); drawMask(fbCtx, 1.06, dx, dy, centre.centre.x, centre.centre.y);
      const noise = flameNoise(), scroll = (now * 0.05) % GH;
      fbCtx.globalCompositeOperation = 'destination-out'; fbCtx.globalAlpha = 0.45;
      fbCtx.drawImage(noise, 0, scroll - GH, GW, GH); fbCtx.drawImage(noise, 0, scroll, GW, GH);
      g.globalAlpha = 1; g.drawImage(fb, 0, 0);
      g.globalAlpha = Math.min(1, 0.5 * gain); drawMask(g, 1.1, dx, dy, centre.centre.x, centre.centre.y);
      g.globalAlpha = Math.min(1, 0.28 * gain); drawMask(g, 1.22, dx, dy, centre.centre.x, centre.centre.y);
    }

    // Capsule halo along the bones on a 1/4-res canvas: outer colour -> mid -> hot core toward the bone, painted
    // source-over (overlaps never burn to white), then upscaled with smoothing onto the glow layer = soft falloff.
    const D = T.HALO_DOWNSCALE, hw = Math.max(1, Math.round(GW / D)), hh = Math.max(1, Math.round(GH / D));
    if (!halo || halo.width !== hw || halo.height !== hh) { halo = document.createElement('canvas'); halo.width = hw; halo.height = hh; haloCtx = halo.getContext('2d'); }
    const h = haloCtx; h.globalCompositeOperation = 'source-over'; h.globalAlpha = 1; h.clearRect(0, 0, hw, hh); h.lineCap = 'round';
    const passes = tier >= 2 ? PASSES_FULL : PASSES_LITE, ht = torso / D;
    for (const [width, a, colour] of passes) {
      h.strokeStyle = h.fillStyle = styles[colour];
      for (const [i, j, kind] of BONES) {
        if (!jointPx(points, i, hw, hh, A) || !jointPx(points, j, hw, hh, B)) continue;
        const r = boneRadius(kind, ht, level, speed, T) * width;
        h.globalAlpha = Math.min(1, a * Math.min(A.a, B.a));
        h.beginPath();
        if (i === j) { h.arc(A.x, A.y, r, 0, 6.2832); h.fill(); }
        else { h.lineWidth = 2 * r; h.moveTo(A.x, A.y); h.lineTo(B.x, B.y); h.stroke(); }
      }
    }
    g.globalAlpha = Math.min(1, gain); g.imageSmoothingEnabled = true; g.drawImage(halo, 0, 0, GW, GH);
    if (tier >= 2) { emit(points, torso, level, speed, dt, styles); drawParticles(dt, gain, styles); }

    // Punch impact flare: hot flash + expanding ring at the fist.
    for (const im of impacts) {
      const k = (now - im.t) / T.IMPACT_MS; if (k < 0 || k >= 1) continue;
      const x = im.x * GW, y = im.y * GH, s = torso * (0.35 + 0.3 * im.s) * (1 - k * 0.4);
      if (!styles.dots) styles.dots = [null, softDot(styles[0]), softDot(styles[1]), softDot(styles[2])];
      g.globalAlpha = Math.min(1, alpha * im.s * (1 - k) ** 2);
      g.drawImage(styles.dots[3], x - s, y - s, 2 * s, 2 * s); g.drawImage(styles.dots[2], x - s * 1.6, y - s * 1.6, 3.2 * s, 3.2 * s);
      g.strokeStyle = styles[1]; g.lineWidth = Math.max(1, torso * 0.05 * (1 - k)); g.globalAlpha = Math.min(1, alpha * (1 - k));
      g.beginPath(); g.arc(x, y, torso * (0.12 + 0.5 * k), 0, 6.2832); g.stroke();
    }

    // Keep the person visible: punch the body itself out of the glow (soft, so a rim of light stays on the edges).
    g.globalCompositeOperation = 'destination-out'; g.globalAlpha = T.CUT_ALPHA; g.strokeStyle = g.fillStyle = '#000';
    if (tier >= 3 && maskInfo && now - maskInfo.at < 400) drawMask(g, 1, centre.hip.x - maskInfo.hx * GW, centre.hip.y - maskInfo.hy * GH, centre.centre.x, centre.centre.y);
    else {
      const quad = [11, 12, 24, 23];
      if (quad.every(i => jointPx(points, i, GW, GH, A))) {
        g.beginPath(); quad.forEach((i, n) => { jointPx(points, i, GW, GH, A); n ? g.lineTo(A.x, A.y) : g.moveTo(A.x, A.y); }); g.closePath(); g.fill();
      }
      for (const [i, j, kind] of BONES) {
        if (!jointPx(points, i, GW, GH, A) || !jointPx(points, j, GW, GH, B)) continue;
        const r = torso * (T.BODY[kind] ?? T.BODY.lower) * T.CUT;
        g.beginPath();
        if (i === j) { g.arc(A.x, A.y, r, 0, 6.2832); g.fill(); }
        else { g.lineWidth = 2 * r; g.moveTo(A.x, A.y); g.lineTo(B.x, B.y); g.stroke(); }
      }
    }
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    return alpha;
  }

  function reset() { tracker.reset(); alpha = 0; maskInfo = null; P.fill(0); for (const im of impacts) im.t = -1e9; }
  function dispose() {
    if (disposed) return; disposed = true; ro?.disconnect(); target.removeEventListener?.('myr5:punch-impact', onImpact);
    setWantMask(false); canvas.remove(); if (globalThis.myr5AuraBody === api) globalThis.myr5AuraBody = null;
  }
  const api = { pose, points: now => tracker.points(now), draw, reset, dispose, resize, canvas, get alpha() { return alpha; }, tracker };
  globalThis.myr5AuraBody = api; // debug / harness: the drawn (filtered + predicted) skeleton
  return api;
}
// [width multiple, alpha, palette slot]
const PASSES_FULL = [[1, 0.16, 0], [0.8, 0.22, 0], [0.6, 0.3, 1], [0.42, 0.42, 1], [0.28, 0.55, 2]];
const PASSES_LITE = [[1, 0.2, 0], [0.65, 0.35, 1], [0.35, 0.5, 2]];
