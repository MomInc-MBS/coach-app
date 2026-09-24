// #149 (D46) at 375x812: the black-and-white meditation room. Three data-peer-depth layers (far wonder, mid big sleeping
// coach, near seated character) that start grayscale and peer by depth on drag; a full session brings the colour back and
// the coach walks off; "Stop now" wakes it, it smacks you, the wormhole hook runs and the room closes. The room runs from
// source against a stub coach card + window.myr5Creature; the last test checks the real viewer's preview() from dist/client.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {resolve,extname,sep} from 'node:path';
import {chromium} from 'playwright';

const DOG='roster/18-quad-all--robotic_dog_3d_model';
const PAGE=`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Meditation scene test</title>
<link rel="stylesheet" href="/launch.css"><link rel="stylesheet" href="/meditation.css"><body style="margin:0;background:#140d20">
<section id="view"><div id="coachMount"><aside class="myr5-companion-card"><div class="myr5-companion-stage"></div><span class="myr5-companion-status">MYR5</span></aside></div></section><footer class="crew-footer"></footer>
<script src="/pod/gala-avatar.js"></script>
<script type="module">
import {mountMeditation} from '/meditation.mjs';
const q=new URLSearchParams(location.search),account={user:{id:'A'},dataEpoch:1},calls=window.__calls=[],creature=window.__creature=[];
const log=name=>(...args)=>{creature.push([name,...args]);};
window.myr5Creature={play:log('play'),walk:log('walk'),face:log('face'),stage:log('stage'),sleep:log('sleep'),stats:()=>({stage:'pod'}),
 preview:async parts=>{creature.push(['preview',parts]);return !(parts&&q.has('nobody'));}};
if(q.has('portal'))window.myr5Portal={playWormhole:async options=>{creature.push(['wormhole',options]);}};
const api=async path=>{calls.push(path);if(path.startsWith('/api/account'))return account;
 if(path==='/api/breathing/start')return {id:'ticket-'+calls.length,startedAt:Date.now(),durationMs:180000,targetAccountId:'A',dataEpoch:1};
 if(path==='/api/breathing/complete')return {combat:{breathingCompleted:true},targetAccountId:'A',dataEpoch:1};throw Error(path);};
mountMeditation({api,getAccount:()=>account});
window.__ready=true;
</script>`;
const TYPES={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.png':'image/png','.json':'application/json','.glb':'model/gltf-binary'};

// root: the worktree (source) or dist/client (the published viewer). block: a path that answers 503, like sw.js offline.
async function serve(root,{page=PAGE,block=null}={}){
 const server=createServer(async(req,res)=>{
  const path=decodeURIComponent(new URL(req.url,'http://local').pathname);
  if(path==='/__room__'){res.writeHead(200,{'Content-Type':'text/html'});res.end(page);return;}
  if(path.startsWith('/api/')){res.writeHead(401,{'Content-Type':'application/json'});res.end('{"error":"Sign in"}');return;}
  if(block&&path===block){res.writeHead(503);res.end();return;}
  try{const file=resolve(root,'.'+path);if(!file.startsWith(root+sep))throw Error();const body=await readFile(file);res.writeHead(200,{'Content-Type':TYPES[extname(file)]||'application/octet-stream'});res.end(body);}
  catch{res.writeHead(404);res.end();}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));return {server,base:'http://127.0.0.1:'+server.address().port};
}

let browser,room;
test.before(async()=>{room=await serve(resolve('.'));browser=await chromium.launch({channel:'msedge',headless:true});});
test.after(async()=>{await browser?.close();room?.server.close();});

async function openRoom({reducedMotion='no-preference',query=''}={}){
 const context=await browser.newContext({viewport:{width:375,height:812},reducedMotion}),page=await context.newPage();
 await page.clock.install({time:new Date('2026-09-22T12:00:00Z')});
 await page.goto(`${room.base}/__room__${query}`);await page.waitForFunction(()=>window.__ready);
 await page.locator('.meditation-entry').click();await page.locator('.meditation-panel[open]').waitFor();
 await page.waitForFunction(()=>document.querySelector('.meditation-panel').classList.contains('has-wonder-art'));
 await page.waitForFunction(()=>window.__creature.some(([name])=>name==='preview'));
 return {context,page};
}
const layers=page=>page.locator('[data-peer-depth]').evaluateAll(els=>els.map(el=>({depth:el.dataset.peerDepth,filter:getComputedStyle(el).filter,x:getComputedStyle(el).translate})));
const creature=page=>page.evaluate(()=>window.__creature);
const called=(log,name,...args)=>log.some(([n,...a])=>n===name&&JSON.stringify(a)===JSON.stringify(args));
async function drag(page,dx){
 const box=await page.locator('.meditation-stage').boundingBox(),x=box.x+box.width/2,y=box.y+box.height/3;
 await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+dx,y,{steps:4});
 const seen=await layers(page);await page.mouse.up();return Object.fromEntries(seen.map(l=>[l.depth,l.x==='none'?0:parseFloat(l.x)]));
}
async function start(page,mode){
 await page.locator(`[data-mode="${mode}"]`).click();
 await page.waitForFunction(()=>document.querySelector('[data-status]').textContent==='3:00 remaining');
}

