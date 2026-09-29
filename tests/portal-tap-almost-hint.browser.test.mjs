// W2-2B (#20/#21/#22/#24/#29): double-tap to open, the "almost" near-miss flash, the first-run hint, the
// reduced-motion timing audit, and the recognised/almost vibrate buzz — all in modules/portal/portal.mjs
// (endPointer, wirePointerEvents, the recognition hand-off) plus portal-shapes.mjs's nearestShape. Frames
// land in .frames/ (untracked) per the brief's Verify section.
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
  if(path==='/__portal__'){
   res.setHeader('Content-Type','text/html');
   res.end('<!doctype html><style>body{margin:0}</style><button id="background">Coach</button>'+
    '<nav class="coach-dock"><button data-panel="meals" onclick="document.querySelector(\'#mealsPanel\').showModal()">Food</button></nav>'+
    '<dialog id="mealsPanel">Nutrition<button onclick="this.closest(\'dialog\').close()">Close</button></dialog>'+
    '<script type="importmap">{"imports":{"three":"/vendor/three/three.module.js","three/addons/loaders/GLTFLoader.js":"/vendor/three/GLTFLoader.js","three/addons/libs/meshopt_decoder.module.js":"/vendor/three/meshopt_decoder.module.js"}}</script>');
   return;
  }
  try{const root=path.startsWith('/modules/portal/')?source:built,file=resolve(root,'.'+path);if(!file.startsWith(root+sep))throw Error();res.setHeader('Content-Type',({'.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.webp':'image/webp'})[extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404);res.end();}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-gl=angle','--use-angle=swiftshader']});await run(browser,'http://127.0.0.1:'+server.address().port+'/__portal__');}
 finally{await browser?.close();await new Promise(r=>server.close(r));}
}
async function open(page){return page.evaluate(async()=>{const {openQuiltPortal}=await import('/modules/portal/portal-entry.mjs');window.portal=await openQuiltPortal();return !!window.portal.current();});}
async function recordLabels(page){
 await page.addInitScript(()=>{window.__labels=[];const orig=CanvasRenderingContext2D.prototype.fillText;CanvasRenderingContext2D.prototype.fillText=function(text,...rest){window.__labels.push(text);return orig.call(this,text,...rest);};});
}
async function recordVibrations(page){
 await page.addInitScript(()=>{window.__vibrations=[];Object.defineProperty(navigator,'vibrate',{configurable:true,value:p=>{window.__vibrations.push(p);return true;}});});
}
// Sparse steps: each synthetic pointermove presses the cloth board, which is slow here (see portal-trail).
async function dragRect(page,r,{inset=.06,sides=4}={}){
 const x0=r.left+r.width*inset,y0=r.top+r.height*inset,x1=r.left+r.width*(1-inset),y1=r.top+r.height*(1-inset);
 const corners=[[x0,y0],[x1,y0],[x1,y1],[x0,y1],[x0,y0]].slice(0,sides+1);
 await page.mouse.move(...corners[0]);await page.mouse.down();
 for(const [x,y] of corners.slice(1))await page.mouse.move(x,y,{steps:3});
}
async function doubleTapAt(page,x,y,gapMs=120){
 await page.mouse.move(x,y);await page.mouse.down();await page.mouse.up();
 await page.waitForTimeout(gapMs);
 await page.mouse.move(x,y);await page.mouse.down();await page.mouse.up();
}

