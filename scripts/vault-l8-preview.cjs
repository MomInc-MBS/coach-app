// Hall review harness: node scripts/vault-l8-preview.cjs [--shots]. Port 8908. Uses throwaway goal/store stubs
// only when L0's real modules/vault/vault-goals.mjs / vault-store.mjs are missing.
const http=require('node:http'),fs=require('node:fs/promises'),path=require('node:path');
const root=path.resolve(__dirname,'..'),PORT=Number(process.env.VAULT_L8_PORT)||8908;
const stubs={'/modules/vault/vault-goals.mjs':`export const GOALS=Array.from({length:30},(_,i)=>({id:'g'+i,clue:'Clue '+i+': the koi that fills the pond is not afraid of you.',title:'Title '+i,tier:i%5===4?'legendary':'rare',test:s=>!!s.earned?.['g'+i],progress:s=>({have:(s.counts?.['g'+i]||0),need:i%3===0?10:1})}));`,
'/modules/vault/vault-store.mjs':`const K='stub-vault';export const read=()=>JSON.parse(localStorage.getItem(K)||'{"earned":{},"counts":{"g3":3}}');window.myr5Vault={earn(id){const s=read();s.earned[id]={at:Date.now()};localStorage.setItem(K,JSON.stringify(s));dispatchEvent(new CustomEvent('myr5:vault-earned',{detail:{ids:[id]}}));},reset(){localStorage.removeItem(K);},state:read};`};
const html=`<!doctype html><meta name=viewport content="width=device-width,initial-scale=1"><body style="margin:0;background:#000"><script type="importmap">{"imports":{"three":"/vendor/three/three.module.js","three/addons/loaders/GLTFLoader.js":"/vendor/three/GLTFLoader.js","three/addons/libs/meshopt_decoder.module.js":"/vendor/three/meshopt_decoder.module.js"}}</script><script type=module>window.errors=[];addEventListener('error',e=>errors.push(e.message));
await import('/modules/vault/vault-store.mjs');const m=await import('/modules/vault/vault-hall.mjs');window.hall=m;window.go=()=>m.enterHall();document.body.insertAdjacentHTML('beforeend','<button id=go style="position:fixed;top:40%;left:30%;z-index:99">enter</button>');go.onclick=()=>m.enterHall();</script>`;
const mime={'.mjs':'text/javascript','.js':'text/javascript','.json':'application/json','.glb':'model/gltf-binary','.webp':'image/webp','.css':'text/css','.ts':'text/javascript'};
const server=http.createServer(async(req,res)=>{const u=new URL(req.url,'http://l');if(u.pathname==='/'){res.setHeader('Content-Type','text/html');return res.end(html);}
 try{const f=path.resolve(root,'.'+decodeURIComponent(u.pathname));if(!f.startsWith(root+path.sep))throw 0;const d=await fs.readFile(f);res.setHeader('Content-Type',mime[path.extname(f)]||'application/octet-stream');res.end(d);}
 catch{if(stubs[u.pathname]){res.setHeader('Content-Type','text/javascript');return res.end(stubs[u.pathname]);}res.writeHead(404);res.end();}});
module.exports={server,PORT};
if(require.main===module)server.listen(PORT,'127.0.0.1',()=>console.log('hall preview http://127.0.0.1:'+PORT));
