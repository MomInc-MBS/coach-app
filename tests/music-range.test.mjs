import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Miniflare} from 'miniflare';
import worker,{musicRangeResponse} from '../server/cloudflare.mjs';
import music from '../audio/music/manifest.json' with {type:'json'};

const bytes=Uint8Array.from({length:16},(_,i)=>i),modified='Fri, 09 Oct 2026 08:00:00 GMT';
const assetHeaders={'content-type':'audio/mp4',etag:'"music-v1"','last-modified':modified,'cache-control':'public, max-age=0, must-revalidate','content-encoding':'gzip','content-length':'999'};
const request=(range,extra={})=>new Request('https://test/audio/music/example.m4a',{headers:{...(range?{range}:{}),...extra}});
const full=()=>new Response(bytes,{headers:assetHeaders});

test('bounded music supports closed, open-ended, suffix and clamped ranges with exact byte bodies',async()=>{
 for(const [range,start,end] of [['bytes=0-3',0,3],['bytes=5-',5,15],['bytes=-4',12,15],['bytes=-99',0,15],['bytes=14-99',14,15]]){
  const response=await musicRangeResponse(request(range),full(),16);
  assert.equal(response.status,206);assert.equal(response.headers.get('content-range'),`bytes ${start}-${end}/16`);
  assert.equal(response.headers.get('content-length'),String(end-start+1));assert.equal(response.headers.get('accept-ranges'),'bytes');
  assert.equal(response.headers.get('content-type'),'audio/mp4');assert.equal(response.headers.get('etag'),'"music-v1"');
  assert.equal(response.headers.get('cache-control'),assetHeaders['cache-control']);assert.equal(response.headers.has('content-encoding'),false);
  assert.deepEqual(new Uint8Array(await response.arrayBuffer()),bytes.slice(start,end+1));
 }
});

test('invalid, unsupported multiple, empty and unsatisfiable music ranges return416',async()=>{
 for(const range of ['bytes=16-','bytes=3-2','bytes=-0','bytes=-','bytes=0-1,3-4','items=0-1','bytes=9007199254740992-']){
  const response=await musicRangeResponse(request(range),full(),16);
  assert.equal(response.status,416,range);assert.equal(response.headers.get('content-range'),'bytes */16');
  assert.equal(response.headers.get('content-length'),'0');assert.equal((await response.arrayBuffer()).byteLength,0);
 }
});

test('If-Range requires a matching strong ETag or exact modification date; mismatch returns full200',async()=>{
 for(const [validator,status] of [['"music-v1"',206],[modified,206],['"old"',200],['W/"music-v1"',200],['invalid',200],['2026-10-09T08:00:00Z',200],['Sat, 10 Oct 2026 08:00:00 GMT',200],['Thu, 08 Oct 2026 08:00:00 GMT',200]]){
  const response=await musicRangeResponse(request('bytes=0-3',{'if-range':validator}),full(),16);
  assert.equal(response.status,status,validator);assert.equal((await response.arrayBuffer()).byteLength,status===206?4:16);
  assert.equal(response.headers.has('content-range'),status===206);
 }
});

test('full and HEAD music responses expose complete length and range support; unexpected files are bounded',async()=>{
 for(const method of ['GET','HEAD']){
  const response=await musicRangeResponse(new Request('https://test/audio/music/example.m4a',{method,headers:method==='HEAD'?{range:'bytes=0-3'}:{}}),full(),16);
  assert.equal(response.status,200);assert.equal(response.headers.get('content-length'),'16');assert.equal(response.headers.get('accept-ranges'),'bytes');
  assert.equal((await response.arrayBuffer()).byteLength,method==='HEAD'?0:16);
 }
 assert.equal((await musicRangeResponse(request(),full(),1024*1024+1)).status,502);
 assert.equal((await musicRangeResponse(request(),new Response(bytes.slice(0,3)),16)).status,502);
 let cancelled=false;
 const tooLong=new Response(new ReadableStream({start(c){c.enqueue(new Uint8Array(17));},cancel(){cancelled=true;}}));
 assert.equal((await musicRangeResponse(request(),tooLong,16)).status,502);assert.equal(cancelled,true);
 const missing=new Response('missing',{status:404});assert.equal(await musicRangeResponse(request(),missing,16),missing);
});

test('public entry retrieves only canonical allowlisted music, stripping partial/conditional and spoofed identity headers',async()=>{
 const track=Object.values(music.tracks)[0],file=new Uint8Array(track.bytes);file.set(bytes);
 let canonical;
 const input=new Request('https://test'+track.url+'?release=test',{headers:{range:'bytes=0-3','if-range':'"music-v1"','if-none-match':'"music-v1"','if-modified-since':modified,'if-match':'"old"','if-unmodified-since':modified,'oai-authenticated-user-id':'victim'}});
 const response=await worker.fetch(input,{ASSETS:{async fetch(req){canonical=req;return new Response(file,{headers:assetHeaders});}}});
 assert.equal(response.status,206);assert.deepEqual(new Uint8Array(await response.arrayBuffer()),bytes.slice(0,4));
 assert.equal(canonical.method,'GET');assert.equal(canonical.headers.get('accept-encoding'),'identity');
 for(const header of ['range','if-range','if-none-match','if-modified-since','if-match','if-unmodified-since','oai-authenticated-user-id'])assert.equal(canonical.headers.has(header),false,header);
 assert.equal(input.headers.get('range'),'bytes=0-3','original request stays intact');
 for(const path of ['/audio/music/not-published.m4a','/audio/music/manifest.json','/audio/other.m4a']){
  let forwarded;await worker.fetch(new Request('https://test'+path,{headers:{range:'bytes=0-3'}}),{ASSETS:{async fetch(req){forwarded=req;return new Response('asset');}}});
  assert.equal(forwarded.headers.get('range'),'bytes=0-3',path);
 }
});

test('real Workers runtime serves206,416 and HEAD with protocol-correct lengths',async()=>{
 // Execute the production helper itself in workerd, rather than a second parser.
 const source=await readFile(new URL('../server/cloudflare.mjs',import.meta.url),'utf8');
 const helper=source.slice(source.indexOf('function matchingRangeValidator'),source.indexOf('// Public Cloudflare'));
 const mf=new Miniflare({modules:true,compatibilityDate:'2026-05-15',script:helper+`\nexport default {fetch(request){return musicRangeResponse(request,new Response(Uint8Array.from({length:16},(_,i)=>i),{headers:${JSON.stringify({...assetHeaders,'content-encoding':'identity','content-length':'16'})}}),16);}}`});
 try{
  const url=await mf.ready;
  for(const [method,range,status,length] of [['GET','bytes=0-3',206,4],['GET','bytes=16-',416,0],['HEAD','bytes=0-3',200,16],['GET',null,200,16]]){
   const response=await fetch(url,{method,headers:range?{range}:{}});
   assert.equal(response.status,status);assert.equal(response.headers.get('content-length'),String(length),method);
   assert.equal(response.headers.get('accept-ranges'),'bytes');assert.equal((await response.arrayBuffer()).byteLength,method==='HEAD'?0:length);
  }
 }finally{await mf.dispose();}
});
