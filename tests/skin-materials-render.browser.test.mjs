import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {build} from 'esbuild';
import {chromium} from 'playwright';

// This fixture measures rendered pixels, independently of the shader's source text.
test('installed normal and height maps create visible relief and corrupt maps retain the prior material',async()=>{
 const helper=(await build({stdin:{contents:"export {applyInstalledSkin} from './creature/source/creator/skin-materials.ts';export * as THREE from 'three';",resolveDir:process.cwd()},bundle:true,write:false,format:'esm',target:'es2022'})).outputFiles[0].text;
 const server=createServer((req,res)=>{res.setHeader('Content-Type',req.url==='/fixture.js'?'text/javascript':'text/html');res.end(req.url==='/fixture.js'?helper:'<!doctype html>');});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-gl=angle','--use-angle=swiftshader']});
  const page=await browser.newPage(),errors=[];page.on('console',message=>{if(/THREE.WebGLProgram: Shader Error|VALIDATE_STATUS/.test(message.text()))errors.push(message.text());});
  await page.goto('http://127.0.0.1:'+server.address().port);
  const result=await page.evaluate(async()=>{
   const {THREE:T,applyInstalledSkin}=await import('/fixture.js');
   async function map(pixel){const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const ctx=canvas.getContext('2d'),image=ctx.createImageData(64,64);for(let y=0;y<64;y++)for(let x=0;x<64;x++){const rgb=pixel(x,y),at=(y*64+x)*4;image.data.set([...rgb,255],at);}ctx.putImageData(image,0,0);return new Uint8Array(await (await new Promise(resolve=>canvas.toBlob(resolve,'image/png'))).arrayBuffer());}
   const normal=await map((x,y)=>x%16<8?[220,128,220]:[36,128,220]),height=await map((x,y)=>{const value=Math.round(127+120*Math.sin(x*.5)*Math.cos(y*.5));return[value,value,value];});
   const renderer=new T.WebGLRenderer({antialias:false}),target=new T.WebGLRenderTarget(96,96,{type:T.FloatType}),scene=new T.Scene(),camera=new T.OrthographicCamera(-1,1,1,-1,.1,10);camera.position.z=3;
   scene.add(new T.AmbientLight(0xffffff,.12));const light=new T.DirectionalLight(0xffffff,2);light.position.set(2,1,3);scene.add(light);
   const material=new T.MeshPhysicalMaterial({color:'#b0b0b0',roughness:.65}),mesh=new T.Mesh(new T.PlaneGeometry(1.9,1.9),material),owned=new Set();scene.add(mesh);
   function pixels(){renderer.setRenderTarget(target);renderer.render(scene,camera);const bytes=new Float32Array(96*96*4);renderer.readRenderTargetPixels(target,0,0,96,96,bytes);return bytes;}
   function difference(a,b){let sum=0,count=0;for(let y=8;y<88;y++)for(let x=8;x<88;x++)for(let c=0;c<3;c++){sum+=Math.abs(a[(y*96+x)*4+c]-b[(y*96+x)*4+c]);count++;}return sum/count;}
   const palette={primary:'#ffffff',secondary:'#ffffff',accent:'#ffffff'},plain=pixels();
   await applyInstalledSkin(mesh,{id:'normal-fixture',maps:{normal}},palette,owned);const normalPixels=pixels();material.normalMap=null;material.needsUpdate=true;
   await applyInstalledSkin(mesh,{id:'height-fixture',maps:{height}},palette,owned);const heightPixels=pixels();
   const before={normal:material.normalMap,bump:material.bumpMap,hook:material.onBeforeCompile,color:material.color.getHex(),count:owned.size};let failed=false;
   const valid=await map(()=>[240,40,50]);try{await applyInstalledSkin(mesh,{id:'corrupt-fixture',maps:{basecolor:valid,normal:new Uint8Array([1,2,3])}},palette,owned);}catch{failed=true;}
   const rollback=failed&&before.normal===material.normalMap&&before.bump===material.bumpMap&&before.hook===material.onBeforeCompile&&before.color===material.color.getHex()&&before.count===owned.size;
   const outcome={normalDifference:difference(plain,normalPixels),heightDifference:difference(plain,heightPixels),rollback,normalSpace:[...owned][0]?.colorSpace,bumpScale:material.bumpScale};
   owned.forEach(texture=>texture.dispose());mesh.geometry.dispose();material.dispose();target.dispose();renderer.dispose();return outcome;
  });
  assert(result.normalDifference>.01,`normal relief must change actual pixels: ${JSON.stringify(result)}`);
  assert(result.heightDifference>.000001,`height relief must change actual pixels: ${JSON.stringify(result)}`);
  assert.equal(result.normalSpace,'');assert.equal(result.bumpScale,.018);assert.equal(result.rollback,true,'a late corrupt map must not partially replace the existing material');assert.deepEqual(errors,[]);
 }finally{await browser?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});

