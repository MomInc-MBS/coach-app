import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {chromium} from 'playwright';

// Source harness: real switchboard module, CSS, input/pointer events, storage and rope physics.
// The camera boundary is stubbed so startup services cannot hide a switchboard regression.
test('switchboard: exposed presets, arbitrary wiring, occupancy, locks, keyboard, reload and legacy saves',{timeout:120000},async()=>{
 const root=resolve('.'),shots=resolve('.r1017');await mkdir(shots,{recursive:true});
 const harness=`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/pod/pod.css"><style>:root{--font:Arial;--cream:#eadde6;--gold:#e8c277}body{margin:0;background:#18131c;color:#eadde6}.pod-goals{margin:8px}.fw-menu{width:350px;max-width:calc(100vw - 24px);padding:8px;box-sizing:border-box;max-height:80vh;overflow:auto}.fw-wires{pointer-events:none}</style><details id="podGoals"><summary>Goals</summary></details><script type="module">import {mountFullWorkout} from '/full-workout-ui.mjs';window.board=mountFullWorkout({canUse:id=>!['hips','core','shoulders','balance','yoga'].includes(window.exercises?.[id]?.group),reason:()=> 'Choose this workout path to unlock',select(){},start(){}});window.ready=true;</script>`;
 // Resolve access from the real exercise catalogue instead of mirroring exercise lists.
 const html=harness.replace("import {mountFullWorkout}","import {EXERCISES} from '/exercise-library.mjs';window.exercises=EXERCISES;import {mountFullWorkout}");
 const server=createServer(async(req,res)=>{const pathname=new URL(req.url,'http://local').pathname;if(pathname==='/'){res.writeHead(200,{'Content-Type':'text/html'});res.end(html);return;}try{const f=resolve(root,'.'+pathname);if(!f.startsWith(root+sep))throw Error();const data=await readFile(f);res.writeHead(200,{'Content-Type':({'.mjs':'text/javascript','.css':'text/css','.png':'image/png'})[extname(f)]||'application/octet-stream'});res.end(data);}catch{res.writeHead(404);res.end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 let browser;try{
  browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:412,height:915},reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>window.ready);await page.locator('#podFullWorkout>summary').click();
  const state=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('myr5-full-workout-v1')||'{}'));
  const preset=page.locator('.fw-style[data-style="legs"] input[data-k="3"]');await preset.check({force:true});assert.equal(await page.locator('[data-fw-status]').textContent(),'0 sections');
  assert.equal(await page.locator('.fw-style details').count(),0);assert.ok(await page.locator('.fw-row input:not([disabled])').count()>0);assert.equal(await page.locator('.fw-locked input:not([disabled])').count(),0);
  assert.ok(await preset.getAttribute('aria-label'));assert.ok(await preset.locator('..').getAttribute('title'));
  assert.ok(await page.evaluate(()=>[...document.querySelectorAll('.fw-row')].every(r=>{const l=r.querySelector('.fw-lamp').getBoundingClientRect(),t=r.querySelector('.fw-tog').getBoundingClientRect();return l.bottom<=t.top;})),'every light sits above its toggle');
  // Actual mouse capture + drag; scroll the board beneath the captured cable to reach distant sockets.
  const drag=async(wire,socket)=>{
   await page.evaluate(()=>document.querySelector('.fw-menu').scrollTop=0);await page.waitForTimeout(50);
   await page.locator(`[data-plug="${wire}"]`).scrollIntoViewIfNeeded();
   const p=await page.locator(`[data-plug="${wire}"]`).boundingBox();await page.mouse.move(p.x+p.width/2,p.y+p.height/2);await page.mouse.down();
   await page.mouse.move(p.x+p.width/2+10,p.y+p.height/2,{steps:3});
   const target=socket?`[data-socket="${socket}"]`:'.fw-bay';
   await page.locator(target).scrollIntoViewIfNeeded();const s=await page.locator(target).boundingBox();await page.mouse.move(s.x+s.width/2,s.y+s.height/2,{steps:12});await page.mouse.up();await page.waitForTimeout(80);
  };
  await drag('hips','legs');assert.equal((await state()).cables.hips,'legs');assert.equal(await page.locator('[data-fw-status]').textContent(),'1 section');
  await drag('boxing','legs');assert.deepEqual((await state()).cables,{boxing:'legs'});
  await drag('boxing',null);assert.deepEqual((await state()).cables,{});assert.equal(await preset.isChecked(),true,'unplug preserves preset');
  await drag('hips','hips');assert.equal((await state()).cables.hips,'hips','any cable enters even a locked socket');assert.equal(await page.locator('.fw-style[data-style="hips"] input:not([disabled])').count(),0);
  await drag('hips','legs');
  await page.evaluate(()=>document.querySelector('.fw-menu').scrollTop=0);await page.screenshot({path:resolve(shots,'switchboard-source-wired.png')});await page.locator('[data-plug="boxing"]').focus();assert.equal(await page.evaluate(()=>document.activeElement?.dataset.plug),'boxing','keyboard focus reaches cable');await page.keyboard.press('Enter');await page.waitForTimeout(150);assert.equal((await state()).cables.boxing,'boxing',JSON.stringify({stored:await state(),errors}));
  await page.screenshot({path:resolve(shots,'switchboard-mobile.png')});
  const before=await state();await page.reload();await page.waitForFunction(()=>window.ready);await page.locator('#podFullWorkout>summary').click();assert.deepEqual((await state()).cables,before.cables);assert.equal(await preset.isChecked(),true);assert.equal(await page.locator('.fw-style[data-style="legs"]').getAttribute('data-power'),'on');
  await page.evaluate(()=>localStorage.setItem('myr5-full-workout-v1',JSON.stringify({powered:['legs'],levels:{legs:2}})));await page.reload();await page.waitForFunction(()=>window.ready);await page.locator('#podFullWorkout>summary').click();assert.equal(await page.locator('[data-fw-status]').textContent(),'1 section');await preset.check({force:true});assert.deepEqual((await state()).cables,{legs:'legs'});
  assert.deepEqual(errors,[]);
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
});
