import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {chromium} from 'playwright';
import {completeCoach} from './onboarding-fixture.mjs';

const TYPES={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.webp':'image/webp'};

test('installed Coach starts at Quilt only after setup and preserves panel deep links',async()=>{
 const root=resolve('dist/client');
 const server=createServer(async(req,res)=>{
  const path=new URL(req.url,'http://local').pathname;
  if(path.startsWith('/api/')){res.writeHead(path==='/api/auth/config'?200:401,{'Content-Type':'application/json'});res.end(JSON.stringify(path==='/api/auth/config'?{enabled:false}:{error:'Sign in'}));return;}
  try{const file=resolve(root,'.'+(path==='/'?'/pose.html':path));if(!file.startsWith(root+sep))throw Error();const body=await readFile(file);res.writeHead(200,{'Content-Type':TYPES[extname(file)]||'application/octet-stream'});res.end(body);}catch{res.writeHead(404);res.end();}
 });
 await new Promise(done=>server.listen(0,'127.0.0.1',done));
 const base='http://127.0.0.1:'+server.address().port;let browser;
 try{
  browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-gl=angle','--use-angle=swiftshader']});
  async function installedContext(){const context=await browser.newContext({serviceWorkers:'block'});await context.addInitScript(()=>Object.defineProperty(navigator,'standalone',{configurable:true,value:true}));return context;}
  async function seed(context){const page=await context.newPage();await page.goto(base+'/onboarding.html');await page.evaluate(async intake=>{const {openLocalCoach}=await import('/local-coach-runtime.mjs');const repo=await openLocalCoach();await repo.forOwner(repo.guestOwnerId).saveSetup(intake,{startDay:'2026-09-21'});repo.close();},completeCoach());await page.close();}

  const ready=await installedContext();await seed(ready);const home=await ready.newPage();await home.goto(base+'/pose.html');await home.waitForFunction(()=>document.getElementById('portalHome')?.hidden===false);assert.equal(await home.locator('#portalHome').getAttribute('aria-label'),'Quilt portal');await ready.close();

  const stale=await installedContext();await seed(stale);const broken=await stale.newPage();await broken.route('**/launch-runtime.mjs*',route=>route.fulfill({status:503,contentType:'text/javascript',body:'// stale runtime fixture'}));await broken.goto(base+'/pose.html');await broken.waitForFunction(()=>document.getElementById('coachStartupRecovery')?.open===true);await broken.waitForTimeout(500);assert.equal(await broken.locator('#coachStartupRecovery').isVisible(),true);assert.equal(await broken.locator('#portalHome').count(),0,'a seeded local coach must not open Quilt while startup recovery is active');await stale.close();

  const firstRun=await installedContext();const setup=await firstRun.newPage();await setup.goto(base+'/pose.html');await setup.waitForFunction(()=>document.getElementById('coachSetupGate')?.open===true);assert.equal(await setup.locator('#portalHome').count(),0);await firstRun.close();

  const deepLink=await installedContext();await seed(deepLink);const install=await deepLink.newPage();await install.goto(base+'/pose.html?panel=install');await install.waitForFunction(()=>document.getElementById('installPanel')?.open===true);assert.equal(await install.locator('#portalHome').count(),0);await deepLink.close();

  const active=await installedContext();await seed(active);const workout=await active.newPage();let heldCss,holdCssReady;const cssHeld=new Promise(resolve=>holdCssReady=resolve);await workout.route('**/modules/portal/portal.css',route=>{heldCss=route;holdCssReady();});await workout.goto(base+'/pose.html');await cssHeld;await workout.waitForFunction(()=>window.myr5TestState?.phase==='idle'&&window.myr5WorkoutOwner&&!window.myr5WorkoutOwner.snapshot().transitioning);await workout.locator('#openSettings').click();await workout.locator('#camera').selectOption('manual');await workout.locator('#closeSettings').click();await workout.locator('#start').click();await workout.waitForFunction(()=>window.myr5TestState?.phase==='manual');await heldCss.continue();await workout.waitForFunction(()=>document.getElementById('portalHome'));assert.equal(await workout.locator('#portalHome').isVisible(),false);assert.equal(await workout.locator('#stop').isDisabled(),false);await active.close();
 }finally{await browser?.close();await new Promise(done=>server.close(done));}
});
