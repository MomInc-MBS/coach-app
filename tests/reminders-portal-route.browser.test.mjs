import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import test from 'node:test';
import {chromium} from 'playwright';

const root=resolve('.');
const MIME={'.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.glb':'model/gltf-binary'};

test('the real Reminders route shows cached 3D controls inside the portal frame and reopens cleanly',{timeout:120000},async t=>{
 const server=createServer(async(req,res)=>{
  const path=new URL(req.url,'http://local').pathname;
  if(path==='/'){
   res.writeHead(200,{'Content-Type':'text/html'});
   res.end(`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/launch.css"><link rel="stylesheet" href="/modules/portal/portal.css"><script type="importmap">{"imports":{"three":"/vendor/three/three.module.js","three/addons/loaders/GLTFLoader.js":"/vendor/three/GLTFLoader.js"}}</script><style>html,body{margin:0;min-height:100%;background:#090610;color:#efe7ff;font:16px system-ui}#remindersPanel.portal-framed{--face-left:16px;--face-top:130px;--face-width:343px;--face-height:520px}#remindersPanel:not([data-reminder-room=ready]){position:fixed;inset:20px auto auto 50%;transform:translateX(-50%);width:min(620px,calc(100vw - 24px));padding:14px;box-sizing:border-box}#remindersPanel header{display:flex;justify-content:space-between}#reminderForm{display:grid;gap:10px}#reminderForm input{font-size:16px}#portalHome{display:none}</style><div id="portalHome" hidden></div><div id="portalChrome" popover="manual"><div class="portal-frame" style="--face-left:16px;--face-top:130px;--face-width:343px;--face-height:520px"><b>MYR5</b></div></div><dialog id="remindersPanel" class="portal-framed" aria-labelledby="title"><header><h2 id="title">Reminders</h2><button type="button" data-close>Close</button></header><p class="status" role="status">Ready</p><button id="notificationSwitch" type="button">OFF</button><form id="reminderForm"><label>At<input name="time" type="time" value="17:00"></label><label>Reminder<select name="kind"><option>Workout</option></select></label><button type="submit">Save reminder</button></form><button type="button" id="tail">Tail control</button></dialog><nav id="coachDock" class="coach-dock"><button type="button" data-panel="reminders">Reminders</button><button type="button" data-route="portal">Portal</button><span class="dock-live" aria-live="polite"></span></nav><script type="module">import{mountRoutes}from'/modules/routes.mjs';import{mountRemindersComputer}from'/modules/rooms/reminders-computer.mjs';const panel=document.querySelector('#remindersPanel');mountRemindersComputer(panel);window.myr5Routes=mountRoutes();document.querySelector('#coachDock [data-panel=reminders]').addEventListener('click',()=>{if(!panel.open)panel.showModal()});document.querySelector('[data-close]').addEventListener('click',()=>panel.close());document.querySelector('#reminderForm').addEventListener('submit',e=>e.preventDefault());document.querySelector('#portalChrome').showPopover();</script>`);
   return;
  }
  const file=resolve(root,'.'+decodeURIComponent(path));
  try{if(!file.startsWith(root+sep))throw Error('outside root');const body=await readFile(file);res.writeHead(200,{'Content-Type':MIME[extname(file)]||'application/octet-stream'});res.end(body);}
  catch{res.writeHead(404);res.end();}
 });
 await new Promise(resolveListen=>server.listen(0,'127.0.0.1',resolveListen));
 const browser=await chromium.launch({headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-gl=angle','--use-angle=swiftshader']});
 t.after(async()=>{await browser.close();await new Promise(done=>server.close(done));});
 const context=await browser.newContext({viewport:{width:375,height:812},reducedMotion:'reduce'});t.after(()=>context.close());
 const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto(`http://127.0.0.1:${server.address().port}/`);await page.waitForFunction(()=>!!window.myr5Routes);
 await page.evaluate(async()=>{const cache=await caches.open('myr5-package-reminders-route-test');for(const url of ['/pod/rooms/console.glb','/modules/rooms/reminders-computer.css']){const response=await fetch(url);if(!response.ok)throw Error('Missing test asset '+url);await cache.put(url,response);}});
 const open=async()=>{await page.locator('#coachDock [data-panel=reminders]').click();await page.waitForFunction(()=>window.myr5Routes.current()==='reminders'&&document.querySelector('#remindersPanel').dataset.reminderRoom==='ready',{},{timeout:30000});};
 await open();
 const first=await page.evaluate(()=>{const panel=document.querySelector('#remindersPanel'),stage=panel.querySelector('.reminders-computer-stage'),screen=panel.querySelector('.reminders-computer-screen'),dock=panel.querySelector('#coachDock'),r=e=>{const b=e.getBoundingClientRect();return{x:b.x,y:b.y,w:b.width,h:b.height};};return{route:window.myr5Routes.current(),panel:r(panel),stage:r(stage),screen:r(screen),dockInside:dock.parentElement===panel,formVisible:getComputedStyle(document.querySelector('#reminderForm')).visibility,canvas:!!panel.querySelector('.reminders-computer-canvas')};});
 assert.equal(first.route,'reminders');assert.deepEqual(first.stage,first.panel,'real route adoption and portal CSS give the canvas the framed face size');
 assert.equal(first.dockInside,true,'the real route adopts the styled dock into the modal');assert.equal(first.canvas,true);assert.equal(first.formVisible,'visible');
 assert.ok(first.screen.w>=140&&first.screen.h>=170,`projected Reminder form fits the portal face: ${JSON.stringify(first.screen)}`);
 await page.locator('#reminderForm input[name=time]').fill('18:35');assert.equal(await page.locator('#reminderForm input[name=time]').inputValue(),'18:35');
 await page.evaluate(()=>document.querySelector('#remindersPanel').close());await page.waitForFunction(()=>window.myr5Routes.current()===''&&!document.querySelector('.reminders-computer-canvas'));
 await open();assert.equal(await page.locator('.reminders-computer-canvas').count(),1,'reopening creates a fresh room renderer');
 await page.locator('#reminderForm input[name=time]').fill('19:05');assert.equal(await page.locator('#reminderForm input[name=time]').inputValue(),'19:05');
 const close=async()=>{await page.evaluate(()=>document.querySelector('#remindersPanel').close());await page.waitForFunction(()=>!document.querySelector('.reminders-computer-canvas'));};
 const geometry=()=>page.evaluate(()=>{const panel=document.querySelector('#remindersPanel'),host=panel.querySelector('.reminders-computer-stage'),screen=panel.querySelector('.reminders-computer-screen'),r=el=>{const b=el.getBoundingClientRect();return{x:b.x,y:b.y,w:b.width,h:b.height};};return{host:r(host),screen:r(screen),local:{hostWidth:host.clientWidth,hostHeight:host.clientHeight,left:parseFloat(screen.style.left),top:parseFloat(screen.style.top),width:parseFloat(screen.style.width),height:parseFloat(screen.style.height)},zoom:getComputedStyle(host).zoom};});
 // portal.mjs revealDialogFromPoint starts at scale(.05). Cache decoding can finish while
 // that compositor-only transform is active; removing it never triggers ResizeObserver.
 for(const insetZoom of [1,.65]){
  await close();await page.evaluate(zoom=>{const panel=document.querySelector('#remindersPanel');panel.classList.toggle('portal-inset',zoom!==1);panel.style.setProperty('--inset-zoom',String(zoom));},insetZoom);
  await open();const baseline=await geometry();await close();
  await page.evaluate(()=>{window.myr5Routes.go('reminders');const panel=document.querySelector('#remindersPanel');panel.style.transformOrigin='50% 50%';panel.style.transform='scale(.05)';});
  await page.waitForFunction(()=>document.querySelector('#remindersPanel').dataset.reminderRoom==='ready');
  const revealing=await geometry();assert.ok(revealing.host.w<baseline.host.w*.06,'renderer initialized during the actual portal reveal scale');
  for(const key of ['left','top','width','height'])assert.ok(Math.abs(revealing.local[key]-baseline.local[key])<2,`zoom ${insetZoom}: local screen ${key} ignores reveal scale`);
  await page.evaluate(async()=>{const panel=document.querySelector('#remindersPanel');panel.style.transition='transform 80ms linear';getComputedStyle(panel).transform;panel.style.transform='';getComputedStyle(panel).transform;const animation=panel.getAnimations().find(a=>a.transitionProperty==='transform');if(animation)await animation.finished;panel.style.transition='';});
  const settled=await geometry();for(const key of ['x','y','w','h'])assert.ok(Math.abs(settled.screen[key]-baseline.screen[key])<2,`zoom ${insetZoom}: fitted screen ${key} remains aligned after reveal without a resize event`);
  assert.ok(settled.screen.w>140&&settled.screen.h>170,'controls remain large enough to use after the reveal');
  assert.ok(settled.screen.x>=settled.host.x&&settled.screen.y>=settled.host.y&&settled.screen.x+settled.screen.w<=settled.host.x+settled.host.w+1&&settled.screen.y+settled.screen.h<=settled.host.y+settled.host.h+1,'screen projection stays inside the zoomed canvas');
  await page.locator('#reminderForm input[name=time]').fill('20:15');assert.equal(await page.locator('#reminderForm input[name=time]').inputValue(),'20:15');
  await mkdir(resolve('.frames/reminders-review'),{recursive:true});await page.screenshot({path:resolve(`.frames/reminders-review/portal-reveal-zoom-${insetZoom}.png`)});
 }
 assert.deepEqual(errors,[],'route close and reopen leave no browser errors');
});
