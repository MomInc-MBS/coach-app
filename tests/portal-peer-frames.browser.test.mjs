// R7-PEER (Ian 26 Sep, Android): "the diamond cut through, oval cut through, and both triangle cut throughs are very laggy
// and glitchy". Frame cost while each is peered and the phone is held still (a tilt sensor that only jitters, as Android's
// does), at 375x812 x2 with an Android UA and 4x CPU throttle against `npm run build`: rAF frame times, main-thread busy
// time, style recalcs, and how often the cut's clip-path is rewritten; then the same while the phone turns slowly side to
// side (the look-around moving). The numbers print (the report's before/after);
// the checks are the causes the fix removed. Then a two-finger pinch on an open menu must not zoom. Frames: .frames/.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {chromium} from 'playwright';
import {completeCoach} from './onboarding-fixture.mjs';

const FRAMES=resolve('.frames');
const TYPES={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.webp':'image/webp'};
const ANDROID='Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36';
function serve(){
 const root=resolve('dist/client');
 return createServer(async(req,res)=>{
  const path=new URL(req.url,'http://local').pathname;
  if(path.startsWith('/api/')){res.writeHead(path==='/api/auth/config'?200:401,{'Content-Type':'application/json'});res.end(JSON.stringify(path==='/api/auth/config'?{enabled:false}:{error:'Sign in'}));return;}
  try{const file=resolve(root,'.'+(path==='/'?'/pose.html':path));if(!file.startsWith(root+sep))throw Error();const body=await readFile(file);res.writeHead(200,{'Content-Type':TYPES[extname(file)]||'application/octet-stream'});res.end(body);}catch{res.writeHead(404);res.end();}
 });
}
async function openApp(browser,base){
 const context=await browser.newContext({viewport:{width:375,height:812},deviceScaleFactor:2,isMobile:true,hasTouch:true,userAgent:ANDROID,serviceWorkers:'block'});
 await context.addInitScript(()=>{Object.defineProperty(navigator,'standalone',{configurable:true,value:true});try{localStorage.setItem('myr5.portalHintShown','1');localStorage.setItem('myr5.tiltPermission','granted');const d=new Date();localStorage.setItem('myr5-how-to-play-day-v1/guest',`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`);}catch{}});
 const seed=await context.newPage();
 await seed.goto(base+'/onboarding.html');
 await seed.evaluate(async intake=>{const {openLocalCoach}=await import('/local-coach-runtime.mjs');const repo=await openLocalCoach();await repo.forOwner(repo.guestOwnerId).saveSetup(intake,{startDay:'2026-09-21'});repo.close();},completeCoach());
 await seed.close();
 const page=await context.newPage();
 await page.goto(base+'/pose.html');
 await page.waitForFunction(()=>window.myr5TestState?.phase==='idle'&&window.myr5WorkoutOwner&&!window.myr5WorkoutOwner.snapshot().transitioning);
 await page.waitForFunction(()=>!!document.querySelector('.coach-dock'));
 await page.evaluate(()=>document.querySelector('.app-update-banner [data-later]')?.click());
 await page.evaluate(()=>window.myr5Menus.portal());
 await page.waitForFunction(()=>document.getElementById('portalHome')?.hidden===false);
 await page.waitForTimeout(300);
 return {context,page};
}
const quiltHome=page=>page.waitForFunction(()=>!document.getElementById('portalHome').hidden&&!document.querySelector('.portal-glass')&&!document.getElementById('portalChrome').matches(':popover-open')&&location.hash==='',null,{timeout:20000});
// [id, dialog, its scene is up, its Close]
const CUTS=[
 ['up','#mealsPanel',()=>document.querySelector('#pyramidScanner canvas')&&!document.querySelector('#pyramidScanner[data-loading]'),'#mealsPanel [data-close]'],
 ['down','.ach-board',()=>document.querySelector('.ach-board canvas'),'.ach-close'],
 ['vdiamond','#accountPanel',()=>document.querySelector('#accountPanel[data-room="ready"] .classroom-canvas'),'#accountPanel [data-close]'],
 ['oval','dialog.ship-view',()=>document.querySelector('.ship-view-stage .ship-scene[data-phase=ready]')&&!document.querySelector('.ship-scene-flash:popover-open'),'.ship-view-close'],
];
const SAMPLE_MS=4000,SWEEP_MS=4000;
const p95=a=>{const s=[...a].sort((x,y)=>x-y);return s[Math.min(s.length-1,Math.floor(s.length*.95))]||0;};

let server,base,browser;
test.before(async()=>{
 server=serve();await new Promise(r=>server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+server.address().port;
 // A real GPU, as the phone has: SwiftShader's software WebGL would swamp the numbers.
 browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-gpu','--use-angle=d3d11','--ignore-gpu-blocklist']});
 await mkdir(FRAMES,{recursive:true});
});
test.after(async()=>{await browser?.close();await new Promise(r=>server.close(r));});

test('R7-PEER: the four cut-throughs, held still on a jittery Android tilt sensor, never rewrite the cut or restyle the whole menu per frame',{timeout:300000},async()=>{
 const {context,page}=await openApp(browser,base);
 const cdp=await context.newCDPSession(page);await cdp.send('Performance.enable');
 const metrics=async()=>Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m=>[m.name,m.value]));
 const rows=[];
 try{
  for(const [id,sel,ready,close] of CUTS){
   await page.evaluate(id=>{window.run=window.myr5Portal.open(id);},id);
   await page.waitForFunction(sel=>document.querySelector(sel)?.open&&document.querySelector(sel).classList.contains('portal-shaped'),sel,{timeout:30000});
   await page.evaluate(()=>window.run);
   await page.waitForFunction(ready,null,{timeout:30000});
   await page.waitForTimeout(1500); // the open burst and the wormhole's hand-over are done
   await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
   await page.evaluate(sel=>{
    const d=document.querySelector(sel);let clip=d.style.clipPath;window.__peer={frames:[],clips:0,peerX:0,run:true};
    new MutationObserver(()=>{if(d.style.clipPath!==clip){clip=d.style.clipPath;window.__peer.clips++;}if(d.style.getPropertyValue('--peer-x'))window.__peer.peerX++;}).observe(d,{attributes:true,attributeFilter:['style']});
    // Android's sensor at rest: ~60 Hz, a few tenths of a degree of noise round where the phone is held.
    const noise=()=>(Math.random()-.5)*.4,t0=performance.now(),turn=()=>window.__peer.sweep?8*Math.sin((performance.now()-t0)*Math.PI/1000):0;
    const jitter=setInterval(()=>dispatchEvent(new DeviceOrientationEvent('deviceorientation',{alpha:0,beta:50+noise(),gamma:turn()+noise()})),16);
    let last=0;const tick=now=>{if(!window.__peer.run){clearInterval(jitter);return;}if(last)window.__peer.frames.push(now-last);last=now;requestAnimationFrame(tick);};requestAnimationFrame(tick);
   },sel);
   await page.waitForTimeout(500); // the first reading sets the baseline and the eye settles
   await page.evaluate(()=>{window.__peer.frames.length=0;window.__peer.clips=0;window.__peer.peerX=0;});
   const m0=await metrics();
   await page.waitForTimeout(SAMPLE_MS);
   const m1=await metrics(),s=await page.evaluate(()=>{const s=structuredClone(window.__peer);window.__peer.frames.length=0;window.__peer.clips=0;window.__peer.sweep=true;return s;});
   // Then the phone slowly turned side to side (+-8 degrees, 2 s a sweep): the look-around moving, as Ian peers.
   await page.waitForTimeout(SWEEP_MS);
   const w=await page.evaluate(()=>{window.__peer.run=false;return window.__peer;});
   await cdp.send('Emulation.setCPUThrottlingRate',{rate:1});
   const d=k=>m1[k]-m0[k],secs=(m1.Timestamp-m0.Timestamp)||SAMPLE_MS/1000,mean=s.frames.reduce((a,b)=>a+b,0)/Math.max(1,s.frames.length);
   const row={id,fps:+(s.frames.length/secs).toFixed(1),frameMs:+mean.toFixed(1),p95Ms:+p95(s.frames).toFixed(1),busyMsPerS:+(d('TaskDuration')*1000/secs).toFixed(0),styleMsPerS:+(d('RecalcStyleDuration')*1000/secs).toFixed(1),stylesPerS:+(d('RecalcStyleCount')/secs).toFixed(1),layoutsPerS:+(d('LayoutCount')/secs).toFixed(1),clipWrites:s.clips,peerXWrites:s.peerX,
    turnFps:+(w.frames.length*1000/SWEEP_MS).toFixed(1),turnP95Ms:+p95(w.frames).toFixed(1),turnClipWrites:w.clips};
   rows.push(row);
   await page.screenshot({path:resolve(FRAMES,`peer-${id}.png`)});
   await page.locator(close).first().click();
   await quiltHome(page);
  }
 }finally{
  console.log('R7-PEER frame cost (4x CPU, 375x812@2x; still phone 4 s, then turning +-8 deg 4 s = turn*):');console.table(rows);
  await context.close();
 }
 for(const r of rows){
  assert.equal(r.clipWrites,0,`${r.id}: the cut's clip-path is not rebuilt while the phone is held still`);
  assert.equal(r.peerXWrites,0,`${r.id}: a scene's whole menu is not restyled by --peer-x every frame`);
  assert.equal(r.turnClipWrites,0,`${r.id}: nor while the phone turns (the scene's controls ride the look-around)`);
 }
});

