// Vault L5 (grass alien/UFO secret) review harness.
//   node scripts/vault-l5-preview.cjs          serve http://127.0.0.1:8905 (open it, drag from the purple cap to the ship)
//   node scripts/vault-l5-preview.cjs shoot    serve + drive it with Playwright, shots -> .vault/shots/l5-*.png
const http=require('node:http'),fs=require('node:fs/promises'),path=require('node:path');
const root=path.resolve(__dirname,'..'),PORT=Number(process.env.VAULT_L5_PORT)||8905;
const html=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Grass secret</title><style>
*{box-sizing:border-box}html,body{margin:0;height:100%;background:#0b150a;overflow:hidden}#host{position:fixed;left:15px;right:15px;top:70px;bottom:103px;touch-action:none}#host canvas{width:100%;height:100%}</style>
<script type="importmap">{"imports":{"three":"/vendor/three/three.module.js","three/addons/loaders/GLTFLoader.js":"/vendor/three/GLTFLoader.js","three/addons/libs/meshopt_decoder.module.js":"/vendor/three/meshopt_decoder.module.js"}}</script></head><body><div id="host"></div><script type="module">
import {createGlbBoard} from '/modules/portal/portal-board-glb.mjs';import {grass,SECRET} from '/modules/portal/portal-board-grass.mjs';
window.SECRET=SECRET;window.errors=[];window.secretFired=0;window.addEventListener('error',e=>errors.push(e.message));window.addEventListener('myr5:portal-secret',e=>{secretFired++;window.secretDetail=e.detail;});
const host=document.querySelector('#host');
try{window.board=await createGlbBoard(host,{effect:grass});window.ready=true;
host.onpointerdown=e=>{host.setPointerCapture(e.pointerId);board.press(e.pointerId,e.clientX,e.clientY);};
host.onpointermove=e=>{if(host.hasPointerCapture(e.pointerId))board.press(e.pointerId,e.clientX,e.clientY);};
host.onpointerup=host.onpointercancel=e=>{window.lastClaim=window.myr5GrassSecret.claims(e.pointerId);board.release(e.pointerId);};
}catch(e){errors.push(e.stack);window.ready=true;}
</script></body></html>`;
const mime={'.mjs':'text/javascript','.js':'text/javascript','.json':'application/json','.glb':'model/gltf-binary','.webp':'image/webp','.css':'text/css','.html':'text/html; charset=utf-8'};
const server=http.createServer(async(req,res)=>{const url=new URL(req.url,'http://local');if(url.pathname==='/'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);return;}
 try{const file=path.resolve(root,'.'+decodeURIComponent(url.pathname));if(!file.startsWith(root+path.sep))throw Error('outside root');res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(await fs.readFile(file));}catch{res.writeHead(404);res.end();}});
server.listen(PORT,'127.0.0.1',()=>{console.log('Grass secret preview http://127.0.0.1:'+PORT);if(process.argv[2]==='shoot')shoot().then(()=>process.exit(0),e=>{console.error(e);process.exit(1);});});

async function shoot(){
 const {chromium}=require('playwright'),out=path.join(root,'.vault','shots');await fs.mkdir(out,{recursive:true});
 const browser=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
 const ctx=await browser.newContext({viewport:{width:375,height:812},hasTouch:true,deviceScaleFactor:2}),page=await ctx.newPage();
 const logs=[];page.on('console',m=>{if(/error|warn/i.test(m.type()))logs.push(m.text());});page.on('pageerror',e=>logs.push(String(e)));
 await page.goto(`http://127.0.0.1:${PORT}/`);await page.waitForFunction('window.ready',null,{timeout:60000});
 const wait=ms=>page.waitForTimeout(ms),shot=async(n,clip)=>page.screenshot({path:path.join(out,`l5-${n}.png`),...(clip?{clip}:{})}),state=()=>page.evaluate('window.myr5GrassSecret&&window.myr5GrassSecret.state()');
 const f=await page.evaluate('(()=>{const r=board.faceRect();return {l:r.left,t:r.top,w:r.width,h:r.height}})()');
 const P=(u,v)=>[f.l+u*f.w,f.t+v*f.h],start=P(.1,.085),ship=P(.9,.915);
 await wait(800);await shot('01-idle');
 await shot('02-idle-alien-zoom',{x:start[0]-45,y:start[1]-45,width:90,height:90});await shot('03-idle-ufo-zoom',{x:ship[0]-60,y:ship[1]-60,width:110,height:110});
 // drag along the straight line in ~14 px strokes (a real finger), pausing at fractions
 const lerp=k=>[start[0]+(ship[0]-start[0])*k,start[1]+(ship[1]-start[1])*k],len=Math.hypot(ship[0]-start[0],ship[1]-start[1]);
 async function dragTo(k0,k1,ms=16){const n=Math.ceil(len*(k1-k0)/14);for(let i=1;i<=n;i++){const p=lerp(k0+(k1-k0)*i/n);await page.mouse.move(p[0],p[1]);await wait(ms);}}
 await page.mouse.move(...start);await page.mouse.down();await dragTo(0,.02);await page.evaluate('SECRET.gapMs=30000');await dragTo(.02,.4,45);await wait(150);await shot('04-following-line');
 await dragTo(.4,.55,45);await page.evaluate('SECRET.gapMs=3000');await wait(100);
 await page.mouse.up();const claim1=await page.evaluate('window.lastClaim');await wait(1500);const st1=await state();await shot('05-waiting-at-gap');
 await wait(2300);const st2=await state();await shot('06-after-3s-reset');
 console.log('claim at lift:',claim1,'| gap state phase/pos/len:',st1.phase,st1.pos.toFixed(2),st1.len.toFixed(2),'| after 3s:',st2.phase,'resets',st2.resets);
 // full line
 await page.mouse.move(...start);await page.mouse.down();await dragTo(0,1,40);await wait(120);
 await page.mouse.up();
 const tt=Date.now();await page.waitForFunction("window.myr5GrassSecret.state().phase==='done'",null,{timeout:40000});console.log('real run reached done in',Date.now()-tt,'ms after lift; fired',await page.evaluate('window.secretFired'));
 const poses=[['board',.5],['fly',.3],['fly',.7],['crack',.45],['crack',1],['split',.3],['split',.6],['done',0]];
 for(const [ph,k] of poses){await page.evaluate(`myr5GrassSecret.freeze('${ph}',${k})`);await wait(500);await shot(`07-${ph}-${k}`);}
 await wait(400);const fired=await page.evaluate('[window.secretFired,window.secretDetail]'),errs=await page.evaluate('window.errors');
 console.log('portal-secret fired:',JSON.stringify(fired),'| page errors:',JSON.stringify(errs),'| console:',JSON.stringify(logs.slice(0,5)));
 await browser.close();server.close();
}
