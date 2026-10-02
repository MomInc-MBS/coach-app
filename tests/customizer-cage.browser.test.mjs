// W4-4E (#116, D47): the optional 3D customizer cage. Serves the built dist/client (npm run build first).
// "Downloaded" is simulated the way the Downloads menu leaves it: the three packet files in a myr5-package-* cache.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';
import {build} from 'esbuild';

const root=resolve('dist/client'),frames=resolve('.frames/w4-4e');
const TYPES={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.glb':'model/gltf-binary','.wasm':'application/wasm','.png':'image/png','.webp':'image/webp'};
const CAGE=['/pod/rooms/cage/cage.glb','/pod/rooms/cage/draco_wasm_wrapper.js','/pod/rooms/cage/draco_decoder.wasm'];

async function harness(t,{broken=false,reducedMotion='no-preference',pets=[]}={}){
 const editor=process.env.MYR5_SOURCE_CREATURE==='1'?(await build({entryPoints:['creature/source/editor.ts'],bundle:true,format:'esm',target:'es2022',write:false,plugins:[{name:'vendored-three',setup(build){build.onResolve({filter:/^three$/},()=>({path:'three',external:true}));}}]})).outputFiles[0].contents:null;
 const seen=[];
 const server=createServer(async(req,res)=>{const path=new URL(req.url,'http://local').pathname;seen.push(path);
  if(editor&&path==='/creature/assets/editor.js'){res.setHeader('Content-Type','text/javascript');res.end(editor);return;}
  if(editor&&path==='/creature/index.html'){res.setHeader('Content-Type','text/html');res.end(await readFile(resolve('creature/index.html')));return;}
  if(editor&&(path.startsWith('/modules/portal/')||path==='/creature/creature.css')){try{res.setHeader('Content-Type',TYPES[extname(path)]||'application/octet-stream');res.end(await readFile(resolve('.'+path)));return;}catch{}}
  if(broken&&path===CAGE[0]){res.writeHead(200,{'Content-Type':'model/gltf-binary'});res.end('not a model');return;}
  try{const body=await readFile(resolve(root,'.'+path));res.setHeader('Content-Type',TYPES[extname(path)]||'application/octet-stream');res.end(body);}catch{res.writeHead(404);res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({channel:'msedge',headless:true});
 t.after(async()=>{await browser.close();server.close();});
 const context=await browser.newContext({viewport:{width:375,height:812},deviceScaleFactor:1,reducedMotion});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>sessionStorage.setItem('myr5-ship-gate','ship-admission-v2')); // #148: through the ship
 if(pets.length)await page.addInitScript(ids=>{if(!localStorage.getItem('myr5-battle-pass-ledger-v1'))localStorage.setItem('myr5-battle-pass-ledger-v1',JSON.stringify({pet:ids}));},pets);
 const base='http://127.0.0.1:'+server.address().port;
 const open=async()=>{await page.goto(base+'/creature/index.html');await page.waitForFunction(()=>window.myr5Companion?.ready===true,null,{timeout:60000});};
 const download=async()=>{await page.goto(base+'/privacy.html');await page.evaluate(async files=>{const cache=await caches.open('myr5-package-test');for(const url of files)await cache.put(url,await fetch(url));},CAGE);};
 return {page,seen,errors,open,download,base};
}
const shot=async(page,name)=>{await mkdir(frames,{recursive:true});await page.screenshot({path:resolve(frames,name+'.png')});};
const box=async(page,selector)=>page.locator(selector).first().boundingBox();
const overlaps=(a,b)=>!!a&&!!b&&a.x<b.x+b.width&&b.x<a.x+a.width&&a.y<b.y+b.height&&b.y<a.y+a.height;
const inside=(a,b)=>a.x>=b.x-.5&&a.y>=b.y-.5&&a.x+a.width<=b.x+b.width+.5&&a.y+a.height<=b.y+b.height+.5;

test('customizer shares the current six-button dock and saved metal housing at phone sizes',{timeout:90000},async t=>{
 const {page,open}=await harness(t);await page.addInitScript(()=>{localStorage.setItem('myr5.portalMetal','#654321');localStorage.setItem('myr5.portalStrip','#19b478');});
 for(const height of [812,667]){
  await page.setViewportSize({width:375,height});await open();await page.waitForFunction(()=>document.querySelector('#portalChrome .portal-frame'));
  const state=await page.evaluate(()=>{const dock=document.querySelector('.coach-dock'),chrome=document.querySelector('#portalChrome'),frame=chrome.querySelector('.portal-frame'),aura=chrome.querySelector('.portal-standalone-aura'),r=el=>el.getBoundingClientRect().toJSON();return{routes:[...dock.querySelectorAll('[data-route]')].map(el=>el.dataset.route),icons:[...dock.querySelectorAll('[data-route]')].map(el=>!!el.querySelector('svg')),current:dock.querySelector('[aria-current]')?.dataset.route,frame:r(frame),dock:r(dock),metal:getComputedStyle(chrome).getPropertyValue('--portal-metal').trim(),aura:aura?getComputedStyle(aura).backgroundImage:'',auraStyle:aura?.getAttribute('style')||'',links:[...dock.querySelectorAll('[data-route]')].map(el=>({route:el.dataset.route,href:el.getAttribute('href'),hit:(()=>{const b=r(el);return el.contains(document.elementFromPoint(b.x+b.width/2,b.y+b.height/2));})()}))};});
  await shot(page,'r17-editor-housing-375x'+height);
  assert.deepEqual(state.routes,['customizeCoach','food','portal','scoreboard','achievements','reminders']);assert.ok(state.icons.every(Boolean),'all six controls use current icons');assert.equal(state.current,'customizeCoach');assert.equal(state.metal,'#654321');assert.match(await page.locator('.portal-standalone-aura').evaluate(el=>getComputedStyle(el).boxShadow),/25, 180, 120/,'actual feathered aura uses saved Strip');
  assert.ok(Math.abs(state.frame.x-15)<1&&Math.abs(state.frame.y-15)<1&&Math.abs(state.frame.width-345)<1&&Math.abs(state.frame.height-(height-30))<1,'editor housing follows15px rails');assert.ok(state.dock.left>=14&&state.dock.right<=361&&state.dock.bottom<=height-14,'dock stays inside housing: '+JSON.stringify(state.dock));assert.ok(state.links.every(link=>link.hit),'all current dock controls stay tappable');
  for(const link of state.links.filter(link=>link.route!=='customizeCoach'))assert.ok(link.href?.startsWith('/pose.html'),'dock returns to real main routes');
 }
});

test('customizer tilt moves content within a fixed frame and stops on reduced motion, hidden pages and disposal',{timeout:90000},async t=>{
 const {page,open}=await harness(t);await open();await page.waitForFunction(()=>document.querySelector('#portalChrome.portal-standalone'));
 const pose=()=>page.evaluate(()=>{const el=document.querySelector('.editor-shell'),s=getComputedStyle(el);return{x:parseFloat(s.getPropertyValue('--editor-peer-x'))||0,y:parseFloat(s.getPropertyValue('--editor-peer-y'))||0,translate:s.translate,rotate:s.rotate,frame:document.querySelector('#portalChrome .portal-frame')?.getBoundingClientRect().toJSON(),dock:document.querySelector('.coach-dock').getBoundingClientRect().toJSON()};});
 const initial=await pose();await page.mouse.move(370,350);await page.waitForTimeout(700);const moved=await pose();assert.ok(moved.x>.5&&moved.x<=2.6&&moved.translate!=='none','actual editor content follows pointer gently');assert.deepEqual(moved.frame,initial.frame);assert.deepEqual(moved.dock,initial.dock);
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(80);assert.equal((await pose()).translate,'none');
 await page.emulateMedia({reducedMotion:'no-preference'});await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});const hidden=await pose();await page.mouse.move(5,50);await page.waitForTimeout(120);assert.equal((await pose()).x,hidden.x,'backgrounded editor does not keep moving');
 await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));dispatchEvent(new PageTransitionEvent('pagehide',{persisted:false}));});await page.mouse.move(350,500);await page.emulateMedia({reducedMotion:'reduce'});await page.emulateMedia({reducedMotion:'no-preference'});await page.waitForTimeout(120);
 assert.equal(await page.locator('#portalChrome').count(),0,'page disposal removes the standalone frame');assert.equal(await page.locator('.editor-shell').evaluate(el=>el.style.getPropertyValue('--editor-peer-x')),'','disposed listeners cannot restart parallax');
});

