// #104 (W2-2E): shapes flash ambiently once the quilt has been idle. R7 (Ian 26 Sept): only the slow cycle, after 7s idle
// (2.5s per shape, 0.6s apart) until the next touch, no fast pass; reduced motion shows every outline+label at once
// instead. Frame captures land in .frames/ (untracked) per the brief's Verify section.
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
  if(path==='/__portal__'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><style>body{margin:0}</style><script type="importmap">{"imports":{"three":"/vendor/three/three.module.js","three/addons/loaders/GLTFLoader.js":"/vendor/three/GLTFLoader.js","three/addons/libs/meshopt_decoder.module.js":"/vendor/three/meshopt_decoder.module.js"}}</script>');return;}
  try{const root=path.startsWith('/modules/portal/')?source:built,file=resolve(root,'.'+path);if(!file.startsWith(root+sep))throw Error();res.setHeader('Content-Type',({'.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.webp':'image/webp'})[extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404);res.end();}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-gl=angle','--use-angle=swiftshader']});await run(browser,'http://127.0.0.1:'+server.address().port+'/__portal__');}
 finally{await browser?.close();await new Promise(r=>server.close(r));}
}
// W2-2B #22: a fresh page's localStorage has no "seen" flag, so the first-run hint would otherwise play
// (and suppress the idle cycle) before any of this file's own idle timing starts — mark it seen so idle's
// own 7s-armed cycle is what these tests measure.
async function open(page){return page.evaluate(async()=>{window.__openAt=performance.now();try{localStorage.setItem('myr5.portalHintShown','1');}catch{}const {openQuiltPortal}=await import('/modules/portal/portal-entry.mjs');window.portal=await openQuiltPortal();return !!window.portal.current();});}
// Labels are drawn via ctx.fillText once per idle-hint entry per frame; patched before any page script
// runs so every draw (cycling or static) is recorded with its timestamp.
async function recordLabels(page){
 await page.addInitScript(()=>{window.__strokes=0;{const stroke=CanvasRenderingContext2D.prototype.stroke;CanvasRenderingContext2D.prototype.stroke=function(...a){window.__strokes++;return stroke.apply(this,a);};}window.__labels=[];const orig=CanvasRenderingContext2D.prototype.fillText;CanvasRenderingContext2D.prototype.fillText=function(text,...rest){window.__labels.push(text);(window.__first??={})[text]??=performance.now();return orig.call(this,text,...rest);};});
}
// Waits until `targetMs` has elapsed since `armedAt` (a performance.now() sample taken right after the
// portal was shown), resampling the page's own clock each time so per-step overhead (screenshots,
// evaluate round-trips) never drifts the later checkpoints.
async function waitUntil(page,armedAt,targetMs){
 const now=await page.evaluate(()=>performance.now());
 const remaining=targetMs-(now-armedAt);
 if(remaining>0)await page.waitForTimeout(remaining);
}

test('#104 R7 idle ambient flash: nothing for 7s, then only the slow cycle in order, a gap between shapes, a touch stops it instantly',async()=>withPortal(async(browser,url)=>{
 await mkdir(FRAMES_DIR,{recursive:true});
 const page=await browser.newPage({viewport:{width:375,height:812}});
 await recordLabels(page);
 await page.goto(url);
 assert(await open(page),'real WebGL Quilt must load');
 await page.waitForFunction(()=>document.getElementById('portalHome')?.hidden===false);
 const armedAt=await page.evaluate(()=>performance.now());

 // Timed on the page's own clock: from when the portal was asked to open (it can only arm after that), and from the first
 // flash (the quilt shows before this round trip sees it, so armedAt runs late).
 await page.waitForFunction(()=>window.__first?.Workout,null,{timeout:12000});
 const first=await page.evaluate(()=>({openAt:window.__openAt,workout:window.__first.Workout}));
 assert.ok(first.workout-first.openAt>=7000,`nothing flashes before 7s of idle (first at ${Math.round(first.workout-first.openAt)} ms)`);
 assert.ok(first.workout-armedAt<=7300,`the cycle starts once 7s of idle are up (${Math.round(first.workout-armedAt)} ms after the quilt was seen)`);
 await page.screenshot({path:resolve(FRAMES_DIR,'idle-slow-pass.png')});
 const drawnBetween=(from,to)=>page.evaluate(async([from,to])=>{const t0=window.__first.Workout,at=t=>new Promise(r=>setTimeout(r,Math.max(0,t0+t-performance.now())));await at(from);const n=window.__labels.length;await at(to);return window.__labels.slice(n);},[from,to]);
 // No fast pass: 2.2s in it is still the first shape, rect -> "Workout" (the old fast pass was on its fifth by then).
 assert.deepEqual([...new Set(await drawnBetween(0,2200))],['Workout'],'still Workout at the slow pace');
 // #133: a short gap (IDLE.gapMs, 0.6s) of nothing between shapes (2.5s each), then the next shape in the order.
 assert.deepEqual(await drawnBetween(2500+120,2500+480),[],'a gap between shapes');
 const labels=await drawnBetween(2500+480,3100+300);
 assert(labels.includes('Choose Workout'),`the next shape follows the gap, got ${JSON.stringify(labels)}`);

 // Any touch stops it instantly: reset the counter right as the touch lands (a still-cycling frame or
 // two may legitimately land in the round-trip *before* pointerdown fires — that's not the thing under
 // test), then require silence from that point on.
 const box=await page.locator('#portalOverlay').boundingBox();
 await page.mouse.move(box.x+20,box.y+20);await page.mouse.down();
 await page.waitForTimeout(150); // let the frame already queued when the touch landed finish drawing
 await page.evaluate(()=>window.__labels.length=0);
 await page.mouse.up(); // a plain tap: a drawn stroke would legitimately show the 'almost' hint label for the shape it nearly matches
 await page.waitForTimeout(700);
 assert.equal(await page.evaluate(()=>window.__labels.length),0,'a touch must stop the idle cycle instantly');
 await page.close();
}));

test('#104 reduced motion shows every idle outline and label at once, no cycling, pauses when hidden',async()=>withPortal(async(browser,url)=>{
 const page=await browser.newPage({viewport:{width:375,height:812}});
 await page.emulateMedia({reducedMotion:'reduce'});
 await recordLabels(page);
 await page.goto(url);
 assert(await open(page));
 await page.waitForFunction(()=>document.getElementById('portalHome')?.hidden===false);
 await page.waitForTimeout(7300);
 await page.screenshot({path:resolve(FRAMES_DIR,'idle-reduced-motion.png')});
 const labels=await page.evaluate(()=>[...new Set(window.__labels)]);
 // 72c23d8 (25 Sept): the static frame shows every outline but no route titles (the titles only appear in the cycling hint).
 assert.deepEqual(labels,[],'no route titles in the reduced-motion static hint');
 assert.ok(await page.evaluate(()=>window.__strokes)>=9,'every idle outline is drawn at once in the static hint');

 // #104: pause the loop while the tab is hidden — no more idle draws until it's visible again.
 await page.evaluate(()=>window.__labels.length=0);
 await page.evaluate(()=>Object.defineProperty(document,'hidden',{configurable:true,get:()=>true}));
 await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
 await page.waitForTimeout(300);
 assert.equal(await page.evaluate(()=>window.__labels.length),0,'hidden tab must not keep drawing the idle hint');
 await page.close();
}));

test('W2-FIX risk 4: a dialog opened over the quilt without going through setVisible freezes the idle flash, and closing it re-arms the cycle',async()=>withPortal(async(browser,url)=>{
 const page=await browser.newPage({viewport:{width:375,height:812}});
 await recordLabels(page);
 await page.goto(url);
 assert(await open(page));
 await page.waitForFunction(()=>document.getElementById('portalHome')?.hidden===false);
 const armedAt=await page.evaluate(()=>performance.now());
 await waitUntil(page,armedAt,7000+300);
 assert((await page.evaluate(()=>window.__labels.length))>0,'idle cycle is running before the dialog opens');

 // Setup gate / reward-reveal style dialogs open directly (not through portal's own setVisible or
 // openMenu) and sit over the quilt without hiding it; idleEligible() is the only thing that notices.
 await page.evaluate(()=>{const d=document.createElement('dialog');d.id='__probe';document.body.append(d);d.showModal();});
 await page.evaluate(()=>window.__labels.length=0);
 await page.waitForTimeout(200);
 assert.equal(await page.evaluate(()=>window.__labels.length),0,'the idle flash must stop within a frame of a dialog opening over the quilt');

 // Nothing re-checks eligibility once the loop is idle; closing the dialog must re-arm the idle timer.
 await page.evaluate(()=>document.getElementById('__probe').close());
 const closedAt=await page.evaluate(()=>performance.now());
 await waitUntil(page,closedAt,7000+300);
 assert((await page.evaluate(()=>window.__labels.length))>0,'the idle cycle must re-arm once the dialog closes');
 await page.close();
}));

test('W2-FIX: dispose leaves no stray rAF drawing a frame after teardown',async()=>withPortal(async(browser,url)=>{
 const page=await browser.newPage({viewport:{width:375,height:812}});
 // drawFrame always clears the canvas first, whether or not it goes on to draw an idle hint, so this
 // catches the stray-rAF bug even where the idle-hint check (idleCycle already null by the time it
 // fires) would not: dispose() used to hide the portal *before* nulling idleCycle, so setVisible's own
 // trailing scheduleIdle() saw a still-live cycle and requested one more frame that dispose never cancels.
 await page.addInitScript(()=>{window.__clears=0;const orig=CanvasRenderingContext2D.prototype.clearRect;CanvasRenderingContext2D.prototype.clearRect=function(...a){window.__clears++;return orig.apply(this,a);};});
 await page.goto(url);
 assert(await open(page));
 await page.waitForFunction(()=>document.getElementById('portalHome')?.hidden===false);
 const armedAt=await page.evaluate(()=>performance.now());
 await waitUntil(page,armedAt,7000+300);
 // Capture the baseline in the SAME round trip as dispose(): the stray rAF (when the bug is present)
 // fires on the very next frame, which can land before a separate, later evaluate() reads the count —
 // making a post-dispose "before" snapshot already include the stray draw and hide the bug.
 const before=await page.evaluate(()=>{const n=window.__clears;window.portal.dispose();return n;});
 assert(before>0,'the render loop is running before dispose');
 await page.waitForTimeout(200);
 assert.equal(await page.evaluate(()=>window.__clears),before,'no frame should render again after dispose (no stray rAF)');
 await page.close();
}));
