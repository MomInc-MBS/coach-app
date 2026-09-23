import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {build} from 'esbuild';
import {chromium} from 'playwright';
import {generateKeyPairSync} from 'node:crypto';

test('account refresh preserves mounted packs, clearing fences listeners, and full-download pause keeps saved progress',async()=>{
 const trust=generateKeyPairSync('ed25519').publicKey.export({format:'jwk'});
 const bundles=await Promise.all(['post-download.mjs','coach-profile.mjs'].map(entry=>build({entryPoints:[entry],bundle:true,write:false,format:'esm',target:'es2022',define:{__MYR5_MATERIAL_PUBLIC_JWK__:JSON.stringify(trust)}})));
 const server=createServer((req,res)=>{
  const index=['/download.js','/profile.js'].indexOf(req.url);
  if(index>=0){res.setHeader('Content-Type','text/javascript');res.end(bundles[index].outputFiles[0].text);return;}
  if(req.url==='/'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><dialog id="host"></dialog>');return;}
  res.writeHead(503);res.end();
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage();await page.goto('http://127.0.0.1:'+server.address().port);
  await page.evaluate(async()=>{
   const MB=1048576;window.saved=0;window.blocked=false;
   window.myr5AuthenticatedAccount={user:{id:'owner-a'}};window.coachEntitlements={coachArmy:{status:'completed',completedAt:1}};window.myr5VerifiedOptionalAccess=true;
   Object.defineProperty(navigator,'serviceWorker',{value:{controller:{postMessage(_message,ports){ports[0].postMessage({cache:'test',total:300*MB,remaining:(75-window.saved)*MB,missing:[{url:'/first.bin',bytes:8*MB},{url:'/second.bin',bytes:67*MB}]});}}}});
   Object.defineProperty(navigator,'storage',{value:{estimate:async()=>({}),persist:async()=>true}});
   Object.defineProperty(window,'caches',{value:{open:async()=>({put:async()=>{window.saved+=8;}})}});
   const originalFetch=window.fetch;window.fetch=async(url,options)=>{
    if(url==='/first.bin')return new Response('saved');
    if(url==='/second.bin'){window.blocked=true;return new Promise((_resolve,reject)=>options.signal.addEventListener('abort',()=>reject(new DOMException('paused','AbortError')),{once:true}));}
    return originalFetch(url,options);
   };
   const {mountPostDownload}=await import('/download.js');mountPostDownload({host:document.getElementById('host')});
  });
  await page.waitForFunction(()=>document.querySelector('.post-download-sections'));
  assert.equal(await page.evaluate(()=>{
   const panel=document.querySelector('.post-download-sections');window.myr5AuthenticatedAccount={user:{id:'owner-a'},progress:{completedSets:3}};
   window.dispatchEvent(new CustomEvent('myr5:account-ready',{detail:window.myr5AuthenticatedAccount}));return panel===document.querySelector('.post-download-sections');
  }),true,'parent bridge must retain the same pack panel across account polling');
  await page.waitForFunction(()=>document.querySelector('.full-download-settings [data-toggle]').textContent.startsWith('Download'));
  await page.evaluate(()=>document.querySelector('.full-download-settings [data-toggle]').click());
  await page.waitForFunction(()=>blocked);
  const before=await page.locator('.full-download-bar [data-bytes]').textContent();assert.equal(before,'233 MB of 300 MB');
  await page.evaluate(()=>document.querySelector('.full-download-bar [data-toggle]').click());
  await page.waitForFunction(()=>document.querySelector('.full-download-bar [data-text]').textContent==='Download paused.');
  assert.equal(await page.locator('.full-download-bar [data-bytes]').textContent(),before,'verified saved bytes remain counted after Pause');
  assert.deepEqual(await page.evaluate(async()=>{
   const {clearCoachAccount}=await import('/profile.js');let observed;
   window.addEventListener('myr5:account-cleared',()=>{observed={account:window.myr5AuthenticatedAccount,entitlements:window.coachEntitlements,optional:window.myr5VerifiedOptionalAccess,state:document.documentElement.dataset.publicState};},{once:true});
   clearCoachAccount();return observed;
  }),{account:null,entitlements:null,optional:false,state:'locked'},'clear listeners must observe revoked account state synchronously');
  assert.equal(await page.locator('.post-download-sections').count(),0);
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
});
