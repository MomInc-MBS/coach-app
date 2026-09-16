/** Trusted, app-owned liquid pilot. Downloaded pack bytes are data only. */
export function createLiquidPilotRuntime({ host, parameters = {} } = {}) {
  if (!host?.ownerDocument) throw new Error('liquid runtime requires an owned host');
  const canvas = host.ownerDocument.createElement('canvas');
  canvas.width = 96; canvas.height = 64; canvas.className = 'material-liquid-pilot';
  host.replaceChildren(canvas);
  const ctx = canvas.getContext('2d'); let disposed = false; let energy = 0;
  const hue = Number.isFinite(parameters.hue) ? Math.max(250, Math.min(310, parameters.hue)) : 278;
  const strength = Number.isFinite(parameters.strength) ? Math.max(.1, Math.min(1, parameters.strength)) : .6;
  const draw = () => { if (disposed || !ctx) return; const gradient = ctx.createRadialGradient(48, 32, 1, 48, 32, 58); gradient.addColorStop(0, `hsl(${hue - energy * 18} 85% ${44 + energy * 25}%)`); gradient.addColorStop(1, `hsl(${hue} 72% 10%)`); ctx.fillStyle = gradient; ctx.fillRect(0, 0, 96, 64); };
  const pointer = event => { energy = strength; draw(); event.preventDefault?.(); };
  canvas.addEventListener('pointerdown', pointer); draw();
  return Object.freeze({ canvas, dispose() { if (disposed) return; disposed = true; canvas.removeEventListener('pointerdown', pointer); canvas.remove(); }, getDebug: () => ({ disposed, energy, hue }) });
}
