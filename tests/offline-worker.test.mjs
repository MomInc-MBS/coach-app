import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import {MessageChannel} from 'node:worker_threads';
import {createHash} from 'node:crypto';
const source=await readFile('sw.js','utf8'),core={url:'/core.mjs',integrity:'sha256-test',bytes:4},optional={url:'/creature/model.glb',integrity:'sha256-model',bytes:16};
function fixture(fetcher=async()=>new Response('core'),optionals=[optional]){
 const handlers={},stores=new Map(),calls=[],name=(source.match(/const SHELL='([^']+)'/)||[])[1];let skips=0,clients=[];
 const path=value=>{const url=new URL(typeof value==='string'?value:value.url,'https://test');return url.pathname+url.search;};
 const caches={async keys(){return [...stores.keys()];},async delete(key){return stores.delete(key);},async match(k,{cacheName}={}){return stores.get(cacheName)?.get(path(k))?.clone();},async open(key){if(!stores.has(key))stores.set(key,new Map());const map=stores.get(key);return{async match(k){return map.get(path(k))?.clone();},async put(k,v){map.set(path(k),v.clone());},async delete(k){return map.delete(path(k));},async keys(){return [...map.keys()].map(k=>new Request('https://test'+k));}};}};
 const self={location:{origin:'https://test'},addEventListener:(k,fn)=>handlers[k]=fn,skipWaiting:async()=>skips++,clients:{matchAll:async()=>clients,claim:async()=>{}},registration:{}};
 runInNewContext(source.replace('/* OFFLINE_ASSETS */ []',JSON.stringify([core])).replace('/* OPTIONAL_ASSETS */ []',JSON.stringify(optionals)),{self,caches,URL,Request,Response,Headers,crypto,btoa,TextDecoder,MessageChannel,setTimeout:(fn,ms)=>setTimeout(fn,Math.min(ms,20)),clearTimeout,fetch:async request=>{calls.push(request);return fetcher(request);}});
 return{handlers,caches,stores,calls,name,setClients:value=>clients=value,get skips(){return skips;},async event(type,input={}){let pending;handlers[type]({...input,waitUntil:p=>pending=p});await pending;}};
}
test('failed atomic core install removes candidate and retains prior complete shell',async()=>{const f=fixture(async()=>new Response('fail',{status:503})),old=await f.caches.open('myr5-shell-old');await old.put('/__myr5_offline_assets__',Response.json([{...core,integrity:'sha256-old'}]));await old.put('/core.mjs',new Response('old'));await assert.rejects(f.event('install'));assert.equal(f.stores.has(f.name),false);assert.equal(await(await old.match('/core.mjs')).text(),'old');});
test('core install requests no optional model; activation retains one prior complete generation',async()=>{const f=fixture();for(const id of ['ancient','prior'])await(await f.caches.open('myr5-shell-'+id)).put('/__myr5_offline_assets__',Response.json([]));await f.event('install');assert.deepEqual(f.calls.map(r=>new URL(r.url).pathname),['/core.mjs']);await f.event('activate');assert(f.stores.has('myr5-shell-prior'));assert(!f.stores.has('myr5-shell-ancient'));});
test('unverified core failure returns503 and never retries without integrity',async()=>{const f=fixture(async()=>{throw Error('SRI mismatch');});let response;f.handlers.fetch({request:new Request('https://test/core.mjs'),respondWith:p=>response=p,waitUntil(){}});assert.equal((await response).status,503);assert.equal(f.calls.length,1);assert.equal(f.calls[0].integrity,core.integrity);});
test('force messages never activate while old windows remain, even if every window claims safe',async()=>{const f=fixture();f.setClients([{id:'a',postMessage(){}}]);await f.event('message',{data:{type:'SKIP_WAITING'}});let reply;await f.event('message',{data:{type:'PREPARE_UPDATE'},ports:[{postMessage:value=>reply=value}]});assert.equal(f.skips,0);assert.equal(reply.reason,'busy');});
test('optional resources are intercepted on demand, cached separately and do not enter core',async()=>{const f=fixture();let response,pending;f.handlers.fetch({request:new Request('https://test/creature/model.glb'),respondWith:p=>response=p,waitUntil:p=>pending=p});assert(response);assert.equal((await response).status,200);await pending;assert(f.stores.has('myr5-optional-'+f.name.slice('myr5-shell-'.length)));assert.equal(f.stores.has(f.name),false);assert.equal(f.calls[0].integrity,optional.integrity);});

