// Transparent Canvas2D renderer for the hold ecology. Art is cropped from the
// CC0 atlases preserved in ./assets and normalized into cached 64x64 canvases.
const ROOT = '/arcade/hold/assets/';
const CELL = 64;
const sources = new Map();
let loadStarted = false;

function canvas64() {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = CELL;
  return canvas;
}

function image(path) {
  return new Promise((resolve, reject) => {
    if (typeof Image === 'undefined') return reject(new Error('Image unavailable'));
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = ROOT + path;
  });
}

function normalize(img, rect, { key = null, maxW = 56, maxH = 60 } = {}) {
  const canvas = canvas64();
  if (!canvas) return null;
  const ctx = canvas.getContext('2d', { willReadFrequently: !!key });
  const [sx, sy, sw, sh] = rect;
  if (key) {
    const temp = document.createElement('canvas'); temp.width = sw; temp.height = sh;
    const tg = temp.getContext('2d', { willReadFrequently: true });
    tg.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
    const pixels = tg.getImageData(0, 0, sw, sh);
    const [kr, kg, kb] = key;
    for (let i = 0; i < pixels.data.length; i += 4) {
      if (pixels.data[i] === kr && pixels.data[i + 1] === kg && pixels.data[i + 2] === kb) pixels.data[i + 3] = 0;
    }
    tg.putImageData(pixels, 0, 0);
    const scale = Math.min(maxW / sw, maxH / sh);
    const dw = Math.max(1, Math.round(sw * scale)), dh = Math.max(1, Math.round(sh * scale));
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(temp, 0, 0, sw, sh, Math.round((CELL - dw) / 2), CELL - dh, dw, dh);
  } else {
    const scale = Math.min(maxW / sw, maxH / sh);
    const dw = Math.max(1, Math.round(sw * scale)), dh = Math.max(1, Math.round(sh * scale));
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, sx, sy, sw, sh, Math.round((CELL - dw) / 2), CELL - dh, dw, dh);
  }
  return canvas;
}

function normalizeFrame(img, frame, fw, fh) {
  return normalize(img, [frame * fw, 0, fw, fh], { maxW: 60, maxH: 58 });
}

function buildAnimal(img, count, fw, fh) {
  return Array.from({ length: count }, (_, i) => normalizeFrame(img, i, fw, fh)).filter(Boolean);
}

