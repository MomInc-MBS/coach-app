import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {chromium} from 'playwright';
import {completeCoach} from './onboarding-fixture.mjs';

// AR coach (D24): the one exception to camera-only mode. Drives it with the myr5CoachOverlay
// test hooks (a fake pose stream) rather than a real MediaPipe run, inside the real camera-only shell.
test('AR coach stays hidden until counting, walks in, wanders, and a kick spins it away over the real camera shell',async()=>{
 const root=resolve('dist/client');
 const server=createServer(async(req,res)=>{
  const path=new URL(req.url,'http://local').pathname;
  if(path==='/__test__'){res.writeHead(200,{'Content-Type':'text/html'});res.end('<!doctype html><title>Test</title>');return;}
  if(path.startsWith('/api/')){res.writeHead(path==='/api/auth/config'?200:401,{'Content-Type':'application/json'});res.end(JSON.stringify(path==='/api/auth/config'?{enabled:false}:{error:'Sign in'}));return;}
  try{const file=resolve(root,'.'+(path==='/'?'/pose.html':path));if(!file.startsWith(root+sep))throw Error();const body=await readFile(file);res.writeHead(200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png','.glb':'model/gltf-binary'})[extname(file)]||'application/octet-stream'});res.end(body);}catch{res.writeHead(404);res.end();}
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 let browser;try{
  browser=await chromium.launch({channel:'msedge',headless:true,args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});const context=await browser.newContext({viewport:{width:375,height:812},permissions:['camera']}),page=await context.newPage();
  await page.route('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs',route=>route.fulfill({contentType:'text/javascript',body:`export const FilesetResolver={forVisionTasks:async()=>({})}; export const PoseLandmarker={createFromOptions:async()=>({detectForVideo:()=>({landmarks:[],worldLandmarks:[]}),close(){}})};export class DrawingUtils{}` }));
  await page.goto(base+'/__test__');await page.evaluate(async intake=>{const {openLocalCoach}=await import('/local-coach-runtime.mjs');const repo=await openLocalCoach();await repo.forOwner(repo.guestOwnerId).saveSetup(intake,{startDay:'2026-09-21'});repo.close();},completeCoach());
  await page.goto(base+'/pose.html');await page.waitForFunction(()=>window.myr5TestState?.phase==='idle'&&window.myr5WorkoutOwner&&!window.myr5WorkoutOwner.snapshot().transitioning);
  await page.evaluate(()=>document.getElementById('useHologram').click());
  await page.waitForFunction(()=>document.body.dataset.cameraWorkout==='true'||window.myr5TestState.phase==='error',null,{timeout:20000});
  assert.equal(await page.evaluate(()=>document.body.dataset.cameraWorkout),'true');

  // The coach card exists but stays off frame: no reps counted yet (the fake tracker reports no landmarks).
  await page.waitForFunction(()=>document.querySelector('#coachOverlay .coach-overlay-box'),null,{timeout:60000});
  assert.equal(await page.evaluate(()=>getComputedStyle(document.querySelector('#coachOverlay .coach-overlay-box')).visibility),'hidden','hidden before any reps count');
  assert.equal(await page.evaluate(()=>window.myr5CoachOverlay.state()?.phase??'offstage'),'offstage');
  // Hotfix 2026-09-23: off frame the coach's WebGL loop is paused (its IntersectionObserver sees no layout),
  // so it can't slow the CPU pose tracker while the user sets their start.
  await page.waitForFunction(()=>window.myr5Creature?.stats?.().visible===false,null,{timeout:10000}).catch(async()=>assert.fail('offstage coach still renders: '+JSON.stringify(await page.evaluate(()=>window.myr5Creature?.stats?.()))));

  // Drive the coach with a fake pose stream through the test hooks (screen-fraction landmarks, the
  // same shape used by coach-hit.test.mjs), layered on top of the real camera-only shell and real tracker loop.
  const result=await page.evaluate(async()=>{
   function person(userX,{ankle=null,knee=null}={}){
    const p=Array.from({length:33},()=>({x:userX,y:.5,visibility:.9}));
    const set=(i,x,y)=>{p[i]={x,y,visibility:.9};};
    set(11,userX-.08,.3);set(12,userX+.08,.3);set(23,userX-.05,.5);set(24,userX+.05,.5);
    set(25,userX-.05,.7);set(26,userX+.05,.7);set(27,userX-.05,.9);set(28,userX+.05,.9);
    if(ankle)set(28,...ankle);if(knee)set(26,...knee);
    return p;
   }
   const sleep=ms=>new Promise(r=>setTimeout(r,ms));
   const overlay=window.myr5CoachOverlay,seen=new Set();
   overlay.begin(); // reps are counting
   let s=null;
   for(let i=0;i<300&&(!s||s.phase!=='pausing');i++){overlay.pose(person(.3));s=overlay.state();seen.add(s.phase);await sleep(16);}
   const walkedIn=seen.has('walking')&&s.phase==='pausing';
   const box=s.box,center=[(box.left+box.right)/2,(box.top+box.bottom)/2];
   // A kick: a fast ankle landing inside the coach's box. Both calls run synchronously (no
   // await between them) so the real (empty) tracker's frames can't reset the velocity baseline.
   overlay.pose(person(.3,{ankle:[box.left-.05,center[1]]}));
   overlay.pose(person(.3,{ankle:center}));
   const spun=overlay.state();
   let away=null;for(let i=0;i<200&&(!away||away.phase!=='away');i++){overlay.pose(person(.3));away=overlay.state();await sleep(16);}
   let back=null;for(let i=0;i<400&&(!back||back.phase!=='pausing');i++){overlay.pose(person(.3));back=overlay.state();await sleep(16);}
   return {walkedIn,spunPhase:spun.phase,awayPhase:away?.phase,backPhase:back?.phase,phasesSeen:[...seen],cardInsideOverlay:!!document.querySelector('#coachOverlay .myr5-companion-card')};
  });
  assert.ok(result.walkedIn,`coach walked in and settled beside the user (saw: ${result.phasesSeen})`);
  assert.equal(result.spunPhase,'spun','a fast ankle inside the box spins the coach away');
  assert.equal(result.awayPhase,'away','it flies off screen after the spin');
  assert.equal(result.backPhase,'pausing','it walks back in and settles again');
  assert.equal(result.cardInsideOverlay,true,'the coach card lives inside the overlay while tracking, not #coachMount');
  await page.waitForFunction(()=>window.myr5Creature.stats().visible===true,null,{timeout:10000});

  // Camera-only (D24): only the video, the counter and the AR coach may be visible — no skeleton, no stop button.
  const shell=await page.evaluate(()=>({
   others:[...document.body.children].filter(n=>n.id!=='cameraWorkout'&&getComputedStyle(n).display!=='none').map(n=>n.tagName),
   canvasVisible:document.getElementById('c').checkVisibility(),
   liveStop:document.getElementById('liveStop'),
   stageChildren:[...document.getElementById('cameraWorkout').children].map(n=>n.tagName+(n.id?'#'+n.id:''))
  }));
  assert.deepEqual(shell.others,[]);assert.equal(shell.canvasVisible,false);assert.equal(shell.liveStop,null);
  assert.deepEqual(shell.stageChildren,['VIDEO#v','BUTTON','DIV#coachOverlay']);
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
});
