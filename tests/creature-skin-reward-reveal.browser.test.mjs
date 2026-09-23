import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {chromium} from 'playwright';

test('creature-skin grants queue a dismissible, reduced-motion-safe notice and clean up with account lifecycle',async()=>{
 const modulePath=resolve('creature-skin-reward-reveal.mjs'),launchSource=await readFile(resolve('launch.mjs'),'utf8');
 assert.match(launchSource,/mountCreatureSkinRewardReveal/,'the notice is mounted by the main Coach entry');
 const requests=[];
 const server=createServer(async(req,res)=>{
  const path=new URL(req.url,'http://local').pathname;requests.push(path);
  if(path==='/test.html'){res.writeHead(200,{'Content-Type':'text/html'});res.end('<!doctype html><meta name="viewport" content="width=device-width"><script type="module">window.myr5AuthenticatedAccount={user:{id:"owner-a"},dataEpoch:2};const{mountCreatureSkinRewardReveal}=await import("/creature-skin-reward-reveal.mjs");window.rewardNotice=mountCreatureSkinRewardReveal();window.dispatchRewards=granted=>window.dispatchEvent(new CustomEvent("myr5:battle-pass",{detail:{granted}}));</script>');return;}
  if(path==='/creature-skin-reward-reveal.mjs'){res.writeHead(200,{'Content-Type':'text/javascript'});res.end(await readFile(modulePath));return;}
  res.writeHead(404);res.end();
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage();await page.emulateMedia({reducedMotion:'reduce'});await page.goto('http://127.0.0.1:'+server.address().port+'/test.html');
  await page.waitForFunction(()=>window.dispatchRewards);
  const forged=[
   {kind:'creature-skin',id:'creature-starforged-plate',name:'Starforged Plate',collection:'creature-forged-realms'},
   {kind:'creature-skin',id:'creature-shellborn',name:'Shellborn',collection:'creature-forged-realms'},
  ],celestial=[{kind:'creature-skin',id:'creature-celestial-mosaic',name:'Celestial Mosaic',collection:'creature-celestial-rift'}];
  await page.evaluate(items=>{dispatchRewards(items);dispatchRewards(items);dispatchRewards([{kind:'ship',id:'ship-supportive',name:'Supportive'}]);},forged);
  const card=page.locator('.creature-skin-reward');await card.waitFor();
  assert.match(await card.innerText(),/Forged Realms/i);assert.match(await card.innerText(),/Starforged Plate/);assert.match(await card.innerText(),/Shellborn/);
  assert.equal(await card.evaluate(el=>getComputedStyle(el).animationName),'none','reduced motion disables the entrance animation');
  assert.equal(await page.locator('.creature-skin-reward').count(),1,'duplicate grants do not replay or queue duplicates');
  await page.evaluate(items=>dispatchRewards(items),celestial);
  assert.equal(await page.locator('.creature-skin-reward').count(),1,'later batches wait until dismissal');
  await card.getByRole('button',{name:'Dismiss creature skin reward'}).click();
  await page.waitForFunction(()=>document.querySelector('.creature-skin-reward')?.textContent.toLowerCase().includes('celestial rift'));
  assert.match(await page.locator('.creature-skin-reward').innerText(),/Celestial Mosaic/);
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('myr5:account-ready',{detail:{user:{id:'owner-b'},dataEpoch:1}})));
  assert.equal(await page.locator('.creature-skin-reward').count(),0,'owner changes clear visible rewards');
  await page.evaluate(()=>dispatchRewards([{kind:'creature-skin',id:'creature-unrecognized-skin',name:'Unrecognized Skin',collection:'untrusted-collection'}]));
  assert.equal(await page.locator('.creature-skin-reward').count(),0,'unknown collections are ignored');
  await page.evaluate(()=>window.dispatchEvent(new Event('myr5:account-cleared')));
  assert.equal(await page.locator('#creatureSkinRewardRevealStyle').count(),0,'account clear removes component styling');
  await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pagehide')));
  await page.evaluate(items=>dispatchRewards(items),celestial);
  assert.equal(await page.locator('.creature-skin-reward').count(),0,'disposed component ignores later events');
  assert.deepEqual(requests.filter(path=>/\.(?:png|webp|svg|jpe?g)$/i.test(path)),[],'reveal uses CSS/DOM only, no bitmap assets');
 }finally{await browser?.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
});
