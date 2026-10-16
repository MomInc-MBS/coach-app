// Startup regressions under a mobile-sized, one-WebGL-context budget.
// These are Chromium/SwiftShader pressure tests, not a claim to emulate Android hardware.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {chromium} from 'playwright';
import {transform} from 'esbuild';

const root=resolve('.');
async function withMobilePage(run){
 const server=createServer(async(req,res)=>{
  const path=new URL(req.url,'http://local').pathname;
  if(path==='/__mobile__'){
   res.setHeader('Content-Type','text/html');
   res.end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"><style>html,body{margin:0;width:100%;height:100%;background:#171020}#app{position:fixed;inset:0}</style><main id="app"></main><script type="importmap">{"imports":{"three":"/vendor/three/three.module.js","three/addons/loaders/GLTFLoader.js":"/vendor/three/GLTFLoader.js","three/addons/libs/meshopt_decoder.module.js":"/vendor/three/meshopt_decoder.module.js"}}</script>');
   return;
  }
  try{
   const file=resolve(root,'.'+decodeURIComponent(path));if(!file.startsWith(root+sep))throw Error();
   const ext=extname(file),types={'.mjs':'text/javascript','.js':'text/javascript','.ts':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png','.wasm':'application/wasm'};
   res.setHeader('Content-Type',types[ext]||'application/octet-stream');
   res.end(ext==='.ts'?(await transform(await readFile(file,'utf8'),{loader:'ts'})).code:await readFile(file));
  }catch{res.writeHead(404);res.end();}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  const args=['--enable-webgl','--ignore-gpu-blocklist','--use-gl=angle','--use-angle=swiftshader'];
  try{browser=await chromium.launch({headless:true,args});}catch{browser=await chromium.launch({channel:'msedge',headless:true,args});}
  const context=await browser.newContext({viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36'});
  const page=await context.newPage();page.errors=[];page.on('pageerror',e=>page.errors.push(e.message));
  await page.goto('http://127.0.0.1:'+server.address().port+'/__mobile__');
  await page.evaluate(()=>{
   const probe=window.__gpuProbe={active:0,peak:0,denied:0,created:0,losses:0,cap:2},tracked=new WeakSet(),nativeGet=HTMLCanvasElement.prototype.getContext;
   HTMLCanvasElement.prototype.getContext=function(kind,...args){
    if(!/^webgl/i.test(String(kind)))return nativeGet.call(this,kind,...args);
    if(!tracked.has(this)&&probe.active>=probe.cap){probe.denied++;return null;}
    const gl=nativeGet.call(this,kind,...args);
    if(gl&&!tracked.has(this)){
     tracked.add(this);probe.created++;probe.active++;probe.peak=Math.max(probe.peak,probe.active);
     this.addEventListener('webglcontextlost',()=>{probe.losses++;probe.active=Math.max(0,probe.active-1);},{once:true});
    }
    return gl;
   };
   // Model the real asynchronous release boundary: forceContextLoss schedules the loss event
   // on the next frame, so a new renderer cannot assume the old context is already gone.
   window.__delayContextLoss=true;
   window.__armDelayedLoss=async()=>{
    const THREE=await import('/vendor/three/three.module.js'),proto=THREE.WebGLRenderer.prototype;
    if(proto.__mobileLossPatched)return;proto.__mobileLossPatched=true;
    const native=proto.forceContextLoss;
    proto.forceContextLoss=function(){
     if(!window.__delayContextLoss)return native.call(this);
     const gl=this.getContext(),ext=gl?.getExtension('WEBGL_lose_context');
     requestAnimationFrame(()=>ext?.loseContext());
    };
   };
  });
  await run(page,'http://127.0.0.1:'+server.address().port);
  await context.close();
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
}

const openVault=()=>import('/modules/vault/vault-door.mjs').then(m=>m.openVault());
const probe=page=>page.evaluate(()=>({...window.__gpuProbe}));
const waitForActive=async(page,n)=>{
 try{await page.waitForFunction(n=>window.__gpuProbe.active===n,n,{timeout:15000});}
 catch(error){const state=await page.evaluate(()=>({probe:window.__gpuProbe,canvases:[...document.querySelectorAll('canvas')].map(c=>({label:c.getAttribute('aria-label'),connected:c.isConnected,width:c.width,height:c.height}))}));assert.fail(`expected ${n} live WebGL contexts: ${JSON.stringify(state)}; ${error.message}`);}
};

test('portal-to-vault and hall stay within Android two-context budget during delayed GPU release',async()=>withMobilePage(async(page,origin)=>{
 await page.evaluate(async()=>{
  await window.__armDelayedLoss();
  const {openQuiltPortal}=await import('/modules/portal/portal-entry.mjs');
  window.myr5Routes={go:id=>{if(id==='vault')window.__vaultOpen=import('/modules/vault/vault-door.mjs').then(m=>m.openVault());}};
  window.portal=await openQuiltPortal();await window.portal.board('ice');window.portal.show();
  const {playWormhole}=await import('/modules/portal/portal.mjs');
  window.__wormholePromise=playWormhole({direction:'in',minMs:60000});
 });
 await waitForActive(page,2);
 await page.waitForFunction(()=>document.getElementById('portalHome')?.hidden===false);
 assert.equal((await probe(page)).active,2,'the rendered board and the portal tunnel occupy the expected two contexts');
 await page.evaluate(()=>window.portal.secret('ice'));
 await page.waitForFunction(()=>!!document.querySelector('#vaultPanel canvas'),null,{timeout:30000});
 await page.waitForFunction(()=>!!document.querySelector('#vaultPanel')._vault?.info?.(),null,{timeout:30000});
 assert.equal((await probe(page)).active,1,'the board and tunnel release before the 3D door claims a context');
 await page.evaluate(()=>document.querySelector('#vaultPanel')._vault.enter());
 await page.waitForSelector('#vaultPanel .vh canvas',{state:'attached',timeout:30000});
 await waitForActive(page,2);
 const p=await probe(page);
 assert.equal(p.denied,0,'the vault door and hall must wait until portal contexts are actually released');
 assert.equal(p.peak,2,'portal tunnel plus door or door plus hall fit the device budget; all three must not overlap');
 assert.equal(p.active,2,'the door and hall own the two remaining contexts');
 assert.deepEqual(page.errors,[]);
}));

test('post-renderer startup failure reports its stage, releases the context, and retry succeeds repeatedly',async()=>withMobilePage(async page=>{
 await page.evaluate(async()=>{
  await window.__armDelayedLoss();
  window.__nativeResizeObserver=window.ResizeObserver;window.__failVaultLayout=true;
  window.ResizeObserver=class {constructor(...args){if(window.__failVaultLayout)throw new Error('Injected layout startup failure');return new window.__nativeResizeObserver(...args);}};
  window.__openVault=()=>import('/modules/vault/vault-door.mjs').then(m=>m.openVault());
  await window.__openVault().catch(e=>{window.__openError=String(e);});
 });
 const alert=page.locator('#vaultPanel [role="alert"]');
 await alert.waitFor({state:'visible',timeout:10000}).catch(async error=>{
  const state=await page.evaluate(()=>({text:document.querySelector('#vaultPanel')?.innerText,open:document.querySelector('#vaultPanel')?.open,stage:window.__openError,probe:window.__gpuProbe}));
  assert.fail(`expected startup alert; current state: ${JSON.stringify(state)}; ${error.message}`);
 });
 await page.waitForFunction(()=>window.__gpuProbe.active===0,null,{timeout:15000});
 const first=await alert.evaluate(el=>({stage:el.dataset.vaultErrorStage,name:el.dataset.vaultErrorName,message:el.dataset.vaultErrorMessage,visible:!!(el.offsetWidth||el.offsetHeight||el.getClientRects().length)}));
 assert.equal(first.stage,'layout');assert.equal(first.name,'Error');assert.match(first.message,/Injected layout startup failure/);assert.equal(first.visible,true);
 assert.doesNotMatch(first.message,/https?:\/\/|stack|vault-door\.mjs/i,'diagnostic text must not expose URLs or stack traces');
 assert.equal(await page.locator('#vaultPanel canvas').count(),0,'failed renderer canvas is removed before the alert is shown');

 // Recover, then repeat a failed mount to catch accumulated contexts/listeners across retries.
 for(let cycle=0;cycle<2;cycle++){
  await page.evaluate(()=>{window.__failVaultLayout=false;});
  await page.locator('#vaultPanel button').filter({hasText:'Retry 3D'}).click();
  await page.waitForFunction(()=>!!document.querySelector('#vaultPanel')._vault?.info?.(),null,{timeout:30000});
  assert.equal((await probe(page)).active,1);
  if(cycle===0){
    await page.evaluate(()=>{window.__failVaultLayout=true;window.__openVault().catch(e=>{window.__openError=String(e);});});
   await alert.waitFor({state:'visible',timeout:10000}).catch(async error=>{
    const state=await page.evaluate(()=>({text:document.querySelector('#vaultPanel')?.innerText,open:document.querySelector('#vaultPanel')?.open,stage:window.__openError,probe:window.__gpuProbe}));
    assert.fail(`expected repeated-startup alert; current state: ${JSON.stringify(state)}; ${error.message}`);
   });
   await page.waitForFunction(()=>window.__gpuProbe.active===0,null,{timeout:15000});
   assert.equal(await page.locator('#vaultPanel canvas').count(),0);
  }
 }
 const p=await probe(page);assert.equal(p.peak,1);assert.equal(p.denied,0);
 await page.locator('#vaultPanel').evaluate(d=>d.close());
 await page.waitForFunction(()=>window.__gpuProbe.active===0,null,{timeout:15000});
 assert.deepEqual(page.errors,[]);
}));

test('first render failure is reported locally, cleaned up, and retry does not create a page error',async()=>withMobilePage(async page=>{
 await page.evaluate(async()=>{
  await window.__armDelayedLoss();
  window.__failFirstVaultRender=true;
  for(const method of ['drawElements','drawArrays']){
   const proto=WebGL2RenderingContext.prototype,native=proto[method];
   proto[method]=function(...args){if(window.__failFirstVaultRender){window.__failFirstVaultRender=false;throw new Error('Injected first frame render failure');}return native.apply(this,args);};
  }
  window.__openVault=()=>import('/modules/vault/vault-door.mjs').then(m=>m.openVault());await window.__openVault();
 });
 const alert=page.locator('#vaultPanel [role="alert"]');await alert.waitFor({state:'visible',timeout:30000});
 const details=await alert.evaluate(el=>({stage:el.dataset.vaultErrorStage,name:el.dataset.vaultErrorName,message:el.dataset.vaultErrorMessage}));
 assert.equal(details.stage,'first-render');assert.equal(details.name,'Error');assert.match(details.message,/Injected first frame render failure/);
 assert.equal(await page.locator('#vaultPanel').evaluate(d=>!!d._vault),false,'a renderer is not published before the first frame succeeds');
 await page.waitForFunction(()=>window.__gpuProbe.active===0,null,{timeout:15000});
 await page.locator('#vaultPanel button').filter({hasText:'Retry 3D'}).click();
 await page.waitForFunction(()=>!!document.querySelector('#vaultPanel')._vault?.info?.(),null,{timeout:30000});
 assert.equal((await probe(page)).active,1);assert.deepEqual(page.errors,[]);
}));

test('closing while a GLB is still loading disposes the late mount',async()=>withMobilePage(async page=>{
 let releaseAsset;
 const held=new Promise(r=>{releaseAsset=r;});
 await page.route('**/pod/worlds/boards/cogs/door.glb',async route=>{await held;await route.continue();});
 await page.evaluate(async()=>{await window.__armDelayedLoss();window.__openVault=()=>import('/modules/vault/vault-door.mjs').then(m=>m.openVault());window.__opening=window.__openVault();});
 await page.waitForRequest('**/pod/worlds/boards/cogs/door.glb',{timeout:15000});
 await page.locator('#vaultPanel[open]').waitFor();
 assert.equal((await probe(page)).active,1,'the mount acquired its renderer before loading the door asset');
 await page.locator('#vaultPanel').evaluate(d=>d.close());
 await page.waitForFunction(()=>window.__gpuProbe.active===0,null,{timeout:15000});
 const immediatelyClosed=await page.evaluate(()=>({open:document.querySelector('#vaultPanel').open,api:!!document.querySelector('#vaultPanel')._vault,canvases:document.querySelectorAll('#vaultPanel canvas').length}));
 assert.deepEqual(immediatelyClosed,{open:false,api:false,canvases:0},'close aborts and frees the renderer while the asset response is still held');
 releaseAsset();await page.waitForTimeout(250);
 const afterLateResponse=await page.evaluate(()=>({open:document.querySelector('#vaultPanel').open,api:!!document.querySelector('#vaultPanel')._vault,canvases:document.querySelectorAll('#vaultPanel canvas').length,probe:window.__gpuProbe}));
 assert.deepEqual({open:afterLateResponse.open,api:afterLateResponse.api,canvases:afterLateResponse.canvases},{open:false,api:false,canvases:0});
 assert.equal(afterLateResponse.probe.active,0,'an aborted late response must not allocate another renderer');assert.deepEqual(page.errors,[]);
}));

test('a retained Vault API is inert after close and cannot restart rendering or enter the hall',async()=>withMobilePage(async page=>{
 await page.evaluate(async()=>{await window.__armDelayedLoss();window.__openVault=()=>import('/modules/vault/vault-door.mjs').then(m=>m.openVault());await window.__openVault();window.__retainedVaultApi=document.querySelector('#vaultPanel')._vault;});
 await page.waitForFunction(()=>!!document.querySelector('#vaultPanel')?._vault?.info?.(),null,{timeout:30000});
 await page.locator('#vaultPanel').evaluate(d=>d.close());
 await page.waitForFunction(()=>window.__gpuProbe.active===0,null,{timeout:15000});
 await page.evaluate(()=>{const api=window.__retainedVaultApi;api.wake();api.enter();api.openDoor();api.goTo(1);});
 await page.waitForTimeout(300);
 const state=await page.evaluate(()=>({alive:window.__retainedVaultApi.state.alive,canvases:document.querySelectorAll('#vaultPanel canvas').length,halls:document.querySelectorAll('.vh').length,active:window.__gpuProbe.active}));
 assert.deepEqual(state,{alive:false,canvases:0,halls:0,active:0});assert.deepEqual(page.errors,[]);
}));
