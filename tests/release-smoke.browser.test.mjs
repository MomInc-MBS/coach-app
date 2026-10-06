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
import {readFile,mkdir} from 'node:fs/promises';
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
// `overrides` lets #5 opt back into real motion to exercise the glass/tunnel/dive path.
async function installedContext(browser,overrides={}){
 const context=await browser.newContext({viewport:{width:375,height:812},serviceWorkers:'block',reducedMotion:'reduce',...overrides});
 await context.addInitScript(()=>Object.defineProperty(navigator,'standalone',{configurable:true,value:true}));
 // The once-a-day How to Play popup is covered by its own checks; these frames start from a day it was already seen.
 await context.addInitScript((()=>{const get=Storage.prototype.getItem,d=new Date(),day=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;Storage.prototype.getItem=function(key){return String(key).startsWith('myr5-how-to-play-day-v1/')?day:get.call(this,key);};}));
 return context;
}
async function seed(context,base){
 const page=await context.newPage();
 await page.goto(base+'/onboarding.html');
 await page.evaluate(async intake=>{const {openLocalCoach}=await import('/local-coach-runtime.mjs');const repo=await openLocalCoach();await repo.forOwner(repo.guestOwnerId).saveSetup(intake,{startDay:'2026-09-21'});repo.close();},completeCoach());
 await page.close();
}
async function openApp(browser,base,overrides){
 const context=await installedContext(browser,overrides);
 await seed(context,base);
 const page=await context.newPage();
 await page.goto(base+'/pose.html');
 await page.waitForFunction(()=>window.myr5TestState?.phase==='idle'&&window.myr5WorkoutOwner&&!window.myr5WorkoutOwner.snapshot().transitioning);
 await page.waitForFunction(()=>!!document.querySelector('.coach-dock'));
 return {context,page};
}
const portalUp=page=>page.waitForFunction(()=>document.getElementById('portalHome')?.hidden===false);
const portalSettled=page=>page.waitForFunction(()=>window.myr5Routes?.current?.()===''&&location.hash===''&&!document.querySelector('.portal-glass')&&!document.getElementById('portalChrome')?.matches(':popover-open'));
// W2-2A: the bottom bar's centre Portal button replaced the quilt's floating Menu button.
const PORTAL_BUTTON='#coachDock [data-route="portal"]';
// The tactile dock: six physical keys (no Menu key), each named for assistive tech; the centre one is the raised Portal.
// R7-DOCKREM (Ian 26 Sep): the far-left key still looks like the gear (see the release-smoke DOCK_KEYS
// test below), but now opens the coach customizer, not Settings; Settings stays reachable via the pod
// ☷ button, #settings and the line-down gesture (step 3 above).
const DOCK_KEYS=[['customizeCoach','Customize coach'],['food','Food'],['portal','Open workout pod'],['scoreboard','Classroom leaderboard'],['achievements','Achievements'],['reminders','Reminders computer']];
// W2-2M: BEGIN on the workout start page is above the bar and is what a tap there hits, without scrolling.
const beginClear=page=>page.evaluate(()=>{const b=document.getElementById('start').getBoundingClientRect(),bar=document.getElementById('coachDock').getBoundingClientRect();return {above:b.height>0&&b.top>=0&&b.bottom<=bar.top,hit:document.elementFromPoint(b.left+b.width/2,b.top+b.height/2)?.closest('#start')!==null};});
const centerHit=(page,selector)=>page.evaluate(sel=>{const el=document.querySelector(sel);if(!el)return false;const r=el.getBoundingClientRect();const hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return !!hit&&el.contains(hit);},selector); // a key's own icon/label span is part of the key

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
  assert.equal(await page.locator('#coachDock').getAttribute('aria-label'),'Coach tools');
  assertDockKeys(await dockKeys(page),'quilt');
  assert.equal(await page.locator('#coachDock [aria-label="Menu"]').count(),0,'there is no Menu button in the dock');
 }finally{await context.close();}
});

