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
    // Minimal stand-in for the real app-updates.mjs banner (same class name, same fixed/bottom shape).
    '<aside class="app-update-banner" role="status" style="position:fixed;left:12px;right:12px;bottom:max(12px,env(safe-area-inset-bottom));z-index:9999"><span>Update</span><button type="button" id="toastGotIt">Got it</button></aside>'+
    '<dialog id="anyDialog"><button id="anyDialogClose">Close</button></dialog>'+
    '<script type="importmap">{"imports":{"three":"/vendor/three/three.module.js"}}</script>');
   return;
  }
  try{const root=path.startsWith('/modules/portal/')?source:built,file=resolve(root,'.'+path);if(!file.startsWith(root+sep))throw Error();res.setHeader('Content-Type',({'.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.webp':'image/webp'})[extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404);res.end();}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{browser=await chromium.launch({channel:'msedge',headless:true});await run(browser,'http://127.0.0.1:'+server.address().port+'/__portal__');}
 finally{await browser?.close();await new Promise(r=>server.close(r));}
}

test('the update toast stays tappable and clear of the Menu button, dialog backdrops lighten, while the quilt is up',async()=>withPortal(async(browser,url)=>{
 const page=await browser.newPage({viewport:{width:390,height:844}});
 await page.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,...args){return /webgl/i.test(kind)?null:get.call(this,kind,...args);};});
 await page.goto(url);
 await page.evaluate(async()=>{const {openQuiltPortal}=await import('/modules/portal/portal-entry.mjs');window.portal=await openQuiltPortal();});
 await page.waitForFunction(()=>document.getElementById('portalHome')?.hidden===false);

 // #7: the toast is exempt from the inert sweep, its button is hit-testable, and it no longer sits on the Menu button.
 const toast=await page.evaluate(()=>{
  const banner=document.querySelector('.app-update-banner'),btn=document.getElementById('toastGotIt'),menuBtn=document.getElementById('portalMenuButton');
  const br=btn.getBoundingClientRect(),mr=menuBtn.getBoundingClientRect();
  const overlap=!(br.right<mr.left||br.left>mr.right||br.bottom<mr.top||br.top>mr.bottom);
  return {inert:banner.inert,hit:document.elementFromPoint(br.left+br.width/2,br.top+br.height/2)===btn,overlap};
 });
 assert.equal(toast.inert,false);
 assert.equal(toast.hit,true);
 assert.equal(toast.overlap,false);

 // #14: a dialog opened over the quilt gets a lighter backdrop than the near-black default.
 await page.evaluate(()=>document.getElementById('anyDialog').showModal());
 const backdrop=await page.evaluate(()=>getComputedStyle(document.getElementById('anyDialog'),'::backdrop').backgroundColor);
 assert.equal(backdrop,'rgba(12, 8, 18, 0.4)');
}));
