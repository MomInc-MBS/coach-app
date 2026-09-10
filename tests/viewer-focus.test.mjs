import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {build} from 'esbuild';
const result=await build({stdin:{contents:"export * from './creature/source/creator/camera-focus';export * from './creature/source/idle-cycle';export * as T from 'three';",resolveDir:process.cwd()},bundle:true,write:false,format:'cjs',platform:'node'});
const module={exports:{}};vm.runInNewContext(result.outputFiles[0].text,{module,exports:module.exports,console});
const {T,regionBounds,frameRegion,IdleCycle}=module.exports;
test('selected region fills the camera without clipping on portrait or landscape screens',()=>{
 const root=new T.Group(),head=new T.Mesh(new T.BoxGeometry(2,1.6,1));head.userData.region='head';head.position.set(0,2.2,0);root.add(head);
 const hidden=new T.Mesh(new T.BoxGeometry(100,100,100));hidden.userData.region='head';hidden.visible=false;root.add(hidden);
 const bounds=regionBounds(root,'head');assert.equal(bounds.getSize(new T.Vector3()).x,2);
 for(const aspect of [.45,1,2]){const camera=new T.PerspectiveCamera(36,aspect,.1,50),orbit={target:new T.Vector3(),update(){camera.lookAt(this.target);camera.updateMatrixWorld();}};assert(frameRegion(camera,orbit,bounds));assert.equal(orbit.target.y,head.position.y);assert(camera.position.distanceTo(orbit.target)<8.9);
 for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){const p=new T.Vector3(x,y,z).project(camera);assert(Math.abs(p.x)<1&&Math.abs(p.y)<1&&p.z<1);}}
});
test('idle tour plays every animation at eight-second intervals and yields to coaching',()=>{
 const cycle=new IdleCycle(['idle','greet','laugh']);assert.equal(cycle.next(1,true),null);assert.equal(cycle.next(8000,true),null);assert.equal(cycle.next(8001,true),'idle');assert.equal(cycle.next(16001,true),'greet');assert.equal(cycle.next(24001,true),'laugh');assert.equal(cycle.next(32001,true),'idle');
 assert.equal(cycle.next(40001,false),null);assert.equal(cycle.next(41001,true),null);assert.equal(cycle.next(48001,true),'greet');
});