function readyClient(id,{safe=true,onConfirm=()=>{}}={}){return {id,url:'https://test/pose.html',postMessage(data,ports){if(data.type==='UPDATE_ABORT')return;if(data.type==='UPDATE_CONFIRM')onConfirm();ports[0].postMessage({safe,protocol:2,id:data.id});ports[0].close();}};}
test('idle prepared clients activate together without closing windows',async()=>{const f=fixture(),a=readyClient('a'),b=readyClient('b');f.setClients([a,b]);let reply;await f.event('message',{data:{type:'PREPARE_UPDATE'},source:a,ports:[{postMessage:v=>reply=v}]});assert.equal(f.skips,1);assert.equal(reply.activated,true);});
test('an active or unresponsive client blocks automatic activation',async()=>{for(const b of [readyClient('b',{safe:false}),{id:'b',url:'https://test/pose.html',postMessage(){}}]){const f=fixture(),a=readyClient('a');f.setClients([a,b]);let reply;await f.event('message',{data:{type:'PREPARE_UPDATE'},source:a,ports:[{postMessage:v=>reply=v}]});assert.equal(f.skips,0);assert.equal(reply.activated,false);}});
test('a window arriving during preparation prevents activation',async()=>{const f=fixture(),b=readyClient('b'),a=readyClient('a',{onConfirm:()=>f.setClients([a,b])});f.setClients([a]);await f.event('message',{data:{type:'PREPARE_UPDATE'},source:a,ports:[{postMessage(){}}]});assert.equal(f.skips,0);});

