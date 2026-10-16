import {guideSeen} from './guide-seen.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {chromium} from 'playwright';
import {completeCoach} from './onboarding-fixture.mjs';

// R-1016: Cool Cardio has its own mechanical key under the pod dials. For every coach path, one tap runs the endless
// runner (no BEGIN, no library intro), and the dials come back to what the user had. Only MediaPipe is scripted.
const FAKE_VISION=`
const pt=()=>({x:.5,y:.2,z:0,visibility:1});
function standing(){const p=Array.from({length:33},pt);for(const [s,e,w,h,k,a,x] of [[11,13,15,23,25,27,.4],[12,14,16,24,26,28,.6]]){Object.assign(p[s],{x,y:.23});Object.assign(p[e],{x,y:.34});Object.assign(p[w],{x,y:.43});Object.assign(p[h],{x,y:.43});Object.assign(p[k],{x,y:.65});Object.assign(p[a],{x,y:.9});}return p;}
export const FilesetResolver={forVisionTasks:async()=>({})};
export const PoseLandmarker={POSE_CONNECTIONS:[],createFromOptions:async()=>({detectForVideo(){return {landmarks:[standing()],worldLandmarks:[]};},close(){}})};
export class DrawingUtils{drawConnectors(){}drawLandmarks(){}}`;
const SHOTS=resolve('.r1016');

test('Cool Cardio key sits under the level dial and runs the endless runner on any coach path',{timeout:240000},async()=>{
 const root=resolve('dist/client'),TYPES={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.webp':'image/webp','.glb':'model/gltf-binary'};
 const server=createServer(async(req,res)=>{
  const path=new URL(req.url,'http://local').pathname;if(path==='/__test__'){res.writeHead(200,{'Content-Type':'text/html'});res.end('<!doctype html><title>Test</title>');return;}
  if(path.startsWith('/api/')){res.writeHead(path==='/api/auth/config'?200:401,{'Content-Type':'application/json'});res.end(JSON.stringify(path==='/api/auth/config'?{enabled:false}:{error:'Sign in'}));return;}
  try{const file=resolve(root,'.'+(path==='/'?'/pose.html':path));if(!file.startsWith(root+sep))throw Error();const body=await readFile(file);res.writeHead(200,{'Content-Type':TYPES[extname(file)]||'application/octet-stream'});res.end(body);}catch{res.writeHead(404);res.end();}
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 await mkdir(SHOTS,{recursive:true});
 let browser;try{
  browser=await chromium.launch({channel:'msedge',headless:true,args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
  for(const {name,paths,mode,size} of [
   {name:'chest-yoga',paths:['chest','yoga'],mode:'pushup',size:{width:375,height:812}},
   {name:'quads-martial',paths:['quads','martial-arts'],mode:'boxing',size:{width:412,height:915}},
  ]){
   const context=await browser.newContext({viewport:size,permissions:['camera'],serviceWorkers:'block'});const page=await context.newPage();await context.addInitScript(guideSeen);
   await page.route('**/vendor/mediapipe/0.10.14/vision_bundle.mjs',route=>route.fulfill({contentType:'text/javascript',body:FAKE_VISION}));
   await page.goto(base+'/__test__');
   await page.evaluate(async ([intake,paths])=>{const [{openLocalCoach},{chooseWorkoutPaths}]=await Promise.all([import('/local-coach-runtime.mjs'),import('/chosen-styles.mjs')]);const repo=await openLocalCoach();await repo.forOwner(repo.guestOwnerId).saveSetup(intake,{startDay:'2026-09-21'});repo.close();chooseWorkoutPaths(paths);},[completeCoach(),paths]);
   await page.goto(base+'/pose.html#pod');
   await page.waitForFunction(()=>window.myr5TestState?.phase==='idle'&&window.myr5WorkoutOwner&&!window.myr5WorkoutOwner.snapshot().transitioning);
   await page.evaluate(m=>{const s=document.getElementById('movement');s.value=m;s.dispatchEvent(new Event('change',{bubbles:true}));},mode);
   const key=page.locator('#coolCardio');await key.scrollIntoViewIfNeeded();
   const box=await page.evaluate(()=>{const r=id=>document.getElementById(id).getBoundingClientRect(),k=r('coolCardio'),d=r('difficultySlider'),b=r('start');return {keyTop:k.top,dialBottom:d.bottom,keyH:k.height,keyW:k.width,keyBottom:k.bottom,beginBottom:b.bottom,vh:innerHeight};});
   assert.ok(box.keyTop>=box.dialBottom,name+': key is under the level dial '+JSON.stringify(box));
   assert.ok(box.keyH>=44&&box.keyW>=44,name+': 44px target');
   assert.equal(await key.getAttribute('aria-label'),'Start endless Cool Cardio runner');
   await page.evaluate(()=>document.getElementById('start').scrollIntoView({block:'end'}));
   assert.equal(await page.locator('#start').isVisible(),true,name+': BEGIN still on the page');
   await key.scrollIntoViewIfNeeded();await page.screenshot({path:resolve(SHOTS,`cool-cardio-key-${name}-${size.width}x${size.height}.png`)});
   const before=await page.evaluate(()=>({movement:document.getElementById('movement').value,paths:localStorage.length,k:Object.keys(localStorage).sort().join()}));
   await key.click();
   await page.waitForFunction(()=>window.myr5TestState.phase==='tracking'||window.myr5TestState.phase==='error',null,{timeout:30000});
   const seen=await page.evaluate(()=>({phase:window.myr5TestState.phase,error:window.myr5TestState.error,mode:window.myr5TestState.motion?.mode}));
   assert.equal(seen.phase,'tracking',name+': '+JSON.stringify(seen));assert.equal(seen.mode,'jogging');
   await page.waitForFunction(()=>!!window.myr5Runner?.active,null,{timeout:30000}).catch(async()=>{await page.evaluate(()=>window.dispatchEvent(new CustomEvent('myr5:pose',{detail:{}})));});
   await page.waitForFunction(()=>!!window.myr5Runner?.active,null,{timeout:30000});
   await page.waitForTimeout(800);await page.screenshot({path:resolve(SHOTS,`cool-cardio-running-${name}-${size.width}x${size.height}.png`)});
   await page.getByRole('button',{name:'Stop workout',exact:true}).click();
   await page.waitForFunction(()=>window.myr5TestState.phase==='idle');
   await page.waitForFunction(m=>document.getElementById('movement').value===m,mode,{timeout:5000}).catch(async e=>{throw Error(JSON.stringify(await page.evaluate(()=>({m:document.getElementById('movement').value,ph:window.myr5TestState.phase,tr:document.body.dataset.tracking,h:location.hash}))));});
   assert.deepEqual(await page.evaluate(async()=>(await import('/chosen-styles.mjs')).readSelectedTracks()),paths,name+': saved paths unchanged');
   await context.close();
  }
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
});
