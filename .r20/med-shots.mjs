// R20 meditation screenshots at 375x812 into .frames/r20-med-*.png (local fixture, stub API, fake clock).
import {createServer} from 'node:http';import {readFile,mkdir} from 'node:fs/promises';import {resolve,extname,sep} from 'node:path';import {chromium} from 'playwright';
import {GUIDED_ROUND_TIMING as G} from '../breathing-modes.mjs';
const PAGE=`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/launch.css"><link rel="stylesheet" href="/meditation.css"><body style="margin:0;background:#140d20">
<section id="view"><div id="coachMount"></div></section><footer class="crew-footer"></footer><script src="/pod/gala-avatar.js"></script>
<script type="module">import {mountMeditation} from '/meditation.mjs';const account={user:{id:'A'},dataEpoch:1};
const api=async p=>p.startsWith('/api/account')?account:p==='/api/breathing/start'?{id:'t',startedAt:Date.now(),durationMs:180000,targetAccountId:'A',dataEpoch:1}:{combat:{breathingCompleted:true},targetAccountId:'A',dataEpoch:1};
mountMeditation({api,getAccount:()=>account});window.__ready=true;</script>`;
const TYPES={'.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp'},root=resolve('.');
await mkdir('.frames',{recursive:true});
const server=createServer(async(req,res)=>{const path=decodeURIComponent(new URL(req.url,'http://l').pathname);
 if(path==='/__room__'){res.writeHead(200,{'Content-Type':'text/html'});return res.end(PAGE);}
 if(path.startsWith('/api/')){res.writeHead(401);return res.end('{}');}
 try{const f=resolve(root,'.'+path);if(!f.startsWith(root+sep))throw 0;const body=await readFile(f);res.writeHead(200,{'Content-Type':TYPES[extname(f)]||'application/octet-stream'});res.end(body);}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({channel:'msedge',headless:true}),page=await (await browser.newContext({viewport:{width:375,height:812}})).newPage();
await page.clock.install({time:new Date('2026-09-22T12:00:00Z')});await page.goto(base+'/__room__');await page.waitForFunction(()=>window.__ready);
await page.locator('.meditation-entry').click();await page.waitForFunction(()=>document.querySelector('.meditation-panel').classList.contains('has-wonder-art'));await page.waitForTimeout(800);await page.clock.pauseAt(new Date('2026-09-22T12:10:00Z'));
const r=()=>page.locator('.meditation-grey').evaluate(el=>getComputedStyle(el).getPropertyValue('--reveal-r'));
const shot=async n=>{await page.waitForTimeout(250);await page.screenshot({path:`.frames/r20-med-${n}.png`});console.log(n,await page.locator('[data-breath-run] progress').evaluate(b=>b.value),await r(),await page.locator('[data-breath-cue]').evaluate(e=>e.hidden?'-':e.textContent));};
const cyc=G.inhaleMs+G.exhaleMs,to=async ms=>{const now=await page.locator('[data-breath-run] progress').evaluate(b=>b.value);await page.clock.runFor(Math.max(0,Math.round(ms-now)));};
await shot('1-start');
await page.locator('[data-begin]').click();await page.locator('[data-seated]').waitFor();await shot('2-warning');
await page.locator('[data-seated-accept]').click();await page.waitForTimeout(800);await to(4000);await shot('3-settle');
await to(G.settleMs+2*cyc+G.inhaleMs+G.exhaleMs-60);await shot('4-early-exhale-peak');
await to(G.settleMs+5*cyc+G.inhaleMs-60);await shot('5-inhale-contraction');
await to(G.settleMs+27*cyc+G.inhaleMs+G.exhaleMs-60);await shot('6-late-exhale-peak');
await to(G.settleMs+G.breathMs+1500);await page.waitForTimeout(2800);await shot('7-full-colour');
await browser.close();server.close();
