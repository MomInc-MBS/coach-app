import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import test from 'node:test';
import {chromium} from 'playwright';

const root=resolve('.');
const MIME={'.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.glb':'model/gltf-binary'};
const types=['/pod/rooms/console.glb','/modules/rooms/reminders-computer.css'];

async function fixture(t){
 const artRequests=[];let failStyle=false;
 const server=createServer(async(req,res)=>{
  const url=new URL(req.url,'http://local');
  if(url.pathname==='/'){res.writeHead(200,{'Content-Type':'text/html'});res.end(`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/modules/portal/portal.css"><script type="importmap">{"imports":{"three":"/vendor/three/three.module.js","three/addons/loaders/GLTFLoader.js":"/vendor/three/GLTFLoader.js"}}</script><style>body{margin:0;background:#090610;color:white;font:16px system-ui}#remindersPanel{width:min(620px,calc(100% - 24px));max-height:85dvh;padding:16px;box-sizing:border-box}#remindersPanel header{display:flex;justify-content:space-between}#reminderForm{display:grid;gap:10px}#reminderForm input{font-size:16px}#coachDock{position:fixed;z-index:5;left:50%;bottom:4px;transform:translateX(-50%)}#coachDock button{min-height:40px}</style><dialog id="remindersPanel" aria-labelledby="title"><header><h2 id="title">Reminders</h2><button type="button" data-close>Close</button></header><p role="status">Ready</p><button id="notificationSwitch" type="button">OFF</button><form id="reminderForm"><label>At<input name="time" type="time" value="17:00"></label><label>Reminder<select name="kind"><option>Workout</option></select></label><button type="submit">Save reminder</button></form><button type="button" id="tail">Tail control</button><nav id="coachDock"><button type="button" data-route="portal">Portal</button></nav></dialog><script>document.querySelector('[data-close]').onclick=()=>document.querySelector('#remindersPanel').close();document.querySelector('#reminderForm').onsubmit=e=>e.preventDefault();document.querySelector('#coachDock button').onclick=()=>window.__dockClicked=true;</script>`);return;}
  if(url.pathname==='/test-assets/model'){
   const body=await readFile(resolve(root,'pod/rooms/console.glb'));res.writeHead(200,{'Content-Type':MIME['.glb']});res.end(body);return;
  }
  if(url.pathname==='/test-assets/style'){
   const body=await readFile(resolve(root,'modules/rooms/reminders-computer.css'));res.writeHead(200,{'Content-Type':MIME['.css']});res.end(body);return;
  }
  if(url.pathname==='/reset-art-requests'){artRequests.length=0;res.writeHead(204);res.end();return;}
  if(url.pathname==='/modules/rooms/reminders-computer.css'&&failStyle){artRequests.push(url.pathname);res.writeHead(503);res.end();return;}
  if(types.includes(url.pathname))artRequests.push(url.pathname);
  const file=resolve(root,'.'+decodeURIComponent(url.pathname));
  try{if(!file.startsWith(root+sep))throw Error('outside root');const body=await readFile(file);res.writeHead(200,{'Content-Type':MIME[extname(file)]||'application/octet-stream'});res.end(body);}
  catch{res.writeHead(404);res.end();}
 });
 await new Promise(resolveListen=>server.listen(0,'127.0.0.1',resolveListen));
 const browser=await chromium.launch({headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});
 t.after(async()=>{await browser.close();await new Promise(done=>server.close(done));});
 return {browser,base:`http://127.0.0.1:${server.address().port}`,artRequests,setStyleOffline(value){failStyle=value;}};
}

