// R21 L4: the Pond grimoire in the real app at 375x812 (Android UA), served from a real `npm run build` (dist/client).
// It draws in 3D, koi gather under a held finger, a drawn stroke leads a growing school, 15 s untouched sends the fish
// off and the huge koi across, and a traced square still cuts the portal. Screenshots go to .frames/r21-pond/.
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
const portalUp=page=>page.waitForFunction(()=>{const home=document.getElementById('portalHome');return home?.hidden===false&&!document.querySelector('.portal-glass');},null,{timeout:15000});
const pondState=page=>page.evaluate(async()=>{const {pond}=await import('/modules/portal/portal-board-pond.mjs');return pond.debug();});

test('pond grimoire: koi gather, school, idle show and a portal cut',{timeout:300000},async()=>{
 const out=resolve('.frames/r21-pond');await mkdir(out,{recursive:true});
 const server=serve();await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-gl=angle','--use-angle=swiftshader']});
 try{
  const context=await browser.newContext({viewport:{width:375,height:812},userAgent:UA,serviceWorkers:'block'});
  await context.addInitScript(()=>Object.defineProperty(navigator,'standalone',{configurable:true,value:true}));
  await context.addInitScript(()=>localStorage.setItem('myr5.portalBoard','cogs'));
  await context.addInitScript(()=>{try{Object.defineProperty(screen.orientation,'type',{configurable:true,get:()=>'portrait-primary'});}catch{}});
  await context.addInitScript((()=>{const get=Storage.prototype.getItem,d=new Date(),day=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;Storage.prototype.getItem=function(key){return String(key).startsWith('myr5-how-to-play-day-v1/')?day:get.call(this,key);};}));
  const seed=await context.newPage();await seed.goto(base+'/onboarding.html');
  await seed.evaluate(async intake=>{const {openLocalCoach}=await import('/local-coach-runtime.mjs');const repo=await openLocalCoach();await repo.forOwner(repo.guestOwnerId).saveSetup(intake,{startDay:'2026-09-21'});repo.close();},completeCoach());await seed.close();
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/pose.html');
  await page.waitForFunction(()=>window.myr5TestState?.phase==='idle'&&!!document.querySelector('.coach-dock'),null,{timeout:30000});
  assert.equal(await page.evaluate(()=>window.myr5Menus.portal()),true);await portalUp(page);
  await page.waitForFunction(()=>document.getElementById('portalHome').dataset.board==='pond',null,{timeout:30000});
  await page.locator('#portalSettingsButton').click();
  assert.equal(await page.locator('dialog[open] [data-board="cogs"]').count(),0,'Cogs is absent from the board picker');
  await page.getByRole('button',{name:'Back to portal'}).click();await portalUp(page);
  await page.evaluate(()=>window.myr5Portal.board('pond'));
  await page.waitForFunction(()=>document.getElementById('portalHome').dataset.board==='pond'&&document.getElementById('portalHome').dataset.art==='3d',null,{timeout:30000});
  await page.locator('button:has-text("Got it")').click({timeout:10000}).catch(()=>{}); // the what's-new toast
  await page.waitForTimeout(1500);
  const s0=await pondState(page);assert.ok(s0.anchors>=40&&s0.lilies>=14,'anchor lilies placed: '+JSON.stringify(s0));
  await page.screenshot({path:resolve(out,'pond-idle-375x812.png')});

  const r=await page.evaluate(()=>window.myr5Portal.current().patternRect()),cx=r.left+r.width*.5,cy=r.top+r.height*.62;
  await page.mouse.move(cx,cy);await page.mouse.down();
  for(let i=0;i<70;i++){await page.mouse.move(cx+(i%2),cy);await page.waitForTimeout(100);} // held, a hair of jitter
  const held=await pondState(page);
  await page.screenshot({path:resolve(out,'pond-finger-held-375x812.png')});
  assert.equal(held.phase,'touch');assert.ok(held.members>=3,'koi gathered under the finger: '+held.members);
  for(let i=0;i<140;i++){const t=i/140;await page.mouse.move(cx+120*Math.sin(t*Math.PI*5),cy-200+330*t+25*Math.sin(t*31));await page.waitForTimeout(25);} // a snaking scribble, no template shape
  const drawn=await pondState(page);assert.ok(drawn.members>=held.members,'the school grew while drawing: '+drawn.members);
  await page.screenshot({path:resolve(out,'pond-drawing-school-375x812.png')});
  await page.mouse.up();
  await portalUp(page);

  await page.evaluate(async()=>{window.__pond=(await import('/modules/portal/portal-board-pond.mjs')).pond;});
  await page.waitForFunction(()=>window.__pond.debug().phase==='big',null,{timeout:30000,polling:500});
  await page.waitForTimeout(6000);
  assert.equal((await pondState(page)).phase,'big');
  await page.screenshot({path:resolve(out,'pond-idle-15s-big-shadow-375x812.png')});

  // A completed portal: trace the square through the portal overlay; the glass opens over the cut water.
  const pts=await page.evaluate(async()=>{const {SHAPES}=await import('/modules/portal/portal-shapes.mjs'),r=window.myr5Portal.current().patternRect();return SHAPES.rect[0].points.map(([x,y])=>[r.left+x*r.width,r.top+y*r.height]);});
  await page.mouse.move(...pts[0]);await page.mouse.down();for(const p of pts.slice(1))await page.mouse.move(...p,{steps:6});await page.mouse.up();
  await page.waitForSelector('.portal-glass',{timeout:5000});await page.waitForTimeout(900);
  await page.screenshot({path:resolve(out,'pond-portal-rect-375x812.png')});
  assert.deepEqual(errors,[]);
  await context.close();
 }finally{await browser.close();await new Promise(r=>server.close(r));}
});
