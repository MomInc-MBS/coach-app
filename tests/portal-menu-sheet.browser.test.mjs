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
    '<script type="importmap">{"imports":{"three":"/vendor/three/three.module.js"}}</script>');
   return;
  }
  try{const root=path.startsWith('/modules/portal/')?source:built,file=resolve(root,'.'+path);if(!file.startsWith(root+sep))throw Error();res.setHeader('Content-Type',({'.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.webp':'image/webp'})[extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404);res.end();}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{browser=await chromium.launch({channel:'msedge',headless:true});await run(browser,'http://127.0.0.1:'+server.address().port+'/__portal__');}
 finally{await browser?.close();await new Promise(r=>server.close(r));}
}

test('Menu-sheet dialog opens fade back to the quilt on close, exit button reads Pod, no board row for one board',async()=>withPortal(async(browser,url)=>{
 const page=await browser.newPage({viewport:{width:390,height:844}});
 // The board's own WebGL rendering is irrelevant here; fail it so the test doesn't need swiftshader.
 await page.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,...args){return /webgl/i.test(kind)?null:get.call(this,kind,...args);};});
 await page.goto(url);
 await page.evaluate(async()=>{const {openQuiltPortal}=await import('/modules/portal/portal-entry.mjs');window.portal=await openQuiltPortal();});
 await page.waitForFunction(()=>document.getElementById('portalHome')?.hidden===false);

 // #25: the exit button now leads to the pod.
 assert.equal(await page.locator('#portalExitButton').innerText(),'Pod');
 // #26: one production board -> no board picker row in the Menu sheet.
 assert.equal(await page.locator('.portal-board-chips').count(),0);

 // #8: a dialog destination (Meditation, kind:'dialog') opened from the Menu sheet — not a traced shape —
 // must still fade back to the quilt when its dialog closes, same as a gesture open.
 await page.locator('#portalMenuButton').click();
 await page.locator('#portalMenu [data-menu="line-lr"]').click();
 await page.waitForFunction(()=>document.querySelector('.meditation-panel')?.open===true);
 await page.locator('#meditationClose').click();
 await page.waitForFunction(()=>document.getElementById('portalHome')?.hidden===false);
}));