test('Original MYR5 Infernal stays assembled through amplified idle motion and gesture crossfades',{timeout:90000},async t=>{
 const {page,open}=await harness(t);await open();
 const report=await page.evaluate(async()=>{
  const T=await import('/vendor/three/three.module.js'),api=window.myr5Companion,v=api.viewer;v.setAwake(false);const reports=[];
  for(const amount of [.65,1,1.5]){
   await v.setRecipe({...api.recipe,styles:Object.fromEntries(Object.keys(api.recipe.styles).map(k=>[k,9]))});v.setSettings({...v.settings,amount,reduced:false,ambient:true});v.play('idle');
   const stages=[];for(const [gesture,frames] of [['idle',1200],['celebrate',300],['walk',900],['idle',1200]]){
    v.play(gesture);const state={gesture,finite:true,maxPivotOffset:0,maxExtent:0,maxBreath:0};
    for(let frame=0;frame<frames;frame++){v.motion.update(1/30);for(const [name,node]of Object.entries(v.rig.nodes)){const values=[...node.position.toArray(),...node.scale.toArray(),...node.quaternion.toArray()];state.finite&&=values.every(Number.isFinite);state.maxPivotOffset=Math.max(state.maxPivotOffset,node.position.distanceTo(v.rig.rest[name].position));}state.maxBreath=Math.max(state.maxBreath,Math.abs(v.rig.nodes.BodyMotion.scale.y-1));if(frame%60===0){const bounds=new T.Box3().setFromObject(v.rig.root);state.maxExtent=Math.max(state.maxExtent,...bounds.min.toArray().map(Math.abs),...bounds.max.toArray().map(Math.abs));}}
    stages.push(state);
   }
   reports.push({amount,stages});
  }return reports;
 });
 for(const {amount,stages}of report)for(const state of stages){assert.equal(state.finite,true,JSON.stringify({amount,state}));assert.ok(state.maxPivotOffset<.5&&state.maxExtent<10,'real mesh and limb bounds stay assembled: '+JSON.stringify({amount,state}));if(state.gesture==='idle')assert.ok(state.maxBreath>.003,'idle breathing remains active rather than being disabled');}
 assert.ok(report[2].stages[0].maxBreath>report[1].stages[0].maxBreath*1.4,'the supported 1.5 movement setting still amplifies motion');
});

