// Hotfix (23 Sept): an installed iPhone stuck on the update, and an update message that would not clear.
// Serves the real sw.js template, app-updates.mjs and the update modules like Sites does (/x.html answers
// 307 to its clean URL). Chromium stands in for WebKit: the probe records every navigation the worker
// answers, and WebKit rejects any that is redirected ("Response served by service worker has redirections").
import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright';

const sri=text=>'sha256-'+createHash('sha256').update(text).digest('base64');
const PROBE=`\n{const log=v=>caches.open('probe-navigations').then(c=>c.put('/probe/'+Math.random(),new Response(JSON.stringify(v))));
const respond=FetchEvent.prototype.respondWith;FetchEvent.prototype.respondWith=function(answer){const request=this.request;if(request.mode==='navigate')answer=Promise.resolve(answer).then(response=>{log({url:request.url,redirected:response.redirected});return response;});return respond.call(this,answer);};}\n`;
const BODY='/creature/models/roster/body.glb';

async function withCoach(run){
 const files=new Map();for(const name of ['app-updates.mjs','update-policy.mjs','update-session.mjs','release-info.mjs','release-build.mjs','pod/workout-session-owner.mjs'])files.set('/'+name,await readFile(name,'utf8'));
 const template=await readFile('sw.js','utf8'),state={version:1,stall:false,stalled:[]};
 const html=()=>`<!doctype html><title>Coach ${state.version}</title><body data-tracking="false"><dialog id="installPanel"></dialog><button id="applyUpdate">Update</button><script type="module">
 import {initAppUpdates} from '/app-updates.mjs';import {WorkoutSessionOwner} from '/pod/workout-session-owner.mjs';
 window.myr5WorkoutOwner=new WorkoutSessionOwner();window.updateUi=initAppUpdates({api:async()=>({configured:false}),applyButton:document.getElementById('applyUpdate'),onBeforeUpdate:async()=>{}});
 </script></body>`;
 const worker=()=>{
  const assets=[...files,...['/pose.html','/index.html','/onboarding.html'].map(url=>[url,html()])].map(([url,text])=>({url,bytes:Buffer.byteLength(text),integrity:sri(text)}));
  return template.replace(/const SHELL='[^']+'/,`const SHELL='myr5-shell-hotfix-${state.version}'`).replace('/* OFFLINE_ASSETS */ []',JSON.stringify(assets)).replace('/* OPTIONAL_ASSETS */ []',JSON.stringify([{url:BODY,bytes:4,integrity:sri('glb!'),group:'bodies-starter'}]))+PROBE;
 };
 const server=createServer((req,res)=>{
  const url=new URL(req.url,'http://local'),path=url.pathname;res.setHeader('Cache-Control','no-cache');
  if(path==='/sw.js'){res.setHeader('Content-Type','text/javascript');return res.end(worker());}
  if(files.has(path)){res.setHeader('Content-Type','text/javascript');return res.end(files.get(path));}
  if(path===BODY){if(state.stall)return state.stalled.push(res);return res.end('glb!');}
  if(path.endsWith('.html')){res.writeHead(307,{Location:(path==='/index.html'?'/':path.slice(0,-5))+url.search});return res.end();}
  if(['/','/pose','/onboarding'].includes(path)){res.setHeader('Content-Type','text/html');return res.end(html());}
  res.writeHead(404);res.end();
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({channel:'msedge',headless:true});
  const context=await browser.newContext({viewport:{width:375,height:812}}),page=await context.newPage(),base='http://127.0.0.1:'+server.address().port;
  const until=async(fn,ms=30000,arg)=>{const end=Date.now()+ms;for(;;){let value;try{value=await page.evaluate(fn,arg);}catch{}if(value)return value;if(Date.now()>end)throw Error('Timed out: '+fn);await new Promise(r=>setTimeout(r,250));}};
  await page.goto(base+'/pose');await until(async()=>!!navigator.serviceWorker.controller&&!!window.updateUi&&!(await navigator.serviceWorker.getRegistration()).installing);
  const update=async()=>{state.version++;await page.evaluate(()=>window.updateUi.check());await until(async()=>!!(await navigator.serviceWorker.getRegistration()).waiting);};
  await run({page,base,state,until,update});
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
}
const hits=(page,selector)=>page.evaluate(sel=>{const el=document.querySelector(sel);if(!el||!el.offsetParent)return false;const r=el.getBoundingClientRect();return document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)===el;},selector);
const idle=page=>page.evaluate(()=>{const now=Date.now;Date.now=()=>now()+20000;});

test('no navigation the worker answers is redirected, though Sites answers every .html with a 307',{timeout:60000},()=>withCoach(async({page,base})=>{
 for(const path of ['/pose','/','/pose.html','/index.html','/onboarding','/onboarding.html','/pose.html?panel=install&update=repaired']){
  const response=await page.goto(base+path);assert.equal(response.status(),200,path);assert.equal(response.fromServiceWorker(),true,path);
 }
 const answered=await page.evaluate(async()=>{const cache=await caches.open('probe-navigations');return Promise.all((await cache.keys()).map(async key=>(await cache.match(key)).json()));});
 assert.ok(answered.length>=7);assert.deepEqual(answered.filter(entry=>entry.redirected),[]);
}));

test('the update notice clears with one tap and stays cleared; a busy old worker cannot trap the update barrier',{timeout:90000},()=>withCoach(async({page,state,until,update})=>{
 // "Got it" on this release's notice: tappable, gone, and still gone after the 1 s repaint and a reload.
 await until(()=>document.querySelector('.app-update-banner')?.hidden===false);
 assert.equal(await hits(page,'.app-update-banner [data-later]'),true);await page.click('.app-update-banner [data-later]');
 await page.waitForTimeout(2200);assert.equal(await page.evaluate(()=>document.querySelector('.app-update-banner').hidden),true);
 await page.reload();await until(()=>!!window.updateUi);await page.waitForTimeout(1200);assert.equal(await page.evaluate(()=>document.querySelector('.app-update-banner').hidden),true);

 // The old worker is still downloading a coach body (slow phone network) when the page updates.
 await update();state.stall=true;await page.evaluate(body=>{window.bodyRequest=fetch(body).then(r=>r.status);},BODY);await until(()=>true);
 while(!state.stalled.length)await new Promise(r=>setTimeout(r,100));
 await idle(page);await until(()=>!!document.getElementById('coachUpdateBarrier'),20000);
 assert.equal(await page.evaluate(()=>document.querySelector('.app-update-banner').hidden),true,'no dead banner under the barrier');
 const frozenAt=Date.now();await until(()=>!document.getElementById('coachUpdateBarrier'),25000);
 assert.ok(Date.now()-frozenAt<20000,'the worker releases the page instead of waiting for the old worker');
 assert.equal(await page.title(),'Coach 1');assert.equal(await page.evaluate(()=>window.myr5WorkoutOwner.canStart()),true,'workouts can start again');
 assert.equal(await hits(page,'.app-update-banner [data-update]'),true,'the retry is tappable');

 // Once the download finishes the update lands by itself; the page moves over on the next update tap.
 state.stall=false;for(const res of state.stalled.splice(0))res.end('glb!');
 assert.equal(await page.evaluate(()=>window.bodyRequest),200);
 await until(async()=>!(await navigator.serviceWorker.getRegistration()).waiting,15000);
 await page.click('.app-update-banner [data-update]');await until(()=>document.title==='Coach 2'&&!!window.updateUi,20000);
}));

test('the update barrier times out into a usable app with a retry when the worker goes quiet mid-update',{timeout:90000},()=>withCoach(async({page,until,update})=>{
 await update();
 // "Later" clears the ready banner and it stays cleared through the 1 s repaint.
 await until(()=>document.querySelector('.app-update-banner [data-later]')?.textContent==='Later'&&!document.querySelector('.app-update-banner').hidden);
 await page.click('.app-update-banner [data-later]');await page.waitForTimeout(2200);
 assert.equal(await page.evaluate(()=>document.querySelector('.app-update-banner').hidden),true);
 // A worker asks this page to freeze and save, then is never heard from again (iOS stops it).
 await idle(page);
 assert.equal(await page.evaluate(()=>new Promise(resolve=>{const channel=new MessageChannel();channel.port1.onmessage=event=>resolve(event.data.safe);navigator.serviceWorker.dispatchEvent(new MessageEvent('message',{data:{type:'UPDATE_SAFETY_CHECK',id:'lost-worker'},ports:[channel.port2]}));})),true);
 assert.equal(await page.evaluate(()=>!!document.getElementById('coachUpdateBarrier')&&!window.myr5WorkoutOwner.canStart()),true);
 await until(()=>!document.getElementById('coachUpdateBarrier'),35000);
 assert.equal(await page.evaluate(()=>window.myr5WorkoutOwner.canStart()),true);
 assert.match(await page.evaluate(()=>document.querySelector('.app-update-banner span').textContent),/couldn’t finish updating/);
 assert.equal(await hits(page,'.app-update-banner [data-update]'),true);
 await page.click('.app-update-banner [data-update]');await until(()=>document.title==='Coach 2'&&!!window.updateUi,20000);
}));
