import {chromium} from 'playwright';
const tier=process.argv[2]||'uncommon',mode=process.argv[3]||'normal',base='http://127.0.0.1:5391/drop-harness.html?tier='+tier+(process.argv[4]?'&next=1':'');
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=d3d11']});
const ctx=await browser.newContext({viewport:{width:375,height:812},deviceScaleFactor:2,hasTouch:true,isMobile:true,reducedMotion:mode==='reduced'?'reduce':'no-preference'});
const page=await ctx.newPage();const logs=[];page.on('console',m=>{if(m.type()!=='debug')logs.push(m.type()+': '+m.text())});page.on('pageerror',e=>logs.push('PAGEERROR '+e.message));
await page.goto(base);await page.waitForTimeout(500);
const shot=async name=>{await page.screenshot({path:`.drop/${tier}-${name}.png`});console.log('shot',name);};
const until=sec=>page.waitForFunction(s=>window.ctl&&window.ctl.world&&window.ctl.world.t>=s,sec,{polling:30,timeout:30000});
await page.evaluate(()=>window.start());
const c={uncommon:{sky:.5,f:[1.8,2.7],land:3.25,steam:5.6},rare:{sky:.6,f:[2.2,3.0],land:3.55,steam:6.4},legendary:{sky:1.0,f:[3.2,4.4],land:4.95,steam:7.6}}[tier];
if(mode==='normal'){
 await until(c.sky);await shot('1-sky');
 await until(c.f[0]);await shot('2-fall-a');
 await until(c.f[1]);await shot('2-fall-b');
 await until(c.land);await shot('3-impact');
 await until(c.steam);await shot('4-landed-steam');
 console.log('ready',await page.evaluate(()=>document.querySelector('.drop-pod').className));
 await page.locator('.drop-pod-hit').click();
 await page.waitForTimeout(450);await shot('5-rattle');
 await page.waitForTimeout(650);await shot('5-opened');
 await page.waitForTimeout(900);await shot('5-opened-b');
 await page.waitForTimeout(2800);await shot('6-reveal');
}else{
 await page.waitForTimeout(1800);await shot('r-landed');
 await page.locator('.drop-pod-hit').click();await page.waitForTimeout(3500);await shot('r-reveal');
}
console.log(JSON.stringify(await page.evaluate(()=>({phase:document.querySelector('.drop-pod')?.dataset.phase,open:window.openCalls,fs:!!document.fullscreenElement}))));
console.log(logs.filter(l=>!/404/.test(l)).slice(0,15).join('\n'));
await browser.close();