test('open: three black-and-white peering layers, the big meditation coach borrowed asleep; drag peers by depth; close hands it back',async()=>{
 const {context,page}=await openRoom();
 const open=await layers(page);
 assert.deepEqual(open.map(l=>l.depth),['far','mid','near']);
 for(const l of open)assert.match(l.filter,/^grayscale\(1\)/,l.depth+' starts black and white');
 assert.equal(await page.locator('.meditation-coach .myr5-companion-card').count(),1,'the live coach card sits in the mid layer');
 assert.equal(await page.evaluate(()=>document.body.dataset.shipView),'true','pod.mjs leaves a borrowed card alone');
 const log=await creature(page);
 for(const call of [['stage','overlay'],['sleep',true],['preview',{body:DOG,headFrom:DOG,armsFrom:DOG,feetFrom:DOG}]])assert.ok(called(log,...call),JSON.stringify(call));
 assert.equal(await page.locator('.meditation-speech').textContent(),'Breathe in. Breathe out.');
 const moved=await drag(page,80);
 assert.ok(moved.near>moved.mid&&moved.mid>moved.far&&moved.far>0,`near moves most, far least: ${JSON.stringify(moved)}`);
 assert.ok(moved.near<=24,'the peering stays slight');
 await page.locator('[data-meditation-close]').click();
 await page.waitForFunction(()=>!!document.querySelector('#coachMount > .myr5-companion-card')); // the card goes home on close
 assert.equal(await page.evaluate(()=>document.body.dataset.shipView),'');
 const after=await creature(page);assert.ok(called(after,'preview',null)&&called(after,'sleep',false),'saved recipe back, awake');
 await context.close();
});

test('reduced motion: dragging never moves the layers; an unavailable coach body says the user\'s own coach sleeps in',async()=>{
 const {context,page}=await openRoom({reducedMotion:'reduce',query:'?nobody'});
 assert.deepEqual(await drag(page,80),{far:0,mid:0,near:0});
 await page.waitForFunction(()=>/your own coach is sleeping in/.test(document.querySelector('.meditation-speech').textContent));
 await context.close();
});

