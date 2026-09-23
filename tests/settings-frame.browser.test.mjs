import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {chromium} from 'playwright';
import {completeCoach} from './onboarding-fixture.mjs';

// #107: the SATCOM frame around the ☰ Settings dialog (#settings, opened by #openSettings).
// Checks the acquiring -> locked status-strip animation, that it still resolves to locked under
// reduced motion (no transition), and saves the frames the brief asks for.
const TYPES={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.webp':'image/webp'};
const FRAMES=resolve('.frames');

test('SATCOM frame: acquiring -> locked status strip, and a static locked frame under reduced motion, at 375x812',async()=>{
 await mkdir(FRAMES,{recursive:true});
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
  async function installedContext(extra={}){const context=await browser.newContext({serviceWorkers:'block',viewport:{width:375,height:812},...extra});await context.addInitScript(()=>Object.defineProperty(navigator,'standalone',{configurable:true,value:true}));return context;}
  async function seed(context){const page=await context.newPage();await page.goto(base+'/onboarding.html');await page.evaluate(async intake=>{const {openLocalCoach}=await import('/local-coach-runtime.mjs');const repo=await openLocalCoach();await repo.forOwner(repo.guestOwnerId).saveSetup(intake,{startDay:'2026-09-21'});repo.close();},completeCoach());await page.close();}
  async function openSettingsAt(context){
   await seed(context);const page=await context.newPage();await page.goto(base+'/pose.html');
   await page.waitForFunction(()=>window.myr5TestState?.phase==='idle'&&window.myr5WorkoutOwner&&!window.myr5WorkoutOwner.snapshot().transitioning);
   // The Quilt portal sits over the header and intercepts pointer-event hit-testing, same as the
   // portal's own line-down gesture (modules/portal/portal.mjs): call .click() directly rather than
   // simulating a pointer click. showModal() then promotes the dialog above the portal regardless.
   // Read the just-opened link text in the SAME evaluate as the click (not a separate round trip):
   // under load, a slow host can otherwise let the real 900ms acquire->lock timer fire between two
   // separate steps, making "opens in the acquiring state" flaky even though nothing is wrong.
   const initial=await page.evaluate(()=>{document.getElementById('openSettings').click();const settings=document.getElementById('settings');return {open:settings.open,link:settings.querySelector('.satcom-top [data-link]')?.textContent};});
   return {page,initial};
  }

  const normal=await installedContext();
  const {page,initial}=await openSettingsAt(normal);
  assert.equal(initial.open,true,'settings opens');
  assert.equal(initial.link,'ACQUIRING…','opens in the acquiring state');
  // The frame must not cover the nav items it isn't allowed to change.
  for(const label of ['PORTAL','ACHIEVEMENTS','REMINDERS','ACCOUNT','DEVICE + UPDATES','HOW TO PLAY'])await assertVisible(page,`#settings button:has-text("> ${label}")`);
  await page.screenshot({path:resolve(FRAMES,'settings-acquiring.png')});
  await page.waitForFunction(()=>document.querySelector('#settings .satcom-top')?.classList.contains('locked'),{timeout:5000});
  assert.equal(await page.locator('#settings .satcom-top [data-link]').textContent(),'UPLINK ESTABLISHED','settles to locked shortly after opening');
  assert.match(await page.locator('#settings .satcom-bottom [data-build]').textContent(),/^BUILD /);
  await page.screenshot({path:resolve(FRAMES,'settings-locked.png')});
  await normal.close();

  const reduced=await installedContext({reducedMotion:'reduce'});
  const {page:rpage,initial:rinitial}=await openSettingsAt(reduced);
  // Reduced motion: no acquiring phase, straight to the static locked frame.
  assert.equal(rinitial.link,'UPLINK ESTABLISHED','reduced motion skips straight to locked');
  assert.equal(await rpage.evaluate(()=>document.querySelector('#settings .satcom-top').classList.contains('locked')),true);
  await rpage.screenshot({path:resolve(FRAMES,'settings-reduced-motion.png')});
  await reduced.close();
 }finally{await browser?.close();await new Promise(done=>server.close(done));}
});

async function assertVisible(page,selector){assert.equal(await page.locator(selector).isVisible(),true,selector+' should be visible');}