test('1b. the far-left dock key keeps its gear icon but opens the coach customizer, not Settings',async()=>{
 const {context,page}=await openApp(browser,base);
 try{
  const gear=await page.evaluate(()=>{
   const btn=document.querySelector('#coachDock .dock-settings');
   return {route:btn.dataset.route,label:btn.getAttribute('aria-label'),circles:btn.querySelectorAll('svg circle').length,spokes:btn.querySelector('svg path')?.getAttribute('d')||''};
  });
  assert.equal(gear.route,'customizeCoach','the left key routes to the customizer, not settings');
  assert.equal(gear.label,'Customize coach');
  assert.equal(gear.circles,2,'the gear icon (two circles) is unchanged');
  assert.match(gear.spokes,/M12 2v3M12 19v3M2 12h3M19 12h3/,'the gear icon (spokes path) is unchanged');
  // Stub the destination: the real editor consumes myr5-ship-gate as soon as it loads (#148), so
  // check the token this lane's route sets before that page's own script can clear it.
  await page.route('**/creature/index.html',route=>route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><title>customizer stub</title>'}));
  await page.locator('#coachDock .dock-settings').click();
  await page.waitForURL(url=>url.pathname==='/creature/index.html');
  assert.equal(await page.evaluate(()=>sessionStorage.getItem('myr5-ship-gate')),'ship-admission-v2','the customizer gets the same admission token the oval ship sets');
 }finally{await context.close();}
});

test('2. every gesture id reaches its documented destination, and the quilt returns after each dialog',{timeout:120000},async()=>{
 const {context,page}=await openApp(browser,base);
 try{
  await page.evaluate(()=>window.myr5Menus.portal());
  await portalUp(page);

  // id, the dialog it must open, the button that closes it (none: Escape). #131: the triangles and diamonds open in their
  // cut with the quilt as the wall round them; R7 (Ian 29 Sept): seen through it they show no Close, and Escape leaves.
  const DIALOG_CASES=[
   ['up','#mealsPanel',null],
   ['down','.ach-board',null],
   ['vdiamond','#accountPanel',null],
   ['hdiamond','#spotifyPanel',null], // R25: Spotify DJ, in the sideways diamond's cut
   ['line-lr','.meditation-panel','.meditation-panel [data-meditation-close]'],
   ['line-rl','#remindersPanel','#remindersPanel [data-close]'],
   ['line-down','#settings','#closeSettings'],
  ];
  for(const [id,dialogSel,closeSel] of DIALOG_CASES){
   await page.evaluate(()=>window.myr5Portal.show());
   await portalUp(page);
   await page.evaluate(id=>window.myr5Portal.open(id),id);
   await page.waitForFunction(sel=>document.querySelector(sel)?.open===true,dialogSel,{timeout:10000});
   if(closeSel)await page.locator(closeSel).first().click();else await page.keyboard.press('Escape');
   await page.waitForFunction(sel=>document.querySelector(sel)?.open!==true,dialogSel);
   await portalUp(page);
   await portalSettled(page);
  }

  // The Menu sheet is gone: its two gestures (line-up, cross) open nothing and the quilt stays up, untouched.
  for(const id of ['line-up','cross']){
   await page.evaluate(()=>window.myr5Portal.show());
   await portalUp(page);
   await page.evaluate(id=>window.myr5Portal.open(id),id);
   await page.waitForTimeout(300);
   assert.deepEqual(await page.evaluate(()=>({menu:document.getElementById('portalMenu')?.open===true,dialogs:document.querySelectorAll('dialog[open]').length,quilt:document.getElementById('portalHome').hidden===false,glass:!!document.querySelector('.portal-glass')})),{menu:false,dialogs:0,quilt:true,glass:false},`${id} opens no Menu sheet and leaves the quilt alone`);
  }

  // rect (Ian 2026-09-23): the workout start page -- hides the quilt and shows the pod from the top (viewing port,
  // control board, BEGIN). BEGIN is not pressed for you any more.
  await page.evaluate(()=>{scrollTo(0,400);});
  await page.evaluate(()=>window.myr5Portal.show());
  await portalUp(page);
  await page.evaluate(()=>window.myr5Portal.open('rect'));
  await page.waitForFunction(()=>document.getElementById('portalHome')?.hidden===true&&location.hash==='#workout');
  await page.waitForFunction(()=>scrollY===0);
  assert.equal(await page.evaluate(()=>window.myr5TestState.phase),'idle','rect must not start the workout');
  assert.deepEqual(await beginClear(page),{above:true,hit:true},'BEGIN is on the start page, above the bar, without scrolling');

  // oval (Ian 2026-09-23): the coach's arrival -- the ship view opens (its entrance plays every time), and the
  // quilt comes back when it closes.
  await page.evaluate(()=>window.myr5Portal.show());
  await portalUp(page);
  await page.evaluate(()=>window.myr5Portal.open('oval'));
  await page.waitForFunction(()=>document.querySelector('dialog.ship-view')?.open===true&&location.hash==='#select',{timeout:10000});
  await page.keyboard.press('Escape'); // #131: seen through the oval cut; R7: it shows no Close there
  await page.waitForFunction(()=>!document.querySelector('dialog.ship-view').open&&location.hash!=='#select');
  await portalUp(page);
  // Lane 2N: the coach capsule the ship view woke stops drawing under the quilt once it closes.
  assert.equal(await page.evaluate(()=>window.myr5Creature?.stats().awake),false,'the coach capsule sleeps after the ship view closes');

  // The War Room is public: X takes an installed-app guest straight in, with no second Coach Army entitlement.
  await page.evaluate(()=>window.myr5Portal.show());
  await portalUp(page);
  await page.evaluate(()=>window.myr5Portal.open('x'));
  await page.waitForURL(url=>url.pathname==='/war-room/index.html'&&!url.searchParams.has('optional'),{timeout:15000});
  await page.locator('h1#characterBayTitle').waitFor();
  assert.equal(await page.evaluate(()=>document.body.textContent.includes('Finish Coach setup')),false,'no Coach setup lock on the War Room');
 }finally{await context.close();}
});

test('3. freeze check: a dialog opened over the quilt stays tappable, and the dock Portal key works again after it closes',async()=>{
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
  assert.equal(await centerHit(page,PORTAL_BUTTON),true,'the dock Portal key must be hit-testable again once the dialog closes');
  assertDockKeys(await dockKeys(page),'after the dialog closes');
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
  assert.equal(await centerHit(page,PORTAL_BUTTON),true,'the dock Portal key works again');
  // From Settings, which the quilt opens with its line-down shape.
  await page.evaluate(()=>window.myr5Portal.open('line-down'));
  await page.waitForFunction(()=>document.getElementById('settings')?.open===true);
  await page.locator('#settings .downloads-entry button').click();
  await page.waitForFunction(()=>document.getElementById('downloadsMenu')?.open===true);
  assert.equal(await centerHit(page,'#downloadsMenu [data-later]'),true);
  await page.locator('#downloadsMenu [data-later]').click();
  await page.locator('#closeSettings').click();
  await portalUp(page);
  assert.equal(await centerHit(page,PORTAL_BUTTON),true);
 }finally{await context.close();}
});

