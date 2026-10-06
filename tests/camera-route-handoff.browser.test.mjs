import {guideSeen} from './guide-seen.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {chromium} from 'playwright';
import {completeCoach} from './onboarding-fixture.mjs';

test('routed library Begin reaches camera acquisition instead of cancelling the set', {timeout:60000},async()=>{
 const root=resolve('dist/client');
 const server=createServer(async(req,res)=>{
  const pathname=new URL(req.url,'http://local').pathname;
  if(pathname==='/__test__'){res.writeHead(200,{'Content-Type':'text/html'});res.end('<!doctype html><title>Test</title>');return;}
  if(pathname.startsWith('/api/')){res.writeHead(pathname==='/api/auth/config'?200:401,{'Content-Type':'application/json'});res.end(JSON.stringify(pathname==='/api/auth/config'?{enabled:false}:{error:'Sign in'}));return;}
  try{const file=resolve(root,'.'+(pathname==='/'?'/pose.html':pathname));if(!file.startsWith(root+sep))throw Error();const body=await readFile(file);res.writeHead(200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png'})[extname(file)]||'application/octet-stream'});res.end(body);}catch{res.writeHead(404);res.end();}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 try{
  const base='http://127.0.0.1:'+server.address().port;
  browser=await chromium.launch({channel:'msedge',headless:true,args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
  const context=await browser.newContext({viewport:{width:390,height:844},permissions:['camera'],serviceWorkers:'block',reducedMotion:'reduce'});
  await context.addInitScript(guideSeen);
  const page=await context.newPage();
  await page.goto(base+'/__test__');
  await page.evaluate(async intake=>{
   const [{openLocalCoach},{chooseWorkoutPaths}]=await Promise.all([import('/local-coach-runtime.mjs'),import('/chosen-styles.mjs')]);
   const repo=await openLocalCoach();await repo.forOwner(repo.guestOwnerId).saveSetup(intake,{startDay:'2026-09-21'});repo.close();
   chooseWorkoutPaths(['quads','martial-arts']);
  },completeCoach());
  await page.goto(base+'/pose.html');
  await page.waitForFunction(()=>window.myr5TestState?.phase==='idle'&&window.myr5WorkoutOwner);
  await page.evaluate(()=>{window.__cameraCalls=0;const original=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);navigator.mediaDevices.getUserMedia=(...args)=>{window.__cameraCalls++;return original(...args);};document.getElementById('start').click();});
  await page.waitForFunction(()=>{const library=document.getElementById('library');return library.open&&library.dataset.route==='library'&&!document.getElementById('hologramPanel').hidden;});
  await page.locator('#useHologram').click();
  await page.waitForFunction(()=>window.__cameraCalls>0||window.myr5TestState.phase==='error',null,{timeout:25000});
  const result=await page.evaluate(()=>({calls:window.__cameraCalls,phase:window.myr5TestState.phase,status:document.getElementById('status').textContent}));
  assert.ok(result.calls>0,JSON.stringify(result));
  assert.doesNotMatch(result.status,/Workout stopped\. Your progress is saved/);
  await context.close();
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
});
