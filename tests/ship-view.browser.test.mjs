// Full-screen ship view: open/close/#ship hash contract, and the no-pack fallback. Mirrors the
// harness style of tests/post-download-safety.browser.test.mjs and tests/pyramid-lifecycle.browser.test.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {build} from 'esbuild';
import {chromium} from 'playwright';

const HTML=`<!doctype html><style>body{margin:0}</style>
<div id="coachMount"></div>
<nav class="coach-dock"><button type="button" data-panel="install"></button></nav>
<script type="importmap">{"imports":{"three":"/vendor/three/three.module.js","three/addons/loaders/GLTFLoader.js":"/vendor/three/GLTFLoader.js"}}</script>`;

async function withPage(run){
 // Bundled (like the deployed app-runtime.mjs) so battle-pass.mjs's .ts import resolves without
 // a full Vite dev server; 'three' stays external, resolved by the page's own import map at runtime.
 const bundle=await build({entryPoints:['modules/ships/ship-view.mjs'],bundle:true,write:false,format:'esm',target:'es2022',external:['three','three/addons/loaders/GLTFLoader.js']});
 const arrivalBundle=await build({stdin:{contents:"export {mountFirstShipArrival} from './modules/ships/ship-view-bridge.mjs';export {grantUnlock} from './unlock-ledger.mjs';export {hasSeenShipReveal,coachEditorShips} from './modules/ships/ship-access.mjs';",resolveDir:process.cwd()},bundle:true,write:false,format:'esm',target:'es2022',external:['three','three/addons/loaders/GLTFLoader.js','./modules/ships/ship-intro.mjs']});
 const root=resolve('.');
 const server=createServer(async(req,res)=>{
  const path=new URL(req.url,'http://test').pathname;
  if(path==='/'){res.setHeader('Content-Type','text/html');res.end(HTML);return;}
  if(path==='/arrival.js'){res.setHeader('Content-Type','text/javascript');res.end(arrivalBundle.outputFiles[0].text);return;}
  if(path==='/ship-view.js'){res.setHeader('Content-Type','text/javascript');res.end(bundle.outputFiles[0].text);return;}
  try{
   const file=resolve(root,'.'+path);if(!file.startsWith(root+sep))throw Error();
   res.setHeader('Content-Type',({'.js':'text/javascript','.mjs':'text/javascript','.css':'text/css'})[extname(file)]||'application/octet-stream');
   res.end(await readFile(file));
  }catch{res.writeHead(404);res.end();}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-gl=angle','--use-angle=swiftshader']});const page=await browser.newPage();await page.goto('http://127.0.0.1:'+server.address().port);await run(page);}
 finally{await browser?.close();await new Promise(r=>server.close(r));}
}

// Fixture loadCoachViewer: stands in for app.mjs's real one (which imports creature/assets/phone.js).
// It just drops a `.myr5-companion-card` into #coachMount, exactly like phone.js does into #view.
async function primeFixture(page){
 await page.evaluate(()=>{
  window.installClicks=0;document.querySelector('[data-panel="install"]').addEventListener('click',()=>window.installClicks++);
  window.fakeLoadCoachViewer=async()=>{if(!document.querySelector('.myr5-companion-card')){const card=document.createElement('aside');card.className='myr5-companion-card';document.getElementById('coachMount').append(card);}};
 });
}

// No verified pack: Original MYR5's bundled starter ship (the real GLB) over today's starter wonder.
const starterState=()=>({
 bg:document.querySelector('.ship-view-bg').style.backgroundImage,
 scene:document.querySelector('.ship-scene')?.dataset.ship||null,
 status:document.querySelector('.ship-scene-status')?.textContent||null,
 revealed:document.querySelector('.ship-view-stage').classList.contains('ship-intro-revealed'),
 idleCanvas:!!document.querySelector('.ship-view-canvas'),
 flash:!!document.querySelector('.ship-scene-flash'),
 line:document.querySelector('.ship-view-fallback').hidden?null:document.querySelector('.ship-view-fallback p').textContent,
 downloadHidden:document.querySelector('.ship-view-download').hidden,
 hasCoach:!!document.querySelector('.ship-view-coach .myr5-companion-card'),
});
const STARTER_BG=/^url\("\/pod\/worlds\/starter\/(great-wall-of-china-a|great-pyramid-of-giza-a|machu-picchu-a|taj-mahal-a|colosseum-a|mount-fuji-a)\.webp"\)$/;
const UPGRADE='Earn ships on your tracks · Download Ships & worlds for all of them';

test('signed out: the starter ship makes its entrance over a starter wonder once per session, then idles; no upgrade line, no reveal marked',async()=>withPage(async page=>{
 await primeFixture(page);
 const requests=[];page.on('request',r=>requests.push(new URL(r.url()).pathname));
 const first=await page.evaluate(async state=>{
  const {openShipView}=await import('/ship-view.js');
  window.myr5AuthenticatedAccount=null;window.readyEvents=[];addEventListener('myr5:ship-scene-ready',e=>readyEvents.push(e.detail));
  window.openStarter=()=>openShipView({loadCoachViewer:window.fakeLoadCoachViewer,getBridge:async()=>null,ownedShipIds:()=>{throw Error('must not be called while signed out')}});
  await openStarter();
  return {...(0,eval)(state)(),events:readyEvents.map(e=>({ship:e.ship,revealComplete:e.revealComplete,starter:e.starter}))};
 },`(${starterState})`);
 assert.match(first.bg,STARTER_BG);
 assert.deepEqual({...first,bg:undefined},{bg:undefined,scene:'supportive',status:'Coach ready. Select the ship to customize.',revealed:true,idleCanvas:false,flash:true,line:null,downloadHidden:true,hasCoach:true,events:[{ship:'supportive',revealComplete:false,starter:true}]});
 assert.ok(requests.includes('/pod/worlds/starter/supportive.glb'),'loads the bundled starter ship');
 await page.locator('.ship-view-close').click();await page.waitForFunction(()=>location.hash!=='#ship');
 await page.evaluate(()=>openStarter());
 const again=await page.evaluate(state=>(0,eval)(state)(),`(${starterState})`);
 assert.deepEqual({scene:again.scene,idleCanvas:again.idleCanvas,flash:again.flash,line:again.line},{scene:null,idleCanvas:true,flash:false,line:null},'the entrance plays once per session; after that the view idles');
 assert.match(again.bg,STARTER_BG);
}));

test('signed in without a ship, reduced motion: a still starter scene plus the upgrade line, no download button',async()=>withPage(async page=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await primeFixture(page);
 const state=await page.evaluate(async state=>{
  const {openShipView}=await import('/ship-view.js');
  window.myr5AuthenticatedAccount={user:{id:'owner-a'}};
  await openShipView({loadCoachViewer:window.fakeLoadCoachViewer,getBridge:async()=>null,ownedShipIds:()=>[]});
  return (0,eval)(state)();
 },`(${starterState})`);
 assert.match(state.bg,STARTER_BG);
 assert.deepEqual({scene:state.scene,idleCanvas:state.idleCanvas,flash:state.flash,line:state.line,downloadHidden:state.downloadHidden},{scene:null,idleCanvas:true,flash:false,line:UPGRADE,downloadHidden:true},'reduced motion never plays the cinematic');
}));

test('signed in, owns a ship, pack unavailable: starter scene with the upgrade line, and the download button routes to Ships & worlds',async()=>withPage(async page=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await primeFixture(page);
 const state=await page.evaluate(async state=>{
  const {openShipView}=await import('/ship-view.js');
  window.myr5AuthenticatedAccount={user:{id:'owner-a'}};
  const dialog=await openShipView({loadCoachViewer:window.fakeLoadCoachViewer,getBridge:async()=>null,ownedShipIds:()=>['supportive']});
  return {isDialog:dialog instanceof HTMLDialogElement,open:dialog.open,...(0,eval)(state)()};
 },`(${starterState})`);
 assert.deepEqual({isDialog:state.isDialog,open:state.open,line:state.line,downloadHidden:state.downloadHidden,hasCoach:state.hasCoach,idleCanvas:state.idleCanvas},{isDialog:true,open:true,line:UPGRADE,downloadHidden:false,hasCoach:true,idleCanvas:true});
 await page.locator('.ship-view-download').click();
 assert.equal(await page.evaluate(()=>window.installClicks),1,'falls back to the Install panel control when myr5Packs is unavailable');
 await page.evaluate(()=>{window.myr5Packs={open:id=>{window.packsOpened=id;}};});
 await page.locator('.ship-view-download').click();
 assert.equal(await page.evaluate(()=>window.packsOpened),'coach-ships-biomes');
 assert.equal(await page.evaluate(()=>window.installClicks),1,'prefers myr5Packs.open over the Install panel once it exists');
}));

