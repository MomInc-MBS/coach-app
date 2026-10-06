import {guideSeen} from './guide-seen.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {chromium} from 'playwright';
import {completeCoach} from './onboarding-fixture.mjs';

const FRAMES=resolve('.frames');
const TYPES={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.webp':'image/webp'};
function serve(){
 const root=resolve('dist/client');
 return createServer(async(req,res)=>{
  const path=new URL(req.url,'http://local').pathname;
  if(path==='/__cogs_return__'){res.setHeader('Content-Type','text/html');res.end(`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0}dialog{background:#17111e;color:white}</style><nav id="coachDock" class="coach-dock"><button data-route="portal">Portal</button><button data-route="achievements" onclick="myr5Routes.go('achievements')">Achievements</button></nav><dialog id="mealsPanel" data-route="food">Food</dialog><dialog class="ach-board" data-route="achievements">Achievements<button class="ach-close" onclick="this.closest('dialog').close()">Close</button></dialog><script type="importmap">{"imports":{"three":"/vendor/three/three.module.js","three/addons/loaders/GLTFLoader.js":"/vendor/three/GLTFLoader.js","three/addons/libs/meshopt_decoder.module.js":"/vendor/three/meshopt_decoder.module.js"}}</script><script>let active='';window.myr5Routes={current:()=>active,go:route=>{active=route;const next=document.querySelector('[data-route="'+route+'"][open]')||document.querySelector('dialog[data-route="'+route+'"]');next.append(document.querySelector('#coachDock'));next.showModal();for(const old of document.querySelectorAll('dialog[open]'))if(old!==next)old.close();return next;}};</script>`);return;}
  if(path.startsWith('/api/')){res.writeHead(path==='/api/auth/config'?200:401,{'Content-Type':'application/json'});res.end(JSON.stringify(path==='/api/auth/config'?{enabled:false}:{error:'Sign in'}));return;}
  try{const file=resolve(root,'.'+(path==='/'?'/pose.html':path));if(!file.startsWith(root+sep))throw Error();const body=await readFile(file);res.writeHead(200,{'Content-Type':TYPES[extname(file)]||'application/octet-stream'});res.end(body);}catch{res.writeHead(404);res.end();}
 });
}
async function openApp(browser,base,reducedMotion='no-preference'){
 const context=await browser.newContext({viewport:{width:375,height:812},serviceWorkers:'block',reducedMotion});
 await context.addInitScript(guideSeen);
 await context.addInitScript(()=>{Object.defineProperty(navigator,'standalone',{configurable:true,value:true});try{localStorage.setItem('myr5.portalHintShown','1');const d=new Date();localStorage.setItem('myr5-how-to-play-day-v1/guest',`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`);}catch{}});
 const seed=await context.newPage();
 await seed.goto(base+'/onboarding.html');
 await seed.evaluate(async intake=>{const {openLocalCoach}=await import('/local-coach-runtime.mjs');const repo=await openLocalCoach();await repo.forOwner(repo.guestOwnerId).saveSetup(intake,{startDay:'2026-09-21'});repo.close();},completeCoach());
 await seed.close();
 const page=await context.newPage();
 await page.goto(base+'/pose.html');
 await page.waitForFunction(()=>window.myr5TestState?.phase==='idle'&&window.myr5WorkoutOwner&&!window.myr5WorkoutOwner.snapshot().transitioning);
 await page.waitForFunction(()=>!!document.querySelector('.coach-dock'));
 await page.evaluate(()=>document.querySelector('.app-update-banner [data-later]')?.click());
 await page.evaluate(()=>window.myr5Menus.portal());
 await page.waitForFunction(()=>document.getElementById('portalHome')?.hidden===false);
 await page.waitForTimeout(300);
 return {context,page};
}
const quiltHome=page=>page.waitForFunction(()=>!document.getElementById('portalHome').hidden&&!document.querySelector('.portal-glass')&&!document.getElementById('portalChrome').matches(':popover-open')&&location.hash==='',null,{timeout:20000});
// What a tap at x,y reaches inside sel (the modal's clear backdrop answers for the dialog itself everywhere else).
const inside=(page,sel,[x,y])=>page.evaluate(([sel,x,y])=>{const hit=document.elementFromPoint(x,y),d=document.querySelector(sel);return !!hit&&hit!==d&&!!hit.closest(sel);},[sel,x,y]);
const reaches=(page,sel,[x,y])=>page.evaluate(([sel,x,y])=>!!document.elementFromPoint(x,y)?.closest(sel),[sel,x,y]);
const barTappable=page=>page.evaluate(()=>{const food=document.querySelector('#coachDock [data-route="food"]'),r=food.getBoundingClientRect();return document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)===food;});

