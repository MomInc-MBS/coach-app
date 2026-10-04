// W2-2N (Ian 23 Sept), in the real app at 375x812 against `npm run build`:
// #134 a vignetted energy in the portal's shape runs round an open destination, never covering it; #131 the triangles,
// the diamond and the oval open in their cut with the quilt kept as the wall and fizzle shut; R7 (Ian 26 Sept) no text in
// a peer-through view, a double-tap on it steps in to the full screen with the energy on the screen's edge and the tilt
// still on; #135 tilt looks round the scene behind the window while the cut stays put;
// #124 the lines and the X run a short wormhole; release 5's open item: switching routes from the bar while a
// destination is framed moves the frame to the next page, no reverse dive behind it. Frames land in .frames/ (untracked).
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
const tilt=(page,gamma,beta=50)=>page.evaluate(([g,b])=>{for(let i=0;i<3;i++)dispatchEvent(new DeviceOrientationEvent('deviceorientation',{alpha:0,beta:b,gamma:g}));},[gamma,beta]);
const eyeX=page=>page.evaluate(async()=>(await import('/modules/portal/peer.mjs')).eye.x);
test('#134 #131 R7: Food, Achievements, Leaderboard and the ship open in their cut with the energy in the portal\'s shape and no text, and a double-tap steps each in to the full screen, energy and tilt kept',{timeout:420000},async()=>{
 const {context,page}=await openApp(browser,base);
 try{
  await page.evaluate(()=>localStorage.setItem('myr5.tiltPermission','granted'));
  let tallDiamond=null;
  for(const [id,sel,frame,close,title,scene] of SHAPED){
   await page.evaluate(id=>{window.run=window.myr5Portal.open(id);},id);
   await page.waitForFunction(sel=>document.querySelector(sel)?.open&&document.querySelector(sel).classList.contains('portal-shaped'),sel,{timeout:30000});
   await page.evaluate(()=>window.run);
   if(id==='up')await page.waitForFunction(()=>document.querySelector('#pyramidScanner canvas')&&!document.querySelector('#pyramidScanner[data-loading]'),null,{timeout:30000});
   await page.waitForTimeout(1200);
   const s=await page.evaluate(sel=>{
    const d=document.querySelector(sel),aura=document.querySelector('#portalChrome .portal-aura');
    return {quilt:!document.getElementById('portalHome').hidden,chrome:document.getElementById('portalChrome').matches(':popover-open'),clip:d.style.clipPath,shaped:aura?.classList.contains('shaped'),
     name:!!aura?.querySelector('.portal-aura-name'),taps:[aura,...aura.querySelectorAll('*')].every(el=>getComputedStyle(el).pointerEvents==='none')};
   },sel);
   assert.equal(s.quilt,true,`${id}: the quilt stays on as the wall`);
   assert.equal(s.chrome,true,`${id}: the metal frame is up`);
   assert.match(s.clip,/^path\(/,`${id}: the destination is clipped to the cut`);
   assert.equal(s.shaped,true,`${id}: the energy runs round the cut`);
   assert.equal(s.name,false,`${id}: no name on the rim`);
   assert.equal(s.taps,true,`${id}: nothing in the energy takes a pointer`);
   assert.equal(await flowing(page),true,`${id}: the neons flow round the rim`);
   assert.deepEqual(await overlays(page,sel,close),{shown:[],focused:false},`${id}: nothing but the scene shows through the cut, and its hidden Close takes no focus`);
   assert.equal(await shown(page,title),false,`${id}: no title`);
   const middle=await page.evaluate(()=>{const p=document.querySelector('.portal-aura').style;return [parseFloat(p.getPropertyValue('--cx')),parseFloat(p.getPropertyValue('--cy'))];});
   assert.equal(await reaches(page,sel,middle),true,`${id}: the menu is reachable through the middle of the cut`);
   assert.equal(await tappable(page,scene),true,`${id}: the scene's own objects still take a tap`);
   if(id==='vdiamond'||id==='hdiamond'){
    await page.waitForFunction(()=>document.querySelector('#accountPanel[data-room="ready"] .classroom-canvas'),null,{timeout:30000});
    assert.equal(await page.evaluate(()=>{
     const d=document.getElementById('accountPanel');
     return d.classList.contains('classroom-panel')&&d.querySelectorAll('.classroom-desk').length===2&&!!d.querySelector('[data-room-board]');
    }),true,'the 3D classroom, two desks and tappable whiteboard sit in the diamond');
    assert.equal(await page.evaluate(()=>{const board=document.querySelector('#accountPanel [data-room-board]'),r=board.getBoundingClientRect();return !!document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)?.closest('[data-room-board]');}),true,'the whiteboard center is tappable through the cut');
    if(id==='vdiamond')tallDiamond=await auraPath(page);
    else assert.equal(await auraPath(page),tallDiamond,'the sideways diamond opens the tall one');
   }
   if(id==='oval'){
    await page.waitForFunction(()=>document.querySelector('.ship-view-stage .ship-scene[data-phase=ready]')&&!document.querySelector('.ship-scene-flash:popover-open'),null,{timeout:30000});
    const scene=await page.locator('.ship-view-stage .ship-scene-canvas').boundingBox();
    assert.ok(scene?.width>200&&scene.height>400,'the coach ship scene has a real viewport behind the oval cut');
   }
   assert.equal(await barTappable(page),true,`${id}: the bar stays tappable`);
   await page.screenshot({path:resolve(FRAMES,`r7-peer-${frame}-peered.png`)});
   // R7: a double-tap on the open menu steps in to the full screen: no clip, the frame up out of the way, the energy on the
   // screen's edge, the title and Close back, the tilt still on.
   await doubleTap(page,sel);
   await page.waitForFunction(sel=>document.querySelector(sel).classList.contains('portal-fullscreen'),sel,{timeout:5000}); // R16/R17: stepped in, the frame stays as the rail (no garage-door exit)
   const f=await page.evaluate(sel=>{const d=document.querySelector(sel),r=d.getBoundingClientRect();return {open:d.open,clip:d.style.clipPath,box:[r.width,r.height],quilt:!document.getElementById('portalHome').hidden,
    shaped:document.querySelector('#portalChrome .portal-aura')?.classList.contains('shaped'),frameStays:document.querySelector('#portalChrome .portal-frame').getBoundingClientRect().bottom>0};},sel);
   assert.deepEqual(f,{open:true,clip:'',box:[345,694],quilt:false,shaped:false,frameStays:true},`${id}: full screen`);
   assert.equal(await auraPath(page),'M15.0 15.0L360.0 15.0L360.0 709.0L15.0 709.0Z',`${id}: the energy runs round the screen's edge`);
   assert.equal(await flowing(page),true,`${id}: the energy still flows in full screen`);
   assert.equal(await shown(page,title),true,`${id}: full screen shows its own title`);
   assert.equal(await fullyVisible(page,close),true,`${id}: full screen shows its own Close`);
   await tilt(page,0);await page.waitForTimeout(400);await tilt(page,14);await page.waitForTimeout(1000);
   assert.ok(await eyeX(page)>.8,`${id}: the tilt still looks round the scene in full screen`);
   await tilt(page,0);await page.waitForTimeout(600);
   await page.screenshot({path:resolve(FRAMES,`r7-peer-${frame}-full.png`)});
   // Its Close backs out through the wormhole (the shell falls into the core) and the quilt heals.
   await page.locator(close).first().click();
   await page.waitForFunction(()=>document.querySelector('.portal-ghost')&&document.querySelector('.portal-glass'),null,{timeout:20000,polling:16});
   await quiltHome(page);
   assert.equal(await page.evaluate(()=>document.getAnimations().some(a=>a.effect?.target?.id==='portalHome')),false,`${id}: the way back has finished`);
  }
 }finally{await context.close();}
});

