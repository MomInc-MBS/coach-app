import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {chromium} from 'playwright';
import {completeCoach} from './onboarding-fixture.mjs';
import {guideSeen} from './guide-seen.mjs';

// Synthetic MediaPipe fixture drives the actual application route. It does not
// claim camera accuracy; the full position check still runs in the app.
const trackerModule=`export const FilesetResolver={forVisionTasks:async()=>({})};
export const PoseLandmarker={POSE_CONNECTIONS:[],createFromOptions:async()=>({detectForVideo(){
 window.__flightFrames=(window.__flightFrames||0)+1;
 if(window.__flightMissing)return {landmarks:[],worldLandmarks:[]};
 const stage=window.__flightStage||window.myr5TestState?.motion?.flightPose?.stage||'ready';
 let y={high:.38,low:.60,left:.38,right:.38,mid:.49,'mixed-left':.49,'mixed-right':.49,bottom:.78,ready:.49}[stage]??.49;
 let lean={left:.065,right:-.065,'mixed-left':.055,'mixed-right':-.055}[stage]??0;
 if(stage==='ready'){
  const target=window.myr5PlankFlight?.active?.run?.pace?.target;
  if(target){y=target.y>=.5?.49-(target.y-.5)*.22:.78-target.y*.58;lean=-target.x/.8*.065;}
 }
 const p=Array.from({length:33},()=>({x:.5,y:.5,visibility:.99})),w=Array.from({length:33},()=>({x:0,y:0,z:0}));
 for(const[s,e,h,hip,k,sign]of[[11,13,15,23,25,1],[12,14,16,24,26,-1]]){
  p[s]={x:.5+sign*.12+lean,y,visibility:.99};p[e]={x:.5+sign*.17+lean*.4,y:(y+.78)/2,visibility:.99};p[h]={x:.5+sign*.18,y:.78,visibility:.99};p[hip]={x:.5+sign*.07+lean*.3,y:y-.10,visibility:.99};p[k]={x:.5+sign*.035,y:y-.18,visibility:.99};
  w[s]={x:sign*.2,y:-.3,z:-.5};w[e]={x:sign*.24,y:-.15,z:-.52};w[h]={x:sign*.27,y:0,z:-.55};w[hip]={x:sign*.16,y:-.3,z:0};w[k]={x:sign*.13,y:-.3,z:.45};
 }
 return {landmarks:[p],worldLandmarks:[w]};},close(){}})};export class DrawingUtils{drawConnectors(){} drawLandmarks(){}};`;