test('4. the oval opens the ship view inside the metal frame above the dock, and the phone back button closes it',async()=>{
 const {context,page}=await openApp(browser,base);
 try{
  await page.evaluate(()=>window.myr5Menus.portal());
  await portalUp(page);
  await page.evaluate(()=>window.myr5Portal.open('oval')); // the Menu sheet's Ship row is gone; the oval is the gesture way in
  await page.waitForFunction(()=>document.querySelector('dialog.ship-view')?.open===true&&location.hash==='#select',null,{timeout:10000});
  // ship-view.css loads via a dynamically-appended <link>; wait for it before measuring the box.
  await page.waitForFunction(()=>getComputedStyle(document.querySelector('dialog.ship-view')).position==='fixed');
  // W2-2K (Ian 23 Sept): the metal frame stays on screen and the ship view fills its window, not the whole screen.
  const box=await page.locator('dialog.ship-view').boundingBox();
  assert.ok(box&&box.width>=330&&box.height>=530&&box.x>=10&&375-box.x-box.width>=10,`the ship view must fill the frame's window: ${JSON.stringify(box)}`);
  // Re-stacked above the just-opened dialog one frame later (portal.mjs frameDialog: WebKit keeps a same-task re-show under the backdrop).
  await page.waitForFunction(()=>document.querySelector('dialog.ship-view')?.classList.contains('portal-framed')&&document.getElementById('portalChrome')?.getBoundingClientRect().width>0,null,{timeout:5000}).catch(()=>assert.fail('the visible metal frame stays around the ship view'));
  // Release 5: the bottom bar (W2-2A) stays visible and tappable below the frame, never inside its window.
  const barState=await bar(page),barTop=(await page.locator('#coachDock').boundingBox()).y;
  assert.equal(barState.visible&&barState.tappable,true,'the bar shows and takes taps under the framed ship view');
  assert.ok(box.y+box.height<=barTop,`the frame's window ends above the bar (${box.y+box.height} vs ${barTop})`);
  await page.goBack();
  await page.waitForFunction(()=>!document.querySelector('dialog.ship-view')?.open&&location.hash!=='#select');
  await portalUp(page);
 }finally{await context.close();}
});

test('5. one shape without reduced motion runs the real glass and dive, and the quilt returns clean',async()=>{
 const {context,page}=await openApp(browser,base,{reducedMotion:'no-preference'});
 try{
  await page.evaluate(()=>window.myr5Menus.portal());
  await portalUp(page);
  // line-down -> Settings: a real-motion run of #101/#103's glass, tunnel and dive (#124: a line's short one, through
  // its lens; the closed shapes that aren't full screen open in their cut instead, test 8).
  await page.evaluate(()=>{window.myr5SmokeSeq=window.myr5Portal.open('line-down');});
  await page.waitForFunction(()=>!!document.querySelector('.portal-glass.gl canvas'),{timeout:5000});
  await page.waitForFunction(()=>document.getElementById('settings')?.open===true,{timeout:15000});
  const midTransform=await page.evaluate(()=>getComputedStyle(document.getElementById('portalHome')).transform);
  assert.notEqual(midTransform,'none','the dive must actually scale the portal, not skip straight to the destination');
  await page.evaluate(()=>window.myr5SmokeSeq);
  await page.locator('#closeSettings').click();
  // Closing fires the dialog's native 'close' event asynchronously; poll for the settled state
  // (bounded) rather than snapshotting immediately, or this legitimately races the event.
  await page.waitForFunction(()=>!document.getElementById('settings').open&&!document.getElementById('portalChrome').matches(':popover-open')&&getComputedStyle(document.getElementById('portalHome')).transform==='none'&&!document.querySelector('.portal-glass'),null,{timeout:15000});
  assert.equal(await page.evaluate(()=>document.getElementById('portalHome').hidden),false,'the quilt is back, not left hidden');
 }finally{await context.close();}
});

