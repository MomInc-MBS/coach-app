const cropFor = {
  body: [8, 3, 48, 91], skin: [20, 14, 26, 27], face: [19, 14, 27, 23], hair: [15, 4, 35, 29], facial: [18, 17, 28, 22],
  headwear: [16, 2, 33, 22], neck: [23, 29, 19, 20], torso: [19, 32, 29, 32], shoulders: [13, 29, 38, 24], arms: [12, 34, 40, 32], hands: [13, 51, 38, 18],
  legs: [17, 52, 31, 31], feet: [17, 73, 31, 18], held: [0, 20, 64, 66], back: [3, 19, 58, 68], base: [13, 80, 39, 16], pet: [0, 45, 64, 47], dye: [20, 32, 24, 31]
};

export function makePartPreview(doc, avatar, look, sectionId, value, draw = avatar.draw) {
  const source = doc.createElement('canvas');
  const preview = doc.createElement('canvas');
  const crop = cropFor[sectionId] || cropFor.body;
  const next = structuredClone(look);
  next.parts[sectionId] = value;
  draw(source, next, { weapon: false, companion: false, prop: false, petOnly: sectionId === 'pet' });
  preview.width = crop[2];
  preview.height = crop[3];
  const ctx = preview.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, preview.width, preview.height);
  ctx.drawImage(source, ...crop, 0, 0, preview.width, preview.height);
  preview.className = 'gala-option-art';
  preview.setAttribute('aria-hidden', 'true');
  return preview;
}

export function makeDyePreview(doc, avatar, look, dye) {
  const canvas = doc.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = 34;
  canvas.height = 40;
  ctx.fillStyle = '#17100b';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = avatar.dyes[dye];
  ctx.fillRect(5, 5, 24, 29);
  ctx.fillStyle = '#fff4d5';
  ctx.fillRect(12, 8, 3, 22);
  ctx.fillStyle = '#382318';
  ctx.fillRect(5, 31, 24, 3);
  canvas.className = 'gala-option-art gala-swatch-art';
  canvas.setAttribute('aria-hidden', 'true');
  return canvas;
}

export function makeWeaponPreview(doc, weapons, weapon) {
  const canvas = doc.createElement('canvas');
  canvas.width = 42;
  canvas.height = 68;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  weapons.draw(ctx, weapon, { x: 1, y: 2, scale: 1 });
  canvas.className = 'gala-option-art gala-weapon-art';
  canvas.setAttribute('aria-hidden', 'true');
  return canvas;
}
