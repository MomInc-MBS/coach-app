import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {build} from 'esbuild';
import {chromium} from 'playwright';

const root=resolve('dist/client'),outDir=resolve('.frames/alternate-coach-relief-375');
const bundle=(await build({entryPoints:['tests/alternate-coach-relief-fixture.ts'],bundle:true,format:'esm',platform:'browser',target:'es2022',write:false})).outputFiles[0].text;
const types={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.json':'application/json','.glb':'model/gltf-binary','.bin':'application/octet-stream'};
async function withPage(run){
 const server=createServer(async(req,res)=>{
  const path=new URL(req.url,'http://local').pathname;
  if(req.method==='POST'&&path.startsWith('/capture/')){const id=decodeURIComponent(path.slice('/capture/'.length));if(!/^[a-z0-9_-]+$/.test(id)){res.writeHead(400);res.end();return;}const chunks=[];for await(const part of req)chunks.push(part);await (await import('node:fs/promises')).writeFile(resolve(outDir,id+'.png'),Buffer.concat(chunks));res.writeHead(204);res.end();return;}
  if(path==='/__test__'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"><style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#211d27}canvas{display:block;width:100vw;height:100dvh}</style>');return;}
  if(path==='/test-fixture.mjs'){res.setHeader('Content-Type','text/javascript');res.end(bundle);return;}
  try{const file=resolve(root,'.'+path);if(!file.startsWith(root+sep))throw Error();res.setHeader('Content-Type',types[extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404);res.end();}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-gl=angle','--use-angle=swiftshader']});await run(browser,'http://127.0.0.1:'+server.address().port+'/__test__');}
 finally{await browser?.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
}

const closeupsOnly=process.env.ALTERNATE_RELIEF_CLOSEUPS==='1';
test('every picker coach renders relief at phone size; Boxy, Crescent and MYR5 Bamboo/Terry before-after captures use identical lighting',{timeout:600000},async()=>withPage(async(browser,url)=>{
 await mkdir(outDir,{recursive:true});const page=await browser.newPage({viewport:{width:375,height:812},deviceScaleFactor:1});await page.goto(url);
 const report=await page.evaluate(async(closeupsOnly)=>{
  const {THREE:T,assembleCreature,fresh,PICKER_BODIES,resolveRegionMaterial,sculptMaterial,createCoachReliefBudget,GLTFLoader,MeshoptDecoder}=await import('/test-fixture.mjs');
  const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true,powerPreference:'low-power'});renderer.setPixelRatio(1);renderer.setSize(375,812,false);renderer.outputColorSpace=T.SRGBColorSpace;renderer.setClearColor('#211d27',1);document.body.append(renderer.domElement);
  const scene=new T.Scene();scene.background=new T.Color('#211d27');scene.add(new T.HemisphereLight(0xf5f1ff,0x30242a,2.15));const key=new T.DirectionalLight(0xffffff,3.1);key.position.set(-3,5,5);scene.add(key);const fill=new T.DirectionalLight(0xb8d5ff,1.1);fill.position.set(4,1,2);scene.add(fill);
  const camera=new T.PerspectiveCamera(34,375/812,.1,100),fitCamera=object=>{object.updateWorldMatrix(true,true);const box=new T.Box3().setFromObject(object),size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3()),distance=Math.max(size.y*.52/Math.tan(T.MathUtils.degToRad(17)),size.x*.54/(Math.tan(T.MathUtils.degToRad(17)*(375/812))),size.z)+.65;camera.position.set(center.x,center.y,center.z+distance);camera.lookAt(center);camera.updateProjectionMatrix();},draw=()=>{renderer.render(scene,camera);const gl=renderer.getContext();gl.finish();const error=gl.getError();if(error!==gl.NO_ERROR)throw Error('WebGL error '+error);const pixels=new Uint8Array(375*812*4);gl.readPixels(0,0,375,812,gl.RGBA,gl.UNSIGNED_BYTE,pixels);let foreground=0;for(let i=0;i<pixels.length;i+=4)if(Math.abs(pixels[i]-33)+Math.abs(pixels[i+1]-29)+Math.abs(pixels[i+2]-39)>28)foreground++;return foreground;};
  const capture=async(id)=>{const blob=await new Promise(resolve=>renderer.domElement.toBlob(resolve,'image/png'));const res=await fetch('/capture/'+id,{method:'POST',body:blob});if(!res.ok)throw Error('Could not write '+id);};
  const picked=PICKER_BODIES,summary=[];
  if(!closeupsOnly)for(let i=0;i<picked.length;i++){
   const choice=picked[i],textureId=i%2?'cardio-terry-cloth':'martial-arts-bamboo',d=fresh();d.body=choice.id;d.headFrom=choice.id;d.armsFrom=choice.id;d.feetFrom=choice.id;
   for(const region of ['head','collar','body','arms','feet'])d.materials??={};
   for(const region of ['head','collar','body','arms','feet'])d.materials[region]={textureId,colorId:'default-slate',sparkle:0,metallic:0};
   const started=performance.now(),assembly=await assembleCreature(d,'/creature/',undefined,true),assemblyMs=performance.now()-started;scene.add(assembly.root);fitCamera(assembly.root);const foreground=draw();await capture('picker-'+String(i+1).padStart(2,'0')+'-'+choice.id.replaceAll('/','-'));
   let added=0,refinedMeshes=0,finalTriangles=0,finalVertices=0,maxMeshAdded=0;assembly.root.traverse(o=>{if(o.isMesh&&o.geometry?.userData?.coachRelief){const s=o.geometry.userData.coachRelief;added+=s.addedTriangles;maxMeshAdded=Math.max(maxMeshAdded,s.addedTriangles);refinedMeshes++;finalTriangles+=o.geometry.index?.count/3||0;finalVertices+=o.geometry.attributes.position.count;}});
   summary.push({id:choice.id,label:choice.label,textureId,assemblyMs,foreground,added,refinedMeshes,finalTriangles,finalVertices,maxMeshAdded});scene.remove(assembly.root);assembly.dispose();
  }

  // Direct source-mesh A/B captures use the deployed legacy single-pass algorithm as the
  // baseline and bounded authored-UV refinement as the treatment, with fixed phone framing.
  const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder),pairs=[
   {id:'myr5',slug:'myr5'},
   {id:'roster/09-monolith-tanka--boxy_humanoid_3d_model',slug:'boxy'},
   {id:'roster/09-monolith-tanka--white_horned_robot_3d_model',slug:'crescent'},
   {id:'roster/23-blob-texture-bodies--patchwork_plush_figure_3d_model',slug:'patchwork',only:'body',onlyFamily:51},
  ],pairResults=[];
  for(const model of pairs)for(const partName of model.only?[model.only]:['head','body'])for(const family of model.onlyFamily?[model.onlyFamily]:[48,51]){
   const textureId=family===48?'martial-arts-bamboo':'cardio-terry-cloth',colorId=model.slug==='patchwork'?'default-slate':'default-moss',style=resolveRegionMaterial(0,{textureId,colorId,sparkle:0,metallic:0},true),gltf=await loader.parseAsync(await (await fetch('/creature/models/'+model.id+'.glb')).arrayBuffer(),'/creature/models/'),root=gltf.scene;
   const sourcePart=root.getObjectByName(partName);if(!sourcePart)throw Error('Missing '+partName+' surface node in '+model.id);const originalVertices=(()=>{let count=0;sourcePart.traverse(o=>{if(o.isMesh)count+=o.geometry.attributes.position.count;});return count;})();
   const fitted=root.clone(true),fitPart=fitted.getObjectByName(partName);scene.add(fitted);fitCamera(fitPart);scene.remove(fitted);fitted.traverse(o=>{if(o.isMesh){if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material.dispose();}});
   const renderPass=async(label,relief)=>{const clone=root.clone(true),clonedPart=clone.getObjectByName(partName),targets=[];clonedPart.traverse(o=>{if(o.isMesh&&!Array.isArray(o.material))targets.push(o);});const budget=createCoachReliefBudget();for(const mesh of targets){mesh.geometry=mesh.geometry.clone();mesh.material=mesh.material.clone();sculptMaterial(mesh,style,1,1,relief?budget:undefined);}scene.add(clone);const foreground=draw(),pixels=new Uint8Array(375*812*4);renderer.getContext().readPixels(0,0,375,812,renderer.getContext().RGBA,renderer.getContext().UNSIGNED_BYTE,pixels);await capture('compare-'+model.slug+'-'+partName+'-'+family+'-'+label);let added=0,vertices=0;for(const mesh of targets){const stats=mesh.geometry.userData.coachRelief;if(stats){added+=stats.addedTriangles;vertices+=mesh.geometry.attributes.position.count;}}scene.remove(clone);clone.traverse(o=>{if(o.isMesh){o.geometry.dispose();if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material.dispose();}});return{added,vertices,meshes:targets.length,pixelHash:Array.from(pixels).reduce((h,v)=>Math.imul(h^v,16777619),2166136261)>>>0,foreground,originalVertices};};
   const before=await renderPass('before',false),after=await renderPass('after',model.slug!=='myr5');if(model.slug==='myr5'){if(after.added!==0||before.pixelHash!==after.pixelHash)throw Error('MYR5 output changed between identical original-path renders');}else if(after.added<=0)throw Error('No refined '+partName+' triangles for '+model.slug+' family '+family);pairResults.push({model:model.slug,part:partName,family,textureId,before,after});root.traverse(o=>{if(o.isMesh){o.geometry.dispose();if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material.dispose();}});
  }
  renderer.dispose();return{pickerCount:closeupsOnly?0:picked.length,picker:summary,pairs:pairResults,canvas:[375,812]};
 },closeupsOnly);
 console.log('ALTERNATE_COACH_RELIEF_REPORT '+JSON.stringify(report));assert.deepEqual(report.canvas,[375,812]);if(!closeupsOnly)assert.ok(report.pickerCount>=50,`all picker coach entries rendered (${report.pickerCount})`);
 for(const coach of report.picker){assert.ok(coach.assemblyMs<15000,`${coach.id} assembles within 15s (${coach.assemblyMs.toFixed(0)}ms)`);assert.ok(coach.foreground>600,`${coach.id} produces visible phone pixels (${coach.foreground})`);if(coach.id==='myr5')assert.equal(coach.added,0,'Original MYR5 keeps its original tessellation');else if(coach.id.includes('monolith-tanka'))assert.ok(coach.added>0,`${coach.id} receives actual alternate-coach relief`);assert.ok(coach.maxMeshAdded<=64000,`${coach.id} respects the per-mesh triangle cap`);assert.ok(coach.added<=240000,`${coach.id} respects the per-coach triangle cap`);if(coach.id!=='myr5'&&coach.refinedMeshes>0)assert.ok(coach.finalVertices>0);}
 assert.equal(report.pairs.length,closeupsOnly?13:13);for(const pair of report.pairs){assert.equal(pair.before.added,0);assert.ok(pair.before.foreground>500,`${pair.model} ${pair.part} produces real subject pixels`);if(pair.model==='myr5'){assert.equal(pair.after.added,0);assert.equal(pair.before.pixelHash,pair.after.pixelHash,'MYR5 baseline image remains pixel-identical');}else assert.ok(pair.after.added>0,`${pair.model} ${pair.part} family${pair.family} refines actual source mesh`);}
 const files=await (await import('node:fs/promises')).readdir(outDir);if(!closeupsOnly)assert.equal(files.filter(name=>name.startsWith('picker-')&&name.endsWith('.png')).length,report.pickerCount,'one assembled phone capture for each picker body');assert.ok(files.filter(name=>name.startsWith('compare-')&&name.endsWith('.png')).length>=26,'head/body before/after Bamboo and Terry captures for MYR5, Boxy, Crescent and Patchwork');
 await writeFile(resolve(outDir,closeupsOnly?'closeups-report.json':'roster-report.json'),JSON.stringify(report,null,2));
 await page.close();
}));