// W2-2A (#4, #5, #17, #30): every scene has a #route; the one bottom bar shows on each, lit for its own item, and is
// tappable inside the route's dialog; phone back closes the route. [route, what shows, bar item lit (or null)].
const bar=page=>page.evaluate(()=>{
 const dock=document.getElementById('coachDock'),r=dock?.getBoundingClientRect(),style=dock&&getComputedStyle(dock);
 const food=dock?.querySelector('[data-route="food"]'),fr=food?.getBoundingClientRect();
 const face=dock?.closest('dialog.portal-framed.portal-fullscreen')?.getBoundingClientRect();
 // R20 (Ian 2 Oct): the dock is a fixed console below the metal frame on every page: bottom-anchored, full width,
 // 88px (64px on landscape phones), and a full-screen page's face ends above it, never around it.
 return {visible:!!r&&style.display!=='none'&&style.visibility!=='hidden'&&r.height>=60&&Math.abs(r.bottom-innerHeight)<1&&Math.abs(r.left)<1&&Math.abs(r.right-innerWidth)<1&&(!face||r.top>=face.bottom-1),
  tappable:!!fr&&food.contains(document.elementFromPoint(fr.left+fr.width/2,fr.top+fr.height/2)),
  lit:[...dock.querySelectorAll('[aria-current="page"]')].map(b=>b.dataset.route),live:dock.querySelector('.dock-live')?.textContent||''};
});
// Every dock key: named, in order, a real 44px+ target (the Portal 56px+) whose centre lands on itself (or its own icon).
const dockKeys=page=>page.evaluate(()=>[...document.querySelectorAll('#coachDock [data-route]')].map(b=>{const r=b.getBoundingClientRect(),hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return {route:b.dataset.route,name:b.getAttribute('aria-label'),w:Math.round(r.width),h:Math.round(r.height),hit:!!hit&&b.contains(hit)};}));
function assertDockKeys(keys,where){
 assert.deepEqual(keys.map(k=>[k.route,k.name]),DOCK_KEYS,`${where}: the dock has exactly these named keys, no Menu key`);
 for(const k of keys){
  assert.equal(k.hit,true,`${where}: ${k.route} takes a tap at its centre`);
  const min=k.route==='portal'?56:44;
  assert.ok(k.w>=min&&k.h>=min,`${where}: ${k.route} is a physical target of at least ${min}px (${k.w}x${k.h})`);
 }
}
const DIALOG_ROUTES=[
 ['food','#mealsPanel','food'],['reminders','#remindersPanel','reminders'],['scoreboard','#accountPanel','scoreboard'],
 // R7-DOCKREM: no dock key routes to Settings any more (the far-left key opens the customizer instead), so
 // #settings lights nothing, like history/install/meditate/ship/select below.
 ['history','#historyPanel',null],['install','#installPanel',null],['settings','#settings',null],
 ['achievements','.ach-board','achievements'],['meditate','.meditation-panel',null],
 ['ship','dialog.ship-view',null],['select','dialog.ship-view',null],
];
test('6. every route opens from its #hash with the bar visible, lit and tappable, and phone back closes it',{timeout:180000},async()=>{
 const {context,page}=await openApp(browser,base);
 try{
  for(const [route,dialogSel,lit] of DIALOG_ROUTES){
   await page.evaluate(route=>{location.hash=route;},route);
   await page.waitForFunction(sel=>document.querySelector(sel)?.open===true,dialogSel,{timeout:10000}).catch(error=>{throw new Error(`#${route}: dialog did not open (${dialogSel})`,{cause:error});});
   await page.waitForFunction(route=>window.myr5Routes.current()===route,route);
   const state=await bar(page);
   assert.equal(state.visible,true,`#${route}: the bar sits at the bottom, visible`);
   assert.equal(state.tappable,true,`#${route}: the bar is tappable over its dialog`);
   assert.deepEqual(state.lit,lit?[lit]:[],`#${route}: the bar lights its own item only`);
   const heading=await page.evaluate(sel=>{const h=document.activeElement;return /^H[12]$/.test(h?.tagName)&&document.querySelector(sel).contains(h);},dialogSel);
   if(!['ship','select'].includes(route))assert.equal(heading,true,`#${route}: focus moves to the route's heading`);
   if(dialogSel)await page.evaluate(sel=>{
    const dialog=document.querySelector(sel);
    window.__routeNativeClose=new Promise(resolve=>dialog.addEventListener('close',()=>resolve({open:dialog.open}),{once:true,capture:true}));
   },dialogSel);
   await page.goBack();
   const settled=[page.waitForFunction(sel=>document.querySelector(sel)?.open!==true,dialogSel),page.waitForFunction(route=>location.hash!=='#'+route&&window.myr5Routes.current()==='',route)];
   if(dialogSel)settled.push(page.evaluate(()=>window.__routeNativeClose).then(event=>assert.equal(event.open,false,`#${route}: the registered native close event is delivered before the next route`)));
   await Promise.all(settled);
  }
  // #share was removed with the Menu: the hash is not a route, opens nothing and adopts no dialog.
  await page.evaluate(()=>{location.hash='share';});
  await page.waitForTimeout(300);
  assert.deepEqual(await page.evaluate(()=>({route:window.myr5Routes.current(),open:document.querySelectorAll('dialog[open]').length,menu:document.getElementById('portalMenu')?.open===true})),{route:'',open:0,menu:false},'#share opens nothing');
  await page.goBack();await page.waitForFunction(()=>location.hash==='');
  // No-dialog scenes: the workout start page (BEGIN not pressed) and the pod.
  await page.evaluate(()=>{scrollTo(0,400);location.hash='workout';});
  await page.waitForFunction(()=>window.myr5Routes.current()==='workout'&&scrollY===0);
  assert.equal(await page.evaluate(()=>window.myr5TestState.phase),'idle');
  assert.equal((await bar(page)).visible,true);
  await page.goBack();await page.waitForFunction(()=>window.myr5Routes.current()===''&&location.hash==='');
  await page.evaluate(()=>{location.hash='pod';});
  await page.waitForFunction(()=>window.myr5Routes.current()==='pod'&&document.getElementById('portalHome')?.hidden!==false);
  await page.goBack();await page.waitForFunction(()=>window.myr5Routes.current()==='');
  // The War Room route is public: a guest hash route enters it directly, with no lock message or bounce.
  await page.evaluate(()=>{location.hash='war-room';});
  await page.waitForURL(url=>url.pathname==='/war-room/index.html'&&!url.searchParams.has('optional'),{timeout:15000});
  await page.locator('h1#characterBayTitle').waitFor();
  await page.goBack();
  await page.waitForURL(url=>url.pathname==='/pose.html',{timeout:15000});
  await page.waitForFunction(()=>window.myr5Routes.current()==='');
  await portalSettled(page);
  await page.waitForTimeout(300); // let any earlier back traversal finish before testing a new hash navigation
  // D24: nothing over the camera view (and no bar during a set).
  for(const flag of ['cameraWorkout','tracking']){
   const hidden=await page.evaluate(flag=>{document.body.dataset[flag]='true';const d=getComputedStyle(document.getElementById('coachDock')).display;delete document.body.dataset[flag];return d==='none';},flag);
   assert.equal(hidden,true,`the bar is hidden while body[data-${flag}] is set`);
  }
  // A guest deep-link to the 3D customizer enters the public War Room too, not a Coach Army bounce.
  await page.evaluate(()=>{location.hash='customize';});
  await page.waitForURL(url=>url.pathname==='/war-room/index.html'&&!url.searchParams.has('optional'),{timeout:15000});
  await page.locator('h1#characterBayTitle').waitFor();
 }finally{await context.close();}
});

