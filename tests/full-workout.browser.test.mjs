import {guideSeen} from './guide-seen.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {chromium} from 'playwright';
import {completeCoach} from './onboarding-fixture.mjs';

// R-1017 FULL WORKOUT: dropdown on the pod, persisted checkboxes, locks greyed, a circuit that runs the real camera start per
// exercise. Only MediaPipe is scripted; a finished set is signalled with the same myr5:set-complete event pod.mjs fires.
const FAKE_VISION=`
const pt=()=>({x:.5,y:.2,z:0,visibility:1});
function standing(){const p=Array.from({length:33},pt);for(const [s,e,w,h,k,a,x] of [[11,13,15,23,25,27,.4],[12,14,16,24,26,28,.6]]){Object.assign(p[s],{x,y:.23});Object.assign(p[e],{x,y:.34});Object.assign(p[w],{x,y:.43});Object.assign(p[h],{x,y:.43});Object.assign(p[k],{x,y:.65});Object.assign(p[a],{x,y:.9});}return p;}
export const FilesetResolver={forVisionTasks:async()=>({})};
export const PoseLandmarker={POSE_CONNECTIONS:[],createFromOptions:async()=>({detectForVideo(){return {landmarks:[standing()],worldLandmarks:[]};},close(){}})};
export class DrawingUtils{drawConnectors(){}drawLandmarks(){}}`;
const SHOTS=resolve('.r1017');

