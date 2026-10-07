// Local review harness for the vault door: node scripts/vault-l7-preview.cjs  (MYR5_VAULT_PORT, default 8907)
const http=require('node:http'),fs=require('node:fs/promises'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const html=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Vault door</title><style>html,body{margin:0;height:100%;background:#171020;overflow:hidden}#host{position:fixed;inset:0}</style>
<script type="importmap">{"imports":{"three":"/vendor/three/three.module.js","three/addons/loaders/GLTFLoader.js":"/vendor/three/GLTFLoader.js","three/addons/libs/meshopt_decoder.module.js":"/vendor/three/meshopt_decoder.module.js"}}</script></head><body><div id="host"></div><script type="module">
import {mountVaultDoor} from '/modules/vault/vault-door.mjs';
window.errors=[];addEventListener('error',e=>errors.push(e.message));addEventListener('unhandledrejection',e=>errors.push(String(e.reason)));
const GOALS=[
 {id:'still-pond',tier:'rare',title:'Still Water',clue:'The koi that fills the pond is not afraid of you.',test:s=>!!s.earned?.['still-pond'],progress:()=>null},
 {id:'fire-starter',tier:'rare',title:'Tinder',clue:'Where the wood is dry, rub it the wrong way until it sulks.',test:s=>!!s.earned?.['fire-starter']},
 {id:'shares',tier:'rare',title:'Show And Tell',clue:'Pass the secret to five friends on five different days.',test:()=>false,progress:()=>({have:3,need:5})},
 {id:'door-open',tier:'rare',title:'Open Sesame',clue:'Turn the great wheel once, and the wall will answer.',test:()=>true},
 {id:'all-six',tier:'legendary',title:'Six Of Six',clue:'Every board keeps a secret. Learn them all.',test:()=>false,progress:()=>({have:2,need:6})},
];
const state={earned:{}};
window.vault=await mountVaultDoor(document.getElementById('host'),{goals:GOALS,read:()=>state,onEnter:()=>{window.entered=(window.entered||0)+1}});
window.ready=true;
</script></body></html>`;
http.createServer(async(req,res)=>{const url=new URL(req.url,'http://local');if(url.pathname==='/'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);return;}try{const file=path.resolve(root,'.'+decodeURIComponent(url.pathname));if(!file.startsWith(root+path.sep))throw Error('outside root');const data=await fs.readFile(file);res.setHeader('Content-Type',({'.mjs':'text/javascript','.js':'text/javascript','.json':'application/json','.glb':'model/gltf-binary','.webp':'image/webp','.png':'image/png','.css':'text/css'})[path.extname(file)]||'application/octet-stream');res.end(data);}catch{res.writeHead(404);res.end();}}).listen(Number(process.env.MYR5_VAULT_PORT)||8907,'127.0.0.1',function(){console.log('Vault door preview http://127.0.0.1:'+this.address().port);});
