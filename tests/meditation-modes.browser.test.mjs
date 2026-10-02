// Rank 6c (D25/D28) at 390x844: both breathing modes -- start, hold, exit mid-hold, complete --
// driven through the real meditation.mjs/breathing.mjs source with a stub account API and a fake
// clock (the shared BreathingSession uses each mode's active duration). The server
// half of completion (completeBreathing + once-per-day circuit counting) is covered in
// tests/meditation-modes.test.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {resolve,extname,sep} from 'node:path';
import {chromium} from 'playwright';
import {buildScript} from '../breathing-modes.mjs';
const guidedScript=buildScript('wim-hof'),holdIndex=guidedScript.findIndex(phase=>phase.key==='optional-hold'),holdStart=guidedScript.slice(0,holdIndex).reduce((ms,phase)=>ms+phase.ms,0),holdMs=guidedScript[holdIndex].ms;

const PLAN=resolve('C:/Users/ianmy/Documents/Codex/2026-09-20/myr5-consolidated-implementation-and-stack-plan/worktrees/myr5-foundation/plan');
const SHOTS=resolve(PLAN,'reports/meditation'),WONDERS=resolve(PLAN,'assets-inbox/backgrounds/clean');
const PAGE=`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Meditation test</title>
<link rel="stylesheet" href="/launch.css"><link rel="stylesheet" href="/meditation.css"><body style="margin:0;background:#140d20"><footer class="crew-footer"></footer>
<script type="module">
import {mountMeditation} from '/meditation.mjs';
const account={user:{id:'A'},dataEpoch:1},calls=window.__calls=[];
const api=async path=>{calls.push(path);if(path.startsWith('/api/account'))return account;
 if(path==='/api/breathing/start')return {id:'ticket-'+calls.length,startedAt:Date.now(),durationMs:180000,targetAccountId:'A',dataEpoch:1};
 if(path==='/api/breathing/complete')return {combat:{breathingCompleted:true},targetAccountId:'A',dataEpoch:1};throw Error(path);};
const art=new URLSearchParams(location.search).has('art');
mountMeditation({api,getAccount:()=>account,backgroundLookup:art?async({path})=>'/__wonders__/'+path.split('/').pop():undefined});
window.__ready=true;
</script>`;
const TYPES={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.png':'image/png','.json':'application/json'};

async function serve(){
 const root=resolve('.');
 const server=createServer(async(req,res)=>{
  const path=decodeURIComponent(new URL(req.url,'http://local').pathname);
  if(path==='/__meditation__'){res.writeHead(200,{'Content-Type':'text/html'});res.end(PAGE);return;}
  try{
   const [base,rel]=path.startsWith('/__wonders__/')?[WONDERS,path.slice(12)]:[root,path];
   const file=resolve(base,'.'+rel);if(!file.startsWith(base+sep))throw Error();
   const body=await readFile(file);res.writeHead(200,{'Content-Type':TYPES[extname(file)]||'application/octet-stream'});res.end(body);
  }catch{res.writeHead(404);res.end();}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));return server;
}

const count=(page,path)=>page.evaluate(p=>window.__calls.filter(c=>c===p).length,path);
const phase=page=>page.locator('[data-breath-run]').getAttribute('data-phase');
const caption=page=>page.locator('.meditation-speech').textContent();
async function shot(page,name){await page.screenshot({path:`${SHOTS}/${name}.png`});}
async function reopenAfterStop(page){if(await page.locator('.meditation-panel').evaluate(d=>d.open))await page.locator('[data-meditation-close]').click();await page.locator('.meditation-entry').click();}
async function stopVisible(page){const box=await page.locator('[data-breath-exit]').boundingBox();assert.ok(box&&box.y>=0&&box.y+box.height<=844,'Circle exit must be on screen without scrolling');}

async function openRoom(browser,{art=true,reducedMotion='no-preference'}={}){
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion}),page=await context.newPage();
 await page.clock.install({time:new Date('2026-09-22T12:00:00Z')});
 await page.goto(`${base}/__meditation__${art?'?art':''}`);await page.waitForFunction(()=>window.__ready);
 await page.locator('.meditation-entry').click();await page.locator('.meditation-panel[open]').waitFor();
 if(art)await page.waitForFunction(()=>document.querySelector('.meditation-panel').classList.contains('has-wonder-art'));
 return {context,page};
}
async function start(page,mode){
 await page.locator(`[data-mode="${mode}"]`).click();if(mode==='wim-hof')await page.locator('[data-seated-accept]').click();
 await page.waitForFunction(expected=>document.querySelector('[data-status]').textContent===expected,mode==='wim-hof'?'3:30 remaining':'3:00 remaining');
 assert.equal(await page.locator('[data-breath-modes]').isHidden(),true);
}

let server,base,browser;
test.before(async()=>{await mkdir(SHOTS,{recursive:true});server=await serve();base='http://127.0.0.1:'+server.address().port;browser=await chromium.launch({channel:'msedge',headless:true});});
test.after(async()=>{await browser?.close();server?.close();});

test('no downloaded wonder: the bundled starter wonder for the day shows, with both mode cards on screen',async()=>{
 const {context,page}=await openRoom(browser,{art:false});
 await page.waitForFunction(()=>document.querySelector('.meditation-panel').classList.contains('has-wonder-art'));
 assert.equal(await page.locator('.meditation-panel').getAttribute('data-wonder'),'great-wall-of-china-a','2026-09-22 is starter day 0');
 for(const mode of ['wim-hof','tai-chi']){const box=await page.locator(`[data-mode="${mode}"]`).boundingBox();assert.ok(box.y+box.height<=844,mode+' card visible without scrolling');}
 await shot(page,'00-starter-choose');await context.close();
});

