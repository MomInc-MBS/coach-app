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
  if(path==='/__portal__'){
   res.setHeader('Content-Type','text/html');
   res.end('<!doctype html><style>body{margin:0}</style><button id="background">Coach</button>'+
    '<button class="meditation-entry" onclick="document.querySelector(\'.meditation-panel\').showModal()">Meditate</button>'+
    '<dialog class="meditation-panel">Breathe<button id="meditationClose" onclick="this.closest(\'dialog\').close()">Close</button></dialog>'+
    '<script type="importmap">{"imports":{"three":"/vendor/three/three.module.js","three/addons/loaders/GLTFLoader.js":"/vendor/three/GLTFLoader.js","three/addons/libs/meshopt_decoder.module.js":"/vendor/three/meshopt_decoder.module.js"}}</script>');
   return;
  }
  try{const root=path.startsWith('/modules/portal/')?source:built,file=resolve(root,'.'+path);if(!file.startsWith(root+sep))throw Error();res.setHeader('Content-Type',({'.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.webp':'image/webp'})[extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404);res.end();}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{browser=await chromium.launch({channel:'msedge',headless:true});await run(browser,'http://127.0.0.1:'+server.address().port+'/__portal__');}
 finally{await browser?.close();await new Promise(r=>server.close(r));}
}

test('physical dock toggles the grimoire, Escape closes the menu sheet, and destinations return to the quilt',async()=>withPortal(async(browser,url)=>{
 const page=await browser.newPage({viewport:{width:390,height:844}});
 // The board's own WebGL rendering is irrelevant here; fail it so the test doesn't need swiftshader.
 await page.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,...args){return /webgl/i.test(kind)?null:get.call(this,kind,...args);};});
 await page.goto(url);
 await page.evaluate(async()=>{const {openQuiltPortal}=await import('/modules/portal/portal-entry.mjs');window.portal=await openQuiltPortal();});
 await page.waitForFunction(()=>document.getElementById('portalHome')?.hidden===false);

 // #25: the exit button now leads to the pod.
 assert.equal(await page.locator('#portalExitButton').innerText(),'Pod');
 // The optional Boards packet adds five boards beside Quilt in the Menu sheet.
 assert.equal(await page.locator('.portal-board-chips').count(),1);
 assert.equal(await page.locator('.portal-board-chips [data-board]').count(),6);

 // The large center key toggles between the grimoire and the workout pod.
 await page.locator('#portalMenuButton').click();
 await page.waitForFunction(()=>document.getElementById('portalHome')?.hidden===true);
 await page.evaluate(()=>window.portal.show());
 await page.waitForFunction(()=>document.getElementById('portalHome')?.hidden===false);
 // Line-up still opens the menu. Escape remains its keyboard close path after the explicit close control is removed.
 await page.evaluate(()=>window.portal.open('line-up'));
 await page.waitForFunction(()=>document.getElementById('portalMenu')?.open===true);
 assert.equal(await page.locator('#portalMenu [data-close]').count(),0);
 // Pinch apart opens the sheet to full screen; pinching together restores its portal frame.
 await page.evaluate(()=>{
  const d=document.getElementById('portalMenu');
  const fire=(type,id,x)=>d.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerId:id,pointerType:'touch',clientX:x,clientY:400}));
  fire('pointerdown',31,120);fire('pointerdown',32,220);fire('pointermove',31,40);fire('pointermove',32,300);
 });
 await page.waitForFunction(()=>{const d=document.getElementById('portalMenu');return d?.classList.contains('portal-fullscreen')||d?.classList.contains('portal-pinched-fullscreen');},null,{timeout:5000});
 await page.evaluate(()=>{
  const d=document.getElementById('portalMenu');
  const fire=(type,id,x)=>d.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerId:id,pointerType:'touch',clientX:x,clientY:400}));
  fire('pointerup',31,40);fire('pointerup',32,300);fire('pointerdown',33,40);fire('pointerdown',34,300);fire('pointermove',33,130);fire('pointermove',34,210);
 });
 await page.waitForFunction(()=>{const d=document.getElementById('portalMenu');return !d?.classList.contains('portal-fullscreen')&&!d?.classList.contains('portal-pinched-fullscreen');},null,{timeout:5000});
 await page.keyboard.press('Escape');
 await page.waitForFunction(()=>document.getElementById('portalHome')?.hidden===false);
 // A dialog destination opened from the sheet must still return through the portal on close.
 await page.evaluate(()=>window.portal.open('line-up'));
 await page.waitForFunction(()=>document.getElementById('portalMenu')?.open===true);
 await page.locator('#portalMenu [data-menu="line-lr"]').click();
 await page.waitForFunction(()=>document.querySelector('.meditation-panel')?.open===true);
 await page.locator('#meditationClose').click();
 await page.waitForFunction(()=>document.getElementById('portalHome')?.hidden===false);
}));
