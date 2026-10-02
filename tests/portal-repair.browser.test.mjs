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
  if(process.env.PORTAL_BASELINE==='1'&&path==='/modules/portal/portal.mjs'){res.setHeader('Content-Type','text/javascript');res.end(await readFile('D:/myr5-work/release9/modules/portal/portal.mjs'));return;}
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

for(const width of [375,390])test(`ice double tap opens the carved triangle and expands its menu at ${width}px`,async()=>withPortal(async(browser,url)=>{
 const page=await browser.newPage({viewport:{width,height:812},hasTouch:true,reducedMotion:'reduce'});
 await page.goto(url);assert(await open(page));
 await page.evaluate(async()=>{await portal.board('ice');portal.show();});
 await page.waitForTimeout(350);
 await page.evaluate(()=>{window.repairEvents=[];let up=0;for(const type of ['pointerdown','pointerup','pointercancel'])document.addEventListener(type,e=>{if(type==='pointerup'&&++up===2){const end=performance.now()+400;while(performance.now()<end){}}repairEvents.push({type,id:e.target.id,x:e.clientX,y:e.clientY,t:performance.now(),eventTime:e.timeStamp});},true);});
 const r=await page.evaluate(()=>portal.current().patternRect()),x=r.left+r.width*.25,y=r.top+r.height*.355;
 assert.equal(await page.evaluate(([x,y])=>document.elementFromPoint(x,y)?.id,[x,y]),'portalOverlay','the carved outline receives touches');
 // Queue the two input pairs before delaying their handlers. Native tap calls wait
 // for GPU work on this fixture, which makes their input interval nondeterministic.
 await page.evaluate(([x,y])=>{
  const overlay=document.getElementById('portalOverlay'),capture=overlay.setPointerCapture;
  const t=performance.now(),queued=[];
  for(let pair=0;pair<2;pair++)for(const type of ['pointerdown','pointerup']){
   const e=new PointerEvent(type,{bubbles:true,pointerId:1,pointerType:'touch',isPrimary:true,clientX:x,clientY:y,button:0,buttons:type==='pointerdown'?1:0});
   Object.defineProperty(e,'timeStamp',{value:t+pair*120});queued.push(e);
  }
  overlay.setPointerCapture=()=>{};
  try{for(const e of queued)overlay.dispatchEvent(e);}finally{overlay.setPointerCapture=capture;}
 },[x,y]);
 const released=await page.evaluate(()=>repairEvents.filter(e=>e.type==='pointerup'));
 assert.equal(released.length,2);
 assert.ok(released[1].eventTime-released[0].eventTime<350,'input taps occur within the double-tap interval');
 assert.ok(released[1].t-released[0].t>350,'a render stall delays handlers beyond the interval');
 await page.waitForFunction(()=>document.querySelector('#mealsPanel.portal-shaped')?.open,null,{timeout:15000});
 await page.waitForFunction(()=>!document.querySelector('.portal-wormhole'),null,{timeout:15000});
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 assert.equal(await page.locator('#mealsPanel').evaluate(el=>el.classList.contains('portal-fullscreen')),false,'the menu starts within the triangle');
 const point=await page.locator('#mealsPanel').evaluate(el=>{const r=el.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2};});
 // Enqueue native browser touch input together: awaiting each tap lets this
 // software GPU stall delay the next input beyond the recognizer's window.
 const input=await page.context().newCDPSession(page),time=Date.now()/1000;
 await Promise.all([0,.12].flatMap((offset)=>[
  input.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:point.x,y:point.y,id:7}],timestamp:time+offset}),
  input.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[],timestamp:time+offset+.01})
 ]));
 await input.detach();
 const dialogUps=await page.evaluate(()=>repairEvents.filter(e=>e.type==='pointerup'&&e.id==='mealsPanel'));
 assert.equal(dialogUps.length,2,'native browser input delivers both dialog taps');
 assert.ok(dialogUps[1].eventTime-dialogUps[0].eventTime>=0&&dialogUps[1].eventTime-dialogUps[0].eventTime<350,'native dialog input stays within the double-tap interval');
 try{await page.waitForFunction(()=>document.querySelector('#mealsPanel.portal-fullscreen')?.open,null,{timeout:5000});}
 catch(error){console.log('dialog tap diagnostics',JSON.stringify(await page.evaluate(()=>({events:repairEvents,dialog:document.getElementById('mealsPanel').className}))));throw error;}
 const rect=await page.locator('#mealsPanel').boundingBox();assert.deepEqual(rect,{x:15,y:15,width:width-30,height:782});
 await mkdir(FRAMES_DIR,{recursive:true});await page.screenshot({path:resolve(FRAMES_DIR,`repair-ice-menu-fullscreen-${width}.png`)});
 await page.close();
}));

