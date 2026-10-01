import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {chromium} from 'playwright';

const MIME={'.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.glb':'model/gltf-binary'};
let server,browser,url;
test.before(async()=>{
 const root=resolve('.');server=createServer(async(req,res)=>{
  const path=new URL(req.url,'http://local').pathname;
  if(path==='/'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><style>body{margin:0}</style><script type="importmap">{"imports":{"three":"/vendor/three/three.module.js","three/addons/loaders/GLTFLoader.js":"/vendor/three/GLTFLoader.js","three/addons/libs/meshopt_decoder.module.js":"/vendor/three/meshopt_decoder.module.js"}}</script>');return;}
  try{const file=resolve(root,'.'+path);if(!file.startsWith(root+sep))throw Error();res.setHeader('Content-Type',MIME[extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404);res.end();}
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));url='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-gl=angle','--use-angle=swiftshader']});
});
test.after(async()=>{await browser?.close();await new Promise(r=>server.close(r));});

for(const flat of [false,true])test(`Grass ${flat?'2D drawn':'3D GLB'} flowers use persisted and live selected colors without changing their centers or foliage`,{timeout:90000},async()=>{
 const context=await browser.newContext({viewport:{width:800,height:800},reducedMotion:'reduce'}),page=await context.newPage();
 try{
  if(flat)await page.route('**/pod/worlds/boards/grass.glb',route=>route.abort());
  await page.goto(url);await page.evaluate(async()=>{
   localStorage.setItem('myr5.grimoireColor.grass','#00ffff');
   const T=await import('/vendor/three/three.module.js');window.__flowers=[];window.__lawns=[];
   const addObject=T.Object3D.prototype.add;T.Object3D.prototype.add=function(...objects){for(const object of objects)if(object.isInstancedMesh&&!window.__lawns.includes(object))window.__lawns.push(object);return addObject.apply(this,objects);};
   const add=T.Scene.prototype.add;T.Scene.prototype.add=function(...objects){for(const object of objects){let flower=false;object.traverse?.(node=>{if(node.isMesh&&node.material?.name==='colorRed')flower=true;if(node.isInstancedMesh)window.__lawns.push(node);});if(flower&&!window.__flowers.includes(object))window.__flowers.push(object);}return add.apply(this,objects);};
   const {grass}=await import('/modules/portal/portal-board-grass.mjs'),original=grass.trace2d;grass.trace2d=Object.assign(()=>{const effect=original(),init=effect.init;effect.init=function(args){window.__flowerPaint=args.paint.canvas;return init.call(this,args);};return effect;},original);
   window.__grass=grass;const {openQuiltPortal}=await import('/modules/portal/portal-entry.mjs');window.portal=await openQuiltPortal();await portal.board('grass');portal.show();
  });
  assert.equal(await page.locator('#portalHome').getAttribute('data-art'),flat?'flat':'3d');
  const plant=()=>page.evaluate(()=>{const board=portal.current(),r=board.faceRect();board.press(41,r.left+r.width*.5,r.top+r.height*.5);board.release(41);board.resume();});
  const pick=color=>page.evaluate(color=>{const input=document.querySelector('[data-board-tint]');input.value=color;input.dispatchEvent(new Event('input',{bubbles:true}));portal.current().resume();},color);
  const flush=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>{portal.current().pause();resolve();})));
  const sample=()=>page.evaluate(()=>{
   const flowers=window.__flowers.filter(o=>o.parent).map(o=>{const materials=[];o.traverse(n=>{if(n.isMesh)materials.push({name:n.material.name,color:n.material.color.getHexString()});});return materials;});
   const canvas=window.__flowerPaint,pixels={cyan:0,magenta:0,yellow:0};if(canvas){const d=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;for(let i=0;i<d.length;i+=4){if(d[i+3]<200)continue;if(d[i]<15&&d[i+1]>240&&d[i+2]>240)pixels.cyan++;if(d[i]>240&&d[i+1]<15&&d[i+2]>240)pixels.magenta++;if(Math.abs(d[i]-255)<10&&Math.abs(d[i+1]-210)<10&&Math.abs(d[i+2]-58)<10)pixels.yellow++;}}
   const boardCanvas=portal.current().canvas,board2d=boardCanvas.getContext('2d'),poster=board2d?[[.15,.25],[.8,.25],[.8,.8]].map(([u,v])=>Array.from(board2d.getImageData(Math.floor(boardCanvas.width*u),Math.floor(boardCanvas.height*v),1,1).data)):null;
   return {flowers,pixels,poster,lawn:window.__lawns.map(o=>Array.from(o.instanceColor?.array||o.geometry.attributes.color?.array||[]).slice(0,100))};
  });
  await plant();await flush();const initial=await sample();
  if(flat){assert.ok(initial.pixels.cyan>20,'persisted cyan reaches actual canvas petals');assert.ok(initial.pixels.yellow>0,'flower centers stay yellow');}
  else{assert.ok(initial.flowers.length>=3);assert.ok(initial.lawn.some(values=>values.length>0),'capture actual instanced lawn colors');assert.ok(initial.flowers.every(ms=>ms.some(m=>m.name==='colorRed'&&m.color==='00ffff')),'persisted cyan reaches every GLB petal');}
  await pick('#ff00ff');await flush();const changed=await sample();
  assert.equal(await page.evaluate(()=>localStorage.getItem('myr5.grimoireColor.grass')),'#ff00ff','picker stores the selected Grass color');
  if(flat){assert.equal(changed.pixels.cyan,0,'existing cyan petals repaint');assert.ok(changed.pixels.magenta>20);assert.ok(changed.pixels.yellow>0);assert.deepEqual(changed.poster,initial.poster,'green poster pixels outside flowers are not recolored');}
  else{assert.ok(changed.flowers.every(ms=>ms.filter(m=>m.name==='colorRed').every(m=>m.color==='ff00ff')),'existing GLB petals repaint');assert.deepEqual(changed.flowers.map(ms=>ms.filter(m=>m.name!=='colorRed')),initial.flowers.map(ms=>ms.filter(m=>m.name!=='colorRed')),'stems and flower centers retain their material colors');assert.deepEqual(changed.lawn,initial.lawn,'lawn vertex colors are untouched');}
  await plant();await flush();const fresh=await sample();
  if(flat){assert.equal(fresh.pixels.cyan,0);assert.ok(fresh.pixels.magenta>20&&fresh.pixels.yellow>0);}
  else{assert.ok(fresh.flowers.length>changed.flowers.length);assert.ok(fresh.flowers.every(ms=>ms.filter(m=>m.name==='colorRed').every(m=>m.color==='ff00ff')),'new GLB flowers follow the current selection');}
  if(!flat){const allocated=await page.evaluate(()=>{const count=window.__flowers.length;window.__grass.step(.016,performance.now()+8000);return count;});await pick('#00ffff');await plant();assert.equal(await page.evaluate(()=>window.__flowers.length),allocated,'expired GLB flowers reuse the existing pool');const pooled=await sample();assert.ok(pooled.flowers.every(ms=>ms.some(m=>m.name==='colorRed'&&m.color==='00ffff')),'pooled flowers adopt the latest selected color');await pick('#ff00ff');}
  await page.evaluate(()=>portal.board('grass'));await plant();await flush();const restored=await sample();
  if(flat)assert.ok(restored.pixels.magenta>20,'recreated 2D board restores persisted color');else assert.ok(restored.flowers.every(ms=>ms.filter(m=>m.name==='colorRed').every(m=>m.color==='ff00ff')),'recreated 3D board restores persisted color');
 }finally{await context.close();}
});
