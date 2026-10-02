// R18 G2: count every hex across palettes.json + SIMPLE_COLORS + LEGACY_COLORS; the top 15 are the free colours. Ties keep first appearance (SIMPLE, LEGACY, then palettes).
import {build} from 'esbuild';
globalThis.localStorage={getItem:()=>null,setItem(){}};
const out=await build({stdin:{contents:"export {COLORS,PALETTES} from './creature/source/creator/materials-registry';",resolveDir:process.cwd(),loader:'ts'},bundle:true,format:'esm',platform:'neutral',mainFields:['module','main'],write:false,target:'es2022'});
const {COLORS,PALETTES}=await import('data:text/javascript;base64,'+Buffer.from(out.outputFiles[0].text).toString('base64'));
function census(){
 const n=new Map();
 const add=h=>n.set(h.toLowerCase(),(n.get(h.toLowerCase())||0)+1);
 for(const c of COLORS)[c.primary,c.secondary,c.accent].forEach(add);
 for(const p of PALETTES)p.colors.forEach(add);
 return [...n].sort((a,b)=>b[1]-a[1]);
}

for(const [h,c] of census().slice(0,15))console.log(h,c);