test("R7 (Ian 29 Sept): with its Close hidden, a peered menu still lets you out: Escape, phone back and the bar's Portal key; a scene tap that opens a card steps in",{timeout:300000},async()=>{
 const {context,page}=await openApp(browser,base);
 const open=async(id,sel)=>{
  await page.evaluate(id=>{window.run=window.myr5Portal.open(id);},id);
  await page.waitForFunction(sel=>document.querySelector(sel)?.open&&document.querySelector(sel).classList.contains('portal-shaped'),sel,{timeout:30000});
  await page.evaluate(()=>window.run);await page.waitForTimeout(800);
 };
 try{
  for(const [id,sel,exit] of [['up','#mealsPanel','Escape'],['down','.ach-board','back'],['vdiamond','#accountPanel','portal key'],['oval','dialog.ship-view','Escape'],['up','#mealsPanel','back'],['oval','dialog.ship-view','portal key']]){
   await open(id,sel);
   if(exit==='Escape')await page.keyboard.press('Escape');
   else if(exit==='back')await page.goBack();
   else await page.locator('#coachDock [data-route="portal"]').click();
   await page.waitForFunction(sel=>!document.querySelector(sel).open,sel,{timeout:10000}).catch(e=>{throw new Error(`${id}: ${exit} did not close it`,{cause:e});});
   await quiltHome(page);
  }
  // A boss's detail card is hidden while peered, so a tap on the boss steps in to show it (a pyramid screen or dial alike).
  await open('down','.ach-board');
  await page.evaluate(()=>document.querySelector('.ach-board .ach-boss:not([disabled])').click());
  await page.waitForFunction(()=>document.querySelector('.ach-board.portal-fullscreen')&&!document.querySelector('.ach-detail').hidden,null,{timeout:5000});
  assert.equal(await shown(page,'.ach-detail'),true,'the card shows, full screen');
  await page.goBack();
  await page.waitForFunction(()=>!document.querySelector('.ach-board').open,null,{timeout:10000});
  await quiltHome(page);
 }finally{await context.close();}
});