test('the coach is framed whole (overlay stage) while the ship view is open, and gets its own stage back on close',async()=>withPage(async page=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await primeFixture(page);
 const stages=await page.evaluate(async()=>{
  const {openShipView}=await import('/ship-view.js');
  let stage='pod';const seen=[];window.myr5Creature={stage:next=>{stage=next;seen.push(next);},stats:()=>({stage})};
  await openShipView({loadCoachViewer:window.fakeLoadCoachViewer,getBridge:async()=>null});
  const open=stage,coach=document.querySelector('.ship-view-coach').getBoundingClientRect(),view=document.querySelector('.ship-view-stage').getBoundingClientRect();
  document.querySelector('.ship-view').close();await new Promise(r=>setTimeout(r,50));
  return {open,closed:stage,seen,coachBelowShipBand:coach.top>view.top+view.height*.3};
 });
 assert.deepEqual(stages,{open:'overlay',closed:'pod',seen:['overlay','pod'],coachBelowShipBand:true});
}));

test('open/close/#ship hash contract: close button, Escape, and the phone back button all close it and restore the coach',async()=>withPage(async page=>{
 await primeFixture(page);
 await page.evaluate(async()=>{const {openShipView}=await import('/ship-view.js');window.open=()=>openShipView({loadCoachViewer:window.fakeLoadCoachViewer,getBridge:async()=>null});window.dialog=await window.open();});
 assert.equal(await page.evaluate(()=>location.hash),'#ship');
 assert.equal(await page.evaluate(()=>document.body.dataset.shipView),'true','pod.mjs must not reclaim the coach card while the ship view owns it');
 assert.equal(await page.evaluate(()=>document.querySelector('#coachMount .myr5-companion-card')),null,'the live card moved into the ship view');
 // Close button.
 await page.locator('.ship-view-close').click();
 await page.waitForFunction(()=>!document.querySelector('dialog.ship-view[open]'));
 await page.waitForFunction(()=>location.hash!=='#ship');
 assert.equal(await page.evaluate(()=>document.body.dataset.shipView),'','cleared on close');
 assert.ok(await page.evaluate(()=>!!document.querySelector('#coachMount .myr5-companion-card')),'the card is handed back for pod.mjs to re-home');
 // Escape.
 await page.evaluate(()=>window.open());
 await page.waitForFunction(()=>document.querySelector('dialog.ship-view[open]'));
 await page.keyboard.press('Escape');
 await page.waitForFunction(()=>!document.querySelector('dialog.ship-view[open]'));
 await page.waitForFunction(()=>location.hash!=='#ship');
 // Phone back button (real browser history navigation).
 await page.evaluate(()=>window.open());
 await page.waitForFunction(()=>location.hash==='#ship');
 await page.goBack();
 await page.waitForFunction(()=>!document.querySelector('dialog.ship-view[open]'));
}));

