const {chromium,devices}=require('playwright');(async()=>{const b=await chromium.launch({args:['--use-gl=angle']});const ctx=await b.newContext({...devices['Pixel 7']});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('https://myr5-coach-staging.mominc-coach.workers.dev/?board=cogs',{waitUntil:'load'});await p.waitForTimeout(12000);
await p.screenshot({path:'.r22/staging-cogs-pixel.png'});
const info=await p.evaluate(()=>({art:document.querySelector('#portalHome')?.dataset.art,canvases:document.querySelectorAll('#portalHome canvas').length,title:document.title,dialogs:[...document.querySelectorAll('dialog[open]')].map(d=>d.id)}));
console.log(JSON.stringify({info,errs:errs.slice(0,5)}));await b.close();})();