test('release 5: switching routes from the bar while a destination is framed moves the frame to the next page, with no reverse dive behind it',{timeout:180000},async()=>{
 const {context,page}=await openApp(browser,base);
 try{
  await page.evaluate(()=>{const animate=Element.prototype.animate;window.__dives=0;Element.prototype.animate=function(k,t){if(this.id==='portalHome'&&t?.direction==='reverse')window.__dives++;return animate.call(this,k,t);};});
  await page.evaluate(()=>{window.run=window.myr5Portal.open('up');});
  await page.waitForFunction(()=>document.querySelector('#mealsPanel.portal-shaped'),null,{timeout:30000});
  await page.evaluate(()=>window.run);
  for(const [route,sel,name] of [['reminders','#remindersPanel','REMINDERS'],['scoreboard','#accountPanel','LEADERBOARD']]){
   await page.locator(`#coachDock [data-route="${route}"]`).click();
   await page.waitForFunction(([route,sel])=>document.querySelector(sel)?.open&&location.hash==='#'+route,[route,sel],{timeout:10000});
   await page.waitForTimeout(700);
   const s=await page.evaluate(sel=>({framed:document.querySelector(sel).classList.contains('portal-framed'),shaped:document.querySelector(sel).classList.contains('portal-shaped'),chrome:document.getElementById('portalChrome').matches(':popover-open'),
    quilt:!document.getElementById('portalHome').hidden,glass:!!document.querySelector('.portal-glass'),open:document.querySelectorAll('dialog[open]').length,name:document.querySelector('.portal-aura-name')?.textContent,dives:window.__dives}),sel);
   assert.deepEqual(s,{framed:true,shaped:false,chrome:true,quilt:false,glass:false,open:1,name:undefined,dives:0},`#${route}: framed in the whole window, nothing playing behind it`);
   assert.equal(await barTappable(page),true);
   await page.screenshot({path:resolve(FRAMES,`r5-switch-to-${route}.png`)});
  }
  await page.goBack();
  await quiltHome(page);
 }finally{await context.close();}
});

