import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {chromium} from 'playwright';
import {completeCoach} from './onboarding-fixture.mjs';

// The camera workout wears the MOM Inc metal housing + neon strip as an edge frame, built inside #cameraWorkout (no #portalChrome).
test('camera workout shows the housing around the edge, keeps counter/stop usable, and removes it on stop',async()=>{
 const root=resolve('dist/client');
 const server=createServer(async(req,res)=>{
  const path=new URL(req.url,'http://local').pathname;if(path==='/__test__'){res.writeHead(200,{'Content-Type':'text/html'});res.end('<!doctype html><title>Test</title>');return;}
  if(path.startsWith('/api/')){res.writeHead(path==='/api/auth/config'?200:401,{'Content-Type':'application/json'});res.end(JSON.stringify(path==='/api/auth/config'?{enabled:false}:{error:'Sign in'}));return;}
  try{const file=resolve(root,'.'+(path==='/'?'/pose.html':path));if(!file.startsWith(root+sep))throw Error();const body=await readFile(file);res.writeHead(200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png'})[extname(file)]||'application/octet-stream'});res.end(body);}catch{res.writeHead(404);res.end();}
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 let browser;try{
  browser=await chromium.launch({channel:'msedge',headless:true,args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});const context=await browser.newContext({viewport:{width:375,height:812},permissions:['camera'],serviceWorkers:'block'}),page=await context.newPage();
  await page.route('**/vendor/mediapipe/0.10.14/vision_bundle.mjs',route=>route.fulfill({contentType:'text/javascript',body:`export const FilesetResolver={forVisionTasks:async()=>({})}; export const PoseLandmarker={createFromOptions:async()=>({detectForVideo:()=>({landmarks:[],worldLandmarks:[]}),close(){}})};export class DrawingUtils{}` }));
  await page.goto(base+'/__test__');await page.evaluate(async intake=>{const {openLocalCoach}=await import('/local-coach-runtime.mjs');const repo=await openLocalCoach();await repo.forOwner(repo.guestOwnerId).saveSetup(intake,{startDay:'2026-09-21'});repo.close();localStorage.setItem('myr5.portalStrip','#22ccaa');},completeCoach());
  await page.goto(base+'/pose.html');await page.waitForFunction(()=>window.myr5TestState?.phase==='idle'&&window.myr5WorkoutOwner&&!window.myr5WorkoutOwner.snapshot().transitioning);
  assert.equal(await page.locator('#cameraWorkout .portal-frame').count(),0,'no frame before the camera starts');
  await page.evaluate(()=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());document.getElementById('useHologram').click();});
  await page.waitForFunction(()=>document.body.dataset.cameraWorkout==='true');
  await page.waitForSelector('#cameraWorkout .portal-frame',{state:'attached'});
  await page.waitForFunction(()=>getComputedStyle(document.querySelector('#cameraWorkout .portal-frame')).position==='absolute'&&document.styleSheets.length>1);
  await mkdir('.frames',{recursive:true});
  for(const size of [{width:375,height:812},{width:375,height:667}]){
   await page.setViewportSize(size);
   const r=await page.evaluate(({width,height})=>{
    const stage=document.getElementById('cameraWorkout');stage.inert=false;/* idle portal may still hold it inert because this test starts the camera directly */const frame=stage.querySelector('.portal-frame').getBoundingClientRect(),housing=stage.querySelector('.camera-workout-housing'),count=stage.querySelector('#primary').getBoundingClientRect(),overlay=document.getElementById('coachOverlay');
    const mid=document.elementFromPoint(width/2,height/2),cr=stage.querySelector('.camera-workout-counter').getBoundingClientRect(),hit=document.elementFromPoint(cr.x+cr.width/2,cr.y+cr.height/2);
    const aura=getComputedStyle(stage.querySelector('.portal-standalone-aura'));
    return {frame:{x:frame.x,y:frame.y,right:frame.right,bottom:frame.bottom},housingPointer:getComputedStyle(housing).pointerEvents,mid:!mid?.closest('.camera-workout-housing'),hitStop:!!hit?.closest('.camera-workout-counter'),dbg:{hit:hit?.tagName+'.'+hit?.id+'.'+hit?.className,inert:stage.inert,bodyInert:document.body.inert,pe:getComputedStyle(stage.querySelector('.camera-workout-counter')).pointerEvents,z:[...document.elementsFromPoint(cr.x+cr.width/2,cr.y+cr.height/2)].map(e=>e.tagName+'.'+e.id)},countInside:count.x>=frame.x&&count.right<=frame.right&&count.y>=frame.y,overlayPointer:getComputedStyle(overlay).pointerEvents,portalChrome:!!stage.querySelector('#portalChrome')||!!stage.closest('#portalChrome'),aura:aura.getPropertyValue('--aura').trim()||stage.querySelector('.portal-standalone-aura').style.getPropertyValue('--aura'),other:[...document.body.children].filter(n=>n.id!=='cameraWorkout'&&getComputedStyle(n).display!=='none').map(n=>n.tagName)};
   },size);
   assert.deepEqual(r.frame,{x:15,y:15,right:size.width-15,bottom:size.height-15});
   assert.equal(r.housingPointer,'none');assert.equal(r.mid,true,'nothing from the frame over the middle of the video');assert.equal(r.hitStop,true);assert.equal(r.countInside,true);assert.equal(r.overlayPointer,'none');
   assert.equal(r.portalChrome,false,'frame does not depend on #portalChrome');assert.equal(r.aura,'#22ccaa','strip follows the saved picker');assert.deepEqual(r.other,[]);
   await page.screenshot({path:`.frames/camera-housing-${size.width}x${size.height}.png`});
  }
  await page.getByRole('button',{name:'Stop workout',exact:true}).click();await page.waitForFunction(()=>window.myr5TestState.phase==='idle');
  const after=await page.evaluate(()=>({frames:document.querySelectorAll('#cameraWorkout .portal-frame,.camera-workout-housing,#cameraWorkout .portal-standalone-aura').length,cls:document.getElementById('cameraWorkout').classList.contains('portal-standalone'),links:document.querySelectorAll('link[href$="standalone-housing.css"]').length,visible:document.getElementById('cameraWorkout').checkVisibility()}));
  assert.deepEqual(after,{frames:0,cls:false,links:0,visible:false});
  await context.close();
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
});
