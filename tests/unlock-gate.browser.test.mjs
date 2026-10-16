import {guideSeen} from './guide-seen.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {chromium} from 'playwright';
import {completeCoach} from './onboarding-fixture.mjs';

// R-1017 unlock lane (copied harness): Cool Cardio has its own mechanical key under the pod dials. For every coach path, one tap runs the endless
// runner (no BEGIN, no library intro), and the dials come back to what the user had. Only MediaPipe is scripted.
const FAKE_VISION=`
const pt=()=>({x:.5,y:.2,z:0,visibility:1});
function standing(){const p=Array.from({length:33},pt);for(const [s,e,w,h,k,a,x] of [[11,13,15,23,25,27,.4],[12,14,16,24,26,28,.6]]){Object.assign(p[s],{x,y:.23});Object.assign(p[e],{x,y:.34});Object.assign(p[w],{x,y:.43});Object.assign(p[h],{x,y:.43});Object.assign(p[k],{x,y:.65});Object.assign(p[a],{x,y:.9});}return p;}
export const FilesetResolver={forVisionTasks:async()=>({})};
export const PoseLandmarker={POSE_CONNECTIONS:[],createFromOptions:async()=>({detectForVideo(){return {landmarks:[standing()],worldLandmarks:[]};},close(){}})};
export class DrawingUtils{drawConnectors(){}drawLandmarks(){}}`;
const SHOTS=resolve('.r1017');

test('fresh guest: BEGIN and the library explain the lock; after workout+meditation+food BEGIN runs the camera workout',{timeout:240000},async()=>{
 const root=resolve('dist/client'),TYPES={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.webp':'image/webp','.glb':'model/gltf-binary'};
 const server=createServer(async(req,res)=>{
  const path=new URL(req.url,'http://local').pathname;if(path==='/__test__'){res.writeHead(200,{'Content-Type':'text/html'});res.end('<!doctype html><title>Test</title>');return;}
  if(path.startsWith('/api/')){res.writeHead(path==='/api/auth/config'?200:401,{'Content-Type':'application/json'});res.end(JSON.stringify(path==='/api/auth/config'?{enabled:false}:{error:'Sign in'}));return;}
  try{const file=resolve(root,'.'+(path==='/'?'/pose.html':path));if(!file.startsWith(root+sep))throw Error();const body=await readFile(file);res.writeHead(200,{'Content-Type':TYPES[extname(file)]||'application/octet-stream'});res.end(body);}catch{res.writeHead(404);res.end();}
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 await mkdir(SHOTS,{recursive:true});
 let browser;try{
  browser=await chromium.launch({channel:'msedge',headless:true,args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
  const context=await browser.newContext({viewport:{width:412,height:915},deviceScaleFactor:2.6,permissions:['camera'],serviceWorkers:'block'});const page=await context.newPage();await context.addInitScript(guideSeen);
  await page.route('**/vendor/mediapipe/0.10.14/vision_bundle.mjs',route=>route.fulfill({contentType:'text/javascript',body:FAKE_VISION}));
  await page.goto(base+'/__test__');
  await page.evaluate(async intake=>{const {openLocalCoach}=await import('/local-coach-runtime.mjs');const repo=await openLocalCoach();await repo.forOwner(repo.guestOwnerId).saveSetup(intake,{startDay:'2026-09-21'});repo.close();},completeCoach());
  await page.goto(base+'/pose.html#pod');
  await page.waitForFunction(()=>window.myr5TestState?.phase==='idle'&&window.myr5WorkoutOwner&&!window.myr5WorkoutOwner.snapshot().transitioning);
  await page.locator('#start').scrollIntoViewIfNeeded();
  await page.locator('#start').click();
  const gate=page.locator('#unlockGate');await gate.waitFor({state:'visible'});
  assert.match(await gate.innerText(),/Finish a workout, a meditation and a food log to unlock every coach and workout style/);
  assert.equal(await gate.locator('li[data-done="false"]').count(),3);
  await page.screenshot({path:resolve(SHOTS,'unlock-begin-locked.png')});
  await gate.locator('[data-gate=cardio]').click();
  await page.waitForFunction(()=>window.myr5TestState.phase==='tracking'||window.myr5TestState.phase==='error',null,{timeout:30000});
  assert.equal(await page.evaluate(()=>window.myr5TestState.phase),'tracking','gate button starts Cool Cardio');
  await page.getByRole('button',{name:'Stop workout',exact:true}).click();await page.waitForFunction(()=>window.myr5TestState.phase==='idle');
  await page.evaluate(()=>document.getElementById('openLibrary').click());await page.locator('#unlockGate').waitFor({state:'visible'});
  assert.equal(await page.locator('#libraryDialog[open], dialog#library[open]').count(),0);
  await page.screenshot({path:resolve(SHOTS,'unlock-library-locked.png')});
  await page.evaluate(()=>document.getElementById('unlockGate').close());
  await page.evaluate(async()=>{const p=await import('/performance-progress.mjs');p.recordPerformanceSession({id:'s1',mode:'pushup',kind:'reps',value:5,completedAt:Date.now()});p.recordDailyActivity('meditation',{id:'m1'});p.recordDailyActivity('food',{id:'f1'});});
  await page.waitForSelector('#unlockToast');await page.screenshot({path:resolve(SHOTS,'unlock-celebration.png')});
  await page.reload();
  await page.waitForFunction(()=>window.myr5TestState?.phase==='idle'&&window.myr5WorkoutOwner&&!window.myr5WorkoutOwner.snapshot().transitioning);
  await page.evaluate(()=>document.getElementById('start').click());
  assert.equal(await page.locator('#unlockGate').count(),0,'no lock message once unlocked');
  await page.locator('#useHologram').waitFor({state:'visible',timeout:30000});await page.locator('#useHologram').click();
  await page.waitForFunction(()=>window.myr5TestState.phase==='tracking'||window.myr5TestState.phase==='error',null,{timeout:30000});
  assert.equal(await page.evaluate(()=>window.myr5TestState.phase),'tracking','BEGIN starts the camera workout after unlock');
  await page.screenshot({path:resolve(SHOTS,'unlock-begin-tracking.png')});
 }finally{await browser?.close();server.close();}
});
