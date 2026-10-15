// A silent, intermittent pixel effect attached to the companion card. It never
// calls the coach's play/walk APIs, so existing gestures remain in control.
import { renderPower } from './power.mjs';
import { renderBlizzard } from '../hold/blizzard.mjs';
import { renderEcosystem } from '../hold/render.mjs';
import { AURA_OPTIONS, EFFECT_CHOICES_KEY, effectGroupForExercise, readEffectChoices, resolveEffectForGroup } from './aura-options.mjs';
import { EXERCISES } from '../../exercise-library.mjs';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
function randomFor(seed = 1) {
  let value = (Number(seed) >>> 0) || 0x9e3779b9;
  return () => {
    value ^= value << 13; value ^= value >>> 17; value ^= value << 5;
    return (value >>> 0) / 0x100000000;
  };
}
function currentExerciseMode() {
  try {
    const owner = globalThis.myr5WorkoutOwner?.snapshot?.();
    return owner?.workout?.mode ?? owner?.mode ?? globalThis.myr5TestState?.motion?.mode ?? null;
  } catch { return globalThis.myr5TestState?.motion?.mode ?? null; }
}
function fallbackGroup(style) {
  return style === 'lightning' ? 'shoulders' : style === 'floor' ? 'floor' : style === 'blizzard' ? 'core' : style === 'aura' ? 'legs' : null;
}
function styleForGroup(group) {
  return group === 'shoulders' ? 'lightning' : group === 'floor' ? 'floor' : group === 'core' ? 'blizzard' : 'aura';
}
function groupForContext(mode, previewGroup, record) {
  if (previewGroup) return previewGroup;
  if (mode && EXERCISES[mode]) return effectGroupForExercise(mode);
  return record.styles?.[record.equipped]?.group ?? fallbackGroup(record.equipped) ?? 'legs';
}
export function avatarEffectContext({ mode = null, previewGroup = null, record = null, effectChoices = {}, random = Math.random } = {}) {
  const group = groupForContext(mode, previewGroup, record ?? { styles: {} });
  return { group, effect: group ? resolveEffectForGroup(group, effectChoices, random) : null };
}
export function usesNativeBlizzard(effect) { return effect === 'blizzard'; }

/** Deterministic visible-time scheduler, exported for direct timing tests. */
export function createAvatarPowerSchedule({ seed = 1, minInterval = 12, maxInterval = 24, duration = 1.4 } = {}) {
  const random = randomFor(seed);
  const interval = () => clamp(minInterval, 1, 120) + random() * Math.max(0, clamp(maxInterval, minInterval, 120) - clamp(minInterval, 1, 120));
  let until = interval(), burst = 0, disposed = false;
  return {
    step(rawDt, visible, reducedMotion = false) {
      if (disposed) return 0;
      const dt = clamp(Number.isFinite(rawDt) ? rawDt : 0, 0, 0.25);
      if (!visible) {
        if (burst > 0) { burst = 0; until = interval(); }
        return 0;
      }
      if (burst > 0) {
        burst = Math.max(0, burst - dt);
        if (!burst) until = interval();
        return burst > 0 ? 1 : 0;
      }
      until -= dt;
      if (until <= 0) { burst = reducedMotion ? 0.45 : clamp(duration, 0.5, 2); return 1; }
      return 0;
    },
    reset() { if (disposed) return; burst = 0; until = interval(); },
    dispose() { disposed = true; burst = until = 0; },
    get remaining() { return until; },
    get active() { return burst > 0; },
  };
}
export function avatarLayerOpacity(cameraTracking) { return cameraTracking ? 0.08 : 0.55; }

