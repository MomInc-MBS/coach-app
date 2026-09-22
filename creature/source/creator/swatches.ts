// Runtime swatch generation (Rank 4): texture pattern previews are small canvases rendered
// from the same procedural surfaceSample() the 3D material uses, cached by family id, never
// shipped as image files. Colour swatches need no canvas at all — a CSS background is enough.
import {surfaceSample} from './material-language';

const cache = new Map<number, string>();
export function texturePreviewDataURL(familyId: number, size = 40): string {
 const cached = cache.get(familyId); if (cached) return cached;
 const canvas = document.createElement('canvas'); canvas.width = canvas.height = size;
 const ctx = canvas.getContext('2d'); if (!ctx) return '';
 const img = ctx.createImageData(size, size);
 for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
  const s = surfaceSample(familyId, x / size, y / size), v = Math.round(Math.max(0, Math.min(1, s.height)) * 255), i = (y * size + x) * 4;
  img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255;
 }
 ctx.putImageData(img, 0, 0);
 const url = canvas.toDataURL('image/png'); cache.set(familyId, url); return url;
}