let server,base,browser;
test.before(async()=>{
 server=serve();await new Promise(r=>server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-gl=angle','--use-angle=swiftshader']});
 await mkdir(FRAMES,{recursive:true});
});
test.after(async()=>{await browser?.close();await new Promise(r=>server.close(r));});

// [id, dialog, frame, its own Close, its title, one of the scene's own objects]. R7 (Ian 26 and 29 Sept): peered at, a
// scene shows nothing but itself (no title, Close or label; its own objects still take a tap); full screen brings them back.
const SHAPED=[
 ['up','#mealsPanel','up-food','#mealsPanel [data-close]','#mealsPanel h2','#pyramidScanner canvas'],
 ['down','.ach-board','down-achievements','.ach-close','.ach-head h1','.ach-boss'],
 // Records peers into the 3D classroom; its whiteboard opens the full panel. Ian 26 Sept: the sideways diamond opens the
 // same tall diamond (the flat trace still reaches it).
 ['vdiamond','#accountPanel','vdiamond-leaderboard','#accountPanel [data-close]','#accountPanel h2','[data-room-board]'],
 ['hdiamond','#accountPanel','hdiamond-opens-vdiamond','#accountPanel [data-close]','#accountPanel h2','[data-room-board]'],
 ['oval','dialog.ship-view','oval-ship','.ship-view-close','.ship-scene-status','.ship-scene-canvas'],
];
// The four corners (inside any rounding) and middle of its box, or of each line of a heading's text, reach the element
// itself: nothing clips or covers it.
const fullyVisible=(page,sel)=>page.evaluate(sel=>{
 const el=document.querySelector(sel);if(!el?.getClientRects().length)return `${sel}: not shown`;
 let rects=[el.getBoundingClientRect()];
 if(/^H\d$/.test(el.tagName)){const range=document.createRange();range.selectNodeContents(el);rects=[...range.getClientRects()].filter(r=>r.width>2&&r.height>2);}
 for(const r of rects){const k=Math.min(8,r.width/4,r.height/4);
  for(const [x,y] of [[r.left+k,r.top+k],[r.right-k,r.top+k],[r.left+k,r.bottom-k],[r.right-k,r.bottom-k],[r.left+r.width/2,r.top+r.height/2]]){const hit=document.elementFromPoint(x,y);if(!hit||!(hit===el||el.contains(hit)))return `${sel}: ${Math.round(x)},${Math.round(y)} hits ${hit?.tagName}.${hit?.className}`;}}
 return true;},sel);
const shown=(page,sel)=>page.evaluate(sel=>{const el=document.querySelector(sel);return !!el&&el.checkVisibility({visibilityProperty:true,checkVisibilityCSS:true});},sel);
// Every bit of DOM text or control showing in a menu that isn't one of the scene's own objects (its canvas, a boss, the
// whiteboard), and whether its hidden Close can still take focus.
const overlays=(page,sel,close)=>page.evaluate(([sel,close])=>{
 const d=document.querySelector(sel),text=el=>[...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim());
 const shown=[...d.querySelectorAll('*')].filter(el=>!el.closest('#coachDock')&&!el.matches('canvas,.ach-boss,[data-room-board]')&&(el.matches('button,a,input,select,textarea,[tabindex]')||text(el))
  &&el.getClientRects().length&&el.checkVisibility({visibilityProperty:true,checkVisibilityCSS:true,opacityProperty:true,checkOpacity:true})).map(el=>el.className||el.tagName);
 const c=document.querySelector(close);c.focus();const focused=document.activeElement===c;c.blur();
 return {shown,focused};
},[sel,close]);
// Something of sel is where a tap lands (the middle of one of them reaches it).
const tappable=(page,sel)=>page.evaluate(sel=>[...document.querySelectorAll(sel)].some(el=>{const r=el.getBoundingClientRect(),hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return !!hit&&(hit===el||el.contains(hit));}),sel);
// Two quick taps on the open menu (here on the wall beside the cut, which answers for the menu).
async function doubleTap(page,sel){
 const corner=await page.evaluate(()=>{const c=document.getElementById('portalChrome').style;return [parseFloat(c.getPropertyValue('--face-left'))+14,parseFloat(c.getPropertyValue('--face-top'))+14];});
 await page.mouse.dblclick(...corner); // one call: two separate clicks come over a second apart on a busy machine
 await page.waitForFunction(sel=>document.querySelector(sel).classList.contains('portal-fullscreen'),sel,{timeout:5000});
}
const auraPath=page=>page.evaluate(()=>document.querySelector('#portalChrome .portal-aura #portalAuraP')?.getAttribute('d'));
const flowing=page=>page.evaluate(()=>{const a=document.querySelector('#portalChrome .portal-aura');return !!a&&[...a.querySelectorAll('.portal-aura-fire')].every(el=>el.getAnimations({subtree:true}).some(x=>x.playState==='running'));});
test('R25: the sideways diamond opens the DJ terminal in its cut like the other shapes (no dive to black)',{timeout:120000},async()=>{
 const {context,page}=await openApp(browser,base);
 try{
  await page.evaluate(()=>{window.run=window.myr5Portal.open('hdiamond');});
  await page.waitForFunction(()=>{const d=document.getElementById('spotifyPanel');return d?.open&&d.classList.contains('portal-shaped');},null,{timeout:30000});
  await page.evaluate(()=>window.run);
  await page.waitForTimeout(1200);
  const s=await page.evaluate(()=>({quilt:!document.getElementById('portalHome').hidden,clip:document.getElementById('spotifyPanel').style.clipPath,chrome:document.getElementById('portalChrome').matches(':popover-open')}));
  assert.equal(s.quilt,true,'the quilt stays on as the wall');assert.equal(s.chrome,true,'the metal frame is up');assert.match(s.clip,/^path\(/,'the terminal is clipped to the diamond');
  await mkdir('.r25',{recursive:true});await page.screenshot({path:'.r25/dj-hdiamond.png'});
 }finally{await context.close();}
});
