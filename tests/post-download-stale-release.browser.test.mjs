import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,sep} from 'node:path';
import {chromium} from 'playwright';
import {createHash} from 'node:crypto';

const oldBody=Buffer.from('old release asset');
const newBody=Buffer.from('new release asset');
const integrity='sha256-'+createHash('sha256').update(oldBody).digest('base64');

async function fixture(run,{releaseId='new-build',quota=false}={}){
 const root=resolve('.');let assetRequests=0,probes=0;
 const server=createServer(async(req,res)=>{const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/'){res.setHeader('content-type','text/html');res.end('<!doctype html><meta name="viewport" content="width=device-width"><div id="mount"></div><script type="module" src="/test.mjs"></script>');return;}
  if(url.pathname==='/test.mjs'){res.setHeader('content-type','text/javascript');res.end(`import {mountPostDownload} from '/post-download.mjs';
  const groups={starter:{files:1,total:${newBody.length},remaining:${newBody.length}},coach:{files:1,total:32,remaining:32}};
  const asset={url:'/assets/changed.mjs',key:'/assets/changed.mjs',cache:'myr5-package-old',bytes:${newBody.length},integrity:${JSON.stringify(integrity)}};
  const plan={type:'PACKAGE_PLAN',cache:'myr5-package-old',total:${newBody.length},remaining:${newBody.length},missing:[asset],groups};
  const controller={postMessage(message,ports){if(message.type==='PACKAGE_PLAN')queueMicrotask(()=>ports[0].postMessage(plan));}};
  Object.defineProperty(navigator,'serviceWorker',{configurable:true,value:{controller,addEventListener(){}}});
  const nativeFetch=window.fetch.bind(window);window.fetchLog=[];window.fetch=async(input,options={})=>{const url=String(input);window.fetchLog.push({url,integrity:options.integrity||'',cache:options.cache||'',credentials:options.credentials||''});return nativeFetch(input,options);};
  window.openCalls=[];window.open=(...args)=>{window.openCalls.push(args);return null;};
  localStorage.setItem('myr5-download-groups','["starter"]');localStorage.setItem('myr5-downloads-seen','1');
  window.api=mountPostDownload({host:document.querySelector('#mount')});`);return;}
  if(url.pathname==='/release-info.mjs'){res.setHeader('content-type','text/javascript');res.end("export const RELEASE={id:'old-build'};");return;}
  if(url.pathname==='/battle-pass-rewards.mjs'){res.setHeader('content-type','text/javascript');res.end('export const ROWS=[],TRACKS={},LEVELS_PER_BOSS=5;');return;}
  if(url.pathname==='/battle-pass.mjs'){res.setHeader('content-type','text/javascript');res.end('export function loadProgress(){return null;}');return;}
  if(url.pathname==='/api/releases/current'){probes++;res.setHeader('content-type','application/json');res.setHeader('cache-control','no-store');res.end(JSON.stringify({id:releaseId}));return;}
  if(url.pathname==='/assets/changed.mjs'){assetRequests++;res.setHeader('content-type','text/javascript');res.end(quota?oldBody:newBody);return;}
  try{const path=resolve(root,'.'+url.pathname);if(!path.startsWith(root+sep))throw Error();if(path.endsWith('.mjs')||path.endsWith('.js'))res.setHeader('content-type','text/javascript');res.end(await readFile(path));}catch{res.writeHead(404);res.end();}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage();await page.addInitScript(()=>Object.defineProperty(navigator,'onLine',{configurable:true,get:()=>false}));await page.goto(`http://127.0.0.1:${server.address().port}`);await page.waitForSelector('.full-download-settings',{timeout:8000});const cache=await page.evaluate(async()=>{const cache=await caches.open('myr5-package-old');await cache.put('/already-saved.bin',new Response('verified partial'));return cache;});if(quota)await page.evaluate(()=>{const original=Cache.prototype.put;Cache.prototype.put=function(){const error=new DOMException('quota','QuotaExceededError');return Promise.reject(error);};window.restoreCachePut=()=>Cache.prototype.put=original;});await run(page,{get assetRequests(){return assetRequests},get probes(){return probes},cache});}
 finally{await browser?.close();server.closeAllConnections?.();await new Promise(resolve=>server.close(resolve));}
}

test('old plan keeps SRI and partial cache, then offers the safe update page for a newer release',async()=>fixture(async(page,server)=>{
 await page.waitForFunction(()=>{const button=document.querySelector('.full-download-settings [data-toggle]');return button&&!button.hidden&&button.textContent.startsWith('Download ');});
 await page.evaluate(()=>window.myr5Packs.open('starter'));
 await page.getByRole('button',{name:'Download selected'}).click();
 await page.locator('.full-download-bar [data-text]').getByText(/A newer Coach release is live/).waitFor({timeout:15000});
 assert.equal(server.assetRequests,3,'obsolete SRI fetch is retried only the existing three times');assert.equal(server.probes,1,'one bounded current-release probe follows the terminal fetch failure');
 const integrityLog=await page.evaluate(()=>fetchLog.filter(item=>item.url.includes('/assets/changed.mjs')).map(item=>item.integrity));assert.deepEqual(integrityLog,[integrity,integrity,integrity],'every asset request retains the old plan integrity');
 const releaseProbe=await page.evaluate(()=>fetchLog.find(item=>item.url==='/api/releases/current'));assert.deepEqual({cache:releaseProbe?.cache,credentials:releaseProbe?.credentials},{cache:'no-store',credentials:'omit'});
 assert.equal(await page.evaluate(()=>localStorage.getItem('myr5-download-groups')),'["starter"]','the chosen group survives the stale-plan failure');
 assert.equal(await page.evaluate(async()=>await(await caches.open('myr5-package-old')).match('/already-saved.bin').then(r=>r.text())),'verified partial','verified partial package bytes remain untouched');
 await page.evaluate(()=>window.myr5Packs.open('starter'));
 const dialog=page.locator('#downloadsMenu');await dialog.waitFor({state:'visible'});
 await page.locator('#downloadsMenu').getByRole('button',{name:/Update Coach to continue downloads/}).click();
 await page.waitForFunction(()=>!document.querySelector('#downloadsMenu').open);
 assert.deepEqual(await page.evaluate(()=>openCalls[0]),['/repair-coach','_blank','noopener,noreferrer']);
 assert.equal(server.assetRequests,3,'the stale plan cannot be resumed from its menu');
}));

test('same-release fetch failures stay resumable network errors and do not offer stale recovery',async()=>fixture(async(page,server)=>{
 await page.evaluate(()=>window.myr5Packs.open('starter'));await page.getByRole('button',{name:'Download selected'}).click();
 await page.locator('.full-download-bar [data-text]').getByText(/Check your connection/).waitFor({timeout:15000});
 assert.equal(server.assetRequests,3);assert.equal(server.probes,1);
 assert.equal(await page.locator('.full-download-bar [data-update]:visible').count(),0);
 assert.equal(await page.locator('.full-download-bar').getByRole('button',{name:'Resume',exact:true}).count(),1);
} ,{releaseId:'old-build'}));

test('quota failures are not probed or relabeled stale',async()=>fixture(async(page,server)=>{
 // Fail the package cache write after an accepted response; it must remain a storage error.
 await page.evaluate(()=>window.myr5Packs.open('starter'));await page.getByRole('button',{name:'Download selected'}).click();
 await page.locator('.full-download-bar [data-text]').getByText(/free space/i).waitFor({timeout:10000});
 assert.equal(server.probes,0);assert.equal(await page.locator('.full-download-bar [data-update]:visible').count(),0);
} ,{releaseId:'new-build',quota:true}));

test('user pause aborts the old request without a stale-release label or update action',async()=>fixture(async(page,server)=>{
 await page.evaluate(()=>window.myr5Packs.open('starter'));await page.getByRole('button',{name:'Download selected'}).click();
 await page.waitForFunction(()=>fetchLog.some(item=>item.url.includes('/assets/changed.mjs')));
 await page.locator('.full-download-bar').getByRole('button',{name:'Pause',exact:true}).click();
 await page.locator('.full-download-bar [data-text]').getByText('Download paused.').waitFor({timeout:5000});
 assert.equal(server.probes,0);assert.equal(await page.locator('.full-download-bar [data-update]:visible').count(),0);
 assert.equal(await page.evaluate(()=>localStorage.getItem('myr5-full-download')),'paused');
}));
