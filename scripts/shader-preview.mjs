import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.glb':'model/gltf-binary','.bin':'application/octet-stream','.wasm':'application/wasm','.m4a':'audio/mp4','.mp3':'audio/mpeg','.woff2':'font/woff2','.ttf':'font/ttf','.webmanifest':'application/manifest+json'};
export function previewServer(root){
 root=resolve(root);
 return createServer(async(req,res)=>{
  res.setHeader('Cache-Control','no-store');
  const path=decodeURIComponent(new URL(req.url,'http://preview').pathname);
  if(path.startsWith('/api/')){const config=path==='/api/auth/config';res.writeHead(config?200:401,{'Content-Type':'application/json'});res.end(JSON.stringify(config?{enabled:false}:{error:'Sign in on the live app'}));return;}
  try{
   let file=resolve(root,'.'+path);if(!file.startsWith(root+sep)&&file!==root)throw Error();
   if(path.split('/').some(part=>part.startsWith('.'))||/^\/(?:scripts|server|tests|node_modules|release-trust)(?:\/|$)/.test(path))throw Error();
   if((await stat(file)).isDirectory())file=resolve(file,'index.html');
   const body=await readFile(file);res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream'});res.end(req.method==='HEAD'?undefined:body);
  }catch{res.writeHead(404);res.end('Not found');}
 });
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const root=process.argv[2]||'dist/client',port=Number(process.argv[3])||18941;
 previewServer(root).listen(port,'127.0.0.1',()=>console.log(`Shader preview http://127.0.0.1:${port}`));
}