test('a corrupt installed skin retains built-in meshes while other regions still receive their valid skin',async()=>{
 const helper=(await build({stdin:{contents:"export {assembleCreature} from './creature/source/creator/assemble.ts';export {fresh} from './creature/source/creator/design.ts';",resolveDir:process.cwd()},bundle:true,write:false,format:'esm',target:'es2022'})).outputFiles[0].text;
 const server=createServer(async(req,res)=>{if(req.url.startsWith('/creature/models/')){try{res.end(await readFile(resolve('dist/client','.'+req.url)));}catch{res.writeHead(404);res.end();}return;}res.setHeader('Content-Type',req.url==='/fixture.js'?'text/javascript':'text/html');res.end(req.url==='/fixture.js'?helper:'<!doctype html>');});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage();await page.goto('http://127.0.0.1:'+server.address().port);
  const result=await page.evaluate(async()=>{
   const {assembleCreature,fresh}=await import('/fixture.js'),canvas=document.createElement('canvas');canvas.width=canvas.height=4;canvas.getContext('2d').fillRect(0,0,4,4);const valid=new Uint8Array(await (await new Promise(resolve=>canvas.toBlob(resolve,'image/png'))).arrayBuffer());
   const design=fresh();design.materials={head:{textureId:'creature-good',colorId:'default-slate',sparkle:0,metallic:0},body:{textureId:'creature-bad',colorId:'default-slate',sparkle:0,metallic:0}};
   let assembly;try{assembly=await assembleCreature(design,'/creature/',async id=>({id,maps:id==='creature-good'?{basecolor:valid}:{basecolor:valid,normal:new Uint8Array([1,2,3])}}));}catch(error){return{failed:true,message:error.message};}
   const counts={head:0,body:0,bodySkinned:0,headSkinned:0};assembly.root.traverse(object=>{if(!object.isMesh)return;const region=object.userData.region;if(region!=='head'&&region!=='body')return;counts[region]++;if(object.material.userData.installedSkinId)counts[region+'Skinned']++;});const textures=assembly.skinTextures.size;assembly.skinTextures.forEach(texture=>texture.dispose());assembly.dispose();return{failed:false,...counts,textures};
  });
  assert.equal(result.failed,false,`optional skin decode must not abort the coach: ${JSON.stringify(result)}`);assert(result.head>0&&result.body>0);assert(result.headSkinned>0,'a bad body skin must not discard the valid head skin');assert.equal(result.bodySkinned,0,'all meshes in the corrupt region must retain built-in materials');assert(result.textures>0,'valid region textures remain owned');
 }finally{await browser?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});

