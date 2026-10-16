// Android-like WebGL budget handoff: tunnel/peek contexts must be idle or released before the Vault renderer starts.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {chromium} from 'playwright';
import {transform} from 'esbuild';

const TYPES={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.ts':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png','.glb':'model/gltf-binary'};
const CONTEXT_BUDGET=()=>{
 const probe=window.__gpuBudget={active:0,peak:0,denied:0,denials:[],cap:Infinity},tracked=new WeakSet();
 const get=HTMLCanvasElement.prototype.getContext;
 HTMLCanvasElement.prototype.getContext=function(kind,...args){
  if(!/^webgl/i.test(String(kind)))return get.call(this,kind,...args);
  if(!tracked.has(this)&&probe.active>=probe.cap){probe.denied++;probe.denials.push(new Error(`context cap ${probe.cap} at ${probe.active}`).stack);return null;}
  const gl=get.call(this,kind,...args);
  if(gl&&!tracked.has(this)){
   tracked.add(this);probe.active++;probe.peak=Math.max(probe.peak,probe.active);
   this.addEventListener('webglcontextlost',()=>{probe.active=Math.max(0,probe.active-1);},{once:true});
  }
  return gl;
 };
 window.__gpuBudget.set=value=>probe.cap=value;
 window.__armDelayedLoss=async()=>{
  const THREE=await import('/vendor/three/three.module.js'),prototype=THREE.WebGLRenderer.prototype;
  if(prototype.__vaultBudgetPatch)return;prototype.__vaultBudgetPatch=true;
  const native=prototype.forceContextLoss;
  prototype.forceContextLoss=function(){const gl=this.getContext();requestAnimationFrame(()=>gl?.getExtension('WEBGL_lose_context')?.loseContext());};
 };
};

