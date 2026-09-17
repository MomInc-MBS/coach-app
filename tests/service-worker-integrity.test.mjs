import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const source=await readFile('sw.js','utf8');

function worker(assets,fetchImpl){
 const listeners=new Map(),puts=[];
 const cache={match:async()=>null,put:async(...args)=>puts.push(args)};
 const context={
  console,URL,Request,Response,Headers,MessageChannel,setTimeout,clearTimeout,
  fetch:fetchImpl,
  caches:{open:async()=>cache,keys:async()=>[]},
  self:{location:{origin:'https://coach.test'},clients:{matchAll:async()=>[],claim:async()=>{}},addEventListener:(type,handler)=>listeners.set(type,handler),skipWaiting:async()=>{}},
 };
 const built=source.replace('/* OFFLINE_ASSETS */ []',JSON.stringify(assets));
 vm.runInNewContext(`${built}\nglobalThis.__workerTest={downloadAsset};`,context);
 return {downloadAsset:context.__workerTest.downloadAsset,listeners,puts};
}

test('HTML downloads tolerate CDN rewrites without weakening other assets',async()=>{
 const seen=[];
 const {downloadAsset}=worker([],async request=>{
  seen.push({path:new URL(request.url).pathname,integrity:request.integrity});
  return new Response('rewritten',{status:200,headers:{'Content-Type':'text/html'}});
 });
 await downloadAsset({url:'/pose.html',integrity:'sha256-YQ=='});
 await downloadAsset({url:'/app.js',integrity:'sha256-YQ=='});
 assert.deepEqual(seen,[
  {path:'/pose.html',integrity:''},
  {path:'/app.js',integrity:'sha256-YQ=='},
 ]);
});

test('a runtime integrity failure falls back to an uncached network response',async()=>{
 const asset={url:'/app.js',integrity:'sha256-YQ==',bytes:1};
 const requests=[];
 const {listeners,puts}=worker([asset],async request=>{
  requests.push({integrity:request.integrity,cache:request.cache});
  if(request.integrity)throw new TypeError('integrity mismatch');
  return new Response('current app',{status:200});
 });
 let responsePromise;
 listeners.get('fetch')({
  request:new Request('https://coach.test/app.js'),
  respondWith(value){responsePromise=value;},
 });
 const response=await responsePromise;
 assert.equal(await response.text(),'current app');
 assert.deepEqual(requests,[
  {integrity:'sha256-YQ==',cache:'reload'},
  {integrity:'',cache:'no-store'},
 ]);
 assert.equal(puts.length,0,'the unverified fallback must not enter the offline cache');
});
