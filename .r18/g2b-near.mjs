import {build} from 'esbuild';
globalThis.localStorage={getItem:()=>null,setItem(){}};
const out=await build({stdin:{contents:"export {COLORS,PALETTES} from './creature/source/creator/materials-registry';",resolveDir:process.cwd(),loader:'ts'},bundle:true,format:'esm',platform:'neutral',mainFields:['module','main'],write:false,target:'es2022'});
const {COLORS,PALETTES}=await import('data:text/javascript;base64,'+Buffer.from(out.outputFiles[0].text).toString('base64'));
const set=new Set();for(const c of COLORS)[c.primary,c.secondary,c.accent].forEach(h=>set.add(h.toLowerCase()));for(const p of PALETTES)p.colors.forEach(h=>set.add(h.toLowerCase()));
const lab=h=>{let [r,g,b]=[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
 let x=(.4124*r+.3576*g+.1805*b)/.95047,y=.2126*r+.7152*g+.0722*b,z=(.0193*r+.1192*g+.9505*b)/1.08883;
 const f=t=>t>.008856?Math.cbrt(t):7.787*t+16/116;return [116*f(y)-16,500*(f(x)-f(y)),200*(f(y)-f(z))];};
const T={black:'#000000',white:'#ffffff',grey:'#808080',red:'#e02020',orange:'#ff8000',yellow:'#ffe000',green:'#20b020',teal:'#008080',blue:'#2060e0',purple:'#8030c0',pink:'#ff80b0',brown:'#7a4a20',tan:'#d2b48c',navy:'#0f2557',mint:'#98ffcc'};
console.log(set.size,'distinct hexes');
for(const [n,t] of Object.entries(T)){const lt=lab(t);const r=[...set].map(h=>[h,Math.hypot(...lab(h).map((v,i)=>v-lt[i]))]).sort((a,b)=>a[1]-b[1]).slice(0,3);console.log(n.padEnd(7),r.map(([h,d])=>h+' '+d.toFixed(1)).join('  '));}
