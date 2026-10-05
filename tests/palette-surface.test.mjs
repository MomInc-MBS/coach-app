import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {resolve} from 'node:path';
import {paletteSurfaceTint} from '../creature/source/creator/palette-surface.mjs';

const bundle=await build({stdin:{contents:"export {materialFor,applyPaletteSurface} from './material-language';export {applyInstalledSkin} from './skin-materials';export * as THREE from 'three';",resolveDir:resolve('creature/source/creator'),loader:'ts'},bundle:true,format:'esm',platform:'neutral',write:false,target:'es2022'});
const {materialFor,applyPaletteSurface,applyInstalledSkin,THREE:T}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const style={id:30,primary:'#a55a34',secondary:'#4e2a1a',accent:'#e7b48a',emissive:'#000000',roughness:.55,metalness:0,detail:'flat'};
const pixels=texture=>texture.image.data;

test('palette field covers dark, middle and accent colours with seamless repeating coordinates',()=>{
 const values=[];for(let y=0;y<60;y++)for(let x=0;x<60;x++)values.push(paletteSurfaceTint(x/60,y/60));
 assert(values.filter(v=>v<.15).length>400);assert(values.filter(v=>v>.85).length>400);assert(values.filter(v=>v>.35&&v<.65).length>400);
 for(const [u,v] of [[.13,.4],[0,0],[.7,.94]]){
  assert(Math.abs(paletteSurfaceTint(u,v)-paletteSurfaceTint(u+1,v))<1e-12);
  assert(Math.abs(paletteSurfaceTint(u,v)-paletteSurfaceTint(u,v+1))<1e-12);
 }
});

test('Flat and Clay palettes change colour across a single map while preserving texture relief',()=>{
 for(const id of [30,31,43]){
  const plain=materialFor({...style,id},1),palette=materialFor({...style,id,paletteId:'pal-15'},1);
  const colours=new Set();const data=pixels(palette.map);for(let i=0;i<data.length;i+=4)colours.add(`${data[i]},${data[i+1]},${data[i+2]}`);
  assert(colours.size>100,`family ${id} must contain multiple colour shades`);
  assert.notDeepEqual(pixels(plain.map),pixels(palette.map));
  assert.deepEqual(pixels(plain.bumpMap),pixels(palette.bumpMap));assert.deepEqual(pixels(plain.roughnessMap),pixels(palette.roughnessMap));
  assert.equal(plain.bumpScale,palette.bumpScale);assert.equal(plain.metalness,palette.metalness);
  plain.dispose();palette.dispose();
 }
});

test('palette and base colour cache entries remain distinct; eye helper retains geometry-independent material properties',()=>{
 const plain=materialFor(style,1),palette=materialFor({...style,paletteId:'pal-15'},1),again=materialFor({...style,paletteId:'pal-15'},1);
 assert.notEqual(plain.map,palette.map);assert.equal(palette.map,again.map);
 const iris=new T.MeshStandardMaterial({color:style.primary,roughness:.23,metalness:.12});
 applyPaletteSurface(iris,{...style,paletteId:'pal-15'});assert.equal(iris.color.getHexString(),'ffffff');assert.equal(iris.map,palette.map);assert.equal(iris.roughness,.23);assert.equal(iris.metalness,.12);
 const base=new T.MeshStandardMaterial({color:style.primary});applyPaletteSurface(base,style);assert.equal(base.map,null);assert.equal(base.color.getHexString(),'a55a34');
 [plain,palette,again,iris,base].forEach(m=>m.dispose());
});

test('installed normal-only packet receives a palette surface while retaining its normal map',async()=>{
 const original=T.TextureLoader.prototype.load;T.TextureLoader.prototype.load=function(url,loaded){const texture=new T.Texture();queueMicrotask(()=>loaded(texture));return texture;};
 const mesh=new T.Mesh(new T.PlaneGeometry(),new T.MeshPhysicalMaterial()),owned=new Set();
 try{
  await applyInstalledSkin(mesh,{id:'normal-palette',maps:{normal:new Uint8Array([1])}},{...style,paletteId:'pal-15'},owned);
  const shader={uniforms:{},vertexShader:'#include <common>\n#include <uv_vertex>',fragmentShader:'#include <common>\n#include <color_fragment>'};mesh.material.onBeforeCompile(shader,{});
  assert(mesh.material.normalMap);assert.match(shader.fragmentShader,/myr5PaletteSurfaceTint\(vMyr5SkinUv\)/);assert.match(shader.fragmentShader,/diffuseColor.rgb=skinPalette/);
  assert.equal(shader.uniforms.myr5SkinPrimary.value.getHexString(),'a55a34');assert.match(mesh.material.customProgramCacheKey(),/\|palette$/);
 }finally{T.TextureLoader.prototype.load=original;owned.forEach(t=>t.dispose());mesh.geometry.dispose();mesh.material.dispose();}
});
