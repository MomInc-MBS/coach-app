// Real built app with current portal source: persistent housing, route lifecycle, and compact meditation layout.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {chromium} from 'playwright';
import {build} from 'esbuild';
import {completeCoach} from './onboarding-fixture.mjs';

const FRAMES_DIR=resolve('.frames');
const TYPES={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.webp':'image/webp'};

function serve(appSource){
 const built=resolve('dist/client'),source=resolve('.');
 const account={user:{id:'housing-review',email:'housing@test.local',provider:'chatgpt'},dataEpoch:1,revision:0,profile:{},entitlements:{},progress:{completedSets:0,xp:0,level:1,unlocks:{},exerciseRoute:{groups:{}}},push:{environment:'preview',configured:false,schedulerActive:false},onboarding:{data:completeCoach(),revision:1,startDay:'2026-09-21',completedAt:1,targets:{day:3,date:'2026-09-23',reps:3,holdSeconds:9,proteinGrams:100,waterOz:100,goals:{}}}};
 return createServer(async(req,res)=>{
  const path=new URL(req.url,'http://local').pathname;
  if(appSource&&path==='/app-runtime.mjs'){res.setHeader('Content-Type','text/javascript');res.end(appSource);return;}
  if(path==='/api/account'||path==='/api/breathing/start'){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify(path==='/api/account'?account:{id:'housing-ticket',startedAt:Date.now(),durationMs:180000,targetAccountId:account.user.id,dataEpoch:1}));return;}
  if(path.startsWith('/api/')){res.writeHead(path==='/api/auth/config'?200:401,{'Content-Type':'application/json'});res.end(JSON.stringify(path==='/api/auth/config'?{enabled:false}:{error:'Sign in'}));return;}
  try{const root=path.startsWith('/modules/portal/')||path==='/meditation.css'?source:built,file=resolve(root,'.'+(path==='/'?'/pose.html':path));if(!file.startsWith(root+sep))throw Error();const body=await readFile(file);res.writeHead(200,{'Content-Type':TYPES[extname(file)]||'application/octet-stream'});res.end(body);}catch{res.writeHead(404);res.end();}
 });
}
async function openApp(browser,base,reducedMotion,viewport,initialRoute=''){
 const context=await browser.newContext({viewport,serviceWorkers:'block',reducedMotion});
 await context.addInitScript(()=>Object.defineProperty(navigator,'standalone',{configurable:true,value:true}));
 // This guest has read today's field manual; its automatic modal has separate coverage.
 await context.addInitScript(()=>{const get=Storage.prototype.getItem,d=new Date(),day=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;Storage.prototype.getItem=function(key){return String(key).startsWith('myr5-how-to-play-day-v1/')?day:get.call(this,key);};});
 const seed=await context.newPage();
 await seed.goto(base+'/onboarding.html');
 await seed.evaluate(async intake=>{const {openLocalCoach}=await import('/local-coach-runtime.mjs');const repo=await openLocalCoach();await repo.forOwner(repo.guestOwnerId).saveSetup(intake,{startDay:'2026-09-21'});repo.close();},completeCoach());
 await seed.evaluate(async()=>{const cache=await caches.open('myr5-package-housing-review');for(const url of ['/pod/rooms/console.glb','/modules/rooms/reminders-computer.css']){const response=await fetch(url);if(!response.ok)throw Error('Missing test asset '+url);await cache.put(url,response);}});
 await seed.close();
 const page=await context.newPage();
 await page.addLocatorHandler(page.locator('.reward-pack-dialog[open]'),()=>page.locator('.reward-pack-dialog[open] [data-close]').click());
 await page.goto(base+'/pose.html'+(initialRoute?'#'+initialRoute:''));
 await page.waitForFunction(()=>window.myr5TestState?.phase==='idle'&&window.myr5WorkoutOwner&&!window.myr5WorkoutOwner.snapshot().transitioning);
 await page.waitForFunction(()=>!!document.querySelector('.coach-dock'));
 if(!initialRoute){await page.evaluate(()=>window.myr5Menus.portal());await page.waitForFunction(()=>document.getElementById('portalHome')?.hidden===false);}
 await page.waitForTimeout(300);
 await page.evaluate(()=>document.querySelector('.reward-pack-dialog[open] [data-close]')?.click());
 return {context,page};
}
let server,base,browser;
test.before(async()=>{
 const appSource=process.env.MYR5_SOURCE_APP==='1'?(await build({entryPoints:['app.mjs'],bundle:true,format:'esm',target:'es2022',write:false,external:['https://*','./local-coach-runtime.mjs','./creature/assets/phone.js','./modules/portal/portal-entry.mjs','./modules/ships/ship-view.mjs','./modules/ships/ship-intro.mjs'],plugins:[{name:'vendored-three',setup(build){build.onResolve({filter:/^three$/},()=>({path:'three',external:true}));}}]})).outputFiles[0].text:null;
 server=serve(appSource);await new Promise(r=>server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-gl=angle','--use-angle=swiftshader']});
 await mkdir(FRAMES_DIR,{recursive:true});
});
test.after(async()=>{await browser?.close();await new Promise(r=>server.close(r));});

test('abandoned direct housing requests cannot reopen after Home or supersede a newer route',{timeout:60000},async()=>{
 const {context,page}=await openApp(browser,base,'reduce',{width:375,height:812});try{
  await page.evaluate(async()=>{const opening=window.myr5Routes.go('food');window.myr5Routes.home();await opening;});
  await page.waitForFunction(()=>document.querySelector('#portalHome')?.hidden===false);
  assert.equal(await page.evaluate(()=>!!document.querySelector('#mealsPanel')?.open),false,'Home cancels pending lazy housing before it opens');
  await page.evaluate(async()=>{const old=window.myr5Routes.go('achievements'),latest=window.myr5Routes.go('reminders');await Promise.all([old,latest]);});
  assert.equal(await page.evaluate(()=>window.myr5Routes.current()),'reminders');
  assert.equal(await page.evaluate(()=>!!document.querySelector('.ach-board')?.open),false,'older destination cannot steal the latest route');
  assert.equal(await page.locator('#remindersPanel').evaluate(el=>el.open&&el.classList.contains('portal-fullscreen')),true);
 }finally{await context.close();}
});

test('cold direct destination links establish their own housing without a previous portal visit',{timeout:120000},async()=>{
 for(const [route,selector]of [['food','#mealsPanel'],['achievements','.ach-board'],['reminders','#remindersPanel'],['scoreboard','#accountPanel']]){
  const {context,page}=await openApp(browser,base,'reduce',{width:375,height:812},route);try{
   await page.waitForFunction(selector=>document.querySelector(selector)?.open&&document.querySelector(selector)?.classList.contains('portal-fullscreen'),selector);
   const state=await page.locator(selector).evaluate(el=>({rect:el.getBoundingClientRect().toJSON(),chrome:document.querySelector('#portalChrome')?.matches(':popover-open'),dock:el.contains(document.querySelector('#coachDock'))}));
   assert.equal(state.chrome,true,route+' cold link has visible housing');assert.equal(state.dock,true);assert.ok(Math.abs(state.rect.x-15)<1&&Math.abs(state.rect.width-345)<1,route+' cold link fills the inset face');
  }finally{await context.close();}
 }
});

test('each direct menu tilts while open without a fall-through entrance or moving its frame and dock',{timeout:120000},async()=>{
 const {context,page}=await openApp(browser,base,'no-preference',{width:375,height:812});try{
  await page.evaluate(async()=>{const T=await import('/vendor/three/three.module.js');window.__menuCameras=new Map();T.Scene.prototype.onBeforeRender=function(renderer,scene,camera){const dialog=renderer.domElement.closest('dialog');if(dialog)window.__menuCameras.set(dialog,camera);};});
  for(const [route,selector]of [['food','#mealsPanel'],['achievements','.ach-board'],['reminders','#remindersPanel'],['scoreboard','#accountPanel'],['settings','#settings']]){
   if(route==='settings'){await page.evaluate(()=>window.myr5Routes.go('pod'));await page.locator('#openSettings').click();}else await page.evaluate(route=>window.myr5Routes.go(route),route);await page.waitForFunction(({selector,route})=>document.querySelector(selector)?.open&&(route==='settings'||document.querySelector(selector)?.classList.contains('portal-fullscreen')),{selector,route});if(route==='reminders')await page.waitForFunction(()=>document.querySelector('#remindersPanel').dataset.reminderRoom==='ready');await page.waitForTimeout(300);
   assert.equal(await page.locator('.portal-glass').count(),0,'direct '+route+' does not play fall-through');
   const sample=()=>page.locator(selector).evaluate(el=>{const camera=window.__menuCameras.get(el),r=n=>n.getBoundingClientRect().toJSON();return{visual:JSON.stringify({camera:camera?.projectionMatrix.elements,layers:[...el.querySelectorAll('*')].filter(n=>!n.closest('#coachDock')).map(n=>[getComputedStyle(n).translate,getComputedStyle(n).rotate])}),frame:r(document.querySelector('#portalChrome .portal-frame')),dock:r(document.querySelector('#coachDock'))};});
   await page.mouse.move(30,250);await page.waitForTimeout(350);const left=await sample();await page.mouse.move(340,320);await page.waitForTimeout(450);const right=await sample();assert.notEqual(right.visual,left.visual,route+' changes actual scene projection or content layer transforms');assert.deepEqual(right.frame,left.frame,route+' frame stays fixed');assert.deepEqual(right.dock,left.dock,route+' dock stays fixed');
   if(route==='settings'){const xs=state=>JSON.parse(state.visual).layers.map(([translate])=>parseFloat(translate)).filter(Number.isFinite);assert.ok(xs(left).some(x=>x<-.1)&&xs(right).some(x=>x>.1),'flat Settings moves in both pointer directions');}
   await page.screenshot({path:resolve(FRAMES_DIR,`direct-tilt-${route}.png`)});
   await page.locator('#coachDock [data-route="portal"]').click();await page.waitForFunction(()=>!document.querySelector('dialog.portal-framed[open]')&&!document.querySelector('#portalHome').hidden);
  }
 }finally{await context.close();}
});

for(const viewport of [{width:375,height:812},{width:375,height:667}])test(`direct destination buttons share the metal housing and feathered strip at ${viewport.width}x${viewport.height}`,{timeout:120000},async()=>{
 const {context,page}=await openApp(browser,base,'reduce',viewport);try{
  await page.evaluate(()=>{document.querySelector('.app-update-banner [data-later]')?.click();for(const [name,value]of [['portal','#654321'],['strip','#19b478']]){const el=document.querySelector(`[data-look="${name}"]`);el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}));}});
  for(const {route,selector,shape}of [{route:'food',selector:'#mealsPanel',shape:'up'},{route:'achievements',selector:'.ach-board',shape:'down'},{route:'reminders',selector:'#remindersPanel',shape:'line-rl'},{route:'scoreboard',selector:'#accountPanel',shape:'vdiamond'}]){
   const returned=async stage=>{try{await page.waitForFunction(selector=>!document.querySelector(selector)?.open&&!document.querySelector('#portalChrome').matches(':popover-open')&&document.querySelector('#portalHome').hidden===false&&!document.querySelector('.portal-glass'),selector,{timeout:8000});}catch(error){throw Error(`${route} ${stage}: `+JSON.stringify(await page.evaluate(()=>({hash:location.hash,current:window.myr5Routes.current(),dialogs:[...document.querySelectorAll('dialog[open]')].map(el=>el.id||el.className),chrome:document.querySelector('#portalChrome').matches(':popover-open'),home:document.querySelector('#portalHome').hidden,glass:document.querySelector('.portal-glass')?.className}))));}};
   if(route==='reminders'){await page.evaluate(()=>window.myr5Portal.open('rect'));await page.waitForFunction(()=>document.querySelector('#portalWorkoutHome')?.open&&!document.querySelector('.portal-glass'));}
   await page.locator(`#coachDock [data-route="${route}"]`).click();try{await page.waitForFunction(selector=>document.querySelector(selector)?.open&&document.querySelector(selector)?.classList.contains('portal-fullscreen'),selector);}catch(error){throw Error(error.message+'; '+JSON.stringify(await page.evaluate(()=>({hash:location.hash,dialogs:[...document.querySelectorAll('dialog[open]')].map(el=>({id:el.id,class:el.className})),dock:document.querySelector('#coachDock').innerHTML,chrome:document.querySelector('#portalChrome')?.outerHTML.slice(0,350)}))));}
   await page.waitForFunction(()=>document.querySelector('#portalChrome .portal-aura-fire>i'));
   const framed=await page.locator(selector).evaluate(el=>{const r=el.getBoundingClientRect(),chrome=document.querySelector('#portalChrome'),frame=chrome.querySelector('.portal-frame').getBoundingClientRect(),aura=chrome.querySelector('.portal-aura'),dock=document.querySelector('#coachDock').getBoundingClientRect();return{rect:r.toJSON(),frame:frame.toJSON(),open:chrome.matches(':popover-open'),metal:getComputedStyle(chrome).getPropertyValue('--portal-metal').trim(),aura:aura.style.getPropertyValue('--aura'),gradient:getComputedStyle(aura.querySelector('.portal-aura-fire>i')).backgroundImage,clip:getComputedStyle(el).clipPath,dock:dock.toJSON()};});
   assert.equal(framed.open,true,route+' has visible metal housing');assert.equal(framed.metal,'#654321');assert.equal(framed.aura,'#19b478');assert.match(framed.gradient,/rgb\(25, 180, 120\)/,'selected Strip reaches the visible feathered rim');assert.equal(framed.clip,'none');
   for(const r of [framed.rect,framed.frame]){assert.ok(Math.abs(r.x-15)<1&&Math.abs(r.y-15)<1&&Math.abs(r.width-(viewport.width-30))<1&&Math.abs(r.height-(viewport.height-30))<1,route+' uses the shared inset face: '+JSON.stringify(r));}
   assert.ok(framed.dock.left>=14&&framed.dock.right<=viewport.width-14&&framed.dock.bottom<=viewport.height-14,'dock remains inside the rails');
   if(route==='reminders'){
    await page.waitForFunction(()=>document.querySelector('#remindersPanel')?.dataset.reminderRoom==='ready');
    const monitor=await page.locator('.reminders-computer-screen').evaluate(el=>{const r=el.getBoundingClientRect(),host=el.parentElement.querySelector('.reminders-computer-stage').getBoundingClientRect();el.scrollTop=el.scrollHeight;const moved=el.scrollTop;el.scrollTop=0;return{rect:r.toJSON(),host:host.toJSON(),moved,overflow:el.scrollHeight-el.clientHeight};});
    assert.ok(monitor.rect.width>=140&&monitor.rect.height>=170,'actual monitor controls retain usable dimensions: '+JSON.stringify(monitor));
    assert.ok(monitor.rect.left>=monitor.host.left-1&&monitor.rect.right<=monitor.host.right+1&&monitor.rect.top>=monitor.host.top-1&&monitor.rect.bottom<=monitor.host.bottom+1,'form stays inside the rendered monitor stage');
    if(monitor.overflow>1)assert.ok(monitor.moved>0,'content scrolls inside the monitor after framed-workout handover');
   }
   assert.equal(await page.locator('#coachDock [data-route="portal"]').evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}),true,'direct destination retains a tappable Portal key');
   await page.screenshot({path:resolve(FRAMES_DIR,`direct-housing-${route}-${viewport.width}x${viewport.height}.png`)});
   if(route==='food')await page.goBack();else await page.locator('#coachDock [data-route="portal"]').click();
   await returned('direct return');
   await page.evaluate(shape=>window.myr5Portal.open(shape),shape);await page.waitForFunction(selector=>document.querySelector(selector)?.open&&!document.querySelector('.portal-arriving'),selector);
   assert.equal(await page.locator(selector).evaluate(el=>el.classList.contains('portal-framed')&&!el.classList.contains('portal-fullscreen')),true,'traced '+route+' retains its existing cut/inset entry');
   await page.locator('#coachDock [data-route="portal"]').click();await returned('traced return');
  }
 }finally{await context.close();}
});

