// Circuit meter + voice (Rank 6): exercises circuit-ui.mjs the same way pod.mjs drives it --
// via window.coachProgress + the myr5:account-progress event -- so the test does not need a
// real signed-in account, camera, or D1 database. The account-gated server plumbing
// (server/worker.mjs's dailyCircuitProgress) is covered separately by tests/circuit.test.mjs's
// pure-function unit tests against the same rows/day shape the server query produces.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {chromium} from 'playwright';
import {completeCoach} from './onboarding-fixture.mjs';

const SHOTS=resolve('C:/Users/ianmy/Documents/Codex/2026-09-20/myr5-consolidated-implementation-and-stack-plan/worktrees/myr5-foundation/plan/reports/circuit');
const ORDER=['pushups','squats','situps','meditation','food'];
// Exact `default` lines from plan/muse/voice-lines.csv, matching circuit-ui.mjs's NEXT_LINE map.
const LINE={pushups:'Next up: pushups. Chest day energy.',squats:'Next: squats. Legs, assemble.',situps:'Situps next. Crunch time, literally.',meditation:'Next: meditation. Sit. Breathe. Done.'};

// A circuit payload shaped exactly like circuit.mjs's circuitProgress() return value (what
// server/worker.mjs's dailyCircuitProgress sends as p.circuit), for `doneCount` of the 5 fixed
// steps already done today, in order.
function circuitAt(day,doneCount){
 const stepDone=Object.fromEntries(ORDER.map((key,i)=>[key,i<doneCount]));
 const stylesStepped=[...(stepDone.pushups?['chest']:[]),...(stepDone.squats?['legs']:[])];
 return {day,tracks:{},today:{stepDone,stylesStepped,stepsToday:stylesStepped.length+(stepDone.meditation?1:0)+(stepDone.food?1:0),maxStepsToday:5,nextStep:ORDER.find(k=>!stepDone[k])??null}};
}

test('circuit meter advances per step, speaks the right line, stays silent for food, and survives reload',async()=>{
 await mkdir(SHOTS,{recursive:true});
 const root=resolve('dist/client');
 const server=createServer(async(req,res)=>{
  const path=new URL(req.url,'http://local').pathname;
  if(path==='/__test__'){res.writeHead(200,{'Content-Type':'text/html'});res.end('<!doctype html><title>Test</title>');return;}
  if(path.startsWith('/api/')){res.writeHead(path==='/api/auth/config'?200:401,{'Content-Type':'application/json'});res.end(JSON.stringify(path==='/api/auth/config'?{enabled:false}:{error:'Sign in'}));return;}
  try{const file=resolve(root,'.'+(path==='/'?'/pose.html':path));if(!file.startsWith(root+sep))throw Error();const body=await readFile(file);res.writeHead(200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png'})[extname(file)]||'application/octet-stream'});res.end(body);}catch{res.writeHead(404);res.end();}
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 let browser;try{
  browser=await chromium.launch({channel:'msedge',headless:true,args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
  const context=await browser.newContext({viewport:{width:390,height:844},permissions:['camera']}),page=await context.newPage();
  await page.route('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs',route=>route.fulfill({contentType:'text/javascript',body:`export const FilesetResolver={forVisionTasks:async()=>({})}; export const PoseLandmarker={createFromOptions:async()=>({detectForVideo:()=>({landmarks:[],worldLandmarks:[]}),close(){}})};export class DrawingUtils{}` }));
  await page.goto(base+'/__test__');
  await page.evaluate(async intake=>{const {openLocalCoach}=await import('/local-coach-runtime.mjs');const repo=await openLocalCoach();await repo.forOwner(repo.guestOwnerId).saveSetup(intake,{startDay:'2026-09-21'});repo.close();},completeCoach());
  await page.goto(base+'/pose.html');
  await page.waitForFunction(()=>window.myr5TestState?.phase==='idle');
  await page.waitForSelector('.daily-circuit');

  const day=Math.floor(Date.now()/86400000);
  const publish=p=>page.evaluate(payload=>{window.coachProgress={...window.coachProgress,circuit:payload};window.dispatchEvent(new CustomEvent('myr5:account-progress',{detail:{combat:{},completedSets:0,unlocks:{},circuit:payload}}));},p);

  // Sequential walk through all five steps: after each one completes, the meter must read the
  // new count and (except after food) the caption must hold the NEXT step's exact CSV line.
  await publish(circuitAt(day,0));
  let previousCaption=await page.locator('#coachCaption').textContent();
  for(let done=1;done<=5;done++){
   await publish(circuitAt(day,done));
   const meterValue=await page.locator('.daily-circuit meter').first().getAttribute('value');
   assert.equal(Number(meterValue),done,`meter should read ${done} of 5 after step ${done} completes`);
   await page.locator('.daily-circuit').first().screenshot({path:`${SHOTS}/${String(done).padStart(2,'0')}-after-${ORDER[done-1]}.png`});
   const completedKey=ORDER[done-1],nextKey=ORDER[done]; // undefined once done===5
   const caption=await page.locator('#coachCaption').textContent();
   if(nextKey==='food'){
    assert.equal(caption,previousCaption,'finishing meditation (next: food) must not speak -- food has no voice line');
   } else if(nextKey){
    assert.equal(caption,LINE[nextKey],`finishing ${completedKey} should announce "${nextKey}" next`);
   } else {
    assert.equal(caption,'Circuit done. Rest, champion.','finishing food (circuit complete) should speak the completion line');
   }
   previousCaption=caption;
  }

  // Kill/reopen mid-circuit: 2 of 5 steps done, mirrored into localStorage by pod.mjs's own
  // account-progress listener; reload and confirm the meter renders the cached snapshot
  // immediately, before any fresh account-progress event has a chance to fire.
  await publish(circuitAt(day,2));
  const cachedDay=await page.evaluate(()=>JSON.parse(localStorage.getItem('myr5-workout-progress-v1')).circuit.day);
  assert.equal(cachedDay,day,'the circuit snapshot must be mirrored into localStorage for offline reopen');
  await page.reload();
  await page.waitForFunction(()=>window.myr5TestState?.phase==='idle');
  await page.waitForSelector('.daily-circuit');
  const meterAfterReload=await page.locator('.daily-circuit meter').first().getAttribute('value');
  assert.equal(Number(meterAfterReload),2,'circuit meter must resume mid-circuit after app close/reopen, from the cached snapshot alone');
  await page.locator('.daily-circuit').first().screenshot({path:`${SHOTS}/06-after-reopen-mid-circuit.png`});

  // Camera-only mode must still show nothing new: the circuit card is a normal DOM sibling,
  // hidden by the existing body[data-camera-workout=true] CSS rule (camera-workout.css), not by
  // anything added in this change.
  await page.evaluate(()=>document.getElementById('useHologram').click());
  await page.waitForFunction(()=>document.body.dataset.cameraWorkout==='true',null,{timeout:20000}).catch(async error=>{throw Error(error.message+' '+JSON.stringify(await page.evaluate(()=>window.myr5TestState)));});
  const visibleOutsideCamera=await page.evaluate(()=>[...document.body.children].filter(n=>n.id!=='cameraWorkout'&&getComputedStyle(n).display!=='none').map(n=>n.tagName));
  assert.deepEqual(visibleOutsideCamera,[],'nothing new (including the circuit meter) may appear during camera-only mode');
  await page.screenshot({path:`${SHOTS}/07-camera-only-unaffected.png`});
  await context.close();
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
});
