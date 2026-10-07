// Achievement Vault L5: the real grass board inside portal.mjs (software WebGL). A flower line from the alien to the ship is claimed (no shape
// recognition), plays the ship/crack/split sequence, fires myr5:portal-secret and shows the door poster; tapping it goes to the vault route.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {chromium} from 'playwright';
import {transform} from 'esbuild';

async function withPortal(run){
 const root=resolve('.');
 const server=createServer(async(req,res)=>{
  const path=new URL(req.url,'http://local').pathname;
  if(path==='/__portal__'){
   res.setHeader('Content-Type','text/html');
   res.end('<!doctype html><style>body{margin:0}</style><button id="background">Coach</button>'+
    '<nav class="coach-dock"><button data-panel="meals" onclick="document.querySelector(\'#mealsPanel\').showModal()">Food</button></nav>'+
    '<dialog id="mealsPanel">Nutrition<button onclick="this.closest(\'dialog\').close()">Close</button></dialog>'+
    '<script type="importmap">{"imports":{"three":"/vendor/three/three.module.js","three/addons/loaders/GLTFLoader.js":"/vendor/three/GLTFLoader.js","three/addons/libs/meshopt_decoder.module.js":"/vendor/three/meshopt_decoder.module.js"}}</script>');
   return;
  }
  try{const file=resolve(root,'.'+decodeURIComponent(path));if(!file.startsWith(root+sep))throw Error();const ext=extname(file);res.setHeader('Content-Type',({'.mjs':'text/javascript','.js':'text/javascript','.ts':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png'})[ext]||'application/octet-stream');res.end(ext==='.ts'?(await transform(await readFile(file,'utf8'),{loader:'ts'})).code:await readFile(file));}catch{res.writeHead(404);res.end();}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  const args=['--enable-webgl','--ignore-gpu-blocklist','--use-gl=angle','--use-angle=swiftshader'];
  try{browser=await chromium.launch({headless:true,args});}catch{browser=await chromium.launch({channel:'msedge',headless:true,args});}
  await run(browser,'http://127.0.0.1:'+server.address().port+'/__portal__');
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
}

test('grass secret end to end through portal.mjs: line -> ship -> crack -> door poster -> vault route',{timeout:240000},async()=>withPortal(async(browser,url)=>{
 await mkdir('.vault/shots',{recursive:true});
 const page=await browser.newPage({viewport:{width:375,height:812},hasTouch:true});page.errors=[];page.on('pageerror',e=>page.errors.push(e.message));
 await page.addInitScript(()=>{window.__went=[];window.__labels=[];window.myr5Routes={go:id=>window.__went.push(id)};const o=CanvasRenderingContext2D.prototype.fillText;CanvasRenderingContext2D.prototype.fillText=function(t,...r){window.__labels.push(t);return o.call(this,t,...r);};});
 await page.goto(url+'?board=grass');
 await page.evaluate(async()=>{const {openQuiltPortal}=await import('/modules/portal/portal-entry.mjs');window.portal=await openQuiltPortal();await window.portal.board('grass');window.portal.show();});
 await page.waitForFunction(()=>document.getElementById('portalHome')?.hidden===false&&window.myr5GrassSecret,null,{timeout:90000});
 const f=await page.evaluate(()=>{const r=window.portal.current().faceRect();return {l:r.left,t:r.top,w:r.width,h:r.height};});
 const P=(u,v)=>[f.l+u*f.w,f.t+v*f.h],a=P(.1,.085),b=P(.9,.915),len=Math.hypot(b[0]-a[0],b[1]-a[1]);
 await page.mouse.move(...a);await page.mouse.down();
 for(let i=1,n=Math.ceil(len/14);i<=n;i++){await page.mouse.move(a[0]+(b[0]-a[0])*i/n,a[1]+(b[1]-a[1])*i/n);await page.waitForTimeout(40);}
 await page.mouse.up();
 await page.waitForSelector('#portalVaultDoor',{timeout:90000});
 await page.screenshot({path:'.vault/shots/l5-portal-door.png'});
 assert.equal(await page.evaluate(()=>window.myr5GrassSecret.state().phase),'done');
 assert.equal((await page.evaluate(()=>window.__labels)).includes('Almost: Workout'),false,'the claimed line never reached shape recognition');
 assert.deepEqual(await page.evaluate(()=>window.__went),[],'no shape opened');
 await page.click('#portalVaultDoor');
 await page.waitForFunction(()=>window.__went.length===1);
 assert.deepEqual(await page.evaluate(()=>window.__went),['vault']);
 assert.deepEqual(page.errors,[]);
}));
