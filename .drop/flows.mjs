import {chromium} from 'playwright';
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=d3d11']});
const mk=async(reduced)=>{const ctx=await browser.newContext({viewport:{width:375,height:812},deviceScaleFactor:2,hasTouch:true,isMobile:true,reducedMotion:reduced?'reduce':'no-preference'});const page=await ctx.newPage();page.errs=[];page.on('pageerror',e=>page.errs.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!/404/.test(m.text()))page.errs.push(m.text())});return page;};
const ph=p=>p.evaluate(()=>document.querySelector('.drop-pod')?.dataset.phase??'gone');
// reduced motion: starts landed, ready quickly
let p=await mk(true);await p.goto('http://127.0.0.1:5391/drop-harness.html?tier=rare&next=1');await p.evaluate(()=>window.start());
await p.waitForFunction(()=>document.querySelector('.drop-pod.ready'),null,{timeout:8000});console.log('reduced ready, phase',await ph(p));
await p.screenshot({path:'.drop/rare-r-landed.png'});
await p.locator('.drop-pod-hit').click();await p.waitForFunction(()=>document.querySelector('.drop-pod')?.dataset.phase==='reveal',null,{timeout:8000});console.log('reduced reveal');await p.waitForTimeout(1200);await p.screenshot({path:'.drop/rare-r-reveal.png'});
console.log('focus',await p.evaluate(()=>document.activeElement?.textContent));
// open another -> restarts sky with next tier (rare), then Escape = exit
await p.locator('[data-next]').click();await p.waitForTimeout(600);console.log('after next phase',await ph(p),'tier',await p.evaluate(()=>document.querySelector('.drop-pod').dataset.tier));
await p.keyboard.press('Escape');await p.waitForTimeout(300);console.log('after escape',await ph(p),'exited',await p.evaluate(()=>window.exited),'canvas',await p.evaluate(()=>document.querySelectorAll('canvas').length));console.log('errs',p.errs);
// skip from sky
p=await mk(false);await p.goto('http://127.0.0.1:5391/drop-harness.html?tier=legendary&next=1');await p.evaluate(()=>window.start());
await p.waitForFunction(()=>window.ctl?.world?.t>.4);await p.locator('[data-skip]').click();
const t0=Date.now();await p.waitForFunction(()=>document.querySelector('.drop-pod')?.dataset.phase==='reveal',null,{timeout:8000});console.log('skip->reveal ms',Date.now()-t0,'openCalls',await p.evaluate(()=>window.openCalls));await p.waitForTimeout(1500);await p.screenshot({path:'.drop/legendary-skip-reveal.png'});
await p.locator('[data-exit]').click();await p.waitForTimeout(200);console.log('exit',await ph(p),await p.evaluate(()=>window.exited));console.log('errs',p.errs);
// failure retry
p=await mk(false);await p.goto('http://127.0.0.1:5391/drop-harness.html?tier=uncommon');await p.evaluate(()=>{window.fail=true;});
await p.evaluate(()=>{import('/drop-pod-opening.mjs').then(m=>{let n=0;m.playDropPod({tier:'uncommon',hasNext:false,open:async()=>{n++;window.n=n;return n<2?null:[{title:'X',detail:'y',colors:[]}]},onExit(){}}).then(c=>window.ctl=c)})});
await p.waitForFunction(()=>document.querySelector('.drop-pod.ready'),null,{timeout:12000});await p.locator('.drop-pod-hit').click();await p.waitForTimeout(500);
console.log('after fail phase',await ph(p),'err',await p.evaluate(()=>document.querySelector('[data-error]').textContent),'ready',await p.evaluate(()=>document.querySelector('.drop-pod').classList.contains('ready')));
await p.locator('.drop-pod-hit').click();await p.waitForFunction(()=>document.querySelector('.drop-pod')?.dataset.phase==='reveal',null,{timeout:8000});console.log('retry ok, calls',await p.evaluate(()=>window.n));console.log('errs',p.errs);
await browser.close();
