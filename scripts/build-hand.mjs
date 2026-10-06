import {spawnSync} from 'node:child_process';
import {readFile,writeFile,cp} from 'node:fs/promises';
const source=new URL('../handborne/source/',import.meta.url);
// One authoritative implementation for both editors. This also catches accidental drift.
for(const name of ['material-language.ts','material-patterns.ts','material-refinement.ts','palette-finishes.ts','palettes.json']){
 await cp(new URL('../creature/source/creator/'+name,import.meta.url),new URL('app/'+name,source));
}
const result=spawnSync(process.execPath,['scripts/build-embedded.mjs'],{cwd:source,stdio:'inherit'});
if(result.status!==0)throw Error('Hand customizer build failed.');
const out=new URL('dist/embedded/',source),target=new URL('../handborne/',import.meta.url);
await cp(new URL('assets/',out),new URL('assets/',target),{recursive:true});
await cp(new URL('companion.mjs',out),new URL('companion.mjs',target));
const built=await readFile(new URL('index.html',out),'utf8');
const js=built.match(/src="([^"]+\.js)"/)?.[1],css=built.match(/href="([^"]+\.css)"/)?.[1];
if(!js||!css)throw Error('Hand build entrypoints missing.');
let index=await readFile(new URL('index.html',target),'utf8');
index=index.replace(/data-module="[^"]+"/,`data-module="${js}"`).replace(/href="\/handborne\/assets\/[^\"]+\.css"/,`href="${css}"`);
await writeFile(new URL('index.html',target),index);
console.log('Hand customizer shares current Coach materials.');
