// Procedural surface textures for cardio-worlds MYR5
// Seeded RNG + canvas procedural, no external assets

class SeededRNG {
  constructor(seed) {
    this.seed = seed;
  }
  next() {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
}

function createCanvas(size) {
  const canvas = typeof document !== 'undefined'
    ? document.createElement('canvas')
    : { width: size, height: size, getContext: () => null };
  canvas.width = size;
  canvas.height = size;
  return canvas;
}

function drawMetal(ctx, size, rng) {
  const base = 200;
  ctx.fillStyle = `rgb(${base}, ${base}, ${base})`;
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = `rgba(150, 150, 150, 0.4)`;
  ctx.lineWidth = 1;
  for (let i = 0; i < 60; i++) {
    const y = rng.next() * size;
    const x1 = 0;
    const x2 = size * (0.3 + rng.next() * 0.4);
    ctx.beginPath();
    ctx.moveTo(x1, y);
    ctx.lineTo(x2, y + (rng.next() - 0.5) * 2);
    ctx.stroke();
  }

  ctx.fillStyle = `rgba(100, 100, 100, 0.6)`;
  [[0, 0], [size, 0], [0, size], [size, size]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(180, 180, 180, 0.5)`;
    ctx.beginPath();
    ctx.arc(x + 2, y + 2, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(100, 100, 100, 0.6)`;
  });

  for (let i = 0; i < 4; i++) {
    const x = (i + 1) * (size / 5);
    ctx.strokeStyle = `rgba(120, 120, 120, 0.5)`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, size);
    ctx.stroke();
  }
}

function drawGold(ctx, size, rng) {
  const base = 210;
  ctx.fillStyle = `rgb(${base}, ${base - 10}, ${base - 30})`;
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 8; i++) {
    const x = rng.next() * size;
    const y = rng.next() * size;
    const w = 20 + rng.next() * 30;
    const h = 15 + rng.next() * 20;
    ctx.strokeStyle = `rgba(180, 170, 140, 0.5)`;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, w, h);
    const detail = 3 + Math.floor(rng.next() * 3);
    for (let j = 0; j < detail; j++) {
      ctx.strokeStyle = `rgba(200, 190, 160, 0.3)`;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(x, y + j * (h / detail));
      ctx.lineTo(x + w, y + j * (h / detail));
      ctx.stroke();
    }
  }

  ctx.strokeStyle = `rgba(190, 180, 150, 0.4)`;
  ctx.lineWidth = 1;
  for (let i = 0; i < 40; i++) {
    const x1 = rng.next() * size;
    const y1 = rng.next() * size;
    const len = 10 + rng.next() * 20;
    const angle = rng.next() * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x1 + Math.cos(angle) * len, y1 + Math.sin(angle) * len);
    ctx.stroke();
  }
}

function drawStone(ctx, size, rng) {
  const base = 190;
  ctx.fillStyle = `rgb(${base}, ${base}, ${base})`;
  ctx.fillRect(0, 0, size, size);

  const brickW = 40;
  const brickH = 30;
  for (let by = 0; by < size; by += brickH) {
    const offset = (by / brickH) % 2 === 0 ? 0 : brickW / 2;
    for (let bx = -brickW / 2; bx < size; bx += brickW) {
      const x = bx + offset;
      const jitterX = (rng.next() - 0.5) * 3;
      const jitterY = (rng.next() - 0.5) * 3;
      ctx.strokeStyle = `rgba(140, 140, 140, 0.6)`;
      ctx.lineWidth = 2;
      ctx.strokeRect(x + jitterX, by + jitterY, brickW, brickH);
    }
  }

  for (let i = 0; i < 100; i++) {
    const x = rng.next() * size;
    const y = rng.next() * size;
    ctx.fillStyle = `rgba(150, 150, 150, ${0.2 + rng.next() * 0.3})`;
    ctx.beginPath();
    ctx.arc(x, y, 1 + rng.next() * 2, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < 15; i++) {
    const x = rng.next() * size;
    const y = rng.next() * size;
    const w = 2 + rng.next() * 8;
    const h = 0.5 + rng.next() * 1.5;
    ctx.strokeStyle = `rgba(130, 130, 130, 0.5)`;
    ctx.lineWidth = h;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w, y + (rng.next() - 0.5) * 3);
    ctx.stroke();
  }
}

function drawMoss(ctx, size, rng) {
  const base = 195;
  ctx.fillStyle = `rgb(${base - 20}, ${base - 10}, ${base - 30})`;
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 150; i++) {
    const x = rng.next() * size;
    const y = rng.next() * size;
    const radius = 2 + rng.next() * 6;
    const greenMod = Math.floor(rng.next() * 40);
    ctx.fillStyle = `rgba(${150 + greenMod}, ${160 + greenMod}, ${140 + greenMod}, ${0.3 + rng.next() * 0.4})`;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = `rgba(140, 150, 130, 0.4)`;
  ctx.lineWidth = 1;
  for (let i = 0; i < 80; i++) {
    const x = rng.next() * size;
    const y = rng.next() * size;
    const len = 3 + rng.next() * 8;
    const angle = rng.next() * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
    ctx.stroke();
  }
}

