import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {chromium} from 'playwright';
import {completeCoach} from './onboarding-fixture.mjs';

// R9-OFFLINE: the pose tracker (bundle, wasm, model) is served same-origin from /vendor/mediapipe/ and is part of the
// Starter download. After one camera set online, or after downloading Starter, a camera workout starts offline with the
// real MediaPipe tracker and its frames reach the movement engine. Nothing comes from a CDN.
const TYPES={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png','.glb':'model/gltf-binary','.webp':'image/webp','.wasm':'application/wasm'};
const PINNED=['vision_bundle.mjs','wasm/vision_wasm_internal.js','wasm/vision_wasm_internal.wasm','pose_landmarker_lite.task'].map(name=>'/vendor/mediapipe/0.10.14/'+name);

test('a camera workout opened once online, or downloaded with Starter, starts and tracks offline',{timeout:600000},async()=>{
 const root=resolve('dist/client');
 const server=createServer(async(req,res)=>{
  const path=new URL(req.url,'http://local').pathname;if(path==='/__test__'){res.writeHead(200,{'Content-Type':'text/html'});res.end('<!doctype html><title>Test</title>');return;}
  if(path.startsWith('/api/')){res.writeHead(path==='/api/auth/config'?200:401,{'Content-Type':'application/json'});res.end(JSON.stringify(path==='/api/auth/config'?{enabled:false}:{error:'Sign in'}));return;}
  try{const file=resolve(root,'.'+(path==='/'?'/pose.html':path));if(!file.startsWith(root+sep))throw Error();const body=await readFile(file);res.writeHead(200,{'Content-Type':TYPES[extname(file)]||'application/octet-stream'});res.end(body);}catch{res.writeHead(404);res.end();}
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 let browser;try{
  browser=await chromium.launch({channel:'msedge',headless:true,args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
  for(const via of ['camera','starter']){
   const context=await browser.newContext({viewport:{width:375,height:812},permissions:['camera']}),page=await context.newPage(),cdn=[];
   // Today's How to Play has been seen (it opens by itself once a day and would sit over the workout library).
   await context.addInitScript((()=>{const get=Storage.prototype.getItem,d=new Date(),day=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;Storage.prototype.getItem=function(key){return String(key).startsWith('myr5-how-to-play-day-v1/')?day:get.call(this,key);};}));
   context.on('request',request=>{if(/tasks-vision|mediapipe-models/.test(request.url()))cdn.push(request.url());});
   await page.goto(base+'/__test__');await page.evaluate(async intake=>{const {openLocalCoach}=await import('/local-coach-runtime.mjs');const repo=await openLocalCoach();await repo.forOwner(repo.guestOwnerId).saveSetup(intake,{startDay:'2026-09-21'});repo.close();localStorage.setItem('myr5-downloads-seen','1');},completeCoach());
   const ready=()=>page.waitForFunction(()=>window.myr5TestState?.phase==='idle'&&navigator.serviceWorker.controller&&window.myr5WorkoutOwner&&!window.myr5WorkoutOwner.snapshot().transitioning,null,{timeout:60000});
   const begin=async()=>{
    await page.evaluate(()=>document.getElementById('start').click());
    await page.waitForFunction(()=>document.getElementById('library').open,null,{timeout:30000});
    await page.evaluate(()=>document.getElementById('useHologram').click());
    await page.waitForFunction(()=>window.myr5TestState.phase==='error'||window.myr5TestState.phase==='tracking'&&window.myr5TestState.frames>=10,null,{timeout:120000});
    const seen=await page.evaluate(()=>{const s=window.myr5TestState;return {phase:s.phase,error:s.error,frames:s.frames,engine:s.motion.message};});
    assert.equal(seen.phase,'tracking',via+': '+JSON.stringify(seen));assert.ok(seen.engine,via+': the movement engine answered');
    // A dispatched tap: stopping isn't under test here (a real click is sometimes caught by <html> in headless Edge).
    await page.getByRole('button',{name:'Stop workout',exact:true}).dispatchEvent('click');await page.waitForFunction(()=>window.myr5TestState.phase==='idle');
   };
   await page.goto(base+'/pose.html#pod');await ready();
   if(via==='camera')await begin();
   else{
    // Settings > Downloads: only Starter, downloaded into this release's package.
    await page.evaluate(()=>{window.myr5Portal?.hide();document.getElementById('openSettings').click();});await page.locator('#settings .downloads-entry button').click();
    await page.waitForFunction(()=>document.getElementById('downloadsMenu')?.open&&document.querySelector('#downloadsMenu [data-group="starter"]'),null,{timeout:30000});
    await page.evaluate(()=>{for(const box of document.querySelectorAll('#downloadsMenu [data-group]'))if(!box.disabled&&box.checked!==(box.dataset.group==='starter'))box.click();});
    await page.getByRole('button',{name:'Download selected'}).click();
    const saved=()=>page.evaluate(async pinned=>{const name=(await caches.keys()).find(n=>n.startsWith('myr5-package-'));const keys=name?(await(await caches.open(name)).keys()).map(k=>new URL(k.url).pathname):[];return pinned.every(p=>keys.includes(p));},PINNED);
    for(const t0=Date.now();!await saved();await page.waitForTimeout(500))assert.ok(Date.now()-t0<240000,'Starter download holds the tracker');
   }
   await context.setOffline(true);await page.reload();await ready();await begin();
   assert.deepEqual(cdn,[],via+': no tracker file from a CDN');
   await context.close();
  }
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
});