test('mixed nonrest plateaus survive repeated weighting, pause, reduced mode, sleep and neutral reset',{timeout:90000},async t=>{
 const {page,open}=await harness(t);await open();const result=await page.evaluate(async()=>{
  const T=await import('/vendor/three/three.module.js'),v=window.myr5Companion.viewer;v.setAwake(false);v.setSettings({...v.settings,amount:1.5,reduced:false,ambient:true});const m=v.motion,body=v.rig.nodes.BodyMotion,rest=v.rig.rest.BodyMotion.position.y;
  m.mixer.stopAllAction();const clip=new T.AnimationClip('held-review-pose',2,[new T.VectorKeyframeTrack('BodyMotion.position',[0,1,2],[0,rest+.2,0,0,rest+.2,0,0,rest+.2,0])]);m.mixer.clipAction(clip).play();
  const errors=[];for(let i=0;i<240;i++){m.update(1/30);errors.push(Math.abs(body.position.y-(rest+.3)));}
  m.paused=true;const paused=body.position.y;for(let i=0;i<30;i++)m.update(1/30);const pauseHeld=body.position.y===paused;m.paused=false;
  m.reduced=true;for(let i=0;i<60;i++)m.update(1/30);const reducedError=Math.abs(body.position.y-rest);m.reduced=false;m.update(1/30);const resumedError=Math.abs(body.position.y-(rest+.3));
  m.sleeping=true;for(let i=0;i<120;i++)m.update(1/30);m.sleeping=false;m.update(1/30);const awakeError=Math.abs(body.position.y-(rest+.3));
  m.neutral();m.update(1/30);const neutralError=Math.abs(body.position.y-rest);return{maxPlateauError:Math.max(...errors),pauseHeld,reducedError,resumedError,awakeError,neutralError};
 });assert.equal(result.pauseHeld,true);for(const [key,value]of Object.entries(result))if(key!=='pauseHeld')assert.ok(value<1e-5,key+': '+JSON.stringify(result));
});

