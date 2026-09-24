import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {chromium} from 'playwright';
import {completeCoach} from './onboarding-fixture.mjs';

// Hotfix 2026-09-23 (reps not counting on the live app). The real production start path runs unchanged:
// BEGIN (or the portal square) -> hologram Begin -> camera -> tracker loop -> movement engine -> counter.
// Only MediaPipe is scripted: detectForVideo returns a timed landmark sequence (start pose, then reps),
// optionally blocking the main thread like a phone's CPU inference (window.fakePose.ms per update).
const FAKE_VISION=`
const pt=()=>({x:.5,y:.2,z:0,visibility:1});
function standing(){const p=Array.from({length:33},pt);for(const [s,e,w,h,k,a,x] of [[11,13,15,23,25,27,.4],[12,14,16,24,26,28,.6]]){Object.assign(p[s],{x,y:.23});Object.assign(p[e],{x,y:.34});Object.assign(p[w],{x,y:.43});Object.assign(p[h],{x,y:.43});Object.assign(p[k],{x,y:.65});Object.assign(p[a],{x,y:.89});}return p;}
function squat(){const p=standing();for(const [s,h,k] of [[11,23,25],[12,24,26]]){p[s].x-=.08;p[s].y=.41;p[h].x-=.07;p[h].y=.60;p[k].x+=.10;p[k].y=.69;}return p;}
function pushup(down){const p=standing();for(const [s,e,w,h,k,a,d] of [[11,13,15,23,25,27,0],[12,14,16,24,26,28,.025]]){Object.assign(p[s],{x:down?.15:.25,y:(down?.60:.45)+d});Object.assign(p[e],{x:down?.27:.25,y:(down?.65:.59)+d});Object.assign(p[w],{x:.25,y:.78+d});Object.assign(p[h],{x:.53,y:(down?.56:.5)+d});Object.assign(p[k],{x:.67,y:.52+d});Object.assign(p[a],{x:.8,y:.54+d});}return p;}
// Hold the start pose until the engine has its baseline (page start-up can stall for seconds while the
// coach loads), then run reps: half seconds down, half seconds up.
let reps=null;
function pose(now){
 const {kind='squat',half=.8}=window.fakePose||{},top=kind==='pushup'?pushup(false):standing(),bottom=kind==='pushup'?pushup(true):squat();
 if(!window.myr5TestState?.motion?.calibrated){reps=null;return top;}
 reps??=now;return Math.floor((now-reps)/1000/half)%2?top:bottom;
}
export const FilesetResolver={forVisionTasks:async()=>({})};
export const PoseLandmarker={POSE_CONNECTIONS:[],createFromOptions:async()=>({detectForVideo(video,now){const end=performance.now()+(window.fakePose?.ms||0);while(performance.now()<end);return {landmarks:[pose(now)],worldLandmarks:[]};},close(){}})};
export class DrawingUtils{drawConnectors(){}drawLandmarks(){}}`;

