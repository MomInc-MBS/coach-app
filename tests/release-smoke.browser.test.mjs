// #97: a release click-through before every deploy, run against a real `npm run build` at 375x812.
// Harness style copied from tests/portal-startup.browser.test.mjs (serves dist/client over plain
// HTTP, stubs /api/* signed-out, seeds an installed local coach via local-coach-runtime.mjs).
//
// Step 3 is the regression check for the 11773d3 hotfix ("dialogs opened over the quilt portal stay
// tappable"): it recreates the exact shape of the bug -- a <dialog> that already exists, closed, in
// the DOM before the quilt opens (like the old #fullDownloadOffer and the "Updated" toast did at boot),
// then showModal()s once the quilt is already up and has swept the page for inert. On 9658fbb that
// sweep blindly marked the still-closed dialog inert; by the time it opened modal it was both on top
// and untappable. 11773d3 exempts an open-or-closed <dialog> from the sweep. This test must fail on
// 9658fbb and pass on 11773d3 (both runs shown in the worker report).
import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {chromium} from 'playwright';
import {completeCoach} from './onboarding-fixture.mjs';

const TYPES={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.webp':'image/webp'};

function serve(){
 const root=resolve('dist/client');
 return createServer(async(req,res)=>{
  const path=new URL(req.url,'http://local').pathname;
  if(path.startsWith('/api/')){res.writeHead(path==='/api/auth/config'?200:401,{'Content-Type':'application/json'});res.end(JSON.stringify(path==='/api/auth/config'?{enabled:false}:{error:'Sign in'}));return;}
  try{const file=resolve(root,'.'+(path==='/'?'/pose.html':path));if(!file.startsWith(root+sep))throw Error();const body=await readFile(file);res.writeHead(200,{'Content-Type':TYPES[extname(file)]||'application/octet-stream'});res.end(body);}catch{res.writeHead(404);res.end();}
 });
}

// Installed (standalone), seeded with a completed setup, camera/network-free (reduced motion also
// collapses the quilt's cut/reveal animations to near-zero, so tracing many shapes stays fast).
async function installedContext(browser){
 const context=await browser.newContext({viewport:{width:375,height:812},serviceWorkers:'block',reducedMotion:'reduce'});
 await context.addInitScript(()=>Object.defineProperty(navigator,'standalone',{configurable:true,value:true}));
 return context;
}
async function seed(context,base){
 const page=await context.newPage();
 await page.goto(base+'/onboarding.html');
 await page.evaluate(async intake=>{const {openLocalCoach}=await import('/local-coach-runtime.mjs');const repo=await openLocalCoach();await repo.forOwner(repo.guestOwnerId).saveSetup(intake,{startDay:'2026-09-21'});repo.close();},completeCoach());
 await page.close();
}
async function openApp(browser,base){
 const context=await installedContext(browser);
 await seed(context,base);
 const page=await context.newPage();
 await page.goto(base+'/pose.html');
 await page.waitForFunction(()=>window.myr5TestState?.phase==='idle'&&window.myr5WorkoutOwner&&!window.myr5WorkoutOwner.snapshot().transitioning);
 await page.waitForFunction(()=>!!document.querySelector('.coach-dock'));
 return {context,page};
}
const portalUp=page=>page.waitForFunction(()=>document.getElementById('portalHome')?.hidden===false);
const centerHit=(page,selector)=>page.evaluate(sel=>{const el=document.querySelector(sel);if(!el)return false;const r=el.getBoundingClientRect();return document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)===el;},selector);

let server,base,browser;
test.before(async()=>{
 server=serve();
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 base='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-gl=angle','--use-angle=swiftshader']});
});
test.after(async()=>{await browser?.close();await new Promise(r=>server.close(r));});

test('1. the portal is up: window.myr5Menus.portal() mounts and shows the Quilt',async()=>{
 const {context,page}=await openApp(browser,base);
 try{
  const opened=await page.evaluate(()=>window.myr5Menus.portal());
  assert.equal(opened,true,'window.myr5Menus.portal() must resolve truthy once mounted and shown');
  await portalUp(page);
  assert.equal(await page.locator('#portalHome').getAttribute('aria-label'),'Quilt portal');
 }finally{await context.close();}
});

