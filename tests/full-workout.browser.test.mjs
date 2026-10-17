import {guideSeen} from './guide-seen.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {chromium} from 'playwright';
import {completeCoach} from './onboarding-fixture.mjs';

// R-1017 FULL WORKOUT: switchboard wiring, persisted controls, locks greyed, a circuit that runs the real camera start per
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
  const page=await context.newPage();page.on('pageerror',error=>console.error('Workout page error:',error.message));await context.addInitScript(guideSeen);await context.addInitScript(()=>{try{localStorage.setItem('myr5.tiltPermission','granted');}catch{}}); // tilt already allowed on this phone
  await page.route('**/vendor/mediapipe/0.10.14/vision_bundle.mjs',route=>route.fulfill({contentType:'text/javascript',body:FAKE_VISION}));
  await page.goto(base+'/__test__');
  // Two chosen paths (quads + martial-arts): legs, stances and boxing are open, the rest stay locked.
  await page.evaluate(async([intake,paths])=>{const [{openLocalCoach},{chooseWorkoutPaths}]=await Promise.all([import('/local-coach-runtime.mjs'),import('/chosen-styles.mjs')]);const repo=await openLocalCoach();await repo.forOwner(repo.guestOwnerId).saveSetup(intake,{startDay:'2026-09-21'});repo.close();chooseWorkoutPaths(paths);},[completeCoach(),['quads','martial-arts']]);
  await page.goto(base+'/pose.html#pod');
  await page.waitForFunction(()=>window.myr5TestState?.phase==='idle'&&window.myr5WorkoutOwner&&!window.myr5WorkoutOwner.snapshot().transitioning).catch(async error=>{await page.screenshot({path:resolve(SHOTS,'startup-failure.png')});console.error('Startup state:',await page.evaluate(()=>({url:location.href,phase:window.myr5TestState?.phase,text:document.body.innerText.slice(0,1600)})));throw error;});

  await page.evaluate(()=>document.querySelector('.app-update-banner')?.remove());
  await page.locator('#podFullWorkout>summary').click();
  const shot=name=>page.screenshot({path:resolve(SHOTS,name)});
  const box=async sel=>{const b=await page.locator(sel).boundingBox();return {x:b.x+b.width/2,y:b.y+b.height/2};};
  const sock=id=>box(`[data-socket="${id}"]`),plug=id=>box(`[data-plug="${id}"]`);
  await page.waitForTimeout(1200);
  assert.equal(await page.locator('[data-fw-status]').textContent(),'0 sections','switches are off');
  assert.equal(await page.locator('.fw-switches').count(),await page.locator('.fw-style').count(),'every section has a visible switch bank');
  assert.ok(await page.locator('.fw-row input:not([disabled])').count()>0,'unpowered unlocked switches can be preset');
  assert.equal(await page.locator('.fw-row.fw-locked input:not([disabled])').count(),0,'locked exercises stay locked');
  await shot('power-1-all-unplugged.png');

  const drag=async(cable,socket)=>{
   await page.evaluate(()=>document.querySelector('.fw-menu').scrollTop=0);await page.waitForTimeout(100);
   await page.locator(`[data-plug="${cable}"]`).evaluate(el=>el.scrollIntoView({block:'center'}));
   const p=await plug(cable);await page.mouse.move(p.x,p.y);await page.mouse.down();await page.mouse.move(p.x+10,p.y,{steps:3});
   await shot('power-2-mid-drag.png');
   const target=socket==='bay'?page.locator('.fw-bay'):page.locator(`[data-socket="${socket}"]`);
   await target.scrollIntoViewIfNeeded();const b=await target.boundingBox();await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:8});await page.mouse.up();await page.waitForTimeout(300);
  };
  const cables=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('myr5-full-workout-v1')||'{}').cables||{});
  await page.locator('.fw-style[data-style="legs"] input[data-k="1"]').check({force:true});
  assert.equal(await page.locator('[data-fw-status]').textContent(),'0 sections','preset before power does not energize a section');
  // Hips cable can serve an unlocked Legs socket, independently from the section switch.
  await drag('hips','legs');
  assert.equal((await cables()).hips,'legs','any cable can route to an unlocked socket');
  assert.equal(await page.locator('[data-fw-status]').textContent(),'1 section','wiring powers the preset');
  await page.locator('.fw-style[data-style="legs"] input[data-k="1"]').check({force:true});
  assert.equal(await page.locator('[data-fw-status]').textContent(),'1 section','preset can be set before power');
  // An occupied socket takes the new cable; the old cable can then be connected elsewhere.
  await drag('boxing','legs');
  assert.equal((await cables()).boxing,'legs','occupied socket accepts another cable');
  assert.equal(Object.values(await cables()).filter(socket=>socket==='legs').length,1,'occupied socket holds only one cable');
  await drag('hips','boxing');
  assert.equal((await cables()).hips,'boxing','cross-socket replacement works');
  // Drop the cable in the open bay to unplug it.
  await drag('hips','bay');
  assert.ok(!(await cables()).hips,'cable can be unplugged');
  // Restore the runner's two selected sections using each section's own cable and switch.
  await drag('hips','legs');await drag('boxing','boxing');
  await page.locator('.fw-style[data-style="legs"] input[data-k="1"]').check({force:true});
  await page.locator('.fw-style[data-style="boxing"] input[data-k="1"]').check({force:true});
  assert.equal(await page.locator('[data-fw-status]').textContent(),'2 sections');

  // Level ladder in Legs: flip 3 (cascade 1..3), then 7, then back down.
  const ladder=()=>page.evaluate(()=>[...document.querySelectorAll('.fw-style[data-style="legs"] .fw-switches input')].map(i=>i.checked?1:0).join(''));
  await page.locator('.fw-style[data-style="legs"] input[data-k="3"]').check({force:true});
  assert.equal(await ladder(),'11100000','flipping 3 engages 1..3');await page.waitForTimeout(500);await shot('ladder-1-at-3.png');
  await page.locator('.fw-style[data-style="legs"] input[data-k="7"]').check({force:true});
  await page.waitForTimeout(120);await shot('ladder-2-mid-cascade-to-7.png');
  assert.equal(await ladder(),'11111110','flipping 7 engages 1..7');await page.waitForTimeout(600);
  await page.locator('.fw-style[data-style="legs"] input[data-k="3"]').uncheck({force:true});
  assert.equal(await ladder(),'11000000','flipping 3 down drops the ladder to level 2');await page.waitForTimeout(600);await shot('ladder-3-back-to-2.png');
  await page.locator('.fw-style[data-style="boxing"] input[data-k="1"]').check({force:true});
  assert.equal(await page.locator('[data-fw-status]').textContent(),'2 sections');
  await page.waitForTimeout(500);await shot('power-3-two-rows-powered.png');

  // The cord channel is a gutter right of the labels, and the hub stays put while the board scrolls.
  assert.ok(await page.evaluate(()=>{const y=[...document.querySelectorAll('[data-anchor]')].map(e=>e.getBoundingClientRect().top);return y.length>1&&Math.max(...y)-Math.min(...y)<4;}),'all cable anchors form a row across the top');
  // Tilt: stub the orientation event; the loose cables swing toward the new down.
  await page.evaluate(()=>{document.querySelector('.fw-menu').scrollTop=0;});
  const tilt=g=>page.evaluate(gamma=>{clearInterval(window.__tilt);window.__tilt=setInterval(()=>window.dispatchEvent(new DeviceOrientationEvent('deviceorientation',{beta:45,gamma,alpha:0})),30);},g); // a phone streams readings
  const dropX=()=>page.evaluate(()=>{const state=JSON.parse(localStorage.getItem('myr5-full-workout-v1')||'{}'),wired=new Set(Object.keys(state.cables||{}));const xs=[...document.querySelectorAll('[data-plug]')].filter(p=>!wired.has(p.dataset.plug)).map(p=>p.getBoundingClientRect().x);return xs.reduce((t,x)=>t+x,0)/xs.length;});
  const rest=await dropX();await tilt(40);await page.waitForTimeout(1800);const right=await dropX();await shot('power-4-tilt-right.png');
  await tilt(-40);await page.waitForTimeout(2200);const left=await dropX();await shot('power-5-tilt-left.png');
  assert.ok(right>rest+8&&left<rest-8,`loose plug swings with tilt: ${left} ${rest} ${right}`);
  await tilt(0);await page.evaluate(()=>clearInterval(window.__tilt));

  // Locked exercises remain guarded regardless of cable routing.
  await page.locator('.fw-style[data-style="hips"]').scrollIntoViewIfNeeded();
  assert.equal(await page.locator('[data-socket="hips"]').getAttribute('data-locked'),'true','locked socket exposes the exercise lock');
  assert.ok((await page.locator('.fw-style[data-style="hips"] .fw-hint').textContent()).length>5);
  await page.locator('.fw-style[data-style="hips"]').scrollIntoViewIfNeeded();await shot('power-6-locked-row.png');
  assert.equal(await page.locator('.fw-row.fw-locked input:not([disabled])').count(),0,'locked rows are disabled');
  await page.reload();
  await page.waitForFunction(()=>window.myr5TestState?.phase==='idle'&&window.myr5WorkoutOwner&&!window.myr5WorkoutOwner.snapshot().transitioning);
  await page.locator('#podFullWorkout>summary').click({force:true});
  assert.equal(await page.locator('[data-fw-status]').textContent(),'2 sections','plugs and levels persisted');
  assert.equal(await ladder(),'11000000');
  assert.deepEqual(await cables(),{hips:'legs',boxing:'boxing'},'cross-socket mapping persisted across reload');

  await page.evaluate(()=>document.querySelector('.app-update-banner')?.remove());
  await page.locator('[data-fw-start]').click();
  await page.waitForFunction(()=>window.myr5TestState.phase==='tracking'||window.myr5TestState.phase==='error',null,{timeout:30000});
  assert.equal(await page.evaluate(()=>window.myr5TestState.phase),'tracking');
  const first=await page.evaluate(()=>window.myr5TestState.motion.mode);assert.ok(['squat','jab-left'].includes(first));
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
  const second=await page.evaluate(()=>window.myr5TestState.motion.mode);assert.deepEqual([first,second].sort(),['jab-left','squat']);
  await finishSet(second);
  await page.locator('#fullWorkoutHud[data-mode=summary]').waitFor();
  assert.match(await page.locator('#fullWorkoutHud').textContent(),/2 of 2 exercises/);
  await page.screenshot({path:resolve(SHOTS,'circuit-4-summary.png')});
  // Older releases stored only powered sections and levels; migrate powered sections to identity wiring.
  await page.evaluate(()=>localStorage.setItem('myr5-full-workout-v1',JSON.stringify({powered:['legs'],levels:{legs:2}})));
  await page.reload();
  await page.waitForFunction(()=>window.myr5TestState?.phase==='idle'&&window.myr5WorkoutOwner&&!window.myr5WorkoutOwner.snapshot().transitioning);
  await page.locator('#podFullWorkout>summary').click({force:true});
  assert.equal(await page.locator('[data-fw-status]').textContent(),'1 section','legacy powered section restores');
  await page.locator('.fw-style[data-style="legs"] input[data-k="3"]').check({force:true});
  assert.deepEqual(await cables(),{legs:'legs'},'legacy powered section saves identity wiring');
  await context.close();
 }finally{await browser?.close();server.close();}
});
