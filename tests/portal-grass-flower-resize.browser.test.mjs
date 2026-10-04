import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {chromium} from 'playwright';

const TYPES={'.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.glb':'model/gltf-binary'};
async function withPortal(run){
 const root=resolve('dist/client'),source=resolve('.'),server=createServer(async(req,res)=>{
  const path=new URL(req.url,'http://local').pathname;
  if(path==='/__portal__'){
   res.setHeader('Content-Type','text/html');res.end('<!doctype html><style>body{margin:0}</style><script type="importmap">{"imports":{"three":"/vendor/three/three.module.js","three/addons/loaders/GLTFLoader.js":"/vendor/three/GLTFLoader.js","three/addons/libs/meshopt_decoder.module.js":"/vendor/three/meshopt_decoder.module.js"}}</script>');return;
  }
  try{const base=path.startsWith('/modules/portal/')?source:root,file=resolve(base,'.'+path);if(!file.startsWith(base+sep))throw Error();res.setHeader('Content-Type',TYPES[extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404);res.end();}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-gl=angle','--use-angle=swiftshader']});await run(browser,'http://127.0.0.1:'+server.address().port+'/__portal__');}
 finally{await browser?.close();await new Promise(r=>server.close(r));}
}

test('3D Grass flowers keep their face-relative position and size across rotation and reselect',{timeout:150000},async()=>withPortal(async(browser,url)=>{
 const context=await browser.newContext({viewport:{width:1024,height:768},hasTouch:true,reducedMotion:'reduce'}),page=await context.newPage();
 try{
  await page.goto(url);
  await page.evaluate(async()=>{
   const T=await import('/vendor/three/three.module.js');window.__three=T;window.__flowers=[];window.__captureGrass=false;
   const add=T.Scene.prototype.add;T.Scene.prototype.add=function(...items){for(const item of items){let petal=false;item.traverse?.(node=>{if(node.isMesh&&node.material?.name==='colorRed'){petal=true;node.material.userData.__portalPetal=true;}});if(petal&&!window.__flowers.includes(item))window.__flowers.push(item);}return add.apply(this,items);};
   const sceneBefore=T.Scene.prototype.onBeforeRender;T.Scene.prototype.onBeforeRender=function(renderer,scene,camera){window.__grassCamera=camera;return sceneBefore?.call(this,renderer,scene,camera);};
   for(const method of ['drawArrays','drawElements','drawArraysInstanced','drawElementsInstanced']){const original=WebGL2RenderingContext.prototype[method];if(!original)continue;WebGL2RenderingContext.prototype[method]=function(...args){const result=original.apply(this,args);if(window.__captureGrass&&this.canvas.closest('#portalBoardHost')&&!window.__captureQueued){window.__captureQueued=true;const gl=this,canvas=this.canvas;queueMicrotask(()=>{window.__captureQueued=false;if(!window.__captureGrass)return;const p=new Uint8Array(canvas.width*canvas.height*4);gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,p);let pink=0;for(let i=0;i<p.length;i+=4){const r=p[i],g=p[i+1],b=p[i+2],a=p[i+3];if(a>96&&r>95&&b>35&&r>g*1.24&&b>g*1.04)pink++;}window.__grassPixels={pink,error:gl.getError(),width:canvas.width,height:canvas.height};});}return result;};}
   const {openQuiltPortal}=await import('/modules/portal/portal-entry.mjs');window.portal=await openQuiltPortal();await portal.board('grass');portal.show();
  });
  await page.waitForFunction(()=>document.getElementById('portalHome')?.dataset.board==='grass'&&document.getElementById('portalHome')?.dataset.art==='3d',null,{timeout:60000});
  await page.waitForFunction(()=>document.querySelector('#portalBoardHost canvas.portal-board-canvas'),null,{timeout:15000});
  const input=await context.newCDPSession(page);
  async function draw(){
   const rect=await page.evaluate(()=>portal.current().faceRect());
   const points=Array.from({length:17},(_,i)=>({x:rect.left+rect.width*(.28+i*.026),y:rect.top+rect.height*(.48+Math.sin(i*.55)*.06)}));
   await page.evaluate(()=>{window.__forceFlowerColor=true;const original=Math.random;window.__savedRandom=original;Math.random=()=>.375;});
   await input.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...points[0],id:91}]});
   await page.evaluate(()=>{Math.random=window.__savedRandom;window.__forceFlowerColor=false;});
   for(const p of points.slice(1))await input.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...p,id:91}]});
   await input.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   await page.evaluate(()=>{window.__captureGrass=true;portal.current().resume();});
   await page.waitForFunction(()=>window.__grassPixels?.pink>0,null,{timeout:20000});
   return page.evaluate(()=>{
    window.__captureGrass=false;const T=window.__three,canvas=document.querySelector('#portalBoardHost canvas.portal-board-canvas'),rect=portal.current().faceRect(),camera=window.__grassCamera;
    const flowers=window.__flowers.filter(o=>o.parent&&o.visible).map(o=>{const w=o.getWorldPosition(new T.Vector3()).project(camera),x=canvas.getBoundingClientRect().left+(w.x+1)*.5*canvas.clientWidth,y=canvas.getBoundingClientRect().top+(1-w.y)*.5*canvas.clientHeight;let color; o.traverse(n=>{if(color===undefined&&n.isMesh&&n.material?.userData.__portalPetal)color=n.material.color.getHex();});return{u:(x-rect.left)/rect.width,v:(y-rect.top)/rect.height,size:o.scale.x/rect.width,id:window.__flowers.indexOf(o),color};});
    return{flowers,pixels:window.__grassPixels,rect:{width:rect.width,height:rect.height}};
   });
  }
  const landscape=await draw();
  assert.ok(landscape.flowers.length>=3,'touch painting adds live 3D flower groups');
  assert.ok(landscape.flowers.some(f=>f.color!==undefined),'the captured groups contain the flower petal material');
  assert.ok(landscape.flowers.some(({color})=>color!==undefined&&((color>>16)&255)>((color>>8)&255)*1.2&&(color&255)>((color>>8)&255)*1.02),'the selected pink petal material reaches the live flowers');
  assert.ok(landscape.pixels.pink>0&&landscape.pixels.error===0,'the actual WebGL frame includes pink flower pixels without errors: '+JSON.stringify(landscape.pixels));
  const identity=landscape.flowers.map(f=>f.id),before=landscape.flowers.map(f=>({u:f.u,v:f.v,size:f.size}));
  await page.setViewportSize({width:768,height:1024});
  await page.evaluate(()=>{window.__captureGrass=true;portal.current().resume();});
  await page.waitForFunction(()=>window.__grassPixels?.height>window.__grassPixels?.width&&window.__grassPixels?.pink>0,null,{timeout:20000});
  const portrait=await page.evaluate(()=>{
   window.__captureGrass=false;const T=window.__three,canvas=document.querySelector('#portalBoardHost canvas.portal-board-canvas'),rect=portal.current().faceRect(),camera=window.__grassCamera;
   const flowers=window.__flowers.filter(o=>o.parent&&o.visible).map(o=>{const w=o.getWorldPosition(new T.Vector3()).project(camera),x=canvas.getBoundingClientRect().left+(w.x+1)*.5*canvas.clientWidth,y=canvas.getBoundingClientRect().top+(1-w.y)*.5*canvas.clientHeight;let color;o.traverse(n=>{if(color===undefined&&n.isMesh&&n.material?.userData.__portalPetal)color=n.material.color.getHex();});return{u:(x-rect.left)/rect.width,v:(y-rect.top)/rect.height,size:o.scale.x/rect.width,id:window.__flowers.indexOf(o),color};});return{flowers,pixels:window.__grassPixels};
  });
  const survivors=before.map((prior,i)=>({prior,after:portrait.flowers.find(f=>f.id===identity[i])})).filter(pair=>pair.after);
  assert.ok(survivors.length>0,`at least one same-instance flower survives rotation (${landscape.flowers.length} before, ${portrait.flowers.length} after)`);
  for(const {prior,after} of survivors){assert.ok(Math.abs(after.u-prior.u)<.015&&Math.abs(after.v-prior.v)<.015,`flower stays at its face-relative center: ${JSON.stringify({prior,after})}`);assert.ok(Math.abs(after.size-prior.size)<Math.max(.0005,prior.size*.06),`flower keeps the same face-relative size: ${prior.size} vs ${after.size}`);}
  assert.ok(portrait.pixels.pink>0&&portrait.pixels.error===0,'pink flowers still render after portrait rotation');
  await page.setViewportSize({width:375,height:812});await page.evaluate(()=>portal.board('grass'));
  await page.waitForFunction(()=>document.getElementById('portalHome')?.dataset.art==='3d',null,{timeout:60000});
  const small=await draw();assert.ok(small.flowers.length>=3,'reselecting Grass on a phone-sized board lets the flowers be planted again');assert.ok(small.pixels.pink>0&&small.pixels.error===0,'the reselected board visibly renders the pink bloom pixels');
  await input.detach();
 }finally{await context.close();}
}));