async function createPage(env,{width=375,height=812,reducedMotion='reduce'}={}){
 const context=await env.browser.newContext({viewport:{width,height},reducedMotion});
 const page=await context.newPage();await page.goto(env.base+'/');return {context,page};
}
async function seed(page,{model=true,style=true,styleText,cacheName='reminders-room-test'}={}){
 await page.evaluate(async options=>{
  const cache=await caches.open(options.cacheName);
  if(options.model){const response=await fetch('/test-assets/model');await cache.put('/pod/rooms/console.glb',new Response(await response.arrayBuffer(),{headers:{'Content-Type':'model/gltf-binary'}}));}
  if(options.style){let css=options.styleText;if(css===undefined){const response=await fetch('/test-assets/style');css=await response.text();}await cache.put('/modules/rooms/reminders-computer.css',new Response(css,{headers:{'Content-Type':'text/css'}}));}
 },{model,style,styleText,cacheName});
 await page.evaluate(()=>fetch('/reset-art-requests'));
}
async function mount(page){await page.evaluate(async()=>{window.__THREE=await import('/vendor/three/three.module.js');const cameraProto=window.__THREE.PerspectiveCamera.prototype,update=cameraProto.updateProjectionMatrix;cameraProto.updateProjectionMatrix=function(...args){const result=update.apply(this,args);if(this.fov===31)window.__remindersCameraZoom=this.zoom;return result;};window.__disposeReminders=(await import('/modules/rooms/reminders-computer.mjs')).mountRemindersComputer(document.querySelector('#remindersPanel'));document.querySelector('#remindersPanel').showModal();});}

test('missing assets and offline stale styles keep the original reminder controls usable',{timeout:90000},async t=>{
 const env=await fixture(t);
 for(const cacheState of ['empty','model-only','legacy-style','previous-room-css']){
  const {context,page}=await createPage(env);
  if(cacheState==='model-only'){await seed(page,{model:true,style:false});env.setStyleOffline(true);}
  if(cacheState==='legacy-style'){await seed(page,{model:true,style:true,styleText:"#remindersPanel::before{border-image:url('/pod/rooms/console.webp') 20 fill}"});env.setStyleOffline(true);}
  if(cacheState==='previous-room-css'){await seed(page,{model:true,style:true,styleText:"/* reminders-computer:glb-v1 */ #remindersPanel[data-reminder-room=ready]::before{content:''}"});env.setStyleOffline(true);}
  await mount(page);try{await page.waitForFunction(()=>document.querySelector('#remindersPanel').dataset.reminderRoom==='offer');}catch(error){throw Error(cacheState+' failed to reach fallback: '+JSON.stringify(await page.evaluate(()=>({open:document.querySelector('#remindersPanel').open,room:document.querySelector('#remindersPanel').dataset.reminderRoom,offer:document.querySelector('.reminders-computer-offer')?.hidden,cache:!!globalThis.caches}))));}
  assert.equal(await page.locator('#reminderForm input[name=time]').isVisible(),true);
  assert.equal(await page.locator('.reminders-computer-canvas').count(),0);
  assert.equal(env.artRequests.some(url=>url==='/pod/rooms/console.glb'),false,'repair never redownloads the large model');
  assert.equal(env.artRequests.filter(url=>url==='/modules/rooms/reminders-computer.css').length,cacheState==='empty'?0:1,'only a cached model prompts one small stylesheet refresh');
  await page.locator('#reminderForm input[name=time]').fill('18:45');
  assert.equal(await page.locator('#reminderForm input[name=time]').inputValue(),'18:45');
  await context.close();
  env.setStyleOffline(false);
 }
});

test('a cached model refreshes only its stale stylesheet online and reuses it on the next open',{timeout:90000},async t=>{
 const env=await fixture(t),{context,page}=await createPage(env);await seed(page,{model:true,style:true,styleText:'/* reminders-computer:glb-v1 */'});await mount(page);
 await page.waitForFunction(()=>document.querySelector('#remindersPanel').dataset.reminderRoom==='ready',{},{timeout:30000});
 assert.deepEqual(env.artRequests,['/modules/rooms/reminders-computer.css'],'the old room packet needs only the small CSS refresh');
 assert.equal(await page.evaluate(async()=>{const cached=await(await caches.open('reminders-room-test')).match('/modules/rooms/reminders-computer.css');return (await cached.text()).includes('glb-v2');}),true,'the current stylesheet is saved beside the cached model');
 await page.evaluate(()=>{document.querySelector('#remindersPanel').close();document.querySelector('#remindersPanel').showModal();});await page.waitForTimeout(100);
 assert.equal(env.artRequests.length,1,'the repaired packet opens cache-only next time');await context.close();
});

