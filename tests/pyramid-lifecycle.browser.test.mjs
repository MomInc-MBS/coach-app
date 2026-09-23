import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {build} from 'esbuild';
import {chromium} from 'playwright';
import {completeCoach} from './onboarding-fixture.mjs';

// Exercise current source without rewriting any generated release artifacts.
async function withScanner(run){
 const root=resolve('dist/client'),source=resolve('.');
 const bundle=await build({entryPoints:['launch.mjs'],bundle:true,write:false,format:'esm',target:'es2022',external:['./nutrition-data.mjs','./local-coach-runtime.mjs','./food/pyramid-scanner.mjs']});
 const server=createServer(async(req,res)=>{
  const path=new URL(req.url,'http://local').pathname;
  if(path==='/__test__'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>Test</title>');return;}
  if(path==='/__pyramid__'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><style>body{width:430px;margin:0}</style><button id="foodCamera">Camera</button><script type="importmap">{"imports":{"three":"/vendor/three/three.module.js","three/addons/loaders/GLTFLoader.js":"/vendor/three/GLTFLoader.js"}}</script>');return;}
  if(path==='/launch-runtime.mjs'){res.setHeader('Content-Type','text/javascript');res.end(bundle.outputFiles[0].text);return;}
  if(path.startsWith('/api/')){res.writeHead(path==='/api/auth/config'?200:401,{'Content-Type':'application/json'});res.end(JSON.stringify(path==='/api/auth/config'?{enabled:false}:{error:'Sign in'}));return;}
  try{const base=path.startsWith('/food/')?source:root,file=resolve(base,'.'+path);if(!file.startsWith(base+sep))throw Error();const body=await readFile(file);res.writeHead(200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.glb':'model/gltf-binary'})[extname(file)]||'application/octet-stream'});res.end(body);}catch{res.writeHead(404);res.end();}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-gl=angle','--use-angle=swiftshader']});
  const context=await browser.newContext({serviceWorkers:'block'});
  await run(context,'http://127.0.0.1:'+server.address().port);
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
}

test('Food closes pending downloads immediately and rapid reopen has one mount',async()=>withScanner(async(context,base)=>{
 const page=await context.newPage(),requests=[],warnings=[];
 page.on('console',msg=>{if(msg.type()==='warning')warnings.push(msg.text());});
 await page.route('**/food/pyramid-scanner.glb',route=>{requests.push(route);});
 await page.addInitScript(()=>{
  window.scannerAborts=0;window.scannerPaints=0;
  const fetch=window.fetch;window.fetch=function(input,options){if(String(input).endsWith('/food/pyramid-scanner.glb'))options.signal.addEventListener('abort',()=>window.scannerAborts++);return fetch.call(this,input,options);};
  const paint=CanvasRenderingContext2D.prototype.fillText;CanvasRenderingContext2D.prototype.fillText=function(value,...args){if(value==='FOOD')window.scannerPaints++;return paint.call(this,value,...args);};
 });
 await page.goto(base+'/__test__');
 await page.evaluate(async intake=>{const {openLocalCoach}=await import('/local-coach-runtime.mjs');const repo=await openLocalCoach();await repo.forOwner(repo.guestOwnerId).saveSetup(intake,{startDay:'2026-09-21'});repo.close();},completeCoach());
 await page.goto(base+'/pose.html?panel=meals');
 await page.waitForFunction(()=>document.querySelector('#pyramidScanner canvas'));
 await page.evaluate(()=>{document.querySelector('[data-panel="meals"]').click();document.querySelector('[data-panel="meals"]').click();});
 await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 assert.equal(requests.length,1,'repeat open must share the pending mount');
 assert.equal(await page.locator('#pyramidScanner').count(),1);
 for(let attempt=1;attempt<=2;attempt++){
  await page.evaluate(()=>document.querySelector('#mealsPanel').close());
  await page.waitForFunction(n=>window.scannerAborts===n&&!document.querySelector('#pyramidScanner'),attempt);
  await page.evaluate(()=>document.querySelector('[data-panel="meals"]').click());
  await page.waitForFunction(()=>document.querySelector('#pyramidScanner canvas'));
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  assert.equal(requests.length,attempt+1);
  assert.equal(await page.locator('#pyramidScanner').count(),1,'old mounts must not survive reopening');
 }
 for(const route of requests.slice(0,-1))await route.abort().catch(()=>{});
 await requests.at(-1).continue();
 await page.waitForFunction(()=>window.scannerPaints>0);
 assert.equal(await page.locator('#pyramidScanner').count(),1);
 assert(!warnings.some(w=>w.includes('Pyramid scanner unavailable')),warnings.join('\n'));
}));

test('a model that finishes decoding after cancellation is disposed without remounting',async()=>withScanner(async(context,base)=>{
 const page=await context.newPage();await page.goto(base+'/__pyramid__');
 await page.evaluate(async()=>{
  const {GLTFLoader}=await import('/vendor/three/GLTFLoader.js'),parse=GLTFLoader.prototype.parseAsync;
  window.disposedGeometries=0;
  GLTFLoader.prototype.parseAsync=async function(...args){const result=await parse.apply(this,args);result.scene.traverse(n=>n.geometry?.addEventListener('dispose',()=>window.disposedGeometries++));window.parseStarted=true;await new Promise(r=>window.releaseParse=r);return result;};
  const {mountPyramidScanner}=await import('/food/pyramid-scanner.mjs');window.cancelScanner=new AbortController();
  window.pendingScanner=mountPyramidScanner(document.querySelector('#foodCamera'),{signal:window.cancelScanner.signal}).then(()=> 'mounted',error=>error.name);
 });
 await page.waitForFunction(()=>window.parseStarted);
 await page.evaluate(()=>window.cancelScanner.abort());
 assert.equal(await page.locator('#pyramidScanner').count(),0);
 const result=await page.evaluate(async()=>{window.releaseParse();return await window.pendingScanner;});
 assert.equal(result,'AbortError');
 assert((await page.evaluate(()=>window.disposedGeometries))>0);
 assert.equal(await page.locator('#pyramidScanner').count(),0);
}));

test('reduced motion keeps knobs, glow, lens and released drag steady',async()=>withScanner(async(context,base)=>{
 const page=await context.newPage();await page.emulateMedia({reducedMotion:'reduce'});await page.goto(base+'/__pyramid__');
 await page.evaluate(async()=>{
  const THREE=await import('/vendor/three/three.module.js'),add=THREE.Scene.prototype.add;
  THREE.Scene.prototype.add=function(...args){window.scannerScene=this;return add.apply(this,args);};
  const {mountPyramidScanner}=await import('/food/pyramid-scanner.mjs');window.scanner=await mountPyramidScanner(document.querySelector('#foodCamera'));THREE.Scene.prototype.add=add;
  window.sampleMotion=()=>new Promise(resolve=>{
   const frames=[];function sample(){const stage=window.scannerScene.children.find(n=>n.isGroup),knob=stage.getObjectByName('knob_0'),lens=stage.getObjectByName('lens');frames.push({stage:stage.matrix.toArray(),knob:knob.matrix.toArray(),glow:knob.material.emissiveIntensity,lens:lens.children[0].material.opacity,rotation:stage.children[0].rotation.y,steam:stage.children[0].getObjectsByProperty('isSprite',true).filter(n=>n.visible&&n.parent.name!=='lens').length});if(frames.length===12)resolve(frames);else requestAnimationFrame(sample);}requestAnimationFrame(sample);
  });
  window.knobPosition=()=>{const knob=window.scannerScene.getObjectByName('knob_0'),rect=document.querySelector('#pyramidScanner canvas').getBoundingClientRect(),camera=new THREE.PerspectiveCamera(35,rect.width/rect.height,.01,20);camera.position.set(0,.05,2.2);camera.lookAt(0,.05,0);camera.updateMatrixWorld();const p=knob.getWorldPosition(new THREE.Vector3()).project(camera);return {x:rect.left+(p.x+1)*rect.width/2,y:rect.top+(1-p.y)*rect.height/2};};
 });
 const idle=await page.evaluate(()=>window.sampleMotion());for(const frame of idle)assert.deepEqual(frame,idle[0]);
 const spot=await page.evaluate(()=>window.knobPosition());await page.mouse.click(spot.x,spot.y);
 const tapped=await page.evaluate(()=>window.sampleMotion());
 assert.equal(tapped[0].glow,.32,'tapping must still toggle the knob');
 for(const frame of tapped){assert.deepEqual(frame,tapped[0]);assert.deepEqual(frame.knob,idle[0].knob);assert.equal(frame.steam,0);assert.equal(frame.lens,.3);}
 await page.mouse.move(210,115);await page.mouse.down();await page.mouse.move(240,115,{steps:3});await page.mouse.up();
 const dragged=await page.evaluate(()=>window.sampleMotion());assert.notEqual(dragged[0].rotation,tapped[0].rotation,'direct rotation stays available');for(const frame of dragged)assert.equal(frame.rotation,dragged[0].rotation,'no inertia after release');
}));
