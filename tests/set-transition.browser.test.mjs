// #150 (W5-5W): a finished manual set goes into rest through the wormhole and Next set / the rest exit come back out
// through it. Each trip covers the screen for at least TRANSITION_MIN_MS with its one status line; reduced motion and
// a missing portal get a short fade instead. Runs the real build (npm run build) at 375x812; frames in .frames/.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {chromium} from 'playwright';
import {completeCoach} from './onboarding-fixture.mjs';
import {TRANSITION_MIN_MS,FADE_MS,LINES} from '../pod/set-transition.mjs';

const FRAMES=resolve('.frames');
const TYPES={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.webp':'image/webp'};
function serve(){
 const root=resolve('dist/client');
 return createServer(async(req,res)=>{
  const path=new URL(req.url,'http://local').pathname;
  if(path.startsWith('/api/')){res.writeHead(path==='/api/auth/config'?200:401,{'Content-Type':'application/json'});res.end(JSON.stringify(path==='/api/auth/config'?{enabled:false}:{error:'Sign in'}));return;}
  try{const file=resolve(root,'.'+(path==='/'?'/pose.html':path));if(!file.startsWith(root+sep))throw Error();const body=await readFile(file);res.writeHead(200,{'Content-Type':TYPES[extname(file)]||'application/octet-stream'});res.end(body);}catch{res.writeHead(404);res.end();}
 });
}
async function openPod(browser,base,{reducedMotion='no-preference',portal=true}={}){
 const context=await browser.newContext({viewport:{width:375,height:812},serviceWorkers:'block',reducedMotion});
 await context.addInitScript(()=>Object.defineProperty(navigator,'standalone',{configurable:true,value:true}));
 await context.addInitScript((()=>{const get=Storage.prototype.getItem,d=new Date(),day=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;Storage.prototype.getItem=function(key){return String(key).startsWith('myr5-how-to-play-day-v1/')?day:get.call(this,key);};}));
 const seed=await context.newPage();await seed.goto(base+'/onboarding.html');
 await seed.evaluate(async intake=>{const {openLocalCoach}=await import('/local-coach-runtime.mjs');const repo=await openLocalCoach();await repo.forOwner(repo.guestOwnerId).saveSetup(intake,{startDay:'2026-09-21'});repo.close();},completeCoach());await seed.close();
 // No portal: its unbundled module files never arrive (the optional files aren't downloaded yet).
 if(!portal)await context.route(/\/modules\/portal\//,route=>route.abort());
 const page=await context.newPage();await page.goto(base+'/pose.html');
 await page.waitForFunction(()=>window.myr5TestState?.phase==='idle'&&window.myr5WorkoutOwner&&!window.myr5WorkoutOwner.snapshot().transitioning);
 if(portal){await page.evaluate(()=>window.myr5Menus.portal());await page.waitForFunction(()=>document.getElementById('portalHome')?.hidden===false);}
 await page.evaluate(()=>{document.querySelector('.app-update-banner [data-later]')?.click();location.hash='pod';});
 await page.waitForFunction(()=>window.myr5Routes.current()==='pod'&&document.getElementById('portalHome')?.hidden!==false);
 if(!portal)assert.equal(await page.evaluate(()=>!!window.myr5Portal),false,'the portal was never mounted');
 // Every frame: is the wormhole / the cover up, what does the line say, which screen is under it.
 // The wormhole's own mount/unmount times (frames can be sparse under the software WebGL renderer).
 await page.evaluate(()=>{window.wormAt=[];window.fades=[];new MutationObserver(ms=>{for(const m of ms)for(const [nodes,up] of [[m.addedNodes,true],[m.removedNodes,false]])for(const n of nodes)for(const cls of ['portal-wormhole','set-transition'])if(n.classList?.contains(cls)){window.wormAt.push({t:performance.now(),up,cls});if(up&&cls==='set-transition'){const read=()=>{if(!n.isConnected)return;for(const a of n.getAnimations())if(!window.fades.includes(a)){window.fades.push(a);}requestAnimationFrame(read);};read();}}}).observe(document.body,{childList:true});new MutationObserver(()=>{if(document.body.dataset.screen==='rest'&&!window.restOpened)window.restOpened=document.getElementById('restTime')?.getAttribute('aria-label');}).observe(document.body,{attributes:true,attributeFilter:['data-screen']});});
 await page.evaluate(()=>{window.trip=[];const look=()=>{window.trip.push({t:performance.now(),worm:!!document.querySelector('.portal-wormhole'),cover:document.querySelector('.set-transition')?.textContent||'',screen:document.body.dataset.screen});requestAnimationFrame(look);};look();});
 return {context,page};
}
// A manual set tapped to its goal (no camera in these tests).
async function finishManualSet(page){
 await page.evaluate(()=>{document.getElementById('camera').value='manual';document.getElementById('start').click();});
 await page.waitForFunction(()=>window.myr5TestState.phase==='manual');
 await page.evaluate(async()=>{window.trip.length=0;window.wormAt.length=0;window.fades.length=0;for(let i=0;i<200&&!document.querySelector('.set-transition')&&document.body.dataset.screen!=='rest';i++){document.getElementById('primary').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true}));await new Promise(r=>setTimeout(r,60));}});
}
// How long the cover (and the wormhole) stayed up in the recorded trip, and what was under it at the end.
const summary=page=>page.evaluate(()=>{const up=window.trip.filter(f=>f.cover),span=cls=>{const at=window.wormAt.filter(e=>e.cls===cls);return at.length===2&&at[0].up&&!at[1].up?at[1].t-at[0].t:0;};return {fadeMs:window.fades.reduce((t,a)=>t+a.effect.getTiming().duration,0),coverMs:span('set-transition'),wormMs:span('portal-wormhole'),lines:[...new Set(up.map(f=>f.cover))],screens:[...new Set(up.map(f=>f.screen))]};});
const settled=page=>page.waitForFunction(()=>!document.querySelector('.set-transition')&&!document.querySelector('.portal-wormhole')&&!document.body.inert,null,{timeout:20000});

