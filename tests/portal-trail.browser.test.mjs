// #105 (W2-2E): a magical finger trail on #portalOverlay — a neon ribbon flowing through the six neons
// along its length, sparkles shed from the fingertip, a bright tip, an ~0.8s fade, and a flash to the
// destination colour on a matched shape. Reduced motion: a plain glowing line, no particles. Frame
// captures land in .frames/ (untracked) per the brief's Verify section.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {chromium} from 'playwright';

const FRAMES_DIR=resolve('.frames');

async function withPortal(run){
 const source=resolve('.'),built=resolve('dist/client');
 const server=createServer(async(req,res)=>{
  const path=new URL(req.url,'http://local').pathname;
  if(path==='/__portal__'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><style>body{margin:0}</style><script type="importmap">{"imports":{"three":"/vendor/three/three.module.js"}}</script>');return;}
  try{const root=path.startsWith('/modules/portal/')?source:built,file=resolve(root,'.'+path);if(!file.startsWith(root+sep))throw Error();res.setHeader('Content-Type',({'.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.webp':'image/webp'})[extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404);res.end();}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-gl=angle','--use-angle=swiftshader']});await run(browser,'http://127.0.0.1:'+server.address().port+'/__portal__');}
 finally{await browser?.close();await new Promise(r=>server.close(r));}
}
async function open(page){return page.evaluate(async()=>{const {openQuiltPortal}=await import('/modules/portal/portal-entry.mjs');window.portal=await openQuiltPortal();return !!window.portal.current();});}
// Distinct-hue "buckets" of the lit (non-background, opaque-ish) pixels on the overlay canvas — a flat
// single-colour line collapses to ~1 bucket; the flowing multi-neon ribbon spans several.
async function litHueBuckets(page){
 return page.evaluate(()=>{
  const c=document.getElementById('portalOverlay'),ctx=c.getContext('2d');
  const d=ctx.getImageData(0,0,c.width,c.height).data,seen=new Set();
  for(let i=0;i<d.length;i+=4*4){
   const r=d[i],g=d[i+1],b=d[i+2],a=d[i+3];
   if(a<40||(r<40&&g<40&&b<40))continue;
   seen.add(`${r>>5},${g>>5},${b>>5}`);
  }
  return seen.size;
 });
}
async function anyLitPixel(page){
 return page.evaluate(()=>{
  const c=document.getElementById('portalOverlay'),ctx=c.getContext('2d');
  const d=ctx.getImageData(0,0,c.width,c.height).data;
  for(let i=0;i<d.length;i+=4)if(d[i+3]>40&&(d[i]>60||d[i+1]>60||d[i+2]>60))return true;
  return false;
 });
}
// Polls (rather than sampling once) so this can't race a starved renderer on a busy shared host — this
// box runs many concurrent worker lanes, and a Chromium tab can go a while between scheduled frames under
// contention; waiting for the first real paint is the fix, not a longer fixed sleep.
async function waitForLit(page,timeout=15000){
 await page.waitForFunction(()=>{
  const c=document.getElementById('portalOverlay'),ctx=c.getContext('2d');
  const d=ctx.getImageData(0,0,c.width,c.height).data;
  for(let i=0;i<d.length;i+=4)if(d[i+3]>40&&(d[i]>60||d[i+1]>60||d[i+2]>60))return true;
  return false;
 },{timeout});
}
// Kept deliberately sparse: `mouse.move(..., {steps:N})` costs real wall-clock time per step in this
// environment (each intermediate pointermove synchronously presses the cloth board) — 30 steps measured
// at ~8s total on this box, i.e. slower than TRAIL_FADE_MS itself, which silently ate the *start* of every
// drag before a screenshot ever saw it. A real finger swipe is fast; a handful of steps says so too.
async function dragRect(page,r,inset=.06){
 const x0=r.left+r.width*inset,y0=r.top+r.height*inset,x1=r.left+r.width*(1-inset),y1=r.top+r.height*(1-inset);
 await page.mouse.move(x0,y0);await page.mouse.down();
 await page.mouse.move(x1,y0,{steps:3});await page.mouse.move(x1,y1,{steps:3});
 await page.mouse.move(x0,y1,{steps:3});await page.mouse.move(x0,y0,{steps:3});
}

test('#105 trail: flowing neon ribbon mid-stroke, still fading just after release, gone ~0.8s later',async()=>withPortal(async(browser,url)=>{
 await mkdir(FRAMES_DIR,{recursive:true});
 const page=await browser.newPage({viewport:{width:375,height:812}});
 await page.goto(url);
 assert(await open(page),'real WebGL Quilt must load');
 await page.waitForFunction(()=>document.getElementById('portalHome')?.hidden===false);
 const r=await page.evaluate(()=>window.portal.current().patternRect());

 // Phase 1: mid-stroke — its own drag, released without any timing claim once we're done looking at it.
 // (The mid-stroke checks below can take an unpredictable amount of real time under host contention —
 // see phase 2's comment — so this drag must not be the one release-timing is measured against.)
 await page.mouse.move(r.left+r.width*.1,r.top+r.height*.1);await page.mouse.down();
 await page.mouse.move(r.left+r.width*.9,r.top+r.height*.9,{steps:3}); // see dragRect's comment on step count
 // Only fall back to polling if nothing painted yet — under normal load this is already lit (the drag's
 // own moves kept it rendering), and skipping the extra round trip keeps more of the ribbon's length
 // visible in the screenshot (its tail fades ~0.8s behind the fingertip, same as everywhere else).
 if(!(await anyLitPixel(page)))await waitForLit(page);
 await page.screenshot({path:resolve(FRAMES_DIR,'trail-mid-stroke-v2.png')});
 const midBuckets=await litHueBuckets(page);
 assert(midBuckets>3,`expected several distinct hues along the flowing ribbon, saw ${midBuckets}`);
 await page.mouse.up();

 // Phase 2: a fresh drag, released immediately with nothing slow in between — every point in this stroke
 // is fresh at the moment of release, so elapsed-since-release is a true measure of the fade's own age
 // (phase 1 interleaved slow checks *before* releasing, which aged its own points before the clock in
 // that check ever started — a test-timing bug, not an app bug, caught via a standalone debug harness).
 await page.mouse.move(r.left+r.width*.1,r.top+r.height*.1);await page.mouse.down();
 await page.mouse.move(r.left+r.width*.9,r.top+r.height*.9,{steps:3});
 await page.mouse.up();
 // Wait and check inside one evaluate() (a page-side setTimeout, not a separate Node-side waitForTimeout
 // plus a second round trip), and judge the result against the *page's own* clock, not an assumed 300ms:
 // this box runs many concurrent worker lanes and can stall the whole test process for a while, so the
 // only scheduling-proof way to assert "still fading" is to also measure how much time had really passed
 // by the time the check could run, and only require litness when that's comfortably inside the fade.
 const releasedAt=await page.evaluate(()=>performance.now());
 const{lit,elapsedMs}=await page.evaluate((releasedAt)=>new Promise(resolve=>setTimeout(()=>{
  const c=document.getElementById('portalOverlay'),ctx=c.getContext('2d');
  const d=ctx.getImageData(0,0,c.width,c.height).data;
  let lit=false;
  for(let i=0;i<d.length;i+=4)if(d[i+3]>40&&(d[i]>60||d[i+1]>60||d[i+2]>60)){lit=true;break;}
  resolve({lit,elapsedMs:performance.now()-releasedAt});
 },300)),releasedAt);
 await page.screenshot({path:resolve(FRAMES_DIR,'trail-release-v2.png')});
 if(elapsedMs<700)assert(lit,`the trail should still be fading ${elapsedMs.toFixed(0)}ms after release (light-painting), not vanish the instant the finger lifts`);
 else console.log(`skipped the "still fading" check: ${elapsedMs.toFixed(0)}ms had already passed before it could run (host contention)`);

 await page.waitForTimeout(700);
 assert.equal(await anyLitPixel(page),false,'the trail should be fully faded ~0.8s after release');
 await page.close();
}));

test('#105 reduced motion: a plain single-colour line, no sparkles/ribbon flow',async()=>withPortal(async(browser,url)=>{
 const page=await browser.newPage({viewport:{width:375,height:812}});
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto(url);
 assert(await open(page));
 await page.waitForFunction(()=>document.getElementById('portalHome')?.hidden===false);
 const r=await page.evaluate(()=>window.portal.current().patternRect());
 await page.mouse.move(r.left+r.width*.1,r.top+r.height*.1);await page.mouse.down();
 await page.mouse.move(r.left+r.width*.9,r.top+r.height*.9,{steps:3});
 const buckets=await litHueBuckets(page);
 assert(buckets<=2,`reduced motion should be a plain glowing line, saw ${buckets} distinct hues`);
 await page.mouse.up();
 await page.close();
}));

test('#105 a matched trace flashes the destination colour before the cut starts',async()=>withPortal(async(browser,url)=>{
 const page=await browser.newPage({viewport:{width:375,height:812}});
 await page.goto(url);
 assert(await open(page));
 await page.waitForFunction(()=>document.getElementById('portalHome')?.hidden===false);
 const r=await page.evaluate(()=>window.portal.current().patternRect());
 await dragRect(page,r);
 await page.mouse.up();
 // 450ms recognizer debounce, then the trail flash (outlineFlash) is live for ~350ms: sample mid-flash.
 await page.waitForTimeout(600);
 const orangeish=await page.evaluate(()=>{
  const c=document.getElementById('portalOverlay'),ctx=c.getContext('2d');
  const d=ctx.getImageData(0,0,c.width,c.height).data;
  for(let i=0;i<d.length;i+=4){
   const r=d[i],g=d[i+1],b=d[i+2],a=d[i+3];
   if(a>80&&r>170&&g>50&&g<160&&b<90)return true; // #ff5f1f-ish (Workout/rect neon)
  }
  return false;
 });
 assert(orangeish,'the traced trail should flash the Workout/rect neon (#ff5f1f) once the shape matches');
 await page.close();
}));

test('#105 holds a reasonable frame rate at 375x812 under 4x CPU throttle while dragging',async()=>withPortal(async(browser,url)=>{
 const page=await browser.newPage({viewport:{width:375,height:812}});
 await page.addInitScript(()=>{window.__frames=0;const tick=()=>{window.__frames++;requestAnimationFrame(tick);};requestAnimationFrame(tick);});
 await page.goto(url);
 assert(await open(page));
 await page.waitForFunction(()=>document.getElementById('portalHome')?.hidden===false);
 const r=await page.evaluate(()=>window.portal.current().patternRect());
 const client=await page.context().newCDPSession(page);
 await client.send('Emulation.setCPUThrottlingRate',{rate:4});
 await page.evaluate(()=>window.__frames=0);
 const t0=Date.now();
 await page.mouse.move(r.left+r.width*.1,r.top+r.height*.1);await page.mouse.down();
 for(let i=0;i<4;i++){
  await page.mouse.move(r.left+r.width*(i%2?.1:.9),r.top+r.height*.9,{steps:20});
  await page.mouse.move(r.left+r.width*(i%2?.1:.9),r.top+r.height*.1,{steps:20});
 }
 await page.mouse.up();
 const elapsed=Date.now()-t0,frames=await page.evaluate(()=>window.__frames);
 await client.send('Emulation.setCPUThrottlingRate',{rate:1});
 const fps=frames/(elapsed/1000);
 console.log(`#105 trail drag under 4x CPU throttle @375x812: ${fps.toFixed(1)} fps (${frames} frames / ${elapsed}ms)`);
 // Isolated runs on this box hold ~44fps under 4x throttle; the floor here is deliberately low so this
 // doesn't flake when the whole (~980-test, many-headless-browser) suite runs at once and starves the CPU —
 // the same class of contention that already makes unrelated suite tests flaky under a full run.
 assert(fps>10,`expected a usable frame rate under 4x throttle, measured ${fps.toFixed(1)}fps`);
 await page.close();
}));