async function loadSprites() {
  const specs = [
    ['flowers', 'flowers-plants_2.png'],
    ['foxIdle', 'fox/Fox/Fox_Idle.png'], ['foxRun', 'fox/Fox/Fox_Run.png'],
    ['rabbitIdle', 'rabbit/Rabbit/Rabbit_Idle.png'], ['rabbitRun', 'rabbit/Rabbit/Rabbit_Run.png'],
    ['bearIdle', 'bear/Bear/Bear_Idle.png'], ['bearRun', 'bear/Bear/Bear_Run.png'],
    ['boarIdle', 'boar/Boar/Boar_Idle.png'], ['boarRun', 'boar/Boar/Boar_Run.png'],
    ['deerIdle', 'deer/Deer/Deer_Idle.png'], ['deerRun', 'deer/Deer/Deer_Run.png'],
    ['wolfWalk', 'wolf/Wolf/Wolf_Walk.png'], ['wolfRun', 'wolf/Wolf/Wolf_Run.png'],
    ['rocks', 'rocks-original.png'],
    ['crystalBlue', 'crystals/PNG/32x32/crystal-blue.png'],
    ['crystalIcy', 'crystals/PNG/32x32/crystal-icy.png'],
    ['crystalRed', 'crystals/PNG/32x32/crystal-red-small.png'],
    ['crystalGreen', 'crystals/PNG/32x32/crystal-green-alt.png'],
    ['crystalGold', 'crystals/PNG/32x32/crystal-gold.png'],
    ['crystalPurple', 'crystals/PNG/32x32/crystal-purple.png'],
  ];
  const loaded = await Promise.all(specs.map(async ([key, path]) => [key, await image(path).catch(() => null)]));
  const img = Object.fromEntries(loaded);

  // SpiderDave's source is 78 exact 12x24 cells on one uniform #222034 background.
  if (img.flowers) {
    sources.set('plant:fern', normalize(img.flowers, [12, 0, 12, 24], { key: [34, 32, 52], maxW: 36, maxH: 60 }));
    sources.set('plant:vine', normalize(img.flowers, [14 * 12, 0, 12, 24], { key: [34, 32, 52], maxW: 40, maxH: 60 }));
    sources.set('plant:flower', normalize(img.flowers, [48 * 12, 0, 12, 24], { key: [34, 32, 52], maxW: 42, maxH: 60 }));
  }
  if (img.foxIdle) sources.set('animal:fox:idle', buildAnimal(img.foxIdle, 6, 64, 36));
  if (img.foxRun) sources.set('animal:fox:run', buildAnimal(img.foxRun, 6, 64, 36));
  if (img.rabbitIdle) sources.set('animal:rabbit:idle', buildAnimal(img.rabbitIdle, 10, 32, 26));
  if (img.rabbitRun) sources.set('animal:rabbit:run', buildAnimal(img.rabbitRun, 6, 32, 26));
  if (img.bearIdle) sources.set('animal:bear:idle', buildAnimal(img.bearIdle, 24, 32, 33));
  if (img.bearRun) sources.set('animal:bear:run', buildAnimal(img.bearRun, 10, 32, 33));
  if (img.boarIdle) sources.set('animal:boar:idle', buildAnimal(img.boarIdle, 16, 32, 40));
  if (img.boarRun) sources.set('animal:boar:run', buildAnimal(img.boarRun, 12, 32, 40));
  if (img.deerIdle) sources.set('animal:deer:idle', buildAnimal(img.deerIdle, 15, 48, 52));
  if (img.deerRun) sources.set('animal:deer:run', buildAnimal(img.deerRun, 9, 48, 52));
  if (img.wolfWalk) sources.set('animal:wolf:idle', buildAnimal(img.wolfWalk, 16, 32, 40));
  if (img.wolfRun) sources.set('animal:wolf:run', buildAnimal(img.wolfRun, 12, 32, 40));

  // Rocks are six 32x32 cells. Crystal sheets contain four separated sprites;
  // these bounds were inspected at native resolution, then aspect-fit to 64x64.
  if (img.rocks) sources.set('mineral:rock', [0, 2, 4].map(i => normalize(img.rocks, [(i % 3) * 32, Math.floor(i / 3) * 32, 32, 32], { maxW: 56, maxH: 56 })).filter(Boolean));
  const crystalSpecs = [
    ['crystalBlue', [0, 7, 64, 121]], ['crystalBlue', [64, 6, 64, 120]],
    ['crystalIcy', [128, 3, 32, 61]], ['crystalRed', [2, 0, 30, 32]],
    ['crystalGreen', [9, 18, 45, 77]],
  ];
  const crystals = crystalSpecs.map(([name, rect]) => img[name] && normalize(img[name], rect, { maxW: 44, maxH: 58 })).filter(Boolean);
  if (crystals.length) sources.set('mineral:crystal', crystals);
  const crystalPalettes = [
    ['blue', img.crystalBlue && normalize(img.crystalBlue, [0, 7, 64, 121], { maxW: 44, maxH: 58 })],
    ['ice', img.crystalIcy && normalize(img.crystalIcy, [128, 3, 32, 61], { maxW: 44, maxH: 58 })],
    ['red', img.crystalRed && normalize(img.crystalRed, [2, 0, 30, 32], { maxW: 44, maxH: 58 })],
    ['green', img.crystalGreen && normalize(img.crystalGreen, [9, 18, 45, 77], { maxW: 44, maxH: 58 })],
    ['gold', img.crystalGold && normalize(img.crystalGold, [0, 0, 32, 32], { maxW: 44, maxH: 58 })],
    ['purple', img.crystalPurple && normalize(img.crystalPurple, [0, 0, 32, 32], { maxW: 44, maxH: 58 })],
  ];
  for (const [palette, sprite] of crystalPalettes) if (sprite) sources.set(`mineral:crystal:${palette}`, [sprite]);
}

export function preloadEcosystemSprites() {
  if (!loadStarted) { loadStarted = true; loadSprites().catch(() => {}); }
}

function getSprite(e) {
  if (e.kind === 'plant') return sources.get(`plant:${e.variant}`);
  if (e.kind === 'animal') {
    const mode = e.phase === 'fleeing' ? 'run' : 'idle';
    const frames = sources.get(`animal:${e.variant}:${mode}`) || sources.get(`animal:${e.variant}:idle`);
    if (!frames?.length) return null;
    const frame = Math.floor(Math.max(0, e.phaseTime || 0) * (mode === 'run' ? 10 : 2)) % frames.length;
    return frames[frame];
  }
  const variants = sources.get(e.palette ? `mineral:${e.variant}:${e.palette}` : `mineral:${e.variant}`);
  if (!variants?.length) return null;
  return variants[Math.abs((e.id || 0) * 7) % variants.length];
}

