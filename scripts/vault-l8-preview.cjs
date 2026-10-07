// Hall review harness: node scripts/vault-l8-preview.cjs (port 8908). Uses the real vault modules; open /?debug for myr5Hall hooks.
const http=require('node:http'),fs=require('node:fs/promises'),path=require('node:path');
const root=path.resolve(__dirname,'..'),PORT=Number(process.env.VAULT_L8_PORT)||8908;
const html=`<!doctype html><meta name=viewport content="width=device-width,initial-scale=1"><body style="margin:0;background:#000"><script type="importmap">{"imports":{"three":"/vendor/three/three.module.js","three/addons/loaders/GLTFLoader.js":"/vendor/three/GLTFLoader.js","three/addons/libs/meshopt_decoder.module.js":"/vendor/three/meshopt_decoder.module.js"}}</script><script type=module>window.errors=[];addEventListener('error',e=>errors.push(e.message));
await import('/modules/vault/vault-store.mjs');const m=await import('/modules/vault/vault-hall.mjs');window.hall=m;window.go=()=>m.enterHall();document.body.insertAdjacentHTML('beforeend','<button id=go style="position:fixed;top:40%;left:30%;z-index:99">enter</button>');go.onclick=()=>m.enterHall();</script>`;
const mime={'.mjs':'text/javascript','.js':'text/javascript','.json':'application/json','.glb':'model/gltf-binary','.webp':'image/webp','.css':'text/css','.ts':'text/javascript'};
const server=http.createServer(async(req,res)=>{const u=new URL(req.url,'http://l');if(u.pathname==='/'){res.setHeader('Content-Type','text/html');return res.end(html);}
 try{const f=path.resolve(root,'.'+decodeURIComponent(u.pathname));if(!f.startsWith(root+path.sep))throw 0;let d=await fs.readFile(f);if(f.endsWith('.ts'))d=require('node:module').stripTypeScriptTypes(d.toString());res.setHeader('Content-Type',mime[path.extname(f)]||'application/octet-stream');res.end(d);}
 catch{res.writeHead(404);res.end();}});
module.exports={server,PORT};
if(require.main===module)server.listen(PORT,'127.0.0.1',()=>console.log('hall preview http://127.0.0.1:'+PORT));
