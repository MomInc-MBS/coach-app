// Jelly vault-secret review harness: node scripts/vault-l6-preview.cjs [--shoot]  (port 8906)
// --shoot drives a held finger with Playwright and saves .vault/shots/l6-*.png
const http=require('node:http'),fs=require('node:fs/promises'),path=require('node:path');
const root=path.resolve(__dirname,'..'),port=Number(process.env.VAULT_L6_PORT)||8906;
const html=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}body{margin:0;background:#0d160a}#board{width:100vw;height:100vh;position:relative;touch-action:none}</style><script type="importmap">{"imports":{"three":"/vendor/three/three.module.js","three/addons/loaders/GLTFLoader.js":"/vendor/three/GLTFLoader.js","three/addons/libs/meshopt_decoder.module.js":"/vendor/three/meshopt_decoder.module.js"}}</script></head><body><div id="board"></div><script type="module">
import {createGlbBoard} from '/modules/portal/portal-board-glb.mjs';import {jelly} from '/modules/portal/portal-board-jelly.mjs';
window.errors=[];window.secrets=0;addEventListener('error',e=>errors.push(e.message));addEventListener('myr5:portal-secret',e=>secrets++);
const host=document.querySelector('#board');
try{window.board=await createGlbBoard(host,{effect:jelly});window.jelly=jelly;
host.onpointerdown=e=>{host.setPointerCapture(e.pointerId);board.press(e.pointerId,e.clientX,e.clientY);};host.onpointermove=e=>{if(host.hasPointerCapture(e.pointerId))board.press(e.pointerId,e.clientX,e.clientY);};host.onpointerup=host.onpointercancel=e=>{window.lastClaim=jelly.claims(e.pointerId);board.release(e.pointerId);};
window.ready=true;}catch(e){errors.push(e.stack);window.ready=true;}
</script></body></html>`;
const srv=http.createServer(async(req,res)=>{const url=new URL(req.url,'http://local');if(url.pathname==='/'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);return;}try{const file=path.resolve(root,'.'+decodeURIComponent(url.pathname));if(!file.startsWith(root+path.sep))throw Error('outside root');const data=await fs.readFile(file);res.setHeader('Content-Type',({'.mjs':'text/javascript','.js':'text/javascript','.json':'application/json','.glb':'model/gltf-binary','.webp':'image/webp','.css':'text/css'})[path.extname(file)]||'application/octet-stream');res.end(data);}catch{res.writeHead(404);res.end();}}).listen(port,'127.0.0.1',async()=>{
 console.log('Jelly preview http://127.0.0.1:'+port);
 if(!process.argv.includes('--shoot'))return;
 const {chromium}=require('playwright'),b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']}),ctx=await b.newContext({viewport:{width:375,height:812},hasTouch:true,deviceScaleFactor:1}),p=await ctx.newPage();
 p.on('console',m=>{if(/error|warn/i.test(m.type()))console.log('console:',m.text());});
 await p.addInitScript(()=>{const r=performance.now.bind(performance);performance.now=()=>window.__pin??r();const raf=requestAnimationFrame.bind(window);window.requestAnimationFrame=cb=>raf(()=>cb(performance.now()));});
 await p.goto('http://127.0.0.1:'+port+'/');await p.waitForFunction(()=>window.ready,null,{timeout:60000});
 const shot=n=>p.screenshot({path:path.join(root,'.vault/shots/l6-'+n+'.png')}),sleep=ms=>p.waitForTimeout(ms);
 await fs.mkdir(path.join(root,'.vault/shots'),{recursive:true});
 const cdp=await ctx.newCDPSession(p);
 const touch=(type,pts)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:pts});
 const at={x:187,y:420,id:1};
 // fake clock: the effect reads performance.now(), so pin it to press+target and let swiftshader render at its own pace
 const pin=async(ms)=>p.evaluate(m=>{window.__pin=window.__t0+m;board.resume();},ms);
 await touch('touchStart',[at]);await p.evaluate(()=>{window.__t0=performance.now();});
 const at_=async(sec,n)=>{await pin(sec*1000);await sleep(1500);await shot(n);};
 await at_(2,'2s');await at_(4,'4s');await at_(5,'5s');await at_(5.9,'boil');await at_(6.5,'door-rising');await at_(7.1,'door-up');await at_(9,'door-calm');
 console.log('state',JSON.stringify(await p.evaluate(()=>({secrets,errors}))));
 await touch('touchEnd',[]);
 // lift early: hold 3 s, lift, look 0.3 s later and 1.5 s later
 await p.evaluate(()=>{window.secrets=0;});
 await p.reload();await p.waitForFunction(()=>window.ready);
 await touch('touchStart',[at]);await p.evaluate(()=>{window.__t0=performance.now();});
 await pin(3500);await sleep(1500);await shot('lift-before');
 await touch('touchEnd',[]);await p.evaluate(()=>{window.__t0=window.__pin;});await pin(450);await sleep(1500);await shot('lift-subsiding');await pin(1500);await sleep(1500);await shot('lift-after');
 console.log('early-lift',JSON.stringify(await p.evaluate(()=>({secrets,errors}))));
 await b.close();srv.close();
});
