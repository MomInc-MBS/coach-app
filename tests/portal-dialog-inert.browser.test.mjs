import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {chromium} from 'playwright';

// Regression for hotfix 11773d3: fails on 9658fbb (every top-level body child was made inert while the
// quilt was up, so a dialog opened as a modal over it — e.g. the full-download offer — was modal AND
// inert, freezing the screen on a real phone), passes on 11773d3.
async function withPortal(run){
 const source=resolve('.'),built=resolve('dist/client');
 const server=createServer(async(req,res)=>{
  const path=new URL(req.url,'http://local').pathname;
  if(path==='/__portal__'){
   res.setHeader('Content-Type','text/html');
   res.end('<!doctype html><style>body{margin:0}</style><button id="background">Coach</button>'+
    '<dialog id="closedDrawnDialog" style="display:grid"><button>Hidden action</button></dialog>'+
    '<dialog id="downloadSheet"><button id="downloadClose">Got it</button></dialog>'+
    '<script type="importmap">{"imports":{"three":"/vendor/three/three.module.js"}}</script>');
   return;
  }
  try{const root=path.startsWith('/modules/portal/')?source:built,file=resolve(root,'.'+path);if(!file.startsWith(root+sep))throw Error();res.setHeader('Content-Type',({'.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.webp':'image/webp'})[extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404);res.end();}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{browser=await chromium.launch({channel:'msedge',headless:true});await run(browser,'http://127.0.0.1:'+server.address().port+'/__portal__');}
 finally{await browser?.close();await new Promise(r=>server.close(r));}
}
function rectHitsSelf(){return n=>{const r=n.getBoundingClientRect();return document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)===n;};}

test('a dialog opened over the quilt portal stays tappable; a closed-but-drawn one stays blocked',async()=>withPortal(async(browser,url)=>{
 const page=await browser.newPage({viewport:{width:390,height:844}});
 // The board's own WebGL rendering is irrelevant to inert/hit-testing; fail it so the test doesn't need swiftshader.
 await page.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,...args){return /webgl/i.test(kind)?null:get.call(this,kind,...args);};});
 await page.goto(url);
 await page.evaluate(async()=>{const {openQuiltPortal}=await import('/modules/portal/portal-entry.mjs');window.portal=await openQuiltPortal();});
 await page.waitForFunction(()=>document.getElementById('portalHome')?.hidden===false);

 // A closed dialog that is still drawn (inline display:grid) stays inert: it can't catch taps meant for the quilt.
 assert.equal(await page.locator('#closedDrawnDialog').evaluate(n=>n.inert),true);

 // A dialog opened with showModal() while the quilt is up (the full-download offer, setup gate, reward reveals)
 // is not inert and its button is hit-testable.
 await page.evaluate(()=>document.getElementById('downloadSheet').showModal());
 assert.equal(await page.locator('#downloadSheet').evaluate(n=>n.inert),false);
 assert.equal(await page.locator('#downloadClose').evaluate(rectHitsSelf()),true);

 // After it closes, the portal's own Menu button is hit-testable again.
 await page.evaluate(()=>document.getElementById('downloadSheet').close());
 assert.equal(await page.locator('#portalMenuButton').evaluate(rectHitsSelf()),true);
}));
