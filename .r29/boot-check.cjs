const {chromium}=require('playwright');
(async()=>{const url=process.argv[2];const b=await chromium.launch();const p=await b.newPage({viewport:{width:375,height:812},hasTouch:true});
const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
await p.goto(url+'/?vault=1',{waitUntil:'domcontentloaded'});await p.waitForTimeout(12000);
await p.screenshot({path:'.r29/'+(url.includes('staging')?'staging':'prod')+'-vault-boot.png'});
const st=await p.evaluate(()=>({vault:!!document.querySelector('#vaultPanel, [id*=vault]'),myr5Vault:typeof window.myr5Vault}));
console.log(JSON.stringify({st,errs:errs.slice(0,10)}));await b.close();})();
