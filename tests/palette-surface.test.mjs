import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {resolve} from 'node:path';

const bundle=await build({stdin:{contents:"export {materialFor,applyPaletteSurface,surfaceSample} from './material-language';export {applyInstalledSkin} from './skin-materials';export * as THREE from 'three';",resolveDir:resolve('creature/source/creator'),loader:'ts'},bundle:true,format:'esm',platform:'neutral',write:false,target:'es2022'});
const {materialFor,applyPaletteSurface,surfaceSample,applyInstalledSkin,THREE:T}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const style={id:30,primary:'#a55a34',secondary:'#4e2a1a',accent:'#e7b48a',emissive:'#000000',roughness:.55,metalness:0,detail:'flat'};
const pixels=texture=>texture.image.data;

test('palette colors follow the existing texture values pixel for pixel, including Bamboo ridges and recesses',()=>{
 for(const id of [0,30,31,...Array.from({length:24},(_,i)=>32+i)]){
  const palette=materialFor({...style,id,paletteId:'pal-15'},1),plain=materialFor({...style,id},1),data=pixels(palette.map);
  const dark=new T.Color(style.secondary),middle=new T.Color(style.primary),light=new T.Color(style.accent),color=new T.Color();
  for(let y=0;y<192;y++)for(let x=0;x<192;x++){
   const tone=surfaceSample(id,x/192,y/192).tint,index=(y*192+x)*4;
   color.copy(tone<.5?dark:middle).lerp(tone<.5?middle:light,tone<.5?tone*2:(tone-.5)*2);
   assert.deepEqual([...data.slice(index,index+3)],[color.r,color.g,color.b].map(v=>Math.round(v*255)),`texture ${id} at ${x},${y}`);
  }
  assert.deepEqual(pixels(plain.bumpMap),pixels(palette.bumpMap));assert.deepEqual(pixels(plain.roughnessMap),pixels(palette.roughnessMap));
  assert.equal(plain.bumpScale,palette.bumpScale);assert.equal(plain.metalness,palette.metalness);
  if(id===30)assert.equal(new Set(Array.from({length:data.length/4},(_,n)=>[...data.slice(n*4,n*4+3)].join(','))).size,1,'Flat receives no invented pattern');
  if(id===48){const high=surfaceSample(id,0,0),low=surfaceSample(id,.0625,0);assert(high.height>low.height);assert(high.tint>low.tint,'Bamboo raised and recessed values supply palette regions');}
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

test('installed packets map palettes through existing tones and retain normal maps without invented patterns',async()=>{
 const original=T.TextureLoader.prototype.load;T.TextureLoader.prototype.load=function(url,loaded){const texture=new T.Texture();queueMicrotask(()=>loaded(texture));return texture;};
 try{
  for(const [name,maps,expression] of [
   ['normal-only',{normal:new Uint8Array([1])},'clamp(0.5,0.0,1.0)'],
   ['base',{normal:new Uint8Array([1]),basecolor:new Uint8Array([2])},'dot(texture2D(myr5SkinBasecolor'],
   ['height',{height:new Uint8Array([1]),basecolor:new Uint8Array([2])},'texture2D(myr5SkinHeight,vMyr5SkinUv).r'],
   ['mask',{tintMask:new Uint8Array([1]),height:new Uint8Array([2]),basecolor:new Uint8Array([3])},'dot(texture2D(myr5SkinMask']
  ]){
   const mesh=new T.Mesh(new T.PlaneGeometry(),new T.MeshPhysicalMaterial()),owned=new Set();
   try{
    await applyInstalledSkin(mesh,{id:name,maps},{...style,paletteId:'pal-15'},owned);
    const shader={uniforms:{},vertexShader:'#include <common>\n#include <uv_vertex>',fragmentShader:'#include <common>\n#include <color_fragment>'};mesh.material.onBeforeCompile(shader,{});
    if(maps.normal)assert(mesh.material.normalMap);
    assert(shader.fragmentShader.includes(expression));assert(!shader.fragmentShader.includes('myr5PaletteSurfaceTint'));assert(!shader.fragmentShader.includes('sin('));
    assert.match(shader.fragmentShader,/diffuseColor.rgb=skinPalette/);assert(!shader.fragmentShader.includes('diffuseColor.rgb*='),'old texture hue does not leak into palette');
    assert.equal(shader.uniforms.myr5SkinPrimary.value.getHexString(),'a55a34');assert.match(mesh.material.customProgramCacheKey(),/\|palette$/);
   }finally{owned.forEach(t=>t.dispose());mesh.geometry.dispose();mesh.material.dispose();}
  }
 }finally{T.TextureLoader.prototype.load=original;}
});
