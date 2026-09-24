import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {extname,resolve,sep} from 'node:path';
import {chromium} from 'playwright';

const root=resolve(import.meta.dirname,'..');
function startServer(){
 const server=createServer(async(req,res)=>{
  const pathname=new URL(req.url,'http://local').pathname;
  if(pathname==='/'){
   res.writeHead(200,{'Content-Type':'text/html'});
   res.end('<!doctype html><body><script type="module">import {openAchievements} from "/achievements-board.mjs";window.openBoard=openAchievements;</script></body>');return;
  }
  if(pathname==='/battle-pass.mjs'){
   res.writeHead(200,{'Content-Type':'text/javascript'});
   res.end('export const selectedTracks=()=>new Set(["chest"]);export const loadProgress=()=>({});');return;
  }
  const file=resolve(root,'.'+decodeURIComponent(pathname));
  if(file!==root&&!file.startsWith(root+sep)){res.writeHead(403);res.end();return;}
  try{
   const type=extname(file)==='.json'?'application/json':extname(file)==='.css'?'text/css':'text/javascript';
   const contents=await readFile(file);res.writeHead(200,{'Content-Type':type});res.end(contents);
  }catch{res.writeHead(404);res.end();}
 });
 return new Promise(resolveListen=>server.listen(0,'127.0.0.1',()=>resolveListen(server)));
}

test('opening the board mounts three depth layers, transparent and code-only',async()=>{
 const server=await startServer();let browser;
 try{
  browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage();
  await page.goto('http://127.0.0.1:'+server.address().port+'/');
  await page.waitForFunction(()=>window.openBoard);
  const layers=await page.evaluate(()=>{
   window.openBoard();
   return [...document.querySelectorAll('[data-depth]')].map(el=>{
    const cs=getComputedStyle(el);
    return {tag:el.tagName,depth:el.dataset.depth,peer:el.dataset.peerDepth,bg:cs.backgroundColor,bgImage:cs.backgroundImage};
   });
  });
  assert.equal(layers.length,3);
  assert.deepEqual(layers.map(l=>l.depth).sort(),['far','mid','near']);
  for(const l of layers){
   assert.equal(l.bg,'rgba(0, 0, 0, 0)',`${l.depth} layer has no background colour`);
   assert.equal(l.bgImage,'none',`${l.depth} layer has no background image`);
   assert.equal(l.peer,l.depth,'2N reads data-peer-depth for tilt/drag parallax on any destination');
  }
 }finally{await browser?.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
});

test('zooming a boss moves each depth layer by a different amount; the boss button keeps its own box',async()=>{
 const server=await startServer();let browser;
 try{
  browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage();
  await page.goto('http://127.0.0.1:'+server.address().port+'/');
  await page.waitForFunction(()=>window.openBoard);
  const r=await page.evaluate(()=>{
   window.openBoard();
   const btn=document.querySelector('.ach-boss[data-id="strider-1"]');
   const before={left:btn.style.left,top:btn.style.top,width:btn.style.width,height:btn.style.height};
   btn.click();
   const after={left:btn.style.left,top:btn.style.top,width:btn.style.width,height:btn.style.height};
   const t=sel=>document.querySelector(sel).style.transform;
   return {before,after,art:t('.ach-art'),bosses:t('.ach-bosses'),far:t('[data-depth=far]'),mid:t('[data-depth=mid]'),near:t('[data-depth=near]')};
  });
  assert.deepEqual(r.before,r.after,"the button's own box (left/top/width/height) never moves — only its parent's transform does");
  assert.ok(r.art&&r.art===r.bosses,'art and boss tap targets share the exact same transform (tap targets stay glued to the art)');
  assert.notEqual(r.far,r.mid);assert.notEqual(r.mid,r.near);assert.notEqual(r.far,r.near);
  assert.notEqual(r.far,r.art,'depth layers parallax differently from the unscaled art/boss transform');
 }finally{await browser?.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
});

test('reduced motion schedules no animation frames',async()=>{
 const server=await startServer();let browser;
 try{
  browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage();
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.addInitScript(()=>{
   window.__rafCalls=0;const raf=window.requestAnimationFrame.bind(window);
   window.requestAnimationFrame=(...args)=>{window.__rafCalls++;return raf(...args);};
  });
  await page.goto('http://127.0.0.1:'+server.address().port+'/');
  await page.waitForFunction(()=>window.openBoard);
  await page.evaluate(()=>window.openBoard());
  await page.waitForTimeout(200);
  assert.equal(await page.evaluate(()=>window.__rafCalls),0,'no rAF is scheduled under prefers-reduced-motion');
 }finally{await browser?.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
});
