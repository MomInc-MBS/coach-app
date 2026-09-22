import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {chromium} from 'playwright';
import {completeCoach} from './onboarding-fixture.mjs';

test('built core installs without optional models and cold page reopens offline with durable guest history',async()=>{
 const root=resolve('dist/client'),seen=[];
 const server=createServer(async(req,res)=>{
  const path=new URL(req.url,'http://local').pathname;seen.push(path);if(path==='/__test__'){res.writeHead(200,{'Content-Type':'text/html'});res.end('<!doctype html><title>Test</title>');return;}
  if(path.startsWith('/api/')){res.writeHead(path==='/api/auth/config'?200:401,{'Content-Type':'application/json'});res.end(JSON.stringify(path==='/api/auth/config'?{enabled:false}:{error:'Sign in'}));return;}
  try{const file=resolve(root,'.'+(path==='/'?'/pose.html':path));if(!file.startsWith(root+sep))throw Error();const body=await readFile(file);res.writeHead(200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png'})[extname(file)]||'application/octet-stream'});res.end(body);}catch{res.writeHead(404);res.end();}
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 let browser;try{
  browser=await chromium.launch({channel:'msedge',headless:true});const context=await browser.newContext(),page=await context.newPage();
  await page.goto(base+'/__test__');
  const savedId=await page.evaluate(async intake=>{const {openLocalCoach}=await import('/local-coach-runtime.mjs');const repo=await openLocalCoach(),scope=repo.forOwner(repo.guestOwnerId);await scope.saveSetup(intake,{startDay:'2026-09-21'});const workout=await scope.startWorkout({mode:'squat',goal:3});await scope.completeWorkout(workout.id,{value:3,activeSeconds:1,elapsedSeconds:1});repo.close();return workout.id;},completeCoach());
  await page.evaluate(async()=>{await navigator.serviceWorker.register('/sw.js');await navigator.serviceWorker.ready;});
  assert.equal(seen.some(path=>path.endsWith('.glb')),false,'core installation must not request a model');
  const cached=await page.evaluate(async()=>{const names=await caches.keys(),name=names.find(n=>n.startsWith('myr5-shell-'));return (await(await caches.open(name)).keys()).map(r=>new URL(r.url).pathname);});
  assert(cached.includes('/local-coach-runtime.mjs'));assert(cached.every(path=>!path.endsWith('.glb')));
  await page.close();await context.setOffline(true);const cold=await context.newPage();await cold.goto(base+'/pose.html');
  await cold.waitForFunction(()=>window.myr5TestState?.phase==='idle'&&window.myr5WorkoutOwner,{timeout:20000});
  const result=await cold.evaluate(async()=>{const {openLocalCoach}=await import('/local-coach-runtime.mjs');const repo=await openLocalCoach(),rows=await repo.forOwner(repo.guestOwnerId).listWorkouts();repo.close();return {ids:rows.map(r=>r.id),recovery:!!document.getElementById('coachStartupRecovery')?.open};});
  assert(result.ids.includes(savedId));assert.equal(result.recovery,false);
  const dismiss=cold.locator('.app-update-banner [data-later]');if(await dismiss.isVisible())await dismiss.click();await cold.locator('[data-panel="history"]').first().click();await cold.locator('#localHistoryList article').first().waitFor();assert.match(await cold.locator('#localHistoryStatus').textContent(),/1 completed workout/);
  await context.close();
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
});