test('the ready room measures and keeps its screen inside the real portal face',{timeout:90000},async t=>{
 const env=await fixture(t),{context,page}=await createPage(env);await seed(page);
 await page.evaluate(()=>{const panel=document.querySelector('#remindersPanel');panel.classList.add('portal-framed');panel.style.setProperty('--face-left','16px');panel.style.setProperty('--face-top','140px');panel.style.setProperty('--face-width','343px');panel.style.setProperty('--face-height','520px');});
 await mount(page);await page.waitForFunction(()=>document.querySelector('#remindersPanel').dataset.reminderRoom==='ready',{},{timeout:30000});
 const layout=await page.evaluate(()=>{const panel=document.querySelector('#remindersPanel'),stage=panel.querySelector('.reminders-computer-stage'),screen=panel.querySelector('.reminders-computer-screen'),p=panel.getBoundingClientRect(),s=stage.getBoundingClientRect(),r=screen.getBoundingClientRect();return{panel:{x:p.x,y:p.y,w:p.width,h:p.height},stage:{x:s.x,y:s.y,w:s.width,h:s.height},screen:{x:r.x,y:r.y,w:r.width,h:r.height},controls:getComputedStyle(document.querySelector('#reminderForm')).visibility};});
 assert.deepEqual(layout.stage,layout.panel,'the 3D stage receives the portal face dimensions before its first render');
 assert.ok(layout.screen.w>=140&&layout.screen.h>=170,`the projected controls occupy a usable area in the face: ${JSON.stringify(layout.screen)}`);
 assert.equal(layout.controls,'visible');await page.locator('#reminderForm input[name=time]').fill('18:20');assert.equal(await page.locator('#reminderForm input[name=time]').inputValue(),'18:20');
 await context.close();
});

test('a completed public room download can replace the usable fallback on focus',{timeout:90000},async t=>{
 const env=await fixture(t),{context,page}=await createPage(env);await mount(page);
 await page.waitForFunction(()=>document.querySelector('#remindersPanel').dataset.reminderRoom==='offer');
 assert.equal(await page.locator('#reminderForm input[name=time]').isVisible(),true);
 await seed(page);await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
 await page.waitForFunction(()=>document.querySelector('#remindersPanel').dataset.reminderRoom==='ready',{},{timeout:30000});
 assert.equal(await page.locator('.reminders-computer-canvas').count(),1);assert.deepEqual(env.artRequests,[]);
 await context.close();
});

test('new complete packet wins over an older retained cache with legacy Reminders CSS',{timeout:90000},async t=>{
 const env=await fixture(t),{context,page}=await createPage(env);
 await seed(page,{cacheName:'myr5-shell-old',model:true,style:true,styleText:"#remindersPanel::before{border-image:url('/pod/rooms/console.webp') 20 fill}"});
 await seed(page,{cacheName:'myr5-package-reminders-new',model:true,style:true});
 await mount(page);await page.waitForFunction(()=>document.querySelector('#remindersPanel').dataset.reminderRoom==='ready',{},{timeout:30000});
 assert.equal(await page.locator('.reminders-computer-canvas').count(),1);
 assert.deepEqual(env.artRequests,[],'cache selection reads existing packet responses only');
 await context.close();
});

