const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:375,height:812}});
await p.goto('https://myr5-coach-staging.mominc-coach.workers.dev/arcade/tub-flight/',{waitUntil:'domcontentloaded'});await p.waitForTimeout(2000);
const c=p.locator('canvas');console.log(await c.getAttribute('aria-label'));
for(let i=0;i<40;i++){await p.locator('[data-flap]').click({force:true}).catch(()=>{});await p.waitForTimeout(i<2?100:380);const l=await c.getAttribute('aria-label');if(i%5==0)console.log(i,l);}
await b.close();})();
