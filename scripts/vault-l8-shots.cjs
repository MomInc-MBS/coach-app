const {server,PORT}=require('./vault-l8-preview.cjs'),{chromium}=require('playwright'),out=require('node:path').resolve(__dirname,'../.vault/shots/');
(async()=>{await new Promise(r=>server.listen(PORT,'127.0.0.1',r));const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const p=await (await b.newContext({viewport:{width:375,height:812},hasTouch:true,deviceScaleFactor:2})).newPage();const errs=[];p.on('console',m=>m.type()==='error'&&errs.push(m.text()));p.on('pageerror',e=>errs.push(String(e)));
const shot=n=>p.screenshot({path:out+'/l8-'+n+'.png'}),dbg=()=>p.evaluate(()=>myr5Hall.debug()),wait=ms=>p.waitForTimeout(ms),S=k=>6*(k+1)-4.8;
await p.goto(`http://127.0.0.1:${PORT}/?debug`);await p.waitForFunction(()=>window.go,null,{timeout:15000}).catch(()=>console.log(errs));
const ids=await p.evaluate(async()=>{const g=await import('/modules/vault/vault-goals.mjs');return g.GOALS.map(x=>x.id);});console.log('goals',ids.length,ids.at(-1));
console.log('pre-errs',JSON.stringify(errs));await p.evaluate(()=>{myr5Vault.reset();window.go();});
await p.waitForFunction(()=>window.myr5Hall,null,{timeout:30000}).catch(()=>console.log('nohall',JSON.stringify(errs)));for(const [n,t] of [['25',.8],['50',1.6],['75',2.4]]){await p.evaluate(t=>myr5Hall.at(t),t);await wait(500);await shot('1-transition-'+n);}await p.evaluate(()=>myr5Hall.at(-1));await wait(3500);await shot('2-start');
await p.evaluate(s=>myr5Hall.go(s),S(0));await wait(5000);console.log(JSON.stringify(await dbg()));await shot('3-locked-card');
await p.evaluate(id=>myr5Vault.earn(id),ids[0]);await wait(250);await shot('4a-earn-sweep');await wait(1800);await shot('4-earned-card');
console.log('pack btn',await p.evaluate(()=>!!document.querySelector('[data-pack]')));
if(await p.$('[data-pack]')){await p.click('[data-pack]');await wait(1200);await shot('4b-pack-opened');}
for(const k of [1,2,3]){await p.evaluate(s=>myr5Hall.jump(s),S(k));await wait(1800);await shot('5-statue'+(k+1));}
await p.evaluate(()=>myr5Hall.jump(6*40));await wait(2500);console.log(JSON.stringify(await dbg()));await shot('6-far');
console.log('errors',JSON.stringify(errs));await b.close();server.close();})();
