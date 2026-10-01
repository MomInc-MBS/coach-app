import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import * as THREE from 'three';
import {makeCords,spinBy} from '../modules/rooms/reminders-computer.mjs';

test('Reminders computer rotation is clamped to a legible ten degree range',()=>{
 assert.equal(spinBy(0,8),8);
 assert.equal(spinBy(8,20),10);
 assert.equal(spinBy(-8,-20),-10);
});

test('the room parses cached model bytes and never activates poster or URL based art',async()=>{
 const module=await readFile(new URL('../modules/rooms/reminders-computer.mjs',import.meta.url),'utf8');
 const css=await readFile(new URL('../modules/rooms/reminders-computer.css',import.meta.url),'utf8');
 assert.match(module,/storage\.keys\(\)/);
 assert.match(module,/names\.reverse\(\)/);
 assert.match(module,/store\.match\(MODEL\)/);
 assert.doesNotMatch(module,/caches\.match\(/);
 assert.match(module,/assets\.model\.arrayBuffer\(\)/);
 assert.match(module,/parseAsync\(modelBytes,''\)/);
 assert.match(module,/setURLModifier\(url=>/);
 assert.match(module,/TubeGeometry/);
 assert.match(module,/new THREE\.WebGLRenderer/);
 assert.doesNotMatch(module,/\.loadAsync\(/);
 assert.doesNotMatch(module,/new Image\(|console\.webp/);
 assert.doesNotMatch(css,/border-image|reminders-computer-sway/);
 assert.match(css,/reminders-computer-stage/);
 assert.match(css,/reminders-computer-screen/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});

test('all background cables keep a small bounded tube radius behind the console',()=>{
 const scene=new THREE.Scene();makeCords(scene);assert.equal(scene.children.length,13);
 for(const cable of scene.children){
  cable.geometry.computeBoundingBox();const {min,max}=cable.geometry.boundingBox;
  assert.ok(max.x<.54&&min.x>-.54,'cable stays close to the model area');
  assert.ok(max.y<1.15&&min.y>-.2,'cable loops stay within the backdrop');
  assert.ok(max.z<-.25&&min.z>-.55,'cables remain behind the GLB');
  assert.notEqual(cable.material.color.getHex(),0xffffff);
 }
});