async function mountFixtureWithShip(page){
 await primeFixture(page);
 return page.evaluate(async()=>{
  const THREE=await import('/vendor/three/three.module.js'),{GLTFLoader}=await import('/vendor/three/GLTFLoader.js');
  window.bridgeDisposes=0;
  GLTFLoader.prototype.loadAsync=async()=>{const model=new THREE.Group();model.add(new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial()));return {scene:model};};
  const {openShipView}=await import('/ship-view.js');
  const bridge={ownedShipIds:()=>['supportive'],getShipUrl:()=>'blob:verified',getBackgroundUrl:()=>'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==',dispose:()=>window.bridgeDisposes++};
  window.dialog=await openShipView({loadCoachViewer:window.fakeLoadCoachViewer,getBridge:async()=>bridge});
  return true;
 });
}
test('an available ship bridge renders the ship over the coach instead of the fallback, and disposes on close',async()=>withPage(async page=>{
 assert(await mountFixtureWithShip(page));
 await page.waitForFunction(()=>document.querySelector('.ship-view-canvas'));
 assert.equal(await page.evaluate(()=>document.querySelector('.ship-view-fallback').hidden),true);
 assert.match(await page.evaluate(()=>document.querySelector('.ship-view-bg').style.backgroundImage),/^url\("data:image\/gif/);
 await page.locator('.ship-view-close').click();
 await page.waitForFunction(()=>bridgeDisposes===1);
 assert.equal(await page.locator('.ship-view-canvas').count(),0);
}));

async function primeArrival(page) {
 await primeFixture(page);
 await page.evaluate(async()=>{
  const THREE=await import('/vendor/three/three.module.js'),{GLTFLoader}=await import('/vendor/three/GLTFLoader.js');
  GLTFLoader.prototype.loadAsync=async()=>{const model=new THREE.Group();model.add(new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial()));return {scene:model};};
  const {openShipView}=await import('/ship-view.js'),arrival=await import('/arrival.js');
  window.arrival=arrival;window.myr5AuthenticatedAccount={user:{id:'owner-a'}};
  arrival.grantUnlock('ship','ship-supportive',{account:'owner-a'});
  window.bridgeDisposes=0;window.makeBridge=()=>({ownedShipIds:()=>['supportive'],getShipUrl:()=>'blob:verified',getBackgroundUrl:()=>'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==',dispose:()=>window.bridgeDisposes++});
  window.openArrival=(getBridge=async()=>makeBridge())=>openShipView({loadCoachViewer:fakeLoadCoachViewer,getBridge,mountArrival:arrival.mountFirstShipArrival});
  window.arrivalEvents=[];window.addEventListener('myr5:ship-scene-ready',e=>arrivalEvents.push(e.detail));
 });
}

test('first verified owned arrival completes the real beam/flash before enabling editor; subsequent view is passive',async()=>withPage(async page=>{
 await primeArrival(page);
 await page.evaluate(()=>{window.opening=openArrival();});
 await page.waitForSelector('.ship-scene-beam.is-charging');
 assert.equal(await page.evaluate(()=>arrival.hasSeenShipReveal('supportive')),false);
 assert.equal(await page.locator('.ship-view-coach').evaluate(el=>getComputedStyle(el).opacity),'0');
 await page.evaluate(()=>window.opening);
 assert.equal(await page.evaluate(()=>arrival.hasSeenShipReveal('supportive')),true);
 assert.deepEqual(await page.evaluate(()=>arrival.coachEditorShips()),['supportive']);
 assert.equal(await page.evaluate(()=>arrivalEvents.filter(e=>e.revealComplete).length),1);
 assert.equal(await page.locator('.ship-view-coach').evaluate(el=>getComputedStyle(el).opacity),'1');
 await page.locator('.ship-view-close').click();await page.waitForFunction(()=>location.hash!=='#ship');
 assert.equal(await page.locator('#coachMount .myr5-companion-card').count(),1);
 await page.evaluate(()=>openArrival());
 assert.equal(await page.locator('.ship-scene').count(),0);
 assert.equal(await page.locator('.ship-view-canvas').count(),1);
 assert.equal(await page.evaluate(()=>arrivalEvents.filter(e=>e.revealComplete).length),1);
 await page.locator('.ship-view-close').click();await page.waitForFunction(()=>location.hash!=='#ship');
 await page.evaluate(()=>{
  arrival.grantUnlock('ship','ship-direct',{account:'owner-a'});
  localStorage.setItem('myr5-ship-customization-v1/owner-a',JSON.stringify({ship:'supportive'}));
  const previous=makeBridge;window.makeBridge=()=>({...previous(),ownedShipIds:()=>['supportive','direct']});
 });
 await page.evaluate(()=>openArrival());
 assert.equal(await page.locator('.ship-scene').getAttribute('data-ship'),'direct','new unseen ship takes precedence over a previously customized ship');
 assert.deepEqual(await page.evaluate(()=>arrival.coachEditorShips()),['supportive','direct']);
}));

test('closing or changing account during real arrival cancels without marking seen or retaining coach',async()=>withPage(async page=>{
 await primeArrival(page);
 for(const action of ['close','account']) {
  await page.evaluate(()=>{window.opening=openArrival();});
  await page.waitForSelector('.ship-scene-beam.is-charging');
  if(action==='close')await page.locator('.ship-view-close').click();
  else await page.evaluate(()=>{window.myr5AuthenticatedAccount={user:{id:'owner-b'}};window.dispatchEvent(new CustomEvent('myr5:account-ready',{detail:myr5AuthenticatedAccount}));});
  await page.evaluate(()=>window.opening);await page.waitForFunction(()=>location.hash!=='#ship');
  assert.equal(await page.evaluate(()=>arrival.hasSeenShipReveal('supportive',{account:'owner-a'})),false);
  assert.equal(await page.locator('.ship-scene').count(),0);
  assert.equal(await page.locator('.ship-scene-flash').count(),0);
  assert.equal(await page.locator('#coachMount .myr5-companion-card').count(),1);
  assert.equal(await page.evaluate(()=>arrivalEvents.length),0);
 }
}));

test('account change while verifying bridge discards late assets and cannot start an arrival',async()=>withPage(async page=>{
 await primeArrival(page);
 await page.evaluate(()=>{window.opening=openArrival(()=>new Promise(resolve=>window.finishBridge=resolve));});
 await page.waitForFunction(()=>typeof window.finishBridge==='function');
 await page.evaluate(()=>{window.myr5AuthenticatedAccount={user:{id:'owner-b'}};window.dispatchEvent(new CustomEvent('myr5:account-ready'));window.finishBridge(makeBridge());});
 await page.evaluate(()=>window.opening);
 assert.equal(await page.evaluate(()=>bridgeDisposes),1);
 assert.equal(await page.locator('.ship-scene').count(),0);
 assert.equal(await page.locator('.ship-view-canvas').count(),0);
 assert.equal(await page.evaluate(()=>arrivalEvents.length),0);
 assert.equal(await page.evaluate(()=>arrival.hasSeenShipReveal('supportive',{account:'owner-a'})),false);
}));


test('closing while the optional arrival module loads prevents a late scene and leaves reveal unseen',async()=>withPage(async page=>{
 await primeArrival(page);
 let releaseRequest;
 const requested=new Promise(resolve=>{releaseRequest=resolve;});
 await page.route('**/modules/ships/ship-intro.mjs',route=>{releaseRequest(route);});
 await page.evaluate(()=>{window.opening=openArrival();});
 const pending=await requested;
 await page.locator('.ship-view-close').click();
 await page.waitForFunction(()=>!document.querySelector('.ship-view').open);
 await pending.continue();await page.evaluate(()=>window.opening);
 assert.equal(await page.evaluate(()=>bridgeDisposes),1);
 assert.equal(await page.locator('.ship-scene').count(),0);
 assert.equal(await page.evaluate(()=>arrivalEvents.length),0);
 assert.equal(await page.evaluate(()=>arrival.hasSeenShipReveal('supportive')),false);
 assert.equal(await page.locator('#coachMount .myr5-companion-card').count(),1);
}));
