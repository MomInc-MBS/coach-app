import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {build} from 'esbuild';
import {chromium} from 'playwright';

const fixture=`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;width:100%;height:100%;background:#100b1a}#view{width:375px;height:500px}</style><div id="view"></div><div id="coachMount"></div><script type="importmap">{"imports":{"three":"/vendor/three/three.module.js","three/addons/loaders/GLTFLoader.js":"/vendor/three/GLTFLoader.js"}}</script>`;

async function withPage(run){
 const root=resolve('.'),phone=(await build({stdin:{contents:"export * from './creature/source/phone.ts';export {fresh} from './creature/source/creator/design.ts';",resolveDir:process.cwd()},bundle:true,write:false,format:'esm',target:'es2022',plugins:[{name:'shared-vendored-three',setup(builder){builder.onResolve({filter:/^three$/},()=>({path:'three',external:true}));}}]})).outputFiles[0].text;
 const requests=[];
 const server=createServer(async(req,res)=>{
  const path=new URL(req.url,'http://local').pathname;requests.push(path);
  if(path==='/'||path==='/creature/index.html'){res.setHeader('Content-Type','text/html');res.end(fixture);return;}
  if(path==='/creature/assets/phone.js'){res.setHeader('Content-Type','text/javascript');res.end(phone);return;}
  if(path.startsWith('/api/')){res.writeHead(401,{'Content-Type':'application/json'});res.end('{}');return;}
  try{const file=resolve(root,'.'+path);if(!file.startsWith(root+sep))throw Error();res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css'})[extname(file)]||'application/octet-stream');res.end(await readFile(file));}
  catch{res.writeHead(404);res.end();}
 });
 await new Promise(done=>server.listen(0,'127.0.0.1',done));let browser;
 try{
  browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-gl=angle','--use-angle=swiftshader']});
  const page=await browser.newPage({viewport:{width:375,height:812},reducedMotion:'reduce'});
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await page.evaluate(async()=>{
   const T=await import('three');window.__spaces=[];
   const update=T.PerspectiveCamera.prototype.updateProjectionMatrix;
   T.PerspectiveCamera.prototype.updateProjectionMatrix=function(){if(this.far===400)window.__spaceCamera=this;return update.call(this);};
   const add=T.Object3D.prototype.add;
   T.Scene.prototype.add=function(...objects){
    const scene=this,space=objects.find(object=>object.name==='coach-preview-space');
    if(space&&!window.__spaces.some(item=>item.scene===scene)){
     const resources=new Set([scene.background]),counts=new Map();
     space.traverse(object=>{if(object.isMesh||object.isPoints)resources.add(object.geometry);for(const material of [].concat(object.material||[])){resources.add(material);for(const value of Object.values(material))if(value?.isTexture)resources.add(value);for(const uniform of Object.values(material.uniforms||{}))for(const value of [].concat(uniform.value))if(value?.isTexture)resources.add(value);}});
     for(const resource of resources){counts.set(resource,0);resource.addEventListener('dispose',()=>counts.set(resource,counts.get(resource)+1));}
     window.__spaces.push({scene,camera:window.__spaceCamera,space,counts});
    }
    return add.apply(this,objects);
   };
   const {openShipView}=await import('/modules/ships/ship-view.mjs');
   window.openOval=()=>openShipView({hash:'#select',entrance:'always',loadCoachViewer:async()=>{const {fresh}=await import('/creature/assets/phone.js');localStorage.setItem('myr5-recipe-v1',JSON.stringify(fresh()));}});
  });
  await run(page,requests);
 }finally{await browser?.close();server.closeAllConnections();await new Promise(done=>server.close(done));}
}

for(const motion of ['reduce','no-preference'])test(`oval uses supply-drop sky and ground with the real coach and hull (${motion})`,{timeout:120000},async()=>withPage(async(page,requests)=>{
 await page.emulateMedia({reducedMotion:motion});
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.evaluate(()=>openOval());
 try{await page.waitForFunction(()=>window.__spaces.length===1&&document.querySelector('.myr5-companion-card')?.dataset.ready==='true',null,{timeout:30000});}catch(error){throw Error(error.message+' '+JSON.stringify(await page.evaluate(()=>({spaces:window.__spaces.length,status:document.querySelector('.myr5-companion-status')?.textContent,card:document.querySelector('.myr5-companion-card')?.outerHTML,body:document.body.innerText})))+' '+JSON.stringify(errors));}
 if(motion==='no-preference')await page.waitForFunction(()=>document.querySelector('.ship-scene')?.dataset.phase==='ready');
 assert.equal(await page.evaluate(()=>location.hash),'#select');
 const state=await page.evaluate(()=>{
  const {scene,camera,space}=window.__spaces[0];
  return {ground:!!space.getObjectByName('supply-drop-ground'),sky:!!space.getObjectByName('supply-drop-sky'),fog:scene.fog?.far,cameraFar:camera.far,background:scene.background?.isTexture,coachStage:window.myr5Creature.stats().stage,pixelBg:document.querySelector('.ship-view-bg').style.backgroundImage,introPixelBg:document.querySelector('.ship-scene-background')?.style.backgroundImage||'',rendering:getComputedStyle(document.querySelector('.ship-view-bg')).imageRendering};
 });
 assert.deepEqual(state,{ground:true,sky:true,fog:95,cameraFar:400,background:true,coachStage:'overlay',pixelBg:'',introPixelBg:'',rendering:'auto'});
 assert.ok(requests.includes('/pod/worlds/starter/supportive.glb'));
 assert.ok(requests.includes('/creature/models/myr5.glb'));
 assert.ok(!requests.some(path=>path.startsWith('/pod/worlds/starter/')&&path.endsWith('.webp')));
 await mkdir('.frames',{recursive:true});await page.screenshot({path:resolve('.frames',`oval-space-${motion}.png`)});
 // The actual hull stays a raycast target over the full landscape.
 const hit=await page.evaluate(async()=>{
  const T=await import('three'),{scene,camera,space}=window.__spaces[0],ray=new T.Raycaster(),pointer=new T.Vector2();
  const meshes=[];scene.traverse(object=>{if(object.isMesh){let ancestor=object;while(ancestor&&ancestor!==space)ancestor=ancestor.parent;if(!ancestor)meshes.push(object);}});
  let best=null;for(let y=.9;y>-.6;y-=.035)for(let x=-.8;x<.8;x+=.035){pointer.set(x,y);ray.setFromCamera(pointer,camera);if(ray.intersectObjects(meshes,false).length){const score=x*x+(y-.5)*(y-.5);if(!best||score<best.score)best={x,y,score};}}
  if(!best)return null;const rect=document.querySelector('.ship-view-canvas,.ship-scene-canvas').getBoundingClientRect();return {x:rect.left+(best.x+1)*rect.width/2,y:rect.top+(1-best.y)*rect.height/2};
 });
 assert.ok(hit,'actual starter hull remains hittable');
 await page.locator('.ship-view-close').click();await page.waitForFunction(()=>!document.querySelector('.ship-view')?.open&&window.__spaces[0].space.parent===null&&location.hash!=='#select');
 const cleanup=await page.evaluate(()=>{const item=window.__spaces[0];return {detached:item.space.parent===null&&item.space.children.length===0,counts:[...item.counts.values()],coachReturned:!!document.querySelector('#coachMount .myr5-companion-card')};});
 assert.equal(cleanup.detached,true);assert.ok(cleanup.counts.length>10&&cleanup.counts.every(count=>count===1));assert.equal(cleanup.coachReturned,true);
 assert.deepEqual(errors,[]);
 await page.evaluate(()=>openOval());await page.waitForFunction(()=>window.__spaces.length===2);
 if(motion==='no-preference')await page.waitForFunction(()=>document.querySelector('.ship-scene')?.dataset.phase==='ready');
 // Same restored dimensions and reduced/idle pose keep the saved hull hit coordinate.
 await page.mouse.click(hit.x,hit.y);await page.waitForURL('**/creature/index.html');
 assert.equal(await page.evaluate(()=>sessionStorage.getItem('myr5-ship-gate')),'ship-admission-v2');
}));

test('oval portal peek uses the same supply-drop space and releases its resources',{timeout:30000},async()=>withPage(async(page,requests)=>{
 const result=await page.evaluate(async()=>{
  const {PEEK_SOURCES,peekRenderer}=await import('/modules/portal/portal-peek.mjs');
  const source=await PEEK_SOURCES.select();source.camera.aspect=375/812;source.camera.updateProjectionMatrix();source.update(performance.now());
  const renderer=peekRenderer();renderer.setSize(375,812);document.body.append(renderer.domElement);renderer.render(source.scene,source.camera);
  const item=window.__spaces[0],result={far:source.camera.far,ground:!!item.space.getObjectByName('supply-drop-ground'),sky:!!item.space.getObjectByName('supply-drop-sky')};
  source.dispose();return {...result,disposed:[...item.counts.values()],detached:item.space.parent===null};
 });
 assert.equal(result.far,400);assert.equal(result.ground,true);assert.equal(result.sky,true);assert.equal(result.detached,true);assert.ok(result.disposed.every(count=>count===1));
 assert.ok(!requests.some(path=>path.endsWith('.webp')));
}));
