// #111 (W2-2K): the MOM Inc metal frame around the board. The board fills the rail at the physical perimeter at
// 375x812; overlay controls remain above it. The frame wraps the face exactly, never
// takes a pointer, and a square traced along its inner edge (starting on the frame) still opens the rect portal
// with the glass bezel on the stitched outline. Frames land in .frames/ (untracked) per the brief's Verify section.
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
async function openPage(browser,url,dpr=1){
 const page=await browser.newPage({viewport:{width:375,height:812},deviceScaleFactor:dpr});
 await page.goto(url);
 assert(await page.evaluate(async()=>{const {openQuiltPortal}=await import('/modules/portal/portal-entry.mjs');window.portal=await openQuiltPortal();return !!window.portal.current();}),'real WebGL Quilt must load');
 await page.waitForFunction(()=>document.getElementById('portalHome')?.hidden===false);
 await page.waitForTimeout(300); // the board lays out on its ResizeObserver once shown
 return page;
}
const boxOf=r=>({left:r.left,top:r.top,right:r.left+r.width,bottom:r.top+r.height});
async function geometry(page){
 return page.evaluate(()=>{
  const b=portal.current(),r=el=>{const q=el.getBoundingClientRect();return{left:q.left,top:q.top,width:q.width,height:q.height};};
  const frame=document.querySelector('#portalBoardHost .portal-frame'),rail=parseFloat(getComputedStyle(frame).getPropertyValue('--portal-rail'));
  return{face:b.faceRect(),pattern:b.patternRect(),frame:r(frame),rail,plate:r(frame.querySelector('b')),menu:r(document.getElementById('portalMenuButton')),pod:r(document.getElementById('portalExitButton')),bolts:[...frame.querySelectorAll('i')].map(r)};
 });
}

test('#111 the frame wraps a full-screen board rail at 375x812 and never takes a pointer',async()=>withPortal(async(browser,url)=>{
 await mkdir(FRAMES_DIR,{recursive:true});
 const page=await openPage(browser,url);
 const g=await geometry(page),face=boxOf(g.face),frame=boxOf(g.frame),outer={left:frame.left-g.rail,top:frame.top-g.rail,right:frame.right+g.rail,bottom:frame.bottom+g.rail};
 assert(Math.abs(face.left-g.rail)<.6&&Math.abs(face.top-g.rail)<.6&&Math.abs(face.right-(375-g.rail))<.6&&Math.abs(face.bottom-(812-g.rail))<.6,`board face fills the rail interior: ${JSON.stringify(face)}`);
 for(const k of ['left','top','right','bottom'])assert(Math.abs(frame[k]-face[k])<.6,`the frame wraps the face exactly (${k}: ${frame[k]} vs ${face[k]})`);
 assert(g.rail>=12,'the rail takes the margin');
 assert(Math.abs(outer.left)<.6&&Math.abs(outer.top)<.6&&Math.abs(outer.right-375)<.6&&Math.abs(outer.bottom-812)<.6,`the rail reaches the physical perimeter: ${JSON.stringify(outer)}`);
 const pattern=boxOf(g.pattern);
 assert(pattern.left>=face.left&&pattern.top>=face.top&&pattern.right<=face.right&&pattern.bottom<=face.bottom,'the stitched pattern stays inside the face');
 assert.equal(g.bolts.length,8,'four corner bolts and two along each long edge');
 for(const bolt of g.bolts){const cx=bolt.left+bolt.width/2,cy=bolt.top+bolt.height/2;assert(cx<face.left||cx>face.right||cy<face.top||cy>face.bottom,'bolts sit on the rail, not the board');}
 assert(g.plate.top+g.plate.height/2<face.top&&Math.abs(g.plate.left+g.plate.width/2-187.5)<1,'nameplate top centre, on the rail');
 // Nothing on the frame catches a pointer: the full-screen trace canvas is on top everywhere, rail included.
 const hits=await page.evaluate(({face,rail})=>[[face.left-rail/2,face.top+100],[face.left+face.width+rail/2,face.top+face.height/2],[187.5,face.top-rail/2],[face.left-rail/2,face.top-rail/2]].map(([x,y])=>document.elementFromPoint(x,y)?.id),{face:g.face,rail:g.rail});
 assert.deepEqual(hits,['portalOverlay','portalOverlay','portalOverlay','portalOverlay']);
 // A full square along the board's inner edge (the frame's lip) still reads as the rect shape.
 const id=await page.evaluate(async({face,pattern})=>{
  const {recognizeShape}=await import('/modules/portal/portal-shapes.mjs'),n=([x,y])=>[(x-pattern.left)/pattern.width,(y-pattern.top)/pattern.height];
  const l=face.left+2,t=face.top+2,r=face.left+face.width-2,b=face.top+face.height-2,pts=[];
  for(const [[x0,y0],[x1,y1]] of [[[l,t],[r,t]],[[r,t],[r,b]],[[r,b],[l,b]],[[l,b],[l,t]]])for(let k=0;k<20;k++)pts.push(n([x0+(x1-x0)*k/20,y0+(y1-y0)*k/20]));
  pts.push(n([l,t]));return recognizeShape([pts]);
 },{face:g.face,pattern:g.pattern});
 assert.equal(id,'rect');
 await page.screenshot({path:resolve(FRAMES_DIR,'frame-quilt.png')});
 await page.close();
 // Close-ups at 3x: a corner bolt and the nameplate.
 const zoom=await openPage(browser,url,3),z=await geometry(zoom);
 await zoom.screenshot({path:resolve(FRAMES_DIR,'frame-bolt-zoom.png'),clip:{x:0,y:z.face.top-z.rail-8,width:64,height:64}});
 await zoom.screenshot({path:resolve(FRAMES_DIR,'frame-nameplate-zoom.png'),clip:{x:z.plate.left-24,y:z.plate.top-10,width:z.plate.width+48,height:z.plate.height+40}});
 await zoom.close();
}));

