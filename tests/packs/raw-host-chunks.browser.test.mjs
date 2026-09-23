import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {generateKeyPairSync,sign} from 'node:crypto';
import {chromium} from 'playwright';
import {canonicalChunkPayload,DEFAULT_LOCAL_RESOURCE_POLICY,sha256Chunk} from '../../modules/materials/chunk-delivery.mjs';

test('pinned raw-host CORS ranges use signed chunk hashes when Content-Range is browser-hidden',async()=>{
 const bytes=Uint8Array.from([1,2,3,4,51,52,53,54]),commit='0123456789abcdef0123456789abcdef01234567',prefix=`/owner/repo/${commit}/materials/`,url=`https://raw.githubusercontent.com${prefix}track-arms/1.0.0/arms.m5bundle`;
 const {privateKey,publicKey}=generateKeyPairSync('ed25519'),publicJwk=publicKey.export({format:'jwk'});
 const makeManifest=async(assetUrl=url,etag)=>{
  const chunks=[];for(let index=0;index<2;index++)chunks.push({index,offset:index*4,bytes:4,sha256:await sha256Chunk(bytes.slice(index*4,index*4+4)),url:assetUrl,...(etag?{etag}: {})});
  const manifest={schema:'mom-material-chunks-v1',packId:'track-arms',version:'1.0.0',keyId:'fixture-v1',assets:[{path:'assets/arms.m5bundle',bytes:8,sha256:await sha256Chunk(bytes),chunks}]};manifest.signature=sign(null,Buffer.from(canonicalChunkPayload(manifest)),privateKey).toString('base64');return manifest;
 };
 const server=createServer(async(req,res)=>{try{if(req.url==='/'){res.writeHead(200,{'Content-Type':'text/html'});res.end('<!doctype html><title>Chunk transport fixture</title>');return;}if(!['/modules/materials/chunk-delivery.mjs','/modules/materials/material-config.mjs'].includes(req.url))throw Error();res.writeHead(200,{'Content-Type':'text/javascript'});res.end(await readFile(new URL('../../'+req.url.slice(1),import.meta.url)));}catch{res.writeHead(404);res.end();}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser,scenario='good',requests=[];
 try{
  browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage();
  await page.route(/^https:\/\/(raw\.githubusercontent\.com|cdn\.test)\//,async route=>{
   const request=route.request();if(request.method()==='OPTIONS'){await route.fulfill({status:204,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'range,if-range'}});return;}
   const range=request.headers().range;requests.push(range);const offset=Number(range.match(/^bytes=(\d+)-/)[1]);let body=Buffer.from(bytes.slice(offset,offset+4));
   if(scenario==='wrong-offset'&&offset===4)body=Buffer.from(bytes.slice(0,4));
   if(scenario==='tamper')body[0]^=1;
   if(scenario==='truncated')body=body.subarray(0,3);
   const headers={'Access-Control-Allow-Origin':'*','Content-Type':'application/octet-stream','Content-Length':String(body.length),'Content-Range':scenario==='visible-wrong'?'bytes 99-102/999':`bytes ${offset}-${offset+3}/8`};
   if(scenario==='visible-wrong')headers['Access-Control-Expose-Headers']='Content-Range';
   await route.fulfill({status:scenario==='whole-file'?200:206,headers,body});
  });
  await page.goto('http://127.0.0.1:'+server.address().port);
 const run=async({assetUrl=url,policyPatch={},etag,loseOwner=false,finalUrl,nativeFetch=false}={})=>{
   requests=[];return page.evaluate(async({manifest,publicJwk,policy,loseOwner,finalUrl,nativeFetch})=>{
    const {ChunkDownloader,memoryChunkStore}=await import('/modules/materials/chunk-delivery.mjs'),store=memoryChunkStore(),seen=[];let owner='owner-a';
    const fetchImpl=async(url,options)=>{const response=await fetch(url,options);seen.push({type:response.type,url:response.url,range:response.headers.get('Content-Range'),length:response.headers.get('Content-Length'),redirect:options.redirect});if(loseOwner)owner=null;return finalUrl===undefined?response:{ok:response.ok,status:response.status,redirected:response.redirected,type:response.type,headers:response.headers,body:response.body,url:finalUrl};};
    const downloader=new ChunkDownloader({store,manifestPublicKey:publicJwk,expectedVersion:'1.0.0',ownership:()=>owner,policy,...(nativeFetch?{}:{fetchImpl})});
    try{const progress=[],result=nativeFetch?await downloader.downloadWithProgress(manifest,{retry:0,onProgress:value=>progress.push(value)}):await downloader.download(manifest,{retry:0}),asset=await downloader.readVerifiedAsset(manifest,'assets/arms.m5bundle');return {ok:true,received:result.receivedBytes,bytes:[...asset.bytes],used:store.usedBytes,seen,progress};}catch(error){return {ok:false,error:error.message,used:store.usedBytes,seen};}
   },{manifest:await makeManifest(assetUrl,etag),publicJwk,policy:{...DEFAULT_LOCAL_RESOURCE_POLICY,trustedOrigins:['https://raw.githubusercontent.com'],allowedProtocols:['https:'],pathPrefix:prefix,...policyPatch},loseOwner,finalUrl,nativeFetch});
  };
  const good=await run();assert.equal(good.ok,true,good.error);assert.deepEqual(good.bytes,[...bytes]);assert.deepEqual(requests,['bytes=0-3','bytes=4-7']);assert(good.seen.every(row=>row.type==='cors'&&row.range===null&&row.length==='4'&&row.redirect==='error'));
  const native=await run({nativeFetch:true});assert.equal(native.ok,true,native.error);assert.deepEqual(native.bytes,[...bytes]);assert.deepEqual(requests,['bytes=0-3','bytes=4-7'],'default browser fetch completes both chunk requests');assert.equal(native.progress.at(-1).percent,1,'nested progress downloader verifies every native-fetch chunk');
  for(const [mode,pattern,used] of [['wrong-offset',/hash mismatch/,4],['tamper',/hash mismatch/,0],['truncated',/size mismatch/,0],['whole-file',/HTTP/,0],['visible-wrong',/Content-Range/,0]]){scenario=mode;const result=await run();assert.equal(result.ok,false,mode);assert.match(result.error,pattern,mode);assert.equal(result.used,used,mode+' must never persist unverified bytes');}
  scenario='good';
  for(const finalUrl of ['',url.replace('arms.m5bundle','another.m5bundle'),url.replace(commit,'0'.repeat(40)),url.replace('raw.githubusercontent.com','cdn.test')]){const result=await run({finalUrl});assert.equal(result.ok,false);assert.match(result.error,/Content-Range|policy/);assert.equal(result.used,0,'both requested and final URLs must match the immutable host and path');}
  for(const options of [{assetUrl:url+'?unchecked=1'},{policyPatch:{pathPrefix:'/owner/repo/'}},{assetUrl:url.replace('raw.githubusercontent.com','cdn.test'),policyPatch:{trustedOrigins:['https://cdn.test']}},{assetUrl:url.replace(commit,'main'),policyPatch:{pathPrefix:'/owner/repo/main/materials/'}}]){const result=await run(options);assert.equal(result.ok,false);assert.match(result.error,/Content-Range/);assert.equal(result.used,0);}
  const etag=await run({etag:'"signed-version"'});assert.equal(etag.ok,false);assert.match(etag.error,/ETag/);assert.equal(etag.used,0,'signed ETag remains mandatory even when the browser hides it');
  const logout=await run({loseOwner:true});assert.equal(logout.ok,false);assert.match(logout.error,/not owned/);assert.equal(logout.used,0);
 }finally{await browser?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});