async function withApp(run){
 const root=resolve('.'),server=createServer(async(req,res)=>{
  const path=new URL(req.url,'http://local').pathname;
  if(path==='/__vault_budget__'){
   res.setHeader('Content-Type','text/html');res.end('<!doctype html><style>body{margin:0}</style><button id="background">Coach</button><nav class="coach-dock"><button data-panel="meals">Food</button></nav><dialog id="mealsPanel">Food</dialog><script type="importmap">{"imports":{"three":"/vendor/three/three.module.js","three/addons/loaders/GLTFLoader.js":"/vendor/three/GLTFLoader.js","three/addons/libs/meshopt_decoder.module.js":"/vendor/three/meshopt_decoder.module.js"}}</script>');return;
  }
  try{const file=resolve(root,'.'+decodeURIComponent(path));if(!file.startsWith(root+sep))throw Error();const ext=extname(file);res.setHeader('Content-Type',TYPES[ext]||'application/octet-stream');res.end(ext==='.ts'?(await transform(await readFile(file,'utf8'),{loader:'ts'})).code:await readFile(file));}catch{res.writeHead(404);res.end();}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  const args=['--enable-webgl','--ignore-gpu-blocklist','--use-gl=angle','--use-angle=swiftshader'];
  try{browser=await chromium.launch({headless:true,args});}catch{browser=await chromium.launch({channel:'msedge',headless:true,args});}
  await run(browser,`http://127.0.0.1:${server.address().port}/__vault_budget__`);
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
}

test('six secret-board handoffs free portal GPU contexts, mount the Vault, then restore 3D and tunnel',{timeout:360000},async()=>withApp(async(browser,url)=>{
 const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true});
 const errors=[];page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error')console.log('browser:',message.text());});
 await page.addInitScript(CONTEXT_BUDGET);
 await page.addInitScript(()=>{window.myr5Routes={go(id){if(id==='vault')return import('/modules/vault/vault-door.mjs').then(m=>m.openVault());const dialog=document.getElementById('mealsPanel');if(dialog&&!dialog.open)dialog.showModal();return Promise.resolve(dialog);}};});
 await page.goto(url);
 await page.evaluate(async()=>{await window.__armDelayedLoss();const {openQuiltPortal}=await import('/modules/portal/portal-entry.mjs');window.portal=await openQuiltPortal();await window.portal.board('pond');window.portal.show();});
 await page.waitForFunction(()=>window.portal&&document.getElementById('portalHome')?.hidden===false);

 // The prior portal session has used and closed a peek. It must release that now-idle renderer.
 const peek=await page.evaluate(async()=>{const m=await import('/modules/portal/portal-peek.mjs'),renderer=m.peekRenderer(),sample=m.createPortalPeek({renderer,quality:'low'});sample.dispose();return {lost:renderer.getContext().isContextLost()};});
 assert.equal(peek.lost,true,'disposing the last peek releases its shared WebGL context');
 await page.waitForFunction(()=>window.__gpuBudget.active===1,null,{timeout:10000});

 for(const id of ['pond','wood','ice','quilt','grass','jelly']){
  await page.evaluate(id=>window.portal.board(id),id);
  await page.waitForFunction(()=>document.getElementById('portalHome')?.dataset.art==='3d'||document.getElementById('portalHome')?.dataset.art==='flat');
  assert.equal(await page.evaluate(()=>document.getElementById('portalHome').dataset.art),'3d',`${id} starts with its real 3D board`);

  // Leave an actual portal wormhole live beside the board, as in a secret transition.
  await page.evaluate(async()=>{const {playWormhole}=await import('/modules/portal/portal.mjs');await playWormhole({direction:'in',minMs:5});});
  const before=await page.evaluate(()=>window.__gpuBudget.active);
  assert.equal(before,2,`${id} has board plus tunnel before handoff`);

  // Simulate the Pixel's two-context limit. Door and hall can share it only after both portal contexts are released.
  await page.evaluate(()=>window.__gpuBudget.set(2));
  await page.evaluate(id=>window.portal.secret(id),id);
  try{await page.waitForFunction(()=>!!document.querySelector('#vaultPanel')?._vault?.info?.(),null,{timeout:45000});}
  catch(error){const debug=await page.evaluate(()=>({shown:window.portal?.disposed===false&&document.getElementById('portalHome')?.hidden===false,board:document.getElementById('portalHome')?.dataset.board,art:document.getElementById('portalHome')?.dataset.art,dialogs:[...document.querySelectorAll('dialog')].map(d=>[d.id,d.open]),vault:document.querySelector('#vaultPanel')?.innerText,active:window.__gpuBudget.active,denied:window.__gpuBudget.denied,route:window.myr5Routes?.current?.()}));throw new Error(`Vault did not mount for ${id}: ${JSON.stringify(debug)}; ${error.message}`);}
  await page.evaluate(()=>document.querySelector('#vaultPanel')._vault.enter());
  await page.waitForSelector('#vaultPanel .vh canvas',{state:'attached',timeout:45000});
  const state=await page.evaluate(async id=>{const s=await import('/modules/vault/vault-store.mjs');return {earned:!!s.view().secrets[id],active:window.__gpuBudget.active,denied:window.__gpuBudget.denied,denials:window.__gpuBudget.denials,canvas:!!document.querySelector('#vaultPanel canvas'),hall:!!document.querySelector('#vaultPanel .vh canvas')};},id);
  assert.equal(state.earned,true,`${id} remains saved`);assert.equal(state.active,2,`${id} door and hall occupy two contexts`);assert.equal(state.canvas,true);assert.equal(state.hall,true);assert.equal(state.denied,0,`${id} does not exceed the cap: ${state.denials.join('\n')}`);

  await page.evaluate(async()=>{const dlg=document.querySelector('#vaultPanel');const closed=new Promise(resolve=>dlg.addEventListener('close',resolve,{once:true}));dlg.close();await closed;window.portal.show();});
  await page.waitForFunction(()=>!document.getElementById('portalHome').hidden&&document.getElementById('portalHome').dataset.art==='3d',null,{timeout:45000});
  await page.evaluate(async()=>{const {playWormhole}=await import('/modules/portal/portal.mjs');await playWormhole({direction:'in',minMs:5});});
  try{await page.waitForFunction(()=>window.__gpuBudget.active===2,null,{timeout:15000});}
  catch(error){const debug=await page.evaluate(()=>({active:window.__gpuBudget.active,denied:window.__gpuBudget.denied,art:document.getElementById('portalHome')?.dataset.art,board:document.getElementById('portalHome')?.dataset.board,hidden:document.getElementById('portalHome')?.hidden,canvases:[...document.querySelectorAll('canvas')].map(c=>({parent:c.parentElement?.className||c.parentElement?.id,contextLost:c.getContext('webgl2')?.isContextLost?.()}))}));throw new Error(`Portal return did not restore two contexts for ${id}: ${JSON.stringify(debug)}; ${error.message}`);}
  assert.equal(await page.evaluate(()=>window.__gpuBudget.active),2,`${id} recreates the tunnel after returning from the Vault`);
  await page.evaluate(async()=>{const {playWormhole}=await import('/modules/portal/portal.mjs');await playWormhole({direction:'out',minMs:5});});
  await page.evaluate(()=>window.portal.show());
 }
 assert.deepEqual(errors,[]);
 await page.evaluate(()=>window.portal.dispose());await page.close();
}));
