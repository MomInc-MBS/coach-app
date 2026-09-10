import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {build} from 'esbuild';
const output=resolve(process.argv[2]||'../../outputs/Weapon-Lab.html');
const js=await build({entryPoints:['pod/weapon-review.mjs'],bundle:true,format:'iife',target:'es2022',write:false,minify:true});
const weapons=await readFile('pod/gala-weapons.js','utf8');
const world=(await readFile('pod/worlds/great-wall.png')).toString('base64');
const css=(await readFile('pod/weapon-review.css','utf8')).replace("url('worlds/great-wall.png')",`url('data:image/png;base64,${world}')`);
const html=(await readFile('pod/weapon-review.html','utf8'))
 .replace('<link rel="stylesheet" href="weapon-review.css">',`<style>${css}</style>`)
 .replace('href="../pose.html"','href="https://myr5.mominc.online/pose.html"')
 .replace('<script src="gala-weapons.js"></script>',`<script>${weapons.replaceAll('</script','<\\/script')}</script>`)
 .replace('<script type="module" src="weapon-review.mjs"></script>',`<script>${js.outputFiles[0].text.replaceAll('</script','<\\/script')}</script>`);
await mkdir(dirname(output),{recursive:true});await writeFile(output,html);console.log('Self-contained weapon review saved.');