function drawPlant(ctx, e, sprite) {
  const growth = Math.max(0, Math.min(1, Number(e.growth) || 0));
  if (growth <= 0) return;
  const width = Math.max(1, e.size);
  const height = Math.max(1, e.size * growth);
  const shown = CELL * growth;
  const sway = Math.sin((e.phaseTime || 0) * 2.4 + (e.id || 0)) * 0.045;
  ctx.save(); ctx.translate(Math.round(e.x), Math.round(e.y)); ctx.rotate(sway);
  ctx.drawImage(sprite, 0, Math.round(CELL - shown), CELL, Math.max(1, Math.ceil(shown)),
    Math.round(-width / 2), Math.round(-height), Math.round(width), Math.round(height));
  ctx.restore();
}

function drawAnimal(ctx, e, sprite) {
  const emerge = 0.42 + Math.max(0, Math.min(1, Number(e.growth) || 0)) * 0.58;
  const width = Math.max(1, e.size * emerge), height = width;
  const bob = e.phase === 'fleeing' ? Math.round(Math.sin((e.phaseTime || 0) * 18) * Math.min(2, height * 0.06)) : 0;
  ctx.save(); ctx.translate(Math.round(e.x), Math.round(e.y + bob));
  ctx.scale(e.facing < 0 ? -1 : 1, 1);
  ctx.drawImage(sprite, Math.round(-width / 2), Math.round(-height), Math.round(width), Math.round(height));
  ctx.restore();
}

function drawCrack(ctx, e) {
  const t = Math.max(0, Math.min(1, (e.phaseTime || 0) / 0.3));
  const r = Math.max(4, e.size * 0.38), x = Math.round(e.x), y = Math.round(e.y - e.size * 0.55);
  const branches = [
    [[0, -r], [-1, -2], [-4, 1], [-2, 4]],
    [[-1, -2], [-6, -4], [-8, -7]],
    [[-1, -2], [3, -4], [6, -7]],
    [[-2, 4], [-5, 6], [-6, 8]],
    [[-2, 4], [2, 5], [5, 8]],
  ];
  const count = Math.min(branches.length, 1 + Math.floor(t * branches.length));
  ctx.save(); ctx.lineWidth = 1; ctx.lineCap = 'square';
  ctx.strokeStyle = e.variant === 'crystal' ? '#e9fcff' : '#332d27';
  for (let i = 0; i < count; i++) {
    const line = branches[i]; ctx.beginPath(); ctx.moveTo(x + line[0][0], y + line[0][1]);
    for (let j = 1; j < line.length; j++) ctx.lineTo(x + line[j][0], y + line[j][1]);
    ctx.stroke();
  }
  ctx.restore();
}

function drawDebris(ctx, d) {
  const size = Math.max(1, Math.round(d.size || 2));
  ctx.save(); ctx.globalAlpha = Math.max(0, Math.min(1, d.alpha ?? 1));
  ctx.translate(Math.round(d.x), Math.round(d.y));
  // Keep fragments chunky; only rotate larger chips so the pixels remain crisp.
  if (size >= 4) ctx.rotate(Math.round((d.rotation || 0) * 4) / 4);
  ctx.fillStyle = d.color || '#a99579'; ctx.fillRect(-Math.floor(size / 2), -Math.floor(size / 2), size, size);
  ctx.restore();
}

export function renderEcosystem(ctx, state) {
  if (!ctx || !state) return;
  preloadEcosystemSprites();
  ctx.imageSmoothingEnabled = false;
  const entities = Array.isArray(state.entities) ? state.entities : [];
  for (const e of entities) {
    if (!Number.isFinite(e.x) || !Number.isFinite(e.y) || !Number.isFinite(e.size)) continue;
    const sprite = getSprite(e);
    if (!sprite) continue;
    ctx.save(); ctx.globalAlpha = Math.max(0, Math.min(1, Number(e.alpha) || 0));
    if (e.kind === 'plant') drawPlant(ctx, e, sprite);
    else if (e.kind === 'animal') drawAnimal(ctx, e, sprite);
    else {
      const emerge = 0.42 + Math.max(0, Math.min(1, Number(e.growth) || 0)) * 0.58;
      const size = Math.max(1, e.size * emerge);
      ctx.drawImage(sprite, Math.round(e.x - size / 2), Math.round(e.y - size), Math.round(size), Math.round(size));
      if (e.phase === 'cracking') drawCrack(ctx, e);
    }
    ctx.restore();
  }
  for (const d of Array.isArray(state.debris) ? state.debris : []) {
    if (Number.isFinite(d.x) && Number.isFinite(d.y)) drawDebris(ctx, d);
  }
}
