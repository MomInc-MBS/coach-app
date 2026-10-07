// Achievement Vault L0: claims(id) precedence in portal.mjs endPointer, the myr5:portal-secret door poster, ?vault=1.
// Drives the test-only stub board (window.__portalTestStubBoard): no WebGL needed. Serves the source tree.
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
async function bootPond(browser,url){
 const page=await browser.newPage({viewport:{width:375,height:812},hasTouch:true});
 page.errors=[];page.on('pageerror',e=>page.errors.push(e.message));
 await page.addInitScript(()=>{window.__went=[];window.myr5Routes={go:id=>window.__went.push(id)};});
 await page.goto(url);
 await page.evaluate(async()=>{const {openQuiltPortal}=await import('/modules/portal/portal-entry.mjs');window.portal=await openQuiltPortal();await window.portal.board('pond');window.portal.show();window.pondFx=(await import('/modules/portal/portal-board-pond.mjs')).pond;});
 await page.waitForFunction(()=>document.getElementById('portalHome')?.hidden===false&&window.pondFx.debug());
 return page;
}
const bigXY=page=>page.evaluate(()=>{const r=window.portal.current().faceRect(),b=window.pondFx.debug().big;return [r.left+b.x*r.width,r.top+b.y*r.width];});

test('pond: holding the big koi 2 s opens the door poster; lifting early does not (end to end through portal.mjs)',async()=>withPortal(async(browser,url)=>{
 await mkdir('.vault/shots',{recursive:true});
 const page=await bootPond(browser,url);
 await page.evaluate(()=>window.pondFx.forceBig());await page.waitForTimeout(1800);
 let [x,y]=await bigXY(page);await page.mouse.move(x,y);await page.mouse.down();await page.waitForTimeout(900);await page.mouse.up();
 await page.waitForTimeout(1500);
 assert.equal(await page.locator('#portalVaultDoor').count(),0,'early lift: no secret');
 await page.evaluate(()=>window.pondFx.forceBig());await page.waitForTimeout(1800);
 [x,y]=await bigXY(page);await page.mouse.move(x,y);await page.mouse.down();
 await page.waitForSelector('#portalVaultDoor',{timeout:15000});
 await page.mouse.up();
 await page.waitForFunction(()=>Object.keys(localStorage).some(k=>k.startsWith('myr5-vault-v1/')&&JSON.parse(localStorage.getItem(k)).secrets.pond),null,{timeout:15000});
 await page.screenshot({path:'.vault/shots/l1-e2e-door.png'});
 assert.deepEqual(page.errors,[]);
}));
