// #120: the SATCOM frame (settings-frame.css + mountSatcomFrame in coach-hub.mjs), generalised
// from Settings-only to any dialog, applied to the Install panel (#installPanel) and the
// full-screen Downloads menu (#downloadsMenu). Checks the frame is present, the acquiring -> locked
// strip settles to the "DOWNLOAD LINK" label, the frame doesn't cover Install's own controls or the
// Downloads menu's Download selected / Not now buttons, and that reduced motion is static. Runs
// against the production build (dist/client), same harness shape as post-download.browser.test.mjs.
// Frames go to .frames/.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {chromium} from 'playwright';
import {completeCoach} from './onboarding-fixture.mjs';

const FRAMES=resolve('.frames');
const root=resolve('dist/client');
const TYPES={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.mp3':'audio/mpeg','.woff2':'font/woff2','.ttf':'font/ttf','.glb':'model/gltf-binary'};
const TRACKER='https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs';
const STUB=`export const FilesetResolver={forVisionTasks:async()=>({})}; export const PoseLandmarker={createFromOptions:async()=>({detectForVideo:()=>({landmarks:[],worldLandmarks:[]}),close(){}})};export class DrawingUtils{}`;

async function serve(){
 const server=createServer(async(req,res)=>{
  const path=new URL(req.url,'http://local').pathname;
  if(path==='/__test__'){res.writeHead(200,{'Content-Type':'text/html'});res.end('<!doctype html><title>Test</title>');return;}
  if(path.startsWith('/api/')){res.writeHead(path==='/api/auth/config'?200:401,{'Content-Type':'application/json'});res.end(JSON.stringify(path==='/api/auth/config'?{enabled:false}:{error:'Sign in'}));return;}
  try{const file=resolve(root,'.'+(path==='/'?'/pose.html':path));if(!file.startsWith(root+sep))throw Error();const data=await readFile(file);res.writeHead(200,{'Content-Type':TYPES[extname(file)]||'application/octet-stream'});res.end(data);}catch{res.writeHead(404);res.end();}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 return {base:'http://127.0.0.1:'+server.address().port,close:()=>new Promise(r=>{server.closeAllConnections();server.close(r);})};
}
async function launch(){return chromium.launch({channel:'msedge',headless:true,args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});}
async function installed(browser,base,extra={}){
 const context=await browser.newContext({viewport:{width:375,height:812},permissions:['camera'],...extra});
 await context.route(TRACKER,route=>route.fulfill({contentType:'text/javascript',body:STUB}));
 const page=await context.newPage();await page.goto(base+'/__test__');
 await page.evaluate(async intake=>{const {openLocalCoach}=await import('/local-coach-runtime.mjs');const repo=await openLocalCoach();await repo.forOwner(repo.guestOwnerId).saveSetup(intake,{startDay:'2026-09-21'});repo.close();},completeCoach());
 await page.evaluate(async()=>{await navigator.serviceWorker.register('/sw.js');await navigator.serviceWorker.ready;});
 await page.close();return context;
}
async function home(context,base){
 const page=await context.newPage();await page.goto(base+'/pose.html');
 await page.waitForFunction(()=>window.myr5TestState?.phase==='idle'&&navigator.serviceWorker.controller&&window.myr5WorkoutOwner&&!window.myr5WorkoutOwner.snapshot().transitioning,null,{timeout:30000});
 return page;
}
// The scanline overlay and corner bolts are decoration (pointer-events:none / aria-hidden); this
// confirms they don't sit in front of a real control for hit-testing regardless.
async function hitTests(page,selector){
 await page.locator(selector).scrollIntoViewIfNeeded();
 return page.evaluate(sel=>{
  const el=document.querySelector(sel);if(!el)return false;
  const r=el.getBoundingClientRect(),top=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
  return !!top&&(top===el||el.contains(top));
 },selector);
}

test('SATCOM frame on Install: present, settles to DOWNLOAD LINK, keeps its own controls reachable, static under reduced motion',async()=>{
 await mkdir(FRAMES,{recursive:true});
 const server=await serve();let browser;
 try{
  browser=await launch();
  const normal=await installed(browser,server.base);
  const page=await home(normal,server.base);
  // Click and read the just-opened state in the SAME evaluate (not a separate round trip): under
  // load, a slow host can otherwise let the real 900ms acquire->lock timer fire between two
  // separate steps, making "opens in the acquiring state" flaky even though nothing is wrong
  // (same trick as tests/settings-frame.browser.test.mjs).
  const initial=await page.evaluate(()=>{
   document.querySelector('[data-panel="install"]').click();
   const panel=document.getElementById('installPanel');
   return {open:panel.open,frame:panel.classList.contains('satcom-frame'),bolts:panel.querySelectorAll('.satcom-bolt').length,link:panel.querySelector('.satcom-top [data-link]')?.textContent};
  });
  assert.equal(initial.open,true,'Install panel opens');
  assert.equal(initial.frame,true,'Install panel gets the frame');
  assert.equal(initial.bolts,4,'four corner bolts');
  assert.equal(initial.link,'ACQUIRING…','opens in the acquiring state');
  await page.waitForFunction(()=>document.querySelector('#installPanel .satcom-top')?.classList.contains('locked'),{timeout:5000});
  assert.equal(await page.locator('#installPanel .satcom-top [data-link]').textContent(),'DOWNLOAD LINK','settles to the Install/Downloads label');
  assert.match(await page.locator('#installPanel .satcom-bottom [data-build]').textContent(),/^BUILD /);
  const buildBox=await page.locator('#installPanel .satcom-bottom [data-build]').boundingBox();
  assert.ok(buildBox.y+buildBox.height<=812,'BUILD strip stays within the 812px viewport');
  // Install's own controls (not ours to change) stay visible and clickable through the frame.
  for(const selector of ['#installLink','#copyInstallLink','#downloadVoice'])assert.equal(await page.locator(selector).isVisible(),true,selector+' stays visible');
  assert.equal(await hitTests(page,'#copyInstallLink'),true,'Copy link stays hit-testable');
  await page.screenshot({path:resolve(FRAMES,'install-panel-375x812.png')});
  await normal.close();

  const reduced=await installed(browser,server.base,{reducedMotion:'reduce'});
  const rpage=await home(reduced,server.base);
  await rpage.evaluate(()=>document.querySelector('[data-panel="install"]').click());
  await rpage.waitForFunction(()=>document.getElementById('installPanel')?.open===true);
  assert.equal(await rpage.locator('#installPanel .satcom-top [data-link]').textContent(),'DOWNLOAD LINK','reduced motion skips straight to the locked label');
  assert.equal(await rpage.evaluate(()=>document.querySelector('#installPanel .satcom-top').classList.contains('locked')),true);
  await reduced.close();
 }finally{await browser?.close();await server.close();}
});

test('SATCOM frame on the Downloads menu: present at first open, Download selected / Not now stay visible and hit-testable',async()=>{
 await mkdir(FRAMES,{recursive:true});
 const server=await serve();let browser;
 try{
  browser=await launch();
  const context=await installed(browser,server.base);
  const page=await home(context,server.base);
  await page.waitForFunction(()=>document.getElementById('downloadsMenu')?.open&&document.querySelector('#downloadsMenu [data-group]'),null,{timeout:15000});
  assert.equal(await page.locator('#downloadsMenu').evaluate(el=>el.classList.contains('satcom-frame')),true,'the Downloads menu gets the frame');
  await page.waitForFunction(()=>document.querySelector('#downloadsMenu .satcom-top')?.classList.contains('locked'),{timeout:5000});
  assert.equal(await page.locator('#downloadsMenu .satcom-top [data-link]').textContent(),'DOWNLOAD LINK');
  const buildBox=await page.locator('#downloadsMenu .satcom-bottom [data-build]').boundingBox();
  assert.ok(buildBox.y+buildBox.height<=812,'BUILD strip stays within the 812px viewport');
  // Full screen, the frame sits on the glass's edges: the bolts keep off the corners and the strips' text keeps off the bolts.
  const edge=await page.evaluate(()=>{const box=s=>document.querySelector('#downloadsMenu '+s).getBoundingClientRect();return {clock:box('[data-clock]'),radar:box('.satcom-radar'),sat:box('.satcom-sat'),bars:box('.satcom-bars'),tl:box('.satcom-bolt-tl'),tr:box('.satcom-bolt-tr'),bl:box('.satcom-bolt-bl'),br:box('.satcom-bolt-br')};});
  for(const bolt of ['tl','tr','bl','br'])assert.ok(edge[bolt].left>=10&&edge[bolt].right<=365&&edge[bolt].top>=10&&edge[bolt].bottom<=802,bolt+' bolt keeps off the screen corner');
  assert.ok(edge.clock.left>=edge.bl.right&&edge.radar.right<=edge.br.left,'the clock strip clears the bottom bolts (its first digit was under the left one)');
  assert.ok(edge.sat.left>=edge.tl.right&&edge.bars.right<=edge.tr.left,'the SATCOM strip clears the top bolts');
  for(const selector of ['#downloadsMenu [data-download]','#downloadsMenu [data-later]']){
   assert.equal(await page.locator(selector).isVisible(),true,selector+' stays visible');
   assert.equal(await hitTests(page,selector),true,selector+' stays hit-testable');
  }
  await page.screenshot({path:resolve(FRAMES,'downloads-menu-first-open-375x812.png')});
  // The frame doesn't break the menu's own behaviour: Not now still closes it.
  await page.locator('#downloadsMenu [data-later]').click();
  assert.equal(await page.evaluate(()=>document.getElementById('downloadsMenu')?.open),false,'Not now still closes the menu');
 }finally{await browser?.close();await server.close();}
});
