// Runtime WebGL context loss in the Vault door and hall: a restored context resumes in place, a lost-for-good one
// shows the failure screen with a Retry that clears the coach dock. The hall parks the door's context while it runs.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {chromium} from 'playwright';
import {transform} from 'esbuild';

const root=resolve('.');
async function withVault(run){
 const server=createServer(async(req,res)=>{
  const path=new URL(req.url,'http://local').pathname;
  if(path==='/__vault__'){
   res.setHeader('Content-Type','text/html');
   // routes.mjs moves the fixed coach dock into the open route dialog; model that dock here.
   res.end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;background:#171020}#coachDock{position:fixed;left:0;right:0;bottom:0;height:88px;z-index:40;background:#223}</style><nav id="coachDock" class="coach-dock">dock</nav><script type="importmap">{"imports":{"three":"/vendor/three/three.module.js","three/addons/loaders/GLTFLoader.js":"/vendor/three/GLTFLoader.js","three/addons/libs/meshopt_decoder.module.js":"/vendor/three/meshopt_decoder.module.js"}}</script>');
   return;
  }
  try{
   const file=resolve(root,'.'+decodeURIComponent(path));if(!file.startsWith(root+sep))throw Error();
   const types={'.mjs':'text/javascript','.js':'text/javascript','.ts':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png'};
   const ext=extname(file);res.setHeader('Content-Type',types[ext]||'application/octet-stream');res.end(ext==='.ts'?(await transform(await readFile(file,'utf8'),{loader:'ts'})).code:await readFile(file));
  }catch{res.writeHead(404);res.end();}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  const args=['--enable-webgl','--ignore-gpu-blocklist','--use-gl=angle','--use-angle=swiftshader'];
  try{browser=await chromium.launch({headless:true,args});}catch{browser=await chromium.launch({channel:'msedge',headless:true,args});}
  const context=await browser.newContext({viewport:{width:412,height:915},deviceScaleFactor:2.625,isMobile:true,hasTouch:true});
  const page=await context.newPage();page.errors=[];page.on('pageerror',e=>page.errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/__vault__`);
  await page.evaluate(async()=>{
   const m=await import('/modules/vault/vault-door.mjs');
   // Keep a handle on every vault WEBGL_lose_context so the test can restore a context it lost.
   const get=HTMLCanvasElement.prototype.getContext;window.__lose=new Map();
   HTMLCanvasElement.prototype.getContext=function(kind,...a){const gl=get.call(this,kind,...a);if(gl&&/webgl/.test(kind)&&!window.__lose.has(this))window.__lose.set(this,gl.getExtension('WEBGL_lose_context'));return gl;};
   window.__open=()=>m.openVault().then(d=>{document.getElementById('vaultPanel').append(document.getElementById('coachDock'));return d;});
   window.__frames=()=>document.querySelector('#vaultPanel')._vault?.renderer.info.render.frame??-1;
  });
  await run(page);
  assert.deepEqual(page.errors,[]);
  await context.close();
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
}
const ready=page=>page.waitForFunction(()=>!!document.querySelector('#vaultPanel')?._vault?.info?.(),null,{timeout:45000});
const door=()=>document.querySelector('#vaultPanel canvas[aria-label="Vault door"]');
const status=page=>page.evaluate(()=>{const s=[...document.querySelectorAll('#vaultPanel [role=status]')].find(e=>/Reconnecting/.test(e.textContent)&&!e.hidden&&e.getClientRects().length);return !!s;});
const visibleAboveDock=page=>async name=>page.evaluate(name=>{
 const b=[...document.querySelectorAll('#vaultPanel button')].find(e=>e.textContent===name&&!e.hidden);if(!b)return {found:false};
 const r=b.getBoundingClientRect(),dock=document.getElementById('coachDock').getBoundingClientRect(),hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);
 return {found:true,clearOfDock:r.bottom<=dock.top,onTop:hit===b};
},name);

test('a door context that is lost and restored resumes without the failure screen',{timeout:120000},async()=>withVault(async page=>{
 await page.evaluate(()=>window.__open());await ready(page);
 const api=await page.evaluate(()=>{window.__api=document.querySelector('#vaultPanel')._vault;return true;});assert.ok(api);
 await page.evaluate(`window.__lose.get((${door})()).loseContext()`);
 await page.waitForFunction(`(${door})().getContext('webgl2').isContextLost()`);
 await page.waitForTimeout(200);
 assert.equal(await status(page),true,'a quiet reconnecting state shows while the context is gone');
 assert.equal(await page.locator('#vaultPanel [role=alert]').count(),0,'no failure screen for a transient loss');
 const before=await page.evaluate(()=>window.__frames());
 await page.evaluate(`window.__lose.get((${door})()).restoreContext()`);
 await page.waitForFunction(`!(${door})().getContext('webgl2').isContextLost()`);
 await page.evaluate(()=>window.__api.wake());
 await page.waitForFunction(b=>window.__frames()>b,before,{timeout:10000});
 await page.waitForTimeout(3500); // past the restore deadline: still no failure
 assert.equal(await page.locator('#vaultPanel [role=alert]').count(),0);
 assert.equal(await status(page),false,'reconnecting state clears once restored');
 assert.equal(await page.evaluate(()=>document.querySelector('#vaultPanel')._vault===window.__api&&window.__api.state.alive),true,'the same door keeps running');
}));

test('a door context that never comes back shows the failure screen with a tappable Retry above the dock',{timeout:120000},async()=>withVault(async page=>{
 await page.evaluate(()=>window.__open());await ready(page);
 await page.evaluate(`window.__lose.get((${door})()).loseContext()`);
 const alert=page.locator('#vaultPanel [role=alert]');await alert.waitFor({state:'visible',timeout:8000});
 assert.equal(await alert.getAttribute('data-vault-error-stage'),'runtime-render');
 const retry=await visibleAboveDock(page)('Retry 3D');
 assert.deepEqual(retry,{found:true,clearOfDock:true,onTop:true},'Retry sits above the dock bar and receives the tap');
 await page.locator('#vaultPanel button',{hasText:'Retry 3D'}).click();
 await ready(page);
 assert.equal(await page.locator('#vaultPanel [role=alert]').count(),0,'Retry fully remounts the door');
 assert.equal(await page.evaluate(`(${door})().getContext('webgl2').isContextLost()`),false);
}));

test('the hall parks the door context, survives its own loss, and the door returns on exit',{timeout:150000},async()=>withVault(async page=>{
 await page.evaluate(()=>window.__open());await ready(page);
 await page.evaluate(()=>{const v=document.querySelector('#vaultPanel')._vault;v.openDoor();});
 await page.waitForTimeout(1600);
 await page.evaluate(()=>document.querySelector('#vaultPanel')._vault.enter());
 await page.waitForSelector('#vaultPanel .vh canvas',{state:'attached',timeout:45000});
 await page.waitForFunction(`(${door})().getContext('webgl2').isContextLost()`,null,{timeout:10000});
 // Hall loses and regains its context: it stays up.
 await page.evaluate(()=>window.__lose.get(document.querySelector('.vh canvas')).loseContext());
 await page.waitForTimeout(300);
 assert.equal(await page.locator('.vh-rc').isVisible(),true);
 await page.evaluate(()=>window.__lose.get(document.querySelector('.vh canvas')).restoreContext());
 await page.waitForFunction(()=>!document.querySelector('.vh canvas').getContext('webgl2').isContextLost());
 await page.waitForTimeout(3500);
 assert.equal(await page.locator('.vh').count(),1,'the hall survives a restored loss');
 assert.equal(await page.locator('.vh-rc').isVisible(),false);
 // Exit: the door context is restored and the purple veil is gone.
 await page.locator('.vh-x').click();
 await page.waitForFunction(`!(${door})().getContext('webgl2').isContextLost()`,null,{timeout:10000});
 const back=await page.evaluate(()=>({veils:[...document.querySelectorAll('#vaultPanel div')].filter(d=>/radial-gradient/.test(d.style.background)).length,alive:document.querySelector('#vaultPanel')._vault?.state.alive}));
 assert.deepEqual(back,{veils:0,alive:true});
 const before=await page.evaluate(()=>window.__frames());
 await page.evaluate(()=>document.querySelector('#vaultPanel')._vault.wake());
 await page.waitForFunction(b=>window.__frames()>b,before,{timeout:10000});
 // Hall loses its context for good: the door offers Retry 3D Hall above the dock.
 await page.evaluate(()=>document.querySelector('#vaultPanel')._vault.enter());
 await page.waitForSelector('#vaultPanel .vh canvas',{state:'attached',timeout:45000});
 await page.waitForTimeout(500);
 await page.evaluate(()=>window.__lose.get(document.querySelector('.vh canvas')).loseContext());
 await page.waitForSelector('#vaultPanel button:text("Retry 3D Hall")',{timeout:8000});
 assert.deepEqual(await visibleAboveDock(page)('Retry 3D Hall'),{found:true,clearOfDock:true,onTop:true});
 await page.waitForFunction(`!(${door})().getContext('webgl2').isContextLost()`,null,{timeout:10000});
}));
