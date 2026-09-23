// D34 post-download package, picked in the W2-2I Downloads menu: the menu once after the first open
// (before the quilt, reachable again from Settings and Install), a download of only the picked groups,
// resume after an interruption, a first run offline with only the core install, an update, and a roster
// body fetched on demand. Runs against the production build (dist/client). Frames go to .frames/.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
import {completeCoach} from './onboarding-fixture.mjs';

const SHOTS=resolve('.frames');
const root=resolve('dist/client');
const worker=await readFile(resolve(root,'sw.js'),'utf8');
const list=name=>JSON.parse(worker.match(new RegExp(`const ${name}=(\\[.*?\\]);`,'s'))[1]);
const CORE=list('ASSETS'),PACKAGE=list('OPTIONAL_ASSETS');
const groupOf=group=>PACKAGE.filter(a=>a.group===group),bytes=assets=>assets.reduce((n,a)=>n+a.bytes+(a.contains||0),0);
const mb=n=>n>0&&n<104858?'<0.1 MB':(n/1048576).toFixed(n<10*1048576?1:0)+' MB';
const TYPES={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.mp3':'audio/mpeg','.woff2':'font/woff2','.ttf':'font/ttf','.glb':'model/gltf-binary'};
const TRACKER='https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs';
const STUB=`export const FilesetResolver={forVisionTasks:async()=>({})}; export const PoseLandmarker={createFromOptions:async()=>({detectForVideo:()=>({landmarks:[],worldLandmarks:[]}),close(){}})};export class DrawingUtils{}`;

// `pkg` swaps the build's package list for a smaller one (the real worker code, less data to copy).
// `release` swaps in another release: its package list, build id and changed file bodies.
// `slow` holds paths the server answers after a pause (to catch a download mid-way).
async function serve({pkg,gate}={}){
 const seen=[],release={pkg,build:null,files:{}},slow=new Set();
 const body=()=>{let source=release.pkg?worker.replace(/const OPTIONAL_ASSETS=\[.*?\];/s,()=>`const OPTIONAL_ASSETS=${JSON.stringify(release.pkg)};`):worker;return release.build?source.replace(/^const SHELL='[^']*'/,`const SHELL='myr5-shell-${release.build}'`):source;};
 const server=createServer(async(req,res)=>{
  const path=new URL(req.url,'http://local').pathname;seen.push({path,pkg:!!req.headers['x-myr5-package']});
  if(path==='/__test__'){res.writeHead(200,{'Content-Type':'text/html'});res.end('<!doctype html><title>Test</title>');return;}
  if(path==='/sw.js'){res.writeHead(200,{'Content-Type':'text/javascript','Cache-Control':'no-store'});res.end(body());return;}
  if(release.files[path]){res.writeHead(200,{'Content-Type':TYPES[extname(path)]||'application/octet-stream'});res.end(release.files[path]);return;}
  if(path.startsWith('/api/')){res.writeHead(path==='/api/auth/config'?200:401,{'Content-Type':'application/json'});res.end(JSON.stringify(path==='/api/auth/config'?{enabled:false}:{error:'Sign in'}));return;}
  if(req.headers['x-myr5-package']&&gate)await gate(path,res);if(res.destroyed)return;
  if(slow.has(path))await new Promise(r=>setTimeout(r,1500));
  try{const file=resolve(root,'.'+(path==='/'?'/pose.html':path));if(!file.startsWith(root+sep))throw Error();const data=await readFile(file);res.writeHead(200,{'Content-Type':TYPES[extname(file)]||'application/octet-stream'});res.end(data);}catch{res.writeHead(404);res.end();}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 return {base:'http://127.0.0.1:'+server.address().port,seen,release,slow,close:()=>new Promise(r=>{server.closeAllConnections();server.close(r);})};
}
async function launch(){return chromium.launch({channel:'msedge',headless:true,args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});}
// A returning guest with onboarding done and the core offline shell installed and controlling.
async function installed(browser,base){
 const context=await browser.newContext({viewport:{width:375,height:812},permissions:['camera']});
 await context.route(TRACKER,route=>route.fulfill({contentType:'text/javascript',body:STUB}));
 const page=await context.newPage();await page.goto(base+'/__test__');
 await page.evaluate(async intake=>{const {openLocalCoach}=await import('/local-coach-runtime.mjs');const repo=await openLocalCoach();await repo.forOwner(repo.guestOwnerId).saveSetup(intake,{startDay:'2026-09-21'});repo.close();},completeCoach());
 await page.evaluate(async()=>{await navigator.serviceWorker.register('/sw.js');await navigator.serviceWorker.ready;});
 await page.close();return context;
}
// '#pod' opens the pod itself (no quilt), for steps that drive the pod's own controls.
async function home(context,base,path='/pose.html'){
 const page=await context.newPage();await page.goto(base+path);
 await page.waitForFunction(()=>window.myr5TestState?.phase==='idle'&&navigator.serviceWorker.controller&&window.myr5WorkoutOwner&&!window.myr5WorkoutOwner.snapshot().transitioning,null,{timeout:30000});
 return page;
}
const menuOpen=page=>page.evaluate(()=>!!document.getElementById('downloadsMenu')?.open);
const waitMenu=page=>page.waitForFunction(()=>document.getElementById('downloadsMenu')?.open&&document.querySelector('#downloadsMenu [data-group]'),null,{timeout:15000});
const quiltUp=page=>page.evaluate(()=>document.getElementById('portalHome')?.hidden===false);
const barText=page=>page.locator('.full-download-bar [data-text]').textContent();
const cameraOnly=page=>page.evaluate(()=>[...document.body.children].filter(n=>n.id!=='cameraWorkout'&&getComputedStyle(n).display!=='none').map(n=>n.id||n.className||n.tagName));
const pick=(page,groups)=>page.evaluate(groups=>{for(const box of document.querySelectorAll('#downloadsMenu [data-group]'))if(!box.disabled&&box.checked!==groups.includes(box.dataset.group))box.click();},groups);
async function everything(page){await waitMenu(page);await page.locator('#downloadsMenu [data-all="everything"]').check();await page.getByRole('button',{name:'Download selected'}).click();}
async function startCamera(page){
 // A programmatic click, like a gesture or voice start, so it also works while the menu is open.
 await page.evaluate(()=>document.getElementById('useHologram').click());
 await page.waitForFunction(()=>document.body.dataset.cameraWorkout==='true',null,{timeout:20000});
}
async function stopCamera(page){await page.getByRole('button',{name:'Stop workout',exact:true}).click();await page.waitForFunction(()=>window.myr5TestState.phase==='idle');}
async function dismissUpdateNotice(page){const notice=page.locator('.app-update-banner [data-later]');if(await notice.isVisible())await notice.click();}

test('every package file has a group, and the regular coach never pulls a roster body',()=>{
 assert(PACKAGE.every(a=>typeof a.group==='string'),'grouped');
 assert.deepEqual(groupOf('coach').filter(a=>/\/roster\/.+\.glb$/.test(a.url)),[]);
 const bodies=PACKAGE.filter(a=>/\/creature\/models\/roster\/.+\.glb$/.test(a.url));
 assert(bodies.length>=50&&bodies.every(a=>a.group.startsWith('bodies-')),'every roster body sits in a workout section');
 for(const model of ['myr5','anatomy','hands-v2'])assert.equal(PACKAGE.find(a=>a.url===`/creature/models/${model}.glb`)?.group,'coach',model);
});

test('the Downloads menu opens once after the first open, before the quilt; Settings and Install reopen it; never in camera-only mode',async()=>{
 await mkdir(SHOTS,{recursive:true});
 const server=await serve();let browser;
 try{
  browser=await launch();const context=await installed(browser,server.base);
  const page=await home(context,server.base);
  await waitMenu(page);await page.waitForTimeout(300);
  assert.equal(await quiltUp(page),false,'the quilt is not up behind the menu');
  const rows=await page.evaluate(()=>Object.fromEntries([...document.querySelectorAll('#downloadsMenu [data-group]')].map(box=>[box.dataset.group,{size:box.closest('label').querySelector('[data-size]').textContent,checked:box.checked}])));
  assert.deepEqual(Object.keys(rows).sort(),[...new Set(PACKAGE.map(a=>a.group))].sort(),'a toggle for every group the build has');
  for(const [group,row] of Object.entries(rows))if(group!=='voices')assert.equal(row.size,mb(bytes(groupOf(group))),group);
  assert.deepEqual(Object.entries(rows).filter(([,row])=>row.checked).map(([group])=>group),['coach'],'only Your coach (recommended) starts picked');
  assert.equal(await page.locator('#downloadsMenu [data-total]').textContent(),`Selected: ${mb(bytes(groupOf('coach')))}`);
  assert.equal(await page.evaluate(()=>document.activeElement?.textContent),'Download selected','focus moves into the menu');
  assert.equal(await page.getByRole('dialog',{name:'Downloads'}).isVisible(),true,'the menu is labelled by its title');
  assert.deepEqual(await page.evaluate(()=>{const r=document.getElementById('downloadsMenu').getBoundingClientRect();return [r.width,r.height];}),[375,812],'its own full screen');
  await page.screenshot({path:resolve(SHOTS,'first-open-menu-375x812.png')});
  // Extra coach bodies: sections open by workout, the ones not yet complete marked locked (still downloadable).
  await page.locator('#downloadsMenu details summary').click();
  assert.equal(await page.locator('#downloadsMenu [data-group="bodies-starter"]').isEnabled(),true);
  await page.waitForFunction(()=>!document.querySelector('#downloadsMenu [data-group="bodies-chest"]').closest('label').querySelector('[data-lock]').hidden);
  await page.locator('#downloadsMenu [data-all="bodies"]').check();
  assert.equal(await page.locator('#downloadsMenu [data-total]').textContent(),`Selected: ${mb(bytes(PACKAGE.filter(a=>a.group==='coach'||a.group.startsWith('bodies-'))))}`);
  await page.locator('#downloadsMenu [data-all="bodies"]').uncheck();
  await page.getByRole('button',{name:'Not now'}).click();
  assert.equal(await menuOpen(page),false);
  assert.equal(await page.evaluate(()=>localStorage.getItem('myr5-downloads-seen')),'1');
  await page.waitForFunction(()=>document.getElementById('portalHome')?.hidden===false,null,{timeout:10000});
  assert.equal(server.seen.some(r=>r.pkg),false,'Not now downloads nothing');
  await page.reload();await page.waitForFunction(()=>window.myr5TestState?.phase==='idle'&&document.querySelector('.full-download-settings [data-open]'));
  await page.waitForTimeout(2500);assert.equal(await menuOpen(page),false,'shown once');
  // Settings reopens it (the quilt's Settings shape opens the same dialog).
  await dismissUpdateNotice(page);
  await page.evaluate(()=>{window.myr5Portal?.hide();document.getElementById('openSettings').click();});
  await page.locator('#settings .downloads-entry button').click();await waitMenu(page);
  assert.equal(await page.locator('#downloadsMenu [data-later]').textContent(),'Close');
  await page.screenshot({path:resolve(SHOTS,'menu-from-settings-375x812.png')});
  await page.locator('#downloadsMenu [data-later]').click();
  assert.equal(await page.evaluate(()=>document.getElementById('settings').open),true,'back in Settings');
  await page.locator('#closeSettings').click();
  // Install reopens it too.
  await page.evaluate(()=>document.querySelector('[data-panel="install"]').click());await page.locator('.full-download-settings [data-open]').click();await waitMenu(page);
  await page.locator('#downloadsMenu [data-later]').click();await page.locator('#installPanel [data-close]').first().click();
  await context.close();

  // A first open that turns into a workout: the menu steps aside and returns after, never over the camera.
  const fresh=await installed(browser,server.base),deep=await home(fresh,server.base,'/pose.html?panel=install');
  await deep.waitForTimeout(2500);assert.equal(await menuOpen(deep),false,'a deep link is not interrupted; the menu waits for a plain open');await deep.close();
  const next=await home(fresh,server.base);
  await waitMenu(next);
  await startCamera(next);
  await next.waitForFunction(()=>!document.getElementById('downloadsMenu').open,null,{timeout:5000});
  assert.deepEqual(await cameraOnly(next),[],'camera-only mode shows only the video and counter');
  await next.waitForTimeout(2500);
  assert.equal(await menuOpen(next),false,'no menu during camera-only mode');
  await stopCamera(next);
  await waitMenu(next);
  await fresh.close();
 }finally{await browser?.close();await server.close();}
});

test('picking one group downloads only its files',{timeout:300000},async()=>{
 const server=await serve({gate:async()=>new Promise(r=>setTimeout(r,400))});let browser;
 try{
  browser=await launch();const context=await installed(browser,server.base);
  const page=await home(context,server.base);
  await waitMenu(page);await pick(page,['bodies-chest']);
  assert.equal(await page.locator('#downloadsMenu [data-total]').textContent(),`Selected: ${mb(bytes(groupOf('bodies-chest')))}`);
  await page.getByRole('button',{name:'Download selected'}).click();
  await page.waitForFunction(()=>document.querySelector('.full-download-bar progress')?.value>0.1,null,{timeout:60000});
  assert.equal(await barText(page),'Downloading your picks…');
  await page.evaluate(()=>window.myr5Packs.open());await page.waitForFunction(()=>document.getElementById('downloadsMenu')?.open);
  assert.equal(await page.locator('#downloadsMenu .downloads-status [data-toggle]').textContent(),'Pause');
  assert.equal(await page.locator('#downloadsMenu [data-download]').isHidden(),true,'no second download while one runs');
  await page.screenshot({path:resolve(SHOTS,'mid-download-375x812.png')});
  await page.locator('#downloadsMenu [data-later]').click();
  await page.waitForFunction(()=>document.querySelector('.full-download-bar [data-text]')?.textContent.startsWith('Ready offline'),null,{timeout:120000});
  const fetched=server.seen.filter(r=>r.pkg).map(r=>r.path).sort();
  assert.deepEqual(fetched,groupOf('bodies-chest').map(a=>a.url).sort(),'exactly the Chest bodies, each once');
  assert.equal(await page.evaluate(()=>localStorage.getItem('myr5-download-groups')),'["bodies-chest"]');
  await dismissUpdateNotice(page);
  await page.evaluate(()=>window.myr5Packs.open());await waitMenu(page);
  assert.equal(await page.locator('#downloadsMenu [data-group="bodies-chest"]').isDisabled(),true);
  assert.equal(await page.locator('#downloadsMenu [data-group="bodies-chest"]').locator('xpath=..').locator('[data-size]').textContent(),'Saved');
  assert.equal(await page.locator('#downloadsMenu [data-group="coach"]').isChecked(),false,'the regular coach was not pulled in');
  await context.close();
 }finally{await browser?.close();await server.close();}
});

test('a roster body that isn\'t downloaded is fetched alone when it\'s needed, with a note; offline, the page says so',async()=>{
 const [first,second]=groupOf('bodies-chest');
 const server=await serve();let browser;
 try{
  browser=await launch();const context=await installed(browser,server.base);
  const page=await home(context,server.base);
  await waitMenu(page);await page.getByRole('button',{name:'Not now'}).click();
  server.slow.add(first.url);const mark=server.seen.length;
  const status=page.evaluate(url=>fetch(url).then(r=>r.status),first.url);
  await page.waitForFunction(()=>document.querySelector('.body-download-note')?.textContent==='Downloading this body…'&&!document.querySelector('.body-download-note').hidden,null,{timeout:10000});
  await page.screenshot({path:resolve(SHOTS,'body-on-demand-375x812.png')});
  assert.equal(await status,200);
  await page.waitForFunction(()=>document.querySelector('.body-download-note').hidden,null,{timeout:10000});
  assert.deepEqual(server.seen.slice(mark).map(r=>r.path).filter(p=>p.includes('/roster/')),[first.url],'just that one body');
  assert.equal(await page.evaluate(async url=>{const pkg=(await caches.keys()).find(n=>n.startsWith('myr5-package-'));return !!await caches.match(url,{cacheName:pkg});},first.url),true,'kept for offline');
  await page.evaluate(()=>window.myr5Packs.open());await waitMenu(page);
  const left=`${mb(bytes(groupOf('bodies-chest'))-first.bytes)} left`;
  await page.waitForFunction(left=>document.querySelector('#downloadsMenu [data-group="bodies-chest"]').closest('label').querySelector('[data-size]').textContent===left,left,{timeout:5000});
  await page.locator('#downloadsMenu [data-later]').click();
  await context.setOffline(true);
  assert.equal(await page.evaluate(url=>fetch(url).then(r=>r.status),first.url),200,'the kept body works offline');
  assert.equal(await page.evaluate(url=>fetch(url).then(r=>r.status),second.url),503);
  await page.waitForFunction(()=>/isn’t on this phone yet/.test(document.querySelector('.body-download-note')?.textContent)&&!document.querySelector('.body-download-note').hidden,null,{timeout:10000});
  await context.close();
 }finally{await browser?.close();await server.close();}
});

test('everything downloads, then a deferred feature works offline',{timeout:600000},async t=>{
 const server=await serve();let browser;
 try{
  browser=await launch();const context=await installed(browser,server.base);
  const page=await home(context,server.base);
  const started=Date.now();await everything(page);
  await page.waitForFunction(()=>document.querySelector('.full-download-bar [data-text]')?.textContent.startsWith('Ready offline'),null,{timeout:540000});
  t.diagnostic(`full package: ${server.seen.filter(r=>r.pkg).length} files in ${((Date.now()-started)/1000).toFixed(1)} s over localhost`);
  const {stored,voice}=await page.evaluate(async()=>{const names=await caches.keys(),pkg=names.find(n=>n.startsWith('myr5-package-'));return {stored:(await(await caches.open(pkg)).keys()).map(r=>new URL(r.url).pathname),voice:(await(await caches.open('myr5-voice-approved-v2')).keys()).length};});
  for(const asset of PACKAGE.filter(a=>!a.contains))assert(stored.includes(asset.url),'missing from the package cache: '+asset.url);
  const manifest=JSON.parse(await readFile(resolve(root,'voice/manifest.json'),'utf8'));
  assert.equal(voice,manifest.files.length+1,'every voice clip and this release\'s voice manifest');
  assert(server.seen.filter(r=>r.pkg).every((r,i,all)=>all.findIndex(o=>o.path===r.path)===i),'each file is fetched once');
  assert.equal(await page.evaluate(()=>localStorage.getItem('myr5-download-groups')),null,'Everything also covers groups a later release adds');
  await page.close();

  await context.setOffline(true);
  const cold=await home(context,server.base);
  assert.equal(await menuOpen(cold),false);
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
  let page=await home(context,server.base,'/pose.html#pod');
  await everything(page);
  await page.waitForFunction(()=>document.querySelector('.full-download-bar progress')?.value>0.1,null,{timeout:60000});
  // Reload mid-download: the tap was the consent, so it resumes by itself.
  const before=server.seen.filter(r=>r.pkg).length;
  await page.reload();
  await page.waitForFunction(()=>document.querySelector('.full-download-bar [data-text]')?.textContent==='Downloading your picks…',null,{timeout:20000});
  assert.equal(await menuOpen(page),false);
  // Pause, then resume.
  await page.locator('.full-download-bar [data-toggle]').click();
  await page.waitForFunction(()=>document.querySelector('.full-download-bar [data-text]')?.textContent==='Download paused.');
  await page.reload();
  await page.waitForFunction(()=>document.querySelector('.full-download-bar [data-text]')?.textContent==='Download paused.',null,{timeout:20000});
  assert.equal(await menuOpen(page),false,'a pause does not reopen the menu');
  await page.locator('.full-download-bar [data-toggle]').click();
  // Drop the network mid-download; it stops with a message and resumes when the connection returns.
  await page.waitForFunction(()=>document.querySelector('.full-download-bar [data-text]')?.textContent==='Downloading your picks…');
  await context.setOffline(true);
  await page.waitForFunction(()=>/continues where it left off/.test(document.querySelector('.full-download-bar [data-text]')?.textContent),null,{timeout:60000});
  slow=false;await context.setOffline(false);
  await page.waitForFunction(()=>document.querySelector('.full-download-bar [data-text]')?.textContent.startsWith('Ready offline'),null,{timeout:180000});
  const fetched=server.seen.filter(r=>r.pkg).map(r=>r.path),manifest=JSON.parse(await readFile(resolve(root,'voice/manifest.json'),'utf8'));
  const wanted=new Set([...pkg.map(a=>a.url),...manifest.files.map(f=>f.url)]);
  assert(fetched.every(p=>wanted.has(p)),'only package files are fetched');
  t.diagnostic(`resume: ${fetched.length} package requests for ${wanted.size} files (${before} before the reload)`);
  assert(before>0&&fetched.length<wanted.size*1.1,`completed files are not fetched again (${fetched.length} requests for ${wanted.size} files)`);
  // Done means done: the next open neither opens the menu nor downloads anything.
  const count=server.seen.length;page=await home(context,server.base,'/pose.html#pod');await page.waitForTimeout(2500);
  assert.equal(await menuOpen(page),false);assert.equal(server.seen.slice(count).some(r=>r.pkg),false);
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
  const page=await home(context,server.base,'/pose.html#pod');
  await page.waitForTimeout(2500);assert.equal(await menuOpen(page),false,'no menu while offline');
  assert.equal(await page.locator('.full-download-settings [data-open]').count(),1,'Install still offers the menu');
  await startCamera(page);
  assert.equal(await page.evaluate(()=>document.getElementById('v').paused),false);
  assert.deepEqual(await cameraOnly(page),[]);
  assert.equal(await page.locator('#cameraWorkout #primary').isVisible(),true,'the counter is shown');
  await stopCamera(page);
  assert.equal(await page.locator('#cameraWorkout').isVisible(),false);
  // Manual mode (timer, no camera) also starts from core alone, in a fresh offline window.
  const manual=await home(context,server.base,'/pose.html#pod');
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
  await everything(page);
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