test('assembly cache shares successful decodes while isolating bytes, color spaces, and decode failures',async()=>{
 const helper=(await build({stdin:{contents:"export {applyInstalledSkin} from './creature/source/creator/skin-materials.ts';export * as THREE from 'three';",resolveDir:process.cwd()},bundle:true,write:false,format:'esm',target:'es2022'})).outputFiles[0].text;
 const server=createServer((req,res)=>{res.setHeader('Content-Type',req.url==='/fixture.js'?'text/javascript':'text/html');res.end(req.url==='/fixture.js'?helper:'<!doctype html>');});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage();await page.goto('http://127.0.0.1:'+server.address().port);
  const result=await page.evaluate(async()=>{
   const {THREE:T,applyInstalledSkin}=await import('/fixture.js'),canvas=document.createElement('canvas');canvas.width=canvas.height=4;canvas.getContext('2d').fillRect(0,0,4,4);
   const bytes=new Uint8Array(await (await new Promise(resolve=>canvas.toBlob(resolve,'image/png'))).arrayBuffer()),cache=new Map(),owned=new Set(),meshes=[];
   const mesh=()=>{const result=new T.Mesh(new T.BoxGeometry(),new T.MeshPhysicalMaterial());meshes.push(result);return result;},palette={primary:'#fff',secondary:'#fff',accent:'#fff'},a=mesh(),b=mesh();
   const create=URL.createObjectURL,originalLoad=T.TextureLoader.prototype.load;let decodes=0;URL.createObjectURL=function(blob){decodes++;return create.call(this,blob);};
   T.TextureLoader.prototype.load=function(url,onLoad,onProgress,onError){fetch(url).then(response=>response.blob()).then(blob=>setTimeout(()=>originalLoad.call(this,url,onLoad,onProgress,onError),blob.size>3?120:0));return new T.Texture();};
   try{
    await Promise.all([a,b].map(object=>applyInstalledSkin(object,{id:'shared',maps:{normal:bytes}},palette,owned,cache)));
    const shared=a.material.normalMap,sharedDecodes=decodes,sharedCount=owned.size,sameTexture=shared===b.material.normalMap;
    const separate=mesh();await applyInstalledSkin(separate,{id:'separate',maps:{normal:bytes.slice()}},palette,owned,cache);const distinctBytes=separate.material.normalMap!==shared;
    const colored=mesh();await applyInstalledSkin(colored,{id:'srgb',maps:{basecolor:bytes}},palette,owned,cache);const shader={uniforms:{},vertexShader:'#include <common>\n#include <uv_vertex>',fragmentShader:'#include <common>\n#include <color_fragment>'};colored.material.onBeforeCompile(shader,{});const srgb=shader.uniforms.myr5SkinBasecolor.value;
    let disposed=0;shared.addEventListener('dispose',()=>disposed++);const bad=new Uint8Array([1,2,3]),failed=mesh(),before=owned.size,start=decodes;let failures=0;
    for(let attempt=0;attempt<2;attempt++)try{await applyInstalledSkin(failed,{id:'broken',maps:{height:bytes,roughness:bad}},palette,owned,cache);}catch{failures++;}
    const legacy=mesh(),legacyBefore=owned.size;let legacyFailed=false;try{await applyInstalledSkin(legacy,{id:'legacy-broken',maps:{height:bytes,roughness:bad}},palette,owned);}catch{legacyFailed=true;}const legacyRollback=legacyFailed&&owned.size===legacyBefore;
    return{sharedDecodes,sharedCount,sameTexture,distinctBytes,distinctSpaces:srgb!==shared&&srgb.colorSpace==='srgb'&&shared.colorSpace==='',failures,decodeDelta:decodes-start,retried:decodes-start>=2,disposed,ownedUnchanged:before===owned.size,failedMaterialUnchanged:failed.material.bumpMap===null&&failed.material.roughnessMap===null,legacyRollback};
   }finally{URL.createObjectURL=create;T.TextureLoader.prototype.load=originalLoad;owned.forEach(texture=>texture.dispose());meshes.forEach(object=>{object.geometry.dispose();object.material.dispose();});}
  });
  assert.equal(result.sharedDecodes,1,'concurrent meshes must share the same decode');assert.equal(result.sharedCount,1);assert.equal(result.sameTexture,true);assert.equal(result.distinctBytes,true);assert.equal(result.distinctSpaces,true,'linear maps must not reuse an sRGB texture');assert.equal(result.failures,2);assert.equal(result.retried,true,'a rejected decode must not poison future retries');assert.equal(result.disposed,0,'failure must not dispose a successful borrowed texture');assert.equal(result.ownedUnchanged,true);assert.equal(result.failedMaterialUnchanged,true);assert.equal(result.legacyRollback,true,'uncached cleanup must wait for slower successful maps before disposing them');
 }finally{await browser?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});

