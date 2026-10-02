// R18 A3-A6 in a real browser: the colour circle grows with completed breaths (grey -> partial -> full), the seated overlay holds the
// clock until Accept, speech bubbles fade, and an early exit leaps the coach out before the dialog closes. Screenshots go to .frames/.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {chromium} from 'playwright';
import {GUIDED_ROUND_TIMING as G} from '../breathing-modes.mjs';

const PAGE=`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/launch.css"><link rel="stylesheet" href="/meditation.css"><body style="margin:0;background:#140d20">
<section id="view"><div id="coachMount"></div></section><footer class="crew-footer"></footer><script src="/pod/gala-avatar.js"></script>
<script type="module">import {mountMeditation} from '/meditation.mjs';const account={user:{id:'A'},dataEpoch:1};
const api=async p=>p.startsWith('/api/account')?account:p==='/api/breathing/start'?{id:'t',startedAt:Date.now(),durationMs:180000,targetAccountId:'A',dataEpoch:1}:{combat:{breathingCompleted:true},targetAccountId:'A',dataEpoch:1};
mountMeditation({api,getAccount:()=>account});window.__ready=true;</script>`;
const TYPES={'.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp'};
let browser,server,base;
test.before(async()=>{
 const root=resolve('.');await mkdir('.frames',{recursive:true});
 server=createServer(async(req,res)=>{const path=decodeURIComponent(new URL(req.url,'http://l').pathname);
  if(path==='/__room__'){res.writeHead(200,{'Content-Type':'text/html'});return res.end(PAGE);}
  if(path.startsWith('/api/')){res.writeHead(401);return res.end('{}');}
  try{const f=resolve(root,'.'+path);if(!f.startsWith(root+sep))throw 0;const body=await readFile(f);res.writeHead(200,{'Content-Type':TYPES[extname(f)]||'application/octet-stream'});res.end(body);}catch{res.writeHead(404);res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({channel:'msedge',headless:true});
});
test.after(async()=>{await browser?.close();server?.closeAllConnections();server?.close();});

async function room(){
 const context=await browser.newContext({viewport:{width:375,height:812}}),page=await context.newPage();
 await page.clock.install({time:new Date('2026-09-22T12:00:00Z')});
 await page.goto(base+'/__room__');await page.waitForFunction(()=>window.__ready);
 await page.locator('.meditation-entry').click();await page.locator('.meditation-panel[open]').waitFor();
 await page.waitForFunction(()=>document.querySelector('.meditation-panel').classList.contains('has-wonder-art'));
 return {context,page};
}
const r=page=>page.locator('.meditation-grey').evaluate(el=>parseFloat(getComputedStyle(el).getPropertyValue('--reveal-r')));
const settle=page=>page.waitForTimeout(1500); // CSS transitions run on the real clock, not the faked one

test('seated overlay holds the clock until Accept, then fades out and is removed; the colour circle grows 0 / 50 / 100%',async()=>{
 const {context,page}=await room(),clock=()=>page.locator('[data-session-clock]').textContent();
 await page.locator('[data-mode="wim-hof"]').click();await page.locator('[data-seated]').waitFor({state:'visible'});
 await page.screenshot({path:'.frames/r18-seated-overlay.png'});
 const before=await clock();await page.clock.runFor(5000);assert.equal(await clock(),before,'nothing ticks before Accept');
 await page.locator('[data-seated-accept]').click();await page.waitForTimeout(100);
 assert.ok(await page.locator('[data-seated]').evaluate(el=>el.classList.contains('fading')));
 await page.waitForTimeout(800);assert.equal(await page.locator('[data-seated]').isHidden(),true,'overlay removed after the fade');
 await page.clock.runFor(1000);assert.notEqual(await clock(),before,'the clock runs after Accept');
 assert.equal(await page.locator('.meditation-panel').evaluate(d=>d.classList.contains('meditation-colour')),false,'no colour at the start');
 await settle(page);const r0=await r(page);assert.equal(r0,0);await page.screenshot({path:'.frames/r18-reveal-0.png'});
 // 15 of 30 breaths done
 await page.clock.runFor(G.settleMs+15*(G.inhaleMs+G.exhaleMs)-1000-1000+50);await settle(page);
 const r50=await r(page);await page.screenshot({path:'.frames/r18-reveal-50.png'});
 const max=await page.locator('.meditation-grey').evaluate(el=>{const s=el.getBoundingClientRect(),m=el.style,x=parseFloat(m.getPropertyValue('--cx')),y=parseFloat(m.getPropertyValue('--cy'));return Math.hypot(Math.max(x,s.width-x),Math.max(y,s.height-y));});
 assert.ok(Math.abs(r50-max/2)<max/30+1,`about half at 15/30 (${r50} of ${max})`);
 assert.equal(await page.locator('.meditation-panel').evaluate(d=>d.classList.contains('meditation-colour')),false);
 await page.clock.runFor(G.breathMs-15*(G.inhaleMs+G.exhaleMs)+500);await settle(page);await page.waitForTimeout(2800);
 assert.ok(await page.locator('.meditation-panel').evaluate(d=>d.classList.contains('meditation-colour')),'full colour at the final breath');
 await page.screenshot({path:'.frames/r18-reveal-100.png'});
 const panel=()=>page.locator('.breathing-session').evaluate(el=>+getComputedStyle(el).opacity);
 assert.ok(await panel()<.2,'the top panel is near-invisible after Accept');
 await page.mouse.click(187,500);await page.waitForTimeout(900);assert.equal(await panel(),1,'a tap brings the panel back');
 await page.screenshot({path:'.frames/r18-panel-tap.png'});
 await context.close();
});

test('speech bubble fades in, holds ~4 s, fades out',async()=>{
 const {context,page}=await room();const op=()=>page.locator('.meditation-speech').evaluate(el=>+getComputedStyle(el).opacity);
 await page.locator('.meditation-character').evaluate(el=>el.click());await page.waitForTimeout(250);assert.ok(await op()<1,'fading in');
 await page.waitForTimeout(1500);assert.equal(await op(),1,'held at full opacity');
 await page.waitForTimeout(1500);assert.equal(await op(),1,'still held after ~3 s');
 await page.waitForTimeout(2500);assert.equal(await op(),0,'faded out');
 await context.close();
});

test('early exit: the coach leaps for ~700 ms, then the dialog closes; nothing saved',async()=>{
 const {context,page}=await room();
 await page.locator('[data-mode="tai-chi"]').click();await page.clock.runFor(3000);
 await page.locator('[data-breath-exit]').click();
 assert.equal(await page.locator('.meditation-panel').evaluate(d=>d.classList.contains('coach-leap')&&d.open),true);
 await page.evaluate(()=>document.getAnimations().filter(x=>['coach-leap','coach-drops'].includes(x.animationName)).forEach(x=>{x.pause();x.currentTime=350;})); // freeze the 700 ms leap at its midpoint
 assert.equal(await page.locator('.meditation-panel').evaluate(d=>d.open),true);await page.screenshot({path:'.frames/r18-leap-mid.png'});
 await page.clock.runFor(800);assert.equal(await page.locator('.meditation-panel').evaluate(d=>d.open),false,'dialog closes after the leap');
 await context.close();
});