test('the recolorable ice poster loses baked hue, keeps detail, and accepts a new tint',async()=>withPortal(async(browser,url)=>{
 const page=await browser.newPage({viewport:{width:375,height:812}});await page.goto(url);
 const result=await page.evaluate(async()=>{
  const {createQuiltBoard2D}=await import('/modules/portal/portal-board.mjs');
  const host=document.createElement('div');host.style.cssText='position:fixed;inset:0';document.body.append(host);
  const b=await createQuiltBoard2D(host,{src:'/pod/worlds/boards/ice-poster.webp',ratio:.5903,tint:'#ffffff'});
  await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
  const sample=()=>{const c=b.canvas,d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let min=255,max=0,chroma=0,red=0,other=0,n=0;for(let i=0;i<d.length;i+=4){if(d[i+3]!==255)continue;min=Math.min(min,d[i]);max=Math.max(max,d[i]);chroma+=Math.max(d[i],d[i+1],d[i+2])-Math.min(d[i],d[i+1],d[i+2]);red+=d[i];other+=d[i+1]+d[i+2];n++;}return{min,max,chroma:chroma/n,red:red/n,other:other/n};};
  const white=sample();b.setTint('#ff0000');const red=sample();b.dispose();return{white,red};
 });
 assert.ok(result.white.chroma<2,'white tint removes the original colored diffuse texture');
 assert.ok(result.white.max-result.white.min>30,'light and dark texture detail survives neutralization');
 assert.ok(result.red.red>10&&result.red.other<2,'red tint changes the visible poster pixels');
 await page.close();
}));

test('recoloring preserves transparent and translucent poster pixels',async()=>withPortal(async(browser,url)=>{
 const page=await browser.newPage({viewport:{width:100,height:50}});await page.goto(url);
 const pixels=await page.evaluate(async()=>{
  const {createQuiltBoard2D}=await import('/modules/portal/portal-board.mjs');
  const image=document.createElement('canvas');image.width=2;image.height=1;const g=image.getContext('2d');g.fillStyle='rgba(255,0,0,.5)';g.fillRect(1,0,1,1);
  const host=document.createElement('div');host.style.cssText='position:fixed;inset:0';document.body.append(host);
  const b=await createQuiltBoard2D(host,{src:image.toDataURL(),ratio:2,tint:'#00ff00'});await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
  const d=b.canvas.getContext('2d').getImageData(0,0,100,50).data;const result=[Array.from(d.slice((25*100+10)*4,(25*100+10)*4+4)),Array.from(d.slice((25*100+90)*4,(25*100+90)*4+4))];b.dispose();return result;
 });
 assert.deepEqual(pixels.map(p=>p[3]),[0,128],'tint keeps the original alpha instead of making the whole face opaque');
 assert.ok(pixels[1][1]>40&&pixels[1][1]<70,'translucent source luminance stays54 instead of mixing with an opaque dye fill');await page.close();
}));

