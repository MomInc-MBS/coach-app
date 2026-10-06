import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {resolve} from 'node:path';
import {readFileSync} from 'node:fs';

const bundle=await build({stdin:{contents:"export {materialFor,applyPaletteSurface,surfaceSample,applySparkle} from './material-language';export {applyInstalledSkin} from './skin-materials';export * from './palette-finishes';export * as THREE from 'three';",resolveDir:resolve('creature/source/creator'),loader:'ts'},bundle:true,format:'esm',platform:'neutral',write:false,target:'es2022'});
const {materialFor,applyPaletteSurface,applyInstalledSkin,applySparkle,samplePaletteTint,THREE:T}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const palettes=JSON.parse(readFileSync('creature/source/creator/palettes.json'));
const style={id:30,primary:'#a55a34',secondary:'#4e2a1a',accent:'#e7b48a',emissive:'#000000',roughness:.55,metalness:0,detail:'flat'};
const pixels=texture=>texture.image.data;
const finish=id=>palettes.find(p=>p.finish===id).id;

test('new finishes change appearance while preserving each original texture height and displacement',()=>{
 for(const id of [0,30,31,...Array.from({length:25},(_,i)=>32+i)]){
  const plain=materialFor({...style,id},1);
  for(const kind of ['matte','watercolor','marbled','polished-metal']){
   const palette=materialFor({...style,id,paletteId:finish(kind)},1);
   assert.deepEqual(pixels(plain.bumpMap),pixels(palette.bumpMap));assert.equal(plain.bumpScale,palette.bumpScale);
   assert.equal(palette.normalMap,plain.normalMap);
   assert.equal(palette.roughnessMap,null,'finish supplies its PBR roughness without inherited scaling');
   palette.dispose();
  }
  plain.dispose();
 }
});

test('flat palettes show many colors and watercolor and marbled produce different pigment fields',()=>{
 const materials=['matte','watercolor','marbled'].map(kind=>materialFor({...style,paletteId:finish(kind)},1));
 for(const material of materials)assert(new Set(Array.from({length:pixels(material.map).length/4},(_,n)=>[...pixels(material.map).slice(n*4,n*4+3)].join(','))).size>100);
 assert.notDeepEqual(pixels(materials[1].map),pixels(materials[2].map));
 for(const kind of ['watercolor','marbled']){
  const id=finish(kind),samples=[];
  for(let y=0;y<24;y++)for(let x=0;x<24;x++)samples.push(samplePaletteTint(id,.5,x/24,y/24,true));
  assert(Math.min(...samples)<.15&&Math.max(...samples)>.85,kind+' spans all three stops');
  assert.equal(samplePaletteTint(id,.5,-.25,1.25),samplePaletteTint(id,.5,.75,.25),'repeat-wrapped UV');
 }
 assert.equal(samplePaletteTint(undefined,.5,.2,.3,true),.5,'single-color Flat remains constant');
 materials.forEach(m=>m.dispose());
});

test('palette caches remain distinct and eye helper receives the palette finish without changing its geometry',()=>{
 const id=finish('matte'),plain=materialFor(style,1),palette=materialFor({...style,paletteId:id},1),again=materialFor({...style,paletteId:id},1);
 assert.notEqual(plain.map,palette.map);assert.equal(palette.map,again.map);
 const iris=new T.MeshStandardMaterial({color:style.primary,roughness:.23,metalness:.12});
 applyPaletteSurface(iris,{...style,paletteId:id});assert.equal(iris.map,palette.map);assert.equal(iris.roughness,.92);assert.equal(iris.metalness,0);
 const base=new T.MeshStandardMaterial({color:style.primary});applyPaletteSurface(base,style);assert.equal(base.map,null);assert.equal(base.color.getHexString(),'a55a34');
 [plain,palette,again,iris,base].forEach(m=>m.dispose());
});

test('all eight finishes have distinct physical properties and shader hooks compose with installed maps',async()=>{
 const original=T.TextureLoader.prototype.load;T.TextureLoader.prototype.load=function(url,loaded){const texture=new T.Texture();queueMicrotask(()=>loaded(texture));return texture;};
 const expected={'matte':[.92,0],'brushed-metal':[.44,.82],'polished-metal':[.16,.92],glitter:[.24,.35],pearl:[.3,.08],watercolor:[.96,0],marbled:[.35,.05],glaze:[.24,0]};
 try{
  for(const [kind,[roughness,metalness]] of Object.entries(expected)){
   const id=finish(kind),owned=new Set(),mesh=new T.Mesh(new T.PlaneGeometry(),new T.MeshPhysicalMaterial());
   const normal=new Uint8Array([1]),height=new Uint8Array([2]);
   await applyInstalledSkin(mesh,{id:'finish-test',maps:{normal,height}},{...style,paletteId:id},owned);
   assert(mesh.material.normalMap&&mesh.material.bumpMap);assert.equal(mesh.material.bumpScale,.018);
   assert.equal(mesh.material.roughness,roughness);assert.equal(mesh.material.metalness,metalness);
   if(kind==='pearl')assert.equal(mesh.material.iridescence,1);
   if(kind==='glaze')assert.equal(mesh.material.clearcoat,1);
   applySparkle(mesh.material,.4);
   const key=mesh.material.customProgramCacheKey();
   for(let n=0;n<2;n++){
    const shader={uniforms:{},vertexShader:'#include <common>\n#include <uv_vertex>',fragmentShader:'#include <common>\n#include <color_fragment>\n#include <roughnessmap_fragment>\n#include <dithering_fragment>'};
    mesh.material.onBeforeCompile(shader,{});
    assert.match(shader.fragmentShader,/texture2D\(myr5SkinHeight/);assert.match(shader.fragmentShader,/diffuseColor.rgb=skinPalette/);
    assert.equal(shader.uniforms.myr5SkinPrimary.value.getHexString(),'a55a34');
    assert.equal(mesh.material.customProgramCacheKey(),key,'compiling never changes the cache key');
    if(kind==='glitter')assert(!shader.uniforms.uSparkle,'glitter finish already supplies its glints');
    else assert.equal(shader.uniforms.uSparkle.value,.4,'manual sparkle preserves skin shader');
   }
   owned.forEach(t=>t.dispose());mesh.geometry.dispose();mesh.material.dispose();
  }
 }finally{T.TextureLoader.prototype.load=original;}
});
