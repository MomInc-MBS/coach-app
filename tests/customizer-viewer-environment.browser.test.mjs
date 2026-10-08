import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdir,writeFile} from 'node:fs/promises';
import {build} from 'esbuild';
import {chromium} from 'playwright';

test('customizer borrows static supply-drop space behind the model only',{timeout:120000},async()=>{
 const code=(await build({stdin:{contents:"export {CreatureViewer} from './creature/source/viewer.ts';export * as THREE from 'three';",resolveDir:process.cwd()},bundle:true,write:false,format:'esm',target:'es2022'})).outputFiles[0].text;
 const server=createServer((req,res)=>{res.setHeader('Content-Type',req.url==='/fixture.js'?'text/javascript':'text/html');res.end(req.url==='/fixture.js'?code:'<!doctype html><div id="editor" style="width:280px;height:300px"></div><div id="pod" style="width:280px;height:300px"></div>');});
 await new Promise(done=>server.listen(0,'127.0.0.1',done));let browser;
 try{
  browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-gl=angle','--use-angle=swiftshader']});
  const page=await browser.newPage();await page.goto(`http://127.0.0.1:${server.address().port}/`);
  const result=await page.evaluate(async()=>{
   const {CreatureViewer,THREE:T}=await import('/fixture.js');
   const editor=new CreatureViewer(document.getElementById('editor'),'/creature/',true),pod=new CreatureViewer(document.getElementById('pod'),'/creature/',false);
   editor.setAwake(false);pod.setAwake(false);
   const lights=viewer=>viewer.scene.children.filter(item=>item.isLight).length;
   const sample=viewer=>{viewer.renderer.render(viewer.scene,viewer.camera);const gl=viewer.renderer.getContext();return [[140,150],[70,190],[210,110],[20,280]].map(([x,y])=>{const color=new Uint8Array(4);gl.readPixels(x,y,1,1,gl.RGBA,gl.UNSIGNED_BYTE,color);return [...color];});};
   const background=sample(editor),plain=sample(pod);
   const material=new T.MeshBasicMaterial({color:0xff0000}),geometry=new T.PlaneGeometry(1.4,1.4),model=new T.Mesh(geometry,material);
   model.position.set(0,0,-4);editor.camera.add(model);
   const foreground=sample(editor),calls=editor.renderer.info.render.calls;
   const space=editor.scene.getObjectByName('coach-preview-space'),ground=space?.getObjectByName('supply-drop-ground'),sky=space?.getObjectByName('supply-drop-sky');
   const stars=[];space?.traverse(object=>{if(object.isPoints)stars.push(object);});
   editor.setSettings({...editor.settings,reduced:true});
   const staticStars=stars.length>0&&stars.every(points=>points.material.uniforms.uTime.value===0);
   const editorLights=lights(editor),podLights=lights(pod),podSpace=!!pod.scene.getObjectByName('coach-preview-space');
   const resources=new Set([editor.scene.background]);
   space?.traverse(object=>{if(object.isMesh||object.isPoints)resources.add(object.geometry);for(const material of object.material?(Array.isArray(object.material)?object.material:[object.material]):[]){resources.add(material);for(const value of Object.values(material))if(value?.isTexture)resources.add(value);for(const uniform of Object.values(material.uniforms??{}))for(const value of Array.isArray(uniform.value)?uniform.value:[uniform.value])if(value?.isTexture)resources.add(value);}});
   const disposed=new Map();for(const resource of resources){disposed.set(resource,0);resource.addEventListener('dispose',()=>disposed.set(resource,disposed.get(resource)+1));}
   editor.dispose();pod.dispose();geometry.dispose();material.dispose();
   editor.dispose();pod.dispose();
   return {editorLights,podLights,space:!!space,ground:!!ground,sky:!!sky,podSpace,background,plain,foreground,calls,staticStars,resourceCount:resources.size,disposeCounts:[...disposed.values()],remainingCanvases:document.querySelectorAll('canvas').length,spaceDetached:space.parent===null&&space.children.length===0};
  });
  assert.equal(result.editorLights,5);assert.equal(result.podLights,3);
  assert.equal(result.space,true);assert.equal(result.ground,true);assert.equal(result.sky,true);assert.equal(result.podSpace,false);
  assert.ok(result.background.some((pixel,index)=>pixel.slice(0,3).some((value,channel)=>Math.abs(value-result.plain[index][channel])>3)),JSON.stringify(result));
  assert.ok(result.foreground[0][0]>result.foreground[0][1]*3&&result.foreground[0][0]>result.foreground[0][2]*3,'model color remains clear in front of space');
  assert.ok(result.calls<=22,`bounded landscape draws: ${result.calls}`);
  assert.equal(result.staticStars,true);
  assert.ok(result.resourceCount>10);assert.ok(result.disposeCounts.every(count=>count===1),'shared landscape resources dispose exactly once, including repeated cleanup');
  assert.equal(result.remainingCanvases,0);assert.equal(result.spaceDetached,true);
  await mkdir('.coach-window',{recursive:true});await writeFile('.coach-window/environment.json',JSON.stringify(result,null,2));
 }finally{await browser?.close();server.closeAllConnections();await new Promise(done=>server.close(done));}
});