let server,base,browser;
test.before(async()=>{
 server=serve();await new Promise(r=>server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-gl=angle','--use-angle=swiftshader']});
 await mkdir(FRAMES,{recursive:true});
});
test.after(async()=>{await browser?.close();await new Promise(r=>server.close(r));});

test('a finished set goes into rest through the wormhole, keeps its full rest, and Next set comes back through it',{timeout:120000},async()=>{
 const {context,page}=await openPod(browser,base);
 try{
  await finishManualSet(page);
  await page.waitForFunction(()=>document.querySelector('.portal-wormhole')&&document.querySelector('.set-transition'));
  await page.waitForTimeout(TRANSITION_MIN_MS/2-300);
  await page.screenshot({path:resolve(FRAMES,'w5-5w-1-tunnel-into-rest.png')});
  await settled(page);
  const restLabel=await page.evaluate(()=>window.restOpened); // the moment rest opened under the cover
  let s=await summary(page);
  assert.ok(s.wormMs>=TRANSITION_MIN_MS-100,`wormhole up ${Math.round(s.wormMs)} ms`);
  assert.deepEqual(s.lines,[LINES.rest]);assert.deepEqual(s.screens,['pod','rest'],'swapped under the cover');
  assert.equal(await page.evaluate(()=>document.body.dataset.screen==='rest'&&!document.getElementById('restScreen').hidden&&document.activeElement?.id==='restHeading'),true);
  assert.match(await page.locator('#earnedXp').textContent(),/XP/);assert.match(await page.locator('#setReceipt').textContent(),/\d/);
  // The rest timer started with the set, but the trip in doesn't come out of it: the full rest shows once rest opens.
  const rest=Number(await page.locator('#restDuration').inputValue()),clock=s=>`${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')} `;
  assert.ok([clock(rest),clock(rest-1)].some(c=>(''+restLabel).startsWith(c)),`rest shows ${restLabel} for a ${rest} s rest`);
  await page.waitForTimeout(400);await page.screenshot({path:resolve(FRAMES,'w5-5w-2-rest-arena.png')});
  // Signed out here, so there is no account route: give it one next round, as the account's progress would.
  await page.evaluate(async()=>{const {routeDay,exerciseFamily}=await import('/workout-route.mjs');window.coachProgress={...window.coachProgress,exerciseRoute:{day:routeDay(Date.now(),'UTC'),timezone:'UTC',groups:{[exerciseFamily('squat')]:{id:exerciseFamily('squat'),remaining:1,today:1,level:1,maxLevel:5,next:{mode:'squat',goal:5}}}}};});
  // Jump to the end of the rest (the page's clock only), then Next set.
  await page.evaluate(()=>{const [m,sec]=document.getElementById('restTime').getAttribute('aria-label').split(' ')[0].split(':').map(Number),skip=(m*60+sec)*1000+300,now=Date.now.bind(Date);Date.now=()=>now()+skip;}); // just past the timer, inside its 3 s idle grace
  await page.waitForFunction(()=>!document.getElementById('nextSet').disabled);
  await page.evaluate(()=>{window.trip.length=0;window.wormAt.length=0;window.fades.length=0;document.getElementById('nextSet').click();});
  await page.waitForFunction(()=>document.querySelector('.portal-wormhole')&&document.querySelector('.set-transition'));
  await page.waitForTimeout(TRANSITION_MIN_MS/2+200);
  await page.screenshot({path:resolve(FRAMES,'w5-5w-3-tunnel-back.png')});
  await settled(page);
  s=await summary(page);
  assert.ok(s.wormMs>=TRANSITION_MIN_MS-100,`wormhole up ${Math.round(s.wormMs)} ms`);
  assert.deepEqual(s.lines,[LINES.next]);assert.deepEqual(s.screens,['rest','pod']);
  assert.equal(await page.evaluate(()=>document.body.dataset.screen==='pod'&&document.getElementById('restScreen').hidden&&location.hash==='#pod'),true,'back on the pod');
  await page.waitForFunction(()=>document.querySelector('dialog[open]'),null,{timeout:10000}); // the flow continues: Next introduces the next round
 }finally{await context.close();}
});

test('the rest exit leaves through the wormhole to the quilt',{timeout:120000},async()=>{
 const {context,page}=await openPod(browser,base);
 try{
  await finishManualSet(page);await settled(page);
  await page.evaluate(()=>{window.trip.length=0;window.wormAt.length=0;window.fades.length=0;document.getElementById('leaveRest').click();});
  await settled(page);
  const s=await summary(page);
  assert.ok(s.wormMs>=TRANSITION_MIN_MS-100,`wormhole up ${Math.round(s.wormMs)} ms`);assert.deepEqual(s.lines,[LINES.home]);
  await page.waitForFunction(()=>document.getElementById('portalHome')?.hidden===false&&location.hash==='');
  await page.screenshot({path:resolve(FRAMES,'w5-5w-4-left-to-quilt.png')});
 }finally{await context.close();}
});

for(const [name,options] of [['reduced motion',{reducedMotion:'reduce'}],['no portal',{portal:false}]]){
 test(`${name}: a short fade in and out, no wormhole, rest still opens`,{timeout:120000},async()=>{
  const {context,page}=await openPod(browser,base,options);
  try{
   await finishManualSet(page);
   await page.waitForFunction(()=>document.querySelector('.set-transition'));
   if(name==='reduced motion')await page.screenshot({path:resolve(FRAMES,'w5-5w-5-reduced-fade.png')});
   await settled(page);
   const s=await summary(page);
   assert.equal(s.wormMs,0,'no wormhole');assert.ok(s.fadeMs>=FADE_MS&&s.fadeMs<=800,`fade ${s.fadeMs} ms`);assert.ok(s.coverMs<TRANSITION_MIN_MS,`covered ${Math.round(s.coverMs)} ms (the fade plus the swap's own work)`);
   assert.equal(await page.evaluate(()=>document.body.dataset.screen==='rest'&&!document.getElementById('restScreen').hidden),true);
   await page.evaluate(()=>{window.trip.length=0;window.wormAt.length=0;window.fades.length=0;document.getElementById('leaveRest').click();});
   await settled(page);assert.equal((await summary(page)).wormMs,0);
   assert.equal(await page.evaluate(()=>document.body.dataset.screen),'pod');
  }finally{await context.close();}
 });
}
