import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {chromium} from 'playwright';
import {completeCoach} from './onboarding-fixture.mjs';

// D43.5: while a set is counting, the coach gives up frames before the counter does. This dispatches real
// myr5:pose events (not the .pose() test hook, which calls apply() directly and bypasses onPose's cap) so
// coach-overlay's own logic is what's under test, over the real camera-only shell used by the other AR coach
// tests. window.myr5TestState.rate stands in for the tracking loop's own measurement (app.mjs sets that same
// field from real inference timing) — only the number is faked; every cap decision is still driven off the
// event's own `now`. The first part (coach-overlay's DOM/motion throttle) runs entirely on a synthetic clock
// with no real waiting, each phase one synchronous page.evaluate turn so nothing the real background tracking
// loop dispatches meanwhile can interleave with it. The second part samples the creature viewer's actual
// WebGL render rate (creature/source/viewer.ts), which does run off real time (its own rAF), so it waits for
// real wall-clock windows and filters out the real background loop's own (uncounted) pose events meanwhile.
test('the AR coach caps its render rate when tracking is slow during a counted set, stays uncapped when fast, and recovers after the hysteresis window',async()=>{
 const root=resolve('dist/client');
 const server=createServer(async(req,res)=>{
  const path=new URL(req.url,'http://local').pathname;
  if(path==='/__test__'){res.writeHead(200,{'Content-Type':'text/html'});res.end('<!doctype html><title>Test</title>');return;}
  if(path.startsWith('/api/')){res.writeHead(path==='/api/auth/config'?200:401,{'Content-Type':'application/json'});res.end(JSON.stringify(path==='/api/auth/config'?{enabled:false}:{error:'Sign in'}));return;}
  try{const file=resolve(root,'.'+(path==='/'?'/pose.html':path));if(!file.startsWith(root+sep))throw Error();const body=await readFile(file);res.writeHead(200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png','.glb':'model/gltf-binary'})[extname(file)]||'application/octet-stream'});res.end(body);}catch{res.writeHead(404);res.end();}
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 let browser;try{
  browser=await chromium.launch({channel:'msedge',headless:true,args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
  const context=await browser.newContext({viewport:{width:375,height:812},permissions:['camera']}),page=await context.newPage();
  await page.route('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs',route=>route.fulfill({contentType:'text/javascript',body:`export const FilesetResolver={forVisionTasks:async()=>({})}; export const PoseLandmarker={createFromOptions:async()=>({detectForVideo:()=>({landmarks:[],worldLandmarks:[]}),close(){}})};export class DrawingUtils{}` }));
  await page.goto(base+'/__test__');await page.evaluate(async intake=>{const {openLocalCoach}=await import('/local-coach-runtime.mjs');const repo=await openLocalCoach();await repo.forOwner(repo.guestOwnerId).saveSetup(intake,{startDay:'2026-09-21'});repo.close();},completeCoach());
  await page.goto(base+'/pose.html');await page.waitForFunction(()=>window.myr5TestState?.phase==='idle'&&window.myr5WorkoutOwner&&!window.myr5WorkoutOwner.snapshot().transitioning);
  await page.evaluate(()=>document.getElementById('useHologram').click());
  await page.waitForFunction(()=>document.body.dataset.cameraWorkout==='true'||window.myr5TestState.phase==='error',null,{timeout:20000});
  // The coach card exists once tracking starts (same wait the coach-overlay test uses); by then
  // creature/assets/phone.js has resolved and window.myr5Creature is set (coach-overlay awaits its
  // import before creating the box), so it's safe to spy on window.myr5Creature.face below.
  await page.waitForFunction(()=>document.querySelector('#coachOverlay .coach-overlay-box'),null,{timeout:60000});

  const result=await page.evaluate(()=>{
   const person=(()=>{const p=Array.from({length:33},()=>({x:.3,y:.5,visibility:.9}));
    const set=(i,x,y)=>{p[i]={x,y,visibility:.9};};
    set(11,.22,.3);set(12,.38,.3);set(23,.25,.5);set(24,.35,.5);set(25,.25,.7);set(26,.35,.7);set(27,.25,.9);set(28,.35,.9);
    return p;})();
   window.__coachCapPerson=person; // reused by the real-WebGL-rate check below
   let renders=0;const origFace=window.myr5Creature.face;
   window.myr5Creature.face=(...args)=>{renders++;return origFace(...args);};
   let now=1000;
   // 60 synthetic pose events/s, `ms` of synthetic time, a set already counting throughout: only `rate`
   // (what coach-overlay reads from window.myr5TestState) says whether tracking is currently slow.
   const feed=(rate,ms)=>{
    window.myr5TestState.rate=rate;const step=1000/60,before=renders;
    for(let sent=0;sent<ms;sent+=step){now+=step;window.dispatchEvent(new CustomEvent('myr5:pose',{detail:{points:person,width:640,height:480,mirrored:false,now,counting:true}}));}
    return renders-before;
   };
   const fast=feed(30,2000); // starts uncapped: never drops below minPoseHz, so no change
   const slow=feed(3,2000); // 3/s is under minPoseHz (4, the band where phone sets stall): capped for the whole phase
   const recovered=feed(30,3000); // still capped entering this phase; only opens back up after ~2s sustained fast
   window.myr5Creature.face=origFace;
   return {fast,slow,recovered};
  });

  assert.ok(result.fast>=110,`uncapped (fast) coach should render close to every dispatched frame (saw ${result.fast}/120)`);
  assert.ok(result.slow<=22,`capped coach should skip DOM writes down to ~10/s while tracking is slow (saw ${result.slow} over 2s)`);
  assert.ok(result.recovered>=75,`coach should recover to native rate ~2s after tracking speeds back up (saw ${result.recovered} over 3s)`);

  // The conductor's follow-up: it's the creature viewer's own WebGL render loop (creature/source/viewer.ts)
  // that actually competes with MediaPipe, not just coach-overlay's DOM writes above. window.myr5Creature.
  // setMaxFps throttles that loop directly; stats().renders is a cumulative count of its real renderer.render()
  // calls (driven by its own rAF off real performance.now(), independent of the synthetic `now` used above),
  // so this samples it over real wall-clock windows to confirm the actual WebGL frame rate is capped.
  //
  // The real background tracking loop (the mocked, landmark-less MediaPipe) keeps dispatching its own
  // myr5:pose events the whole time with counting:false, which would otherwise fight the cap below (every
  // one of those resets it per D43.5: "outside a counting set, no change"). Drop only those while sampling;
  // every event this test sends explicitly sets counting:true, so nothing of its own is filtered out.
  await page.evaluate(()=>{
   const original=window.dispatchEvent.bind(window);
   window.__coachCapRestoreDispatch=()=>{window.dispatchEvent=original;};
   window.dispatchEvent=event=>{if(event.type==='myr5:pose'&&event.detail&&event.detail.counting===false)return true;return original(event);};
  });
  const sample=async(rate,seconds)=>{
   await page.evaluate(rate=>{
    window.myr5TestState.rate=rate;const step=1000/60;let now=performance.now();
    for(let sent=0;sent<3000;sent+=step){now+=step;window.dispatchEvent(new CustomEvent('myr5:pose',{detail:{points:window.__coachCapPerson,width:640,height:480,mirrored:false,now,counting:true}}));}
   },rate);
   const before=await page.evaluate(()=>window.myr5Creature.stats().renders);
   await page.evaluate(ms=>new Promise(r=>setTimeout(r,ms)),seconds*1000);
   const after=await page.evaluate(()=>window.myr5Creature.stats().renders);
   return (after-before)/seconds;
  };
  let cappedRate,uncappedRate;
  try{
   cappedRate=await sample(3,1.2); // 3s of synthetic slow tracking first: setMaxFps(10) is engaged throughout
   uncappedRate=await sample(30,1.2); // 3s of synthetic fast tracking: past the 2s hysteresis, setMaxFps(null)
  }finally{await page.evaluate(()=>window.__coachCapRestoreDispatch());}
  assert.ok(cappedRate<=12,`WebGL renderer.render() should run at most ~10/s while tracking is slow (saw ${cappedRate.toFixed(1)}/s)`);
  assert.ok(uncappedRate>=cappedRate+8,`WebGL renderer.render() should return to its native rate once tracking is fast again (capped ${cappedRate.toFixed(1)}/s vs uncapped ${uncappedRate.toFixed(1)}/s)`);
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
});
