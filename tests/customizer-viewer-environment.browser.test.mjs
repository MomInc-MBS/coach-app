import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {build} from 'esbuild';
import {chromium} from 'playwright';

test('customizer adds static atmosphere and balanced lights behind the model only',async()=>{
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
   editor.setSettings({...editor.settings,reduced:true});const staticGlows=editor.previewGlows.every(sprite=>sprite.position.z===-35);
   editor.dispose();pod.dispose();geometry.dispose();material.dispose();
   return {editorLights:lights(editor),podLights:lights(pod),glows:editor.previewGlows.length,podGlows:pod.previewGlows.length,background,plain,foreground,calls,staticGlows};
  });
  assert.equal(result.editorLights,5);assert.equal(result.podLights,3);
  assert.equal(result.glows,2);assert.equal(result.podGlows,0);
  assert.ok(result.background.some((pixel,index)=>pixel.slice(0,3).some((value,channel)=>Math.abs(value-result.plain[index][channel])>3)),JSON.stringify(result));
  assert.ok(result.foreground[0][0]>result.foreground[0][1]*3&&result.foreground[0][0]>result.foreground[0][2]*3,'model color remains clear in front of glow');
  assert.ok(result.calls<=5,'the preview atmosphere uses only two extra draws');
  assert.equal(result.staticGlows,true);
 }finally{await browser?.close();server.closeAllConnections();await new Promise(done=>server.close(done));}
});
