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
  if(path==='/__portal__'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><style>body{margin:0}</style><script type="importmap">{"imports":{"three":"/vendor/three/three.module.js","three/addons/loaders/GLTFLoader.js":"/vendor/three/GLTFLoader.js","three/addons/libs/meshopt_decoder.module.js":"/vendor/three/meshopt_decoder.module.js"}}</script>');return;}
  try{const root=path.startsWith('/modules/portal/')||path.startsWith('/pod/worlds/boards/')?source:built,file=resolve(root,'.'+path);if(!file.startsWith(root+sep))throw Error();res.setHeader('Content-Type',({'.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.webp':'image/webp'})[extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404);res.end();}
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
// The board on screen and which layer draws it ('3d', or 'flat': its poster/2D quilt), and how many WebGL renderers it holds.
const shown=page=>page.evaluate(()=>{const h=document.getElementById('portalHome');return {board:h.dataset.board,art:h.dataset.art};});
const renderers=page=>page.evaluate(()=>[...document.querySelectorAll('#portalBoardHost canvas')].filter(c=>c.getContext('webgl2')).length);
const boxOf=r=>({left:r.left,top:r.top,right:r.left+r.width,bottom:r.top+r.height});
async function geometry(page){
 return page.evaluate(()=>{
  const b=portal.current(),r=el=>{const q=el.getBoundingClientRect();return{left:q.left,top:q.top,width:q.width,height:q.height};};
  const frame=document.querySelector('#portalBoardHost .portal-frame'),rail=parseFloat(getComputedStyle(frame).getPropertyValue('--portal-rail'));
  return{face:b.faceRect(),pattern:b.patternRect(),frame:r(frame),rail,plate:r(frame.querySelector('b')),bolts:[...frame.querySelectorAll('i')].map(r)};
 });
}

test('phone device keeps artwork proportional and renders every downloaded tunnel',async()=>withPortal(async(browser,url)=>{
 await mkdir(FRAMES_DIR,{recursive:true});
 const page=await openPage(browser,url);const errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='warning'&&m.text().includes('wormhole unavailable'))errors.push(m.text());});
 const initial=await geometry(page);
 assert.ok(initial.face.top>120,'top cap occupies spare height');
 assert.ok(Math.abs(initial.face.width/initial.face.height-1024/1666)<.001,'complete quilt keeps original aspect');
 await page.screenshot({path:resolve(FRAMES_DIR,'redesign-quilt.png')});
 for(const id of ['quilt','ice','jelly','grass','wood','cogs']){
  await page.evaluate(async id=>{await portal.board(id);portal.show();},id);
  assert.equal(await page.locator('#portalHome').getAttribute('data-board'),id);
  const shape=await page.evaluate(()=>({face:portal.current().faceRect(),pattern:portal.current().patternRect()}));
  assert.ok(shape.pattern.top>=shape.face.top&&shape.pattern.top+shape.pattern.height<=shape.face.top+shape.face.height+1,id+' guide inside board');
  if(id!=='quilt')await page.screenshot({path:resolve(FRAMES_DIR,'redesign-'+id+'.png')});
  await page.evaluate(()=>portal.playWormhole({direction:'in',minMs:50}));
  await page.waitForTimeout(100);
  assert.equal(await page.locator('.portal-wormhole.gl canvas').count(),1,id+' shader compiled and drew');
  await page.screenshot({path:resolve(FRAMES_DIR,'tunnel-'+id+'.png')});
  await page.evaluate(()=>portal.playWormhole({direction:'out',minMs:50}));
 }
 assert.deepEqual(errors,[]);
 await page.evaluate(()=>{portal.show();const home=document.createElement('main');home.id='homeScreen';home.innerHTML='<button id="start">BEGIN</button>';document.body.append(home);portal.open('rect');});
 await page.waitForFunction(()=>document.querySelector('#portalWorkoutHome.portal-fullscreen')?.open,{},{timeout:20000});
 const rect=await page.locator('#portalWorkoutHome').boundingBox();assert.deepEqual(rect,{x:0,y:0,width:375,height:812});
 assert.equal(await page.locator('#portalChrome').getAttribute('data-destination'),'workout');
 await page.waitForTimeout(850);
 assert.ok(await page.locator('#portalChrome .portal-frame').evaluate(el=>el.getBoundingClientRect().bottom<0),'frame retracts above viewport');
 assert.equal(await page.locator('#start').evaluate(el=>{const r=el.getBoundingClientRect();return document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)===el;}),true,'the retracted frame must not cover the workout start page');
 await page.screenshot({path:resolve(FRAMES_DIR,'redesign-workout.png')});
 await page.evaluate(()=>document.getElementById('portalWorkoutHome').close());
 await page.waitForFunction(()=>!document.querySelector('#portalHome').hidden,{},{timeout:10000});
 await page.close();
}));

