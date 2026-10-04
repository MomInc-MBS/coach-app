import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';
import {build} from 'esbuild';
import {signedSkinFixture} from './skin-fixture.mjs';

test('skin editor stays hidden for anonymous, unowned, and unsigned packs while old fitness materials still render',async()=>{
 const root=resolve('dist/client'),requests=[];
 const editor=await build({entryPoints:['creature/source/editor.ts'],bundle:true,write:false,format:'esm',target:'es2022'});
 const server=createServer(async(req,res)=>{const path=new URL(req.url,'http://local').pathname;requests.push(path);
  if(path.startsWith('/api/')){res.writeHead(path==='/api/auth/config'?200:401,{'Content-Type':'application/json'});res.end(JSON.stringify(path==='/api/auth/config'?{enabled:false}:{error:'Sign in'}));return;}
  try{const body=path==='/creature/assets/editor.js'?editor.outputFiles[0].text:await readFile(resolve(root,'.'+path));res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.mjs':'text/javascript'})[extname(path)]||'application/octet-stream');res.end(body);}catch{res.writeHead(404);res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage();
  await page.addInitScript(()=>sessionStorage.setItem('myr5-ship-gate','ship-admission-v2')); // #148: opened through the arrival's ship
  await page.addInitScript(()=>{const recipe=JSON.parse(localStorage.getItem('myr5-recipe-v1')||'{}');recipe.materials={...(recipe.materials||{}),body:{...(recipe.materials?.body||{}),textureId:'creature-starforged-plate'}};localStorage.setItem('myr5-recipe-v1',JSON.stringify(recipe));});
  await page.goto('http://127.0.0.1:'+server.address().port+'/creature/index.html');await page.waitForFunction(()=>window.myr5Companion?.ready===true,null,{timeout:60000});
  assert.equal(await page.locator('#tab-skin').count(),1,'the editor should build its initially hidden skin tab');assert.equal(await page.locator('#tab-skin').isHidden(),true);assert.equal(await page.locator('#tab-skin').evaluate(el=>el.tabIndex),-1);
  await page.evaluate(()=>{window.myr5AuthenticatedAccount={user:{id:'fixture-owner'}};window.dispatchEvent(new CustomEvent('myr5:account-ready',{detail:window.myr5AuthenticatedAccount}));});
  await page.waitForTimeout(100);assert.equal(await page.locator('#tab-skin').isHidden(),true);assert.equal(await page.locator('#skinChoice option').count(),0);
  assert(requests.includes('/creature/models/myr5.glb'));
  assert.equal(requests.some(path=>path.includes('/materials/track-')),false,'unconfigured production trust must fail closed before pack requests');
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
});

test('signed installed skin survives the real rig shader handoff, offline reload, and account teardown',async()=>{
 const root=resolve('dist/client');let editor,phone,helper,fixture,offline=false,chunkRequests=0,manifestRequests=0,authenticatedOwner='owner-a';
 const server=createServer(async(req,res)=>{const path=new URL(req.url,'http://local').pathname;
  if(path==='/api/auth/config'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({enabled:false}));return;}
  if(path==='/api/account'){
   res.setHeader('Content-Type','application/json');
   if(!authenticatedOwner){res.writeHead(401);res.end(JSON.stringify({error:'Sign in'}));return;}
   res.end(JSON.stringify({user:{id:authenticatedOwner},dataEpoch:1}));return;
  }
  if(path==='/__account/owner-b'){authenticatedOwner='owner-b';res.end('ok');return;}
  if(path==='/__seed__'){res.setHeader('Content-Type','text/html');res.end('<!doctype html>');return;}
  if(path==='/fixture.js'){res.setHeader('Content-Type','text/javascript');res.end(helper);return;}
  if(path==='/fixture.bin'){res.end(fixture.asset);return;}
  if(path==='/skin-map.webp'){res.end(fixture.maps.basecolor);return;}
  if(path==='/phone.html'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><style>#view,.myr5-companion-stage{width:400px;height:600px}</style><div id="view"></div><script type="module" src="/creature/assets/phone.js"></script>');return;}
  if(path==='/creature/assets/phone.js'){res.setHeader('Content-Type','text/javascript');res.end(phone);return;}
  if(path==='/materials/track-chest/chunk-manifest.json'){manifestRequests++;if(offline){res.destroy();return;}res.setHeader('Content-Type','application/json');res.end(JSON.stringify(fixture.manifest));return;}
  if(path==='/materials/chest'){chunkRequests++;res.writeHead(500);res.end();return;}
  try{const body=path==='/creature/assets/editor.js'?editor:await readFile(resolve(root,'.'+path));res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.mjs':'text/javascript'})[extname(path)]||'application/octet-stream');res.end(body);}catch{res.writeHead(404);res.end();}
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;let browser;
 try{
  fixture=await signedSkinFixture(origin);
  const plugins=[{name:'signed-fixture-only',setup(build){build.onLoad({filter:/material-config\.mjs$/},async args=>({contents:(await readFile(args.path,'utf8')).replace(/BUILT_PUBLIC_MATERIAL_SIGNING_JWK = [^;]+;/,'BUILT_PUBLIC_MATERIAL_SIGNING_JWK = '+JSON.stringify(fixture.trust)+';'),loader:'js'}));build.onLoad({filter:/chunk-delivery\.mjs$/},async args=>({contents:(await readFile(args.path,'utf8')).replace("Object.freeze(['https:'])","Object.freeze(['https:','http:'])"),loader:'js'}));}}];
  editor=(await build({entryPoints:['creature/source/editor.ts'],bundle:true,write:false,format:'esm',target:'es2022',plugins})).outputFiles[0].text;
  phone=(await build({entryPoints:['creature/source/phone.ts'],bundle:true,write:false,format:'esm',target:'es2022',plugins})).outputFiles[0].text;
  helper=(await build({stdin:{contents:"export {indexedDbChunkStore} from './modules/materials/chunk-delivery.mjs';export {resolvePostDownloadSection} from './modules/materials/post-download-sections.mjs';export {createInstalledCreatureSkinSource} from './modules/materials/installed-creature-skins.mjs';export {productionMaterialTrust} from './modules/materials/material-config.mjs';export {grantUnlock} from './unlock-ledger.mjs';export {fresh} from './creature/source/profile.ts';export {applyInstalledSkin} from './creature/source/creator/skin-materials.ts';export * as THREE from 'three';",resolveDir:process.cwd()},bundle:true,write:false,format:'esm',target:'es2022',plugins})).outputFiles[0].text;
  browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-gl=angle','--use-angle=swiftshader']});const page=await browser.newPage({reducedMotion:'reduce'}),shaderErrors=[];page.on('console',message=>{if(/THREE.WebGLProgram: Shader Error|VALIDATE_STATUS|VALIDATE_STATUS/.test(message.text()))shaderErrors.push(message.text());});
  await page.addInitScript(()=>{if(location.pathname==='/phone.html')window.myr5AuthenticatedAccount={user:{id:'owner-a'},dataEpoch:1};sessionStorage.setItem('myr5-ship-gate','ship-admission-v2');});await page.goto(origin+'/__seed__');
  await page.evaluate(async({manifest,skinId})=>{const {indexedDbChunkStore,grantUnlock,fresh}=await import('/fixture.js'),store=indexedDbChunkStore(),bytes=new Uint8Array(await (await fetch('/fixture.bin')).arrayBuffer());for(const chunk of manifest.assets[0].chunks)await store.put(`material/owner-a/track-chest/1.0.0/fixture-v1/assets/chest.m5bundle/${chunk.index}`,bytes.slice(chunk.offset,chunk.offset+chunk.bytes));grantUnlock('creature-skin',skinId,{account:'owner-a'});localStorage.setItem('myr5-editor-skins-v1/account/owner-a',JSON.stringify({body:skinId}));localStorage.setItem('myr5-recipe-v1',JSON.stringify(fresh()));},{manifest:fixture.manifest,skinId:fixture.skin.id});
  const ready=async()=>{try{await page.waitForFunction(owner=>window.myr5AuthenticatedAccount?.user?.id===owner&&window.myr5AuthenticatedAccount.dataEpoch===1&&window.myr5Companion?.ready&&window.myr5Companion.viewer.skinTextures.size>0,authenticatedOwner,{timeout:20000});}catch(error){throw new Error(JSON.stringify(await page.evaluate(async()=>{const helper=await import('/fixture.js');let resolved;try{await helper.resolvePostDownloadSection('track-chest');resolved='ok';}catch(error){resolved=error.message;}return {resolved,trust:helper.productionMaterialTrust(),owner:window.myr5AuthenticatedAccount,ledger:localStorage.getItem('myr5-battle-pass-ledger-v1/account/owner-a'),status:document.querySelector('#creatureStatus')?.textContent,skinHidden:document.querySelector('#tab-skin')?.hidden,ready:window.myr5Companion?.ready,textures:window.myr5Companion?.viewer.skinTextures.size};}))+' '+error.message);}};await page.goto(origin+'/creature/index.html');await ready();assert.equal(await page.locator('#tab-skin').isVisible(),true);assert.equal(await page.locator('#skinChoice option').count(),1);assert.equal(chunkRequests,0);
  const shader=await page.evaluate(()=>{const viewer=myr5Companion.viewer;let material;viewer.rig.root.traverse(node=>{if(node.material?.userData.installedSkinId)material=node.material;});if(!material)return null;const shader={uniforms:{},vertexShader:'#include <common>\n#include <uv_vertex>',fragmentShader:'#include <common>\n#include <color_fragment>\n#include <emissivemap_fragment>'};material.onBeforeCompile(shader,viewer.renderer);viewer.renderer.render(viewer.scene,viewer.camera);return {fragment:shader.fragmentShader,normal:material.normalMap?.colorSpace,mask:shader.uniforms.myr5SkinMask.value.colorSpace,metalness:material.metalness,key:material.customProgramCacheKey()};});assert(shader,'displayed rig must retain the installed material');assert.match(shader.fragment,/diffuseColor.rgb=skinBase\*skinPalette/);assert.equal(shader.mask,'srgb');assert.equal(shader.normal,'');assert.equal(shader.metalness,1);assert.match(shader.key,/installed-skin/);assert.deepEqual(shaderErrors,[]);
  const sameOwnerVisible=await page.evaluate(()=>{const viewer=myr5Companion.viewer,rig=viewer.rig,count=viewer.skinTextures.size;window.dispatchEvent(new Event('myr5:battle-pass'));return {rigRetained:viewer.rig===rig,texturesRetained:viewer.skinTextures.size===count,skinVisible:!document.querySelector('#tab-skin').hidden};});
  assert.deepEqual(sameOwnerVisible,{rigRetained:true,texturesRetained:true,skinVisible:true},'same-owner revalidation must keep the currently displayed verified skin');await ready();
  // Exercise the real editor history: the recipe, selector, and separate owner save
  // must agree after choosing a skin, Undo, Redo, and an offline reload after Undo.
  const savedSkins=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('myr5-editor-skins-v1/account/owner-a')));
  const recipeSkin=()=>page.evaluate(()=>myr5Companion.recipe.materials?.body?.textureId);
  const noSkin=()=>page.waitForFunction(()=>myr5Companion.ready&&myr5Companion.viewer.skinTextures.size===0);
  // #139: the Adaptation (Species tab) and an installed skin both cover every part of the coach.
  const everyPart=id=>Object.fromEntries(['head','eye','collar','body','arms','feet'].map(region=>[region,id]));
  await page.click('#tab-body');await page.selectOption('#textureId','flat');await noSkin();
  await page.click('#tab-skin');assert.match(await page.locator('#panel-skin .help').textContent(),/covers every part/);
  await page.selectOption('#skinChoice',fixture.skin.id);await ready();
  assert.equal(await recipeSkin(),fixture.skin.id);assert.equal(await page.locator('#skinChoice').inputValue(),fixture.skin.id);assert.deepEqual(await savedSkins(),everyPart(fixture.skin.id));
  await page.click('#undo');await noSkin();
  assert.equal(await recipeSkin(),'flat');assert.equal(await page.locator('#skinChoice').inputValue(),'');assert.deepEqual(await savedSkins(),{});
  await page.click('#redo');await ready();
  assert.equal(await recipeSkin(),fixture.skin.id);assert.equal(await page.locator('#skinChoice').inputValue(),fixture.skin.id);assert.deepEqual(await savedSkins(),everyPart(fixture.skin.id));
  await page.click('#undo');await noSkin();offline=true;await page.reload();await noSkin();
  await page.waitForFunction(()=>!document.querySelector('#tab-skin').hidden);
  assert.equal(await recipeSkin(),'flat');assert.equal(await page.locator('#skinChoice').inputValue(),'');assert.deepEqual(await savedSkins(),{});
  await page.click('#tab-skin');await page.selectOption('#skinChoice',fixture.skin.id);await ready();
  await page.reload();await ready();assert.equal(await page.locator('#tab-skin').isVisible(),true,'verified cached metadata permits offline reload');
  await page.evaluate(async()=>{window.disposals=0;for(const texture of myr5Companion.viewer.skinTextures)texture.addEventListener('dispose',()=>window.disposals++);window.textureCount=myr5Companion.viewer.skinTextures.size;await fetch('/__account/owner-b');window.dispatchEvent(new Event('focus'));});await page.waitForFunction(()=>window.myr5AuthenticatedAccount?.user?.id==='owner-b'&&myr5Companion.ready&&myr5Companion.viewer.skinTextures.size===0);assert.equal(await page.locator('#tab-skin').isHidden(),true);assert.equal(await page.evaluate(()=>disposals),await page.evaluate(()=>textureCount));assert.equal(await page.locator('#skinChoice option').count(),0);assert.equal(await page.locator('#tab-ship').isHidden(),true);assert.equal(await page.locator('#undo').isDisabled(),true);assert.equal(await page.locator('#redo').isDisabled(),true);
  await page.locator('#tab-body').focus();await page.keyboard.press('End');assert.notEqual(await page.evaluate(()=>document.activeElement.id),'tab-skin');assert.notEqual(await page.evaluate(()=>document.activeElement.id),'tab-ship');assert.deepEqual(shaderErrors,[]);
  // A pack completed for this owner must become visible without another login;
  // another owner's completion event must leave this owner's view untouched.
  offline=false;
  await page.evaluate(async({manifest,skinId})=>{const {indexedDbChunkStore,grantUnlock}=await import('/fixture.js'),store=indexedDbChunkStore(),bytes=new Uint8Array(await (await fetch('/fixture.bin')).arrayBuffer());for(const chunk of manifest.assets[0].chunks)await store.put(`material/owner-b/track-chest/1.0.0/fixture-v1/assets/chest.m5bundle/${chunk.index}`,bytes.slice(chunk.offset,chunk.offset+chunk.bytes));grantUnlock('creature-skin',skinId,{account:'owner-b'});localStorage.setItem('myr5-editor-skins-v1/account/owner-b',JSON.stringify({body:skinId}));window.dispatchEvent(new CustomEvent('myr5:sections-installed',{detail:{ownerId:'owner-a',sections:['track-chest']}}));},{manifest:fixture.manifest,skinId:fixture.skin.id});
  await page.waitForTimeout(100);assert.equal(await page.locator('#tab-skin').isHidden(),true,'another owner cannot refresh this owner’s installed skin view');
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('myr5:sections-installed',{detail:{ownerId:'owner-b',sections:['track-chest']}})));await ready();assert.equal(await page.locator('#tab-skin').isVisible(),true);assert.equal(await recipeSkin(),fixture.skin.id);
  const beforeMalformed=manifestRequests;await page.evaluate(()=>{for(const detail of [{ownerId:'owner-b',sections:'track-chest'},{ownerId:'owner-b',sections:['track-chest',null]},{ownerId:42,sections:['track-chest']},null])window.dispatchEvent(new CustomEvent('myr5:sections-installed',{detail}));});await page.waitForTimeout(100);assert.equal(manifestRequests,beforeMalformed,'malformed install events must be ignored without starting a refresh');
  await page.click('#tab-skin');await page.evaluate(()=>{const key='myr5-battle-pass-ledger-v1/account/owner-b',ledger=JSON.parse(localStorage.getItem(key));ledger['creature-skin']=[];localStorage.setItem(key,JSON.stringify(ledger));window.dispatchEvent(new Event('myr5:battle-pass'));});await noSkin();assert.equal(await page.locator('#tab-skin').isHidden(),true);assert.equal(await page.locator('#tab-body').getAttribute('aria-selected'),'true','empty revalidation moves keyboard and panel focus out of the hidden skin tab');assert.equal(await recipeSkin(),'flat','revoked grants must clear the prior visible skin after revalidation');
  const failedDecode=await page.evaluate(async()=>{const {applyInstalledSkin,THREE}=await import('/fixture.js'),owned=new Set(),valid=new Uint8Array(await (await fetch('/skin-map.webp')).arrayBuffer()),mesh=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial());mesh.geometry.deleteAttribute('uv');let failed=false;try{await applyInstalledSkin(mesh,{id:'fixture',maps:{basecolor:valid,normal:new Uint8Array([1,2,3])}},{primary:'#fff',secondary:'#fff',accent:'#fff'},owned);}catch{failed=true;}const hasUv=!!mesh.geometry.getAttribute('uv');mesh.geometry.dispose();mesh.material.dispose();return {failed,left:owned.size,hasUv};});assert.deepEqual(failedDecode,{failed:true,left:0,hasUv:true});
  await page.addInitScript(()=>{window.skinShaders=0;const shader=WebGL2RenderingContext.prototype.shaderSource;WebGL2RenderingContext.prototype.shaderSource=function(handle,source){if(source.includes('diffuseColor.rgb=skinBase*skinPalette'))window.skinShaders++;return shader.call(this,handle,source);};});
  await page.goto(origin+'/phone.html');await page.waitForFunction(()=>document.querySelector('.myr5-companion-card')?.dataset.ready==='true'&&window.skinShaders>0,null,{timeout:30000});assert.equal(await page.evaluate(()=>myr5Creature.stats().recipe.materials.body.textureId),fixture.skin.id,'phone consumes the same owner-scoped installed choice');
  await page.evaluate(()=>{const key='myr5-battle-pass-ledger-v1/account/owner-a',ledger=JSON.parse(localStorage.getItem(key));ledger['creature-skin']=[];localStorage.setItem(key,JSON.stringify(ledger));window.dispatchEvent(new Event('myr5:battle-pass'));});await page.getByText('No verified installed skins. Check your extra packs and try again.',{exact:true}).waitFor();await page.waitForTimeout(500);assert.equal(await page.locator('.myr5-companion-status').textContent(),'No verified installed skins. Check your extra packs and try again.','the motion timer must preserve actionable status after built-in fallback succeeds');
  await page.evaluate(()=>{window.myr5AuthenticatedAccount=null;window.dispatchEvent(new Event('myr5:account-cleared'));});await page.waitForFunction(()=>document.querySelector('.myr5-companion-card')?.dataset.ready==='true'&&!myr5Creature.stats().recipe.materials?.body?.textureId?.startsWith('creature-'));assert.deepEqual(shaderErrors,[]);
 }finally{await browser?.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
});
