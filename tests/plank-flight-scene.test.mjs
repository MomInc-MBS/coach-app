import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three/three.module.js';
import {createBiomeScene} from '../arcade/plank-flight/biome-scene.mjs';
import {BIOMES} from '../arcade/plank-flight/biomes.mjs';

test('six scene swaps release every instance buffer once and keep transforms finite',()=>{
 const parent=new THREE.Scene();
 for(const biome of BIOMES){
  const scene=createBiomeScene(THREE,{id:biome.id});parent.add(scene.group);
  const instances=new Map(),geometries=new Map(),materials=new Map();
  scene.group.traverse(o=>{
   if(o.isInstancedMesh){instances.set(o,0);o.addEventListener('dispose',()=>instances.set(o,instances.get(o)+1));}
   if(o.geometry&&!geometries.has(o.geometry)){geometries.set(o.geometry,0);o.geometry.addEventListener('dispose',()=>geometries.set(o.geometry,geometries.get(o.geometry)+1));}
   if(o.material&&!materials.has(o.material)){materials.set(o.material,0);o.material.addEventListener('dispose',()=>materials.set(o.material,materials.get(o.material)+1));}
  });
  assert.ok(instances.size>0);
  for(const section of [0,1,2]){
   scene.update({distance:section*450+27,time:section*30+1,section,speed:20,boost:true,turn:{active:true,progress:.5,direction:1}});
   scene.group.traverse(o=>{assert.ok([...o.position,...o.scale,...o.rotation.toArray().slice(0,3)].every(Number.isFinite),`${biome.id}/${o.name}`);});
  }
  scene.dispose();scene.dispose();assert.equal(parent.children.length,0);
  for(const count of instances.values())assert.equal(count,1,'instance buffers released exactly once');
  for(const count of geometries.values())assert.equal(count,1,'geometry released exactly once');
  for(const count of materials.values())assert.equal(count,1,'materials released exactly once');
 }
});
