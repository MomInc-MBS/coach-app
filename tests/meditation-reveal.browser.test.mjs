// R18 A3-A6 + R20 in a real browser: the colour circle pulses with the breath (out on each exhale to a growing peak, back to the
// character on each inhale, full colour at the end), the seated overlay holds the clock until Accept, the settle countdown ticks,
// the in/out cue never fades while speech bubbles do, and an early exit leaps the coach out before the dialog closes.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {chromium} from 'playwright';
import {GUIDED_ROUND_TIMING as G,buildScript,breathsDone,breathPhaseProgress,pulseRadius} from '../breathing-modes.mjs';

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

test('seated overlay holds the clock until Accept, then a settle countdown; the colour pulses out on exhale and back to the character on inhale',async()=>{
 const {context,page}=await room(),clock=()=>page.locator('[data-session-clock]').textContent();
 await page.locator('[data-begin]').click();await page.locator('[data-seated]').waitFor({state:'visible'});
 const before=await clock();await page.clock.runFor(5000);assert.equal(await clock(),before,'nothing ticks before Accept');
 await page.locator('[data-seated-accept]').click();await page.waitForTimeout(100);
 assert.ok(await page.locator('[data-seated]').evaluate(el=>el.classList.contains('fading')));
 await page.waitForTimeout(800);assert.equal(await page.locator('[data-seated]').isHidden(),true,'overlay removed after the fade');
 await page.clock.pauseAt(await page.evaluate(()=>Date.now()+20)); // from here only runFor moves the session clock
 const elapsed=()=>page.locator('[data-breath-run] progress').evaluate(b=>b.value),to=async ms=>{await page.clock.runFor(Math.max(0,Math.round(ms-await elapsed())));await page.waitForTimeout(150);};
 await to(1100);assert.notEqual(await clock(),before,'the clock runs after Accept');
 assert.equal(await page.locator('[data-settle-countdown] b').textContent(),'19','settle counts down');assert.equal(await r(page),0,'grey while settling');
 await to(6000);assert.equal(await page.locator('[data-settle-countdown] b').textContent(),'14');
 const geo=await page.locator('.meditation-grey').evaluate(el=>{const s=el.getBoundingClientRect(),c=document.querySelector('.meditation-character').getBoundingClientRect(),m=el.style,x=parseFloat(m.getPropertyValue('--cx')),y=parseFloat(m.getPropertyValue('--cy'));return {maxR:Math.hypot(Math.max(x,s.width-x),Math.max(y,s.height-y)),minR:Math.min(c.width,c.height)/2};});
 const script=buildScript('wim-hof'),cyc=G.inhaleMs+G.exhaleMs,expected=async()=>{const ms=await elapsed(),{breath,progress}=breathPhaseProgress(script,ms);return pulseRadius(breathsDone(script,ms),30,breath,progress,geo.maxR,geo.minR);};
 const cue=()=>page.locator('[data-breath-cue]').evaluate(el=>({text:el.hidden?'':el.textContent,opacity:+getComputedStyle(el).opacity,animations:el.getAnimations().length}));
 await to(G.settleMs+2*cyc+G.inhaleMs+G.exhaleMs-60);const early=await r(page);assert.ok(Math.abs(early-await expected())<1,`early exhale follows pulseRadius (${early})`);assert.ok(early>geo.minR,'the exhale reaches past the character');
 assert.deepEqual(await cue(),{text:'Breathe out',opacity:1,animations:0},'the out cue is steady');assert.equal(await page.locator('[data-settle-countdown]').isHidden(),true);
 await page.screenshot({path:'.frames/r20-reveal-early.png'});
 await to(G.settleMs+5*cyc+G.inhaleMs-60);const contracted=await r(page);assert.ok(Math.abs(contracted-geo.minR)<geo.minR*.05+1,`the inhale contracts back to the character (${contracted} vs ${geo.minR})`);
 assert.deepEqual(await cue(),{text:'Breathe in',opacity:1,animations:0},'the in cue is steady');
 await to(G.settleMs+15*cyc+G.inhaleMs+G.exhaleMs-60);const mid=await r(page);assert.ok(mid>early,'exhale peaks grow');await page.screenshot({path:'.frames/r20-reveal-mid.png'});
 await page.waitForTimeout(6000);assert.equal((await cue()).opacity,1,'the in/out cue never fades, even after the 5 s bubble time');
 await to(G.settleMs+28*cyc+G.inhaleMs+G.exhaleMs-60);const late=await r(page);assert.ok(late>mid&&late<geo.maxR,'late exhale peak larger still, short of full');
 assert.equal(await page.locator('.meditation-panel').evaluate(d=>d.classList.contains('meditation-colour')),false);
 await to(G.settleMs+G.breathMs+500);assert.ok(Math.abs(await r(page)-geo.maxR)<1,'the final exhale reaches the farthest corner');
 assert.ok(await page.locator('.meditation-panel').evaluate(d=>d.classList.contains('meditation-colour')),'full colour after the final breath');assert.equal((await cue()).text,'','the cue leaves with the breathing');
 await page.waitForTimeout(2800);await page.screenshot({path:'.frames/r20-reveal-full.png'});
 const panel=()=>page.locator('.breathing-session').evaluate(el=>+getComputedStyle(el).opacity);
 assert.ok(await panel()<.2,'the top panel is near-invisible after Accept');
 await page.clock.runFor(4100);const pb=await page.locator('[data-breath-pause]').boundingBox();await page.mouse.click(pb.x+pb.width/2,pb.y+pb.height/2);await page.waitForTimeout(900); // first tap on the faded Pause only reveals the panel
 assert.equal(await page.locator('.meditation-panel').evaluate(d=>d.classList.contains('breathing-paused')),false,'the revealing tap did not press Pause');
assert.equal(await panel(),1,'a tap brings the panel back');await page.locator('[data-breath-pause]').click();assert.equal(await page.locator('.meditation-panel').evaluate(d=>d.classList.contains('breathing-paused')),true,'once revealed, Pause works');
 await page.screenshot({path:'.frames/r20-panel-tap.png'});
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
 await page.locator('[data-begin]').click();await page.locator('[data-seated-accept]').click();await page.clock.runFor(3000);
 await page.locator('[data-breath-exit]').click();
 assert.equal(await page.locator('.meditation-panel').evaluate(d=>d.classList.contains('coach-leap')&&d.open),true);
 await page.evaluate(()=>document.getAnimations().filter(x=>['coach-leap','coach-drops'].includes(x.animationName)).forEach(x=>{x.pause();x.currentTime=350;})); // freeze the 700 ms leap at its midpoint
 assert.equal(await page.locator('.meditation-panel').evaluate(d=>d.open),true);await page.screenshot({path:'.frames/r20-leap-mid.png'});
 await page.clock.runFor(800);assert.equal(await page.locator('.meditation-panel').evaluate(d=>d.open),false,'dialog closes after the leap');
 await context.close();
});