function stageFor(card) {
  if (card?.matches?.('.myr5-companion-stage')) return card;
  return card?.querySelector?.('.myr5-companion-stage') ?? card;
}
function renderEcologyAura(ctx, state, id) {
  const ecology = AURA_OPTIONS.find(option => option.id === id)?.ecology;
  if (!ecology) return false;
  const { w, h, time = 0 } = state, ground = h * .9;
  let entities;
  if (ecology.kind === 'plant') {
    entities = [.22, .5, .78].map((fraction, index) => ({ id: index + 1, kind: 'plant', variant: ecology.variant,
      x: w * fraction, y: ground + (index === 1 ? 1 : 0), size: Math.min(54, w * .38), growth: .92 + index * .04,
      alpha: .88, phaseTime: time + index * .7 }));
  } else if (ecology.kind === 'animal') {
    entities = [{ id: 1, kind: 'animal', variant: ecology.variant, phase: 'idle', x: w * .5, y: ground,
      size: Math.min(50, w * .4), growth: 1, alpha: .92, phaseTime: time }];
  } else {
    entities = [.24, .5, .76].map((fraction, index) => ({ id: index + 1, kind: 'mineral', variant: ecology.variant,
      palette: ecology.palette, x: w * fraction, y: ground, size: Math.min(30, w * .22), growth: 1,
      alpha: .9, phaseTime: time }));
  }
  renderEcosystem(ctx, { entities, debris: [] });
  return true;
}
export function avatarPowerState(record, width, height, time = 0, pulse = 0, walking = false, powerAnchors = null) {
  const style = record?.equipped, stored = style && record.styles?.[style];
  if (!stored || !['aura', 'lightning', 'floor', 'blizzard'].includes(style)) return null;
  const center = width * 0.5, sway = walking ? Math.sin(time * 5) * width * 0.045 : 0;
  if (style === 'blizzard') {
    const leftFoot = center - width * .10 + sway * 1.8, rightFoot = center + width * .10 + sway * 1.8;
    const leftKnee = center - width * .09 + sway * 1.4, rightKnee = center + width * .09 + sway * 1.4;
    const leftHip = center - width * .08 + sway, rightHip = center + width * .08 + sway;
    const leftShoulder = center - width * .12 + sway * .35, rightShoulder = center + width * .12 + sway * .35;
    const points = [[27,25,leftFoot,height*.86,leftKnee,height*.72],[25,23,leftKnee,height*.72,leftHip,height*.59],
      [28,26,rightFoot,height*.86,rightKnee,height*.72],[26,24,rightKnee,height*.72,rightHip,height*.59],
      [23,11,leftHip,height*.59,leftShoulder,height*.32],[24,12,rightHip,height*.59,rightShoulder,height*.32],
      [11,13,leftShoulder,height*.32,center-width*.18+sway*.55,height*.43],
      [12,14,rightShoulder,height*.32,center+width*.18+sway*.55,height*.43]];
    const growth = clamp(.34 + stored.intensity * .66, .34, 1);
    const iceEdges = points.map(([from,to,x1,y1,x2,y2]) => ({ from,to,x1:Math.round(x1),y1:Math.round(y1),
      x2:Math.round(x2),y2:Math.round(y2),growth,alpha:.58+stored.intensity*.27 }));
    const snowCount = Math.min(18, 5 + Math.round(stored.intensity * 13));
    const snow = Array.from({ length: snowCount }, (_, i) => {
      const phase = i * 2.399963229728653 + (walking ? time * 1.4 : time * .45);
      return { x: Math.round(center + Math.cos(phase) * width * (.14 + (i % 4) * .025)),
        y: Math.round(height * (.36 + (i % 5) * .095) + Math.sin(phase * 1.17) * height * .035),
        size: 1 + (i % (stored.tier > 3 ? 3 : 2)), alpha: .2 + stored.intensity * .18 };
    });
    return { blizzard: true, stillSeconds: 5 + time * 2, iceEdges, snow };
  }
  const points = Array.from({ length: 33 }, () => null);
  const put = (index, x, y) => { points[index] = { x: x / width, y: y / height, visibility: 1 }; };
  // These are local character-art anchors, not camera/tracker contacts.
  put(11, center - width * .12 + sway * .35, height * .30);
  put(12, center + width * .12 + sway * .35, height * .30);
  put(13, center - width * .18 + sway * .55, height * .42);
  put(14, center + width * .18 + sway * .55, height * .42);
  put(15, center - width * .22 + sway * .65, height * .54);
  put(16, center + width * .22 + sway * .65, height * .54);
  put(23, center - width * .08 + sway, height * .60);
  put(24, center + width * .08 + sway, height * .60);
  put(25, center - width * .09 + sway * 1.4, height * .73);
  put(26, center + width * .09 + sway * 1.4, height * .73);
  put(27, center - width * .10 + sway * 1.8, height * .85);
  put(28, center + width * .10 + sway * 1.8, height * .85);
  const contacts = style === 'floor' ? (powerAnchors ?? [])
    .filter(anchor => anchor?.visible && Number.isFinite(anchor.x) && Number.isFinite(anchor.y))
    .slice(0, 2)
    .map(anchor => ({ index: anchor.index, x: anchor.x * width, y: anchor.y * height })) : [];
  return { w: width, h: height, route: style, active: true, units: stored.units, maxUnits: stored.maxUnits,
    intensity: stored.intensity, tier: stored.tier, pulse, contacts, points, time };
}

