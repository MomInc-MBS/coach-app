import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import sharp from 'sharp';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import {optimizeGLB} from '../scripts/optimize-glb.mjs';

const load=bytes=>new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
const flat=root=>{const list=[];root.updateMatrixWorld(true);root.traverse(o=>list.push(o));return list;};

test('optimized models load in three.js with the authored scene, geometry and animation',async()=>{
 // The coach's finger variants (plain meshes) and an exercise demo (skin + animation).
 for(const path of ['creature/models/hands-v2.glb','models/pushup.glb']){
  const input=await readFile(path),output=await optimizeGLB(input);
  assert(output.length<input.length*.8,path);
  const [a,b]=await Promise.all([load(input),load(output)]),x=flat(a.scene),y=flat(b.scene);
  assert.equal(x.length,y.length,path);
  for(let i=0;i<x.length;i++){
   assert.equal(y[i].name,x[i].name);assert.equal(y[i].type,x[i].type);assert.deepEqual(y[i].matrixWorld.elements,x[i].matrixWorld.elements,x[i].name);
   if(!x[i].isMesh)continue;
   const g=x[i].geometry,h=y[i].geometry;
   assert.deepEqual(h.index?.array,g.index?.array,x[i].name);
   assert.deepEqual(Object.keys(h.attributes),Object.keys(g.attributes),x[i].name);
   for(const [name,attribute] of Object.entries(g.attributes)){
    const after=h.attributes[name].array;assert.equal(after.constructor,attribute.array.constructor,name);
    assert.deepEqual(after,attribute.array,name);
   }
  }
  assert.deepEqual(b.animations.map(c=>c.tracks.map(t=>[t.name,[...t.times],[...t.values]])),a.animations.map(c=>c.tracks.map(t=>[t.name,[...t.times],[...t.values]])),path);
 }
});

test('PNG textures become lossless WebP with identical pixels',async()=>{
 const input=await readFile('handborne/models/family-00.glb'),output=await optimizeGLB(input);
 const parse=b=>{const n=b.readUInt32LE(12),doc=JSON.parse(b.subarray(20,20+n)),bin=b.subarray(28+n);return {doc,image:i=>{const v=doc.bufferViews[doc.images[i].bufferView];return bin.subarray(v.byteOffset||0,(v.byteOffset||0)+v.byteLength);}};};
 const a=parse(input),b=parse(output);
 assert(b.doc.images.length>0&&b.doc.images.every(image=>image.mimeType==='image/webp'));
 assert(b.doc.textures.every(t=>t.source===undefined&&t.extensions.EXT_texture_webp.source>=0));
 for(let i=0;i<a.doc.images.length;i++){const [p,q]=await Promise.all([a.image(i),b.image(i)].map(x=>sharp(x).ensureAlpha().raw().toBuffer()));assert(p.equals(q),a.doc.images[i].name);}
});
