import {readdir,readFile} from 'node:fs/promises';
import {join} from 'node:path';

// The AGPL source offer: the authored source needed to rebuild and run this release.
// Never secrets or private material (plan/, env files, *.dpapi, private keys), tests,
// build outputs or media (the app already serves its media).
const ROOTS=['server','db','scripts','scheduler','pod','local-coach','modules','creature','handborne','war-room','food','packs','arcade','drizzle','release-trust','audio'];
const GENERATED=new Set(['app-runtime.mjs','launch-runtime.mjs','local-coach-runtime.mjs','nutrition-data.mjs','workout-tracks.js','war-room/gala-bay.js','handborne/companion.mjs']);
const offered=path=>(path==='LICENSE'||/\.(mjs|js|cjs|ts|tsx|py|html|css|json|jsonc|sql|webmanifest)$/.test(path))&&!GENERATED.has(path)&&!/(^|\/)(assets|node_modules|dist|plan|tests)\/|(^|\/)\.|\.dpapi$|secret|\.env|\.dev\.vars/i.test(path);
const PRIVATE_KEY=/-----BEGIN [A-Z ]*PRIVATE KEY-----|"d"\s*:\s*"[A-Za-z0-9_-]{40,}"/;

export async function sourceOffer(root='.'){
 const paths=(await readdir(root)).filter(offered);
 for(const folder of ROOTS)for(const entry of await readdir(join(root,folder),{recursive:true})){const path=`${folder}/${entry.replaceAll('\\','/')}`;if(offered(path))paths.push(path);}
 const sources={};
 for(const path of paths.sort()){sources[path]=await readFile(join(root,path),'utf8');if(PRIVATE_KEY.test(sources[path]))throw new Error(`The source offer would publish a private key: ${path}`);}
 return sources;
}
