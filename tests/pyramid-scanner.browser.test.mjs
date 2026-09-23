import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {chromium} from 'playwright';
import {completeCoach} from './onboarding-fixture.mjs';

test('opening Food loads the deployed pyramid module and model assets',async()=>{
 const root=resolve('dist/client'),seen=[];
 const server=createServer(async(req,res)=>{
  const path=new URL(req.url,'http://local').pathname;seen.push(path);
  if(path==='/__test__'){res.writeHead(200,{'Content-Type':'text/html'});res.end('<!doctype html><title>Scanner test</title>');return;}
  if(path.startsWith('/api/')){res.writeHead(path==='/api/auth/config'?200:401,{'Content-Type':'application/json'});res.end(JSON.stringify(path==='/api/auth/config'?{enabled:false}:{error:'Sign in'}));return;}
  try{const file=resolve(root,'.'+(path==='/'?'/pose.html':path));if(!file.startsWith(root+sep))throw Error();const body=await readFile(file);res.writeHead(200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.glb':'model/gltf-binary'})[extname(file)]||'application/octet-stream'});res.end(body);}
  catch{res.writeHead(404);res.end();}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;let browser;
 try{
  browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-gl=angle','--use-angle=swiftshader']});
  const page=await browser.newPage(),responses=new Map(),failures=[],warnings=[];page.on('response',res=>{const path=new URL(res.url()).pathname;if(path.startsWith('/food/')||path.startsWith('/vendor/three/'))responses.set(path,res.status());});page.on('console',msg=>{if(msg.type()==='error')failures.push(msg.text());if(msg.type()==='warning')warnings.push(msg.text());});page.on('requestfailed',req=>failures.push(`${req.url()} ${req.failure()?.errorText||''}`));
  // Observe actual text painted onto the six model textures, not a test-only state API.
  await page.addInitScript(()=>{
   const labels=new Set(['FOOD','CALORIES','PROTEIN','FAT','CARBS','VITAMINS']),canvases=new WeakMap(),original=CanvasRenderingContext2D.prototype.fillText;
   window.pyramidPaint={};
   CanvasRenderingContext2D.prototype.fillText=function(value,...args){if(labels.has(value))canvases.set(this.canvas,value);else if(canvases.has(this.canvas))window.pyramidPaint[canvases.get(this.canvas)]=value;return original.call(this,value,...args);};
  });
  await page.goto(base+'/__test__');
  await page.evaluate(async intake=>{const {openLocalCoach}=await import('/local-coach-runtime.mjs');const repo=await openLocalCoach();await repo.forOwner(repo.guestOwnerId).saveSetup(intake,{startDay:'2026-09-21'});repo.close();},completeCoach());
  await page.goto(base+'/pose.html?panel=meals');
  await page.waitForFunction(()=>document.querySelector('#mealsPanel')?.open);
  await page.waitForFunction(()=>performance.getEntriesByType('resource').some(e=>new URL(e.name).pathname==='/food/pyramid-scanner.mjs'),null,{timeout:15000});
  await page.waitForFunction(()=>window.pyramidPaint.FOOD==='TAP CAMERA TO SCAN',null,{timeout:15000});
  assert.equal(responses.get('/food/pyramid-scanner.mjs'),200,JSON.stringify({seen,responses:[...responses]}));
  assert(seen.includes('/food/pyramid-scanner.mjs'));
  assert.equal(responses.get('/food/pyramid-scanner.glb'),200,JSON.stringify({seen,responses:[...responses],warnings}));
  const room=await page.evaluate(()=>{
   const wall=document.querySelector('#pyramidScanner .dg-paper-wall'),poster=document.querySelector('#pyramidScanner .paper-poster'),note=document.querySelector('#pyramidScanner .paper-note'),canvas=document.querySelector('#pyramidScanner canvas'),style=document.querySelector('#pyramidScannerRoomStyle');
   const origin=location.origin;
   return {wall:!!wall,wallPattern:wall&&getComputedStyle(wall).backgroundImage,poster:poster?.innerText.replace(/\s+/g,' ').trim(),note:note?.innerText.replace(/\s+/g,' ').trim(),canvasZ:canvas&&getComputedStyle(canvas).zIndex,style:style?.textContent||'',roomArtRequests:[...performance.getEntriesByType('resource')].filter(e=>/girlfriend|paper-character/i.test(new URL(e.name).pathname)).map(e=>e.name),externalRequests:[...performance.getEntriesByType('resource')].filter(e=>new URL(e.name).origin!==origin).map(e=>e.name)};
  });
  assert(room.wall,'striped room wall is mounted lazily with the scanner');
  assert.match(room.wallPattern,/repeating-linear-gradient/);
  assert.equal(room.poster,'CARED FOR. CORRECTED. PROVIDED FOR. A MOM INC. WORKPLACE');
  assert.equal(room.note,'READ THE SOURCE. KEEP THE LABEL.');
  assert.equal(room.canvasZ,'2','the pyramid canvas stays in front of the room');
  assert.match(room.style,/repeating-linear-gradient\(90deg,transparent 0 139px/);
  assert.deepEqual(room.roomArtRequests,[],'room uses the original lightweight CSS/DOM, not a character image');
  assert.deepEqual(room.externalRequests,[],'room makes no external asset request');
  assert(!warnings.some(x=>x.includes('Pyramid scanner unavailable')),warnings.join('\n'));
  assert(!failures.some(x=>x.includes('pyramid-scanner.mjs')||x.includes('pyramid-scanner.glb')),failures.join('\n'));
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('myr5:food-selected',{detail:{name:'apple'}})));
  await page.waitForFunction(()=>Number(document.querySelector('[name="calories"]').value)>0);
  const baseCalories=await page.locator('[name="calories"]').inputValue();
  await page.locator('#mealGrams').fill('250');
  await page.waitForFunction(()=>window.pyramidPaint.CALORIES===`${Math.round(Number(document.querySelector('[name="calories"]').value))} kcal`);
  assert(Math.abs(Number(await page.locator('[name="calories"]').inputValue())-Number(baseCalories)*2.5)<.02);
  const choices=await page.locator('#foodReference option').evaluateAll(nodes=>nodes.map(n=>n.value));
  assert(choices.length>1,'fixture must exercise changing the selected reference');
  await page.locator('#foodReference').selectOption(choices.at(-1));
  await page.waitForFunction(()=>window.pyramidPaint.CALORIES===`${Math.round(Number(document.querySelector('[name="calories"]').value))} kcal`);
  await page.locator('#mealName').fill('banana');
  await page.waitForFunction(()=>window.pyramidPaint.FOOD==='banana'&&Number(document.querySelector('[name="calories"]').value)>0);
  await page.evaluate(()=>document.querySelector('#nutritionAdjust').open=true);
  await page.locator('[name="calories"]').fill('432');
  await page.waitForFunction(()=>window.pyramidPaint.CALORIES==='432 kcal');
  await page.locator('#mealsPanel [data-close]').click();
  await page.waitForFunction(()=>!document.querySelector('#pyramidScanner'));
  await page.waitForFunction(()=>!document.querySelector('#pyramidScannerRoomStyle'));
  if(await page.getByRole('button',{name:'Dismiss update notice'}).isVisible())await page.getByRole('button',{name:'Dismiss update notice'}).click();
  await page.locator('[data-panel="meals"]').click();
  await page.waitForFunction(()=>document.querySelector('#pyramidScanner canvas')&&window.pyramidPaint.CALORIES==='432 kcal');
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('myr5:food-reset')));
  await page.waitForFunction(()=>window.pyramidPaint.FOOD==='TAP CAMERA TO SCAN'&&window.pyramidPaint.CALORIES==='—');

  // A browser with WebGL unavailable keeps the normal food flow and no orphaned host.
  const noGL=await browser.newPage(),noGLWarnings=[];
  noGL.on('console',msg=>{if(msg.type()==='warning')noGLWarnings.push(msg.text());});
  await noGL.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/i.test(type)?null:original.call(this,type,...args);};});
  await noGL.goto(base+'/pose.html?panel=meals');
  await noGL.waitForFunction(()=>document.querySelector('#mealsPanel')?.open);
  await noGL.waitForFunction(()=>performance.getEntriesByType('resource').some(e=>new URL(e.name).pathname==='/food/pyramid-scanner.mjs'));
  await new Promise((resolve,reject)=>{const until=Date.now()+15000;const poll=()=>noGLWarnings.some(x=>x.includes('Pyramid scanner unavailable'))?resolve():Date.now()>until?reject(Error('No WebGL failure observed')):setTimeout(poll,50);poll();});
  assert.equal(await noGL.locator('#pyramidScanner').count(),0);
  assert.equal(await noGL.locator('#pyramidScannerRoomStyle').count(),0,'failed WebGL setup releases the lazy room style');
  assert(await noGL.locator('#foodCamera').isVisible());
  await browser.close();browser=null;
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
});