test('#111 a square traced from the frame onto the board opens the rect portal, bezel on the stitched outline, frame diving with it',async()=>withPortal(async(browser,url)=>{
 await mkdir(FRAMES_DIR,{recursive:true});
 const page=await openPage(browser,url,2),g=await geometry(page),f=g.face;
 const l=f.left+3,t=f.top+3,r=f.left+f.width-3,b=f.top+f.height-3;
 // Dive start gets frozen a third of the way in: headless WebGL frames are slow enough that a plain screenshot lands after
 // the reveal hole has opened. Frame capture only: from the dive on, the page's timers are dropped (it closes after).
 await page.evaluate(()=>{
  const animate=Element.prototype.animate,setTimer=window.setTimeout;
  window.setTimeout=(fn,ms,...rest)=>window.__diving?0:setTimer(fn,ms,...rest);
  Element.prototype.animate=function(frames,timing){const a=animate.call(this,frames,timing);if(this.id==='portalHome'){a.pause();a.currentTime=timing.duration/3;window.__diving=true;}return a;};
 });
 await page.mouse.move(f.left-g.rail/2,t+40);await page.mouse.down(); // starts on the frame's rail
 await page.mouse.move(l,t,{steps:3});await page.mouse.move(r,t,{steps:6});await page.mouse.move(r,b,{steps:10});await page.mouse.move(l,b,{steps:6});await page.mouse.move(l,t,{steps:10});
 await page.mouse.up();
 await page.waitForSelector('#portalHome .portal-glass',{timeout:10000});
 // The bezel is drawn on the exact rect outline: the pattern rect, which is where the stitches are.
 const bezel=await page.evaluate(()=>{const pts=document.querySelector('.portal-bezel polygon').getAttribute('points').split(' ').map(p=>p.split(',').map(Number)),xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]);return{left:Math.min(...xs),top:Math.min(...ys),right:Math.max(...xs),bottom:Math.max(...ys)};});
 const p=boxOf(g.pattern);for(const k of ['left','top','right','bottom'])assert(Math.abs(bezel[k]-p[k])<.6,`bezel ${k} ${bezel[k]} on the stitched outline ${p[k]}`);
 await page.waitForTimeout(2000);
 await page.screenshot({path:resolve(FRAMES_DIR,'frame-square-glass.png')});
 await page.screenshot({path:resolve(FRAMES_DIR,'frame-square-glass-corner-zoom.png'),clip:{x:0,y:f.top-g.rail-6,width:90,height:90}});
 await page.waitForFunction(()=>window.__diving,null,{timeout:15000});
 const scale=await page.evaluate(()=>new DOMMatrix(getComputedStyle(document.getElementById('portalHome')).transform).a);
 await page.screenshot({path:resolve(FRAMES_DIR,'frame-dive-start.png')});
 // The frame lives inside #portalHome, so the dive's scale carries it along with the board.
 assert(scale>1,`the dive scales the portal (${scale})`);
 assert(await page.evaluate(()=>document.getElementById('portalHome').contains(document.querySelector('.portal-frame'))));
 await page.close();
}));
