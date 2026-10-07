// L3 Crystal ice secret preview: node scripts/vault-l3-preview.cjs
const http=require('node:http'),fs=require('node:fs/promises'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const html=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>L3 Ice secret</title><style>
*{box-sizing:border-box}body{margin:0;background:#0b1a26;color:#dce5eb;font:14px system-ui}main{display:flex;align-items:center;justify-content:center;gap:24px;min-height:100vh;padding:16px}#board{width:min(100vw - 32px,375px);height:812px;position:relative;background:#000;border:2px solid #4a9dd4}aside{width:240px;padding:16px;background:#1a2d3a;border-radius:8px}h1{font-size:18px;margin:0 0 16px}p{line-height:1.5;font-size:13px;color:#8fa6b4;margin:12px 0}button{background:#3f5a7a;border:1px solid #5a7a9a;color:#dce5eb;border-radius:6px;padding:10px;margin:8px 0;width:100%;cursor:pointer}button:hover{background:#4a6a8a}button:active{background:#354a6a}#status{font-size:12px;font-family:monospace;color:#7fc9e8;white-space:pre-wrap;max-height:200px;overflow-y:auto}#tapcount{font-size:18px;font-weight:bold;color:#ffd36e;margin:12px 0}
@media(max-width:768px){main{flex-direction:column;gap:8px}#board{width:100%;height:calc(100vh - 32px);max-height:812px}aside{width:100%}}
</style></head><body><main><div id="board"></div><aside><h1>Crystal/Ice L3</h1><div id="tapcount">Taps: 0/10</div><p id="status">Loading…</p><button id="secretBtn">Manual: Dispatch secret</button><button id="shatterBtn">Manual: Shatter (tap 10)</button><button id="resetBtn">Reset</button></aside></main><script type="importmap">{"imports":{"three":"/vendor/three/three.module.js","three/addons/loaders/GLTFLoader.js":"/vendor/three/GLTFLoader.js","three/addons/libs/meshopt_decoder.module.js":"/vendor/three/meshopt_decoder.module.js"}}</script><script type="module">
import {createGlbBoard} from '/modules/portal/portal-board-glb.mjs';
import {ice} from '/modules/portal/portal-board-ice.mjs';
const host=document.querySelector('#board'),status=document.querySelector('#status'),tapcount=document.querySelector('#tapcount');
window.errors=[];window.addEventListener('error',e=>errors.push(e.message));
window.addEventListener('myr5:portal-secret',(e)=>{status.textContent=e.detail.board+' secret revealed!';console.log('Secret dispatched:',e.detail);});
try{
 window.board=await createGlbBoard(host,{effect:ice});
 status.textContent='Ready — tap the crystal 10 times fast (≤600 ms apart, <12 px drift)';
 // Track taps manually
 let tapCount=0;
 window.addEventListener('myr5:portal-secret',()=>{tapCount=10;updateStatus();});
 const updateStatus=()=>{
  tapcount.textContent=\`Taps: \${tapCount}/10\`;
 };
 // Manual controls
 document.querySelector('#secretBtn').onclick=()=>{
  console.log('Dispatching secret event');
  window.dispatchEvent(new CustomEvent('myr5:portal-secret',{detail:{board:'ice'}}));
 };
 document.querySelector('#shatterBtn').onclick=async()=>{
  console.log('Simulating 10 taps');
  const f=board.faceRect();const cx=f.left+f.width*.5,cy=f.top+f.height*.5;
  for(let i=0;i<10;i++){
   board.press(100+i,cx,cy);
   board.release(100+i);
   tapCount++;updateStatus();
   await new Promise(r=>setTimeout(r,100)); // 100ms between taps
  }
 };
 document.querySelector('#resetBtn').onclick=()=>{
  board.heal();
  status.textContent='Reset';
  updateStatus();
 };
 host.style.touchAction='none';
 let inPointerCapture=false;
 host.onpointerdown=e=>{inPointerCapture=true;host.setPointerCapture(e.pointerId);board.press(e.pointerId,e.clientX,e.clientY);};
 host.onpointermove=e=>{if(inPointerCapture)board.move(e.pointerId,e.clientX,e.clientY);};
 host.onpointerup=host.onpointercancel=e=>{inPointerCapture=false;board.release(e.pointerId);};
 host.ontouchstart=e=>e.preventDefault(); // prevent browser zooming
 updateStatus();
}catch(e){status.textContent=e.stack;errors.push(e.stack);}
</script></body></html>`;
http.createServer(async(req,res)=>{const url=new URL(req.url,'http://local');if(url.pathname==='/'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);return;}try{const file=path.resolve(root,'.'+decodeURIComponent(url.pathname));if(!file.startsWith(root+path.sep))throw Error('outside root');const data=await fs.readFile(file);res.setHeader('Content-Type',({'.mjs':'text/javascript','.js':'text/javascript','.json':'application/json','.glb':'model/gltf-binary','.webp':'image/webp','.css':'text/css','.html':'text/html; charset=utf-8'})[path.extname(file)]||'application/octet-stream');res.end(data);}catch{res.writeHead(404);res.end();}}).listen(Number(process.env.MYR5_L3_PORT)||8904,'127.0.0.1',function(){console.log('L3 Ice preview: http://127.0.0.1:'+this.address().port);});
