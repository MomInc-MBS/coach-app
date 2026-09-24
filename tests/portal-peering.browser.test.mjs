// W2-2N (Ian 23 Sept), in the real app at 375x812 against `npm run build`:
// #134 a vignetted energy in the portal's shape runs round an open destination, never covering it; #131 the triangles,
// the diamond and the oval open in their cut with the quilt kept as the wall, step in to the whole window and fizzle
// shut; #132 the rim carries the name; #135 tilt looks round the scene behind the window while the cut stays put;
// #124 the lines and the X run a short wormhole; release 5's open item: switching routes from the bar while a
// destination is framed moves the frame to the next page, no reverse dive behind it. Frames land in .frames/ (untracked).
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
  if(path.startsWith('/api/')){res.writeHead(path==='/api/auth/config'?200:401,{'Content-Type':'application/json'});res.end(JSON.stringify(path==='/api/auth/config'?{enabled:false}:{error:'Sign in'}));return;}
  try{const file=resolve(root,'.'+(path==='/'?'/pose.html':path));if(!file.startsWith(root+sep))throw Error();const body=await readFile(file);res.writeHead(200,{'Content-Type':TYPES[extname(file)]||'application/octet-stream'});res.end(body);}catch{res.writeHead(404);res.end();}
 });
}
async function openApp(browser,base,reducedMotion='no-preference'){
 const context=await browser.newContext({viewport:{width:375,height:812},serviceWorkers:'block',reducedMotion});
 await context.addInitScript(()=>{Object.defineProperty(navigator,'standalone',{configurable:true,value:true});try{localStorage.setItem('myr5.portalHintShown','1');}catch{}});
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

const SHAPED=[['up','#mealsPanel','FOOD','food'],['down','.ach-board','ACHIEVEMENTS','achievements'],['vdiamond','#accountPanel','LEADERBOARD','leaderboard'],['oval','dialog.ship-view','CHOOSE WORKOUT','ship']];
test('#134 #131 #132: Food, Achievements, Leaderboard and the ship open in their cut, the energy in the portal\'s shape round them and the name on the rim, never covering the menu',{timeout:300000},async()=>{
 const {context,page}=await openApp(browser,base);
 try{
  for(const [id,sel,name,frame] of SHAPED){
   await page.evaluate(id=>{window.run=window.myr5Portal.open(id);},id);
   await page.waitForFunction(sel=>document.querySelector(sel)?.open&&document.querySelector(sel).classList.contains('portal-shaped'),sel,{timeout:30000});
   await page.evaluate(()=>window.run);
   await page.waitForTimeout(900);
   const s=await page.evaluate(sel=>{
    const d=document.querySelector(sel),aura=document.querySelector('#portalChrome .portal-aura'),text=aura?.querySelector('.portal-aura-name'),t=text?.getBoundingClientRect();
    return {quilt:!document.getElementById('portalHome').hidden,chrome:document.getElementById('portalChrome').matches(':popover-open'),clip:d.style.clipPath,shaped:aura?.classList.contains('shaped'),
     name:text?.textContent,nameAt:t&&[t.left+t.width/2,t.top+t.height/2],taps:[aura,...aura.querySelectorAll('*')].every(el=>getComputedStyle(el).pointerEvents==='none'),
     flowing:[...aura.querySelectorAll('.portal-aura-fire')].every(el=>el.getAnimations({subtree:true}).some(a=>a.playState==='running')),hash:location.hash};
   },sel);
   assert.equal(s.quilt,true,`${id}: the quilt stays on as the wall`);
   assert.equal(s.chrome,true,`${id}: the metal frame is up`);
   assert.match(s.clip,/^path\(/,`${id}: the destination is clipped to the cut`);
   assert.equal(s.shaped,true,`${id}: the energy runs round the cut`);
   assert.equal(s.name,name,`${id}: the rim carries the name`);
   assert.equal(s.taps,true,`${id}: nothing in the energy takes a pointer`);
   assert.equal(s.flowing,true,`${id}: the neons flow round the rim`);
   assert.equal(await inside(page,sel,s.nameAt),false,`${id}: the name sits outside the window, not over the menu`);
   const middle=await page.evaluate(()=>{const p=document.querySelector('.portal-aura').style;return [parseFloat(p.getPropertyValue('--cx')),parseFloat(p.getPropertyValue('--cy'))];});
   assert.equal(await reaches(page,sel,middle),true,`${id}: the menu is reachable through the middle of the cut`);
   assert.equal(await barTappable(page),true,`${id}: the bar stays tappable`);
   await page.screenshot({path:resolve(FRAMES,`134-${frame}.png`)});
   if(id==='up'){
    // #131 step in: the cut opens out to the whole window (the Food panel's own Close, behind the wall until now, is in
    // reach), then steps back to the triangle.
    const close=await page.evaluate(()=>{const r=document.querySelector('#mealsPanel [data-close]').getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2];});
    assert.equal(await reaches(page,'#mealsPanel [data-close]',close),false,'Food\'s own Close sits behind the wall');
    await page.locator('#mealsPanel [data-peer-lean]').click();
    await page.waitForTimeout(900);
    assert.equal(await reaches(page,'#mealsPanel [data-close]',close),true,'stepped in, the whole window is in reach');
    assert.equal(await page.evaluate(()=>document.querySelector('.portal-aura').classList.contains('shaped')),false,'the energy follows the window');
    await page.screenshot({path:resolve(FRAMES,'131-food-step-in.png')});
    await page.locator('#mealsPanel [data-peer-lean]').click();
    await page.waitForTimeout(900);
    assert.equal(await reaches(page,'#mealsPanel [data-close]',close),false,'stepped back to the triangle');
   }
   // #130/#131: ✕ fizzles the hole shut (the shell falls into the core over the wormhole) and the quilt heals.
   await page.locator(`${sel} [data-peer-close]`).click();
   await page.waitForFunction(()=>document.querySelector('.portal-ghost')&&document.querySelector('.portal-glass'),null,{timeout:20000,polling:16});
   if(id==='up')await page.screenshot({path:resolve(FRAMES,'131-food-fizzle.png')});
   await quiltHome(page);
   assert.equal(await page.evaluate(()=>document.getAnimations().some(a=>a.effect?.target?.id==='portalHome')),false,`${id}: no reverse dive`);
  }
 }finally{await context.close();}
});

test('release 5: switching routes from the bar while a destination is framed moves the frame to the next page, with no reverse dive behind it',{timeout:180000},async()=>{
 const {context,page}=await openApp(browser,base);
 try{
  await page.evaluate(()=>{const animate=Element.prototype.animate;window.__dives=0;Element.prototype.animate=function(k,t){if(this.id==='portalHome'&&t?.direction==='reverse')window.__dives++;return animate.call(this,k,t);};});
  await page.evaluate(()=>{window.run=window.myr5Portal.open('up');});
  await page.waitForFunction(()=>document.querySelector('#mealsPanel.portal-shaped'),null,{timeout:30000});
  await page.evaluate(()=>window.run);
  for(const [route,sel,name] of [['reminders','#remindersPanel','REMINDERS'],['history','#historyPanel','HISTORY']]){
   await page.locator(`#coachDock [data-route="${route}"]`).click();
   await page.waitForFunction(([route,sel])=>document.querySelector(sel)?.open&&location.hash==='#'+route,[route,sel],{timeout:10000});
   await page.waitForTimeout(700);
   const s=await page.evaluate(sel=>({framed:document.querySelector(sel).classList.contains('portal-framed'),shaped:document.querySelector(sel).classList.contains('portal-shaped'),chrome:document.getElementById('portalChrome').matches(':popover-open'),
    quilt:!document.getElementById('portalHome').hidden,glass:!!document.querySelector('.portal-glass'),open:document.querySelectorAll('dialog[open]').length,name:document.querySelector('.portal-aura-name')?.textContent,dives:window.__dives}),sel);
   assert.deepEqual(s,{framed:true,shaped:false,chrome:true,quilt:false,glass:false,open:1,name,dives:0},`#${route}: framed in the whole window, nothing playing behind it`);
   assert.equal(await barTappable(page),true);
   await page.screenshot({path:resolve(FRAMES,`r5-switch-to-${route}.png`)});
  }
  await page.goBack();
  await quiltHome(page);
 }finally{await context.close();}
});

test('#135 tilt looks round the pyramid through the triangle (the cut stays put), flat menus slide a little, reduced motion stays still',{timeout:240000},async()=>{
 const tilt=(page,gamma,beta=50)=>page.evaluate(([g,b])=>{for(let i=0;i<3;i++)dispatchEvent(new DeviceOrientationEvent('deviceorientation',{alpha:0,beta:b,gamma:g}));},[gamma,beta]);
 const settled=page=>page.waitForTimeout(1200);
 const {context,page}=await openApp(browser,base);
 try{
  await page.evaluate(()=>{window.run=window.myr5Portal.open('up');});
  await page.waitForFunction(()=>document.querySelector('#mealsPanel.portal-shaped'),null,{timeout:30000});
  await page.evaluate(()=>window.run);
  await page.waitForFunction(()=>document.querySelector('#pyramidScanner canvas')&&!document.querySelector('#pyramidScanner[data-loading]'),null,{timeout:30000});
  await page.waitForTimeout(900);
  const fixed=()=>page.evaluate(()=>({clip:document.getElementById('mealsPanel').style.clipPath,face:document.getElementById('portalChrome').style.cssText}));
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
  await page.locator('#mealsPanel [data-peer-close]').click();
  await quiltHome(page);
  assert.deepEqual(await eye(),{x:0,y:0},'the eye is off once the destination closes');
  // A flat menu (Reminders, through a line): the whole menu slides a few px behind the fixed frame.
  await page.evaluate(()=>{window.run=window.myr5Portal.open('line-rl');});
  await page.waitForFunction(()=>document.querySelector('#remindersPanel.portal-framed'),null,{timeout:30000});
  await page.evaluate(()=>window.run);await page.waitForTimeout(600);
  const left=()=>page.evaluate(()=>parseFloat(getComputedStyle(document.getElementById('remindersPanel')).left)),rest=await left(); // its box, not the arrival's scale
  await tilt(page,0);await settled(page);await tilt(page,20);await settled(page);
  const moved=await left()-rest;
  assert.ok(moved>2&&moved<=4.01,`a flat menu slides a third of the scenes' range (${moved}px)`);
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

test('#124 a line\'s glowing slit opens into a lens and the X opens its diamond, both on the short wormhole; the X then dives and navigates',{timeout:180000},async()=>{
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
  await page.evaluate(()=>window.run);await page.waitForTimeout(900);
  await page.screenshot({path:resolve(FRAMES,'127-meditation.png')});
  await page.locator('.meditation-panel [data-meditation-close]').click();
  await quiltHome(page);
  // Shown again under the reverse dive's scale, the trace canvas keeps its layout size (it used to shrink to the corner).
  assert.equal(await page.evaluate(()=>{const o=document.getElementById('portalOverlay');return o.width===Math.round(o.clientWidth*Math.min(devicePixelRatio||1,2));}),true,'the trace canvas is full size after a reverse dive');
  // The X: the diamond between its arms, held in its loading phase for a frame, then the dive and the page change.
  await page.evaluate(load=>{window.__anims.length=0;const st=window.setTimeout;window.setTimeout=(fn,ms,...r)=>{if(Math.abs(ms-load)<.5&&!window.__heldX){window.__heldX=()=>st(fn,0,...r);return 0;}return st(fn,ms,...r);};void window.myr5Portal.open('x');},PORTAL.loadMinMs*PORTAL.short);
  await page.waitForFunction(()=>window.__heldX&&document.querySelector('.portal-glass.gl'),null,{timeout:20000});
  const diamond=await page.evaluate(()=>{const g=document.querySelector('.portal-glass').getBoundingClientRect();return {w:g.width,h:g.height};});
  assert.ok(Math.abs(diamond.w-diamond.h)<3,`the X opens a square-on diamond (${JSON.stringify(diamond)})`);
  await page.waitForTimeout(600);
  await page.screenshot({path:resolve(FRAMES,'124-x-mid-sequence.png')});
  await page.evaluate(()=>window.__heldX());
  await page.waitForFunction(()=>window.__anims.some(a=>a.el==='portalHome'),null,{timeout:10000,polling:16}).catch(()=>{}); // the dive, before the page goes
  await page.waitForURL('**/creature/index.html*',{timeout:30000});
 }finally{await context.close();}
});