test('full workout: dropdown, locks, persistence, circuit blocks, break and summary',{timeout:240000},async()=>{
 const root=resolve('dist/client'),TYPES={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.webp':'image/webp','.glb':'model/gltf-binary'};
 const server=createServer(async(req,res)=>{
  const path=new URL(req.url,'http://local').pathname;if(path==='/__test__'){res.writeHead(200,{'Content-Type':'text/html'});res.end('<!doctype html><title>Test</title>');return;}
  if(path.startsWith('/api/')){res.writeHead(path==='/api/auth/config'?200:401,{'Content-Type':'application/json'});res.end(JSON.stringify(path==='/api/auth/config'?{enabled:false}:{error:'Sign in'}));return;}
  try{const file=resolve(root,'.'+(path==='/'?'/pose.html':path));if(!file.startsWith(root+sep))throw Error();const body=await readFile(file);res.writeHead(200,{'Content-Type':TYPES[extname(file)]||'application/octet-stream'});res.end(body);}catch{res.writeHead(404);res.end();}
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 await mkdir(SHOTS,{recursive:true});
 let browser;try{
  browser=await chromium.launch({channel:'msedge',headless:true,args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
  const context=await browser.newContext({viewport:{width:412,height:915},deviceScaleFactor:2.6,permissions:['camera'],serviceWorkers:'block'});
  const page=await context.newPage();await context.addInitScript(guideSeen);
  await page.route('**/vendor/mediapipe/0.10.14/vision_bundle.mjs',route=>route.fulfill({contentType:'text/javascript',body:FAKE_VISION}));
  await page.goto(base+'/__test__');
  // Two chosen paths (quads + martial-arts): legs, stances and boxing are open, the rest stay locked.
  await page.evaluate(async([intake,paths])=>{const [{openLocalCoach},{chooseWorkoutPaths}]=await Promise.all([import('/local-coach-runtime.mjs'),import('/chosen-styles.mjs')]);const repo=await openLocalCoach();await repo.forOwner(repo.guestOwnerId).saveSetup(intake,{startDay:'2026-09-21'});repo.close();chooseWorkoutPaths(paths);},[completeCoach(),['quads','martial-arts']]);
  await page.goto(base+'/pose.html#pod');
  await page.waitForFunction(()=>window.myr5TestState?.phase==='idle'&&window.myr5WorkoutOwner&&!window.myr5WorkoutOwner.snapshot().transitioning);

  await page.evaluate(()=>document.querySelector('.app-update-banner')?.remove());
  await page.locator('#podFullWorkout>summary').click();
  for(const id of ['legs','boxing'])await page.locator(`.fw-style[data-style="${id}"]>summary`).click();
  await page.screenshot({path:resolve(SHOTS,'circuit-1-dropdown.png')});
  await page.locator('.fw-style[data-style="boxing"]').screenshot({path:resolve(SHOTS,'switchboard-closeup.png')});
  const locked=await page.locator('.fw-row.fw-locked input').count();assert.ok(locked>0,'locked exercises are greyed');
  assert.equal(await page.locator('.fw-row.fw-locked input:not([disabled])').count(),0,'locked rows are disabled');
  assert.ok(await page.locator('.fw-row.fw-locked small').first().textContent(),'locked rows show the unlock hint');
  const total=await page.locator('.fw-row:not(.fw-locked) input').count();
  assert.equal(await page.locator('.fw-row:not(.fw-locked) input:checked').count(),total,'everything unlocked starts checked');

  // Uncheck all, then pick only two exercises in two styles; the choice survives a reload.
  await page.getByRole('button',{name:'Uncheck all'}).click();
  assert.equal(await page.locator('.fw-row input:checked').count(),0);
  await page.locator('.fw-style[data-style="legs"] input[value="squat"]').check();
  await page.locator('.fw-style[data-style="boxing"] input[value="boxing"]').check();
  await page.reload();
  await page.waitForFunction(()=>window.myr5TestState?.phase==='idle'&&window.myr5WorkoutOwner&&!window.myr5WorkoutOwner.snapshot().transitioning);
  assert.equal(await page.locator('[data-fw-status]').textContent(),'2/'+total,'selection persisted');

  await page.evaluate(()=>document.querySelector('.app-update-banner')?.remove());
  await page.locator('#podFullWorkout>summary').click();
  await page.locator('[data-fw-start]').click();
  await page.waitForFunction(()=>window.myr5TestState.phase==='tracking'||window.myr5TestState.phase==='error',null,{timeout:30000});
  assert.equal(await page.evaluate(()=>window.myr5TestState.phase),'tracking');
  const first=await page.evaluate(()=>window.myr5TestState.motion.mode);assert.ok(['squat','boxing'].includes(first));
  await page.waitForTimeout(600);await page.screenshot({path:resolve(SHOTS,'circuit-2-first-exercise.png')});

  const finishSet=mode=>page.evaluate(m=>window.dispatchEvent(new CustomEvent('myr5:set-complete',{detail:{mode:m,value:5,xp:25,earned:true}})),mode);
  await finishSet(first);
  await page.locator('#fullWorkoutHud[data-mode=break]').waitFor();
  // The real pod turns the camera off when a set finishes; here the scripted camera is stopped the same way.
  await page.evaluate(()=>{if(window.myr5Routes)window.myr5Routes.home=()=>{};document.getElementById('stop').click();});
  await page.waitForFunction(()=>window.myr5TestState.phase==='idle');
  assert.match(await page.locator('#fullWorkoutHud').textContent(),/STYLE BREAK/,'a different style next means the long break');
  await page.screenshot({path:resolve(SHOTS,'circuit-3-break.png')});
  await page.getByRole('button',{name:'Skip rest'}).click();
  await page.waitForFunction(f=>window.myr5TestState.phase==='tracking'&&window.myr5TestState.motion.mode!==f,first,{timeout:30000});
  const second=await page.evaluate(()=>window.myr5TestState.motion.mode);assert.deepEqual([first,second].sort(),['boxing','squat']);
  await finishSet(second);
  await page.locator('#fullWorkoutHud[data-mode=summary]').waitFor();
  assert.match(await page.locator('#fullWorkoutHud').textContent(),/2 of 2 exercises/);
  await page.screenshot({path:resolve(SHOTS,'circuit-4-summary.png')});
  await context.close();
 }finally{await browser?.close();server.close();}
});
