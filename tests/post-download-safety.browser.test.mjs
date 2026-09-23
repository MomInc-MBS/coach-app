import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {build} from 'esbuild';
import {chromium} from 'playwright';
import {generateKeyPairSync,sign,createHash} from 'node:crypto';
import {canonicalChunkPayload} from '../modules/materials/chunk-delivery.mjs';

async function withPage(run){
 const ui=await build({entryPoints:['modules/materials/post-download-ui.mjs'],bundle:true,write:false,format:'esm',target:'es2022'});
 const source=resolve('.'),dist=resolve('dist/client');
 const server=createServer(async(req,res)=>{const path=new URL(req.url,'http://test').pathname;
  if(path==='/'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><style>#view{position:relative;width:390px;height:700px}</style><div id="packs"></div><div id="view"><div class="myr5-companion-card">Coach</div></div><script type="importmap">{"imports":{"three":"/vendor/three/three.module.js","three/addons/loaders/GLTFLoader.js":"/vendor/three/GLTFLoader.js"}}</script>');return;}
  if(path==='/ui.js'){res.setHeader('Content-Type','text/javascript');res.end(ui.outputFiles[0].text);return;}
  try{const root=path.startsWith('/modules/')?source:dist,file=resolve(root,'.'+path);if(!file.startsWith(root+sep))throw Error();res.setHeader('Content-Type',({'.js':'text/javascript','.mjs':'text/javascript','.css':'text/css'})[extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404);res.end();}
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-gl=angle','--use-angle=swiftshader']});const page=await browser.newPage();await page.goto('http://127.0.0.1:'+server.address().port);await run(page);}finally{await browser?.close();await new Promise(r=>server.close(r));}
}
test('signed packet UI pauses/resumes verified chunks, resets on account switch and ignores stale discovery',async()=>withPage(async page=>{
 const pair=generateKeyPairSync('ed25519'),trust=pair.publicKey.export({format:'jwk'}),bytes=Buffer.from([1,2,3,4]),digest=createHash('sha256').update(bytes).digest('hex');
 const manifests=Object.fromEntries(['chest','quads','glutes','arms','yoga','martial-arts','cardio','meditation'].map(track=>`track-${track}`).concat('coach-ships-biomes').map(packId=>{const m={schema:'mom-material-chunks-v1',packId,version:'1.0.0',keyId:'test-v1',assets:[{path:'assets/test.bin',bytes:4,sha256:digest,chunks:[{index:0,offset:0,bytes:4,sha256:digest,url:'https://pack.test/materials/'+packId}]}]};m.signature=sign(null,Buffer.from(canonicalChunkPayload(m)),pair.privateKey).toString('base64');return [packId,m];}));
 await page.evaluate(async({trust,manifests})=>{
  const {mountPostDownloadSections}=await import('/ui.js');window.myr5AuthenticatedAccount={user:{id:'owner-a'}};localStorage.setItem('myr5-selected-tracks-v1',JSON.stringify(['chest','cardio','quads']));
  window.pending=[];window.hold=true;window.assetCalls=0;window.deferDiscovery=false;window.discoveries=[];
  const fetchImpl=async(url,options={})=>{if(String(url).endsWith('chunk-manifest.json')){const id=String(url).split('/')[2];if(window.deferDiscovery)await new Promise(resolve=>window.discoveries.push(resolve));return new Response(JSON.stringify(manifests[id]));}window.assetCalls++;if(window.hold)await new Promise((resolve,reject)=>{window.pending.push(resolve);options.signal.addEventListener('abort',()=>reject(new DOMException('cancelled','AbortError')),{once:true});});return new Response(new Uint8Array([1,2,3,4]),{status:206,headers:{'Content-Range':'bytes 0-3/4','Content-Length':'4'}});};
  const data=new Map(),store={get:async k=>data.get(k),put:async(k,v)=>data.set(k,new Uint8Array(v)),removePrefix:async p=>{for(const k of data.keys())if(k.startsWith(p))data.delete(k);}};
  window.packs=mountPostDownloadSections({host:document.querySelector('#packs'),trust,fetchImpl,store,policy:{maxChunkBytes:1024,maxAssetBytes:1024,maxPackBytes:2048,maxAssets:16,maxChunksPerAsset:256,trustedOrigins:['https://pack.test'],allowedProtocols:['https:'],pathPrefix:'/materials/'}});
 },{trust,manifests});
 await page.getByRole('button',{name:'Download starter styles',exact:true}).click();await page.waitForFunction(()=>assetCalls===1);await page.getByRole('button',{name:'Pause',exact:true}).click();await page.getByRole('button',{name:'Resume starter styles',exact:true}).waitFor();
 await page.evaluate(()=>{window.hold=false;});await page.getByRole('button',{name:'Resume starter styles',exact:true}).click();await page.getByText('Offline packs ready.',{exact:true}).waitFor();assert.equal(await page.evaluate(()=>assetCalls),5);
 await page.getByRole('button',{name:'Download starter styles',exact:true}).click();await page.getByText('Offline packs ready.',{exact:true}).waitFor();assert.equal(await page.evaluate(()=>assetCalls),5,'verified cached chunks are reused');
 await page.evaluate(()=>{window.deferDiscovery=true;void packs.refresh();window.myr5AuthenticatedAccount={user:{id:'owner-b'}};window.dispatchEvent(new CustomEvent('myr5:account-ready',{detail:window.myr5AuthenticatedAccount}));window.myr5AuthenticatedAccount=null;window.dispatchEvent(new Event('myr5:account-cleared'));for(const resolve of discoveries)resolve();});
 await page.waitForFunction(()=>document.querySelector('.post-download-sections').hidden);assert.equal(await page.getByRole('button',{name:/Download|Resume/}).count(),0);await page.evaluate(()=>packs.dispose());assert.equal(await page.locator('.post-download-sections').count(),0);
}));

async function mountFixture(page,{late=false}={}){return page.evaluate(async({late})=>{
 const THREE=await import('/vendor/three/three.module.js'),{GLTFLoader}=await import('/vendor/three/GLTFLoader.js');window.modelDisposes=0;window.bridgeDisposes=0;window.readyEvents=[];window.transitions=[];window.myr5AuthenticatedAccount={user:{id:'owner-a'}};
 window.addEventListener('myr5:ship-scene-ready',e=>readyEvents.push(e.detail));window.addEventListener('myr5:portal-transition',e=>transitions.push(e.detail.phase));
 GLTFLoader.prototype.loadAsync=async()=>{const model=new THREE.Group(),geometry=new THREE.BoxGeometry(),material=new THREE.MeshStandardMaterial();geometry.addEventListener('dispose',()=>window.modelDisposes++);model.add(new THREE.Mesh(geometry,material));window.fixtureModel=model;if(late)await new Promise(resolve=>window.releaseModel=resolve);return {scene:model};};
 const add=THREE.Scene.prototype.add;THREE.Scene.prototype.add=function(...nodes){window.shipSceneGraph=this;return add.apply(this,nodes);};
 const {mountShipScene}=await import('/modules/ships/ship-intro.mjs');window.shipApi=mountShipScene({assetBridge:{ownedShipIds:()=>['supportive'],getShipUrl:()=> 'blob:verified',getBackgroundUrl:()=> 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==',dispose:()=>window.bridgeDisposes++}});return true;
 },{late});}
test('ship reduced-motion reveal stamps its owner, stays still, covers dialogs and disposes on logout',async()=>withPage(async page=>{
 await page.emulateMedia({reducedMotion:'reduce'});assert(await mountFixture(page));await page.waitForFunction(()=>readyEvents.length===1);assert.deepEqual(await page.evaluate(()=>({owner:readyEvents[0].ownerId,done:readyEvents[0].revealComplete,phases:transitions})),{owner:'owner-a',done:true,phases:['flash','complete']});
 const transform=await page.evaluate(async()=>{const ship=shipSceneGraph.children.find(n=>n.isGroup),before=ship.matrix.toArray();await new Promise(r=>setTimeout(r,120));return [before,ship.matrix.toArray()];});assert.deepEqual(...transform);
 await page.evaluate(()=>{window.myr5AuthenticatedAccount=null;window.dispatchEvent(new Event('myr5:account-cleared'));});assert.equal(await page.locator('.ship-scene,.ship-scene-flash').count(),0);assert.equal(await page.evaluate(()=>modelDisposes),1);assert.equal(await page.evaluate(()=>bridgeDisposes),1);assert.equal(await page.locator('#view').getAttribute('class'),'');assert.equal(await page.evaluate(()=>!!window.myr5ShipScene),false);
}));
test('ship close during load disposes late models and never completes a reveal',async()=>withPage(async page=>{
 await mountFixture(page,{late:true});await page.evaluate(()=>{shipApi.dispose();releaseModel();});await page.waitForFunction(()=>modelDisposes===1);assert.equal(await page.evaluate(()=>readyEvents.length),0);assert.equal(await page.locator('.ship-scene,.ship-scene-flash').count(),0);
}));
test('ship WebGL failure restores the coach and revokes the verified bridge',async()=>withPage(async page=>{
 await page.evaluate(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,...args){return /webgl/i.test(kind)?null:get.call(this,kind,...args);};});await assert.rejects(()=>mountFixture(page),/WebGL/);assert.equal(await page.locator('.ship-scene,.ship-scene-flash').count(),0);assert.equal(await page.evaluate(()=>bridgeDisposes),1);assert.equal(await page.locator('#view').getAttribute('class'),'');
}));
