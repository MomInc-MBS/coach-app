// W3-3A (#3, #13, #31, #32, #35, #38, D36): the floating pyramid IS the Food menu, checked at 375x812.
// Same harness as pyramid-lifecycle.browser.test.mjs: current launch.mjs/food/* source over a built dist/client.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {build} from 'esbuild';
import {chromium} from 'playwright';
import {completeCoach} from './onboarding-fixture.mjs';

const TYPES={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.glb':'model/gltf-binary'};
// signedIn: a stub account (with finished setup) plus an in-memory /api/meals, so Save meal reaches today's log.
// worker: replaces /food-worker.mjs (the on-device recognition model) with a scripted classifier.
async function withFood(run,{reducedMotion='no-preference',signedIn=false,worker=null,meals=[]}={}){
 const root=resolve('dist/client'),source=resolve('.');
 const account={user:{id:'food-owner',email:'food@test.local',provider:'chatgpt'},dataEpoch:1,revision:0,profile:{},entitlements:{},
  progress:{completedSets:0,xp:0,level:1,unlocks:{ember:false,arc:false,frost:false,shieldBreak:false},exerciseRoute:{groups:{}}},
  push:{environment:'preview',configured:false,schedulerActive:false},
  onboarding:{data:completeCoach(),revision:1,startDay:'2026-09-21',completedAt:1,targets:{day:3,date:'2026-09-23',reps:3,holdSeconds:9,proteinGrams:100,waterOz:100,goals:{}}}};
 const body=req=>new Promise(r=>{let data='';req.on('data',c=>data+=c);req.on('end',()=>r(data?JSON.parse(data):null));});
 const bundle=await build({entryPoints:['launch.mjs'],bundle:true,write:false,format:'esm',target:'es2022',external:['./nutrition-data.mjs','./local-coach-runtime.mjs','./food/pyramid-scanner.mjs','./modules/rooms/classroom.mjs']});
 const server=createServer(async(req,res)=>{
  const path=new URL(req.url,'http://local').pathname;
  if(path==='/__test__'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>Test</title>');return;}
  if(path==='/launch-runtime.mjs'){res.setHeader('Content-Type','text/javascript');res.end(bundle.outputFiles[0].text);return;}
  if(worker&&path==='/food-worker.mjs'){res.setHeader('Content-Type','text/javascript');res.end(worker);return;}
  if(signedIn&&path==='/api/account'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify(account));return;}
  if(signedIn&&path==='/api/meals'){
   res.setHeader('Content-Type','application/json');
   if(req.method==='POST'){const m=await body(req);meals.push({id:m.id,name:m.name,portion:m.portion,calories:m.calories,protein:m.protein,carbs:m.carbs,fat:m.fat,micros:JSON.stringify(m.micros),eaten_at:m.eatenAt});res.end(JSON.stringify({saved:true}));return;}
   res.end(JSON.stringify({items:[...meals].sort((x,y)=>y.eaten_at.localeCompare(x.eaten_at))}));return;
  }
  if(path.startsWith('/api/')){res.writeHead(path==='/api/auth/config'?200:401,{'Content-Type':'application/json'});res.end(JSON.stringify(path==='/api/auth/config'?{enabled:false}:{error:'Sign in'}));return;}
  try{const base=path.startsWith('/food/')||path.startsWith('/modules/rooms/')||path.startsWith('/pod/rooms/')||path.startsWith('/modules/portal/')||path==='/food-live.css'?source:root,file=resolve(base,'.'+path);if(!file.startsWith(base+sep))throw Error();const body=await readFile(file);res.writeHead(200,{'Content-Type':TYPES[extname(file)]||'application/octet-stream'});res.end(body);}catch{res.writeHead(404);res.end();}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-gl=angle','--use-angle=swiftshader']});
  const context=await browser.newContext({serviceWorkers:'block',viewport:{width:375,height:812},hasTouch:true,reducedMotion});
  const base='http://127.0.0.1:'+server.address().port,page=await context.newPage(),warnings=[];
  page.on('console',msg=>{if(msg.type()==='warning')warnings.push(msg.text());});
  // Observe the text painted onto each screen texture, and capture the scene + camera for projections.
  await page.addInitScript(()=>{
   const labels=new Set(['FOOD','CALORIES','PROTEIN','FAT','CARBS','VITAMINS']),canvases=new WeakMap(),fill=CanvasRenderingContext2D.prototype.fillText;
   window.pyramidPaint={};
   CanvasRenderingContext2D.prototype.fillText=function(value,...args){if(labels.has(value))canvases.set(this.canvas,value);else if(canvases.has(this.canvas))window.pyramidPaint[canvases.get(this.canvas)]=value;return fill.call(this,value,...args);};
   window.photoPicks=0;const click=HTMLInputElement.prototype.click;HTMLInputElement.prototype.click=function(){if(this.id==='foodPhoto'){window.photoPicks++;return;}return click.call(this);};
  });
  await page.goto(base+'/__test__');
  await page.evaluate(async intake=>{const {openLocalCoach}=await import('/local-coach-runtime.mjs');const repo=await openLocalCoach();await repo.forOwner(repo.guestOwnerId).saveSetup(intake,{startDay:'2026-09-21'});repo.close();},completeCoach());
  await page.goto(base+'/pose.html#pod');
  await page.waitForFunction(()=>window.myr5Menus?.food);
  await page.evaluate(async()=>{
   const THREE=await import('/vendor/three/three.module.js'),add=THREE.Scene.prototype.add;
   THREE.Scene.prototype.add=function(...args){window.pyramidScene=this;return add.apply(this,args);};
   window.projectNode=name=>{const node=window.pyramidScene.getObjectByName(name),camera=window.pyramidScene.children.find(n=>n.isCamera),rect=document.querySelector('#pyramidScanner canvas').getBoundingClientRect(),p=node.getWorldPosition(new THREE.Vector3()).project(camera);return {x:rect.left+(p.x+1)*rect.width/2,y:rect.top+(1-p.y)*rect.height/2};};
   // The update banner and setup gate are not part of this screen.
   const style=document.createElement('style');style.textContent='.app-update-banner{display:none!important}';document.head.append(style);
  });
  await run(page,warnings);
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
}
const ready=page=>page.waitForFunction(()=>document.querySelector('#pyramidScanner canvas')&&!document.querySelector('#pyramidScanner[data-loading]')&&window.pyramidPaint.FOOD,null,{timeout:20000});
const box=(page,selector)=>page.evaluate(s=>{const r=document.querySelector(s).getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height};},selector);

test('classroom peers through the diamond; tapping the real whiteboard fills the screen',async()=>withFood(async page=>{
 await page.evaluate(()=>window.myr5Menus.portal());
 await page.waitForFunction(()=>window.myr5Portal?.current()&&!document.querySelector('#portalHome').hidden);
 await page.evaluate(()=>{window.schoolRun=window.myr5Portal.open('vdiamond');});
 await page.waitForFunction(()=>document.querySelector('#accountPanel[data-room=ready] .classroom-canvas'),null,{timeout:15000});await page.evaluate(()=>window.schoolRun);await page.waitForTimeout(500);
 assert.equal(await page.locator('#accountPanel').evaluate(el=>el.classList.contains('portal-shaped')&&!el.classList.contains('portal-inset')&&!el.classList.contains('portal-fullscreen')),true);
 assert.equal(await page.locator('.classroom-desk').count(),2);
 await page.screenshot({path:resolve('.frames','classroom-diamond.png')});
 await page.locator('[data-room-board]').click();
 await page.waitForFunction(()=>document.querySelector('#accountPanel.portal-fullscreen[data-room-view=board]'));
 assert.deepEqual(await box(page,'#accountPanel'),{left:0,top:0,right:375,bottom:812,width:375,height:812});
 assert.equal(await page.locator('#accountPanel').evaluate(el=>getComputedStyle(el).clipPath),'none');
 assert.equal(await page.locator('#portalChrome').evaluate(el=>el.matches(':popover-open')),false);
 assert.equal(await page.locator('#coachDock').isVisible(),false,'whiteboard uses the whole viewport');
 await page.screenshot({path:resolve('.frames','classroom-whiteboard-fullscreen.png')});
 await page.locator('#accountPanel [data-close]').click();
 await page.waitForFunction(()=>!document.getElementById('portalHome').hidden&&!document.querySelector('.portal-glass'),null,{timeout:10000});
 assert.equal(await page.locator('.classroom-canvas').count(),0,'closing disposes room');
 await page.evaluate(()=>{window.schoolRun=window.myr5Portal.open('vdiamond');});
 await page.waitForFunction(()=>document.querySelector('#accountPanel[data-room=ready] .classroom-canvas'),null,{timeout:15000});await page.evaluate(()=>window.schoolRun);
 assert.equal(await page.locator('#accountPanel').evaluate(el=>el.classList.contains('portal-shaped')&&!el.classList.contains('portal-fullscreen')&&!el.dataset.roomView),true,'opening again starts in the classroom');
}));