// D34 post-download package (see sw.js packagePlan and post-download.mjs).
const build=name=>name.slice('myr5-shell-'.length),sri=body=>'sha256-'+createHash('sha256').update(body).digest('base64');
async function plan(f,adopt=false){let reply;await f.event('message',{data:{type:'PACKAGE_PLAN',adopt},ports:[{postMessage:v=>reply=v}]});return JSON.parse(JSON.stringify(reply));}
async function seed(f,cacheName,index,files){const cache=await f.caches.open(cacheName);if(index)await cache.put(cacheName.startsWith('myr5-shell-')?'/__myr5_offline_assets__':'/__myr5_package__',Response.json(index));for(const [url,body] of Object.entries(files))await cache.put(url,new Response(body));}
test('package downloads bypass the worker so they are neither intercepted nor cached twice',()=>{const f=fixture();let called=false;f.handlers.fetch({request:new Request('https://test/creature/model.glb',{headers:{'x-myr5-package':'1'}}),respondWith(){called=true;},waitUntil(){}});assert.equal(called,false);});
test('package files are served from this release, or from another release only when the integrity matches',async()=>{
 for(const [integrity,network] of [[optional.integrity,false],['sha256-changed',true]]){
  const f=fixture(async()=>new Response('fresh'));await seed(f,'myr5-package-older',[{url:optional.url,integrity}],{[optional.url]:'kept'});
  let response;f.handlers.fetch({request:new Request('https://test/creature/model.glb'),respondWith:p=>response=p,waitUntil(){}});
  assert.equal(await(await response).text(),network?'fresh':'kept');assert.equal(f.calls.length,network?1:0);assert.equal(f.stores.has('myr5-package-'+build(f.name)),false,'reading must not create the package cache');
 }
});
test('PACKAGE_PLAN carries unchanged files forward, lists changed ones, adopts the LRU only on request, then cleans up',async()=>{
 const same={url:'/war-room/war-room.mjs',integrity:'sha256-same',bytes:5},changed={url:'/creature/new.glb',integrity:'sha256-new',bytes:7},moved={url:'/nutrition-data.mjs',integrity:'sha256-food',bytes:3};
 const f=fixture(undefined,[optional,same,changed,moved]),id=build(f.name);
 await seed(f,'myr5-package-older',[{url:same.url,integrity:same.integrity},{url:changed.url,integrity:'sha256-old'}],{[same.url]:'same!',[changed.url]:'stale'});
 await seed(f,'myr5-shell-older',[{url:moved.url,integrity:moved.integrity}],{[moved.url]:'fd!'});
 await seed(f,'myr5-optional-'+id,null,{[optional.url]:'lru'});
 let reply=await plan(f);
 assert.deepEqual(reply.missing.map(a=>a.url).sort(),[changed.url,optional.url].sort(),'LRU is not adopted without consent');
 assert.equal(reply.total,16+5+7+3);assert.equal(reply.remaining,16+7);
 const pkg=f.stores.get('myr5-package-'+id);assert.equal(await pkg.get(same.url).text(),'same!');assert.equal(await pkg.get(moved.url).text(),'fd!');
 assert.equal(f.stores.get('myr5-package-older').has(same.url),false,'moved, not duplicated');assert.equal(f.stores.get('myr5-package-older').has(changed.url),true,'a changed file is never carried over');assert.equal(f.stores.get('myr5-shell-older').has(moved.url),true,'shell caches are left to activation');
 reply=await plan(f,true);assert.deepEqual(reply.missing.map(a=>a.url),[changed.url]);
 await pkg.set(changed.url,new Response('new'));
 reply=await plan(f,true);assert.deepEqual(reply.missing,[]);assert.equal(reply.remaining,0);
 assert.deepEqual([...f.stores.keys()].filter(n=>/package|optional/.test(n)),['myr5-package-'+id]);
});
test('voice clips are listed from this release\'s verified voice manifest',async()=>{
 const clip={url:'/voice/a.mp3',integrity:'sha256-a',bytes:2},manifestBody=JSON.stringify({phrases:{hi:clip.url},files:[clip,{url:'/voice/b.mp3',integrity:'sha256-b',bytes:3}]});
 const entry={url:'/voice/manifest.json',integrity:sri(manifestBody),bytes:manifestBody.length,contains:5},f=fixture(undefined,[entry]),key='/voice/manifest.json?v='+build(f.name);
 let reply=await plan(f);assert.deepEqual(reply.missing,[{...entry,cache:'myr5-voice-approved-v2',key}]);assert.equal(reply.remaining,entry.bytes+5);
 await seed(f,'myr5-voice-approved-v2',null,{[key]:'tampered',[clip.url]:'aa'});
 reply=await plan(f);assert.equal(reply.missing[0].key,key,'an unverified manifest is fetched again');
 await f.stores.get('myr5-voice-approved-v2').set(key,new Response(manifestBody));
 reply=await plan(f);assert.deepEqual(reply.missing.map(a=>[a.url,a.cache]),[['/voice/b.mp3','myr5-voice-approved-v2']]);
});
test('activation keeps this release, the newest older package and only this release\'s voice manifest',async()=>{
 const f=fixture(),id=build(f.name);for(const n of ['myr5-package-a','myr5-package-b'])await seed(f,n,[],{});
 await seed(f,'myr5-voice-approved-v2',null,{'/voice/manifest.json?v=old':'{}',['/voice/manifest.json?v='+id]:'{}','/voice/a.mp3':'aa'});
 await f.event('activate');
 assert.deepEqual([...f.stores.keys()].filter(n=>n.startsWith('myr5-package-')),['myr5-package-b']);
 assert.deepEqual([...f.stores.get('myr5-voice-approved-v2').keys()].sort(),['/voice/a.mp3','/voice/manifest.json?v='+id]);
});