function drawWood(ctx, size, rng) {
  const base = 195;
  ctx.fillStyle = `rgb(${base - 5}, ${base - 15}, ${base - 25})`;
  ctx.fillRect(0, 0, size, size);

  for (let y = 0; y < size; y += 3) {
    const waveAmp = 2 + rng.next() * 3;
    const waveFreq = 0.01 + rng.next() * 0.02;
    const variation = 180 + Math.floor(rng.next() * 30);
    ctx.strokeStyle = `rgb(${variation}, ${variation - 10}, ${variation - 20})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x < size; x += 2) {
      ctx.lineTo(x, y + Math.sin(x * waveFreq) * waveAmp);
    }
    ctx.stroke();
  }

  for (let i = 0; i < 8; i++) {
    const x = rng.next() * size * 0.8 + size * 0.1;
    const y = rng.next() * size;
    const wy = 10 + rng.next() * 20;
    ctx.fillStyle = `rgba(140, 130, 120, 0.5)`;
    ctx.beginPath();
    ctx.ellipse(x, y, 8, wy, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPlaster(ctx, size, rng) {
  const base = 205;
  ctx.fillStyle = `rgb(${base}, ${base}, ${base})`;
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 25; i++) {
    const x = rng.next() * size;
    const y = rng.next() * size;
    const w = 5 + rng.next() * 15;
    const h = 3 + rng.next() * 10;
    ctx.fillStyle = `rgba(190, 190, 190, 0.6)`;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = `rgba(170, 170, 170, 0.8)`;
    ctx.lineWidth = 0.5;
    ctx.strokeRect(x, y, w, h);
  }

  for (let i = 0; i < 40; i++) {
    const x1 = rng.next() * size;
    const y1 = rng.next() * size;
    const len = 5 + rng.next() * 20;
    const angle = rng.next() * Math.PI * 2;
    ctx.strokeStyle = `rgba(180, 180, 180, 0.5)`;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x1 + Math.cos(angle) * len, y1 + Math.sin(angle) * len);
    ctx.stroke();
  }

  for (let i = 0; i < 100; i++) {
    ctx.fillStyle = `rgba(160, 160, 160, ${0.1 + rng.next() * 0.15})`;
    ctx.fillRect(
      rng.next() * size,
      rng.next() * size,
      0.5 + rng.next() * 1,
      0.5 + rng.next() * 1
    );
  }
}

function drawBallast(ctx, size, rng) {
  const base = 175;
  ctx.fillStyle = `rgb(${base}, ${base}, ${base})`;
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 120; i++) {
    const x = rng.next() * size;
    const y = rng.next() * size;
    const w = 4 + rng.next() * 10;
    const h = 4 + rng.next() * 10;
    const rotation = rng.next() * Math.PI;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.fillStyle = `rgb(${140 + Math.floor(rng.next() * 40)}, ${140 + Math.floor(rng.next() * 40)}, ${140 + Math.floor(rng.next() * 40)})`;
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.strokeStyle = `rgba(100, 100, 100, 0.5)`;
    ctx.lineWidth = 0.5;
    ctx.strokeRect(-w / 2, -h / 2, w, h);
    ctx.restore();
  }

  for (let i = 0; i < 200; i++) {
    ctx.fillStyle = `rgba(120, 120, 120, ${0.1 + rng.next() * 0.2})`;
    ctx.fillRect(
      rng.next() * size,
      rng.next() * size,
      0.5 + rng.next() * 1.5,
      0.5 + rng.next() * 1.5
    );
  }
}

function drawRubber(ctx, size, rng) {
  const base = 40;
  ctx.fillStyle = `rgb(${base}, ${base}, ${base})`;
  ctx.fillRect(0, 0, size, size);

  for (let y = 0; y < size; y += 4) {
    ctx.strokeStyle = `rgba(80, 80, 80, 0.4)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x < size; x += 2) {
      const jitter = (rng.next() - 0.5) * 1;
      ctx.lineTo(x, y + jitter);
    }
    ctx.stroke();
  }

  for (let i = 0; i < 60; i++) {
    const x = rng.next() * size;
    const y = rng.next() * size;
    const w = 1 + rng.next() * 3;
    const h = 1 + rng.next() * 2;
    ctx.fillStyle = `rgba(60, 60, 60, 0.5)`;
    ctx.fillRect(x, y, w, h);
  }

  for (let i = 0; i < 300; i++) {
    ctx.fillStyle = `rgba(50, 50, 50, ${0.05 + rng.next() * 0.1})`;
    ctx.fillRect(
      rng.next() * size,
      rng.next() * size,
      0.5 + rng.next() * 1,
      0.5 + rng.next() * 1
    );
  }
}

export function createSurfaceTexture(THREE, kind) {
  const size = 256;
  const seed = kind.charCodeAt(0) + kind.charCodeAt(1) * 256;
  const rng = new SeededRNG(seed);

  const canvas = createCanvas(size);
  const ctx = canvas.getContext('2d');

  switch (kind) {
    case 'metal':
      drawMetal(ctx, size, rng);
      break;
    case 'gold':
      drawGold(ctx, size, rng);
      break;
    case 'stone':
      drawStone(ctx, size, rng);
      break;
    case 'moss':
      drawMoss(ctx, size, rng);
      break;
    case 'wood':
      drawWood(ctx, size, rng);
      break;
    case 'plaster':
      drawPlaster(ctx, size, rng);
      break;
    case 'ballast':
      drawBallast(ctx, size, rng);
      break;
    case 'rubber':
      drawRubber(ctx, size, rng);
      break;
    default:
      drawPlaster(ctx, size, rng);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 2;

  return texture;
}