test('customizer permanently uses maximum motion while retaining pause, ambient and still controls',{timeout:90000},async t=>{
 const {page,open}=await harness(t);await open();
 for(const raw of [JSON.stringify({amount:.65,ambient:true,reduced:false}),JSON.stringify({amount:0,ambient:false,reduced:true}),JSON.stringify({amount:99}),'{bad']){
  await page.evaluate(raw=>localStorage.setItem('myr5-motion-v1',raw),raw);await open();assert.equal(await page.evaluate(()=>window.myr5Companion.viewer.settings.amount),1.5,'legacy or malformed movement settings cannot lower or exceed the fixed maximum');
 }
 assert.equal(await page.locator('#amount,#amountValue,input[type="range"][name="amount"]').count(),0,'the intensity setting is removed');
 await page.click('#tab-motion');await page.locator('#ambient').uncheck();assert.equal(await page.evaluate(()=>window.myr5Companion.viewer.settings.ambient),false);assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('myr5-motion-v1')).amount),1.5);
 await page.locator('#reduced').check();assert.equal(await page.evaluate(()=>window.myr5Companion.viewer.motion.reduced),true);await page.locator('#reduced').uncheck();
 await page.locator('#pauseMotion').click();assert.equal(await page.evaluate(()=>window.myr5Companion.viewer.motion.paused),true);await page.locator('#pauseMotion').click();assert.equal(await page.evaluate(()=>window.myr5Companion.viewer.motion.paused),false);
 assert.equal(await page.locator('#gestures [data-gesture="celebrate"]').count(),1);
});

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
 await page.click('#tab-materials');await page.click('#colorSwatches [data-channel="body"][data-color="default-ruby"]');
 await page.waitForFunction(()=>window.myr5Companion.recipe.materials?.body?.colorId==='default-ruby'&&window.myr5Companion.ready,null,{timeout:60000});
 await shot(page,'not-downloaded-375x812');
 assert.deepEqual(errors,[]);
});

test('downloaded: the cage surrounds the live coach at 375×812; bays, taps and keys open real controls without saving anything',async t=>{
 const {page,seen,errors,open,download}=await harness(t,{pets:['push-pet']});await download();await open();
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
 // Pets: granted device pets plus None, None selected until a pet is tapped; every tab unselected.
 await page.click('[data-cage-section="pets"]');
 assert.equal(await page.locator('#panel-bay').isVisible(),true);
 assert.equal(await page.locator('#bayTitle').textContent(),'Pet cages');
 assert.match(await page.locator('#panel-bay').textContent(),/Selected on this device/);
 assert.match(await page.locator('#panel-bay').textContent(),/No pet appears with your coach yet/);
 assert.deepEqual(await page.locator('[data-pet-choice]').evaluateAll(b=>b.map(x=>x.dataset.petChoice)),['','push-pet']);
 assert.equal(await page.locator('[data-pet-choice=""]').getAttribute('aria-pressed'),'true');
 assert.equal(await page.locator('.menu-tabs [aria-selected=true]').count(),0);
 await page.waitForTimeout(800);await shot(page,'cage-pets-375x812');
 // Weapons by keyboard: battle-pass rewards, then a separate Gala form that stays locked for a guest.
 await page.focus('[data-cage-section="weapons"]');await page.keyboard.press('Enter');
 assert.equal(await page.locator('#bayTitle').textContent(),'Weapon wall');
 assert.match(await page.locator('#panel-bay').textContent(),/Battle-pass weapons/);
 assert.equal(await page.locator('[data-gala-loadout] h3').textContent(),'Gala War Room loadout');
 assert.match(await page.locator('[data-gala-loadout] [role=status]').textContent(),/Sign in/);
 assert.equal(await page.locator('[data-gala-loadout] button:has-text("Save loadout")').isDisabled(),true,'guest form is locked');
 assert.equal(await page.locator('[data-gala-loadout] select').isDisabled(),true);
 await page.waitForTimeout(800);await shot(page,'cage-weapons-375x812');
 await page.click('[data-cage-section="clothing"]');
 assert.equal(await page.locator('#bayTitle').textContent(),'Clothing bay');
 assert.match(await page.locator('#panel-bay').textContent(),/Nothing to wear yet/);
 await page.waitForTimeout(800);await shot(page,'cage-clothing-375x812');
 const after=await page.evaluate(()=>({recipe:JSON.stringify(window.myr5Companion.recipe),storage:JSON.stringify(Object.entries(localStorage).sort()),undo:document.getElementById('undo').disabled}));
 assert.deepEqual(after,before,'bays never write the recipe, undo history or storage');
 assert.deepEqual(seen.filter(p=>p.startsWith('/api/war-room')),[],'a guest never reaches the War Room API');
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

test('pet cages: choosing saves only the device preference, survives reopen, and a lost grant falls back to None',async t=>{
 const {page,errors,open,download}=await harness(t,{pets:['push-pet']});await download();await open();
 await page.waitForFunction(()=>document.querySelector('.editor-shell')?.dataset.cage==='ready',null,{timeout:60000});
 const recipe=()=>page.evaluate(()=>JSON.stringify({recipe:window.myr5Companion.recipe,stored:localStorage.getItem('myr5-recipe-v1'),ledger:localStorage.getItem('myr5-battle-pass-ledger-v1'),undo:document.getElementById('undo').disabled}));
 const before=await recipe();
 await page.click('[data-cage-section="pets"]');
 await page.focus('[data-pet-choice="push-pet"]');await page.keyboard.press('Enter');
 assert.equal(await page.locator('[data-pet-choice="push-pet"]').getAttribute('aria-pressed'),'true');
 assert.equal(await page.evaluate(()=>document.activeElement?.dataset.petChoice),'push-pet','focus stays on the choice');
 assert.match(await page.locator('[data-pet-status]').textContent(),/: Selected on this device/);
 assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('myr5-cage-selection-v1'))),{version:1,petId:'push-pet'});
 assert.equal(await recipe(),before,'choosing a pet never touches the coach recipe or grants anything');
 assert((await box(page,'[data-pet-choice="push-pet"]')).height>=44,'touch target');
 await page.click('[data-cage-section="weapons"]');await page.click('[data-cage-section="pets"]');
 assert.equal(await page.locator('[data-pet-choice="push-pet"]').getAttribute('aria-pressed'),'true','reopen keeps it');
 // The grant disappears while the bay is closed: reopening revalidates.
 await page.click('#tab-face');await page.evaluate(()=>localStorage.setItem('myr5-battle-pass-ledger-v1',JSON.stringify({pet:[]})));
 await page.click('[data-cage-section="pets"]');
 assert.equal(await page.locator('[data-pet-choice]').count(),1,'only None remains');
 assert.equal(await page.locator('[data-pet-choice=""]').getAttribute('aria-pressed'),'true');
 // Storage that refuses the write shows an error and keeps the previous choice.
 await page.evaluate(()=>localStorage.setItem('myr5-battle-pass-ledger-v1',JSON.stringify({pet:['push-pet']})));
 await page.click('[data-cage-section="weapons"]');await page.click('[data-cage-section="pets"]');
 await page.evaluate(()=>{Storage.prototype.setItem=()=>{throw Error('full');};});
 await page.click('[data-pet-choice="push-pet"]');
 assert.match(await page.locator('#panel-bay [role=alert]').textContent(),/could not be saved/);
 assert.equal(await page.locator('[data-pet-choice="push-pet"]').getAttribute('aria-pressed'),'false');
 await shot(page,'cage-pets-error-375x812');
 assert.deepEqual(errors,[]);
});