test('2. every gesture id reaches its documented destination, and the quilt returns after each dialog',{timeout:120000},async()=>{
 const {context,page}=await openApp(browser,base);
 try{
  await page.evaluate(()=>window.myr5Menus.portal());
  await portalUp(page);

  // id, the dialog it must open, the button that closes it.
  const DIALOG_CASES=[
   ['up','#mealsPanel','#mealsPanel [data-close]'],
   ['down','.ach-board','.ach-board .ach-close'],
   ['vdiamond','#accountPanel','#accountPanel [data-close]'],
   ['hdiamond','#accountPanel','#accountPanel [data-close]'], // same destination as vdiamond, hidden from the Menu sheet grid
   ['line-lr','.meditation-panel','.meditation-panel [data-meditation-close]'],
   ['line-rl','#remindersPanel','#remindersPanel [data-close]'],
   ['line-down','#settings','#closeSettings'],
   ['line-up','#portalMenu','#portalMenu [data-close]'],
   ['cross','#portalMenu','#portalMenu [data-close]'],
  ];
  for(const [id,dialogSel,closeSel] of DIALOG_CASES){
   await page.evaluate(()=>window.myr5Portal.show());
   await portalUp(page);
   await page.evaluate(id=>window.myr5Portal.open(id),id);
   await page.waitForFunction(sel=>document.querySelector(sel)?.open===true,dialogSel,{timeout:10000});
   await page.locator(closeSel).first().click();
   await page.waitForFunction(sel=>document.querySelector(sel)?.open!==true,dialogSel);
   await portalUp(page);
  }

  // rect: kind:'home' -> hides the quilt and presses BEGIN. Force manual mode first so BEGIN never
  // touches the camera or a network-fetched tracker model.
  await page.evaluate(()=>{document.getElementById('camera').value='manual';});
  await page.evaluate(()=>window.myr5Portal.show());
  await portalUp(page);
  await page.evaluate(()=>window.myr5Portal.open('rect'));
  await page.waitForFunction(()=>document.getElementById('portalHome')?.hidden===true);
  await page.waitForFunction(()=>window.myr5TestState?.phase!=='idle');
  assert.equal(await page.evaluate(()=>document.getElementById('start').disabled),true,'rect must press BEGIN');
  await page.evaluate(()=>document.getElementById('stop').click());
  await page.waitForFunction(()=>window.myr5TestState?.phase==='idle');

  // oval: kind:'home' -> hides the quilt and scrolls the workout picker (#controls) into view.
  await page.evaluate(()=>window.myr5Portal.show());
  await portalUp(page);
  await page.evaluate(()=>window.myr5Portal.open('oval'));
  await page.waitForFunction(()=>document.getElementById('portalHome')?.hidden===true);
  const controlsBox=await page.locator('#controls').boundingBox();
  assert.ok(controlsBox&&controlsBox.y<812&&controlsBox.y+controlsBox.height>0,'oval must bring the workout picker (#controls) into view');

  // x: kind:'nav' -> leaves the pod for the Character Editor. Fire-and-forget: the evaluate call's
  // own context is torn down mid-navigation, so it must not be awaited directly.
  await page.evaluate(()=>window.myr5Portal.show());
  await portalUp(page);
  void page.evaluate(()=>window.myr5Portal.open('x')).catch(()=>{});
  await page.waitForURL('**/creature/index.html*');
 }finally{await context.close();}
});

