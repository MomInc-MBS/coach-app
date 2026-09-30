// V66: Android drops WebGL contexts (memory pressure, too many live contexts) and can then refuse new ones. In the real app
// at 375x812 with an Android UA, cycle every board and force a context loss on each, lose one mid-switch, then block WebGL
// altogether: the frame, its MOM INC plate, the portal and the dock must stay on screen with board art in the face, the
// board keeps its identity (its flat poster), a finger trace still routes, and live WebGL contexts stay bounded.
// Serves a real `npm run build` (dist/client), like release-smoke.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {chromium} from 'playwright';
import {completeCoach} from './onboarding-fixture.mjs';

const TYPES={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.webp':'image/webp'};
const UA='Mozilla/5.0 (Linux; Android 14; SM-S921U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36';
function serve(){
 const root=resolve('dist/client');
 return createServer(async(req,res)=>{
  const path=new URL(req.url,'http://local').pathname;
  if(path.startsWith('/api/')){res.writeHead(path==='/api/auth/config'?200:401,{'Content-Type':'application/json'});res.end(JSON.stringify(path==='/api/auth/config'?{enabled:false}:{error:'Sign in'}));return;}
  try{const file=resolve(root,'.'+(path==='/'?'/pose.html':path));if(!file.startsWith(root+sep))throw Error();const body=await readFile(file);res.writeHead(200,{'Content-Type':TYPES[extname(file)]||'application/octet-stream'});res.end(body);}catch{res.writeHead(404);res.end();}
 });
}
// Every WebGL context the page makes, how many are still live, and two switches: __loseNext loses the next new context
// shortly after it is made (mid-build), __glBlock refuses new ones (Chrome after repeated losses).
const GL_PROBE=()=>{
 const refs=[];let peak=0;window.__glBlock=false;window.__loseNext=0;
 const live=()=>refs.filter(r=>{const c=r.deref();return c&&!c.isContextLost();}).length;
 const get=HTMLCanvasElement.prototype.getContext;
 HTMLCanvasElement.prototype.getContext=function(kind,...args){
  if(window.__glBlock&&/webgl/i.test(kind))return null;
  const ctx=get.call(this,kind,...args);
  if(ctx&&/webgl/i.test(kind)&&!refs.some(r=>r.deref()===ctx)){refs.push(new WeakRef(ctx));peak=Math.max(peak,live());if(window.__loseNext>0){window.__loseNext--;setTimeout(()=>ctx.getExtension('WEBGL_lose_context')?.loseContext(),30);}}
  return ctx;
 };
 window.__gl=()=>({live:live(),peak});
};
// What Ian sees: the portal up, its frame and plate, the dock, and board art (varied opaque pixels) on the visible board canvas.
const stage=page=>page.evaluate(()=>{
 const home=document.getElementById('portalHome'),seen=el=>!!el&&el.checkVisibility({checkOpacity:true,checkVisibilityCSS:true})&&el.getBoundingClientRect().width>20;
 const flat=[...home.querySelectorAll('#portalBoardHost canvas')].find(c=>c.style.visibility!=='hidden'&&c.getContext('2d'));
 let colors=0;if(flat){const d=flat.getContext('2d').getImageData(0,0,flat.width,flat.height).data,s=new Set();for(let i=0;i<d.length;i+=4*97)if(d[i+3]>200)s.add((d[i]>>4)+','+(d[i+1]>>4)+','+(d[i+2]>>4));colors=s.size;}
 return {portal:!home.hidden&&!home.classList.contains('no-board'),frame:seen(home.querySelector('#portalBoardHost .portal-frame')),plate:seen(home.querySelector('#portalBoardHost .portal-frame b')),dock:seen(document.getElementById('coachDock')),board:home.dataset.board,art:home.dataset.art,flatColors:colors};
});
const loseBoard=(page,block=false)=>page.evaluate(block=>{const gl=[...document.querySelectorAll('#portalBoardHost canvas')].map(c=>c.getContext('webgl2')).find(Boolean);window.__glBlock=block;gl.getExtension('WEBGL_lose_context').loseContext();},block);
const portalUp=page=>page.waitForFunction(()=>document.getElementById('portalHome')?.hidden===false&&!document.querySelector('.portal-glass'),null,{timeout:15000});
async function food(page,how){
 if(how==='trace'){ // a real finger trace of the triangle over the shape area, through the portal's overlay
  const pts=await page.evaluate(async()=>{const {SHAPES}=await import('/modules/portal/portal-shapes.mjs'),r=window.myr5Portal.current().patternRect();return SHAPES.up[0].points.map(([x,y])=>[r.left+x*r.width,r.top+y*r.height]);});
  await page.mouse.move(...pts[0]);await page.mouse.down();for(const p of pts.slice(1))await page.mouse.move(...p,{steps:2});await page.mouse.up();
 }else await page.evaluate(()=>window.myr5Portal.open('up'));
 await page.waitForFunction(()=>document.getElementById('mealsPanel')?.open===true,null,{timeout:15000});
 await page.keyboard.press('Escape'); // seen through its cut, Food shows no Close (R7)
 await portalUp(page);
}

test('context losses while cycling every board never blank the stage; routes and the dock keep working',{timeout:300000},async()=>{
 const server=serve();await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-gl=angle','--use-angle=swiftshader']});
 try{
  const context=await browser.newContext({viewport:{width:375,height:812},userAgent:UA,serviceWorkers:'block',reducedMotion:'reduce'});
  await context.addInitScript(()=>Object.defineProperty(navigator,'standalone',{configurable:true,value:true}));
  await context.addInitScript(GL_PROBE);
  // The once-a-day How to Play popup is covered by its own checks; start from a day it was already seen.
  await context.addInitScript((()=>{const get=Storage.prototype.getItem,d=new Date(),day=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;Storage.prototype.getItem=function(key){return String(key).startsWith('myr5-how-to-play-day-v1/')?day:get.call(this,key);};}));
  const seed=await context.newPage();await seed.goto(base+'/onboarding.html');
  await seed.evaluate(async intake=>{const {openLocalCoach}=await import('/local-coach-runtime.mjs');const repo=await openLocalCoach();await repo.forOwner(repo.guestOwnerId).saveSetup(intake,{startDay:'2026-09-21'});repo.close();},completeCoach());await seed.close();
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/pose.html');
  await page.waitForFunction(()=>window.myr5TestState?.phase==='idle'&&!!document.querySelector('.coach-dock'),null,{timeout:30000});
  assert.equal(await page.evaluate(()=>window.myr5Menus.portal()),true);await portalUp(page);
  await mkdir(resolve('.frames'),{recursive:true});
  const ok=(s,id,art,why)=>assert.deepEqual(s,{portal:true,frame:true,plate:true,dock:true,board:id,art,flatColors:s.flatColors>8?s.flatColors:'no art'},why);

  for(const id of ['cogs','jelly','ice','wood','grass','quilt']){
   await page.evaluate(id=>window.myr5Portal.board(id),id);
   assert.equal((await stage(page)).art,'3d',id+' 3D is drawing');
   await loseBoard(page);await page.waitForFunction(()=>document.getElementById('portalHome').dataset.art==='flat');
   ok(await stage(page),id,'flat',id+': a lost context leaves the frame, plate, dock and its flat art');
   if(id==='jelly'||id==='cogs'){await food(page,'open');await page.screenshot({path:resolve('.frames',`context-loss-${id}-375x812.png`)});}
  }
  assert.ok((await page.evaluate(()=>window.__gl())).live<=3,'lost and switched boards release their contexts');

  // Lost mid-switch (Chrome evicting the new board's context as it comes up): Jelly is on screen throughout, flat or 3D.
  await page.evaluate(()=>{window.__loseNext=1;});
  const switching=page.evaluate(()=>window.myr5Portal.board('jelly')).catch(error=>error);
  for(let i=0;i<8;i++){
   const s=await stage(page);
   assert.ok(s.portal&&s.frame&&s.plate&&s.dock&&(s.art==='3d'||s.flatColors>8)&&['quilt','jelly'].includes(s.board),'mid-switch stage '+JSON.stringify(s));
   await page.waitForTimeout(250);
  }
  await switching;
  assert.equal((await stage(page)).board,'jelly');

  // Then no WebGL at all: the live board's context goes, its one retry is refused, and it stays usable flat.
  await page.evaluate(()=>window.myr5Portal.board('cogs'));
  await loseBoard(page,true);
  await page.waitForFunction(()=>/Cogs is showing its flat art/.test(document.getElementById('portalStatus').textContent),null,{timeout:10000});
  ok(await stage(page),'cogs','flat','WebGL refused: Cogs stays up flat');
  await food(page,'trace');
  ok(await stage(page),'cogs','flat','back from Food on the flat board');
  await page.screenshot({path:resolve('.frames','context-loss-no-webgl-cogs-375x812.png')});
  assert.deepEqual(errors,[]);
  await context.close();
 }finally{await browser.close();await new Promise(r=>server.close(r));}
});
