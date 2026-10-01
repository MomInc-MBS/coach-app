import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {chromium} from 'playwright';

async function withPortal(run){
 const source=resolve('.'),built=resolve('dist/client');
 const server=createServer(async(req,res)=>{
  const path=new URL(req.url,'http://local').pathname;
  if(path==='/__portal__'){
   res.setHeader('Content-Type','text/html');
   res.end('<!doctype html><nav class="coach-dock"><button data-panel="meals" onclick="document.querySelector(\'#mealsPanel\').showModal()">Food</button></nav><dialog id="mealsPanel">Food</dialog><script type="importmap">{"imports":{"three":"/vendor/three/three.module.js","three/addons/loaders/GLTFLoader.js":"/vendor/three/GLTFLoader.js","three/addons/libs/meshopt_decoder.module.js":"/vendor/three/meshopt_decoder.module.js"}}</script>');return;
  }
  try{const root=path.startsWith('/modules/portal/')?source:built,file=resolve(root,'.'+path);if(!file.startsWith(root+sep))throw Error();res.setHeader('Content-Type',({'.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.glb':'model/gltf-binary'})[extname(file)]||'application/octet-stream');res.end(await readFile(file));}
  catch{res.writeHead(404);res.end();}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-gl=angle','--use-angle=swiftshader']});
  const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'no-preference'});
  await page.addInitScript(()=>{
   window.__portalIdle=[];window.__captureTunnelFrame=false;window.requestIdleCallback=callback=>{window.__portalIdle.push(callback);return window.__portalIdle.length;};window.cancelIdleCallback=()=>{};
   const draw=WebGL2RenderingContext.prototype.drawArrays;
   WebGL2RenderingContext.prototype.drawArrays=function(...args){const result=draw.apply(this,args);if(window.__captureTunnelFrame&&this.canvas.closest('.portal-glass')){
    const gl=this,canvas=this.canvas,program=gl.getParameter(gl.CURRENT_PROGRAM),uN=gl.getUniformLocation(program,'uN'),uSeq=gl.getUniformLocation(program,'uSeq[0]'),pixels=new Uint8Array(canvas.width*canvas.height*4);
    gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);let lit=0,total=0;for(let i=0;i<pixels.length;i+=4*31){total++;if(pixels[i]>8||pixels[i+1]>8||pixels[i+2]>8)lit++;}
    window.__tunnelCapture={program,n:gl.getUniform(program,uN),seq:Array.from(gl.getUniform(program,uSeq)).slice(0,3).map(x=>Math.round(x*255)),viewport:Array.from(gl.getParameter(gl.VIEWPORT)),size:[canvas.width,canvas.height],lit,total,error:gl.getError()};
   }return result;};
  });
  await page.goto('http://127.0.0.1:'+server.address().port+'/__portal__');
  await run(page);
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
}

test('deferred idle program compilation preserves a live Jelly palette and rendered phase',{timeout:120000},async()=>withPortal(async page=>{
 await page.evaluate(async()=>{const {openQuiltPortal}=await import('/modules/portal/portal-entry.mjs');window.portal=await openQuiltPortal();});
 await page.evaluate(()=>window.portal.board('jelly'));
 await page.waitForFunction(()=>document.getElementById('portalHome')?.dataset.board==='jelly'&&document.getElementById('portalHome')?.dataset.art==='3d',null,{timeout:45000});
 await page.evaluate(()=>{window.phaseRun=window.portal.open('up');});
 await page.waitForFunction(()=>document.querySelector('.portal-glass.gl canvas'),null,{timeout:20000});
 const before=await page.evaluate(async()=>{window.__captureTunnelFrame=true;await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);window.__captureTunnelFrame=false;const sample=window.__tunnelCapture;window.__phaseProgram=sample.program;return{...sample,same:true};});
 assert.equal(before.n,4,'Jelly phase starts with its four selected palette rings');
 assert.deepEqual(before.seq,[244,143,177],'Jelly Candy palette is uploaded to the active program');
 assert.ok(before.lit>before.total*.2,'live Jelly phase produces visible pixels: '+JSON.stringify(before));
 const queued=await page.evaluate(()=>window.__portalIdle.filter(callback=>callback.toString().includes('tunnelGL')).length);
 assert.equal(queued,1,'the portal idle warmup is held until the race is triggered');
 await page.evaluate(()=>window.__portalIdle.find(callback=>callback.toString().includes('tunnelGL'))({didTimeout:false,timeRemaining:()=>0}));
 const after=await page.evaluate(async()=>{window.__captureTunnelFrame=true;await new Promise(requestAnimationFrame);window.__captureTunnelFrame=false;const sample=window.__tunnelCapture;return{...sample,same:sample.program===window.__phaseProgram};});
 assert.equal(after.same,true,'idle compilation cannot replace the phase CURRENT_PROGRAM');
 assert.equal(after.n,4,'the active material ring count remains intact');
 assert.deepEqual(after.seq,[244,143,177],'the active Jelly sequence remains intact');
 assert.deepEqual(after.viewport,[0,0,...after.size],'the idle cache fill restores the phase viewport');
 assert.equal(after.error,0,'the following animation frame emits no GL error');
 assert.ok(after.lit>after.total*.2,'the live phase still renders after idle compilation');
 await page.evaluate(()=>window.portal.dispose());
}));
