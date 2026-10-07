// R31: a board's secret is healed when the portal is shown again (jelly door/flaps, pond splash). Real GLB boards, software GL.
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
async function boot(browser,url,board){
 const page=await browser.newPage({viewport:{width:375,height:812},hasTouch:true});
 page.errors=[];page.on('pageerror',e=>page.errors.push(e.message));
 await page.addInitScript(()=>{window.__went=[];window.myr5Routes={go:id=>window.__went.push(id)};});
 await page.goto(url);
 await page.evaluate(async b=>{const {openQuiltPortal}=await import('/modules/portal/portal-entry.mjs');window.portal=await openQuiltPortal();await window.portal.board(b);window.portal.show();window.pondFx=(await import('/modules/portal/portal-board-pond.mjs')).pond;},board);
 await page.waitForFunction(()=>document.getElementById('portalHome')?.hidden===false);
 return page;
}
test('jelly: after the secret the door and flaps are gone when the portal is shown again',async()=>withPortal(async(browser,url)=>{
 const page=await boot(browser,url,'jelly');
 await page.waitForFunction(()=>window.myr5JellyFF,null,{timeout:90000});
 const f=await page.evaluate(()=>{const r=window.portal.current().faceRect();return {x:r.left+r.width/2,y:r.top+r.height/2};});
 await page.mouse.move(f.x,f.y);await page.mouse.down();await page.evaluate(()=>myr5JellyFF(8000));
 await page.waitForFunction(()=>window.__went.includes('vault'),null,{timeout:30000});
 await page.mouse.up();
 assert.equal(await page.evaluate(()=>myr5JellyFF.door()),0,'door sunk on hide');
 await page.evaluate(()=>window.portal.show());await page.waitForTimeout(300);
 assert.equal(await page.evaluate(()=>myr5JellyFF.door()),0,'no door after returning');
 assert.equal(await page.evaluate(()=>myr5JellyFF.held()),0,'hold forgotten: a second secret is possible');
 assert.deepEqual(page.errors,[]);
}));
test('pond: after the secret the splash is over and the pond is idle when the portal is shown again',async()=>withPortal(async(browser,url)=>{
 const page=await boot(browser,url,'pond');
 await page.waitForFunction(()=>window.pondFx.debug(),null,{timeout:90000});
 await page.evaluate(()=>window.portal.secret('pond')); // same event the board fires; the portal hides at once
 await page.waitForFunction(()=>window.__went.includes('vault'));
 await page.evaluate(()=>window.portal.show());await page.waitForTimeout(300);
 const d=await page.evaluate(()=>window.pondFx.debug());
 assert.equal(d.sec,'idle');assert.equal(d.an,null);
 assert.deepEqual(page.errors,[]);
}));
