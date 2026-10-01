import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {build} from 'esbuild';
import {chromium} from 'playwright';

const root=resolve('dist/client');
const bundle=(await build({stdin:{loader:'ts',resolveDir:resolve('tests'),contents:`
 export * as THREE from 'three';
 export {assembleCreature} from '../creature/source/creator/assemble';
 export {fresh} from '../creature/source/creator/design';
 export {TEXTURES,isTextureUnlocked,resolveRegionMaterial,textureDefaultMetalness} from '../creature/source/creator/materials-registry';
 export {sculptMaterial} from '../creature/source/creator/material-language';
 export {createCoachReliefBudget} from '../creature/source/creator/material-refinement';
 `},bundle:true,format:'esm',platform:'browser',target:'es2022',write:false})).outputFiles[0].text;
const types={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.json':'application/json','.glb':'model/gltf-binary','.bin':'application/octet-stream'};

async function withPage(run){
 const server=createServer(async(req,res)=>{
  const path=new URL(req.url,'http://local').pathname;
  if(path==='/__test__'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"><style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#211d27}canvas{display:block;width:100vw;height:100dvh}</style>');return;}
  if(path==='/test-fixture.mjs'){res.setHeader('Content-Type','text/javascript');res.end(bundle);return;}
  try{const file=resolve(root,'.'+path);if(!file.startsWith(root+sep))throw Error();res.setHeader('Content-Type',types[extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404);res.end();}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-gl=angle','--use-angle=swiftshader']});const page=await browser.newPage({viewport:{width:375,height:812},deviceScaleFactor:1});const shaderConsole=[];page.on('console',message=>{if(message.type()==='error'&&/shader|webgl|program|compile/i.test(message.text()))shaderConsole.push(message.text());});await run(page,'http://127.0.0.1:'+server.address().port+'/__test__',shaderConsole);}
 finally{await browser?.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
}

test('all49 texture catalog renders on assembled Boxy and Crescent coaches within strict geometry caps',{timeout:600000},async()=>withPage(async(page,url,shaderConsole)=>{
 await page.goto(url);
 const reports=await page.evaluate(async()=>{
  const {THREE:T,assembleCreature,fresh,TEXTURES,isTextureUnlocked,resolveRegionMaterial,textureDefaultMetalness,sculptMaterial,createCoachReliefBudget}=await import('/test-fixture.mjs');
  const ids=['roster/09-monolith-tanka--boxy_humanoid_3d_model','roster/09-monolith-tanka--white_horned_robot_3d_model'];
  const types=TEXTURES,initialUnlocks=types.map(texture=>isTextureUnlocked(texture)),storageBefore=JSON.stringify(Object.keys(localStorage).sort().map(key=>[key,localStorage.getItem(key)]));
  const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true,powerPreference:'low-power'});renderer.setPixelRatio(1);renderer.setSize(375,812,false);renderer.outputColorSpace=T.SRGBColorSpace;renderer.setClearColor('#211d27',1);renderer.debug.checkShaderErrors=true;const shaderErrors=[];
  renderer.debug.onShaderError=(gl,program,vertex,fragment)=>shaderErrors.push({vertex:gl.getShaderInfoLog(vertex),fragment:gl.getShaderInfoLog(fragment)});document.body.append(renderer.domElement);
  const scene=new T.Scene();scene.background=new T.Color('#211d27');scene.add(new T.HemisphereLight(0xf5f1ff,0x30242a,2.15));const key=new T.DirectionalLight(0xffffff,3.1);key.position.set(-3,5,5);scene.add(key);const fill=new T.DirectionalLight(0xb8d5ff,1.1);fill.position.set(4,1,2);scene.add(fill);
  const camera=new T.PerspectiveCamera(34,375/812,.1,100);
  const fitCamera=object=>{object.updateWorldMatrix(true,true);const box=new T.Box3().setFromObject(object),size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3()),distance=Math.max(size.y*.52/Math.tan(T.MathUtils.degToRad(17)),size.x*.54/Math.tan(T.MathUtils.degToRad(17)*(375/812)),size.z)+.65;camera.position.set(center.x,center.y,center.z+distance);camera.lookAt(center);camera.updateProjectionMatrix();};
  const draw=()=>{renderer.render(scene,camera);const gl=renderer.getContext();gl.finish();const error=gl.getError();if(error!==gl.NO_ERROR)throw Error('WebGL error '+error);const pixels=new Uint8Array(375*812*4);gl.readPixels(0,0,375,812,gl.RGBA,gl.UNSIGNED_BYTE,pixels);let foreground=0,sum=0,sum2=0,colors=new Set(),hash=2166136261;for(let i=0;i<pixels.length;i+=4){const r=pixels[i],g=pixels[i+1],b=pixels[i+2],lum=.2126*r+.7152*g+.0722*b;if(Math.abs(r-33)+Math.abs(g-29)+Math.abs(b-39)>28)foreground++;sum+=lum;sum2+=lum*lum;colors.add(`${r>>3},${g>>3},${b>>3}`);hash=Math.imul(hash^r,16777619);hash=Math.imul(hash^g,16777619);hash=Math.imul(hash^b,16777619);}const n=pixels.length/4;return{foreground,variance:sum2/n-(sum/n)**2,colors:colors.size,signature:(hash>>>0).toString(16)};};
  const checkNormals=mesh=>{const normal=mesh.geometry.attributes.normal;if(!normal)return 0;let count=0;for(let i=0;i<normal.count;i++){const x=normal.getX(i),y=normal.getY(i),z=normal.getZ(i),length=Math.hypot(x,y,z);if(!Number.isFinite(x)||!Number.isFinite(y)||!Number.isFinite(z)||!Number.isFinite(length)||length<.5||length>1.5)throw Error(`${mesh.name||'mesh'} has a non-finite or non-unit normal at ${i}: ${x},${y},${z}`);count++;}return count;};
  const reports=[];
  for(const id of ids){
   const recipe=fresh();recipe.body=id;recipe.headFrom=id;recipe.armsFrom=id;recipe.feetFrom=id;
   // Keep assembly geometry unsculpted so each catalog pass starts from the same source buffers.
   const assembly=await assembleCreature(recipe,'/creature/',undefined,true);scene.add(assembly.root);fitCamera(assembly.root);
   const targets=[];for(const region of ['head','collar','body','arms','feet'])assembly.root.getObjectByName(region)?.traverse(mesh=>{if(mesh.isMesh&&!Array.isArray(mesh.material)&&mesh.geometry?.attributes?.position)targets.push(mesh);});
   if(!targets.length)throw Error(`No eligible alternate meshes assembled for ${id}`);
   const originals=targets.map(mesh=>({geometry:mesh.geometry.clone(),material:mesh.material.clone()}));
   const disposeCurrent=mesh=>{mesh.geometry.dispose();if(Array.isArray(mesh.material))mesh.material.forEach(material=>material.dispose());else mesh.material.dispose();};
   const restore=()=>targets.forEach((mesh,index)=>{disposeCurrent(mesh);mesh.geometry=originals[index].geometry.clone();mesh.material=originals[index].material.clone();mesh.userData.ownedGeometry=false;});
   const samples=[];let flatSignature=null;
   for(const texture of types){
    restore();const style=resolveRegionMaterial(0,{textureId:texture.id,colorId:'default-slate',sparkle:0,metallic:textureDefaultMetalness(texture.id)??0},true);
    if(style.id!==texture.familyId)throw Error(`${texture.displayName} resolved to family ${style.id}, expected ${texture.familyId}`);
    const budget=createCoachReliefBudget();for(const mesh of targets){const previousGeometry=mesh.geometry,previousMaterial=mesh.material;sculptMaterial(mesh,style,1,recipe.detail,budget);if(mesh.geometry!==previousGeometry)previousGeometry.dispose();if(mesh.material!==previousMaterial)previousMaterial.dispose();if(!checkNormals(mesh))throw Error(`${id} ${texture.displayName} has a mesh without normals`);}
    const added=[];let maxMeshAdded=0,maxMeshVertices=0,maxLevels=0;
    for(const mesh of targets){const stats=mesh.geometry.userData.coachRelief;if(!stats)continue;added.push(stats.addedTriangles);maxMeshAdded=Math.max(maxMeshAdded,stats.addedTriangles);maxMeshVertices=Math.max(maxMeshVertices,mesh.geometry.attributes.position.count);maxLevels=Math.max(maxLevels,stats.levels);}
    const rendered=draw();if(!flatSignature&&texture.id==='flat')flatSignature=rendered.signature;
    if(texture.familyId>=32&&rendered.signature===flatSignature)throw Error(`${id} ${texture.displayName} pixels match Flat`);
    samples.push({id:texture.id,name:texture.displayName,familyId:texture.familyId,unlocked:isTextureUnlocked(texture),added:budget.usedTriangles,remaining:budget.remainingTriangles,maxMeshAdded,maxMeshVertices,maxLevels,...rendered});
    if(budget.usedTriangles>240000||budget.remainingTriangles<0)throw Error(`${id} ${texture.displayName} exceeded the coach triangle cap (${budget.usedTriangles})`);
    for(const mesh of targets){const stats=mesh.geometry.userData.coachRelief;if(stats&&(stats.addedTriangles>64000||mesh.geometry.attributes.position.count>32000||stats.levels>5))throw Error(`${id} ${texture.displayName} exceeded a per-mesh cap: ${JSON.stringify(stats)}`);}
    if(added.reduce((sum,n)=>sum+n,0)!==budget.usedTriangles)throw Error(`${id} ${texture.displayName} budget disagrees with mesh accounting`);
   }
   const endUnlocks=types.map(texture=>isTextureUnlocked(texture)),storageAfter=JSON.stringify(Object.keys(localStorage).sort().map(key=>[key,localStorage.getItem(key)]));
   const result={id,meshes:targets.length,samples,initialUnlocks,endUnlocks,storageBefore,storageAfter,shaderErrors};reports.push(result);
   for(const original of originals){original.geometry.dispose();original.material.dispose();}scene.remove(assembly.root);assembly.dispose();
  }
  renderer.dispose();return{catalogCount:types.length,familyCount:new Set(types.map(texture=>texture.familyId)).size,reports,shaderErrors,canvas:[375,812]};
 });
 assert.deepEqual(reports.canvas,[375,812]);assert.equal(reports.catalogCount,49,'all catalog entries render');assert.equal(reports.familyCount,49,'all 49 entries represent distinct texture families');assert.equal(reports.reports.length,2);
 assert.deepEqual(reports.shaderErrors,[],'renderer reported no shader compile errors');assert.deepEqual(shaderConsole,[],'browser console reported no shader or WebGL errors');
 for(const coach of reports.reports){
  assert.ok(coach.meshes>0,`${coach.id} has assembled textured geometry`);assert.equal(coach.samples.length,49);
  assert.deepEqual(coach.endUnlocks,coach.initialUnlocks,`${coach.id} leaves unlock state unchanged`);assert.equal(coach.storageAfter,coach.storageBefore,`${coach.id} leaves local cache state untouched`);
  for(const sample of coach.samples){assert.ok(sample.foreground>600,`${coach.id} ${sample.name} produces actual phone pixels (${sample.foreground})`);assert.ok(Number.isFinite(sample.variance)&&sample.variance>20,`${coach.id} ${sample.name} has rendered tonal variation`);assert.ok(sample.colors>8,`${coach.id} ${sample.name} renders multiple colors`);assert.ok(sample.added<=240000&&sample.remaining>=0,`${coach.id} ${sample.name} meets the coach cap`);assert.ok(sample.maxMeshAdded<=64000&&sample.maxMeshVertices<=32000&&sample.maxLevels<=5,`${coach.id} ${sample.name} meets per-mesh caps`);}
  const rewards=coach.samples.filter(sample=>sample.familyId>=32);assert.equal(rewards.length,24);assert.equal(new Set(rewards.map(sample=>sample.signature)).size,24,`${coach.id} renders 24 distinct reward patterns`);
 }
}));
