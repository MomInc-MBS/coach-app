// L3 Crystal ice secret preview: node scripts/vault-l3-preview.cjs
const http=require('node:http'),fs=require('node:fs/promises'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const html=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>L3 Ice secret</title><style>
*{box-sizing:border-box}body{margin:0;background:#000}#board{width:375px;height:812px;position:relative;touch-action:none}
</style></head><body><div id="board"></div><script type="importmap">{"imports":{"three":"/vendor/three/three.module.js","three/addons/loaders/GLTFLoader.js":"/vendor/three/GLTFLoader.js","three/addons/libs/meshopt_decoder.module.js":"/vendor/three/meshopt_decoder.module.js"}}</script><script type="module">
import {createGlbBoard} from '/modules/portal/portal-board-glb.mjs';
import {ice} from '/modules/portal/portal-board-ice.mjs';
const host=document.querySelector('#board');
// manual clock (software GL frames take ~300 ms, which would break a 600 ms tap chain): time only moves when skip(ms) says so; rAF timestamps follow it
let vt=1000;performance.now=()=>vt;window.skip=ms=>{vt+=ms;};const raf=window.requestAnimationFrame.bind(window);window.requestAnimationFrame=cb=>raf(()=>cb(vt));
window.errors=[];window.secrets=0;window.addEventListener('error',e=>errors.push(e.message));
window.addEventListener('myr5:portal-secret',()=>window.secrets++);
try{
 const board=window.board=await createGlbBoard(host,{effect:ice});
 host.style.background=board.background; // the real portal host paints the board background; a black host is just the harness
 host.onpointerdown=e=>{board.press(e.pointerId,e.clientX,e.clientY);window.downClaim=ice.claims(e.pointerId);};
 host.onpointermove=e=>{if(e.buttons)board.press(e.pointerId,e.clientX,e.clientY);};
 host.onpointerup=host.onpointercancel=e=>{window.lastClaim=ice.claims(e.pointerId);board.release(e.pointerId);};
 window.tap=async(x,y,hold=60)=>{const o={pointerId:7,clientX:x,clientY:y,bubbles:true,buttons:1};host.dispatchEvent(new PointerEvent('pointerdown',o));skip(hold);await new Promise(r=>setTimeout(r,350));host.dispatchEvent(new PointerEvent('pointerup',{...o,buttons:0}));};
 const pts=[[190,560],[110,430],[270,480],[150,650],[250,650],[120,540],[280,600],[190,450],[200,700],[190,580]];
 window.chain=async n=>{window.claimLog=[];for(let i=0;i<n;i++){await tap(...pts[i]);claimLog.push(window.lastClaim);skip(100);await new Promise(r=>setTimeout(r,350));}}; // software GL: each frame blocks ~300 ms, so taps are naturally ~400 ms apart
 window.ready=true;
}catch(e){errors.push(e.stack);}
</script></body></html>`;
http.createServer(async(req,res)=>{const url=new URL(req.url,'http://local');if(url.pathname==='/'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);return;}try{const file=path.resolve(root,'.'+decodeURIComponent(url.pathname));if(!file.startsWith(root+path.sep))throw Error('outside root');const data=await fs.readFile(file);res.setHeader('Content-Type',({'.mjs':'text/javascript','.js':'text/javascript','.json':'application/json','.glb':'model/gltf-binary','.webp':'image/webp','.css':'text/css','.html':'text/html; charset=utf-8'})[path.extname(file)]||'application/octet-stream');res.end(data);}catch{res.writeHead(404);res.end();}}).listen(Number(process.env.MYR5_L3_PORT)||8904,'127.0.0.1',function(){console.log('L3 Ice preview: http://127.0.0.1:'+this.address().port);});
