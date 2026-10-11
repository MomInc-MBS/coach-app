import {readdir,readFile} from 'node:fs/promises';
import {join} from 'node:path';

// The AGPL source offer: the authored source needed to rebuild and run this release.
// Never secrets or private material (plan/, env files, *.dpapi, private keys), tests,
// build outputs or media (the app already serves its media).
const ROOTS=['server','db','scripts','scheduler','pod','local-coach','modules','creature','handborne','war-room','food','packs','arcade','drizzle','release-trust','audio'];
const GENERATED=new Set(['app-runtime.mjs','launch-runtime.mjs','local-coach-runtime.mjs','nutrition-data.mjs','workout-tracks.js','war-room/gala-bay.js','handborne/companion.mjs']);
const offered=path=>(path==='LICENSE'||/\.(mjs|js|cjs|ts|tsx|py|html|css|json|jsonc|sql|webmanifest)$/.test(path))&&!GENERATED.has(path)&&!/(^|\/)(assets|node_modules|dist|plan|tests)\/|(^|\/)\.|\.dpapi$|secret|\.env|\.dev\.vars/i.test(path);
const PRIVATE_KEY=/-----BEGIN [A-Z ]*PRIVATE KEY-----|"d"\s*:\s*"[A-Za-z0-9_-]{40,}"/;
const SKIP_DIRECTORIES=new Set(['assets','node_modules','dist','plan','tests']);
const REUSED_SOURCES=['vendor/bitchord/LICENSE','vendor/bitchord/NOTICE','vendor/butterchurn/butterchurn-2.6.7.min.js','vendor/butterchurn/presets-2.4.7.min.js','vendor/butterchurn/LICENSE.engine','vendor/butterchurn/LICENSE.presets','vendor/butterchurn/README.md'];

export async function sourceOffer(root='.'){
 const paths=(await readdir(root)).filter(offered);
 async function walk(folder){
  for(const entry of await readdir(join(root,folder),{withFileTypes:true})){
   if(entry.isSymbolicLink())continue;
   const path=`${folder}/${entry.name}`;
   if(entry.isDirectory()){if(!entry.name.startsWith('.')&&!SKIP_DIRECTORIES.has(entry.name))await walk(path);}
   else if(entry.isFile()&&offered(path))paths.push(path);
  }
 }
 for(const folder of ROOTS)await walk(folder);
 paths.push(...REUSED_SOURCES);
 paths.push('vendor/shaders/runtime.mjs','vendor/shaders/LICENSE');
 const sources={};
 for(const path of paths.sort()){sources[path]=await readFile(join(root,path),'utf8');if(PRIVATE_KEY.test(sources[path]))throw new Error(`The source offer would publish a private key: ${path}`);}
 return sources;
}