test('weapon wall: the Gala form is removed and its listeners detached when the bay closes; the loadout is never auto-saved',async t=>{
 const {page,seen,errors,open,download}=await harness(t);await download();await open();
 await page.waitForFunction(()=>document.querySelector('.editor-shell')?.dataset.cage==='ready',null,{timeout:60000});
 await page.click('[data-cage-section="weapons"]');
 assert.equal(await page.locator('.cage-weapon-wall').count(),1);
 await page.click('[data-cage-section="pets"]');
 assert.equal(await page.locator('.cage-weapon-wall').count(),0,'another bay disposes it');
 await page.click('[data-cage-section="weapons"]');await page.click('#tab-face');
 assert.equal(await page.locator('.cage-weapon-wall').count(),0,'a console tab disposes it');
 await page.evaluate(()=>{window.myr5AuthenticatedAccount={user:{id:'A'}};window.dispatchEvent(new CustomEvent('myr5:account-ready'));});
 await page.waitForTimeout(200);
 assert.deepEqual(seen.filter(p=>p.startsWith('/api/war-room')),[],'a disposed form no longer reacts to account events');
 await page.evaluate(()=>{window.myr5AuthenticatedAccount=null;});
 await page.click('[data-cage-section="weapons"]');
 assert.equal(await page.locator('.cage-weapon-wall').count(),1);
 await page.evaluate(()=>window.myr5Companion.cage.dispose());
 assert.equal(await page.locator('.cage-weapon-wall').count(),0,'disposing the cage disposes the form');
 assert.deepEqual(seen.filter(p=>p.startsWith('/api/war-room/loadout')),[],'no loadout write without pressing Save');
 assert.deepEqual(errors,[]);
});