test('cached GLB draws the undistorted model, scrollable form, and background cords at phone and desktop sizes',{timeout:120000},async t=>{
 const env=await fixture(t),{context,page}=await createPage(env);await seed(page);await mount(page);
 await page.waitForFunction(()=>document.querySelector('#remindersPanel').dataset.reminderRoom==='ready',{},{timeout:30000});
 assert.equal(await page.locator('.reminders-computer-canvas').count(),1);
 assert.equal(await page.locator('.reminders-computer-offer').isVisible(),false,'ready-room download offer stays hidden under its CSS display rule');
 assert.deepEqual(env.artRequests,[],'renderer uses cached Response bytes without fetching model or CSS');
 const describedBy=await page.locator('#remindersPanel').getAttribute('aria-describedby');assert.ok(describedBy);assert.equal(await page.locator('#'+describedBy).count(),1,'keyboard hint is present for the accessible description');
 const geometry=await page.evaluate(()=>{
  return (async()=>{const {GLTFLoader}=await import('/vendor/three/GLTFLoader.js'),cache=await caches.open('reminders-room-test'),response=await cache.match('/pod/rooms/console.glb'),gltf=await new GLTFLoader().parseAsync(await response.arrayBuffer(),''),meshes=[];gltf.scene.traverse(node=>{if(node.isMesh)meshes.push({vertices:node.geometry.attributes.position?.count||0});for(const material of [].concat(node.material||[])){for(const value of Object.values(material||{}))if(value?.isTexture)value.dispose();material?.dispose?.();}node.geometry?.dispose();});return meshes;})();
 });
 assert.ok(geometry.some(mesh=>mesh.vertices>10000),'the rendered room asset decodes to real triangle geometry');
 const roomSource=await readFile(resolve('modules/rooms/reminders-computer.mjs'),'utf8');assert.match(roomSource,/TubeGeometry/);assert.match(roomSource,/renderOrder=-1/);assert.match(roomSource,/PerspectiveCamera\(31,1/);assert.match(roomSource,/Math\.max\(MODEL_SIZE\.y\*\.53/);assert.match(roomSource,/camera\.zoom=1\.5/,'the real 3D camera magnifies the console by 1.5x');
 assert.equal(await page.evaluate(()=>window.__remindersCameraZoom),1.5,'the rendered perspective camera carries the enlarged projection');
 await page.locator('#reminderForm input[name=time]').fill('18:15');
 assert.equal(await page.locator('#reminderForm input[name=time]').inputValue(),'18:15');
 const rotationBefore=await page.locator('.reminders-computer-screen').evaluate(node=>node.style.left);
 await page.locator('#remindersPanel').focus();await page.keyboard.press('ArrowRight');
 const rotationAfter=await page.locator('.reminders-computer-screen').evaluate(node=>node.style.left);
 assert.notEqual(rotationAfter,rotationBefore,'manual keyboard turning works with reduced motion');
 await page.waitForTimeout(350);const rotationStill=await page.locator('.reminders-computer-screen').evaluate(node=>node.style.left);
 assert.equal(rotationStill,rotationAfter,'reduced motion keeps the model still until input');
 const screenLayout=async()=>page.evaluate(()=>{
  const canvas=document.querySelector('.reminders-computer-canvas'),screen=document.querySelector('.reminders-computer-screen'),close=document.querySelector('[data-close]'),c=canvas.getBoundingClientRect(),s=screen.getBoundingClientRect(),b=close.getBoundingClientRect(),hit=document.elementFromPoint(b.left+b.width/2,b.top+b.height/2);
  return {canvas:{left:c.left,top:c.top,right:c.right,bottom:c.bottom},screen:{left:s.left,top:s.top,right:s.right,bottom:s.bottom,width:s.width,height:s.height},closeHit:!!hit&&close.contains(hit),zoom:window.__remindersCameraZoom};
 });
 const assertScreenReadable=(layout,size)=>{
  assert.ok(layout.screen.left>=layout.canvas.left&&layout.screen.right<=layout.canvas.right&&layout.screen.top>=layout.canvas.top&&layout.screen.bottom<=layout.canvas.bottom,`${size}: the complete projected LCD remains inside the viewport (${JSON.stringify(layout.screen)})`);
  assert.ok(layout.screen.width>=140&&layout.screen.height>=170,`${size}: projected form area stays readable and usable (${JSON.stringify(layout.screen)})`);
  assert.equal(layout.closeHit,true,`${size}: Close remains directly tappable`);assert.equal(layout.zoom,1.5,`${size}: resizing retains 1.5x perspective zoom`);
 };
 await page.setViewportSize({width:375,height:812});await page.waitForTimeout(120);await page.locator('.reminders-computer-screen').evaluate(node=>node.scrollTop=0);assertScreenReadable(await screenLayout(),'375x812 phone');
 if(process.env.MYR5_REMINDERS_SCREENSHOTS){await mkdir(process.env.MYR5_REMINDERS_SCREENSHOTS,{recursive:true});await page.screenshot({path:resolve(process.env.MYR5_REMINDERS_SCREENSHOTS,'reminders-zoom-375x812.png')});}
 const closeBox=await page.locator('[data-close]').boundingBox();assert.ok(closeBox.x>=0&&closeBox.y>=0&&closeBox.x+closeBox.width<=375&&closeBox.y+closeBox.height<=812,'phone Close stays wholly on screen');
 await page.locator('#reminderForm button[type=submit]').scrollIntoViewIfNeeded();
 if(process.env.MYR5_REMINDERS_SCREENSHOTS)await page.screenshot({path:resolve(process.env.MYR5_REMINDERS_SCREENSHOTS,'reminders-zoom-375x812-controls.png')});
 await page.locator('#reminderForm button[type=submit]').click();
 await page.locator('#coachDock [data-route=portal]').scrollIntoViewIfNeeded();
 const dockHit=await page.locator('#coachDock [data-route=portal]').evaluate(node=>{const r=node.getBoundingClientRect(),hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return !!hit&&node.contains(hit);});
 assert.equal(dockHit,true,'the dock remains scrollable into view and tappable');await page.locator('#coachDock [data-route=portal]').click();assert.equal(await page.evaluate(()=>window.__dockClicked),true);
 await page.setViewportSize({width:1440,height:900});await page.waitForTimeout(120);await page.locator('.reminders-computer-screen').evaluate(node=>node.scrollTop=0);assertScreenReadable(await screenLayout(),'1440x900 desktop');
 if(process.env.MYR5_REMINDERS_SCREENSHOTS)await page.screenshot({path:resolve(process.env.MYR5_REMINDERS_SCREENSHOTS,'reminders-zoom-1440x900.png')});
 await page.evaluate(()=>{window.myr5AuthenticatedAccount={user:{id:'owner-a'}};window.dispatchEvent(new CustomEvent('myr5:account-ready',{detail:window.myr5AuthenticatedAccount}));});
 await page.evaluate(()=>window.dispatchEvent(new Event('myr5:account-cleared')));assert.equal(await page.locator('.reminders-computer-canvas').count(),1,'owner refresh and logout leave public art available');
 await page.evaluate(()=>{window.dispatchEvent(new Event('focus'));window.dispatchEvent(new PageTransitionEvent('pageshow'));});await page.waitForTimeout(100);
 assert.equal(await page.locator('.reminders-computer-canvas').count(),1,'repeat focus/show does not wrap the form twice or create another canvas');
 await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pagehide')));
 assert.equal(await page.locator('.reminders-computer-canvas').count(),0,'pagehide releases its canvas');
 await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pageshow')));
 await page.waitForFunction(()=>document.querySelector('#remindersPanel').dataset.reminderRoom==='ready');
 await page.evaluate(()=>{window.myr5AuthenticatedAccount=null;});
 const canvas=page.locator('.reminders-computer-canvas');await canvas.dispatchEvent('webglcontextlost',{cancelable:true});
 await page.waitForFunction(()=>document.querySelector('#remindersPanel').dataset.reminderRoom==='offer');
 assert.equal(await page.locator('#reminderForm input[name=time]').isVisible(),true,'context loss leaves form controls usable');
 assert.deepEqual(env.artRequests,[]);
 await context.close();
});

test('closing while GLTF parsing is pending disposes the decoded model and cannot leave a stale canvas',{timeout:90000},async t=>{
 const env=await fixture(t),{context,page}=await createPage(env);await seed(page);
 await page.evaluate(async()=>{
  const {GLTFLoader}=await import('/vendor/three/GLTFLoader.js'),parse=GLTFLoader.prototype.parseAsync;
  window.__restoreParse=()=>GLTFLoader.prototype.parseAsync=parse;
  GLTFLoader.prototype.parseAsync=async function(...args){const gltf=await parse.apply(this,args);window.__lateGltf=gltf;window.__parseStarted=true;for(const node of gltf.scene.children)node.geometry?.addEventListener('dispose',()=>window.__geometryDisposed=true);await new Promise(resolve=>window.__releaseParse=resolve);return gltf;};
 });
 await mount(page);await page.waitForFunction(()=>window.__parseStarted===true);
 await page.locator('#remindersPanel').evaluate(panel=>panel.close());await page.waitForTimeout(60);await page.evaluate(()=>window.__releaseParse());
 await page.waitForFunction(()=>window.__geometryDisposed===true);
 assert.equal(await page.locator('.reminders-computer-canvas').count(),0);
 await page.evaluate(()=>{window.__restoreParse();document.querySelector('#remindersPanel').showModal();});
 await page.waitForFunction(()=>document.querySelector('#remindersPanel').dataset.reminderRoom==='ready',{},{timeout:30000});
 assert.equal(await page.locator('.reminders-computer-canvas').count(),1,'a later open gets a fresh renderer');
 await context.close();
});

test('account changes invalidate pending work while public artwork remains available',{timeout:90000},async t=>{
 const env=await fixture(t),{context,page}=await createPage(env);await seed(page);
 await page.evaluate(async()=>{
  const {GLTFLoader}=await import('/vendor/three/GLTFLoader.js'),parse=GLTFLoader.prototype.parseAsync;window.__parseCalls=0;
  window.__restoreParse=()=>GLTFLoader.prototype.parseAsync=parse;
  GLTFLoader.prototype.parseAsync=async function(...args){const gltf=await parse.apply(this,args);window.__parseCalls++;if(window.__parseCalls===1){for(const node of gltf.scene.children)node.geometry?.addEventListener('dispose',()=>window.__staleGeometryDisposed=true);window.__releaseFirstParse;await new Promise(resolve=>window.__releaseFirstParse=resolve);}return gltf;};
 });
 await mount(page);await page.waitForFunction(()=>window.__parseCalls===1);
 await page.evaluate(()=>{window.myr5AuthenticatedAccount={user:{id:'owner-a'}};window.dispatchEvent(new CustomEvent('myr5:account-ready',{detail:window.myr5AuthenticatedAccount}));});
 await page.waitForFunction(()=>document.querySelector('#remindersPanel').dataset.reminderRoom==='ready');
 await page.evaluate(()=>window.__releaseFirstParse());await page.waitForFunction(()=>window.__staleGeometryDisposed===true);
 assert.equal(await page.evaluate(()=>window.__parseCalls),2,'work that crossed an account boundary is discarded and refreshed');
 assert.equal(await page.locator('.reminders-computer-canvas').count(),1);
 await page.evaluate(()=>{window.myr5AuthenticatedAccount=null;window.dispatchEvent(new Event('myr5:account-cleared'));});
 assert.equal(await page.locator('.reminders-computer-canvas').count(),1,'logout does not hide public cached room art');
 await page.evaluate(()=>window.__restoreParse());await context.close();
});

test('portal-owned and newly added dialog children survive wrap and teardown',{timeout:90000},async t=>{
 const env=await fixture(t),{context,page}=await createPage(env);await seed(page);
 const pageErrors=[];page.on('pageerror',error=>pageErrors.push(error.message));
 await page.evaluate(()=>{const panel=document.querySelector('#remindersPanel'),dock=document.createElement('nav'),peer=document.createElement('div');dock.id='coachDock';peer.className='portal-peer-ui';peer.id='earlyPeer';panel.append(dock,peer);});
 await mount(page);await page.waitForFunction(()=>document.querySelector('#remindersPanel').dataset.reminderRoom==='ready');
 const during=await page.evaluate(()=>{
  const panel=document.querySelector('#remindersPanel'),latePeer=document.createElement('div'),late=document.createElement('button');latePeer.className='portal-peer-ui';latePeer.id='latePeer';late.id='latePortalChild';panel.append(latePeer,late);
  const outside=document.createElement('div');outside.id='externalRoot';document.body.append(outside);outside.append(document.querySelector('#reminderForm'),document.querySelector('#tail'),document.querySelector('#remindersComputerHint'));
  window.__switchClicks=0;document.querySelector('#notificationSwitch').addEventListener('click',()=>window.__switchClicks++);
  return {dockDirect:panel.querySelector(':scope > #coachDock')!==null,earlyPeerDirect:panel.querySelector(':scope > #earlyPeer')!==null,latePeerDirect:panel.querySelector(':scope > #latePeer')!==null};
 });
 assert.deepEqual(during,{dockDirect:true,earlyPeerDirect:true,latePeerDirect:true},'portal-owned nodes remain direct children');
 await page.locator('#remindersPanel').evaluate(panel=>panel.close());await page.waitForFunction(()=>!document.querySelector('.reminders-computer-screen'));
 const after=await page.evaluate(()=>{const panel=document.querySelector('#remindersPanel'),outside=document.querySelector('#externalRoot');return {dockDirect:panel.querySelector(':scope > #coachDock')!==null,earlyPeerDirect:panel.querySelector(':scope > #earlyPeer')!==null,latePeerDirect:panel.querySelector(':scope > #latePeer')!==null,lateChildDirect:panel.querySelector(':scope > #latePortalChild')!==null,formStayedExternal:document.querySelector('#reminderForm').parentElement===outside,tailStayedExternal:document.querySelector('#tail').parentElement===outside,hintStayedExternal:document.querySelector('#remindersComputerHint').parentElement===outside,headerDirect:panel.querySelector(':scope > header')!==null,switchDirect:panel.querySelector(':scope > #notificationSwitch')!==null,screenGone:!panel.querySelector('.reminders-computer-screen')};});
 assert.deepEqual(after,{dockDirect:true,earlyPeerDirect:true,latePeerDirect:true,lateChildDirect:true,formStayedExternal:true,tailStayedExternal:true,hintStayedExternal:true,headerDirect:true,switchDirect:true,screenGone:true},'teardown restores only wrapped originals still in the screen and keeps portal or externally moved nodes');
 await page.locator('#notificationSwitch').evaluate(button=>button.click());assert.equal(await page.evaluate(()=>window.__switchClicks),1,'retained original controls remain usable after teardown');
 assert.deepEqual(pageErrors,[],'teardown raises no page errors when the last wrapped nodes were moved externally');
 await context.close();
});

test('idle sway is capped and its animation loop stops when the dialog closes',{timeout:90000},async t=>{
 const env=await fixture(t),{context,page}=await createPage(env,{reducedMotion:'no-preference'});await seed(page);
 await page.evaluate(()=>{const native=requestAnimationFrame.bind(window);window.__frameCalls=0;window.requestAnimationFrame=callback=>{window.__frameCalls++;return native(callback);};});
 await mount(page);await page.waitForFunction(()=>document.querySelector('#remindersPanel').dataset.reminderRoom==='ready');
 await page.waitForTimeout(180);const frames=await page.evaluate(()=>window.__frameCalls);assert.ok(frames>0,'idle sway runs while the room is open');
 const source=await readFile(resolve('modules/rooms/reminders-computer.mjs'),'utf8');assert.match(source,/now-lastFrame>=1000\/24/,'GPU renders are capped at 24 frames per second');
 await page.locator('#remindersPanel').evaluate(panel=>panel.close());await page.waitForTimeout(100);
 const stopped=await page.evaluate(()=>window.__frameCalls);await page.waitForTimeout(250);
 assert.equal(await page.evaluate(()=>window.__frameCalls),stopped,'the loop does not schedule more frames after close');
 assert.equal(await page.locator('.reminders-computer-canvas').count(),0);
 await context.close();
});