test('R21 Cogs frame handover returns through manufactured seams and heals the board',{timeout:180000},async()=>{
 const context=await browser.newContext({viewport:{width:375,height:812},serviceWorkers:'block'}),page=await context.newPage();
 try{
  await page.goto(base+'/__cogs_return__');await page.evaluate(async()=>{const {openQuiltPortal}=await import('/modules/portal/portal-entry.mjs');window.myr5Portal=await openQuiltPortal();});
  await page.evaluate(async()=>{await window.myr5Portal.board('cogs');if(document.querySelector('#portalHome').dataset.art!=='3d')throw Error('Mechanical board must render in 3D');const board=window.myr5Portal.current();window.__cogsCuts=[];const cut=board.cut;board.cut=function(points,...args){window.__cogsCuts.push(points);return cut.call(this,points,...args);};window.__cogsExpected=(await import('/modules/portal/portal-shapes.mjs')).SHAPES.down[0].points.map(([u,v])=>{const p=board.patternRect(),f=board.faceRect();return [(p.left+p.width*u-f.left)/f.width,(p.top+p.height*v-f.top)/f.height];});window.run=window.myr5Portal.open('up');});
  await page.evaluate(()=>window.run);
  await page.locator('#coachDock [data-route="achievements"]').click();
  await page.waitForSelector('.ach-board[open]');
  await page.locator('.ach-close').focus();await page.keyboard.press('Enter');
  await page.waitForFunction(()=>!document.querySelector('#portalHome').hidden&&!document.querySelector('.portal-glass')&&!document.querySelector('#portalChrome').matches(':popover-open'),null,{timeout:20000});
  const result=await page.evaluate(()=>({cuts:window.__cogsCuts,expected:window.__cogsExpected,board:document.querySelector('#portalHome').dataset.board}));
  assert.equal(result.board,'cogs');assert.ok(result.cuts.length>=2,'entry and handover return both cut the actual board');
  const actual=result.cuts.at(-1),expected=result.expected;
  assert.equal(actual.length,expected.length);
  for(let i=0;i<expected.length;i++)for(let axis=0;axis<2;axis++)assert.ok(Math.abs(actual[i][axis]-expected[i][axis])<1e-6,'return uses the exact manufactured down contour');
 }finally{await context.close();}
});

test('iOS tilt permission waits for the Allow chip tap',{timeout:90000},async()=>{
 const {context,page}=await openApp(browser,base);
 try{
  await page.evaluate(()=>{
   localStorage.removeItem('myr5.tiltPermission');window.__tiltPermissionCalls=0;
   Object.defineProperty(DeviceOrientationEvent,'requestPermission',{configurable:true,value:()=>{window.__tiltPermissionCalls++;return Promise.resolve('granted');}});
   window.run=window.myr5Portal.open('up');
  });
  await page.waitForFunction(()=>document.querySelector('#mealsPanel.portal-shaped'),null,{timeout:30000});
  await page.evaluate(()=>window.run);
  await page.waitForFunction(()=>document.querySelector('.portal-tilt-chip'));
  assert.equal(await page.locator('.portal-tilt-chip').isVisible(),false,'peered at, the scene shows no chip either (R7)');
  await doubleTap(page,'#mealsPanel');
  assert.equal(await page.evaluate(()=>window.__tiltPermissionCalls),0,'opening the scene does not request permission');
  await page.locator('.portal-tilt-chip').click(); // full screen offers it
  await page.waitForFunction(()=>window.__tiltPermissionCalls===1);
  assert.equal(await page.evaluate(()=>localStorage.getItem('myr5.tiltPermission')),'granted','the tap records the granted choice');
 }finally{await context.close();}
});