test('#20 a double-tap on a shape\'s stitched outline opens it exactly like tracing; a single tap does not',async()=>withPortal(async(browser,url)=>{
 await mkdir(FRAMES_DIR,{recursive:true});
 const page=await browser.newPage({viewport:{width:375,height:812}});
 await recordVibrations(page);
 await page.goto(url);
 assert(await open(page),'real WebGL Quilt must load');
 await page.waitForFunction(()=>document.getElementById('portalHome')?.hidden===false);
 const rect=await page.evaluate(()=>window.portal.current().patternRect());
 // Midpoint of the "up" triangle's left edge ([[.5,0],[1,.71],[0,.71]] -> edge (0,.71)-(.5,0)): on the
 // outline, well clear (>20px) of every other tappable shape's outline at this viewport size.
 const x=rect.left+rect.width*.25,y=rect.top+rect.height*.355;

 await page.mouse.move(x,y);await page.mouse.down();await page.mouse.up();
 await page.waitForTimeout(300);
 assert.equal(await page.evaluate(()=>document.getElementById('mealsPanel').open),false,'a single tap must not open Food');
 assert.equal(await page.evaluate(()=>document.getElementById('portalHome').hidden),false,'a single tap must not leave the quilt');

 await doubleTapAt(page,x,y);
 await page.waitForTimeout(1600); // mid glass/dive: well after the cut, before loadMinMs+reveal finish
 await page.screenshot({path:resolve(FRAMES_DIR,'tap-double-food.png')});
 await page.waitForFunction(()=>document.getElementById('mealsPanel').open===true&&document.getElementById('mealsPanel').classList.contains('portal-shaped'),{timeout:15000}); // #131: seen through its cut
 assert.deepEqual(await page.evaluate(()=>window.__vibrations),[12],'a double-tap match buzzes once, like a traced match (#29)');
 await page.close();
}));

test('#20 taps far from any outline, and taps too slow/far apart to be a double-tap, never open anything',async()=>withPortal(async(browser,url)=>{
 const page=await browser.newPage({viewport:{width:375,height:812}});
 await page.goto(url);
 assert(await open(page));
 await page.waitForFunction(()=>document.getElementById('portalHome')?.hidden===false);
 const rect=await page.evaluate(()=>window.portal.current().patternRect());
 const cx=rect.left+rect.width*.5,cy=rect.top+rect.height*.5; // dead centre: clear of every stitched outline

 await doubleTapAt(page,cx,cy); // double-tap, but nowhere near an outline
 await page.waitForTimeout(300);
 assert.equal(await page.evaluate(()=>document.getElementById('portalHome').hidden),false,'a double-tap far from any outline must not open anything');

 const x=rect.left+rect.width*.25,y=rect.top+rect.height*.355; // on the "up" outline, but too slow to pair
 await doubleTapAt(page,x,y,500);
 await page.waitForTimeout(300);
 assert.equal(await page.evaluate(()=>document.getElementById('portalHome').hidden),false,'two taps 500ms apart (over TAP_MS) must not count as a double-tap');
 await page.close();
}));

test('#21 a near-miss trace flashes "Almost: <Destination>" faintly, buzzes a double pulse, and never opens it',async()=>withPortal(async(browser,url)=>{
 await mkdir(FRAMES_DIR,{recursive:true});
 const page=await browser.newPage({viewport:{width:375,height:812}});
 await recordLabels(page);await recordVibrations(page);
 await page.goto(url);
 assert(await open(page),'real WebGL Quilt must load');
 await page.waitForFunction(()=>document.getElementById('portalHome')?.hidden===false);
 const r=await page.evaluate(()=>window.portal.current().patternRect());
 // 2.5 of the rect's 4 sides (top, right, halfway along the bottom), never closed: a real trace of the
 // right shape that recognizeShape must reject but nearestShape scores well above ALMOST_COVER (calibrated
 // in portal-shapes.test.mjs against the same fixture shape).
 const inset=.06,x0=r.left+r.width*inset,y0=r.top+r.height*inset,x1=r.left+r.width*(1-inset),y1=r.top+r.height*(1-inset),xm=(x0+x1)/2;
 await page.mouse.move(x0,y0);await page.mouse.down();
 await page.mouse.move(x1,y0,{steps:3});await page.mouse.move(x1,y1,{steps:3});await page.mouse.move(xm,y1,{steps:3});
 await page.mouse.up();
 await page.waitForTimeout(600); // 450ms recognizer debounce, then the almost flash starts
 await page.screenshot({path:resolve(FRAMES_DIR,'almost-flash.png')});
 const labels=await page.evaluate(()=>window.__labels.slice());
 assert(labels.includes('Almost: Workout'),`expected the "Almost: Workout" label, got ${JSON.stringify(labels)}`);
 assert.deepEqual(await page.evaluate(()=>window.__vibrations),[[12,40,12]],'an almost near-miss buzzes a double pulse (#29)');
 // Don't open it: the quilt stays up, nothing cut or glassed.
 assert.equal(await page.evaluate(()=>document.getElementById('portalHome').hidden),false);
 assert.equal(await page.evaluate(()=>document.querySelector('.portal-glass')),null);
 // The flash fades out on its own by ALMOST_MS (1200ms after the debounce fired, i.e. ~1650ms after
 // mouse-up — 600ms already elapsed above, so wait past the remainder with a safety margin).
 await page.waitForTimeout(1300);
 const stillFlashing=await page.evaluate(()=>{const c=document.getElementById('portalOverlay'),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;for(let i=0;i<d.length;i+=4)if(d[i+3]>40)return true;return false;});
 assert.equal(stillFlashing,false,'the almost flash must not linger past its ~1.2s duration');
 await page.close();
}));