test('camera workouts count reps through the real start paths, including at a phone-like 1.6 updates/s',{timeout:240000},async()=>{
 const root=resolve('dist/client');
 const server=createServer(async(req,res)=>{
  const path=new URL(req.url,'http://local').pathname;if(path==='/__test__'){res.writeHead(200,{'Content-Type':'text/html'});res.end('<!doctype html><title>Test</title>');return;}
  if(path.startsWith('/api/')){res.writeHead(path==='/api/auth/config'?200:401,{'Content-Type':'application/json'});res.end(JSON.stringify(path==='/api/auth/config'?{enabled:false}:{error:'Sign in'}));return;}
  try{const file=resolve(root,'.'+(path==='/'?'/pose.html':path));if(!file.startsWith(root+sep))throw Error();const body=await readFile(file);res.writeHead(200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png','.glb':'model/gltf-binary','.webp':'image/webp'})[extname(file)]||'application/octet-stream'});res.end(body);}catch{res.writeHead(404);res.end();}
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 let browser;try{
  browser=await chromium.launch({channel:'msedge',headless:true,args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
  let page;const select=mode=>page.evaluate(mode=>{const s=document.getElementById('movement');s.value=mode;s.dispatchEvent(new Event('change',{bubbles:true}));},mode);
  for(const {name,mode,fake,choose,begin='button'} of [
   {name:'squat via BEGIN',mode:'squat',fake:{kind:'squat'},choose:()=>select('squat')},
   {name:'push-up via BEGIN at 1.6 updates/s',mode:'pushup',fake:{kind:'pushup',ms:600,half:1.5},choose:()=>select('pushup')},
   // Control board (#106): the LEVEL knob steps Legs from Bodyweight squat to Wide squat.
   {name:'wide squat picked on the LEVEL knob',mode:'wide-squat',fake:{kind:'squat'},choose:async()=>{await select('squat');await page.locator('#difficultySlider').press('ArrowRight');}},
   {name:'squat via the portal square',mode:'squat',fake:{kind:'squat'},choose:()=>select('squat'),begin:'portal'},
  ]){
   // A fresh profile per case: one set's workout lease never leaks into the next.
   const context=await browser.newContext({viewport:{width:375,height:812},permissions:['camera']});page=await context.newPage();
   await page.route('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs',route=>route.fulfill({contentType:'text/javascript',body:FAKE_VISION}));
   await page.goto(base+'/__test__');await page.evaluate(async intake=>{const {openLocalCoach}=await import('/local-coach-runtime.mjs');const repo=await openLocalCoach();await repo.forOwner(repo.guestOwnerId).saveSetup(intake,{startDay:'2026-09-21'});repo.close();localStorage.setItem('myr5-downloads-seen','1');},completeCoach());
   await page.goto(base+'/pose.html?case='+mode+'-'+begin+(begin==='portal'?'':'#pod'));
   await page.waitForFunction(()=>window.myr5TestState?.phase==='idle'&&window.myr5WorkoutOwner&&!window.myr5WorkoutOwner.snapshot().transitioning);
   await page.evaluate(fake=>{window.fakePose=fake;},fake);
   if(begin==='portal'){await page.evaluate(()=>window.myr5Menus.portal());await page.waitForFunction(()=>window.myr5Portal&&!document.querySelector('#portalHome')?.hidden);}
   await choose();
   assert.equal(await page.evaluate(()=>document.getElementById('movement').value),mode,name);
   await page.evaluate(begin=>begin==='portal'?window.myr5Portal.open('rect'):document.getElementById('start').click(),begin);
   await page.waitForFunction(()=>document.getElementById('library').open,null,{timeout:30000});
   await page.evaluate(()=>document.getElementById('useHologram').click());
   await page.waitForFunction(()=>window.myr5TestState.phase==='tracking'||window.myr5TestState.phase==='error',null,{timeout:20000});
   await page.waitForFunction(()=>window.myr5TestState.motion.count>=2||window.myr5TestState.phase!=='tracking',null,{timeout:30000}).catch(()=>{});
   const seen=await page.evaluate(()=>({phase:window.myr5TestState.phase,error:window.myr5TestState.error,mode:window.myr5TestState.motion.mode,count:window.myr5TestState.motion.count,rate:window.myr5TestState.rate,message:window.myr5TestState.motion.message}));
   assert.ok(seen.count>=2,name+': '+JSON.stringify(seen));assert.equal(seen.mode,mode,name);
   await page.waitForFunction(()=>/^0[2-9] reps$/.test(document.querySelector('#cameraWorkout #primary')?.getAttribute('aria-label')),null,{timeout:5000});
   await page.getByRole('button',{name:'Stop workout',exact:true}).click();
   await page.waitForFunction(()=>window.myr5TestState.phase==='idle');await context.close();
  }
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
});