test('#135 tilt looks round the pyramid through the triangle (the cut stays put), flat menus stay still, reduced motion stays still',{timeout:240000},async()=>{
 const tilt=(page,gamma,beta=50)=>page.evaluate(([g,b])=>{for(let i=0;i<3;i++)dispatchEvent(new DeviceOrientationEvent('deviceorientation',{alpha:0,beta:b,gamma:g}));},[gamma,beta]);
 const settled=page=>page.waitForTimeout(1200);
 const {context,page}=await openApp(browser,base);
 try{
  await page.evaluate(()=>localStorage.setItem('myr5.tiltPermission','granted')); // asking is the chip's own test, above
  await page.evaluate(()=>{window.run=window.myr5Portal.open('up');});
  await page.waitForFunction(()=>document.querySelector('#mealsPanel.portal-shaped'),null,{timeout:30000});
  await page.evaluate(()=>window.run);
  await page.waitForFunction(()=>document.querySelector('#pyramidScanner canvas')&&!document.querySelector('#pyramidScanner[data-loading]'),null,{timeout:30000});
  await page.waitForTimeout(900);
  const fixed=()=>page.evaluate(()=>({clip:document.getElementById('mealsPanel').style.clipPath,face:document.getElementById('portalChrome').style.cssText})); // the cut
  const before=await fixed(),eye=()=>page.evaluate(async()=>{const {eye}=await import('/modules/portal/peer.mjs');return {...eye};});
  await tilt(page,0);await settled(page); // the baseline, caught at the first reading
  const shots=[];
  for(const [gamma,label] of [[-14,'left'],[0,'level'],[14,'right']]){
   await tilt(page,gamma);await settled(page);
   const e=await eye();
   if(gamma)assert.ok(Math.sign(e.x)===Math.sign(gamma)&&Math.abs(e.x)>.8,`gamma ${gamma}: the eye moves ${label} (${e.x})`);else assert.ok(Math.abs(e.x)<.1,`level: the eye is back in the middle (${e.x})`);
   await page.screenshot({path:resolve(FRAMES,`135-pyramid-tilt-${label}.png`)});
   shots.push(await page.screenshot({clip:{x:60,y:250,width:250,height:250}}));
  }
  assert.notDeepEqual(shots[0],shots[2],'the pyramid shows a different side at each tilt');
  assert.deepEqual(await fixed(),before,'the cut and the frame never move');
  await page.keyboard.press('Escape'); // R7: its Close is hidden while peered
  await quiltHome(page);
  assert.deepEqual(await eye(),{x:0,y:0},'the eye is off once the destination closes');
  // A flat menu (Reminders, through a line): the whole menu slides a few px behind the fixed frame.
  await page.evaluate(()=>{window.run=window.myr5Portal.open('line-rl');});
  await page.waitForFunction(()=>document.querySelector('#remindersPanel.portal-framed'),null,{timeout:30000});
  await page.evaluate(()=>window.run);await page.waitForTimeout(600);
  const left=()=>page.evaluate(()=>parseFloat(getComputedStyle(document.getElementById('remindersPanel')).getPropertyValue('--peer-x')||0)*3),rest=await left(); // portal-inset menus slide their content by --peer-x*3px (portal.css), not the dialog's own left
  await tilt(page,0);await settled(page);await tilt(page,20);await settled(page);
  const moved=await left()-rest;
  // R16/R17: a flat menu (Reminders) opens in the whole window like a page, not in a cut, so the tilt leaves it still.
  assert.equal(moved,0,`a flat menu no longer slides under tilt (${moved}px)`);
  await page.screenshot({path:resolve(FRAMES,'126-menu-vignette-depth.png')});
 }finally{await context.close();}
 const still=await openApp(browser,base,'reduce');
 try{
  const p=still.page;
  await p.evaluate(()=>window.myr5Portal.open('up'));
  await p.waitForFunction(()=>document.querySelector('#mealsPanel.portal-shaped'),null,{timeout:30000});
  await tilt(p,0);await settled(p);await tilt(p,14);await settled(p);
  assert.deepEqual(await p.evaluate(async()=>{const {eye}=await import('/modules/portal/peer.mjs');return {...eye};}),{x:0,y:0},'reduced motion: no look-around');
  assert.equal(await p.evaluate(()=>document.querySelectorAll('.portal-aura *').length>0&&document.getAnimations().filter(a=>a.effect?.target?.closest?.('.portal-aura')).length),0,'reduced motion: a still rim');
  await p.screenshot({path:resolve(FRAMES,'134-food-reduced-motion.png')});
 }finally{await still.context.close();}
});

