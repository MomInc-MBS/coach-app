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

// Root cause of the "âœ¦ LEVEL 1" mojibake: achievements-board.css stored the level-row icon (li::before)
// as a raw multi-byte UTF-8 character. A JS module's source text is always parsed as UTF-8 per spec (which
// is why the em dashes and middots in the reward text never broke), but a CSS file's encoding falls back
// through @charset -> a BOM -> the HTTP response's charset -> the referring document's charset -> UTF-8 —
// a page that never declares a charset anywhere corrupts any raw multi-byte literal in its CSS. The fix
// (content:'\2726', a CSS numeric escape that is pure ASCII in the source) must hold even under that exact
// adversarial condition, which this server deliberately reproduces.
function startServerNoCharset(){
 const server=createServer(async(req,res)=>{
  const pathname=new URL(req.url,'http://local').pathname;
  if(pathname==='/'){
   res.writeHead(200,{'Content-Type':'text/html'}); // no charset param, and no <meta charset> below either
   res.end('<!doctype html><head><link rel=stylesheet href=/achievements-board.css></head><body><script type="module">import {openAchievements} from "/achievements-board.mjs";window.openBoard=openAchievements;</script></body>');
   return;
  }
  if(pathname==='/battle-pass.mjs'){
   res.writeHead(200,{'Content-Type':'text/javascript'});
   res.end('export const selectedTracks=()=>new Set(["chest"]);export const loadProgress=()=>({});');
   return;
  }
  const file=resolve(root,'.'+decodeURIComponent(pathname));
  if(file!==root&&!file.startsWith(root+sep)){res.writeHead(403);res.end();return;}
  try{
   const type=extname(file)==='.json'?'application/json':extname(file)==='.css'?'text/css':extname(file)==='.ttf'?'font/ttf':extname(file)==='.jpg'?'image/jpeg':'text/javascript'; // no charset param anywhere, on purpose
   const contents=await readFile(file);res.writeHead(200,{'Content-Type':type});res.end(contents);
  }catch{res.writeHead(404);res.end();}
 });
 return new Promise(resolveListen=>server.listen(0,'127.0.0.1',()=>resolveListen(server)));
}

test('the level-row icon never mojibakes, even when the page declares no charset at all',async()=>{
 const server=await startServerNoCharset();let browser;
 try{
  browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage();
  await page.goto('http://127.0.0.1:'+server.address().port+'/');
  await page.waitForFunction(()=>window.openBoard);
  const r=await page.evaluate(()=>{
   window.openBoard();
   document.querySelector('.ach-boss:not([disabled])').click();
   const li=document.querySelector('.ach-detail li');
   return {icon:getComputedStyle(li,'::before').content,detailText:document.querySelector('.ach-detail').textContent};
  });
  const mojibake=/[ÃÂâð]/;
  assert.doesNotMatch(r.icon,mojibake,`level-row icon glyph mojibaked: ${r.icon}`);
  assert.doesNotMatch(r.detailText,mojibake,'no mojibake anywhere in the zoomed detail text');
 }finally{await browser?.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
});
