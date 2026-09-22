import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright';

test('idle Coach updates and reloads itself; another active workout postpones all reloads',{timeout:60000},async()=>{
 const files=new Map();for(const name of ['app-updates.mjs','update-policy.mjs','update-session.mjs','release-info.mjs','release-build.mjs','pod/workout-session-owner.mjs'])files.set('/'+name,await readFile(name,'utf8'));
 const html=version=>`<!doctype html><title>Coach ${version}</title><body data-tracking="false"><dialog id="installPanel"></dialog><button id="applyUpdate">Update</button><script type="module">
 import {initAppUpdates} from '/app-updates.mjs';import {WorkoutSessionOwner} from '/pod/workout-session-owner.mjs';
 window.myr5WorkoutOwner=new WorkoutSessionOwner();window.updateUi=initAppUpdates({api:async()=>({configured:false}),applyButton:document.getElementById('applyUpdate'),onBeforeUpdate:async()=>{localStorage.setItem('saved-before-update','yes');}});
 </script></body>`;
 const workerSource=await readFile('sw.js','utf8');let version=1;
 const worker=()=>{const assets=[...files,['/pose.html',html(version)]].map(([url,body])=>({url,bytes:Buffer.byteLength(body),integrity:'sha256-'+createHash('sha256').update(body).digest('base64')}));return workerSource.replace(/const SHELL='[^']+'/,`const SHELL='myr5-shell-auto-${version}'`).replace('/* OFFLINE_ASSETS */ []',JSON.stringify(assets));};
 const server=createServer((req,res)=>{const path=new URL(req.url,'http://local').pathname;res.setHeader('Cache-Control','no-store');if(path==='/sw.js'){res.setHeader('Content-Type','text/javascript');return res.end(worker());}if(files.has(path)){res.setHeader('Content-Type','text/javascript');return res.end(files.get(path));}res.setHeader('Content-Type','text/html');res.end(html(version));});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;let browser;
 try{
  browser=await chromium.launch({channel:'msedge',headless:true});const context=await browser.newContext();const a=await context.newPage();await a.goto(base+'/pose.html');await a.waitForFunction(()=>!!navigator.serviceWorker.controller&&!!window.updateUi);
  await a.evaluate(async()=>{localStorage.setItem('saved-progress','12 reps');await new Promise((resolve,reject)=>{const r=indexedDB.open('auto-update-fixture',1);r.onupgradeneeded=()=>r.result.createObjectStore('sets');r.onerror=()=>reject(r.error);r.onsuccess=()=>{const db=r.result,tx=db.transaction('sets','readwrite');tx.objectStore('sets').put({reps:12},'set');tx.oncomplete=()=>{db.close();resolve();};};});});
  version=2;await a.evaluate(()=>window.updateUi.check());await a.waitForFunction(async()=>!!(await navigator.serviceWorker.getRegistration()).waiting);
  // Advance only the page's clock to satisfy the 15-second idle policy.
  await a.evaluate(()=>{const now=Date.now;Date.now=()=>now()+20000;});
  await a.waitForFunction(()=>document.title==='Coach 2');assert.equal(await a.evaluate(()=>localStorage.getItem('saved-before-update')),'yes');assert.equal(await a.evaluate(()=>localStorage.getItem('saved-progress')),'12 reps');
  const b=await context.newPage();await b.goto(base+'/pose.html');await b.waitForFunction(()=>!!window.updateUi);await b.evaluate(()=>{document.body.dataset.tracking='true';window.myr5WorkoutOwner.start();});
  version=3;await a.evaluate(()=>window.updateUi.check());await a.waitForFunction(async()=>!!(await navigator.serviceWorker.getRegistration()).waiting);await a.locator('#applyUpdate').click();
  await a.waitForFunction(()=>document.getElementById('releaseStatus').textContent.includes('another session'));
  assert.equal(await a.title(),'Coach 2');assert.equal(await b.title(),'Coach 2');assert.equal(await b.evaluate(()=>window.myr5WorkoutOwner.snapshot().phase),'active');
  await b.evaluate(()=>{document.body.dataset.tracking='false';window.myr5WorkoutOwner.stop();const now=Date.now;Date.now=()=>now()+20000;});await a.locator('#applyUpdate').click();
  await a.waitForFunction(()=>document.title==='Coach 3');await b.waitForFunction(()=>document.title==='Coach 3');
  const saved=await a.evaluate(()=>new Promise(resolve=>{const r=indexedDB.open('auto-update-fixture');r.onsuccess=()=>{const db=r.result,get=db.transaction('sets').objectStore('sets').get('set');get.onsuccess=()=>{resolve(get.result);db.close();};};}));assert.equal(saved.reps,12);
  await context.setOffline(true);await a.reload();assert.equal(await a.title(),'Coach 3');await context.close();
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
});