test('3. freeze check: a dialog opened over the quilt stays tappable, and the Menu button works again after it closes',async()=>{
 const {context,page}=await openApp(browser,base);
 try{
  // Stand-in for any boot-time <dialog> (the old #fullDownloadOffer, the setup gate, reward reveals):
  // appended straight to <body>, left CLOSED, before the quilt opens. The real Downloads menu (W2-2I)
  // never opens over the quilt at all; step 3b checks that.
  await page.evaluate(()=>{
   const d=document.createElement('dialog');
   d.id='fullDownloadOffer';
   d.innerHTML='<button type="button" autofocus>Download now</button><button type="button">Later</button>';
   document.body.append(d);
  });
  // The "Updated" toast is the real one: launch.mjs's initAppUpdates shows it automatically on a
  // fresh install (no release-seen key yet in this fresh browser context) -- also already in the
  // DOM, unopened as a dialog (it's a plain <aside>), before the quilt opens.
  await page.waitForFunction(()=>document.querySelector('.app-update-banner')?.hidden===false);

  await page.evaluate(()=>window.myr5Menus.portal());
  await portalUp(page);

  // Only now does the offer show modal -- exactly like the real one, which appears a moment after
  // the app (and by then, the quilt) is already up.
  await page.evaluate(()=>document.getElementById('fullDownloadOffer').showModal());
  assert.equal(await centerHit(page,'#fullDownloadOffer button'),true,"the offer's primary button must be tappable, not swallowed by the inert quilt background");

  await page.evaluate(()=>{document.getElementById('fullDownloadOffer').close();document.getElementById('fullDownloadOffer').remove();});
  assert.equal(await centerHit(page,'#portalMenuButton'),true,'the Menu button must be hit-testable again once the dialog closes');
 }finally{await context.close();}
});

test('3b. the Downloads menu is its own screen: the quilt steps aside while it is up and comes back tappable',async()=>{
 const {context,page}=await openApp(browser,base);
 try{
  await page.evaluate(()=>window.myr5Menus.portal());
  await portalUp(page);
  // From the quilt (another feature asking for a pack, e.g. the ship view).
  await page.evaluate(()=>window.myr5Packs.open());
  await page.waitForFunction(()=>document.getElementById('downloadsMenu')?.open===true);
  assert.equal(await page.evaluate(()=>document.getElementById('portalHome').hidden),true,'the quilt is not behind the menu');
  assert.equal(await centerHit(page,'#downloadsMenu [data-later]'),true,'the menu stays tappable');
  await page.locator('#downloadsMenu [data-later]').click();
  await portalUp(page);
  assert.equal(await centerHit(page,'#portalMenuButton'),true,'the Menu button works again');
  // From Settings, which the quilt opens with its line-down shape.
  await page.evaluate(()=>window.myr5Portal.open('line-down'));
  await page.waitForFunction(()=>document.getElementById('settings')?.open===true);
  await page.locator('#settings .downloads-entry button').click();
  await page.waitForFunction(()=>document.getElementById('downloadsMenu')?.open===true);
  assert.equal(await centerHit(page,'#downloadsMenu [data-later]'),true);
  await page.locator('#downloadsMenu [data-later]').click();
  await page.locator('#closeSettings').click();
  await portalUp(page);
  assert.equal(await centerHit(page,'#portalMenuButton'),true);
 }finally{await context.close();}
});

test('4. Menu sheet -> Ship opens the full-screen ship view, and the phone back button closes it',async()=>{
 const {context,page}=await openApp(browser,base);
 try{
  await page.evaluate(()=>window.myr5Menus.portal());
  await portalUp(page);
  await page.locator('#portalMenuButton').click();
  await page.waitForFunction(()=>document.getElementById('portalMenu')?.open===true);
  await page.locator('#portalMenu [data-menu="ship"]').click();
  await page.waitForFunction(()=>document.querySelector('dialog.ship-view')?.open===true);
  // ship-view.css loads via a dynamically-appended <link>; wait for it so the full-screen layout
  // (position:fixed;inset:0) is actually applied before measuring the box.
  await page.waitForFunction(()=>getComputedStyle(document.querySelector('dialog.ship-view')).position==='fixed');
  const box=await page.locator('dialog.ship-view').boundingBox();
  assert.ok(box&&box.width>=370&&box.height>=800,'the ship view must fill the screen');
  assert.equal(await page.evaluate(()=>location.hash),'#ship');
  await page.goBack();
  await page.waitForFunction(()=>!document.querySelector('dialog.ship-view')?.open);
 }finally{await context.close();}
});
