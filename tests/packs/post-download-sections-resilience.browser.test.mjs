// A section that fails to resolve (bad network, a rejected signature, an unsupported browser)
// used to be swallowed silently: the whole "Extra offline packs" panel just never appeared, with
// no sign anything had gone wrong (myr5.mominc.online 2026-09-22 report: "I can't download the
// other packs"). This proves the panel now stays visible, says what happened, and offers Retry —
// both when every section fails and when only some do — and that Retry recovers once the failure
// clears.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {build} from 'esbuild';
import {chromium} from 'playwright';
import {generateKeyPairSync,sign,createHash} from 'node:crypto';
import {canonicalChunkPayload} from '../../modules/materials/chunk-delivery.mjs';

async function withPage(run){
 const ui=await build({entryPoints:['modules/materials/post-download-ui.mjs'],bundle:true,write:false,format:'esm',target:'es2022'});
 const source=resolve('.');
 const server=createServer(async(req,res)=>{
  const path=new URL(req.url,'http://test').pathname;
  if(path==='/'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>Post-download resilience fixture</title><div id="packs"></div>');return;}
  if(path==='/ui.js'){res.setHeader('Content-Type','text/javascript');res.end(ui.outputFiles[0].text);return;}
  try{const file=resolve(source,'.'+path);if(!file.startsWith(source+sep))throw Error();res.setHeader('Content-Type',{'.js':'text/javascript','.mjs':'text/javascript'}[extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404);res.end();}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage();await page.goto('http://127.0.0.1:'+server.address().port);await run(page);}finally{await browser?.close();await new Promise(r=>server.close(r));}
}

const SECTION_IDS=['chest','quads','glutes','arms','yoga','martial-arts','cardio','meditation'].map(track=>`track-${track}`).concat('coach-ships-biomes');

test('every section failing keeps the panel visible with a plain-language status and a working Retry',async()=>withPage(async page=>{
 const pair=generateKeyPairSync('ed25519'),trust=pair.publicKey.export({format:'jwk'}),bytes=Buffer.from([1,2,3,4]),digest=createHash('sha256').update(bytes).digest('hex');
 const manifest=packId=>{const m={schema:'mom-material-chunks-v1',packId,version:'1.0.0',keyId:'test-v1',assets:[{path:'assets/test.bin',bytes:4,sha256:digest,chunks:[{index:0,offset:0,bytes:4,sha256:digest,url:'https://pack.test/materials/'+packId}]}]};m.signature=sign(null,Buffer.from(canonicalChunkPayload(m)),pair.privateKey).toString('base64');return m;};
 const manifests=Object.fromEntries(SECTION_IDS.map(id=>[id,manifest(id)]));
 const policy={maxChunkBytes:1024,maxAssetBytes:1024,maxPackBytes:2048,maxAssets:16,maxChunksPerAsset:256,trustedOrigins:['https://pack.test'],allowedProtocols:['https:'],pathPrefix:'/materials/'};
 await page.evaluate(async({trust,manifests,policy})=>{
  const {mountPostDownloadSections}=await import('/ui.js');
  window.myr5AuthenticatedAccount={user:{id:'owner-a'}};
  window.broken=true;
  const fetchImpl=async url=>{if(window.broken)throw new Error('network down');const id=String(url).split('/')[2];return new Response(JSON.stringify(manifests[id]));};
  window.packs=mountPostDownloadSections({host:document.querySelector('#packs'),trust,policy,fetchImpl,store:{get:async()=>undefined,put:async()=>{},removePrefix:async()=>{}}});
 },{trust,manifests,policy});
 const panel=page.locator('.post-download-sections');
 await page.getByText('Could not check offline packs. Check your connection, then try again.').waitFor();
 assert.equal(await panel.isHidden(),false,'the panel stays visible with the failure message instead of disappearing');
 assert.equal(await page.getByRole('button',{name:/Download|Resume/}).count(),0,'no pack looked available');
 const retryButton=page.getByRole('button',{name:'Try again',exact:true});
 assert.equal(await retryButton.isVisible(),true,'Retry is offered instead of leaving a dead end');
 await page.evaluate(()=>{window.broken=false;});
 await retryButton.click();
 await page.getByRole('button',{name:'Download ships & worlds',exact:true}).waitFor();
 assert.equal(await retryButton.isHidden(),true,'Retry is hidden again once every section resolves');
}));

test('one section failing still shows the rest, and names what is missing',async()=>withPage(async page=>{
 const pair=generateKeyPairSync('ed25519'),trust=pair.publicKey.export({format:'jwk'}),bytes=Buffer.from([1,2,3,4]),digest=createHash('sha256').update(bytes).digest('hex');
 const manifest=packId=>{const m={schema:'mom-material-chunks-v1',packId,version:'1.0.0',keyId:'test-v1',assets:[{path:'assets/test.bin',bytes:4,sha256:digest,chunks:[{index:0,offset:0,bytes:4,sha256:digest,url:'https://pack.test/materials/'+packId}]}]};m.signature=sign(null,Buffer.from(canonicalChunkPayload(m)),pair.privateKey).toString('base64');return m;};
 const manifests=Object.fromEntries(SECTION_IDS.map(id=>[id,manifest(id)]));
 const policy={maxChunkBytes:1024,maxAssetBytes:1024,maxPackBytes:2048,maxAssets:16,maxChunksPerAsset:256,trustedOrigins:['https://pack.test'],allowedProtocols:['https:'],pathPrefix:'/materials/'};
 await page.evaluate(async({trust,manifests,policy})=>{
  const {mountPostDownloadSections}=await import('/ui.js');
  window.myr5AuthenticatedAccount={user:{id:'owner-a'}};
  const fetchImpl=async url=>{const id=String(url).split('/')[2];if(id==='coach-ships-biomes')throw new Error('ships manifest unreachable');return new Response(JSON.stringify(manifests[id]));};
  window.packs=mountPostDownloadSections({host:document.querySelector('#packs'),trust,policy,fetchImpl,store:{get:async()=>undefined,put:async()=>{},removePrefix:async()=>{}}});
 },{trust,manifests,policy});
 await page.getByText('1 of 9 packs could not be checked. Try again for the rest.').waitFor();
 assert.equal(await page.getByRole('button',{name:'Download Chest pack',exact:true}).isVisible(),true,'sections that did resolve are still offered');
 assert.equal(await page.getByRole('button',{name:'Download ships & worlds',exact:true}).count(),0,'the one that failed is not offered as if it worked');
 assert.equal(await page.getByRole('button',{name:'Try again',exact:true}).isVisible(),true);
}));
