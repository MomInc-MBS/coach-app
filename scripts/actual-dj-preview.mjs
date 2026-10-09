import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
const project=fileURLToPath(new URL('../',import.meta.url));
const html='<!doctype html><html lang="en"><meta name="viewport" content="width=device-width,initial-scale=1"><title>actual.dj / MYR5 preview</title><link rel="stylesheet" href="/spotify-terminal.css"><link rel="stylesheet" href="/actual-dj.css"><body style="background:#100b18"><button id="open" style="padding:20px;margin:30px">Open actual.dj</button><script type="module">import{initSpotifyTerminal}from"/spotify-terminal.mjs";const dj=window.djPreview=initSpotifyTerminal({getAccount:()=>null});document.getElementById("open").addEventListener("click",()=>dj.open());dj.open();</script></body></html>';
const types={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.m4a':'audio/mp4','.wav':'audio/wav','.mp3':'audio/mpeg','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.glb':'model/gltf-binary','.bin':'application/octet-stream','.wasm':'application/wasm','.woff2':'font/woff2','.ttf':'font/ttf'};
export function createDJPreviewServer({root=project}={}){
 return createServer(async(req,res)=>{res.setHeader('Cache-Control','no-store');
  const path=new URL(req.url,'http://preview').pathname;
  if(path==='/'||path==='/actual-dj-preview'){res.setHeader('Content-Type','text/html');res.end(html);return;}
  if(path.startsWith('/api/')){res.writeHead(401,{'Content-Type':'application/json'});res.end('{"error":"Sign in on the live MYR5 app to use account controls."}');return;}
  try{const decoded=decodeURIComponent(path),file=resolve(root,'.'+decoded);if(!file.startsWith(resolve(root)+sep)||decoded.split('/').some(p=>p.startsWith('.'))||/^\/(server|scripts|tests|node_modules|release-trust)\//.test(decoded)||!types[extname(file)])throw Error();const data=await readFile(file);res.setHeader('Content-Type',types[extname(file)]);res.end(data);}catch{res.writeHead(404);res.end('Not found');}
 });
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const server=createDJPreviewServer({root:process.env.ACTUAL_DJ_PREVIEW_ROOT||project}),port=Number(process.env.ACTUAL_DJ_PREVIEW_PORT)||18905;
 server.listen(port,'127.0.0.1',()=>console.log(`actual.dj preview: http://127.0.0.1:${port}/actual-dj-preview`));
}