test('seated Wim Hof-style: seated-only notice before start, hold, exit mid-hold, then complete once',async()=>{
 assert.ok(existsSync(WONDERS),'clean wonder images present');
 const {context,page}=await openRoom(browser);
 assert.match(await page.locator('[data-mode="wim-hof"] .breath-seated-notice').textContent(),/seated or lying.*driving.*water/i);
 assert.match(await page.locator('.breath-note').textContent(),/not medical/);
 await shot(page,'01-wim-hof-choose');
 await start(page,'wim-hof');
 assert.match(await page.locator('[data-seated] .breath-seated-notice').textContent(),/seated or lying/);assert.equal(await phase(page),'settle');
 assert.match(await caption(page),/comfortable|shoulders/i,'original guidance starts with settling');
 await shot(page,'02-wim-hof-start');
 await page.clock.runFor(holdStart+1000); // scripted settling + breathing -> optional hold
 assert.equal(await phase(page),'optional-hold');assert.match(await page.locator('[data-phase-label]').textContent(),/Optional pause/);
 assert.match(await caption(page),/never force.*breathe normally/i,'optional hold guidance permits normal breathing');
 await stopVisible(page);await shot(page,'03-wim-hof-hold');
 await page.locator('[data-breath-exit]').click(); // exit mid-hold: immediate, no network wait
 assert.equal(await page.locator('[data-breath-modes]').isVisible(),true);assert.equal(await page.locator('[data-breath-run]').isHidden(),true);
 assert.equal(await caption(page),'Breathe in. Breathe out.','exit restores the idle caption');
 await page.clock.runFor(200000);assert.equal(await count(page,'/api/breathing/complete'),0,'an exited session never completes');
 await reopenAfterStop(page); // reopen after the completed cartoon exit
 await shot(page,'04-wim-hof-exited');
 await start(page,'wim-hof');await page.clock.runFor(211000);
 await page.waitForFunction(()=>/Breathing complete/.test(document.querySelector('[data-status]').textContent));
 assert.equal(await count(page,'/api/breathing/complete'),1);assert.equal(await phase(page),'complete');
 assert.equal(await page.locator('[data-breath-exit]').isVisible(),true,'the circle exit stays available after completion');
 await shot(page,'05-wim-hof-complete');await context.close();
});

test('tai chi stance: existing core/balance stance hold, stance link, exit mid-hold, then complete once',async()=>{
 const {context,page}=await openRoom(browser);
 assert.equal(await page.locator('[data-mode="tai-chi"] .breath-seated-notice').count(),0);
 await start(page,'tai-chi');
 assert.equal(await page.locator('[data-seated]').isHidden(),true);
 await page.clock.runFor(3000);
 assert.equal(await phase(page),'hold');assert.match(await page.locator('[data-phase-label]').textContent(),/Hold: Low tree pose/);
 assert.equal(await page.locator('[data-stance-link]').isVisible(),true);
 await shot(page,'06-tai-chi-start-hold');
 await page.clock.runFor(30000); // next stance
 assert.match(await page.locator('[data-phase-label]').textContent(),/Hold: Knee-lift balance/);
 await stopVisible(page);await shot(page,'07-tai-chi-hold-2');
 await page.locator('[data-breath-exit]').click();
 assert.equal(await page.locator('[data-breath-modes]').isVisible(),true);
 await page.clock.runFor(200000);assert.equal(await count(page,'/api/breathing/complete'),0);
 await reopenAfterStop(page);
 await start(page,'tai-chi');await page.clock.runFor(181000);
 await page.waitForFunction(()=>/Breathing complete/.test(document.querySelector('[data-status]').textContent));
 assert.equal(await count(page,'/api/breathing/complete'),1);
 await shot(page,'08-tai-chi-complete');await context.close();
});

test('always-visible exits and reduced motion: Close stays pinned when scrolled, Esc closes, breathing cue stays visible',async()=>{
 const {context,page}=await openRoom(browser,{reducedMotion:'reduce'});
 assert.equal(await page.locator('.breathing-ring').evaluate(el=>getComputedStyle(el).animationName),'none');
 await start(page,'wim-hof');
 await page.locator('.meditation-panel').evaluate(d=>d.scrollTo(0,d.scrollHeight));
 const close=await page.locator('[data-meditation-close]').boundingBox();assert.ok(close.y>=0&&close.y<80,'Close pinned at top after scrolling');
 await shot(page,'09-reduced-motion-scrolled');
 // Reduced motion: no per-breath flicker, but the caption still follows the hold and the recovery.
 assert.match(await caption(page),/comfortable|shoulders/i);
 await page.clock.runFor(holdStart+1000);assert.equal(await phase(page),'optional-hold');assert.match(await caption(page),/never force.*breathe normally/i);assert.equal(await page.locator('.breathing-ring').isVisible(),true);
 await page.clock.runFor(holdMs);assert.equal(await phase(page),'recovery');assert.match(await caption(page),/breathe|easy|gentl|stop|skip/i);
 await page.keyboard.press('Escape');
 assert.equal(await page.locator('.meditation-panel').evaluate(d=>d.open),false);
 await page.locator('.meditation-entry').click();
 assert.equal(await page.locator('[data-breath-modes]').isVisible(),true,'reopening starts fresh at mode choice');
 await context.close();
});