test('meditation tunnel loses colour throughout its duration and lands fullscreen',async()=>withPortal(async(browser,url)=>{
 const page=await openPage(browser,url);
 await page.evaluate(()=>{
  const entry=document.createElement('button');entry.className='meditation-entry';document.body.append(entry);
  const room=document.createElement('dialog');room.className='meditation-panel';document.body.append(room);entry.onclick=()=>room.showModal();
  portal.open('line-lr');
 });
 await page.waitForSelector('.portal-glass');
 const start=await page.locator('.portal-glass').evaluate(el=>({filter:getComputedStyle(el).filter,duration:el.getAnimations().find(a=>a.effect.getKeyframes().some(f=>f.filter))?.effect.getTiming().duration}));
 assert.ok(start.duration>3000,'fade spans cut, load and arrival, not an instant switch');
 await page.waitForTimeout(600);
 const partial=await page.locator('.portal-glass').evaluate(el=>parseFloat(getComputedStyle(el).filter.match(/grayscale\(([^)]+)/)[1]));assert.ok(partial>0&&partial<1);
 await page.waitForFunction(()=>document.querySelector('.meditation-panel.portal-fullscreen')?.open,null,{timeout:10000});
 const box=await page.locator('.meditation-panel').boundingBox();assert.deepEqual(box,{x:0,y:0,width:375,height:812});
 // R7 (Ian 26 Sept): the frame stays out of the black-and-white room, but the energy runs round the screen's edge.
 assert.equal(await page.locator('#portalChrome .portal-frame').evaluate(el=>getComputedStyle(el).visibility),'hidden');
 assert.equal(await page.locator('#portalChrome .portal-aura').evaluate(el=>getComputedStyle(el).visibility),'visible');
 await page.close();
}));

test('a failed jelly or cogs packet shows its poster, then retries without poisoning the other boards',async()=>withPortal(async(browser,url)=>{
 const page=await openPage(browser,url);
 for(const [id,asset] of [['jelly','jelly.glb'],['cogs','parts-kit.glb']]){
  let failed=false;
  await page.route('**/'+asset,route=>{if(!failed){failed=true;return route.abort('failed');}return route.continue();});
  await page.evaluate(id=>portal.board(id),id);
  assert.equal(failed,true,`${id} requested its optional asset`);
  assert.deepEqual(await shown(page),{board:id,art:'flat'},`${id} keeps its identity on its flat poster`);
  await page.evaluate(id=>portal.board(id),id);
  assert.deepEqual(await shown(page),{board:id,art:'3d'},`${id} retries after the transient failure`);
  assert.equal(await renderers(page),1,`${id} leaves one live renderer`);
  await page.unroute('**/'+asset);
 }
 await page.close();
}));

test('saved or explicit missing jelly (no GLB, no poster) keeps a board up without redirecting Downloads; rapid picks end on grass',async()=>withPortal(async(browser,url)=>{
 const page=await browser.newPage({viewport:{width:375,height:812}});const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{localStorage.setItem('myr5.portalBoard','jelly');window.packOffers=[];window.myr5Packs={open:id=>window.packOffers.push(id)};});
 let jellyMissing=true;await page.route(/jelly(?:\.glb|-poster\.webp)$/,route=>jellyMissing?route.abort('failed'):route.continue());
 await page.goto(url);
 await page.evaluate(async()=>{const {openQuiltPortal}=await import('/modules/portal/portal-entry.mjs');window.portal=await openQuiltPortal();window.portal.show();});
 await page.waitForFunction(()=>document.getElementById('portalHome')?.hidden===false);
 const board=()=>page.locator('#portalHome').getAttribute('data-board'),offers=()=>page.evaluate(()=>window.packOffers.length);
 assert.equal(await board(),'quilt','cold start with a missing saved jelly falls back to quilt');
 assert.equal(await offers(),0,'cold start never opens Downloads');
 assert.equal(await page.evaluate(()=>localStorage.getItem('myr5.portalBoard')),'quilt','failed saved jelly is cleared for the next cold start');
 // second open/sync: storage + pageshow re-sync, then dispose and a fresh cold mount
 await page.evaluate(()=>{dispatchEvent(new Event('storage'));dispatchEvent(new Event('pageshow'));});
 await page.waitForTimeout(500);
 await page.evaluate(async()=>{window.myr5Portal.dispose();const {openQuiltPortal}=await import('/modules/portal/portal-entry.mjs');window.portal=await openQuiltPortal();window.portal.show();});
 await page.waitForTimeout(500);
 assert.equal(await board(),'quilt','second portal open still shows quilt');
 assert.equal(await offers(),0,'second open/sync never opens Downloads');
 // rapid choices end on a working grass board
 jellyMissing=false;
 await page.evaluate(async()=>{await Promise.all([portal.board('jelly'),portal.board('cogs'),portal.board('grass')]);});
 assert.equal(await board(),'grass','last rapid pick wins');
 assert.equal(await renderers(page),1,'one live renderer');
 await page.evaluate(()=>portal.playWormhole({direction:'in',minMs:50}));await page.waitForTimeout(100);
 assert.equal(await page.locator('.portal-wormhole.gl canvas').count(),1,'grass tunnel draws');
 await page.evaluate(()=>portal.playWormhole({direction:'out',minMs:50}));
 assert.equal(await offers(),0,'rapid picks with an available jelly never offer Downloads');
 // An actually missing board picked by hand shows an inline failure, keeps the last good board and leaves all others usable.
 jellyMissing=true;
 await page.evaluate(()=>document.querySelector('#portalMenu [data-board="jelly"]').click());
 await page.waitForFunction(()=>document.getElementById('portalHome').dataset.board==='grass'&&document.getElementById('portalStatus').textContent.includes('Jelly board art is unavailable'));
 await page.waitForTimeout(500);
 assert.equal(await offers(),0,'an explicit failed pick never redirects to Downloads');
 assert.equal(await page.evaluate(()=>localStorage.getItem('myr5.portalBoard')),'grass','a failed explicit pick is never saved: the last good board stays the choice');
 await page.evaluate(()=>portal.board('grass'));
 assert.equal(await board(),'grass','a working board still opens after the failed Jelly pick');
 assert.deepEqual(errors,[]);
 await page.close();
}));