test('R7-PEER: two fingers never zoom an open menu or the quilt; one finger still traces',{timeout:120000},async()=>{
 const {context,page}=await openApp(browser,base);
 const cdp=await context.newCDPSession(page);
 // Two fingers spreading apart (touch events respect touch-action, as a phone's do).
 const touch=(type,pts)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:pts.map(([x,y],id)=>({x,y,id}))});
 const pinch=async([x,y])=>{
  const at=await page.evaluate(([x,y])=>{const el=document.elementFromPoint(x,y);return `${el?.tagName}#${el?.id}.${el?.className} touch-action:${el&&getComputedStyle(el).touchAction}`;},[x,y]);
  await touch('touchStart',[[x-15,y],[x+15,y]]);for(let d=20;d<=120;d+=5){await touch('touchMove',[[x-d,y],[x+d,y]]);await page.waitForTimeout(16);}await touch('touchEnd',[]);await page.waitForTimeout(400);
  const scale=await page.evaluate(()=>visualViewport.scale);return scale===1?1:`${scale} on ${at}`;
 };
 try{
  assert.equal(await pinch([187,300]),1,'the quilt does not zoom');
  await page.evaluate(()=>{window.run=window.myr5Portal.open('up');});
  await page.waitForFunction(()=>document.querySelector('#mealsPanel.portal-shaped'),null,{timeout:30000});
  await page.evaluate(()=>window.run);
  const middle=await page.evaluate(()=>{const p=document.querySelector('.portal-aura').style;return [parseFloat(p.getPropertyValue('--cx')),parseFloat(p.getPropertyValue('--cy'))];});
  assert.equal(await pinch(middle),1,'the Food cut does not zoom');
  assert.equal(await pinch([40,200]),1,'the wall round the cut does not zoom');
  const bar=await page.evaluate(()=>{const r=document.getElementById('coachDock').getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2];});
  assert.equal(await pinch(bar),1,'the bar does not zoom');
  await page.locator('#mealsPanel [data-close]').click();
  await quiltHome(page);await page.waitForTimeout(600); // the healed quilt settles
  // One finger still traces the square (the pointer stroke is not eaten as a scroll or a gesture).
  const r=await page.evaluate(()=>window.myr5Portal.current().patternRect());
  const [x0,y0,x1,y1]=[r.left+r.width*.06,r.top+r.height*.06,r.left+r.width*.94,r.top+r.height*.94],path=[[x0,y0],[x1,y0],[x1,y1],[x0,y1],[x0,y0]];
  await touch('touchStart',[path[0]]);
  for(let i=1;i<path.length;i++)for(let k=1;k<=8;k++){const [ax,ay]=path[i-1],[bx,by]=path[i];await touch('touchMove',[[ax+(bx-ax)*k/8,ay+(by-ay)*k/8]]);await page.waitForTimeout(16);}
  await touch('touchEnd',[]);
  await page.waitForFunction(()=>document.querySelector('.portal-glass'),null,{timeout:8000});
 }finally{await context.close();}
});
