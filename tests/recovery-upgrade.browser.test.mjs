import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {RECOVERY_HTML} from '../recovery-page.mjs';

test('repair releases all old clients before upgrade and preserves durable data', {timeout:45000}, async()=>{
 const html='<!doctype html><title>Updated Coach fixture</title><p>Updated Coach</p>';
 const asset={url:'/pose.html',integrity:'sha256-'+createHash('sha256').update(html).digest('base64'),bytes:Buffer.byteLength(html)};
 const current=(await readFile('sw.js','utf8')).replace("const SHELL='myr5-shell-22d1026e5a1d6f2441dd'","const SHELL='myr5-shell-upgrade-test'").replace('/* OFFLINE_ASSETS */ []',JSON.stringify([asset]));
 let upgraded=false;
 const server=createServer((req,res)=>{
  const path=new URL(req.url,'http://local').pathname;
  res.setHeader('Cache-Control','no-store');
  if(path==='/sw.js'){res.setHeader('Content-Type','text/javascript');return res.end(upgraded?current:"self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));");}
  res.setHeader('Content-Type','text/html');
  res.end(path==='/repair-coach'?RECOVERY_HTML:path==='/pose.html'?html:'<!doctype html><title>Old Coach fixture</title>');
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 let browser;
 try{
  browser=await chromium.launch({channel:'msedge',headless:true});
  const context=await browser.newContext(),old=await context.newPage();
  await old.goto(base+'/old');
  await old.evaluate(async()=>{
   await navigator.serviceWorker.register('/sw.js');await navigator.serviceWorker.ready;
   localStorage.setItem('saved-progress','keep-this');
   await new Promise((resolve,reject)=>{
    const open=indexedDB.open('upgrade-workout-fixture',1);
    open.onupgradeneeded=()=>open.result.createObjectStore('workouts');open.onerror=()=>reject(open.error);
    open.onsuccess=()=>{const db=open.result,tx=db.transaction('workouts','readwrite');tx.objectStore('workouts').put({reps:12},'saved-set');tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);};
   });
  });
  await old.waitForFunction(()=>!!navigator.serviceWorker.controller);
  upgraded=true;
  const repair=await context.newPage();await repair.goto(base+'/repair-coach');
  await repair.waitForFunction(()=>document.getElementById('status').textContent.includes('Close ALL Coach windows'));
  assert.match(await repair.locator('#status').textContent(),/including this repair page/);
  assert.equal(await repair.locator('#retry').isVisible(),false);
  assert.equal(await repair.locator('#progress').getAttribute('value'),'100');
  assert.equal(await repair.evaluate(async()=>!!(await navigator.serviceWorker.getRegistration()).waiting),true);
  await old.close();
  assert.equal(await repair.evaluate(async()=>!!(await navigator.serviceWorker.getRegistration()).waiting),true,'the repair page itself keeps the old worker alive');
  await repair.close();
  const reopened=await context.newPage();await reopened.goto(base+'/pose.html');
  await reopened.waitForFunction(async()=>{const r=await navigator.serviceWorker.getRegistration();return !!r?.active&&!r.waiting&&!!navigator.serviceWorker.controller;});
  assert.equal(await reopened.evaluate(()=>localStorage.getItem('saved-progress')),'keep-this');
  const saved=await reopened.evaluate(()=>new Promise((resolve,reject)=>{
   const open=indexedDB.open('upgrade-workout-fixture');open.onerror=()=>reject(open.error);
   open.onsuccess=()=>{const db=open.result,tx=db.transaction('workouts'),get=tx.objectStore('workouts').get('saved-set');get.onsuccess=()=>resolve(get.result);tx.oncomplete=()=>db.close();};
  }));
  assert.equal(saved.reps,12);
  await context.setOffline(true);await reopened.reload();assert.equal(await reopened.title(),'Updated Coach fixture');
  await context.close();
  // A fresh install still activates and opens Coach without the close-all step.
  const fresh=await browser.newContext(),page=await fresh.newPage();await page.goto(base+'/repair-coach');
  await page.waitForURL(/pose.html\?panel=install&update=repaired/);assert.equal(await page.title(),'Updated Coach fixture');
  await fresh.close();
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
});
