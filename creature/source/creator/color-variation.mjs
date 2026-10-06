// CIE Lab distances compare visible colors, independent of hex spelling.
export function colorLab(hex) {
 const channels=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4);
 const [r,g,b]=channels;
 const f=x=>x>216/24389?Math.cbrt(x):(24389/27*x+16)/116;
 const x=f((r*.4124564+g*.3575761+b*.1804375)/.95047),y=f(r*.2126729+g*.7151522+b*.072175),z=f((r*.0193339+g*.119192+b*.9503041)/1.08883);
 return [116*y-16,500*(x-y),200*(y-z)];
}
export const colorDistance=(a,b)=>Math.hypot(...colorLab(a).map((v,i)=>v-colorLab(b)[i]));
const permutations=[[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]];
// Unordered comparison catches repeated combinations even when stops are swapped.
export const paletteDistance=(a,b)=>Math.min(...permutations.map(order=>a.reduce((sum,hex,i)=>sum+colorDistance(hex,b[order[i]]),0)/3));
// Call with unlocked entries first so a locked near-duplicate never hides an owned color.
// Aliases remain in the registry and saved recipes; only redundant UI tiles are folded.
export function distinctSwatches(items,minDistance=14) {
 const selected=[];
 for(const item of items)if(!selected.some(other=>colorDistance(item.hex,other.hex)<minDistance))selected.push(item);
 return selected;
}
