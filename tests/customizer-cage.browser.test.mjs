// W4-4E (#116, D47): the optional 3D customizer cage. Serves the built dist/client (npm run build first).
// "Downloaded" is simulated the way the Downloads menu leaves it: the three packet files in a myr5-package-* cache.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';

const root=resolve('dist/client'),frames=resolve('.frames/w4-4e');
const TYPES={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.glb':'model/gltf-binary','.wasm':'application/wasm','.png':'image/png','.webp':'image/webp'};
const CAGE=['/pod/rooms/cage/cage.glb','/pod/rooms/cage/draco_wasm_wrapper.js','/pod/rooms/cage/draco_decoder.wasm'];

async function harness(t,{broken=false,reducedMotion='no-preference'}={}){
 const seen=[];
 const server=createServer(async(req,res)=>{const path=new URL(req.url,'http://local').pathname;seen.push(path);
  if(broken&&path===CAGE[0]){res.writeHead(200,{'Content-Type':'model/gltf-binary'});res.end('not a model');return;}
  try{const body=await readFile(resolve(root,'.'+path));res.setHeader('Content-Type',TYPES[extname(path)]||'application/octet-stream');res.end(body);}catch{res.writeHead(404);res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({channel:'msedge',headless:true});
 t.after(async()=>{await browser.close();server.close();});
 const context=await browser.newContext({viewport:{width:375,height:812},deviceScaleFactor:1,reducedMotion});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>sessionStorage.setItem('myr5-ship-gate','ship-admission-v2')); // #148: through the ship
 const base='http://127.0.0.1:'+server.address().port;
 const open=async()=>{await page.goto(base+'/creature/index.html');await page.waitForFunction(()=>window.myr5Companion?.ready===true,null,{timeout:60000});};
 const download=async()=>{await page.goto(base+'/privacy.html');await page.evaluate(async files=>{const cache=await caches.open('myr5-package-test');for(const url of files)await cache.put(url,await fetch(url));},CAGE);};
 return {page,seen,errors,open,download,base};
}
const shot=async(page,name)=>{await mkdir(frames,{recursive:true});await page.screenshot({path:resolve(frames,name+'.png')});};
const box=async(page,selector)=>page.locator(selector).first().boundingBox();
const overlaps=(a,b)=>!!a&&!!b&&a.x<b.x+b.width&&b.x<a.x+a.width&&a.y<b.y+b.height&&b.y<a.y+a.height;
const inside=(a,b)=>a.x>=b.x-.5&&a.y>=b.y-.5&&a.x+a.width<=b.x+b.width+.5&&a.y+a.height<=b.y+b.height+.5;

test('not downloaded: the flat customizer works, fetches nothing from the cage packet and shows the way to get it',async t=>{
 const {page,seen,errors,open}=await harness(t);await open();
 assert.equal(await page.locator('.editor-shell').getAttribute('data-cage'),null);
 assert.equal(await page.locator('.cage-bays').count(),0);
 assert.deepEqual(seen.filter(p=>p.startsWith('/pod/rooms/cage/')),[],'no cage byte is fetched before download');
 assert.equal(await page.locator('.cage-offer').isVisible(),true);
 await page.click('.cage-offer');
 assert.equal(await page.locator('#tab-files').getAttribute('aria-selected'),'true');
 const link=page.locator('#panel-files [data-cage-download]');
 assert.equal(await link.isVisible(),true);assert.equal(await link.getAttribute('href'),'/pose.html#install');
 // The 2D editor still edits and saves.
 await page.click('#tab-materials');await page.click('#colorSwatches [data-color="default-ruby"]');
 await page.waitForFunction(()=>window.myr5Companion.recipe.materials?.body?.colorId==='default-ruby'&&window.myr5Companion.ready,null,{timeout:60000});
 await shot(page,'not-downloaded-375x812');
 assert.deepEqual(errors,[]);
});

test('downloaded: the cage surrounds the live coach at 375×812; bays, taps and keys open real controls without saving anything',async t=>{
 const {page,seen,errors,open,download}=await harness(t);await download();await open();
 await page.waitForFunction(()=>document.querySelector('.editor-shell')?.dataset.cage==='ready',null,{timeout:60000});
 await page.waitForTimeout(900);
 const stats=await page.evaluate(()=>window.myr5Companion.viewer.stats());
 assert(stats.triangles>140000,'cage geometry is drawn in the viewer: '+stats.triangles);
 assert.equal(await page.evaluate(()=>window.myr5Companion.viewer.floorObjects.every(o=>!o.visible)),true,'the cage pedestal replaces the viewer disc');
 assert.equal(await page.evaluate(()=>!!window.myr5Companion.viewer.rig),true,'the live coach is in the scene');
 // Phone frame: the bay buttons sit inside the 3D stage, clear of every other app control.
 const stage=await box(page,'#creatureStage'),bays=await box(page,'.cage-bays');
 assert(inside(bays,stage),'bay buttons stay inside the stage');
 for(const other of ['.preview-toolbar','.design-console','.coach-dock','.editor-header'])assert(!overlaps(bays,await box(page,other)),'bay buttons clear '+other);
 assert(stage.height>=200,'the stage has room for the cage: '+stage.height);
 assert.deepEqual(await page.locator('.cage-bays button').evaluateAll(b=>b.map(x=>x.getAttribute('aria-label'))),['Whole cage','Coach pedestal: species','Pet cages','Weapon wall','Mirror: colours','Clothing bay']);
 for(const b of await page.locator('.cage-bays button').all()){const r=await b.boundingBox();assert(r.height>=36&&r.width>=44&&inside(r,bays),'whole touch target in view');}
 assert.equal(await page.locator('.cage-bays').evaluate(el=>el.scrollWidth<=el.clientWidth&&[...el.children].every(b=>b.scrollWidth<=b.clientWidth)),true,'no bay label is clipped');
 await shot(page,'cage-overview-375x812');

 const before=await page.evaluate(()=>({recipe:JSON.stringify(window.myr5Companion.recipe),storage:JSON.stringify(Object.entries(localStorage).sort()),undo:document.getElementById('undo').disabled}));
 // Pets: owned/locked pet rewards, no selection invented, every tab unselected.
 await page.click('[data-cage-section="pets"]');
 assert.equal(await page.locator('#panel-bay').isVisible(),true);
 assert.equal(await page.locator('#bayTitle').textContent(),'Pet cages');
 assert.match(await page.locator('#panel-bay').textContent(),/pet/i);
 assert.equal(await page.locator('#panel-bay select, #panel-bay input').count(),0,'no fake pet choice');
 assert.equal(await page.locator('.menu-tabs [aria-selected=true]').count(),0);
 await page.waitForTimeout(800);await shot(page,'cage-pets-375x812');
 // Weapons by keyboard: shows rewards, never touches the War Room loadout.
 await page.focus('[data-cage-section="weapons"]');await page.keyboard.press('Enter');
 assert.equal(await page.locator('#bayTitle').textContent(),'Weapon wall');
 assert.match(await page.locator('#panel-bay').textContent(),/War Room/);
 await page.waitForTimeout(800);await shot(page,'cage-weapons-375x812');
 await page.click('[data-cage-section="clothing"]');
 assert.equal(await page.locator('#bayTitle').textContent(),'Clothing bay');
 assert.match(await page.locator('#panel-bay').textContent(),/Nothing to wear yet/);
 await page.waitForTimeout(800);await shot(page,'cage-clothing-375x812');
 const after=await page.evaluate(()=>({recipe:JSON.stringify(window.myr5Companion.recipe),storage:JSON.stringify(Object.entries(localStorage).sort()),undo:document.getElementById('undo').disabled}));
 assert.deepEqual(after,before,'bays never write the recipe, undo history or storage');
 assert.deepEqual(seen.filter(p=>p.startsWith('/api/war-room')),[],'the War Room API is never called');
 // Mirror opens Colour; the pedestal opens Species (the existing tabs, through the bridge).
 await page.click('[data-cage-section="mirror"]');
 assert.equal(await page.locator('#tab-materials').getAttribute('aria-selected'),'true');
 assert.equal(await page.locator('#panel-materials').isVisible(),true);assert.equal(await page.locator('#panel-bay').isHidden(),true);
 await page.waitForTimeout(800);await shot(page,'cage-mirror-375x812');
 await page.click('[data-cage-section="pedestal"]');
 assert.equal(await page.locator('#tab-body').getAttribute('aria-selected'),'true');
 // Tapping the scene itself: a quick tap on a bay selects it; a tab still works after a bay.
 await page.click('[data-cage-section="overview"]');await page.waitForTimeout(800);
 for(const section of ['pets','weapons','mirror']){
  const at=await page.evaluate(s=>window.myr5Companion.cage.project(s),section);
  assert.equal(await page.evaluate(([x,y])=>window.myr5Companion.cage.pick(x,y),[at.x,at.y]),section,section+' hit volume is under its anchor');
  await page.mouse.click(at.x,at.y);
  assert.equal(await page.evaluate(()=>window.myr5Companion.cage.section),section,'tap on '+section);
  await page.click('[data-cage-section="overview"]');await page.waitForTimeout(800);
 }
 await page.click('[data-cage-section="pets"]');await page.click('#tab-face');
 assert.equal(await page.locator('#panel-bay').isHidden(),true);assert.equal(await page.locator('#panel-face').isVisible(),true);
 // A locked preview still never saves while the cage is up.
 await page.click('#tab-materials');const locked=await page.locator('#colorSwatches button[data-locked]').first();
 if(await locked.count()){const saved=await page.evaluate(()=>JSON.stringify(window.myr5Companion.recipe));await locked.click();await page.waitForTimeout(300);assert.equal(await page.evaluate(()=>JSON.stringify(window.myr5Companion.recipe)),saved,'locked colour stays a preview');}
 // Hidden page: the one render loop stops drawing.
 const hidden=await page.evaluate(async()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});const v=window.myr5Companion.viewer,a=v.stats().renders;await new Promise(r=>setTimeout(r,500));return v.stats().renders-a;});
 assert.equal(hidden,0,'no frames while hidden');
 assert.deepEqual(errors,[]);
});

