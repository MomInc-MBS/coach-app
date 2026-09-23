// #104 (W2-2E): shapes flash ambiently after 3s idle — fast pass (0.5s/shape, in order), then a
// gentler slow pass (2.5s/shape) until the next touch; reduced motion shows every outline+label at
// once instead. Frame captures land in .frames/ (untracked) per the brief's Verify section.
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
// Labels are drawn via ctx.fillText once per idle-hint entry per frame; patched before any page script
// runs so every draw (cycling or static) is recorded with its timestamp.
async function recordLabels(page){
 await page.addInitScript(()=>{window.__labels=[];const orig=CanvasRenderingContext2D.prototype.fillText;CanvasRenderingContext2D.prototype.fillText=function(text,...rest){window.__labels.push(text);return orig.call(this,text,...rest);};});
}
// Waits until `targetMs` has elapsed since `armedAt` (a performance.now() sample taken right after the
// portal was shown), resampling the page's own clock each time so per-step overhead (screenshots,
// evaluate round-trips) never drifts the later checkpoints.
async function waitUntil(page,armedAt,targetMs){
 const now=await page.evaluate(()=>performance.now());
 const remaining=targetMs-(now-armedAt);
 if(remaining>0)await page.waitForTimeout(remaining);
}

test('#104 idle ambient flash: fast pass order/timing, slow pass continues, a touch stops it instantly',async()=>withPortal(async(browser,url)=>{
 await mkdir(FRAMES_DIR,{recursive:true});
 const page=await browser.newPage({viewport:{width:375,height:812}});
 await recordLabels(page);
 await page.goto(url);
 assert(await open(page),'real WebGL Quilt must load');
 await page.waitForFunction(()=>document.getElementById('portalHome')?.hidden===false);
 const armedAt=await page.evaluate(()=>performance.now());

 // 0.2s into the fast pass: shape index 0 (rect -> "Workout").
 await waitUntil(page,armedAt,3000+200);
 await page.screenshot({path:resolve(FRAMES_DIR,'idle-fast-0.2s.png')});
 let labels=await page.evaluate(()=>window.__labels.slice());
 assert(labels.includes('Workout'),`expected Workout by 0.2s into the fast pass, got ${JSON.stringify(labels)}`);

 // 1.7s into the fast pass: shape index 3 (down -> "Achievements") — proves the order, not just shape 0.
 await waitUntil(page,armedAt,3000+1700);
 await page.screenshot({path:resolve(FRAMES_DIR,'idle-fast-1.7s.png')});
 labels=await page.evaluate(()=>window.__labels.slice());
 assert(labels.includes('Achievements'),`expected Achievements by 1.7s into the fast pass, got ${JSON.stringify(labels)}`);

 // Past the full fast pass (11 * 0.5s = 5.5s): the slow pass restarts the same order at a gentler pace.
 await page.evaluate(()=>window.__labels.length=0);
 await waitUntil(page,armedAt,3000+5500+500);
 await page.screenshot({path:resolve(FRAMES_DIR,'idle-slow-pass.png')});
 labels=await page.evaluate(()=>window.__labels.slice());
 assert(labels.includes('Workout'),`slow pass should restart at the same order (rect first), got ${JSON.stringify(labels)}`);
 const before=await page.evaluate(()=>window.__labels.length);
 await page.waitForTimeout(400);
 const after=await page.evaluate(()=>window.__labels.length);
 assert(after>before,'the slow pass keeps drawing (still cycling, not stuck)');

 // Any touch stops it instantly: reset the counter right as the touch lands (a still-cycling frame or
 // two may legitimately land in the round-trip *before* pointerdown fires — that's not the thing under
 // test), then require silence from that point on.
 const box=await page.locator('#portalOverlay').boundingBox();
 await page.mouse.move(box.x+20,box.y+20);await page.mouse.down();
 await page.evaluate(()=>window.__labels.length=0);
 await page.mouse.move(box.x+40,box.y+40);await page.mouse.up();
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
 await page.waitForTimeout(3300);
 await page.screenshot({path:resolve(FRAMES_DIR,'idle-reduced-motion.png')});
 const labels=await page.evaluate(()=>[...new Set(window.__labels)]);
 for(const expected of ['Workout','Choose Workout','Food','Achievements','Leaderboard','Character Editor','Meditation','Reminders','Settings','Menu'])
  assert(labels.includes(expected),`missing "${expected}" in the reduced-motion static hint: ${JSON.stringify(labels)}`);

 // #104: pause the loop while the tab is hidden — no more idle draws until it's visible again.
 await page.evaluate(()=>window.__labels.length=0);
 await page.evaluate(()=>Object.defineProperty(document,'hidden',{configurable:true,get:()=>true}));
 await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
 await page.waitForTimeout(300);
 assert.equal(await page.evaluate(()=>window.__labels.length),0,'hidden tab must not keep drawing the idle hint');
 await page.close();
}));
