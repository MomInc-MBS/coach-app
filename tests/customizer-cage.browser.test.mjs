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
  assert.deepEqual(state.routes,['customizeCoach','food','portal','scoreboard','achievements','reminders']);assert.ok(state.icons.every(Boolean),'all six controls use current icons');assert.equal(state.current,'customizeCoach');assert.equal(state.metal,'#654321');assert.match(await page.locator('.portal-standalone-aura').evaluate(el=>getComputedStyle(el).backgroundImage),/25, 180, 120/,'actual feathered aura uses saved Strip');
  assert.ok(Math.abs(state.frame.x-15)<1&&Math.abs(state.frame.y-15)<1&&Math.abs(state.frame.width-345)<1&&Math.abs(state.frame.height-(height-30-88))<1,'editor housing follows 15px rails above the 88px console');assert.ok(state.dock.left===0&&state.dock.right===375&&state.dock.bottom===height&&state.dock.height===88,'shared console sits beneath the housing: '+JSON.stringify(state.dock));assert.ok(state.links.every(link=>link.hit),'all current dock controls stay tappable');
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

test('customizer permanently uses maximum motion; the Motion tab is gone but old motion data still loads',{timeout:90000},async t=>{
 const {page,open}=await harness(t);await open();
 for(const raw of [JSON.stringify({amount:.65,ambient:true,reduced:false}),JSON.stringify({amount:0,ambient:false,reduced:true}),JSON.stringify({amount:99}),'{bad']){
  await page.evaluate(raw=>localStorage.setItem('myr5-motion-v1',raw),raw);await open();assert.equal(await page.evaluate(()=>window.myr5Companion.viewer.settings.amount),1.5,'legacy or malformed movement settings cannot lower or exceed the fixed maximum');
 }
 assert.equal(await page.locator('#amount,#amountValue,input[type="range"][name="amount"]').count(),0,'the intensity setting is removed');
 for(const id of ['#tab-motion','#panel-motion','#gestures','#ambient','#reduced'])assert.equal(await page.locator(id).count(),0,id+' is removed (R18 F2)');
 await page.locator('#pauseMotion').click();assert.equal(await page.evaluate(()=>window.myr5Companion.viewer.motion.paused),true);await page.locator('#pauseMotion').click();assert.equal(await page.evaluate(()=>window.myr5Companion.viewer.motion.paused),false);
});

// R18 F5: the war-room cage and its bay buttons are gone from the customizer for good (the War Room page keeps them: war-room-gala tests).
test('the customizer shows only the close-up coach: no cage, no bays, no cage offer, even with the packet downloaded',async t=>{
 const {page,seen,open,download}=await harness(t);await download();seen.length=0;await open();
 await page.waitForTimeout(1500);
 for(const sel of ['.cage-bays','.cage-offer','.cage-weapon-wall','#panel-bay'])assert.equal(await page.locator(sel).count(),0,sel);
 assert.equal(await page.locator('.editor-shell').getAttribute('data-cage'),null);
 assert.equal(await page.evaluate(()=>window.myr5Companion.cage),undefined);
 assert.deepEqual(seen.filter(p=>p.startsWith('/pod/rooms/cage/')),[],'the customizer never fetches a cage byte');
 assert.deepEqual(await page.locator('.menu-tabs [role=tab]:not([hidden])').allTextContents(),['Species','Colour','Face','Files']);
});
