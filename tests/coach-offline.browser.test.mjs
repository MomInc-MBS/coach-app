// Run with the dev server up: COACH_DEV_PORT=5242 node scripts/dev.mjs, then BASE=http://localhost:5242 node tests/coach-offline.browser.test.mjs
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const BASE=process.env.BASE||'http://localhost:5242',SHOT=process.env.SHOT||'';
const browser=await chromium.launch(),context=await browser.newContext({viewport:{width:375,height:812}}),page=await context.newPage();
await page.goto(BASE+'/pose.html');
await page.evaluate(()=>{HTMLDialogElement.prototype.showModal=function(){};document.querySelectorAll('#coachSetupGate').forEach(g=>{g.hidden=true;g.style.display='none';});});
await page.evaluate(async()=>{window.__coachMod=await import('/coach.mjs?fresh='+Date.now());});
const run=text=>page.evaluate(async t=>{const m=window.__coachMod;const caps=[],modes=[];const v=new m.CoachVoice(c=>caps.push(c),x=>modes.push(x));v.robot.context={state:'running',decodeAudioData:async()=>({length:1,numberOfChannels:1}),createBufferSource:()=>({connect(){},disconnect(){},start(){queueMicrotask(()=>this.onended());}}),destination:{}};v.robot.unlock=()=>true;
 const t0=performance.now();await v.say(t);return {caps,modes,ms:Math.round(performance.now()-t0)};},text);
const reqs=[];page.on('request',r=>{if(r.url().includes('/voice/'))reqs.push(r.url());});
await context.setOffline(true);
const off=await run('Ready. Begin.');
assert.ok(off.caps.includes('Ready. Begin.'),'caption shown offline');assert.ok(off.ms<2000,'no long wait offline: '+off.ms);assert.match(off.modes.at(-1),/Offline/);
if(SHOT)await page.screenshot({path:SHOT+'-offline.png'});
await context.setOffline(false);
// the 'online' event clears the cooldown; the next cue reaches the network again
await page.evaluate(()=>window.dispatchEvent(new Event('online')));
const before=reqs.length;await run('Round complete. Well done.');
assert.ok(reqs.length>before,'online again: voice request went to the network');
console.log('ok',JSON.stringify({offlineMs:off.ms,mode:off.modes.at(-1)}));
await browser.close();
