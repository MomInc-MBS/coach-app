import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {chromium} from 'playwright';
import {completeCoach} from './onboarding-fixture.mjs';

test('camera workout fills phone portrait and landscape with only a stoppable counter',async()=>{
 const root=resolve('dist/client'),seen=[];
 const server=createServer(async(req,res)=>{
  const path=new URL(req.url,'http://local').pathname;seen.push(path);if(path==='/__test__'){res.writeHead(200,{'Content-Type':'text/html'});res.end('<!doctype html><title>Test</title>');return;}
  if(path.startsWith('/api/')){res.writeHead(path==='/api/auth/config'?200:401,{'Content-Type':'application/json'});res.end(JSON.stringify(path==='/api/auth/config'?{enabled:false}:{error:'Sign in'}));return;}
  try{const file=resolve(root,'.'+(path==='/'?'/pose.html':path));if(!file.startsWith(root+sep))throw Error();const body=await readFile(file);res.writeHead(200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png'})[extname(file)]||'application/octet-stream'});res.end(body);}catch{res.writeHead(404);res.end();}
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 let browser;try{
  browser=await chromium.launch({channel:'msedge',headless:true,args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});const context=await browser.newContext({viewport:{width:390,height:844},permissions:['camera']}),page=await context.newPage();
  await page.route('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs',route=>route.fulfill({contentType:'text/javascript',body:`export const FilesetResolver={forVisionTasks:async()=>({})}; export const PoseLandmarker={createFromOptions:async()=>({detectForVideo:()=>({landmarks:[],worldLandmarks:[]}),close(){}})};export class DrawingUtils{}` }));
  await page.goto(base+'/__test__');await page.evaluate(async intake=>{const {openLocalCoach}=await import('/local-coach-runtime.mjs');const repo=await openLocalCoach();await repo.forOwner(repo.guestOwnerId).saveSetup(intake,{startDay:'2026-09-21'});repo.close();},completeCoach());
  await page.goto(base+'/pose.html');await page.waitForFunction(()=>window.myr5TestState?.phase==='idle'&&window.myr5WorkoutOwner&&!window.myr5WorkoutOwner.snapshot().transitioning);
  await page.evaluate(()=>document.getElementById('useHologram').click());
  await page.waitForFunction(()=>document.body.dataset.cameraWorkout==='true'||window.myr5TestState.phase==='error',null,{timeout:20000}).catch(async error=>{throw Error(error.message+' '+JSON.stringify(await page.evaluate(()=>({state:window.myr5TestState,status:document.getElementById('status').textContent,hidden:document.hidden}))))});
  assert.equal(await page.evaluate(()=>document.body.dataset.cameraWorkout),'true',JSON.stringify(await page.evaluate(()=>window.myr5TestState)));
  assert.equal(await page.evaluate(()=>document.getElementById('v').paused),false);
  for(const size of [{width:390,height:844},{width:844,height:390}]){await page.setViewportSize(size);const layout=await page.evaluate(()=>{const r=document.querySelector('#cameraWorkout>video').getBoundingClientRect(),c=document.querySelector('#cameraWorkout #primary').getBoundingClientRect();return {video:{x:r.x,y:r.y,width:r.width,height:r.height},count:{x:c.x,y:c.y,right:c.right,bottom:c.bottom},other:[...document.body.children].filter(n=>n.id!=='cameraWorkout'&&getComputedStyle(n).display!=='none').map(n=>n.tagName),canvasVisible:document.getElementById('c').checkVisibility()};});assert.deepEqual(layout.video,{x:0,y:0,...size});assert.deepEqual(layout.other,[]);assert.equal(layout.canvasVisible,false);assert(layout.count.x>=0&&layout.count.y>=0&&layout.count.right<=size.width&&layout.count.bottom<=size.height);}
  await page.getByRole('button',{name:'Stop workout',exact:true}).click();await page.waitForFunction(()=>window.myr5TestState.phase==='idle');assert.equal(await page.locator('#cameraWorkout').isVisible(),false);assert.equal(await page.locator('#cameraPreview #v').count(),1);assert.equal(await page.locator('#hud #primary').count(),1);await context.close();
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
});