const EXPECTED=['tropical','castle','rainbow','loopway','laboratory','asteroid'];
const FOREIGN=/\b(Crash Bandicoot|Crash 4|Mario Kart|Sonic(?: the Hedgehog)?|Star Wars|TIE fighter|Jetpack Joyride)\b/i;
const TYPES={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.wasm':'application/wasm','.webmanifest':'application/manifest+json','.woff2':'font/woff2'};

function serve(){
 const root=resolve('dist/client');
 return createServer(async(req,res)=>{
  const path=new URL(req.url,'http://local').pathname;
  if(path==='/__test__'){res.writeHead(200,{'Content-Type':'text/html'});res.end('<!doctype html><title>Plank Flight test fixture</title>');return;}
  if(path.startsWith('/api/')){res.writeHead(path==='/api/auth/config'?200:401,{'Content-Type':'application/json'});res.end(JSON.stringify(path==='/api/auth/config'?{enabled:false}:{error:'Sign in'}));return;}
  try{const file=resolve(root,'.'+(path==='/pose'?'/pose.html':path));if(!file.startsWith(root+sep))throw Error();const body=await readFile(file);res.writeHead(200,{'Content-Type':TYPES[extname(file)]||'application/octet-stream'});res.end(body);}catch{res.writeHead(404);res.end();}
 });
}
async function waitFrames(page,count=2){
 const before=await page.evaluate(()=>window.__flightFrames||0);
 await page.waitForFunction(({before,count})=>(window.__flightFrames||0)>=before+count,{before,count},{timeout:10000});
}
async function paint(page){await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));}
async function advanceToPortal(page){
 const result=await page.evaluate(async()=>{
  const {advanceFlight}=await import('/arcade/plank-flight/sim.mjs');
  const run=window.myr5PlankFlight?.active?.run;if(!run)throw Error('No active Plank Flight run');
  // Integration-only boundary jump: full 90-second route timing and automatic
  // sections are covered by sim tests. Here, advance the actual app runtime
  // through the final quarter-second using the public sim API.
  run.time=run.biomeStartedAt+89.75;run.accumulator=0;
  advanceFlight(run,.5,{valid:true,height01:run.y??.5,steer:run.x??0,resting:false});
  const pose=window.myr5TestState?.motion?.flightPose;
  return {phase:run.phase,time:run.time,biome:run.biome,pose:{stage:pose?.stage,valid:pose?.controlValid,calibrated:pose?.calibrated,reason:pose?.reason},renderStats:window.myr5PlankFlight?.active?.renderStats};
 });
 assert.equal(result.phase,'portal',`actual app entered biome portal: ${JSON.stringify(result)}`);
 await page.waitForFunction(()=>window.myr5PlankFlight?.active?.run?.phase==='portal'&&document.querySelector('.pf-panel[data-view="portal"]')?.hidden===false,null,{timeout:10000});
 return result;
}
test('Plank Flight six biomes, auto sections, and rest portal work in the actual app',{timeout:240000},async()=>{
 const localServer=serve();await new Promise(r=>localServer.listen(0,'127.0.0.1',r));
 let browser,page;
 try{
  browser=await chromium.launch({channel:'msedge',headless:true,args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
  const context=await browser.newContext({viewport:{width:375,height:812},permissions:['camera'],serviceWorkers:'block'});
  await context.addInitScript(()=>Object.defineProperty(navigator,'standalone',{configurable:true,value:true}));
  await context.addInitScript(guideSeen);page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.stack??e.message));
  await page.route('**/vendor/mediapipe/0.10.14/vision_bundle.mjs',route=>route.fulfill({contentType:'text/javascript',body:trackerModule}));
  const external=process.env.PLANK_LIVE_URL;const base=external||`http://127.0.0.1:${localServer.address().port}`;
  await page.goto(base+(external?'/privacy.html':'/__test__'));
  await page.evaluate(async intake=>{const{openLocalCoach}=await import('/local-coach-runtime.mjs');const repo=await openLocalCoach();await repo.forOwner(repo.guestOwnerId).saveSetup(intake,{startDay:'2026-09-21'});repo.close();const{chooseWorkoutPaths}=await import('/chosen-styles.mjs');chooseWorkoutPaths(['yoga','chest']);},completeCoach());
  await page.goto(base+'/pose#pod');
  await page.waitForFunction(()=>window.myr5TestState?.phase==='idle'&&window.myr5WorkoutOwner&&!window.myr5WorkoutOwner.snapshot().transitioning);
  await page.evaluate(async()=>{const{chooseWorkoutPaths}=await import('/chosen-styles.mjs');chooseWorkoutPaths(['yoga','chest'],{reset:true});});
  await page.locator('#plankFlight').click();
  await page.waitForFunction(()=>!!window.myr5PlankFlight?.active);
  await page.getByRole('button',{name:'Begin flight',exact:true}).click();
  await page.waitForFunction(()=>window.myr5PlankFlight?.active?.run?.phase==='flying',null,{timeout:45000});
  await page.waitForFunction(()=>window.myr5TestState.motion.flightPose?.calibrated===true,null,{timeout:20000});
  await page.waitForFunction(()=>window.myr5PlankFlight.active.run.biomes===true&&window.myr5PlankFlight.active.run.biome?.id==='tropical');
  console.info('calibration complete; entering six-biome route');
  const bodyText=()=>page.locator('.plank-flight').innerText();
  const checkNoForeignLabels=async()=>assert.doesNotMatch(await bodyText(),FOREIGN,'player-facing text must not use other game IP labels');

  for(let index=0;index<EXPECTED.length;index++){
   const id=EXPECTED[index];
   console.info(`begin biome ${id}:`,await page.evaluate(()=>({phase:window.myr5PlankFlight?.active?.run?.phase,trackerFrames:window.__flightFrames,pose:window.myr5TestState?.motion?.flightPose?.reason})));
   await page.waitForFunction(expected=>window.myr5PlankFlight?.active?.run?.phase==='flying'&&window.myr5PlankFlight.active.run.biome?.id===expected,id);
   await page.waitForFunction(expected=>document.querySelector('.plank-flight')?.dataset.biome===expected,id);
   await checkNoForeignLabels();
   const end=await advanceToPortal(page);
   assert.equal((await page.locator('[data-biome-name]').textContent()).trim(),end.biome.name);
   await checkNoForeignLabels();
   console.info(`biome ${id}: actual app reached portal`);

   if(index===0){
    const before=await page.evaluate(()=>window.myr5TestState.motion.totalHold);
    assert.equal(await page.evaluate(()=>window.myr5PlankFlight.active.creditAllowed),false,'fitness credit is disabled in the shake-out portal');
    await page.evaluate(()=>{window.__flightStage='mixed-left';});await waitFrames(page,3);
    await page.evaluate(()=>{window.__flightStage='mixed-right';});await waitFrames(page,3);
    await page.evaluate(()=>{window.__flightMissing=true;});await waitFrames(page,2);
    await page.evaluate(async()=>{const{advanceFlight}=await import('/arcade/plank-flight/sim.mjs');const run=window.myr5PlankFlight.active.run;for(let i=0;i<4;i++)advanceFlight(run,.75,{valid:false});});
    assert.equal(await page.evaluate(()=>window.myr5PlankFlight.active.creditAllowed),false);
    const during=await page.evaluate(()=>window.myr5TestState.motion.totalHold);
    assert.ok(Math.abs(during-before)<.25,`arm movement / missing tracking during rest adds no hold credit (${before} -> ${during})`);
    await page.evaluate(()=>{window.__flightMissing=false;delete window.__flightStage;});await waitFrames(page,3);
   }else{
    await page.evaluate(async()=>{const{advanceFlight}=await import('/arcade/plank-flight/sim.mjs');const run=window.myr5PlankFlight.active.run;for(let i=0;i<4;i++)advanceFlight(run,.75,{valid:false});});
   }
   await page.waitForFunction(()=>{const b=document.querySelector('[data-act="continue-biome"]');return b&&!b.disabled;});
   if(index<EXPECTED.length-1){
    await page.getByRole('button',{name:'Continue to next biome',exact:true}).click();
    await page.waitForFunction(expected=>window.myr5PlankFlight?.active?.run?.biome?.id===expected,EXPECTED[index+1],{timeout:10000});
    await page.waitForFunction(()=>window.myr5PlankFlight?.active?.run?.phase==='flying',null,{timeout:15000});
    assert.equal(await page.evaluate(()=>window.myr5TestState.motion.flightPose?.calibrated),true,'portal continuation preserves the verified position calibration');
    console.info(`continued into ${EXPECTED[index+1]}`);
   }else{
    await page.getByRole('button',{name:'End workout and turn camera off',exact:true}).click();
    await page.waitForFunction(()=>window.myr5TestState?.phase==='idle',null,{timeout:15000});
    assert.equal(await page.locator('.plank-flight').count(),0,'ending at the final portal removes the flight UI');
    assert.equal(await page.evaluate(()=>document.querySelector('#v')?.srcObject??null),null,'ending at the final portal turns the camera off');
   }
  }
  const flightErrors=errors.filter(e=>/plank|flight|biome|undefined.*(?:run|pose)/i.test(e));
  assert.deepEqual(flightErrors,[],errors.join('\n'));
 } catch(error) {
  const diagnostic=await page?.evaluate(()=>({phase:window.myr5PlankFlight?.active?.run?.phase,biome:window.myr5PlankFlight?.active?.run?.biome,pose:window.myr5TestState?.motion?.flightPose,trackerFrames:window.__flightFrames,renderStats:window.myr5PlankFlight?.active?.renderStats,visibleText:document.querySelector('.plank-flight')?.innerText?.slice(0,1200)})).catch(()=>null);
  console.error('Plank Flight browser failure state:',JSON.stringify(diagnostic));
  throw error;
 } finally {await browser?.close();await new Promise(r=>localServer.close(r));}
});
