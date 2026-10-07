const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:375,height:812},hasTouch:true});
await p.goto('https://myr5-coach-staging.mominc-coach.workers.dev/',{waitUntil:'domcontentloaded'});await p.waitForTimeout(9000);
console.log(await p.evaluate(()=>({portal:typeof window.myr5Portal,up:document.getElementById('portalHome')?.hidden,routes:window.myr5Routes?.current?.()})));
await p.evaluate(async()=>{const {openQuiltPortal}=await import('/modules/portal/portal-entry.mjs');const pt=await openQuiltPortal();await pt.board('pond');pt.show();});await p.waitForTimeout(6000);
console.log(await p.evaluate(()=>({portal:typeof window.myr5Portal,up:document.getElementById('portalHome')?.hidden})));
await p.evaluate(()=>window.myr5Portal.secret('pond'));await p.waitForSelector('#portalVaultDoor',{timeout:15000}).catch(e=>console.log('nodoor'));await p.waitForTimeout(1500);
console.log(await p.evaluate(()=>({door:!!document.querySelector('#portalVaultDoor'),earned:Object.keys(window.myr5Vault.state().earned)})));
await p.screenshot({path:'.r30/door.png'});await b.close();})();
