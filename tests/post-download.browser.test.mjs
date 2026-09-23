// D34 post-download package: the offer after opening, the full download, resume after an interruption,
// and a first run offline with only the core install. Runs against the production build (dist/client).
import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
import {completeCoach} from './onboarding-fixture.mjs';

const SHOTS=resolve('C:/Users/ianmy/Documents/Codex/2026-09-20/myr5-consolidated-implementation-and-stack-plan/worktrees/myr5-foundation/plan/reports/post-download');
const root=resolve('dist/client');
const worker=await readFile(resolve(root,'sw.js'),'utf8');
const list=name=>JSON.parse(worker.match(new RegExp(`const ${name}=(\\[.*?\\]);`,'s'))[1]);
const CORE=list('ASSETS'),PACKAGE=list('OPTIONAL_ASSETS');
const TYPES={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.mp3':'audio/mpeg','.woff2':'font/woff2','.ttf':'font/ttf','.glb':'model/gltf-binary'};
const TRACKER='https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs';
const STUB=`export const FilesetResolver={forVisionTasks:async()=>({})}; export const PoseLandmarker={createFromOptions:async()=>({detectForVideo:()=>({landmarks:[],worldLandmarks:[]}),close(){}})};export class DrawingUtils{}`;

// `pkg` swaps the build's package list for a smaller one (the real worker code, less data to copy).
// `release` swaps in another release: its package list, build id and changed file bodies.
async function serve({pkg,gate}={}){
 const seen=[],release={pkg,build:null,files:{}};
 const body=()=>{let source=release.pkg?worker.replace(/const OPTIONAL_ASSETS=\[.*?\];/s,()=>`const OPTIONAL_ASSETS=${JSON.stringify(release.pkg)};`):worker;return release.build?source.replace(/^const SHELL='[^']*'/,`const SHELL='myr5-shell-${release.build}'`):source;};
 const server=createServer(async(req,res)=>{
  const path=new URL(req.url,'http://local').pathname;seen.push({path,pkg:!!req.headers['x-myr5-package']});
  if(path==='/__test__'){res.writeHead(200,{'Content-Type':'text/html'});res.end('<!doctype html><title>Test</title>');return;}
  if(path==='/sw.js'){res.writeHead(200,{'Content-Type':'text/javascript','Cache-Control':'no-store'});res.end(body());return;}
  if(release.files[path]){res.writeHead(200,{'Content-Type':TYPES[extname(path)]||'application/octet-stream'});res.end(release.files[path]);return;}
  if(path.startsWith('/api/')){res.writeHead(path==='/api/auth/config'?200:401,{'Content-Type':'application/json'});res.end(JSON.stringify(path==='/api/auth/config'?{enabled:false}:{error:'Sign in'}));return;}
  if(req.headers['x-myr5-package']&&gate)await gate(path,res);if(res.destroyed)return;
  try{const file=resolve(root,'.'+(path==='/'?'/pose.html':path));if(!file.startsWith(root+sep))throw Error();const data=await readFile(file);res.writeHead(200,{'Content-Type':TYPES[extname(file)]||'application/octet-stream'});res.end(data);}catch{res.writeHead(404);res.end();}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 return {base:'http://127.0.0.1:'+server.address().port,seen,release,close:()=>new Promise(r=>{server.closeAllConnections();server.close(r);})};
}
async function launch(){return chromium.launch({channel:'msedge',headless:true,args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});}
// A returning guest with onboarding done and the core offline shell installed and controlling.
async function installed(browser,base){
 const context=await browser.newContext({viewport:{width:390,height:844},permissions:['camera']});
 await context.route(TRACKER,route=>route.fulfill({contentType:'text/javascript',body:STUB}));
 const page=await context.newPage();await page.goto(base+'/__test__');
 await page.evaluate(async intake=>{const {openLocalCoach}=await import('/local-coach-runtime.mjs');const repo=await openLocalCoach();await repo.forOwner(repo.guestOwnerId).saveSetup(intake,{startDay:'2026-09-21'});repo.close();},completeCoach());
 await page.evaluate(async()=>{await navigator.serviceWorker.register('/sw.js');await navigator.serviceWorker.ready;});
 await page.close();return context;
}
async function home(context,base){
 const page=await context.newPage();await page.goto(base+'/pose.html');
 await page.waitForFunction(()=>window.myr5TestState?.phase==='idle'&&navigator.serviceWorker.controller&&window.myr5WorkoutOwner&&!window.myr5WorkoutOwner.snapshot().transitioning,null,{timeout:30000});
 return page;
}
const settled=page=>page.waitForFunction(()=>document.getAnimations().every(a=>a.playState!=='running'));
const offerOpen=page=>page.evaluate(()=>!!document.getElementById('fullDownloadOffer')?.open);
const barText=page=>page.locator('.full-download-bar [data-text]').textContent();
const cameraOnly=page=>page.evaluate(()=>[...document.body.children].filter(n=>n.id!=='cameraWorkout'&&getComputedStyle(n).display!=='none').map(n=>n.id||n.className||n.tagName));
async function startCamera(page){
 // A programmatic click, like a gesture or voice start, so it also works while the offer is open.
 await page.evaluate(()=>document.getElementById('useHologram').click());
 await page.waitForFunction(()=>document.body.dataset.cameraWorkout==='true',null,{timeout:20000});
}
async function stopCamera(page){await page.getByRole('button',{name:'Stop workout',exact:true}).click();await page.waitForFunction(()=>window.myr5TestState.phase==='idle');}

test('the offer appears after opening, snoozes with Later, returns next open, and never shows in camera-only mode',async()=>{
 await mkdir(SHOTS,{recursive:true});
 const server=await serve();let browser;
 try{
  browser=await launch();const context=await installed(browser,server.base);
  const page=await home(context,server.base);
  await page.waitForFunction(()=>document.getElementById('fullDownloadOffer')?.open,null,{timeout:10000});
  const title=await page.locator('#fullDownloadTitle').textContent();
  assert.match(title,/^Download the full MyR5 \((\d+) MB\)$/);
  const total=PACKAGE.reduce((n,a)=>n+a.bytes+(a.contains||0),0);
  assert.equal(Number(title.match(/\((\d+) MB\)/)[1]),Math.round(total/1048576),'size shown is the whole package');
  assert.equal(await page.evaluate(()=>document.activeElement?.textContent),'Download now','focus moves into the sheet');
  assert.equal(await page.getByRole('dialog',{name:title}).isVisible(),true,'the sheet is labelled by its title');
  await settled(page);await page.screenshot({path:resolve(SHOTS,'offer-390x844.png')});
  await page.getByRole('button',{name:'Later'}).click();
  assert.equal(await offerOpen(page),false);
  await page.reload();await page.waitForFunction(()=>window.myr5TestState?.phase==='idle'&&document.querySelector('.full-download-settings [data-toggle]')?.textContent.startsWith('Download'));
  await page.waitForTimeout(2500);assert.equal(await offerOpen(page),false,'Later snoozes for this session');
  // Settings always offers it.
  const notice=page.locator('.app-update-banner [data-later]');if(await notice.isVisible())await notice.click();
  await page.locator('[data-panel="install"]').click();
  assert.match(await page.locator('.full-download-settings [data-toggle]').textContent(),/^Download the full MyR5 \(\d+ MB\)$/);
  await page.locator('#installPanel [data-close]').first().click();

  // The next open offers it again, but a workout that starts takes precedence over the sheet.
  const next=await home(context,server.base);await next.emulateMedia({reducedMotion:'reduce'});
  await next.waitForFunction(()=>document.getElementById('fullDownloadOffer')?.open,null,{timeout:10000});
  assert.deepEqual(await next.evaluate(()=>document.getElementById('fullDownloadOffer').getAnimations().length),0,'reduced motion: the sheet does not slide');
  await startCamera(next);
  await next.waitForFunction(()=>!document.getElementById('fullDownloadOffer').open,null,{timeout:5000});
  assert.deepEqual(await cameraOnly(next),[],'camera-only mode shows only the video and counter');
  await next.waitForTimeout(2500);
  assert.equal(await offerOpen(next),false,'no offer during camera-only mode');
  await stopCamera(next);
  await next.waitForFunction(()=>document.getElementById('fullDownloadOffer')?.open,null,{timeout:10000});
  await context.close();
 }finally{await browser?.close();await server.close();}
});

test('the full package downloads, then a deferred feature works offline',{timeout:600000},async t=>{
 const server=await serve();let browser;
 try{
  browser=await launch();const context=await installed(browser,server.base);
  const page=await home(context,server.base);
  await page.waitForFunction(()=>document.getElementById('fullDownloadOffer')?.open,null,{timeout:10000});
  const started=Date.now();await page.getByRole('button',{name:'Download now'}).click();
  await page.waitForFunction(()=>document.querySelector('.full-download-bar progress')?.value>0.05,null,{timeout:120000});
  await page.screenshot({path:resolve(SHOTS,'downloading-390x844.png')});
  await page.waitForFunction(()=>document.querySelector('.full-download-bar [data-text]')?.textContent.startsWith('Ready offline'),null,{timeout:540000});
  await page.screenshot({path:resolve(SHOTS,'ready-offline-390x844.png')});
  t.diagnostic(`full package: ${server.seen.filter(r=>r.pkg).length} files in ${((Date.now()-started)/1000).toFixed(1)} s over localhost`);
  const {stored,voice}=await page.evaluate(async()=>{const names=await caches.keys(),pkg=names.find(n=>n.startsWith('myr5-package-'));return {stored:(await(await caches.open(pkg)).keys()).map(r=>new URL(r.url).pathname),voice:(await(await caches.open('myr5-voice-approved-v2')).keys()).length};});
  for(const asset of PACKAGE.filter(a=>!a.contains))assert(stored.includes(asset.url),'missing from the package cache: '+asset.url);
  const manifest=JSON.parse(await readFile(resolve(root,'voice/manifest.json'),'utf8'));
  assert.equal(voice,manifest.files.length+1,'every voice clip and this release\'s voice manifest');
  assert(server.seen.filter(r=>r.pkg).every((r,i,all)=>all.findIndex(o=>o.path===r.path)===i),'each file is fetched once');
  await page.close();

  await context.setOffline(true);
  const cold=await home(context,server.base);
  assert.equal(await offerOpen(cold),false);
  assert.equal(await cold.evaluate(async()=>{const m=await import('/nutrition-data.mjs');return Array.isArray(m.default)&&m.default.length>0;}),true,'food reference works offline');
  const clip=manifest.phrases['1'];
  assert.equal(await cold.evaluate(async url=>(await fetch(url)).status,clip),200,'voice works offline');
  await cold.goto(server.base+'/creature/index.html');
  await cold.waitForFunction(()=>window.myr5Companion?.ready===true,null,{timeout:60000});
  const body='roster/01-seed-pearo--3d_character_model';
  await cold.selectOption('#body',body);
  await cold.waitForFunction(id=>window.myr5Companion?.recipe?.body===id&&window.myr5Companion?.ready===true,body,{timeout:60000});
  await context.close();
 }finally{await browser?.close();await server.close();}
});

test('an interrupted download resumes where it stopped, after a reload and after going offline',{timeout:300000},async t=>{
 // A slice of the real package (every size class, plus the voice manifest and its clips).
 const pkg=[...PACKAGE.filter(a=>!a.contains).sort((a,b)=>a.bytes-b.bytes).filter((_,i)=>i%6===0),PACKAGE.find(a=>a.contains)];
 let slow=true;
 const server=await serve({pkg,gate:async()=>{if(slow)await new Promise(r=>setTimeout(r,40));}});let browser;
 try{
  browser=await launch();const context=await installed(browser,server.base);
  let page=await home(context,server.base);
  await page.waitForFunction(()=>document.getElementById('fullDownloadOffer')?.open,null,{timeout:10000});
  await page.getByRole('button',{name:'Download now'}).click();
  await page.waitForFunction(()=>document.querySelector('.full-download-bar progress')?.value>0.1,null,{timeout:60000});
  // Reload mid-download: the tap was the consent, so it resumes by itself.
  const before=server.seen.filter(r=>r.pkg).length;
  await page.reload();
  await page.waitForFunction(()=>document.querySelector('.full-download-bar [data-text]')?.textContent==='Downloading the full MyR5…',null,{timeout:20000});
  assert.equal(await offerOpen(page),false);
  // Pause, then resume.
  await page.locator('.full-download-bar [data-toggle]').click();
  await page.waitForFunction(()=>document.querySelector('.full-download-bar [data-text]')?.textContent==='Download paused.');
  await page.screenshot({path:resolve(SHOTS,'paused-390x844.png')});
  await page.reload();
  await page.waitForFunction(()=>document.querySelector('.full-download-bar [data-text]')?.textContent==='Download paused.',null,{timeout:20000});
  assert.equal(await offerOpen(page),false,'a pause is not re-offered in the same session');
  await page.locator('.full-download-bar [data-toggle]').click();
  // Drop the network mid-download; it stops with a message and resumes when the connection returns.
  await page.waitForFunction(()=>document.querySelector('.full-download-bar [data-text]')?.textContent==='Downloading the full MyR5…');
  await context.setOffline(true);
  await page.waitForFunction(()=>/continues where it left off/.test(document.querySelector('.full-download-bar [data-text]')?.textContent),null,{timeout:60000});
  slow=false;await context.setOffline(false);
  await page.waitForFunction(()=>document.querySelector('.full-download-bar [data-text]')?.textContent.startsWith('Ready offline'),null,{timeout:180000});
  const fetched=server.seen.filter(r=>r.pkg).map(r=>r.path),manifest=JSON.parse(await readFile(resolve(root,'voice/manifest.json'),'utf8'));
  const wanted=new Set([...pkg.map(a=>a.url),...manifest.files.map(f=>f.url)]);
  assert(fetched.every(p=>wanted.has(p)),'only package files are fetched');
  t.diagnostic(`resume: ${fetched.length} package requests for ${wanted.size} files (${before} before the reload)`);
  assert(before>0&&fetched.length<wanted.size*1.1,`completed files are not fetched again (${fetched.length} requests for ${wanted.size} files)`);
  // Done means done: the next open neither offers nor downloads anything.
  const count=server.seen.length;page=await home(context,server.base);await page.waitForTimeout(2500);
  assert.equal(await offerOpen(page),false);assert.equal(server.seen.slice(count).some(r=>r.pkg),false);
  await context.close();
 }finally{await browser?.close();await server.close();}
});

test('a first run works offline with only the core install: camera workout with counter, and manual mode',async t=>{
 const server=await serve();let browser;
 try{
  browser=await launch();const context=await installed(browser,server.base);
  const coreUrls=new Set(CORE.map(a=>a.url));
  assert.deepEqual(server.seen.filter(r=>PACKAGE.some(a=>a.url===r.path)).map(r=>r.path),[],'installing core fetches no package file');
  const probe=await context.newPage();await probe.goto(server.base+'/__test__');
  const cached=await probe.evaluate(async()=>{const name=(await caches.keys()).find(n=>n.startsWith('myr5-shell-'));return (await(await caches.open(name)).keys()).map(r=>new URL(r.url).pathname).filter(p=>!p.startsWith('/__'));});
  assert.deepEqual(new Set(cached),coreUrls);
  await context.setOffline(true);
  const unavailable=new Set();context.on('response',r=>{if(r.status()===503)unavailable.add(new URL(r.url()).pathname);});
  const page=await home(context,server.base);
  await page.waitForTimeout(2500);assert.equal(await offerOpen(page),false,'no offer while offline');
  assert.match(await page.locator('.full-download-settings [data-toggle]').textContent(),/^Download the full MyR5/);
  await startCamera(page);
  assert.equal(await page.evaluate(()=>document.getElementById('v').paused),false);
  assert.deepEqual(await cameraOnly(page),[]);
  assert.equal(await page.locator('#cameraWorkout #primary').isVisible(),true,'the counter is shown');
  await stopCamera(page);
  assert.equal(await page.locator('#cameraWorkout').isVisible(),false);
  // Manual mode (timer, no camera) also starts from core alone, in a fresh offline window.
  const manual=await home(context,server.base);
  await manual.evaluate(()=>{document.getElementById('camera').value='manual';document.getElementById('start').click();});
  await manual.waitForFunction(()=>['manual','error'].includes(window.myr5TestState.phase),null,{timeout:20000});
  assert.equal(await manual.evaluate(()=>window.myr5TestState.phase),'manual',await manual.evaluate(()=>window.myr5TestState.error));
  assert.equal(await manual.locator('#primary').isVisible(),true,'the manual counter is shown');
  assert([...unavailable].every(p=>PACKAGE.some(a=>a.url===p)),'only package files are unavailable');
  t.diagnostic('package files the offline first run asked for (degrade gracefully): '+[...unavailable].sort().join(', '));
  await context.close();
 }finally{await browser?.close();await server.close();}
});

test('an app update keeps the package and saved data, and refreshes only the files that changed',{timeout:300000},async t=>{
 const pkg=PACKAGE.filter(a=>!a.contains&&a.bytes<200000).slice(0,40),changed=pkg.find(a=>a.url.endsWith('.mjs')||a.url.endsWith('.js'))||pkg[0];
 const server=await serve({pkg});let browser;
 try{
  browser=await launch();const context=await installed(browser,server.base);
  let page=await home(context,server.base);
  const savedId=await page.evaluate(async()=>{const {openLocalCoach}=await import('/local-coach-runtime.mjs');const repo=await openLocalCoach(),scope=repo.forOwner(repo.guestOwnerId);const w=await scope.startWorkout({mode:'squat',goal:3});await scope.completeWorkout(w.id,{value:3,activeSeconds:1,elapsedSeconds:1});repo.close();return w.id;});
  await page.waitForFunction(()=>document.getElementById('fullDownloadOffer')?.open,null,{timeout:10000});
  await page.getByRole('button',{name:'Download now'}).click();
  await page.waitForFunction(()=>document.querySelector('.full-download-bar [data-text]')?.textContent.startsWith('Ready offline'),null,{timeout:120000});
  const before=await page.evaluate(()=>caches.keys());
  // The next release changes one package file.
  const body=`/* changed in the next release */export const changed=true;`;
  server.release.files[changed.url]=body;server.release.build='next-release-test';
  server.release.pkg=pkg.map(a=>a===changed?{...a,bytes:Buffer.byteLength(body),integrity:'sha256-'+createHash('sha256').update(body).digest('base64')}:a);
  await page.evaluate(async()=>{const reg=await navigator.serviceWorker.getRegistration();await reg.update();await new Promise(r=>{const w=reg.installing||reg.waiting;if(!w||w.state==='installed')return r();w.addEventListener('statechange',()=>w.state==='installed'&&r());});});
  await page.close();
  const mark=server.seen.length;
  page=await home(context,server.base);
  assert.equal(await page.evaluate(()=>caches.keys().then(k=>k.some(n=>n==='myr5-shell-next-release-test'))),true,'the next release is active');
  await page.waitForFunction(()=>document.querySelector('.full-download-bar [data-text]')?.textContent.startsWith('Ready offline'),null,{timeout:60000});
  const refetched=server.seen.slice(mark).filter(r=>r.pkg).map(r=>r.path);
  t.diagnostic('after the update the package fetched: '+refetched.join(', '));
  assert.deepEqual(refetched,[changed.url],'only the changed file is downloaded again');
  const after=await page.evaluate(()=>caches.keys());
  assert.deepEqual(after.filter(n=>n.startsWith('myr5-package-')),['myr5-package-next-release-test'],'the older package is gone once the new one is complete');
  assert(before.some(n=>n.startsWith('myr5-package-')&&n!=='myr5-package-next-release-test'));
  assert.equal(await page.evaluate(()=>localStorage.getItem('myr5-full-download')),'on');
  await page.close();await context.setOffline(true);
  const cold=await home(context,server.base);
  assert.equal(await cold.evaluate(async url=>(await fetch(url)).text(),changed.url),body,'offline serves the new file, never the old one');
  const ids=await cold.evaluate(async()=>{const {openLocalCoach}=await import('/local-coach-runtime.mjs');const repo=await openLocalCoach(),rows=await repo.forOwner(repo.guestOwnerId).listWorkouts();repo.close();return rows.map(r=>r.id);});
  assert(ids.includes(savedId),'saved workouts survive the update');
  await context.close();
 }finally{await browser?.close();await server.close();}
});
