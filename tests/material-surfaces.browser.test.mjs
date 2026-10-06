import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {build} from 'esbuild';
import {chromium} from 'playwright';

const root=resolve('dist/client'),outDir=resolve('.frames/material-surfaces-375');
const bundle=(await build({entryPoints:['tests/material-surfaces-fixture.ts'],bundle:true,format:'esm',platform:'browser',target:'es2022',write:false})).outputFiles[0].text;
const TYPES={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.json':'application/json','.glb':'model/gltf-binary','.bin':'application/octet-stream'};
async function withPage(run){
 const server=createServer(async(req,res)=>{
  const path=new URL(req.url,'http://local').pathname;
  if(req.method==='POST'&&path.startsWith('/capture/')){const id=decodeURIComponent(path.slice('/capture/'.length));if(!/^[a-z0-9-]+$/.test(id)){res.writeHead(400);res.end();return;}const chunks=[];for await(const part of req)chunks.push(part);await (await import('node:fs/promises')).writeFile(resolve(outDir,id+'.png'),Buffer.concat(chunks));res.writeHead(204);res.end();return;}
  if(path==='/__test__'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"><style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#211d27}canvas{display:block;width:100vw;height:100dvh}</style><script type="importmap">{"imports":{"three":"/vendor/three/three.module.js"}}</script>');return;}
  if(path==='/test-fixture.mjs'){res.setHeader('Content-Type','text/javascript');res.end(bundle);return;}
  try{const file=resolve(root,'.'+path);if(!file.startsWith(root+sep))throw Error();res.setHeader('Content-Type',TYPES[extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404);res.end();}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-gl=angle','--use-angle=swiftshader']});await run(browser,'http://127.0.0.1:'+server.address().port+'/__test__');}
 finally{await browser?.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
}

test('all 48 selectable material choices render on the assembled 3D coach at phone size, with 24 distinct named reward surfaces',{timeout:300000},async()=>withPage(async(browser,url)=>{
 await mkdir(outDir,{recursive:true});const page=await browser.newPage({viewport:{width:375,height:812},deviceScaleFactor:1});await page.goto(url);
 const result=await page.evaluate(async()=>{
  const {THREE:T,assembleCreature,fresh,TEXTURES,isTextureUnlocked,resolveRegionMaterial,textureDefaultMetalness,MATERIAL_REVISION,sculptMaterial}=await import('/test-fixture.mjs');
  const recipe=fresh(),assembly=await assembleCreature(recipe,'/creature/',undefined,true),body=assembly.root.getObjectByName('body');
  if(!body)throw Error('Assembled coach has no body region');
  const meshes=[];body.traverse(o=>{if(o.isMesh&&!Array.isArray(o.material)&&o.geometry?.attributes?.position)meshes.push({mesh:o,geometry:o.geometry.clone(),material:o.material.clone()});});
  if(!meshes.length)throw Error('Assembled coach body has no renderable meshes');
  const scene=new T.Scene();scene.background=new T.Color('#211d27');scene.add(assembly.root,new T.HemisphereLight(0xf5f1ff,0x30242a,2.15));
  const key=new T.DirectionalLight(0xffffff,3.1);key.position.set(-3,5,5);scene.add(key);const fill=new T.DirectionalLight(0xb8d5ff,1.1);fill.position.set(4,1,2);scene.add(fill);
  const box=new T.Box3().setFromObject(assembly.root),size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3()),camera=new T.PerspectiveCamera(34,375/812,.1,100),distance=Math.max(size.y*.52/Math.tan(T.MathUtils.degToRad(17)),size.x*.54/(Math.tan(T.MathUtils.degToRad(17)*(375/812))),size.z)+.65;
  camera.position.set(center.x,center.y,center.z+distance);camera.lookAt(center);camera.updateProjectionMatrix();
  const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true,powerPreference:'low-power'});renderer.setPixelRatio(1);renderer.setSize(375,812,false);renderer.outputColorSpace=T.SRGBColorSpace;renderer.setClearColor('#211d27',1);document.body.append(renderer.domElement);
  const gl=renderer.getContext(),signatures=[],samples=[],names=[],browserTextures=TEXTURES;
  function bodyBox(){body.updateWorldMatrix(true,true);const b=new T.Box3().setFromObject(body),pts=[];for(const x of [b.min.x,b.max.x])for(const y of [b.min.y,b.max.y])for(const z of [b.min.z,b.max.z])pts.push(new T.Vector3(x,y,z).project(camera));const left=Math.max(0,Math.floor((Math.min(...pts.map(p=>(p.x+1)*.5))*375))),right=Math.min(375,Math.ceil((Math.max(...pts.map(p=>(p.x+1)*.5))*375))),top=Math.max(0,Math.floor((1-Math.max(...pts.map(p=>p.y)))*406)),bottom=Math.min(812,Math.ceil((1-Math.min(...pts.map(p=>p.y)))*406));return{left,right,top,bottom};}
  for(const texture of browserTextures){
   const metal=textureDefaultMetalness(texture.id)??0,style=resolveRegionMaterial(0,{textureId:texture.id,colorId:'default-slate',sparkle:0,metallic:metal},true);
   if(style.id!==texture.familyId)throw Error(`${texture.displayName} preview resolved to ${style.id}, expected ${texture.familyId}`);
   for(const {mesh,geometry,material} of meshes){mesh.geometry.dispose();mesh.material.dispose();const temporary=geometry.clone();mesh.geometry=temporary;mesh.material=material.clone();sculptMaterial(mesh,style,1,recipe.detail);temporary.dispose();}
   renderer.render(scene,camera);gl.finish();const pixels=new Uint8Array(375*812*4);gl.readPixels(0,0,375,812,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
   const r=bodyBox();let sum=0,sum2=0,edge=0,n=0,visible=0,hash=2166136261,colors=new Set();
   for(let y=r.top;y<r.bottom;y+=2)for(let x=r.left;x<r.right;x+=2){const i=((811-y)*375+x)*4,red=pixels[i],green=pixels[i+1],blue=pixels[i+2],lum=.2126*red+.7152*green+.0722*blue;sum+=lum;sum2+=lum*lum;n++;if(Math.abs(red-33)+Math.abs(green-29)+Math.abs(blue-39)>28)visible++;colors.add(`${red>>3},${green>>3},${blue>>3}`);hash=Math.imul(hash^red,16777619);hash=Math.imul(hash^green,16777619);hash=Math.imul(hash^blue,16777619);if(x+2<r.right){const j=i+8;edge+=Math.abs(red-pixels[j]) + Math.abs(green-pixels[j+1]) + Math.abs(blue-pixels[j+2]);}}
   const variance=sum2/Math.max(1,n)-(sum/Math.max(1,n))**2,read={id:texture.id,name:texture.displayName,familyId:texture.familyId,unlocked:isTextureUnlocked(texture),metalness:style.metalness,map:meshes[0].mesh.material.map?.image?.width||0,bump:meshes[0].mesh.material.bumpScale,roughness:meshes[0].mesh.material.roughness,reliefName:meshes[0].mesh.material.name,roi:r,visible,variance,edge:edge/Math.max(1,n),colors:colors.size,signature:(hash>>>0).toString(16)};
   names.push(read.name);signatures.push(read.signature);samples.push(read);
   if(texture.familyId>=32&&texture.familyId<=55){const blob=await new Promise(resolve=>renderer.domElement.toBlob(resolve,'image/png'));const saved=await fetch('/capture/'+encodeURIComponent(texture.id),{method:'POST',body:blob});if(!saved.ok)throw Error('Could not save phone image for '+texture.displayName);}
  }
  const result={textures:names.length,names,samples,materialRevision:MATERIAL_REVISION,bodyMeshes:meshes.length,canvas:[renderer.domElement.width,renderer.domElement.height]};
  for(const {mesh,geometry,material} of meshes){mesh.geometry.dispose();mesh.material.dispose();geometry.dispose();material.dispose();}renderer.dispose();assembly.dispose();return result;
 });
 assert.equal(result.canvas[0],375);assert.equal(result.canvas[1],812);assert.equal(result.textures,48,'Clay, 22 available legacy families, 24 named rewards and the pixel finish were rendered');
 const profiles=result.samples.filter(s=>s.familyId>=32&&s.familyId<=55);assert.equal(profiles.length,24);
 for(const sample of profiles){assert.equal(sample.map,192,`${sample.name} uses its baked family map`);assert.ok(sample.bump>0,`${sample.name} has a bump map`);assert.ok(sample.visible>900,`${sample.name} appears on the real coach body at phone size (${sample.visible} foreground samples)`);assert.ok(sample.variance>80,`${sample.name} keeps visible light and dark detail (${sample.variance})`);assert.ok(sample.colors>24,`${sample.name} has phone-scale surface variation (${sample.colors} quantized colours)`);}
 const clay=result.samples.find(s=>s.id==='clay');assert.ok(clay,'Clay baseline rendered with the same camera, body and neutral triad');
 for(const id of ['chest-rubber-grip','glutes-sweatshirt-fleece','glutes-peach']){
  const sample=result.samples.find(s=>s.id===id);assert.ok(sample.edge>clay.edge*1.35+1.5,`${sample.name} has readable phone-scale surface edges beyond Clay under identical lighting (${sample.edge.toFixed(2)} vs Clay ${clay.edge.toFixed(2)})`);
 }
 assert.equal(new Set(profiles.map(s=>s.signature)).size,24,'all 24 patterns produce distinct actual model pixels with one neutral triad');
 assert.ok(result.samples.filter(s=>s.familyId<22).every(s=>s.map===192),'all 22 selectable historical procedural families still render through the same model path');
 assert.ok(result.samples.every(s=>s.roi.right>s.roi.left&&s.roi.bottom>s.roi.top), 'the assembled body remains visible across all material choices');
 assert.equal((await (await import('node:fs/promises')).readdir(outDir)).filter(name=>name.endsWith('.png')).length,24,'captures phone-sized 3D coach evidence for every reward surface');
 await page.close();
}));
