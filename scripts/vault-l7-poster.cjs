// Renders pod/worlds/vault/door-poster.webp (a still of the closed door, <=120 KB): node scripts/vault-l7-poster.cjs
const {chromium}=require('../node_modules/playwright'),{spawn}=require('node:child_process'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),PORT=process.env.MYR5_VAULT_PORT||8907;
(async()=>{
 const srv=spawn(process.execPath,[path.join(__dirname,'vault-l7-preview.cjs')],{env:{...process.env,MYR5_VAULT_PORT:PORT},stdio:'ignore'});await new Promise(r=>setTimeout(r,800));
 const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']}),page=await(await b.newContext({viewport:{width:375,height:812},deviceScaleFactor:2})).newPage();
 try{
  await page.goto('http://127.0.0.1:'+PORT+'/');await page.waitForFunction(()=>window.ready,null,{timeout:90000});await page.waitForTimeout(2500);
  const tl=await page.evaluate(()=>vault.projectWorld(-.67,.67,.03)),br=await page.evaluate(()=>vault.projectWorld(.67,-.67,.03));
  const png=await page.screenshot({clip:{x:tl.x,y:tl.y,width:br.x-tl.x,height:br.y-tl.y}});
  const b64=await page.evaluate(async d=>{const bm=await createImageBitmap(await (await fetch('data:image/png;base64,'+d)).blob()),c=document.createElement('canvas');c.width=bm.width;c.height=bm.height;c.getContext('2d').drawImage(bm,0,0);
   for(const q of [.82,.7,.55]){const blob=await new Promise(r=>c.toBlob(r,'image/webp',q));if(blob.size<=115000||q===.55){const u=new Uint8Array(await blob.arrayBuffer());let s='';for(let i=0;i<u.length;i+=8192)s+=String.fromCharCode(...u.subarray(i,i+8192));return btoa(s);}}},png.toString('base64'));
  const out=path.join(root,'pod/worlds/vault/door-poster.webp');fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,Buffer.from(b64,'base64'));console.log(out,fs.statSync(out).size,'bytes');
 }finally{await b.close();srv.kill();}
})().catch(e=>{console.error(e);process.exit(1)});