function isVisible(card, stage, canvas, stats) {
  if (!card?.isConnected || !stage?.isConnected || card.hidden || stage.hidden || document.hidden) return false;
  if (card.dataset?.coachCap === 'hidden' || card.dataset?.coachVisible === 'false') return false;
  if (stats?.visible === false || stats?.paused === true) return false;
  const rect = stage.getBoundingClientRect?.();
  if (rect && (!(rect.width > 0) || !(rect.height > 0))) return false;
  for (let node = stage; node && node !== document.documentElement?.parentElement; node = node.parentElement) {
    const style = globalThis.getComputedStyle?.(node);
    if (style && (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0)) return false;
    if (node === card) break;
  }
  canvas.style.display = '';
  return true;
}

export function mountAvatarPower({ card, retained, sound: _sound, seed = 1 } = {}) {
  if (!card) throw new TypeError('A companion card is required.');
  const stage = stageFor(card);
  if (!stage?.appendChild) throw new TypeError('The companion card needs an overlay stage.');
  const canvas = document.createElement('canvas');
  canvas.className = 'myr5-avatar-power-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  Object.assign(canvas.style, { inset: '0', width: '100%', height: '100%', imageRendering: 'pixelated', pointerEvents: 'none', zIndex: '1', opacity: '.55', display: 'none' });
  canvas.style.setProperty('position', 'absolute', 'important');
  stage.appendChild(canvas);
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) { canvas.remove(); throw new Error('A transparent 2D canvas is unavailable.'); }

  const reduced = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)') ?? { matches: false, addEventListener() {}, removeEventListener() {} };
  const schedule = createAvatarPowerSchedule({ seed });
  const random = randomFor((Number(seed) ^ 0x41555241) >>> 0);
  let effectChoices = readEffectChoices(), previewGroup = null, currentEffect = null;
  let record = retained?.read?.() ?? { version: 1, equipped: null, styles: {} };
  function context(groupPreview = previewGroup) {
    return avatarEffectContext({ mode: currentExerciseMode(), previewGroup: groupPreview, record, effectChoices, random });
  }
  let effectiveGroup = context().group;
  function selectedEffect(group = effectiveGroup) {
    return group ? resolveEffectForGroup(group, effectChoices, random) : null;
  }
  currentEffect = context().effect;
  let fingerprint = JSON.stringify(record), width = 1, height = 1, dpr = 1, lastFrame = 0, lastSizeCheck = 0, time = 0, pulse = 0, previewRemaining = 0, wasActive = false, raf = 0, disposed = false;
  let resizeObserver = null;

  function resize() {
    if (disposed) return;
    const rect = stage.getBoundingClientRect();
    if (!(rect.width > 0 && rect.height > 0)) return;
    width = rect.width; height = rect.height; dpr = clamp(globalThis.devicePixelRatio || 1, 1, 2);
    const pixelWidth = Math.max(1, Math.round(width * dpr)), pixelHeight = Math.max(1, Math.round(height * dpr));
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) { canvas.width = pixelWidth; canvas.height = pixelHeight; }
    ctx.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
    ctx.imageSmoothingEnabled = false;
  }
  function refresh() {
    if (disposed) return;
    const next = retained?.read?.() ?? { version: 1, equipped: null, styles: {} };
    const nextFingerprint = JSON.stringify(next);
    if (nextFingerprint !== fingerprint) {
      record = next; fingerprint = nextFingerprint; schedule.reset(); pulse = 0; wasActive = false;
      effectiveGroup = context().group; currentEffect = context().effect;
      ctx.clearRect(0, 0, width, height); canvas.style.display = 'none';
    }
  }
  function choiceChanged(event) {
    effectChoices = readEffectChoices();
    previewGroup = event?.detail?.group ?? null;
    effectiveGroup = context().group; currentEffect = context().effect;
    schedule.reset(); wasActive = false;
    if (previewGroup) { pulse = 1; previewRemaining = 2.4; }
    else pulse = 0;
  }
  function paint(now) {
    if (disposed) return;
    raf = requestAnimationFrame(paint);
    if (lastFrame && now - lastFrame < 33) return;
    const dt = lastFrame ? clamp((now - lastFrame) / 1000, 0, .25) : 0;
    lastFrame = now;
    if (!resizeObserver && now - lastSizeCheck >= 500) { lastSizeCheck = now; resize(); }
    let stats = null;
    try { stats = globalThis.myr5Creature?.stats?.() ?? null; } catch { /* coach stats are an optional visibility hint */ }
    const mode = currentExerciseMode();
    const nextGroup = context().group;
    if (nextGroup !== effectiveGroup) {
      effectiveGroup = nextGroup; currentEffect = selectedEffect(effectiveGroup);
      schedule.reset(); wasActive = false; pulse = 0;
      ctx.clearRect(0, 0, width, height); canvas.style.display = 'none';
    }
    if (previewRemaining <= 0 && mode && EXERCISES[mode] && !effectGroupForExercise(mode)) {
      wasActive = false; pulse = 0; ctx.clearRect(0, 0, width, height); canvas.style.display = 'none'; return;
    }
    const canShow = isVisible(card, stage, canvas, stats);
    const hadPreview = previewRemaining > 0;
    previewRemaining = Math.max(0, previewRemaining - (canShow ? dt : 0));
    if (hadPreview && previewRemaining === 0) { previewGroup = null; effectiveGroup = context(null).group; currentEffect = selectedEffect(effectiveGroup); }
    const active = previewRemaining > 0 ? 1 : schedule.step(dt, canShow, reduced.matches);
    if (!active) { wasActive = false; pulse = 0; ctx.clearRect(0, 0, width, height); canvas.style.display = 'none'; return; }
    canvas.style.display = 'block';
    canvas.style.opacity = String(avatarLayerOpacity(document.body?.dataset?.tracking === 'true'));
    const reducedMotion = reduced.matches;
    time += reducedMotion ? 0 : dt;
    if (!wasActive) { pulse = 1; currentEffect = selectedEffect(); }
    wasActive = true;
    pulse = Math.max(0, pulse - dt * 2.5);
    const selectedStyle = styleForGroup(effectiveGroup);
    const earnedStyle = record.styles?.[selectedStyle] ?? record.styles?.[record.equipped];
    const visualRecord = earnedStyle
      ? { equipped: selectedStyle, styles: { [selectedStyle]: earnedStyle } }
      : { equipped: selectedStyle, styles: { [selectedStyle]: { units: 1, maxUnits: 1, intensity: .38, tier: 1 } } };
    const state = avatarPowerState(visualRecord, width, height, reducedMotion ? 0 : time,
      reducedMotion ? 0 : pulse, stats?.gesture === 'walk' || stats?.phoneMotionPhase === 'walk', stats?.powerAnchors);
    if (state?.blizzard && !usesNativeBlizzard(currentEffect)) {
      Object.assign(state, { w: width, h: height, route: selectedStyle, active: true,
        intensity: visualRecord.styles[selectedStyle]?.intensity ?? 0, tier: visualRecord.styles[selectedStyle]?.tier ?? 0,
        points: [] });
    }
    if (state) state.effect = currentEffect;
    ctx.clearRect(0, 0, width, height);
    if (state && !renderEcologyAura(ctx, state, state.effect)) {
      if (state?.blizzard && usesNativeBlizzard(state.effect)) renderBlizzard(ctx, state);
      else renderPower(ctx, state);
    }
  }

  resize();
  if (typeof ResizeObserver === 'function') { resizeObserver = new ResizeObserver(resize); resizeObserver.observe(stage); }
  else globalThis.addEventListener?.('resize', resize);
  const visibility = () => {
    if (document.hidden) { schedule.step(0, false); wasActive = false; pulse = 0; ctx.clearRect(0, 0, width, height); canvas.style.display = 'none'; }
    lastFrame = 0;
  };
  document.addEventListener?.('visibilitychange', visibility);
  globalThis.addEventListener?.('myr5:exercise-effect-choice-change', choiceChanged);
  const storageChanged = event => { if (event?.key === EFFECT_CHOICES_KEY) choiceChanged(); };
  globalThis.addEventListener?.('storage', storageChanged);
  globalThis.addEventListener?.('pagehide', stop, { once: true });
  raf = requestAnimationFrame(paint);
  function stop() {
    if (disposed) return;
    disposed = true; cancelAnimationFrame(raf); resizeObserver?.disconnect();
    globalThis.removeEventListener?.('resize', resize); globalThis.removeEventListener?.('pagehide', stop);
    globalThis.removeEventListener?.('myr5:exercise-effect-choice-change', choiceChanged);
    globalThis.removeEventListener?.('storage', storageChanged);
    document.removeEventListener?.('visibilitychange', visibility); schedule.dispose();
    ctx.clearRect(0, 0, width, height); canvas.remove();
  }
  return { refresh, stop };
}