test('flat board switches restore each saved dye and color controls preserve Quilt artwork',async()=>withPortal(async(browser,url)=>{
 const page=await browser.newPage({viewport:{width:375,height:812}});
 await page.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,...args){return /webgl/i.test(kind)?null:get.call(this,kind,...args);};localStorage.setItem('myr5.grimoireColor.ice','#ff0000');localStorage.setItem('myr5.grimoireColor.grass','#00ff00');});
 await page.goto(url);assert(await open(page));
 const quilt=await page.evaluate(()=>{const before=portal.current().canvas.toDataURL(),input=document.querySelector('#portalMenu input[type=color]');input.value='#00ff00';input.dispatchEvent(new Event('input',{bubbles:true}));return{before,after:portal.current().canvas.toDataURL()};});
 assert.ok(quilt.before===quilt.after,'changing preferences never recolors the original Quilt image');
 const result={};for(const id of ['ice','grass']){await page.evaluate(async id=>{await portal.board(id);portal.show();},id);await page.waitForTimeout(100);result[id]=await page.evaluate(()=>{const b=portal.current(),c=b.canvas,r=b.faceRect(),d=c.getContext('2d').getImageData(Math.ceil(r.left),Math.ceil(r.top),Math.floor(r.width),Math.floor(r.height)).data;let red=0,green=0,blue=0,n=0;for(let i=0;i<d.length;i+=4){if(d[i+3]!==255)continue;red+=d[i];green+=d[i+1];blue+=d[i+2];n++;}return{red:red/n,green:green/n,blue:blue/n};});}
 assert.ok(result.ice.red>result.ice.green*2&&result.ice.red>result.ice.blue*2,'ice loads its saved red dye on flat fallback');
 assert.ok(result.grass.green>result.grass.red*2&&result.grass.green>result.grass.blue*2,'grass restores its own green dye after ice');await page.close();
}));

test('the real 3D ice board accepts red and blue tints while retaining its carved lighting',async()=>withPortal(async(browser,url)=>{
 const page=await browser.newPage({viewport:{width:375,height:812}});await page.goto(url);
 await page.evaluate(async()=>{
  const {createGlbBoard}=await import('/modules/portal/portal-board-glb.mjs');
  const {ice}=await import('/modules/portal/portal-board-ice.mjs');
  const host=document.createElement('div');host.style.cssText='position:fixed;inset:0';document.body.append(host);
  window.iceBoard=await createGlbBoard(host,{effect:{...ice,guide:null}});
 });
 async function pixels(hex){
  await page.evaluate(hex=>iceBoard.setTint(hex),hex);await page.waitForTimeout(150);
  const png=await page.locator('.portal-board-canvas').screenshot();
  return page.evaluate(async encoded=>{
   const image=new Image();image.src='data:image/png;base64,'+encoded;await image.decode();const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const g=c.getContext('2d');g.drawImage(image,0,0);
   const r=iceBoard.faceRect(),data=g.getImageData(Math.ceil(r.left+15),Math.ceil(r.top+15),Math.floor(r.width-30),Math.floor(r.height-30)).data;let red=0,green=0,blue=0,min=255,max=0,n=0;
   for(let i=0;i<data.length;i+=4){red+=data[i];green+=data[i+1];blue+=data[i+2];const value=Math.max(data[i],data[i+1],data[i+2]);min=Math.min(min,value);max=Math.max(max,value);n++;}return{red:red/n,green:green/n,blue:blue/n,min,max};
  },png.toString('base64'));
 }
 const white=await pixels('#ffffff'),red=await pixels('#ff0000'),blue=await pixels('#0000ff');
 console.log('3D tint pixels',JSON.stringify({white,red,blue}));
 assert.ok(Math.max(white.red,white.green,white.blue)/Math.min(white.red,white.green,white.blue)<1.4,'white dye removes the baked ice hue while retaining the warm scene lights');
 assert.ok(red.red>red.blue*1.4&&red.red>red.green*1.4,'red dye dominates the visible 3D surface');
 assert.ok(blue.blue>blue.red*1.4&&blue.blue>blue.green*1.4,'blue dye dominates the visible 3D surface');
 assert.ok(white.max-white.min>40&&red.max-red.min>40&&blue.max-blue.min>40,'carvings and highlights retain their intensity range');
 await mkdir(FRAMES_DIR,{recursive:true});await page.screenshot({path:resolve(FRAMES_DIR,'repair-ice-blue-3d.png')});
 await page.evaluate(()=>iceBoard.dispose());await page.close();
}));


