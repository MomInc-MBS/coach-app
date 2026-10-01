import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {resolve,join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';

const creatorDir=resolve('creature/source/creator');
async function importBundle(options){
 const result=await build({...options,bundle:true,format:'esm',platform:'neutral',write:false,target:'es2022'});
 return import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
}
const current=await importBundle({stdin:{contents:`export {sculptMaterial} from './material-language';export {resolveRegionMaterial,TEXTURES,textureDefaultMetalness} from './materials-registry';export {createCoachReliefBudget} from './material-refinement';export * as THREE from 'three';`,resolveDir:creatorDir,loader:'ts'}});
const baselinePath=resolve(dirname(fileURLToPath(import.meta.url)),'material-original-baseline.ts');
const baseline=await importBundle({entryPoints:[baselinePath]});

const digest=data=>createHash('sha256').update(data).digest('hex');
function bytes(attribute){const array=attribute.array;return Buffer.from(array.buffer,array.byteOffset,array.byteLength);}
function attributeState(attribute){return attribute?{count:attribute.count,itemSize:attribute.itemSize,normalized:attribute.normalized,arrayType:attribute.array.constructor.name,sha256:digest(bytes(attribute))}:null;}
function textureState(texture){
 if(!texture)return null;
 return {image:[texture.image?.width,texture.image?.height],data: texture.image?.data?digest(bytes({array:texture.image.data})):null,
  mapping:texture.mapping,wrapS:texture.wrapS,wrapT:texture.wrapT,magFilter:texture.magFilter,minFilter:texture.minFilter,
  format:texture.format,type:texture.type,colorSpace:texture.colorSpace,flipY:texture.flipY,premultiplyAlpha:texture.premultiplyAlpha,
  unpackAlignment:texture.unpackAlignment,generateMipmaps:texture.generateMipmaps,offset:texture.offset.toArray(),repeat:texture.repeat.toArray(),rotation:texture.rotation};
}
function materialState(material){
 return {type:material.type,name:material.name,color:material.color?.getHex(),emissive:material.emissive?.getHex(),emissiveIntensity:material.emissiveIntensity,
  roughness:material.roughness,metalness:material.metalness,bumpScale:material.bumpScale,side:material.side,polygonOffset:material.polygonOffset,
  polygonOffsetFactor:material.polygonOffsetFactor,flatShading:material.flatShading,clearcoat:material.clearcoat,clearcoatRoughness:material.clearcoatRoughness,
  transmission:material.transmission,thickness:material.thickness,ior:material.ior,attenuationColor:material.attenuationColor?.getHex(),attenuationDistance:material.attenuationDistance,
  sheen:material.sheen,sheenColor:material.sheenColor?.getHex(),sheenRoughness:material.sheenRoughness,envMapIntensity:material.envMapIntensity,
  materialStyle:material.userData.materialStyle,map:textureState(material.map),bumpMap:textureState(material.bumpMap),roughnessMap:textureState(material.roughnessMap),emissiveMap:textureState(material.emissiveMap)};
}
function resultState(mesh){
 const g=mesh.geometry,box=g.boundingBox,sphere=g.boundingSphere;
 return {position:attributeState(g.attributes.position),normal:attributeState(g.attributes.normal),uv:attributeState(g.attributes.uv),color:attributeState(g.attributes.color),
  bounds:box?{min:box.min.toArray(),max:box.max.toArray()}:null,sphere:sphere?{center:sphere.center.toArray(),radius:sphere.radius}:null,material:materialState(mesh.material)};
}
function meshFor(T,geometry,index,{skinned=false}={}){
 const Mesh=skinned?T.SkinnedMesh:T.Mesh,mesh=new Mesh(geometry,new T.MeshStandardMaterial({side:T.DoubleSide,polygonOffset:true,polygonOffsetFactor:1}));
 mesh.position.set((index%3)*.17-.12,(index%5)*-.09,.13+(index%4)*.04);mesh.rotation.set(.19+index*.013,-.27+index*.009,.31-index*.007);mesh.scale.set(.83+(index%4)*.11,1.12-(index%3)*.08,.91+(index%5)*.035);
 mesh.userData.eyeSockets=[[.19,-.14,.28,.13],[-.21,.07,-.09,.08]];return mesh;
}
function styleFor(texture){
 return current.resolveRegionMaterial(0,{textureId:texture.id,colorId:'default-gold',sparkle:0,metallic:current.textureDefaultMetalness(texture.id)??0},true);
}

test('Original MYR5 single-pass geometry, texture bytes and material profile stay byte-exact to deployed a2 across texture families and transforms',t=>{
 t.diagnostic('Oracle: tests/material-original-baseline.ts, source SHA-256 38a2eff5f1a3e698c087719022cbd0368ef13680532988cc4588e69e367d9c7c (Release 10 build a2a1dba564ef1f4fbac5)');
 const T=current.THREE,geometry=new T.SphereGeometry(.73,12,8),seen=new Set();let cases=0;
 for(const texture of current.TEXTURES){
  if(seen.has(texture.familyId))continue;seen.add(texture.familyId);
  const style=styleFor(texture),oldMesh=meshFor(T,geometry.clone(),cases),newMesh=meshFor(T,geometry.clone(),cases);
  baseline.sculptMaterial(oldMesh,style,1.17,.83);current.sculptMaterial(newMesh,style,1.17,.83);
  assert.deepEqual(resultState(newMesh),resultState(oldMesh),`family ${texture.familyId} (${texture.displayName})`);
  oldMesh.geometry.dispose();newMesh.geometry.dispose();oldMesh.material.dispose();newMesh.material.dispose();cases++;
 }
 geometry.dispose();assert.ok(cases>=40,`covers distinct texture families (found ${cases})`);
});

function unsupportedGeometry(T,kind){
 const geometry=new T.SphereGeometry(.58,10,7);
 if(kind==='skin'){
  geometry.setAttribute('skinIndex',new T.Uint16BufferAttribute(new Uint16Array(geometry.attributes.position.count*4),4));
  geometry.setAttribute('skinWeight',new T.Float32BufferAttribute(new Float32Array(geometry.attributes.position.count*4),4));
 }else if(kind==='morph'){
  const positions=geometry.attributes.position.array.slice();for(let i=1;i<positions.length;i+=3)positions[i]+=.015;
  geometry.morphAttributes.position=[new T.Float32BufferAttribute(positions,3)];
 }else if(kind==='interleaved'){
  const sourcePosition=geometry.attributes.position,sourceNormal=geometry.attributes.normal,packed=new Float32Array(sourcePosition.count*6);
  for(let i=0;i<sourcePosition.count;i++)for(let axis=0;axis<3;axis++){packed[i*6+axis]=sourcePosition.array[i*3+axis];packed[i*6+3+axis]=sourceNormal.array[i*3+axis];}
  geometry.setAttribute('position',new T.InterleavedBufferAttribute(new T.InterleavedBuffer(packed,6),3,0));
  geometry.setAttribute('normal',new T.InterleavedBufferAttribute(new T.InterleavedBuffer(packed,6),3,3));
 }
 return geometry;
}

test('animated, morph-target and interleaved meshes with a relief budget fall back to exact deployed single-pass output',()=>{
 const T=current.THREE,texture=current.TEXTURES.find(item=>item.familyId===18),style=styleFor(texture);
 for(const [index,kind] of ['skin','morph','interleaved'].entries()){
  const options={skinned:kind==='skin'},oldMesh=meshFor(T,unsupportedGeometry(T,kind),index+3,options),newMesh=meshFor(T,unsupportedGeometry(T,kind),index+3,options),budget=current.createCoachReliefBudget();
  baseline.sculptMaterial(oldMesh,style,1.31,.71);current.sculptMaterial(newMesh,style,1.31,.71,budget);
  assert.deepEqual(resultState(newMesh),resultState(oldMesh),`${kind} geometry`);
  assert.equal(budget.usedTriangles,0,`${kind} geometry bypasses refinement budget`);
  oldMesh.geometry.dispose();newMesh.geometry.dispose();oldMesh.material.dispose();newMesh.material.dispose();
 }
});
