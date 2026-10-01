// W2-2K additions (Ian 23 Sept), in the real app at 375x812 against `npm run build`: the energy flows around the metal
// frame (gentle at rest, surging through the glass and dive, static under reduced motion); a destination (W2-2N: a
// line's, since the triangles, diamonds and oval now open in their cut, tests/portal-peering) opens INSIDE
// the frame (#portalChrome stays on screen above it, the dialog fitted to its window); closing flies back out of the
// wormhole (the reverse dive) and hands back to the quilt; camera-only mode hides the chrome. Harness from
// release-smoke. Frames land in .frames/ (untracked).
import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {chromium} from 'playwright';
import {completeCoach} from './onboarding-fixture.mjs';

const FRAMES_DIR=resolve('.frames');
const TYPES={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.webp':'image/webp'};

function serve(){
 const root=resolve('dist/client');
 return createServer(async(req,res)=>{
  const path=new URL(req.url,'http://local').pathname;
  if(path.startsWith('/api/')){res.writeHead(path==='/api/auth/config'?200:401,{'Content-Type':'application/json'});res.end(JSON.stringify(path==='/api/auth/config'?{enabled:false}:{error:'Sign in'}));return;}
  try{const file=resolve(root,'.'+(path==='/'?'/pose.html':path));if(!file.startsWith(root+sep))throw Error();const body=await readFile(file);res.writeHead(200,{'Content-Type':TYPES[extname(file)]||'application/octet-stream'});res.end(body);}catch{res.writeHead(404);res.end();}
 });
}
async function openApp(browser,base,reducedMotion){
 const context=await browser.newContext({viewport:{width:375,height:812},serviceWorkers:'block',reducedMotion});
 await context.addInitScript(()=>Object.defineProperty(navigator,'standalone',{configurable:true,value:true}));
 // This guest has read today's field manual; its automatic modal has separate coverage.
 await context.addInitScript(()=>{const d=new Date(),day=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;localStorage.setItem('myr5-how-to-play-day-v1/guest',day);});
 const seed=await context.newPage();
 await seed.goto(base+'/onboarding.html');
 await seed.evaluate(async intake=>{const {openLocalCoach}=await import('/local-coach-runtime.mjs');const repo=await openLocalCoach();await repo.forOwner(repo.guestOwnerId).saveSetup(intake,{startDay:'2026-09-21'});repo.close();},completeCoach());
 await seed.close();
 const page=await context.newPage();
 await page.goto(base+'/pose.html');
 await page.waitForFunction(()=>window.myr5TestState?.phase==='idle'&&window.myr5WorkoutOwner&&!window.myr5WorkoutOwner.snapshot().transitioning);
 await page.waitForFunction(()=>!!document.querySelector('.coach-dock'));
 await page.evaluate(()=>window.myr5Menus.portal());
 await page.waitForFunction(()=>document.getElementById('portalHome')?.hidden===false);
 await page.waitForTimeout(300);
 return {context,page};
}
// The energy animations (one per frame copy) and the chrome/dialog geometry.
const energy=page=>page.evaluate(()=>document.getAnimations().filter(a=>a.effect?.target?.closest?.('.portal-energy')).map(a=>({state:a.playState,rate:a.playbackRate})));
const state=page=>page.evaluate(()=>{
 const chrome=document.getElementById('portalChrome'),meals=document.getElementById('remindersPanel'),r=el=>{const q=el.getBoundingClientRect();return{left:q.left,top:q.top,width:q.width,height:q.height};};
 const face=Object.fromEntries(['left','top','width','height'].map(k=>[k,parseFloat(chrome.style.getPropertyValue('--face-'+k))]));
 return{chrome:chrome.matches(':popover-open'),chromeDisplay:getComputedStyle(chrome).display,face,meals:r(meals),mealsOpen:meals.open,framed:meals.classList.contains('portal-framed'),hot:!!document.querySelector('#portalChrome .portal-energy.hot'),ghost:!!document.querySelector('.portal-ghost'),glass:!!document.querySelector('.portal-glass'),transform:getComputedStyle(document.getElementById('portalHome')).transform,hidden:document.getElementById('portalHome').hidden};
});
const near=(a,b,k)=>assert(Math.abs(a[k]-b[k])<1,`${k}: ${a[k]} vs ${b[k]}`);

let server,base,browser;
test.before(async()=>{
 server=serve();await new Promise(r=>server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-gl=angle','--use-angle=swiftshader']});
 await mkdir(FRAMES_DIR,{recursive:true});
});
test.after(async()=>{await browser?.close();await new Promise(r=>server.close(r));});

test("energy surges through the dive, a line's destination (Reminders) opens inside the frame, and closing flies back out of the wormhole",{timeout:180000},async()=>{
 const {context,page}=await openApp(browser,base,'no-preference');
 try{
  let e=await energy(page);
  assert.equal(e.length,8,'a loop per side, on the board frame and on the chrome');
  assert(e.every(a=>a.state==='running'&&a.rate===1),`gentle and running at rest: ${JSON.stringify(e)}`);
  await page.screenshot({path:resolve(FRAMES_DIR,'energy-rest.png')});
  // Freeze the dive a third of the way in (headless WebGL frames are too slow to catch it live), holding the page's
  // timers meanwhile so the destination still arrives in order once it's released.
  await page.evaluate(()=>{
   const animate=Element.prototype.animate,setTimer=window.setTimeout;window.__held=[];
   window.setTimeout=(fn,ms,...rest)=>window.__hold?(window.__held.push(()=>setTimer(fn,ms,...rest)),0):setTimer(fn,ms,...rest);
   window.__release=()=>{window.__hold=false;window.__dive.play();window.__held.splice(0).forEach(f=>f());};
   Element.prototype.animate=function(frames,timing){const a=animate.call(this,frames,timing);if(this.id==='portalHome'&&!window.__dive&&timing.direction!=='reverse'){a.pause();a.currentTime=timing.duration/3;window.__dive=a;window.__hold=true;}if(this.id==='portalHome'&&timing.direction==='reverse'){a.pause();window.__back=a;}return a;};
  });
  await page.evaluate(()=>{window.portalRun=window.myr5Portal.open('line-rl');});
  await page.waitForFunction(()=>window.__dive,null,{timeout:20000});
  await page.waitForTimeout(100);
  let s=await state(page);e=await energy(page);
  assert(s.chrome&&s.hot,'the chrome frame is up and the energy is hot for the dive');
  assert(e.every(a=>a.rate===10),`the dive surges the energy: ${JSON.stringify(e)}`);
  assert.notEqual(s.transform,'none','the portal is diving');
  await page.screenshot({path:resolve(FRAMES_DIR,'energy-mid-dive.png')});
  await page.evaluate(()=>window.__release());
  await page.waitForFunction(()=>document.getElementById('remindersPanel')?.open&&document.getElementById('portalHome').hidden&&!document.querySelector('.portal-arriving'),null,{timeout:20000}); // landed
  await page.evaluate(()=>window.portalRun);
  await page.waitForTimeout(400);
  s=await state(page);
  assert(s.chrome&&s.framed,'Reminders opens framed, with the chrome still up');
  for(const k of ['left','top','width','height'])near(s.meals,s.face,k);
  assert(s.face.left>=8&&375-s.face.left-s.face.width>=8,'the window keeps the physical metal rail');
  assert.equal(await page.evaluate(()=>{const b=document.querySelector('#remindersPanel [data-close]').getBoundingClientRect();return document.elementFromPoint(b.left+b.width/2,b.top+b.height/2)?.closest('#remindersPanel [data-close]')!=null;}),true,'the destination stays tappable under the chrome');
  e=await energy(page);assert(e.every(a=>a.state==='running'&&a.rate===1),'the energy calms but keeps flowing around the open destination');
  await page.screenshot({path:resolve(FRAMES_DIR,'menu-inside-frame.png')});
  // Close: the reverse dive, captured at three points.
  await page.locator('#remindersPanel [data-close]').click();
  await page.waitForFunction(()=>window.__back,null,{timeout:10000});
  for(const [k,name] of [[.15,'reverse-dive-15'],[.5,'reverse-dive-50'],[.85,'reverse-dive-85']]){
   const scale=await page.evaluate(k=>{const d=window.__back.effect.getTiming().duration;window.__back.currentTime=d*k;const g=document.querySelector('.portal-ghost')?.getAnimations()[0];if(g){g.pause();g.currentTime=Math.min(d*k,g.effect.getTiming().duration);}return new Promise(r=>requestAnimationFrame(()=>r(new DOMMatrix(getComputedStyle(document.getElementById('portalHome')).transform).a)));},k);
   s=await state(page);
   assert(s.chrome&&s.glass&&!s.hidden&&!s.mealsOpen,'flying out: the quilt, glass and chrome are up, the destination closed');
   if(k<.5)assert(s.ghost,'the destination shell is still shrinking into the core');
   assert(scale>1,`${name}: the portal is scaled down from the dive (${scale})`);
   await page.screenshot({path:resolve(FRAMES_DIR,name+'.png')});
  }
  await page.evaluate(()=>{window.__back.play();document.querySelector('.portal-ghost')?.getAnimations()[0]?.play();});
  await page.waitForFunction(()=>!document.querySelector('.portal-glass')&&getComputedStyle(document.getElementById('portalHome')).transform==='none',null,{timeout:10000});
  s=await state(page);
  assert(!s.chrome&&!s.framed&&!s.ghost&&!s.hidden,`the quilt is back and the chrome handed back to its frame: ${JSON.stringify(s)}`);
  e=await energy(page);assert(e.every(a=>a.state==='running'&&a.rate===1),'energy back to rest');
  // Release 5: the bottom bar's Portal button replaced the floating Menu button (W2-2A).
  assert.equal(await page.evaluate(()=>{const p=document.querySelector('#coachDock [data-route="portal"]'),b=p.getBoundingClientRect(),hit=document.elementFromPoint(b.left+b.width/2,b.top+b.height/2);return !!hit&&p.contains(hit);}),true,'the dock Portal key or its own icon receives the centre tap');
 }finally{await context.close();}
});

test('reduced motion: static energy, destinations still framed, a quick fade back; camera-only mode hides the chrome',{timeout:120000},async()=>{
 const {context,page}=await openApp(browser,base,'reduce');
 try{
  assert.deepEqual(await energy(page),[],'no energy animation under reduced motion');
  assert.equal(await page.evaluate(()=>document.querySelector('#portalHome .portal-energy').style.getPropertyValue('--energy').split(',').length),6,'the six neons sit static in the channel');
  // Full menu -> Choose Workout (no gesture): this route opens the ship view in the frame's window.
  await page.locator('#portalSettingsButton').click();
  await page.locator('#portalMenu details>summary').click();
  await page.locator('#portalMenu').getByRole('button',{name:'Choose Workout',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('dialog.ship-view')?.open===true&&getComputedStyle(document.querySelector('dialog.ship-view')).position==='fixed'&&document.getElementById('portalChrome').matches(':popover-open'));
  const ship=await page.evaluate(()=>{const r=document.querySelector('dialog.ship-view').getBoundingClientRect(),c=document.getElementById('portalChrome');return{box:{left:r.left,top:r.top,width:r.width,height:r.height},face:Object.fromEntries(['left','top','width','height'].map(k=>[k,parseFloat(c.style.getPropertyValue('--face-'+k))])),chrome:c.matches(':popover-open')};});
  assert(ship.chrome,'the chrome frames the ship view');
  for(const k of ['left','top','width','height'])near(ship.box,ship.face,k);
  await page.screenshot({path:resolve(FRAMES_DIR,'ship-inside-frame.png')});
  // D24: the camera workout hides everything but the video, counter and coach; the chrome is a body child, so it goes too.
  await page.evaluate(()=>{document.body.dataset.cameraWorkout='true';});
  assert.equal(await page.evaluate(()=>getComputedStyle(document.getElementById('portalChrome')).display),'none');
  await page.evaluate(()=>{delete document.body.dataset.cameraWorkout;});
  await page.goBack();
  await page.waitForFunction(()=>!document.querySelector('dialog.ship-view')?.open&&document.getElementById('portalHome').hidden===false);
  await page.waitForTimeout(200);
  const after=await state(page);
  assert(!after.chrome&&!after.glass,'reduced motion comes straight back to the quilt');
  assert(!await page.evaluate(()=>document.querySelector('dialog.ship-view').classList.contains('portal-framed')),'the ship view is unframed for any later open');
 }finally{await context.close();}
});