test('#22 first-run hint: animates once labelled, a touch stops it instantly, and it never plays again',async()=>withPortal(async(browser,url)=>{
 await mkdir(FRAMES_DIR,{recursive:true});
 const page=await browser.newPage({viewport:{width:375,height:812}});
 await recordLabels(page);
 await page.goto(url);
 assert(await open(page),'real WebGL Quilt must load');
 await page.waitForFunction(()=>document.getElementById('portalHome')?.hidden===false);

 await page.waitForTimeout(700); // mid first lap
 await page.screenshot({path:resolve(FRAMES_DIR,'first-run-hint.png')});
 let labels=await page.evaluate(()=>window.__labels.slice());
 assert(labels.includes('Trace to start your workout'),`expected the hint label, got ${JSON.stringify(labels)}`);
 // Coordinate with idle flashing: nothing from the idle cycle's own labels this early (armMs is 7000ms,
 // longer than the hint's own lap, but this also guards the "suppress idle while the hint plays" contract).
 assert(!labels.includes('Workout')&&!labels.includes('Choose Workout'),'idle flashing must stay suppressed while the hint plays');

 const box=await page.locator('#portalOverlay').boundingBox();
 await page.mouse.move(box.x+box.width*.5,box.y+box.height*.3);await page.mouse.down();
 await page.evaluate(()=>window.__labels.length=0);
 await page.mouse.move(box.x+box.width*.5+2,box.y+box.height*.3+2);await page.mouse.up();
 await page.waitForTimeout(400);
 assert.equal((await page.evaluate(()=>window.__labels)).includes('Trace to start your workout'),false,'a touch must stop the hint instantly');
 assert.equal(await page.evaluate(()=>localStorage.getItem('myr5.portalHintShown')),'1','a real tap/trace must mark the hint seen for good');

 // Idle flashing (a different lane's feature) re-arms on its own once the hint is over, proving the two
 // were only coordinated, not permanently entangled.
 await page.evaluate(()=>window.__labels.length=0);
 await page.waitForTimeout(7300);
 labels=await page.evaluate(()=>window.__labels.slice());
 assert(labels.includes('Workout'),'idle flashing must resume once the hint is done');
 await page.close();
}));

test('#22 the hint never shows once localStorage already marks it seen',async()=>withPortal(async(browser,url)=>{
 const page=await browser.newPage({viewport:{width:375,height:812}});
 await page.addInitScript(k=>localStorage.setItem(k,'1'),'myr5.portalHintShown');
 await recordLabels(page);
 await page.goto(url);
 assert(await open(page));
 await page.waitForFunction(()=>document.getElementById('portalHome')?.hidden===false);
 await page.waitForTimeout(1200); // past the window it would normally play in
 assert.equal((await page.evaluate(()=>window.__labels)).includes('Trace to start your workout'),false,'the hint must not replay once seen');
 await page.close();
}));

