// A palette belongs to one colour channel. Its three colours travel together
// over that part's surface; texture height and material properties stay separate.
export function paletteSurfaceTint(u, v) {
 const phase = Math.PI * 2;
 const a = Math.sin(phase * u * 2 + Math.sin(phase * v) * .8);
 const b = Math.cos(phase * v * 2 + Math.sin(phase * u) * .65);
 const value = Math.max(0, Math.min(1, .5 + (a + b * .65) * .36));
 return value * value * (3 - 2 * value);
}

// Same field for installed texture packets, including packets with a flat mask.
export const PALETTE_SURFACE_GLSL = `
float myr5PaletteSurfaceTint(vec2 uv) {
 float phase=6.28318530718;
 float a=sin(phase*uv.x*2.0+sin(phase*uv.y)*0.8);
 float b=cos(phase*uv.y*2.0+sin(phase*uv.x)*0.65);
 float value=clamp(0.5+(a+b*0.65)*0.36,0.0,1.0);
 return value*value*(3.0-2.0*value);
}`;
