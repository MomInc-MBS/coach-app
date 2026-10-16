import {guideSeen} from './guide-seen.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {chromium} from 'playwright';
import {completeCoach} from './onboarding-fixture.mjs';

// R-1017: Cool Cardio on a treadmill. MediaPipe is stubbed with an upper-body-only figure (legs hidden by the console)
// driven by window.__tread = {bob,up,crouch,lean}. Each body action must reach the runner, and stopping shows the warning.
const FAKE_VISION=`
function tread(t,o){
  const p=Array.from({length:33},()=>({x:.5,y:.5,z:0,visibility:0})),b=(o.bob||0)*Math.sin(t*2.6*2*Math.PI)+(o.crouch||0);
  const set=(i,x,y)=>{p[i]={x,y,z:0,visibility:1};};const lean=o.lean||0,lx=-.06*lean,shrug=o.up?.04:0;
  set(0,.5+lx*1.2,.22+b);
  for(const [side,s,e,w,h] of [[1,11,13,15,23],[-1,12,14,16,24]]){
    const sy=.36+b-shrug-side*.045*lean;set(s,.5+lx+side*.12,sy);
    set(e,.5+lx+side*.16,o.up?sy-.12:sy+.14);set(w,.5+lx+side*.15,o.up?sy-.26:sy+.1);set(h,.5+side*.07,.62+b*.5);
  }
  return p;
}
export const FilesetResolver={forVisionTasks:async()=>({})};
export const PoseLandmarker={POSE_CONNECTIONS:[],createFromOptions:async()=>({detectForVideo(){return {landmarks:[tread(performance.now()/1000,globalThis.__tread||{bob:.025})],worldLandmarks:[]};},close(){}})};
export class DrawingUtils{drawConnectors(){}drawLandmarks(){}}`;
const SHOTS=resolve('.r1017');