test('#24 reduced motion drops the wait: the glass phase (loadMinMs) and the fall-in resolve fast, not after PORTAL.loadMinMs',async()=>withPortal(async(browser,url)=>{
 const page=await browser.newPage({viewport:{width:375,height:812}});
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto(url);
 assert(await open(page));
 await page.waitForFunction(()=>document.getElementById('portalHome')?.hidden===false);

 // 'up' (Food, kind:'dialog') runs the default branch's full cut/glass/loadMinMs/dive/open sequence. If
 // loadMinMs (3500ms) were not skipped under reduced motion, this would take at least that long.
 const upMs=await page.evaluate(async()=>{const t0=performance.now();await window.portal.open('up');return performance.now()-t0;});
 assert(upMs<1500,`loadMinMs must be skipped under reduced motion: Food took ${upMs}ms (loadMinMs is 3500ms)`);
 assert.equal(await page.evaluate(()=>document.getElementById('mealsPanel').open),true);

 await page.locator('#mealsPanel button',{hasText:'Close'}).click();
 await page.waitForFunction(()=>document.getElementById('portalHome')?.hidden===false&&!document.getElementById('portalChrome').matches(':popover-open'));
 // 'cross' runs fallInAll, whose real (non-reduced) wait alone is 600ms.
 const crossMs=await page.evaluate(async()=>{const t0=performance.now();await window.portal.open('cross');return performance.now()-t0;});
 assert(crossMs<600,`the fall-in must be skipped under reduced motion: cross took ${crossMs}ms`);
 assert.equal(await page.evaluate(()=>document.getElementById('portalMenu').open),true);
 await page.close();
}));

test('#29 a matched trace buzzes once; reduced motion never vibrates, even on a match',async()=>withPortal(async(browser,url)=>{
 for(const reduced of [false,true]){
  const page=await browser.newPage({viewport:{width:375,height:812}});
  if(reduced)await page.emulateMedia({reducedMotion:'reduce'});
  await recordVibrations(page);
  await page.goto(url);
  assert(await open(page));
  await page.waitForFunction(()=>document.getElementById('portalHome')?.hidden===false);
  const r=await page.evaluate(()=>window.portal.current().patternRect());
  await dragRect(page,r);await page.mouse.up();
  await page.waitForTimeout(600); // 450ms debounce + margin
  const vibrations=await page.evaluate(()=>window.__vibrations);
  if(reduced)assert.deepEqual(vibrations,[],'reduced motion must never vibrate');
  else assert.deepEqual(vibrations,[12],'a matched trace buzzes once');
  await page.close();
 }
}));

// Ian 2026-09-23: "the magical finger is only for the quilt" — other boards (ice, grass, cogs, jelly, wood)
// bring their own touch effects. Only the quilt ships today, so this drives a test-only stub board
// (window.__portalTestStubBoard, ?board=__stub__ — never in PRODUCTION_PORTALS) to prove the trail and the
// first-run hint both stay off a non-quilt board, ahead of a second board actually shipping.
test('the magical finger trail and the first-run hint are quilt-only: a non-quilt board draws neither',async()=>withPortal(async(browser,url)=>{
 const page=await browser.newPage({viewport:{width:375,height:812}});
 await page.addInitScript(()=>{window.__portalTestStubBoard=true;window.__portalTrailProbe=true;});
 await recordLabels(page);
 await page.goto(url+'?board=__stub__');
 assert(await open(page));
 await page.waitForFunction(()=>document.getElementById('portalHome')?.hidden===false);
 // Confirms the stub really mounted: the real quilt always appends its own WebGL canvas, the stub never does.
 assert.equal(await page.locator('#portalBoardHost canvas').count(),0,'expected the stub board, not the quilt');

 // #22: the first-run hint never arms on a non-quilt board (fresh localStorage would otherwise show it).
 await page.waitForTimeout(800);
 assert.equal((await page.evaluate(()=>window.__labels)).includes('Trace to start your workout'),false,'the hint must not play on a non-quilt board');

 // #105/#29-adjacent: the trail never draws on a non-quilt board either, even when fed straight to the
 // renderer via the test-only probe (bypasses the cloth board, same technique as portal-trail tests).
 const lit=await page.evaluate(()=>{
  window.portal.trailProbe.draw([[100,400],[150,420],[200,440],[250,460]]);
  const c=document.getElementById('portalOverlay'),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
  for(let i=0;i<d.length;i+=4)if(d[i+3]>10)return true;
  return false;
 });
 assert.equal(lit,false,'the magical finger trail must not draw on a non-quilt board');
 await page.close();
}));