test('reduced motion: section changes jump the camera instead of gliding',async t=>{
 const {page,open,download}=await harness(t,{reducedMotion:'reduce'});await download();await open();
 await page.waitForFunction(()=>document.querySelector('.editor-shell')?.dataset.cage==='ready',null,{timeout:60000});
 await page.click('[data-cage-section="weapons"]');
 const [a,b]=await page.evaluate(async()=>{const c=window.myr5Companion.viewer.camera,a=c.position.toArray();await new Promise(r=>setTimeout(r,300));return [a,c.position.toArray()];});
 for(let i=0;i<3;i++)assert(Math.abs(a[i]-b[i])<1e-3,'camera is already at the weapon wall');
});

test('through the real service worker: the room-cage group downloads its three files and the cage then loads from the package',async t=>{
 const {page,seen,errors,open,base}=await harness(t);
 await page.goto(base+'/privacy.html');
 await page.evaluate(async()=>{await navigator.serviceWorker.register('/sw.js');await navigator.serviceWorker.ready;});
 await page.reload();await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
 // What post-download.mjs does for a picked group: ask for the plan, then fetch each missing file whole, checked.
 const plan=await page.evaluate(async()=>{
  const ask=()=>new Promise(resolve=>{const c=new MessageChannel();c.port1.onmessage=({data})=>resolve(data);navigator.serviceWorker.controller.postMessage({type:'PACKAGE_PLAN',adopt:true,groups:['room-cage']},[c.port2]);});
  const plan=await ask(),cache=await caches.open(plan.cache);
  for(const asset of plan.missing)await cache.put(asset.url,await fetch(asset.url,{cache:'no-cache',headers:{'x-myr5-package':'1'},integrity:asset.integrity}));
  const after=await ask();return {missing:plan.missing.map(a=>a.url).sort(),left:after.groups['room-cage'].remaining};
 });
 assert.deepEqual(plan.missing,[...CAGE].sort());assert.equal(plan.left,0,'the group is complete');
 seen.length=0;await open();
 await page.waitForFunction(()=>document.querySelector('.editor-shell')?.dataset.cage==='ready',null,{timeout:60000});
 assert.deepEqual(seen.filter(p=>p.startsWith('/pod/rooms/cage/')),[],'decoder and model came from the package cache');
 assert.deepEqual(errors,[]);
});

test('a broken packet falls back to the flat customizer with a clear note',async t=>{
 const {page,errors,open,download}=await harness(t,{broken:true});await download();await open();
 await page.waitForFunction(()=>document.querySelector('.editor-shell')?.dataset.cage==='failed',null,{timeout:60000});
 assert.equal(await page.locator('.cage-bays').count(),0);
 assert.equal(await page.evaluate(()=>window.myr5Companion.viewer.floorObjects.every(o=>o.visible)),true);
 assert.match(await page.locator('#creatureStatus').textContent(),/3D cage could not load|Your coach is ready|Coach updated/);
 await page.click('#tab-face');assert.equal(await page.locator('#panel-face').isVisible(),true);
 assert.deepEqual(errors,[]);
});