test('7. a traced route sets its hash; back returns to the quilt, the bar Portal goes home, and back on the quilt stays in the app',async()=>{
 const {context,page}=await openApp(browser,base);
 try{
  await page.evaluate(()=>window.myr5Menus.portal());
  await portalUp(page);
  assert.deepEqual((await bar(page)).lit,['portal'],'the quilt lights the Portal');
  await page.locator(PORTAL_BUTTON).focus();await page.keyboard.press('Tab'); // a real key arms the back guard, as a first tap does
  await page.evaluate(()=>window.myr5Portal.open('line-rl'));
  await page.waitForFunction(()=>document.getElementById('remindersPanel')?.open===true&&location.hash==='#reminders');
  const state=await bar(page);
  assert.deepEqual(state.lit,['reminders']);
  await page.waitForFunction(()=>document.querySelector('#coachDock .dock-live')?.textContent==='Reminders'); // a polite live region names the route
  // Switching routes from the bar replaces the entry: one back still lands on the quilt.
  await page.locator('#coachDock [data-route="food"]').click();
  await page.waitForFunction(()=>document.getElementById('mealsPanel')?.open===true&&location.hash==='#food'&&!document.getElementById('remindersPanel').open);
  await page.goBack();
  await page.waitForFunction(()=>!document.getElementById('mealsPanel').open&&location.hash==='');
  await portalUp(page);
  await page.goBack();await page.waitForTimeout(300);
  assert.equal(new URL(page.url()).pathname,'/pose.html','back on the quilt stays in the app');
  await portalUp(page);
  await page.waitForFunction(()=>document.querySelector('#coachDock .dock-live')?.textContent==='Press back again to leave Coach'); // also shown for 3s as a pill over the bar
  // Off the quilt, the Portal button goes home.
  await page.evaluate(()=>{location.hash='scoreboard';});
  await page.waitForFunction(()=>document.getElementById('accountPanel')?.open===true);
  await page.locator(PORTAL_BUTTON).click();
  await page.waitForFunction(()=>!document.getElementById('accountPanel').open&&location.hash==='');
  await portalUp(page);
  // On the quilt the large center key returns to the workout pod; a second press returns to the grimoire.
  await page.locator(PORTAL_BUTTON).click();
  await page.waitForFunction(()=>document.getElementById('portalHome')?.hidden===true);
  await page.locator(PORTAL_BUTTON).click();
  await portalUp(page);
 }finally{await context.close();}
});

