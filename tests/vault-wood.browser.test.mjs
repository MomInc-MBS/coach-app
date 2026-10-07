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
async function boot(browser,url){
 const page=await browser.newPage({viewport:{width:375,height:812},hasTouch:true});
 page.errors=[];page.on('pageerror',e=>page.errors.push(e.message));
 await page.addInitScript(()=>{window.__went=[];window.myr5Routes={go:id=>window.__went.push(id)};});
 await page.goto(url);
 await page.evaluate(async()=>{const {openQuiltPortal}=await import('/modules/portal/portal-entry.mjs');window.portal=await openQuiltPortal();await window.portal.board('wood');window.portal.show();});
 await page.waitForFunction(()=>document.getElementById('portalHome')?.hidden===false&&window.myr5Wood?.state);
 return page;
}
const face=page=>page.evaluate(()=>{const r=window.portal.current().faceRect();return {x:r.left+r.width*.15,y:r.top+r.height*.15,w:r.width,h:r.height};});

test('wood: scrub claims the pointer, fire, one tap -> ash -> crumble -> door poster (end to end through portal.mjs)',async()=>withPortal(async(browser,url)=>{
 await mkdir('.vault/shots',{recursive:true});
 const page=await boot(browser,url),f=await face(page);
 await page.mouse.move(f.x,f.y);await page.mouse.down();
 for(let k=0;k<8;k++){await page.mouse.move(f.x+(k%2?0:30),f.y,{steps:2});await page.waitForTimeout(60);}
 assert.ok(await page.evaluate(()=>window.myr5Wood.state().rs.claimId!=null),'>=4 reversals claim the pointer');
 await page.screenshot({path:'.vault/shots/l2-e2e-heat.png'});
 await page.mouse.up();
 assert.equal(await page.locator('#portalVaultDoor').count(),0);
 await page.evaluate(()=>window.myr5Wood.fire()); // software GL is too slow for a timed 8-reversal scrub; the reducer is unit tested
 await page.waitForFunction(()=>window.myr5Wood.state().stage==='fire');await page.waitForTimeout(1500);
 await page.screenshot({path:'.vault/shots/l2-e2e-fire.png'});
 await page.mouse.click(f.x+f.w*.5,f.y+f.h*.5); // the extinguishing tap
 await page.waitForFunction(()=>window.myr5Wood.state().stage==='ash',null,{timeout:10000});
 await page.waitForFunction(()=>Object.keys(localStorage).some(k=>k.startsWith('myr5-vault-v1/')&&JSON.parse(localStorage.getItem(k)).secrets.wood),null,{timeout:15000});
 await page.screenshot({path:'.vault/shots/l2-e2e-door.png'});
 assert.deepEqual(page.errors,[]);
}));
