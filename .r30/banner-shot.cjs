const {chromium}=require('playwright');
(async()=>{const url='https://myr5-coach-staging.mominc-coach.workers.dev';const b=await chromium.launch();const p=await b.newPage({viewport:{width:375,height:812},hasTouch:true});
const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto(url+'/',{waitUntil:'domcontentloaded'});await p.waitForTimeout(10000);
await p.evaluate(()=>window.myr5Vault.earn('history-open'));await p.waitForTimeout(1000);
await p.screenshot({path:'.r30/banner.png'});
const t=await p.evaluate(()=>document.querySelector('.vault-banner')?.innerText);
await p.waitForTimeout(5400);const op=await p.evaluate(()=>getComputedStyle(document.querySelector('.vault-banner')).opacity);await p.waitForTimeout(1500);
const hid=await p.evaluate(()=>getComputedStyle(document.querySelector('.vault-banner')).display);
await p.evaluate(()=>window.myr5Vault.reset());
// flyer music
await p.evaluate(()=>window.myr5Menus.battlePass());await p.waitForTimeout(1500);
await p.screenshot({path:'.r30/flyer.png'});
const m1=await p.evaluate(()=>window.myr5Music.state().want);
await p.evaluate(()=>document.querySelector('#battlePassPanel').close());await p.waitForTimeout(500);
const m2=await p.evaluate(()=>window.myr5Music.state().want);
console.log(JSON.stringify({t,op,hid,m1,m2,errs}));await b.close();})();