test('a full session: colour returns to every layer, then the coach wakes, turns and walks off; Done does not smack',async()=>{
 const {context,page}=await openRoom();
 await start(page,'tai-chi');await page.clock.runFor(181000);
 await page.waitForFunction(()=>/Breathing complete/.test(document.querySelector('[data-status]').textContent));
 assert.ok(await page.locator('.meditation-panel').evaluate(d=>d.classList.contains('meditation-colour')));
 await page.waitForFunction(()=>[...document.querySelectorAll('[data-peer-depth]')].every(el=>getComputedStyle(el).filter==='grayscale(0)'),null,{timeout:6000});
 await page.clock.runFor(2600);
 const log=await creature(page);
 for(const call of [['sleep',false],['face',Math.PI/2],['walk',true]])assert.ok(called(log,...call),JSON.stringify(call));
 assert.ok(await page.locator('.meditation-panel').evaluate(d=>d.classList.contains('coach-wander')));
 await page.locator('[data-breath-exit]').click(); // "Done"
 assert.equal(await page.locator('.meditation-panel').evaluate(d=>d.open&&!d.classList.contains('smacked')),true);
 await context.close();
});

test('Stop now: the coach wakes, lunges and smacks, the wormhole hook runs outward, and the room closes',async()=>{
 const {context,page}=await openRoom({query:'?portal'});
 await start(page,'wim-hof');await page.clock.runFor(5000);
 await page.locator('[data-breath-exit]').click();
 const log=await creature(page);assert.ok(called(log,'sleep',false)&&called(log,'play','encourage'),'onEarlyExit woke the coach');
 assert.ok(await page.locator('.meditation-panel').evaluate(d=>d.classList.contains('coach-lunge')));
 await page.clock.runFor(300);assert.ok(await page.locator('.meditation-panel').evaluate(d=>d.classList.contains('smacked')));
 await page.clock.runFor(500);
 await page.waitForFunction(()=>!document.querySelector('.meditation-panel').open);
 const wormhole=(await creature(page)).find(([name])=>name==='wormhole');assert.equal(wormhole?.[1]?.direction,'out');
 assert.equal(await page.evaluate(p=>window.__calls.filter(c=>c===p).length,'/api/breathing/complete'),0,'nothing saved');
 await context.close();
});

test('real viewer: preview() shows a temporary body without writing myr5-recipe-v1, and falls back when the body cannot load',{skip:!existsSync('dist/client/creature/assets/phone.js')&&'needs npm run build (serves dist/client)'},async()=>{
 const fixture='<div id="view" style="width:400px;height:500px"></div><script type="module" src="/creature/assets/phone.js"></script>';
 const run=async(block,check)=>{
  const {server,base}=await serve(resolve('dist/client'),{page:fixture,block});const context=await browser.newContext();
  try{const page=await context.newPage();await page.goto(base+'/__room__');
   await page.waitForFunction(()=>document.querySelector('.myr5-companion-card')?.dataset.ready==='true',null,{timeout:120000});
   await check(page);}finally{await context.close();server.close();}
 };
 const storage=page=>page.evaluate(()=>JSON.stringify(Object.entries(localStorage).sort()));
 await run(null,async page=>{
  const before=await storage(page);
  assert.equal(await page.evaluate(dog=>myr5Creature.preview({body:dog,headFrom:dog,armsFrom:dog,feetFrom:dog}),DOG),true);
  assert.equal(await page.evaluate(()=>myr5Creature.stats().recipe.body),DOG);
  await page.evaluate(()=>myr5Creature.sleep(true));
  assert.equal(await page.evaluate(()=>localStorage.getItem('myr5-recipe-v1')),null,'preview never saves');assert.equal(await storage(page),before);
  assert.equal(await page.evaluate(()=>myr5Creature.preview(null)),true);assert.equal(await page.evaluate(()=>myr5Creature.stats().recipe.body),'myr5');
 });
 await run(`/creature/models/${DOG}.glb`,async page=>{
  assert.equal(await page.evaluate(dog=>myr5Creature.preview({body:dog,headFrom:dog,armsFrom:dog,feetFrom:dog}),DOG),false,'offline without the optional body');
  await page.waitForFunction(()=>document.querySelector('.myr5-companion-card').dataset.ready==='true'&&myr5Creature.stats().recipe.body==='myr5',null,{timeout:60000});
 });
});
