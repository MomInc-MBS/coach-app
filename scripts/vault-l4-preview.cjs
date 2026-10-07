// Quilt vault-secret review harness: node scripts/vault-l4-preview.cjs [--shoot]  (port 8904; / = bare board, /portal = full portal)
// --shoot drives real two-finger touches with Playwright and saves .vault/shots/l4-*.png
const http=require('node:http'),fs=require('node:fs/promises'),path=require('node:path');
const root=path.resolve(__dirname,'..'),port=Number(process.env.VAULT_L4_PORT)||8904;
const map='<script type="importmap">{"imports":{"three":"/vendor/three/three.module.js","three/addons/loaders/GLTFLoader.js":"/vendor/three/GLTFLoader.js","three/addons/libs/meshopt_decoder.module.js":"/vendor/three/meshopt_decoder.module.js"}}</script>';
const html=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}body{margin:0;background:#17111e}#board{width:100vw;height:100vh;position:relative;touch-action:none}</style>${map}</head><body><div id="board"></div><script type="module">
import {createQuiltBoardGL,QUILT_SECRET} from '/modules/portal/portal-board.mjs';
QUILT_SECRET.ms2=120000;QUILT_SECRET.ms1=60000;window.errors=[];window.secrets=0;addEventListener('error',e=>errors.push(e.message));addEventListener('myr5:portal-secret',e=>secrets++);
const host=document.querySelector('#board');
try{const b=window.board=await createQuiltBoardGL(host);window.claimed={};
host.onpointerdown=e=>{host.setPointerCapture(e.pointerId);b.press(e.pointerId,e.clientX,e.clientY);};host.onpointermove=e=>{if(host.hasPointerCapture(e.pointerId))b.press(e.pointerId,e.clientX,e.clientY);};host.onpointerup=host.onpointercancel=e=>{b.release(e.pointerId);claimed[e.pointerId]=b.claims(e.pointerId);};
window.ready=true;}catch(e){errors.push(e.stack);window.ready=true;}
</script></body></html>`;
const portalHtml=`<!doctype html><style>body{margin:0}</style><button id="background">Coach</button><nav class="coach-dock"></nav>${map}`;
const srv=http.createServer(async(req,res)=>{const url=new URL(req.url,'http://local');if(url.pathname==='/'||url.pathname==='/portal'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(url.pathname==='/'?html:portalHtml);return;}try{const file=path.resolve(root,'.'+decodeURIComponent(url.pathname));if(!file.startsWith(root+path.sep))throw Error('outside root');const data=await fs.readFile(file);res.setHeader('Content-Type',({'.mjs':'text/javascript','.js':'text/javascript','.json':'application/json','.glb':'model/gltf-binary','.webp':'image/webp','.png':'image/png','.css':'text/css'})[path.extname(file)]||'application/octet-stream');res.end(data);}catch{res.writeHead(404);res.end();}}).listen(port,'127.0.0.1',async()=>{
 console.log('Quilt preview http://127.0.0.1:'+port);
 if(!process.argv.includes('--shoot'))return;
 const {chromium}=require('playwright'),b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
 await fs.mkdir(path.join(root,'.vault/shots'),{recursive:true});
 const open=async(url,wait)=>{const ctx=await b.newContext({viewport:{width:375,height:812},hasTouch:true,deviceScaleFactor:1}),p=await ctx.newPage();p.on('console',m=>{if(/error|warn/i.test(m.type()))console.log('console:',m.text());});p.on('pageerror',e=>console.log('pageerror',e.message));await p.goto(url);await p.waitForFunction(wait,null,{timeout:60000});return [ctx,p];};
 // ---- bare board, real two-finger touches
 let [ctx,p]=await open('http://127.0.0.1:'+port+'/',()=>window.ready);
 const shot=n=>p.screenshot({path:path.join(root,'.vault/shots/l4-'+n+'.png')}),sleep=ms=>p.waitForTimeout(ms),cdp=await ctx.newCDPSession(p);
 const touch=(type,pts)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:pts});
 const face=await p.evaluate(()=>board.quiltRect()),at=(fx,fy)=>[Math.round(face.left+face.width*fx),Math.round(face.top+face.height*fy)];
 const state=()=>p.evaluate(()=>({phase:board.secretDebug.state().phase,p:+board.secretDebug.state().p.toFixed(2),vis:board.secretDebug.vis().map(v=>+v.toFixed(2)),secrets,errors,claimed}));
 const pts=(a,dx,dy)=>a.map(([fx,fy],i)=>({x:at(fx,fy)[0]+dx,y:at(fx,fy)[1]+dy,id:i+1}));
 const drag=async(a,dx,dy,steps=8,hold=false)=>{await touch('touchStart',pts(a,0,0));for(let i=1;i<=steps;i++){await touch('touchMove',pts(a,dx*i/steps,dy*i/steps));await sleep(30);}if(!hold)await touch('touchEnd',[]);};
 const S1=[[.25,.85],[.75,.85]],S2=[[.3,.1],[.3,.35]];
 console.log('flat',JSON.stringify(await state()));await shot('0-flat');
 await drag(S1,0,-face.height*.28,8,true);await sleep(600);await shot('1a-step1-early');console.log('early1',JSON.stringify(await state()));
 await touch('touchEnd',[]);await sleep(900);console.log('fell back',JSON.stringify(await state()));
 await drag(S1,0,-face.height*.455,10,true);await sleep(600);await shot('1-step1-middrag');console.log('mid1',JSON.stringify(await state()));
 await touch('touchEnd',[]);await sleep(900);await shot('2-step1-done');console.log('done1',JSON.stringify(await state()));
 await drag(S2,face.width*.3,0,8,true);await sleep(600);await shot('3a-step2-early');
 await touch('touchEnd',[]);await sleep(900);console.log('fell back 2',JSON.stringify(await state()));
 await drag(S2,face.width*.52,0,10,true);await sleep(600);await shot('3-step2-middrag');console.log('mid2',JSON.stringify(await state()));
 await touch('touchEnd',[]);await sleep(350);await shot('4-step2-done');console.log('done2',JSON.stringify(await state()));
 await sleep(150);await shot('5-slide-off-a');await sleep(100);await shot('5-slide-off-b');await sleep(1200);await shot('5-slide-off-end');console.log('slid',JSON.stringify(await state()));
 await p.evaluate(()=>board.heal());await sleep(300);await shot('6-healed');console.log('healed',JSON.stringify(await state()));
 await ctx.close();
 // ---- full portal: secret -> door poster
 [ctx,p]=await open('http://127.0.0.1:'+port+'/portal',()=>true);
 await p.evaluate(async()=>{window.__went=[];window.myr5Routes={go:id=>window.__went.push(id)};const {openQuiltPortal}=await import('/modules/portal/portal-entry.mjs');window.portal=await openQuiltPortal();window.portal.show();});
 await p.waitForFunction(()=>document.getElementById('portalHome')?.hidden===false,null,{timeout:30000});
 await p.waitForFunction(()=>window.portal.current().secretDebug,null,{timeout:60000});await sleep(1500);
 const cdp2=await ctx.newCDPSession(p),t2=(type,pts)=>cdp2.send('Input.dispatchTouchEvent',{type,touchPoints:pts});
 const f2=await p.evaluate(()=>window.portal.current().quiltRect()),a2=(fx,fy)=>[Math.round(f2.left+f2.width*fx),Math.round(f2.top+f2.height*fy)];
 const mv=async(a,dx,dy)=>{const P=k=>a.map(([fx,fy],i)=>({x:a2(fx,fy)[0]+dx*k,y:a2(fx,fy)[1]+dy*k,id:i+1}));await t2('touchStart',P(0));for(let k=1;k<=8;k++){await t2('touchMove',P(k/8));await sleep(30);}await t2('touchEnd',[]);};
 await mv(S1,0,-f2.height*.4);await sleep(1200);await mv(S2,f2.width*.5,0);
 await p.waitForSelector('#portalVaultDoor',{timeout:15000});await sleep(900);await p.screenshot({path:path.join(root,'.vault/shots/l4-7-door-poster.png')});
 console.log('portal',JSON.stringify(await p.evaluate(()=>({door:!!document.getElementById('portalVaultDoor'),store:Object.keys(localStorage).filter(k=>k.startsWith('myr5-vault-v1/')).map(k=>JSON.parse(localStorage[k]).secrets)}))));
 await b.close();srv.close();
});