test('#124 a line\'s glowing slit opens into a lens and the X opens its diamond, both on the short wormhole; the X then opens the War Room',{timeout:180000},async()=>{
 const {context,page}=await openApp(browser,base);
 try{
  await page.evaluate(()=>{const a=Element.prototype.animate;window.__anims=[];Element.prototype.animate=function(k,t){const x=a.call(this,k,t);window.__anims.push({el:this.id||this.getAttribute?.('class')||'',ms:t?.duration,x});return x;};});
  const PORTAL=await page.evaluate(async()=>(await import('/modules/portal/portal.mjs')).PORTAL);
  await page.evaluate(()=>{window.run=window.myr5Portal.open('line-lr');});
  await page.waitForFunction(()=>window.__anims.some(a=>a.el==='portal-bezel'),null,{timeout:20000,polling:16});
  const bezel=await page.evaluate(()=>{const b=window.__anims.find(a=>a.el==='portal-bezel');b.x.pause();b.x.currentTime=b.ms*.3;return b.ms;});
  assert.ok(Math.abs(bezel-PORTAL.cutMs*PORTAL.short)<1,`the slit opens over the short cut (${bezel} ms)`);
  await page.waitForTimeout(300);
  await page.screenshot({path:resolve(FRAMES,'124-line-mid-sequence.png')});
  await page.evaluate(()=>window.__anims.find(a=>a.el==='portal-bezel').x.play());
  await page.waitForFunction(()=>document.querySelector('.meditation-panel.portal-framed')?.open,null,{timeout:20000});
  const dive=await page.evaluate(()=>window.__anims.find(a=>a.el==='portalHome')?.ms);
  assert.ok(Math.abs(dive-PORTAL.revealMs*PORTAL.short)<1,`a line dives on the short reveal (${dive} ms)`);
  await page.evaluate(()=>window.run);
  // Landed (not mid-arrival): meditation occupies the phone in black and white.
  await page.waitForFunction(()=>{const d=document.querySelector('.meditation-panel'),c=getComputedStyle(d);return !d.classList.contains('portal-arriving')&&c.transform==='none'&&c.opacity==='1';},null,{timeout:30000});
  const med=await page.evaluate(()=>{const d=document.querySelector('.meditation-panel'),r=d.getBoundingClientRect();return {w:r.width,h:r.height,vw:innerWidth,vh:innerHeight,bg:getComputedStyle(d).backgroundColor};});
  assert.ok(Math.abs(med.w-(med.vw-30))<1&&Math.abs(med.h-(med.vh-30-88))<1&&med.bg==='rgb(0, 0, 0)',`Meditation fills the black face inside the 15px rail (${JSON.stringify(med)})`);
  await page.waitForTimeout(600);
  await page.screenshot({path:resolve(FRAMES,'127-meditation.png')});
  await page.locator('.meditation-panel [data-meditation-close]').click();
  await quiltHome(page);
  // Shown again under the reverse dive's scale, the trace canvas keeps its layout size (it used to shrink to the corner).
  assert.equal(await page.evaluate(()=>{const o=document.getElementById('portalOverlay');return o.width===Math.round(o.clientWidth*Math.min(devicePixelRatio||1,2));}),true,'the trace canvas is full size after a reverse dive');
  // The X: the diamond between its arms, held in its loading phase for a frame, then the dive. W2-2Q #148: the editor's one
  // door is the oval's ship, so the X lands on that arrival (the ship view, #select) instead of navigating.
  await page.evaluate(load=>{window.__anims.length=0;const st=window.setTimeout;window.setTimeout=(fn,ms,...r)=>{if(Math.abs(ms-load)<.5&&!window.__heldX){window.__heldX=()=>st(fn,0,...r);return 0;}return st(fn,ms,...r);};void window.myr5Portal.open('x');},PORTAL.loadMinMs*PORTAL.short);
  await page.waitForFunction(()=>window.__heldX&&document.querySelector('.portal-glass.gl'),null,{timeout:20000});
  const diamond=await page.evaluate(()=>{const g=document.querySelector('.portal-glass').getBoundingClientRect();return {w:g.width,h:g.height};});
  assert.ok(Math.abs(diamond.w-diamond.h)<3,`the X opens a square-on diamond (${JSON.stringify(diamond)})`);
  await page.waitForTimeout(600);
  await page.screenshot({path:resolve(FRAMES,'124-x-mid-sequence.png')});
  await page.evaluate(()=>window.__heldX());
  // e68b19f (25 Sept): the X now opens the War Room (a route that navigates to /war-room/), no longer the ship view.
  await page.waitForURL(/\/war-room\//,{timeout:30000});
 }finally{await context.close();}
});