test('an unexpected map application failure rolls back only its staged region',async()=>{
 const helper=(await build({stdin:{contents:"export {assembleCreature} from './creature/source/creator/assemble.ts';export {fresh} from './creature/source/creator/design.ts';",resolveDir:process.cwd()},bundle:true,write:false,format:'esm',target:'es2022'})).outputFiles[0].text;
 const server=createServer(async(req,res)=>{if(req.url.startsWith('/creature/models/')){try{res.end(await readFile(resolve('dist/client','.'+req.url)));}catch{res.writeHead(404);res.end();}return;}res.setHeader('Content-Type',req.url==='/fixture.js'?'text/javascript':'text/html');res.end(req.url==='/fixture.js'?helper:'<!doctype html>');});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage();await page.goto('http://127.0.0.1:'+server.address().port);const result=await page.evaluate(async()=>{
  const {assembleCreature,fresh}=await import('/fixture.js'),canvas=document.createElement('canvas');canvas.width=canvas.height=4;canvas.getContext('2d').fillRect(0,0,4,4);const bytes=new Uint8Array(await (await new Promise(resolve=>canvas.toBlob(resolve,'image/png'))).arrayBuffer()),baselineDesign=fresh(),design=fresh();baselineDesign.materials={head:{textureId:'flat',colorId:'default-slate',sparkle:0,metallic:0}};design.materials={head:{textureId:'creature-head',colorId:'default-slate',sparkle:0,metallic:0}};
  const baseline=await assembleCreature(baselineDesign,'/creature/'),baselineMaterials=[];baseline.root.traverse(object=>{if(object.isMesh&&object.userData.region==='head')baselineMaterials.push(...(Array.isArray(object.material)?object.material:[object.material]));});const cloneOwners=new Set();for(const material of baselineMaterials){for(let proto=Object.getPrototypeOf(material);proto;proto=Object.getPrototypeOf(proto))if(Object.hasOwn(proto,'clone')){cloneOwners.add(proto);break;}}const clonePatches=[...cloneOwners].map(proto=>({proto,original:proto.clone})),sourceStates=new Map();baseline.dispose();
  let injected=false,normalWrites=0;for(const {proto,original}of clonePatches)proto.clone=function(){const clone=original.call(this);if(this.userData?.materialStyle){sourceStates.set(this,{normalMap:this.normalMap,onBeforeCompile:this.onBeforeCompile});let value=clone.normalMap;Object.defineProperty(clone,'normalMap',{configurable:true,get(){return value;},set(next){if(next?.isTexture&&++normalWrites===2){injected=true;throw Error('injected late second staged material');}value=next;}});}return clone;};let assembly,error;try{assembly=await assembleCreature(design,'/creature/',async id=>({id,maps:{basecolor:bytes,normal:bytes}}));}catch(caught){error=caught;}finally{for(const {proto,original}of clonePatches)proto.clone=original;}if(error)return{threw:true,message:error.message};
  const materials=[];assembly.root.traverse(object=>{if(object.isMesh&&object.userData.region==='head')materials.push(...(Array.isArray(object.material)?object.material:[object.material]));});const restored=materials.length>1&&materials.every(material=>{const saved=sourceStates.get(material);return !!saved&&material.normalMap===saved.normalMap&&material.onBeforeCompile===saved.onBeforeCompile&&!material.userData.installedSkinId;});const textures=assembly.skinTextures.size;assembly.skinTextures.forEach(texture=>texture.dispose());assembly.dispose();return{threw:false,head:materials.length,restored,textures,normalWrites,injected,sourceRefs:materials.filter(material=>sourceStates.has(material)).length};
 });assert.equal(result.threw,false,`optional application failure must not abort assembly: ${JSON.stringify(result)}`);assert(result.head>1,`fixture needs multiple meshes so a partial first apply precedes rollback: ${JSON.stringify(result)}`);assert.equal(result.injected,true,`failure injection must interrupt a later material after the first material applies: ${JSON.stringify(result)}`);assert(result.normalWrites>=2);assert.equal(result.restored,true,`rollback must restore the exact original source material references, hooks, and normal maps: ${JSON.stringify(result)}`);assert(result.sourceRefs===result.head,`every final material must match an object captured before staging: ${JSON.stringify(result)}`);assert(result.textures>0,'successfully preflighted textures remain assembly-owned');
 }finally{await browser?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});
