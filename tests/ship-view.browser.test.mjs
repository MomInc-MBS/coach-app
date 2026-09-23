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
 const root=resolve('.');
 const server=createServer(async(req,res)=>{
  const path=new URL(req.url,'http://test').pathname;
  if(path==='/'){res.setHeader('Content-Type','text/html');res.end(HTML);return;}
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

test('missing-pack fallback shows the coach with a local backdrop and routes the download button',async()=>withPage(async page=>{
 await primeFixture(page);
 const state=await page.evaluate(async()=>{
  const {openShipView}=await import('/ship-view.js');
  const dialog=await openShipView({loadCoachViewer:window.fakeLoadCoachViewer,getBridge:async()=>null});
  window.shipDialog=dialog;
  return {
   isDialog:dialog instanceof HTMLDialogElement,open:dialog.open,
   fallbackHidden:document.querySelector('.ship-view-fallback').hidden,
   fallbackText:document.querySelector('.ship-view-fallback p').textContent,
   bgIsFallback:document.querySelector('.ship-view-bg').classList.contains('ship-view-bg-fallback'),
   hasCoach:!!document.querySelector('.ship-view-coach .myr5-companion-card'),
   hasCanvas:!!document.querySelector('.ship-view-canvas'),
  };
 });
 assert.deepEqual(state,{isDialog:true,open:true,fallbackHidden:false,fallbackText:'Download Ships & worlds to see your ship',bgIsFallback:true,hasCoach:true,hasCanvas:false});
 await page.locator('.ship-view-download').click();
 assert.equal(await page.evaluate(()=>window.installClicks),1,'falls back to the Install panel control when myr5Packs is unavailable');
 await page.evaluate(()=>{window.myr5Packs={open:id=>{window.packsOpened=id;}};});
 await page.locator('.ship-view-download').click();
 assert.equal(await page.evaluate(()=>window.packsOpened),'coach-ships-biomes');
 assert.equal(await page.evaluate(()=>window.installClicks),1,'prefers myr5Packs.open over the Install panel once it exists');
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
