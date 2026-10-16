// iOS refuses new WebGL contexts while hidden ones (3D coach, portal board) still hold the GPU. Walk the app's 3D screens in
// sequence with a two-context cap: every screen must claim (modules/graphics-lifecycle.mjs) so none is ever refused.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {chromium} from 'playwright';
import {transform} from 'esbuild';
import {completeCoach} from './onboarding-fixture.mjs';

const TYPES={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.webp':'image/webp','.wasm':'application/wasm','.glb':'model/gltf-binary'};
const CAP=cap=>{
 const probe=window.__gpu={live:0,denied:0,denials:[]},get=HTMLCanvasElement.prototype.getContext,seen=new WeakSet();
 HTMLCanvasElement.prototype.getContext=function(kind,...args){
  if(!/webgl/i.test(String(kind)))return get.call(this,kind,...args);
  if(!seen.has(this)&&probe.live>=cap){probe.denied++;probe.denials.push((new Error().stack||'').split('\n').slice(2,6).join(' | '));return null;}
  const gl=get.call(this,kind,...args);
  if(gl&&!seen.has(this)){seen.add(this);probe.live++;this.addEventListener('webglcontextlost',()=>{probe.live--;},{once:true});}
  return gl;
 };
};

test('3D screens walked in sequence under a two-context cap never hit "Error creating WebGL context"',{timeout:600000},async()=>{
 const root=resolve('.'),server=createServer(async(req,res)=>{
  const path=new URL(req.url,'http://local').pathname;
  if(path==='/__test__'){res.writeHead(200,{'Content-Type':'text/html'});res.end('<!doctype html><title>t</title>');return;}
  if(path.startsWith('/api/')){res.writeHead(path==='/api/auth/config'?200:401,{'Content-Type':'application/json'});res.end(JSON.stringify(path==='/api/auth/config'?{enabled:false}:{error:'Sign in'}));return;}
  try{const file=resolve(root,'.'+decodeURIComponent(path));if(!file.startsWith(root+sep))throw Error();const ext=extname(file),body=ext==='.ts'?(await transform(await readFile(file,'utf8'),{loader:'ts'})).code:await readFile(file);res.writeHead(200,{'Content-Type':ext==='.ts'?'text/javascript':TYPES[ext]||'application/octet-stream'});res.end(body);}catch{res.writeHead(404);res.end();}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;let browser;
 try{
  const args=['--enable-webgl','--ignore-gpu-blocklist','--use-gl=angle','--use-angle=swiftshader'];
  try{browser=await chromium.launch({headless:true,args});}catch{browser=await chromium.launch({channel:'msedge',headless:true,args});}
  const context=await browser.newContext({viewport:{width:412,height:915},deviceScaleFactor:2.6,isMobile:true,hasTouch:true,serviceWorkers:'block'});
  await context.addInitScript(CAP,2);
  const page=await context.newPage(),refused=[];
  page.on('console',m=>{if(/Error creating WebGL context/.test(m.text()))refused.push(m.text());});
  await page.goto(base+'/__test__');
  await page.evaluate(async intake=>{const {openLocalCoach}=await import('/local-coach-runtime.mjs');const repo=await openLocalCoach();await repo.forOwner(repo.guestOwnerId).saveSetup(intake,{startDay:'2026-09-21'});repo.close();localStorage.setItem('myr5-downloads-seen','1');const {chooseWorkoutPaths}=await import('/chosen-styles.mjs');chooseWorkoutPaths(['quads','arms-shoulders']);},completeCoach());
  await page.goto(base+'/pose.html#pod');
  await page.waitForFunction(()=>window.myr5TestState?.phase==='idle'&&window.myr5Routes,null,{timeout:60000});
  await page.evaluate(()=>document.querySelector('.app-update-banner [data-later]')?.click());
  const closeAll=()=>page.evaluate(()=>{for(const d of document.querySelectorAll('dialog[open]'))d.close();window.myr5Routes.go('pod');}).catch(()=>{});
  const steps=[];
  const check=async label=>{const p=await page.evaluate(()=>({...window.__gpu}));steps.push(`${label}: live ${p.live}, refused ${p.denied}`);assert.equal(p.denied,0,`${label} was refused a context: ${p.denials.join('\n')}`);};
  // Portal board + 3D coach (the coach rides the ship arrival) are the long-lived holders the rest must displace.
  for(const id of ['achievements','select','food','scoreboard','reminders','ship']){
   await page.evaluate(id=>window.myr5Routes.go(id),id).catch(()=>{});await page.waitForTimeout(5000);await check('in '+id);
   await closeAll();await page.waitForTimeout(1500);await check('after '+id);
  }
  // BEGIN's movement hologram (the exercise demo before the camera starts).
  await page.evaluate(()=>document.getElementById('start').click());
  await page.waitForFunction(()=>document.getElementById('hologramPanel')&&!document.getElementById('hologramPanel').hidden&&document.querySelector('#holoStage canvas'),null,{timeout:60000});
  await page.waitForTimeout(1500);await check('hologram');
  await closeAll();await page.waitForTimeout(1500);await check('after hologram');
  await page.evaluate(()=>import('/drop-pod-opening.mjs').then(m=>m.playDropPod({tier:'uncommon',hasNext:false,open:async()=>null,onExit(){}})));
  await page.waitForFunction(()=>document.querySelector('.drop-pod.ready'),null,{timeout:30000});await check('drop pod');
  await page.locator('.drop-pod [data-exit]').click({force:true}).catch(()=>page.evaluate(()=>document.querySelector('.drop-pod [data-exit]')?.click()));await page.waitForTimeout(1500);await check('after drop pod');
  await page.evaluate(()=>window.myr5Routes.go('vault'));
  await page.waitForFunction(()=>document.querySelector('#vaultPanel')?._vault||document.querySelector('#vaultPanel [role="alert"]'),null,{timeout:45000});
  assert.equal(await page.evaluate(()=>!!document.querySelector('#vaultPanel')._vault),true,`the Vault door mounts: ${await page.locator('#vaultPanel').innerText()} | ${steps.join('; ')} | ${JSON.stringify(await page.evaluate(()=>window.__gpu))}`);await check('vault');
  await page.evaluate(()=>document.querySelector('#vaultPanel').close());await page.waitForTimeout(3000);await check('after vault');
  console.log(steps.join('\n'));
  assert.deepEqual(refused,[]);
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
});
