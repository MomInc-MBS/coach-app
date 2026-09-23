// Ian reported he couldn't find the extra packs at all (Install -> Full download -> Extra offline
// packs is three levels deep). window.myr5Packs.open(sectionId?) is the fix other code (the ship
// scene, when its pack is missing) calls to jump the owner straight to the right button.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {build} from 'esbuild';
import {chromium} from 'playwright';
import {generateKeyPairSync,sign,createHash} from 'node:crypto';
import {canonicalChunkPayload} from '../../modules/materials/chunk-delivery.mjs';

test('myr5Packs.open() opens Install, scrolls to Extra offline packs, and can point at one section',async()=>{
 const pair=generateKeyPairSync('ed25519'),publicJwk=pair.publicKey.export({format:'jwk'});
 const commit='0123456789abcdef0123456789abcdef01234567',pathPrefix=`/owner/repo/${commit}/materials/`;
 const policy={trustedOrigins:['https://raw.githubusercontent.com'],allowedProtocols:['https:'],pathPrefix};
 const post=await build({entryPoints:['post-download.mjs'],bundle:true,write:false,format:'esm',target:'es2022',
  define:{__MYR5_MATERIAL_PUBLIC_JWK__:JSON.stringify(publicJwk),__MYR5_MATERIAL_RESOURCE_POLICY__:JSON.stringify(policy)}});
 const bytes=Buffer.from([1,2,3,4]),digest=createHash('sha256').update(bytes).digest('hex');
 const SECTION_IDS=['chest','quads','glutes','arms','yoga','martial-arts','cardio','meditation'].map(t=>`track-${t}`).concat('coach-ships-biomes');
 const manifest=packId=>{const m={schema:'mom-material-chunks-v1',packId,version:'1.0.0',keyId:'test-v1',assets:[{path:'assets/test.bin',bytes:4,sha256:digest,chunks:[{index:0,offset:0,bytes:4,sha256:digest,url:`https://raw.githubusercontent.com${pathPrefix}${packId}/1.0.0/test.bin`}]}]};m.signature=sign(null,Buffer.from(canonicalChunkPayload(m)),pair.privateKey).toString('base64');return JSON.stringify(m);};
 const source=resolve('.');
 const server=createServer(async(req,res)=>{
  const path=new URL(req.url,'http://test').pathname,materials=path.match(/^\/materials\/([a-z0-9-]+)\/chunk-manifest\.json$/);
  if(path==='/'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><style>body{height:3000px;margin:0}dialog{position:fixed}</style><dialog id="installPanel"><h2 id="installTitle">Install Coach</h2></dialog>');return;}
  if(path==='/post-download.js'){res.setHeader('Content-Type','text/javascript');res.end(post.outputFiles[0].text);return;}
  if(materials&&SECTION_IDS.includes(materials[1])){res.setHeader('Content-Type','application/json');res.end(manifest(materials[1]));return;}
  try{const file=resolve(source,'.'+path);if(!file.startsWith(source+sep))throw Error();res.setHeader('Content-Type',{'.js':'text/javascript','.mjs':'text/javascript'}[extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404);res.end();}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage();
  await page.goto('http://127.0.0.1:'+server.address().port);
  await page.evaluate(()=>{Object.defineProperty(navigator,'serviceWorker',{value:{controller:{}},configurable:true});});
  await page.evaluate(async()=>{
   const {mountPostDownload}=await import('/post-download.js');
   window.myr5AuthenticatedAccount={user:{id:'owner-a'}};
   mountPostDownload({host:document.getElementById('installPanel')});
   window.dispatchEvent(new CustomEvent('myr5:account-ready',{detail:window.myr5AuthenticatedAccount}));
  });
  await page.waitForFunction(()=>[...document.querySelectorAll('.post-download-sections button')].some(b=>b.textContent.includes('ships')));

  const generic=await page.evaluate(()=>window.myr5Packs.open());
  assert.equal(generic,false,'no section requested: nothing to highlight, but it still opens');
  assert.equal(await page.evaluate(()=>document.getElementById('installPanel').open),true,'Install panel opened');

  await page.evaluate(()=>document.getElementById('installPanel').close());
  const found=await page.evaluate(()=>window.myr5Packs.open('coach-ships-biomes'));
  assert.equal(found,true,'the ships & worlds button was located');
  assert.equal(await page.evaluate(()=>document.getElementById('installPanel').open),true);
  assert.equal(await page.evaluate(()=>document.activeElement?.textContent),'Download ships & worlds','the exact section button is focused');

  const missing=await page.evaluate(()=>window.myr5Packs.open('not-a-real-section'));
  assert.equal(missing,false,'an unknown id opens the panel but highlights nothing');

  // Signed out: no Extra offline packs panel exists, but open() still reaches Install instead of throwing.
  await page.evaluate(()=>{document.getElementById('installPanel').close();window.myr5AuthenticatedAccount=null;window.dispatchEvent(new Event('myr5:account-cleared'));});
  const signedOut=await page.evaluate(()=>window.myr5Packs.open('coach-ships-biomes'));
  assert.equal(signedOut,false);
  assert.equal(await page.evaluate(()=>document.getElementById('installPanel').open),true,'still opens Install for a signed-out visitor');
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
});
