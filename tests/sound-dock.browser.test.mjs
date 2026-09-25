// v63: the existing pod sound switch (#toggleVoice) lives in the blank dock slot beside the phone/Reminders key.
// Same element and wiring as before (click + arrow keys via pod/hardware.mjs, aria-checked, ON/OFF); only its home moved.
// Runs against a real `npm run build` (dist/client) at 375x812, like release-smoke.browser.test.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {chromium} from 'playwright';
import {completeCoach} from './onboarding-fixture.mjs';

const TYPES={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.webp':'image/webp'};
const root=resolve('dist/client');
const server=createServer(async(req,res)=>{
 const path=new URL(req.url,'http://local').pathname;
 if(path.startsWith('/api/')){res.writeHead(path==='/api/auth/config'?200:401,{'Content-Type':'application/json'});res.end(JSON.stringify(path==='/api/auth/config'?{enabled:false}:{error:'Sign in'}));return;}
 try{const file=resolve(root,'.'+(path==='/'?'/pose.html':path));if(!file.startsWith(root+sep))throw Error();const body=await readFile(file);res.writeHead(200,{'Content-Type':TYPES[extname(file)]||'application/octet-stream'});res.end(body);}catch{res.writeHead(404);res.end();}
});

test('the sound switch sits in the dock beside the phone key, clear of every other key, and still works',{timeout:120000},async()=>{
 await new Promise(r=>server.listen(0,r));
 const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const context=await browser.newContext({viewport:{width:375,height:812},deviceScaleFactor:2,serviceWorkers:'block',reducedMotion:'reduce'});
  await context.addInitScript(()=>Object.defineProperty(navigator,'standalone',{configurable:true,value:true}));
  // The once-a-day How to Play popup is covered elsewhere; start from a day it was already seen (as release-smoke does).
  await context.addInitScript(()=>{const get=Storage.prototype.getItem,d=new Date(),day=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;Storage.prototype.getItem=function(key){return String(key).startsWith('myr5-how-to-play-day-v1/')?day:get.call(this,key);};});
  const seed=await context.newPage();await seed.goto(base+'/onboarding.html');
  await seed.evaluate(async intake=>{const {openLocalCoach}=await import('/local-coach-runtime.mjs');const repo=await openLocalCoach();await repo.forOwner(repo.guestOwnerId).saveSetup(intake,{startDay:'2026-09-21'});repo.close();},completeCoach());await seed.close();
  const page=await context.newPage();await page.goto(base+'/pose.html');
  await page.waitForFunction(()=>window.myr5TestState?.phase==='idle'&&document.querySelector('.coach-dock'));
  await page.waitForFunction(()=>getComputedStyle(document.querySelector('#coachDock .dock-pod')).width==='44px');

  // Placement: inside the dock, right of the phone key with no overlap, full 44px hit box on screen, nothing else moved under it.
  const rects=await page.evaluate(()=>{const r=e=>{const b=e.getBoundingClientRect();return {x:b.x,y:b.y,r:b.right,b:b.bottom,w:b.width,h:b.height,id:e.id||e.dataset.route||e.className}};
   const sound=document.getElementById('toggleVoice');return {inDock:!!sound.closest('#coachDock'),inPod:!!sound.closest('.control-board'),sound:r(sound),keys:[...document.querySelectorAll('#coachDock button[data-route]')].map(r),vw:innerWidth};});
  assert.ok(rects.inDock&&!rects.inPod,'#toggleVoice moved from the pod control board into the dock');
  const phone=rects.keys.find(k=>k.id==='reminders'),s=rects.sound;
  assert.ok(phone&&s.x>=phone.r&&s.x-phone.r<=8,'sound sits immediately right of the phone key');
  assert.ok(s.w>=44&&s.h>=44&&s.r<=rects.vw,'44px hit box fully on screen');
  for(const k of rects.keys)assert.ok(s.r<=k.x||s.x>=k.r||s.b<=k.y||s.y>=k.b,`sound does not overlap ${k.id}`);
  // Hit target: the centre and corners of every dock key resolve to that key, and the sound centre to the sound switch.
  const hits=await page.evaluate(()=>[...document.querySelectorAll('#coachDock button[data-route],#toggleVoice')].map(e=>{const b=e.getBoundingClientRect();return [e.id||e.dataset.route,document.elementFromPoint(b.x+b.width/2,b.y+b.height/2)?.closest('button')===e]}));
  for(const [id,ok] of hits)assert.ok(ok,`${id} centre is its own hit target`);

  // Same control: label, role, state text, click and arrow-key wiring untouched.
  const sound=page.locator('#toggleVoice'),state=()=>page.evaluate(()=>{const e=document.getElementById('toggleVoice');return [e.textContent,e.dataset.on,e.getAttribute('aria-checked'),e.getAttribute('role'),e.getAttribute('aria-label')].join('|')});
  assert.equal(await state(),'ON|true|true|switch|Coach sound');
  await sound.click();assert.equal(await state(),'OFF|false|false|switch|Coach sound');
  await sound.focus();await page.keyboard.press('ArrowUp');assert.equal(await state(),'ON|true|true|switch|Coach sound');
  await page.keyboard.press('ArrowDown');assert.equal(await state(),'OFF|false|false|switch|Coach sound');
  await mkdir(resolve('.frames'),{recursive:true});await page.screenshot({path:resolve('.frames/sound-dock-375.png'),clip:{x:0,y:700,width:375,height:112}});
  await context.close();
 }finally{await browser.close();await new Promise(r=>server.close(r));}
});
