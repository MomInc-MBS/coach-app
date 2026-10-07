// node .r28/staging-drop.cjs [tier] — play a drop pod on the deployed staging build at 375x812, tap it when ready, screenshot, report phase + page errors.
const {chromium}=require('playwright');
const tier=process.argv[2]||'secret';
(async()=>{
 const b=await chromium.launch();const p=await b.newPage({viewport:{width:375,height:812},deviceScaleFactor:2});
 const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push('console: '+m.text());});
 await p.goto('https://myr5.mominc.online/',{waitUntil:'load'});await p.waitForTimeout(4000);
 await p.evaluate(t=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());
  import('/drop-pod-opening.mjs').then(m=>m.playDropPod({tier:t,open:async()=>[{title:'Staging Check unlocked!',detail:'Texture for your coach',colors:[]}],hasNext:()=>false,onExit:()=>{window.__exited=true;}}));},tier);
 const phase=()=>p.evaluate(()=>document.querySelector('dialog.drop-pod')?.dataset.phase);
 const ready=await p.waitForFunction(()=>document.querySelector('dialog.drop-pod')?.classList.contains('ready'),null,{timeout:25000}).then(()=>true,()=>false);
 await p.screenshot({path:`.r28/staging-${tier}-ready.png`});
 await p.click('[data-hit]',{force:true});
 const log=[];for(let i=0;i<20;i++){await p.waitForTimeout(1000);log.push(await phase());if(log.at(-1)==='reveal')break;}
 await p.waitForTimeout(1200);await p.screenshot({path:`.r28/staging-${tier}-reveal.png`});
 const exit=await p.click('[data-exit]',{timeout:5000,force:true}).then(()=>'ok',e=>e.message.split('\n')[0]);await p.waitForTimeout(800);
 console.log(JSON.stringify({tier,ready,phases:log,exit,exited:await p.evaluate(()=>window.__exited===true&&!document.querySelector('dialog.drop-pod[open]')),errors:errs.slice(0,8)}));
 await b.close();
})();