for(const viewport of [{width:375,height:812},{width:375,height:667},{width:812,height:375}])test(`permanent housing contains meditation and expanded scenes at ${viewport.width}x${viewport.height}`,{timeout:120000},async()=>{
 const {context,page}=await openApp(browser,base,'reduce',viewport);
 try{
  const checkFrame=async()=>{
   const currentViewport=page.viewportSize();
   const frame=await page.locator('#portalChrome .portal-frame').evaluate(el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el),chrome=el.closest('#portalChrome');return{x:r.x,y:r.y,width:r.width,height:r.height,display:s.display,opacity:Number(s.opacity),transform:s.transform,open:chrome.matches(':popover-open'),garage:chrome.classList.contains('portal-garage')};});
   assert.equal(frame.open,true);assert.equal(frame.garage,false,'housing never uses the garage-away state');assert.notEqual(frame.display,'none');assert.ok(frame.opacity>.9);assert.equal(frame.transform,'none');
   assert.ok(frame.x>=14&&frame.y>=14&&frame.x+frame.width<=currentViewport.width-14&&frame.y+frame.height<=currentViewport.height-14,'15px metal rails remain around the full scene: '+JSON.stringify({frame,currentViewport}));return frame;
  };
  await page.evaluate(()=>{window.__openMeditation=window.myr5Portal.open('line-lr');});
  await page.waitForFunction(()=>document.querySelector('.meditation-panel')?.open&&!document.querySelector('.portal-arriving'),null,{timeout:30000});await page.evaluate(()=>window.__openMeditation);
  await page.waitForFunction(()=>document.querySelector('.meditation-panel.has-wonder-art'));
  const frame=await checkFrame(),panel=await page.locator('.meditation-panel').boundingBox();for(const k of ['x','y','width','height'])assert.ok(Math.abs(panel[k]-frame[k])<1,'meditation stays inside the housing face: '+k);
  await page.evaluate(()=>{for(const [key,value] of [['portal','#123456'],['strip','#19b478']]){const input=document.querySelector(`[data-look="${key}"]`);input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));}});
  const appearance=await page.evaluate(()=>({metal:['--portal-metal','--frame-metal'].map(p=>getComputedStyle(document.documentElement).getPropertyValue(p).trim()),rim:document.querySelector('#portalChrome .portal-aura')?.style.getPropertyValue('--aura'),gradient:getComputedStyle(document.querySelector('#portalChrome .portal-aura-fire>i')).backgroundImage,energy:document.querySelector('#portalChrome .portal-energy').style.getPropertyValue('--energy')}));
  assert.deepEqual(appearance.metal,['#123456','#123456']);assert.equal(appearance.rim,'#19b478','Strip controls the visible feathered interface rim');assert.match(appearance.gradient,/rgb\(25, 180, 120\)/,'the actual rim gradient uses the selected Strip color');assert.ok(appearance.energy.includes('#19b478'),'the metal light channel uses the same independent Strip selection');
  await page.evaluate(()=>{window.__energyStates=[];window.__energyObserver=new MutationObserver(records=>{for(const r of records){if(!r.target.matches?.('.portal-energy'))continue;const value=r.target.style.getPropertyValue('--energy');if(value)window.__energyStates.push(value);}});window.__energyObserver.observe(document.body,{subtree:true,attributes:true,attributeFilter:['style','class']});});
  await page.locator('[data-mode="wim-hof"]').click();await page.waitForFunction(()=>/remaining/.test(document.querySelector('[data-status]').textContent));
  for(const selector of ['[data-meditation-close]','[data-breath-pause]','[data-breath-exit]','#coachDock']){
   const box=await page.locator(selector).boundingBox(),style=await page.locator(selector).evaluate(el=>{const s=getComputedStyle(el);return{position:s.position,top:s.top,left:s.left,right:s.right,bottom:s.bottom,height:s.height,transform:s.transform,inline:el.getAttribute('style'),parent:el.parentElement.className,offsetParent:el.offsetParent?.className};});assert.ok(box&&box.x>=frame.x-1&&box.y>=frame.y-1&&box.x+box.width<=frame.x+frame.width+1&&box.y+box.height<=frame.y+frame.height+1,`${selector} fits within the metal rails: ${JSON.stringify({box,frame,style})}`);
   if(selector!=='#coachDock')assert.equal(await page.locator(selector).evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}),true,selector+' remains tappable');
  }
  await page.screenshot({path:resolve(FRAMES_DIR,`housing-meditation-${viewport.width}x${viewport.height}.png`)});
  const clear=await page.evaluate(()=>{const a=document.querySelector('.meditation-speech').getBoundingClientRect(),b=document.querySelector('.breath-run').getBoundingClientRect(),el=document.querySelector('.meditation-speech');return{overlap:a.x<b.right&&a.right>b.x&&a.y<b.bottom&&a.bottom>b.y,clipped:el.scrollWidth>el.clientWidth+1||el.scrollHeight>el.clientHeight+1,client:[el.clientWidth,el.clientHeight],scroll:[el.scrollWidth,el.scrollHeight],text:el.textContent};});assert.ok(!clear.overlap&&!clear.clipped,'guidance remains clear in the reduced scene area: '+JSON.stringify(clear));
  if(viewport.height===812){const resized=()=>page.waitForFunction(()=>{const r=document.querySelector('#portalChrome .portal-frame').getBoundingClientRect();return Math.abs(r.width-(innerWidth-30))<1&&Math.abs(r.height-(innerHeight-30))<1;},null,{timeout:5000});await page.setViewportSize({width:812,height:375});await resized();const rotated=await checkFrame(),box=await page.locator('.meditation-panel').boundingBox();for(const k of ['x','y','width','height'])assert.ok(Math.abs(box[k]-rotated[k])<1,'rotating an open room keeps it inside the housing: '+k);await page.setViewportSize(viewport);await resized();}
  const ring=await page.locator('[data-breath-exit]').boundingBox();await page.mouse.click(ring.x+ring.width/2,ring.y+ring.height/2);await page.waitForFunction(()=>!document.querySelector('.meditation-panel').open&&!document.querySelector('.portal-glass')&&!document.querySelector('#portalHome').hidden,null,{timeout:15000});
  assert.equal(await page.locator('#portalHome .portal-frame').isVisible(),true,'return hands the visible housing back to the portal');
  await page.evaluate(()=>{window.__openClassroom=window.myr5Portal.open('vdiamond');});await page.waitForFunction(()=>document.querySelector('#accountPanel')?.open&&!document.querySelector('.portal-arriving'),null,{timeout:30000});await page.evaluate(()=>window.__openClassroom);
  await page.evaluate(()=>document.querySelector('#accountPanel').dispatchEvent(new CustomEvent('myr5:classroom-board',{bubbles:true})));
  await page.waitForFunction(()=>document.querySelector('#accountPanel.portal-fullscreen'));const expanded=await checkFrame(),box=await page.locator('#accountPanel').boundingBox();for(const k of ['x','y','width','height'])assert.ok(Math.abs(box[k]-expanded[k])<1,'expanded scene stays inside persistent housing: '+k);
  assert.equal(await page.locator('#accountPanel').evaluate(el=>getComputedStyle(el).clipPath),'none','expansion removes the shaped viewing cut');
  await page.screenshot({path:resolve(FRAMES_DIR,`housing-expanded-${viewport.width}x${viewport.height}.png`)});
  await page.locator('#accountPanel [data-close]').click();await page.waitForFunction(()=>!document.querySelector('#accountPanel').open&&!document.querySelector('.portal-glass')&&!document.querySelector('#portalHome').hidden,null,{timeout:15000});assert.equal(await page.locator('#portalHome .portal-frame').isVisible(),true);
  const transitions=await page.evaluate(()=>{window.__energyObserver.disconnect();return window.__energyStates;});assert.ok(transitions.length>0&&transitions.every(value=>value.includes('#19b478')),'entry and exit preserve the independently selected Strip hue: '+JSON.stringify(transitions));
 }finally{await context.close();}
});