// Release 5 (W2-2A + W2-2B + W2-2K + W3-3A together): a traced destination opens INSIDE the metal frame with the bottom
// bar below it, visible, lit and tappable (never in the frame's window, never under its matte); W2-2N #131: Food (the
// pyramid) and the oval's ship view are seen through their cut in the quilt and fizzle shut; a line (Reminders) dives
// into the frame and reverse-dives out of the wormhole; the square is the workout start page. Frames for the conductor land in .frames/ (untracked). Waits are generous: `npm test` runs the
// browser files in parallel, and a starved swiftshader page can take seconds per animation.
const FRAMES=resolve('.frames');
const frameBar=page=>page.evaluate(()=>{
 const dock=document.getElementById('coachDock'),chrome=document.getElementById('portalChrome'),open=chrome.matches(':popover-open');
 const framed=document.querySelector('dialog.portal-framed[open]'),face=Object.fromEntries(['left','top','width','height'].map(k=>[k,parseFloat(chrome.style.getPropertyValue('--face-'+k))]));
 const rail=parseFloat(getComputedStyle(chrome).getPropertyValue('--portal-rail')),box=el=>{const r=el.getBoundingClientRect();return {left:r.left,top:r.top,width:r.width,height:r.height};};
 return {barTop:dock.getBoundingClientRect().top,chrome:open,chromeBottom:open?chrome.getBoundingClientRect().bottom:null,frameBottom:face.top+face.height+rail,face,
  backdropBottom:framed?parseFloat(getComputedStyle(framed,'::backdrop').bottom):null,box:framed?box(framed):null};
});
function assertBarBelowFrame(f,where){
 assert.equal(f.chrome,true,`${where}: the frame stays up`);
 assert.ok(f.frameBottom<=f.barTop+.5,`${where}: the frame ends above the bar (${f.frameBottom} vs ${f.barTop})`);
 // The retracting mechanical plate occupies the full top-layer viewport; the visible frame rail ends above the dock.
}
test('8. traced destinations open in the frame with the bar lit below it, Food and the oval in their cut, a line dives in and out',{timeout:240000},async()=>{
 const {context,page}=await openApp(browser,base,{reducedMotion:'no-preference'});
 try{
  await mkdir(FRAMES,{recursive:true});
  await page.evaluate(()=>{
   try{localStorage.setItem('myr5.portalHintShown','1');}catch{} // a clean quilt: the first-run hint has its own test
   // Hold each reverse dive (the portal flying back out) so a frame can be taken half way; count them.
   const animate=Element.prototype.animate;window.__backs=[];
   Element.prototype.animate=function(frames,timing){const a=animate.call(this,frames,timing);if(this.id==='portalHome'&&timing?.direction==='reverse'){a.pause();window.__backs.push(a);}return a;};
  });
  await page.evaluate(()=>window.myr5Menus.portal());
  await portalUp(page);
  await page.evaluate(()=>document.querySelector('.app-update-banner [data-later]')?.click()); // the update toast is not part of these frames
  await page.waitForTimeout(2800); // one lap of the first-run hint, if it started before the flag was set
  // The quilt in its frame, the bar below it with the Portal lit.
  const quilt=await page.evaluate(()=>{const frame=document.querySelector('#portalBoardHost .portal-frame'),f=frame.getBoundingClientRect(),rail=parseFloat(getComputedStyle(frame).getPropertyValue('--portal-rail'));return {frameBottom:f.bottom+rail,barTop:document.getElementById('coachDock').getBoundingClientRect().top};});
  assert.ok(quilt.frameBottom<=quilt.barTop,`the quilt's frame clears the bar (${quilt.frameBottom} vs ${quilt.barTop})`);
  let b=await bar(page);
  assert.deepEqual(b.lit,['portal']);assert.equal(b.visible&&b.tappable,true,'the bar is up and tappable on the quilt');
  // Armie's inbox button: hidden and inert while this player owns no letter -- no greyed, half-loaded button.
  await page.waitForFunction(()=>!!document.querySelector('.armie-inbox-launcher'));
  const armie=await page.evaluate(()=>{const el=document.querySelector('.armie-inbox-launcher');return {hidden:el.hidden,inert:el.inert,boxes:el.getClientRects().length};});
  assert.deepEqual(armie,{hidden:true,inert:true,boxes:0},"Armie's button stays hidden until a letter arrives");
  await page.screenshot({path:resolve(FRAMES,'r5-1-quilt-frame-bar.png')});

  // Triangle -> Food (#131): the pyramid opens in the triangle's cut, the quilt staying on as the wall round it, the
  // dialog still fitted to the frame's window (clipped to the cut), the bar below it lit for Food and tappable.
  await page.evaluate(()=>{window.r5Run=window.myr5Portal.open('up');});
  await page.waitForFunction(()=>{const m=document.getElementById('mealsPanel');return m.open&&m.classList.contains('portal-shaped')&&!document.getElementById('portalHome').hidden;},null,{timeout:20000});
  await page.evaluate(()=>window.r5Run);
  await page.waitForFunction(()=>document.getElementById('coachDock').parentElement?.id==='mealsPanel',null,{timeout:5000});
  await page.waitForFunction(()=>document.querySelector('#mealsPanel.pyramid-mode #pyramidScanner canvas')&&!document.querySelector('#pyramidScanner[data-loading]'),null,{timeout:20000});
  await page.waitForTimeout(600);
  let f=await frameBar(page);
  assertBarBelowFrame(f,'Food');
  for(const k of ['left','top','width','height'])assert.ok(Math.abs(f.box[k]-f.face[k])<1,`Food fits the frame's window (${k}: ${f.box[k]} vs ${f.face[k]})`);
  assert.match(await page.evaluate(()=>document.getElementById('mealsPanel').style.clipPath),/^path\(/,'Food is seen through the cut');
  b=await bar(page);
  assert.deepEqual(b.lit,['food'],'the bar lights Food');assert.equal(b.visible&&b.tappable,true,'the bar is up and tappable under Food in its cut');
  assert.equal(await page.evaluate(()=>location.hash),'#food');
  await page.screenshot({path:resolve(FRAMES,'r5-2-food-in-cut-bar.png')});
  // The lens's full-screen photo flow keeps the frame's window box (the portal's step-in opens the cut to all of it).
  const stage=await page.evaluate(()=>{const s=document.getElementById('mealScanStage');s.hidden=false;const r=s.getBoundingClientRect();s.hidden=true;return {left:r.left,top:r.top,width:r.width,height:r.height};});
  for(const k of ['left','top','width','height'])assert.ok(Math.abs(stage[k]-f.face[k])<1,`the photo flow fits the frame's window (${k}: ${stage[k]} vs ${f.face[k]})`);

  // Close: the hole fizzles shut (no reverse dive) and heals. The bar stays showing below the frame throughout.
  await page.keyboard.press('Escape'); // R7: seen through its cut, Food shows no Close
  await page.waitForFunction(()=>document.querySelector('.portal-ghost')&&document.querySelector('.portal-glass'),null,{timeout:20000,polling:16});
  f=await frameBar(page);assertBarBelowFrame(f,'fizzle');
  assert.equal((await bar(page)).visible,true,'the bar shows through the fizzle');
  await page.screenshot({path:resolve(FRAMES,'r5-4-food-fizzle.png')});
  await page.waitForFunction(()=>!document.querySelector('.portal-glass')&&!document.getElementById('portalChrome').matches(':popover-open')&&!document.getElementById('portalHome').hidden,null,{timeout:20000});
  await page.waitForFunction(()=>location.hash==='');
  assert.deepEqual((await bar(page)).lit,['portal'],'back on the quilt, the Portal is lit again');
  assert.equal(await page.evaluate(()=>window.__backs.length),0,'Food never reverse-dives');

  // Oval -> the coach's arrival: the ship view opens in the oval's cut inside the frame (#select) and its entrance plays.
  await page.evaluate(()=>{window.r5Run=window.myr5Portal.open('oval');});
  await page.waitForFunction(()=>{const d=document.querySelector('dialog.ship-view');return d?.open&&d.classList.contains('portal-shaped')&&location.hash==='#select';},null,{timeout:20000});
  await page.waitForFunction(()=>document.querySelector('dialog.ship-view .ship-scene-beam.is-charging'),null,{timeout:20000});
  await page.waitForTimeout(500);
  f=await frameBar(page);assertBarBelowFrame(f,'ship view');
  for(const k of ['left','top','width','height'])assert.ok(Math.abs(f.box[k]-f.face[k])<1,`the ship view fits the frame's window (${k})`);
  assert.equal((await bar(page)).tappable,true,'the bar is tappable under the ship view');
  await page.screenshot({path:resolve(FRAMES,'r5-3-ship-from-oval-mid-entrance.png')});
  await page.evaluate(()=>window.r5Run);
  await page.keyboard.press('Escape'); // R7: seen through its cut, the ship view shows no Close
  await page.waitForFunction(()=>!document.querySelector('.portal-glass')&&document.getElementById('portalHome').hidden===false&&!document.querySelector('dialog.ship-view').open&&location.hash!=='#select'&&!document.getElementById('portalChrome').matches(':popover-open'),null,{timeout:20000});

  // A line (Reminders) dives into the frame (#124's short wormhole); the bar's Portal takes it home the same way, out of it.
  await page.evaluate(()=>window.myr5Portal.open('line-rl'));
  await page.waitForFunction(()=>{const d=document.getElementById('remindersPanel');return d.open&&d.classList.contains('portal-framed')&&!d.classList.contains('portal-arriving')&&location.hash==='#reminders';},null,{timeout:20000}); // W2-2N #124: a line dives in now
  f=await frameBar(page);assertBarBelowFrame(f,'Reminders');
  assert.deepEqual((await bar(page)).lit,['reminders']);
  await page.locator(PORTAL_BUTTON).click();
  await page.waitForFunction(()=>window.__backs.length===1,null,{timeout:20000});
  await page.evaluate(()=>{window.__backs[0].play();return window.__backs[0].finished;});
  await page.waitForFunction(()=>!document.querySelector('.portal-glass')&&document.getElementById('portalHome').hidden===false&&!document.getElementById('remindersPanel').open&&location.hash===''&&!document.getElementById('portalChrome').matches(':popover-open'),null,{timeout:20000});
  assert.deepEqual((await bar(page)).lit,['portal']);

  // Square -> the workout start page: the pod from the top, BEGIN not pressed, the bar still there.
  await page.evaluate(()=>{scrollTo(0,400);window.r5Run=window.myr5Portal.open('rect');});
  await page.waitForFunction(()=>document.getElementById('portalHome').hidden&&location.hash==='#workout'&&scrollY===0,null,{timeout:20000});
  await page.evaluate(()=>window.r5Run);
  assert.equal(await page.evaluate(()=>window.myr5TestState.phase),'idle','the square does not start the workout');
  b=await bar(page);assert.equal(b.visible&&b.tappable,true,'the bar is on the workout start page: '+JSON.stringify(b));
  // W2-2M #117: the page is the viewing port (your character), the control board and BEGIN; Goals is folded up.
  assert.deepEqual(await beginClear(page),{above:true,hit:true},'BEGIN is visible without scrolling at 375x812');
  assert.deepEqual(await page.evaluate(()=>({character:!!document.querySelector('#view #homeCharacter:not([hidden])'),goalsOpen:document.getElementById('podGoals').open,orders:!!document.querySelector('#homeScreen .coach-mission')})),{character:true,goalsOpen:false,orders:false});
  await page.waitForTimeout(400);
  await page.screenshot({path:resolve(FRAMES,'r5-5-workout-start-from-square.png')});
 }finally{await context.close();}
});

// W2-2C (#56, #79, #19): the rest screen's exit goes home to the quilt instead of the pod, a Settings link
// is a real route (lights the bar, sets the hash), and the Continue chip has its own spot above the bar.
test('9. the rest exit goes home to the quilt, a Settings link is a real route, and the Continue chip sits above the bar',{timeout:120000},async()=>{
 const {context,page}=await openApp(browser,base);
 try{
  await mkdir(FRAMES,{recursive:true});
  await page.evaluate(()=>window.myr5Menus.portal());
  await portalUp(page);
  await page.evaluate(()=>document.querySelector('.app-update-banner [data-later]')?.click()); // clear of every later frame

  // #56: reach rest from the pod (quilt hidden) so the exit's own trip back to the quilt is what's under test.
  await page.evaluate(()=>{location.hash='pod';});
  await page.waitForFunction(()=>window.myr5Routes.current()==='pod'&&document.getElementById('portalHome')?.hidden!==false);
  await page.evaluate(()=>document.getElementById('openSettings').click());
  await page.waitForFunction(()=>document.getElementById('settings')?.open===true);
  await page.locator('#settings .settings-group summary',{hasText:'Pod'}).click(); // Settings opens folded
  await page.locator('#visitRest').click(); // a practice rest -- same leave()/#leaveRest path as a real set
  await page.waitForFunction(()=>document.body.dataset.screen==='rest'&&document.getElementById('restScreen')?.hidden===false);
  await page.locator('#leaveRest').click();
  await portalUp(page);
  assert.equal(await page.evaluate(()=>location.hash),'','the rest exit clears the hash instead of landing on #pod');
  await page.screenshot({path:resolve(FRAMES,'r5-6-rest-exit-quilt.png')});
  await page.evaluate(()=>{location.hash='pod';});
  await page.waitForFunction(()=>window.myr5Routes.current()==='pod'); // #pod is still a real route on request
  await page.goBack();
  await portalUp(page);

  // #19: a real interrupted set from today (seeded from a second, throwaway page on the same origin so it
  // never contends for the live page's workout lease), surfaced by reloading -- the boot path unfinished()'s
  // own data rule has a node test beside the local-coach tests; this checks the chip's spot and look.
  const seedPage=await context.newPage();
  await seedPage.goto(base+'/onboarding.html');
  await seedPage.evaluate(async()=>{
   const {openGuestWorkoutAdapter}=await import('/local-coach-runtime.mjs');
   const adapter=await openGuestWorkoutAdapter({exerciseKeys:['squat']});
   const workout=await adapter.start({mode:'squat',goal:12,restSeconds:60,metadata:{name:'Squats'},control:'camera'});
   await adapter.interrupt(workout.id,{value:4});
   adapter.close();
  });
  await seedPage.close();
  await page.reload();
  await page.waitForFunction(()=>window.myr5TestState?.phase==='idle'&&window.myr5WorkoutOwner&&!window.myr5WorkoutOwner.snapshot().transitioning);
  await page.evaluate(()=>document.querySelector('.app-update-banner [data-later]')?.click());
  await page.evaluate(()=>window.myr5Menus.portal());
  await portalUp(page);
  // #19: the Continue offer belongs to the pod, never the quilt.
  await page.waitForTimeout(500);
  assert.equal(await page.locator('.continue-workout').isVisible(),false,'no Continue popup on the quilt');
  assert.equal(await page.locator('#coachDock .dock-continue').isVisible(),false,'no Continue chip on the quilt');
  await page.evaluate(()=>{location.hash='pod';});
  await page.waitForFunction(()=>window.myr5Routes.current()==='pod'&&document.getElementById('portalHome')?.hidden!==false);
  const popup=page.locator('.continue-workout');
  await popup.waitFor({state:'visible',timeout:10000});
  assert.match(await popup.locator('h2').textContent(),/Continue.*Squats/,'the popup names the interrupted movement');
  const [popupBox,dockBox]=await Promise.all([popup.boundingBox(),page.locator('#coachDock').boundingBox()]);
  assert.ok(popupBox&&dockBox,'the popup and the bar both have a box');
  assert.ok(popupBox.y+popupBox.height<=dockBox.y+.5,`the popup sits above the bar (${popupBox.y+popupBox.height} vs ${dockBox.y})`);
  assert.ok(popupBox.x>=0&&popupBox.x+popupBox.width<=375,'the popup stays inside the 375-wide viewport');
  await page.screenshot({path:resolve(FRAMES,'r5-7-continue-chip.png')});
  await popup.locator('[data-dismiss]').click();
  await popup.waitFor({state:'hidden'});
  await page.goBack();
  await portalUp(page);

  // #79: every Settings link but HOW TO PLAY is a route now; ACCOUNT sets #scoreboard and the bar stays up under it.
  await page.evaluate(()=>document.getElementById('openSettings').click());
  await page.waitForFunction(()=>document.getElementById('settings')?.open===true);
  await page.screenshot({path:resolve(FRAMES,'r5-8-settings-links.png')});
  assert.deepEqual(await page.evaluate(()=>[...document.querySelectorAll('.terminal-links button')].map(b=>b.textContent)),['> ACCOUNT','> DEVICE + UPDATES','> HOW TO PLAY'],'no Portal, Achievements or Reminders links in Settings');
  await page.locator('.terminal-links button',{hasText:'ACCOUNT'}).click();
  await page.waitForFunction(()=>location.hash==='#scoreboard'&&document.getElementById('settings')?.open!==true&&document.getElementById('accountPanel')?.open===true);
  assert.equal(await page.evaluate(()=>window.myr5Routes.current()),'scoreboard','the Settings link goes through the router, not a direct call');
  {const b=await bar(page),d=await page.evaluate(()=>{const dock=document.getElementById('coachDock'),r=dock.getBoundingClientRect(),c=getComputedStyle(dock),f=dock.closest('dialog')?.getBoundingClientRect();return {r:r.toJSON(),vw:innerWidth,vh:innerHeight,d:c.display,v:c.visibility,parent:dock.parentElement.id,face:f?.toJSON(),cls:dock.closest('dialog')?.className};});assert.equal(b.visible,true,'the bar stays up under the scoreboard route '+JSON.stringify(d));}
  await page.screenshot({path:resolve(FRAMES,'r5-9-settings-account-route.png')});
  await page.goBack();
  await page.waitForFunction(()=>!document.getElementById('accountPanel')?.open);
 }finally{await context.close();}
});
