import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {chromium} from 'playwright';

async function withPortal(run){
 const source=resolve('.'),built=resolve('dist/client');
 const server=createServer(async(req,res)=>{
  const path=new URL(req.url,'http://local').pathname;
  if(path==='/__portal__'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><style>body{margin:0}</style><button id="background">Coach</button><nav class="coach-dock"><button data-panel="meals" onclick="window.nutritionOpens=(window.nutritionOpens||0)+1;document.querySelector(\'#mealsPanel\').showModal()">Food</button></nav><dialog id="mealsPanel">Nutrition<button onclick="this.closest(\'dialog\').close()">Close</button></dialog><script type="importmap">{"imports":{"three":"/vendor/three/three.module.js"}}</script>');return;}
  try{const root=path.startsWith('/modules/portal/')?source:built,file=resolve(root,'.'+path);if(!file.startsWith(root+sep))throw Error();res.setHeader('Content-Type',({'.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.webp':'image/webp'})[extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404);res.end();}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-gl=angle','--use-angle=swiftshader']});await run(browser,'http://127.0.0.1:'+server.address().port+'/__portal__');}
 finally{await browser?.close();await new Promise(r=>server.close(r));}
}
async function open(page){return await page.evaluate(async()=>{const {openQuiltPortal}=await import('/modules/portal/portal-entry.mjs');window.portal=await openQuiltPortal();return !!window.portal.current();});}

test('Quilt traps focus, exposes a working Menu, honors reduced motion and returns from Nutrition',async()=>withPortal(async(browser,url)=>{
 const page=await browser.newPage({viewport:{width:390,height:844}});await page.emulateMedia({reducedMotion:'reduce'});await page.goto(url);await page.locator('#background').focus();
 await page.evaluate(async()=>{const THREE=await import('/vendor/three/three.module.js'),add=THREE.Scene.prototype.add;THREE.Scene.prototype.add=function(...nodes){window.quiltScene=this;return add.apply(this,nodes);};});
 assert(await open(page),'real WebGL Quilt must load');
 assert.equal(await page.locator('#background').evaluate(n=>n.inert),true);
 assert.equal(await page.evaluate(()=>document.activeElement.id),'portalMenuButton');
 await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.id),'portalExitButton');
 await page.keyboard.press('Shift+Tab');assert.equal(await page.evaluate(()=>document.activeElement.id),'portalMenuButton');
 const calm=await page.evaluate(async()=>{const mesh=window.quiltScene.children.find(n=>n.isMesh),before=Array.from(mesh.geometry.attributes.position.array),r=portal.current().faceRect();portal.current().press(1,r.left+r.width/2,r.top+r.height/2);await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));portal.current().release(1);return {before,after:Array.from(mesh.geometry.attributes.position.array),svg:!!document.querySelector('#portalCaustic animate')};});
 assert.deepEqual(calm.after,calm.before);assert.equal(calm.svg,false);
 await page.locator('#portalMenuButton').click();await page.locator('#portalMenu [data-menu="rect"]').click();
 await page.waitForFunction(()=>document.querySelector('#portalHome').hidden);assert.equal(await page.locator('#background').evaluate(n=>n.inert),false);
 await open(page);await page.evaluate(()=>portal.open('down'));
 await page.waitForFunction(()=>document.querySelector('#portalHome').hidden&&document.querySelector('#mealsPanel').open);
 await page.locator('#mealsPanel button').click();await page.waitForFunction(()=>!document.querySelector('#portalHome').hidden);
 await page.keyboard.press('Escape');assert.equal(await page.locator('#portalHome').evaluate(n=>n.hidden),true);
 await page.evaluate(()=>portal.dispose());assert.equal(await page.locator('#portalHome,#portalMenu,#portalBoardHost canvas,link[href="/modules/portal/portal.css"]').count(),0);
 assert(await open(page),'disposing permits a clean later mount');assert.equal(await page.locator('#portalHome').count(),1);
}));

test('Back to Coach cancels a pending destination and flash duration/completion are reliable',async()=>withPortal(async(browser,url)=>{
 const page=await browser.newPage();await page.goto(url);
 await page.evaluate(async()=>{const THREE=await import('/vendor/three/three.module.js'),add=THREE.Scene.prototype.add;THREE.Scene.prototype.add=function(...nodes){window.quiltScene=this;return add.apply(this,nodes);};});
 assert(await open(page));
 await page.evaluate(()=>{window.sequenceDone=portal.open('down');});
 await page.waitForFunction(()=>document.querySelector('.portal-glass')&&!window.quiltScene.children.some(n=>n.isGroup));
 await page.locator('#portalExitButton').click();await page.evaluate(()=>window.sequenceDone);
 assert.equal(await page.evaluate(()=>window.nutritionOpens||0),0);assert.equal(await page.locator('#portalHome').evaluate(n=>n.hidden),true);
 await page.evaluate(()=>{window.transitionEvents=[];window.addEventListener('myr5:portal-transition',e=>window.transitionEvents.push(e.detail));window.flashDone=portal.flashTransition({duration:40});});
 const flash=await page.locator('.portal-transition-flash').evaluate(n=>({duration:getComputedStyle(n).animationDuration,topLayer:n.matches(':popover-open')}));
 assert.equal(flash.duration,'0.04s');assert.equal(flash.topLayer,true);
 await page.evaluate(()=>window.flashDone);assert.deepEqual(await page.evaluate(()=>window.transitionEvents.map(e=>e.phase)),['flash','complete']);
 await page.evaluate(()=>{window.cancelledFlash=portal.flashTransition({duration:10000}).then(()=> 'completed',e=>e.name);portal.dispose();});
 assert.equal(await page.evaluate(()=>window.cancelledFlash),'AbortError');assert.equal(await page.locator('.portal-transition-flash').count(),0);
}));

test('renderer and texture failures leave a usable menu without orphaned canvases',async()=>withPortal(async(browser,url)=>{
 for(const failure of ['webgl','texture']){
  const page=await browser.newPage();await page.emulateMedia({reducedMotion:'reduce'});
  if(failure==='webgl')await page.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,...args){return /webgl/i.test(kind)?null:get.call(this,kind,...args);};});
  else await page.route('**/pod/worlds/quilt.webp',route=>route.fulfill({status:503,body:'offline'}));
  await page.goto(url);assert.equal(await open(page),false);
  assert.equal(await page.locator('#portalBoardHost canvas').count(),0);
  await page.locator('#portalMenuButton').click();await page.locator('#portalMenu [data-menu="down"]').click();
  await page.waitForFunction(()=>document.querySelector('#mealsPanel').open&&document.querySelector('#portalHome').hidden);
  await page.close();
 }
}));
