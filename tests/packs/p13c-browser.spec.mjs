// True browser acceptance: local HTTP fixture only; no CDN, entitlement service, or model runtime.
import { test, expect } from 'playwright/test';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root=resolve(import.meta.dirname,'../..');
const fixture=new TextEncoder().encode('P13C browser fixture: retained across reload and resumed by Range.');
let server,base;
// Use the locally bundled Microsoft Edge; do not download a browser in this isolated app.
test.use({ channel: 'msedge' });
test.beforeAll(async()=>{server=http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://local');
 if(url.pathname==='/fixture.bin'){const range=req.headers.range,start=range?Number(range.match(/bytes=(\d+)-/)?.[1]):0;res.writeHead(range?206:200,{ETag:'"p13c-browser-v1"','x-fixture-version':'1.0.0','Content-Length':fixture.byteLength-start,...(range?{'Content-Range':`bytes ${start}-${fixture.byteLength-1}/${fixture.byteLength}`}:{})});return res.end(fixture.subarray(start));}
 if(url.pathname==='/blank.html')return res.end('<!doctype html><title>P13C</title>');
 if(url.pathname.startsWith('/packs/'))try{const body=await readFile(resolve(root,url.pathname.slice(1)));res.writeHead(200,{'Content-Type':'text/javascript'});return res.end(body);}catch{}
 res.writeHead(404);res.end();
});await new Promise(done=>server.listen(0,'127.0.0.1',done));base=`http://127.0.0.1:${server.address().port}`;});
test.afterAll(()=>new Promise(done=>server.close(done)));

test('offline/reload/quota and incomplete Range download are browser-safe',async({page,context})=>{
 await page.goto(base+'/blank.html');
 const outcome=await page.evaluate(async({base,fixture})=>{
  const {PackLifecycle,sha256}=await import('/packs/pack-lifecycle.mjs');const {cacheStorageAssetStore,quotaInjectingStore}=await import('/packs/browser-asset-store.mjs');const {httpFixtureAssetSource}=await import('/packs/http-fixture-adapter.mjs');
  const hash=await sha256(new Uint8Array(fixture));const manifest={packId:'browser',version:'1.0.0',minAppVersion:'1.0.0',sha256:hash,assets:[{path:'fixture.bin',bytes:fixture.length,sha256:hash}]};const account={getEntitlements:()=>['browser']},workout={saveAndConfirmIdle:async()=>({saved:true,idle:true})};const store=cacheStorageAssetStore({cacheName:'p13c-browser-proof'}),key=`browser@1.0.0@${hash}/fixture.bin`;await store.put(key,new Uint8Array(fixture.slice(0,9)));
  const make=assets=>{const lifecycle=new PackLifecycle({account,storage:localStorage,assetStore:assets,workout});lifecycle.manifest(manifest,httpFixtureAssetSource({baseUrl:base+'/',expectedEtag:'"p13c-browser-v1"',expectedVersion:'1.0.0'}));return lifecycle;};const first=make(store),downloaded=await first.download('browser');await first.verify('browser');await first.equipPending('browser');
  const quota=make(quotaInjectingStore(store,{failPut:()=>true}));quota.records.browser={state:'absent',receivedBytes:0,version:'1.0.0',manifestHash:hash};await store.removePrefix(`browser@1.0.0@${hash}/`);const quotaStatus=await quota.download('browser');return {downloaded:downloaded.state,quota:quotaStatus.state,pending:first.status('browser').state};
 },{base,fixture:[...fixture]});
 expect(outcome).toEqual({downloaded:'downloaded',quota:'failed',pending:'pending-equip'});
 await page.reload();
 await page.evaluate(async()=>{window.p13cFixtureSource=(await import('/packs/http-fixture-adapter.mjs')).httpFixtureAssetSource;});
 await context.setOffline(true);
 const offline=await page.evaluate(async({base})=>{try{await window.p13cFixtureSource({baseUrl:base+'/',expectedEtag:'"p13c-browser-v1"',expectedVersion:'1.0.0'}).get({path:'fixture.bin',bytes:1});return false;}catch{return true;}},{base});
 expect(offline).toBe(true);
});