test('Cool Cardio treadmill: head bob runs, arms up jumps (floaty), crouch slides, lean steers, stopping warns',{timeout:240000},async()=>{
 const root=resolve('dist/client'),TYPES={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.webp':'image/webp','.glb':'model/gltf-binary'};
 const server=createServer(async(req,res)=>{
  const path=new URL(req.url,'http://local').pathname;if(path==='/__test__'){res.writeHead(200,{'Content-Type':'text/html'});res.end('<!doctype html><title>Test</title>');return;}
  if(path.startsWith('/api/')){res.writeHead(path==='/api/auth/config'?200:401,{'Content-Type':'application/json'});res.end(JSON.stringify(path==='/api/auth/config'?{enabled:false}:{error:'Sign in'}));return;}
  try{const file=resolve(root,'.'+(path==='/'?'/pose.html':path));if(!file.startsWith(root+sep))throw Error();const body=await readFile(file);res.writeHead(200,{'Content-Type':TYPES[extname(file)]||'application/octet-stream'});res.end(body);}catch{res.writeHead(404);res.end();}
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 await mkdir(SHOTS,{recursive:true});
 let browser;try{
  browser=await chromium.launch({channel:'msedge',headless:true,args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
  const context=await browser.newContext({viewport:{width:412,height:915},deviceScaleFactor:2.6,isMobile:true,hasTouch:true,permissions:['camera'],serviceWorkers:'block'});
  const page=await context.newPage();await context.addInitScript(guideSeen);
  await page.route('**/vendor/mediapipe/0.10.14/vision_bundle.mjs',route=>route.fulfill({contentType:'text/javascript',body:FAKE_VISION}));
  await page.goto(base+'/__test__');
  await page.evaluate(async intake=>{const [{openLocalCoach},{chooseWorkoutPaths}]=await Promise.all([import('/local-coach-runtime.mjs'),import('/chosen-styles.mjs')]);const repo=await openLocalCoach();await repo.forOwner(repo.guestOwnerId).saveSetup(intake,{startDay:'2026-09-21'});repo.close();chooseWorkoutPaths(['quads','martial-arts']);},completeCoach());
  await page.goto(base+'/pose.html#pod');
  await page.waitForFunction(()=>window.myr5TestState?.phase==='idle'&&window.myr5WorkoutOwner&&!window.myr5WorkoutOwner.snapshot().transitioning);
  const key=page.locator('#coolCardio');await key.scrollIntoViewIfNeeded();await key.click();
  await page.waitForFunction(()=>window.myr5TestState.phase==='tracking',null,{timeout:30000});
  await page.waitForFunction(()=>!!window.myr5Runner?.active,null,{timeout:30000});
  const run=()=>page.evaluate(()=>{const r=window.myr5Runner.active,s=r.run,st=document.querySelector('#cameraWorkout .runner-stopped');
   return {jogging:s.jogging,started:s.started,lane:s.lane,height:s.height,duck:s.duck,jumpTime:s.jumpTime,slideTime:s.slideTime,calibrated:r.body.calibrated,stopped:!!st&&!st.hidden,count:window.myr5TestState.motion?.count??null,sig:r.body.body.signals(),base:r.body.body.baseline,v:[document.querySelector('#cameraWorkout video')?.videoWidth,document.querySelector('#cameraWorkout video')?.videoHeight]};});
  const set=o=>page.evaluate(o=>{globalThis.__tread=o;},o);
  const shot=name=>page.screenshot({path:resolve(SHOTS,`treadmill-${name}-412x915.png`)});
  // Running: calibrate while bobbing, then the run starts at the one constant speed.
  await set({bob:.025});await page.waitForFunction(()=>window.myr5Runner.active.body.calibrated&&window.myr5Runner.active.run.started,null,{timeout:20000});
  {const f0=await page.evaluate(()=>window.myr5TestState.frames);await page.waitForTimeout(3000);console.log('FPS',(await page.evaluate(()=>window.myr5TestState.frames)-f0)/3);}
  await page.waitForTimeout(1500);let s=await run();assert.ok(s.jogging&&!s.stopped,'running: '+JSON.stringify(s));await shot('1-running');
  const lane0=s.lane;
  // Lean right / left: one lane each.
  await set({bob:.025,lean:1});await page.waitForFunction(l=>window.myr5Runner.active.run.lane!==l,lane0,{timeout:5000});
  s=await run();assert.equal(s.lane,Math.min(2,lane0+1),'lean right -> right lane '+JSON.stringify(s));await page.waitForTimeout(250);await shot('2-lean-right');
  await set({bob:.025});await page.waitForTimeout(900);
  await set({bob:.025,lean:-1});await page.waitForFunction(l=>window.myr5Runner.active.run.lane<l,s.lane,{timeout:5000});
  s=await run();assert.equal(s.lane,lane0,'lean left -> back '+JSON.stringify(s));await page.waitForTimeout(250);await shot('3-lean-left');
  await set({bob:.025});await page.waitForTimeout(900);
  // Arms + shoulders up: floaty jump (shot mid-hang).
  await set({bob:.025,up:true});await page.waitForFunction(()=>window.myr5Runner.active.run.jumpTime>0,null,{timeout:5000});
  await page.waitForTimeout(500);s=await run();assert.ok(s.height>.9,'mid-hang height '+JSON.stringify(s));await shot('4-jump-floaty');
  await set({bob:.025});await page.waitForTimeout(1600);
  // Crouch: slide.
  await set({bob:.025,crouch:.2});await page.waitForFunction(()=>window.myr5Runner.active.run.slideTime>0,null,{timeout:5000});
  await page.waitForTimeout(250);s=await run();assert.ok(s.duck>.8,'sliding '+JSON.stringify(s));await shot('5-crouch-slide');
  await set({bob:.025});await page.waitForTimeout(1200);
  // Stop bobbing: ~2 s later the big warning shows; bobbing again clears it.
  await set({});await page.waitForTimeout(1200);s=await run();assert.ok(!s.stopped,'not yet at 1.2 s '+JSON.stringify(s));
  await page.waitForFunction(()=>!document.querySelector('#cameraWorkout .runner-stopped').hidden,null,{timeout:4000});
  await page.waitForTimeout(300);s=await run();assert.ok(s.stopped&&!s.jogging);await shot('6-you-are-stopped');
  await set({bob:.025});await page.waitForFunction(()=>document.querySelector('#cameraWorkout .runner-stopped').hidden,null,{timeout:4000});
  s=await run();assert.ok(s.jogging,'running again '+JSON.stringify(s));
  console.log('treadmill steps counted for XP (head bob, knees hidden):',s.count);
  await page.getByRole('button',{name:'Stop workout',exact:true}).click();
  await page.waitForFunction(()=>window.myr5TestState.phase==='idle');
  await context.close();
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
});
