import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {build} from 'esbuild';
import {readFileSync,unlinkSync} from 'node:fs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {armBodyTriangles,armFootTriangles,connectedComponentSides,connectedTriangleComponents,detachedHandTriangles,triangleSubset} from '../creature/source/limb-ownership.ts';
const rigBundle=fileURLToPath(new URL('./.coach-limb-rig-test.mjs',import.meta.url));
await build({entryPoints:[fileURLToPath(new URL('../creature/source/rig.ts',import.meta.url))],outfile:rigBundle,bundle:true,platform:'node',format:'esm',target:'node22',external:['three']});
const {createRig,inferGroundedSidePlaneX}=await import(pathToFileURL(rigBundle).href);
after(()=>{try{unlinkSync(rigBundle);}catch{}});

class PositionAttribute {
  constructor(values) { this.values=values; this.count=values.length/3; }
  getX(i){return this.values[i*3];} getY(i){return this.values[i*3+1];} getZ(i){return this.values[i*3+2];}
}
function mesh(tris,translate=[0,0,0]) {
  const values=tris.flat(2),elements=[1,0,0,0,0,1,0,0,0,0,1,0,...translate,1];
  return {geometry:{getAttribute(name){assert.equal(name,'position');return new PositionAttribute(values);}},matrixWorld:{elements}};
}

test('foot boundary rescue keeps feet, low hands, and quadruped front legs separate',()=>{
  const lowerA=[[-.5,.35,0],[-.4,.35,0],[-.5,.25,0]],lowerB=[[-.5,.35,0],[-.5,.25,0],[-.4,.25,0]],hand=[[.65,.32,0],[.8,.32,0],[.75,.22,0]],upper=[[.2,.65,0],[.4,.65,0],[.3,.55,0]];
  const arm=mesh([lowerA,lowerB,hand,upper]),feet=mesh([[[-.5,.25,0],[-.4,.25,0],[-.45,.1,.1]]]);
  assert.deepEqual([...armFootTriangles(arm,{min:{x:-.6,y:0,z:-.1},max:{x:.6,y:.4,z:.2}},[feet],{contactTolerance:.02})],[0,1]);
  const shoulderBridge=[[-.5,.35,0],[-.5,.25,0],[-.2,.7,0]],continuousArm=mesh([lowerA,lowerB,shoulderBridge]);
  assert.equal(armFootTriangles(continuousArm,{min:{x:-.6,y:0,z:-.1},max:{x:.6,y:.4,z:.2}},[feet],{contactTolerance:.02}).size,0,
    'low wrist triangles stay in the arms when their complete connected component reaches the shoulder');
  assert.equal(armFootTriangles(mesh([lowerA,lowerB]),{min:{x:-.6,y:0,z:-.1},max:{x:.6,y:.4,z:.2}},[feet],{contactTolerance:.02,bodyLowerY:.34}).size,0,
    'a detached arm/claw component that reaches the body lower cut stays an arm');
  const groundedLeg=mesh([[[-.5,.35,0],[-.4,.35,0],[-.5,0,0]],[[-.4,.35,0],[-.4,0,0],[-.5,0,0]]]);
  assert.equal(armFootTriangles(groundedLeg,{min:{x:-.6,y:0,z:-.1},max:{x:.6,y:.4,z:.2}},[feet],{contactTolerance:.02,bodyLowerY:.34}).size,2,
    'a grounded whole leg touching the feet boundary remains a foot even when it reaches the pelvis cut');
  const front=mesh([[[.8,.3,1],[.9,.3,1],[.85,.1,1]],[[.8,.3,1],[.85,.1,1],[.9,.1,1]]]);
  const hind=mesh([[[-.8,.25,-1],[-.7,.25,-1],[-.75,.05,-1]]]);
  assert.equal(armFootTriangles(front,{min:{x:-1,y:0,z:-1.2},max:{x:1,y:.4,z:1.2}},[hind],{contactTolerance:.02}).size,0);
});

test('detached hand boundary component moves from feet while a grounded foot stays put',()=>{
  const handA=[[.5,.8,0],[.7,.8,0],[.5,.9,0]],handB=[[.7,.8,0],[.7,.9,0],[.5,.9,0]],groundedFoot=[[0,0,0],[.1,0,0],[0,.1,.08]];
  const feet=mesh([handA,handB,groundedFoot]),arms=mesh([[[.5,.8,0],[.7,.8,0],[.6,.72,0]]]),body=mesh([[[-.1,.4,0],[.1,.4,0],[0,.5,.1]]]);
  const selected=detachedHandTriangles(feet,{min:{x:-.2,y:0,z:-.1},max:{x:.2,y:.9,z:.2}},[feet],{min:{x:.4,y:.7,z:-.1},max:{x:.8,y:.9,z:.2}},[arms],{min:{x:-.3,y:.3,z:-.2},max:{x:.3,y:.6,z:.2}},[body],{min:{x:-.3,y:.3,z:-.2},max:{x:.3,y:.55,z:.2}});
  assert.deepEqual([...selected],[0,1]);
  assert.ok(!selected.has(2),'the grounded foot remains under feet');
});

test('only a small lower torso shard touching the body boundary is rehomed',()=>{
  const body=mesh([[[0,.2,0],[.1,.2,0],[.05,.3,0]]]);
  const shard=[[0,.2,0],[.1,.2,0],[.05,.12,.08]],hand=[[.4,.32,0],[.5,.32,0],[.45,.22,.08]],shoulder=[[0,.8,0],[.1,.8,0],[.05,.9,.08]];
  assert.deepEqual([...armBodyTriangles(mesh([shard,hand,shoulder]),{min:{x:-.2,y:0,z:-.2},max:{x:.2,y:1,z:.2}},[body],{contactTolerance:.02})],[0]);
});

test('component side ownership never splits a center-crossing connected piece',()=>{
  const left=[[-.9,0,0],[-.8,0,0],[-.85,.1,0]],right=[[.8,0,0],[.9,0,0],[.85,.1,0]],fusedA=[[-.2,.4,0],[.2,.4,0],[-.2,.6,0]],fusedB=[[.2,.4,0],[.2,.6,0],[-.2,.6,0]];
  assert.deepEqual([...connectedComponentSides(mesh([left,right,fusedA,fusedB]))],[-1,1,0,0]);
});

test('createRig keeps fused neutral arm triangles animated by centroid side',()=>{
  const source=new THREE.Group();source.userData.pivots={body:[0,0,0],head:[0,0,0],arm:[1,0,0],foot:[1,0,0]};
  for(const name of ['head','eye','collar','body','arms','feet']){const group=new THREE.Group();group.name=name;source.add(group);}
  const headGeometry=new THREE.BufferGeometry();headGeometry.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,.1,0,0,.05,.1,0],3));
  source.getObjectByName('head').add(new THREE.Mesh(headGeometry,new THREE.MeshStandardMaterial()));
  const left=[[-2,0,0],[-1,0,0],[-1.5,.5,0]],right=[[1,0,0],[2,0,0],[1.5,.5,0]],fusedA=[[-.2,1,0],[.2,1,0],[-.2,1.2,0]],fusedB=[[.2,1,0],[.2,1.2,0],[-.2,1.2,0]];
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute([left,right,fusedA,fusedB].flat(2),3));
  const arms=source.getObjectByName('arms');arms.add(new THREE.Mesh(geometry,new THREE.MeshStandardMaterial()));
  const taggedGeometry=new THREE.BufferGeometry();taggedGeometry.setAttribute('position',new THREE.Float32BufferAttribute([.1,0,0,.2,0,0,.15,.1,0],3));const taggedArm=new THREE.Mesh(taggedGeometry,new THREE.MeshStandardMaterial());taggedArm.userData.rigNodeName='ArmRight';arms.add(taggedArm);
  const rig=createRig(source,{eyeLayout:'single',armsFrom:'roster/test',feetFrom:'roster/test'});
  const triangleCount=node=>node.children.reduce((count,mesh)=>count+(mesh.isMesh?(mesh.geometry.index?.count??mesh.geometry.getAttribute('position').count)/3:0),0);
  const treeTriangleCount=node=>{let count=0;node.traverse(mesh=>{if(mesh.isMesh)count+=(mesh.geometry.index?.count??mesh.geometry.getAttribute('position').count)/3;});return count;};
  assert.equal(triangleCount(rig.nodes.BodyMotion),0);
  assert.equal(triangleCount(rig.nodes.ArmLeft),2);
  assert.equal(triangleCount(rig.nodes.ArmRight),3);
  assert.equal(treeTriangleCount(rig.root),6,'all source faces are retained exactly once');
  const skinnedArm=rig.nodes.ArmRight.children.find(mesh=>mesh.isSkinnedMesh);
  assert.ok(skinnedArm,'tagged arm mesh receives a shoulder seam skin');
  assert.equal(skinnedArm.skeleton.bones[0],rig.nodes.HeadMotion,'the seam follows the nearest source surface, which is the head');
  const animated=rig.nodes.ArmLeft.children.find(mesh=>mesh.isMesh),position=animated.geometry.getAttribute('position');
  rig.root.updateMatrixWorld(true);const before=new THREE.Vector3().fromBufferAttribute(position,0).applyMatrix4(animated.matrixWorld);
  rig.nodes.ArmLeft.rotation.z=.5;rig.root.updateMatrixWorld(true);const after=new THREE.Vector3().fromBufferAttribute(position,0).applyMatrix4(animated.matrixWorld);
  assert.ok(before.distanceTo(after)>.1,'neutral fused triangles still move with the arm pivot');
  rig.root.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();o.material.dispose();}});
});

test('Rous real GLB keeps its two grounded feet on opposite moving rig nodes',async()=>{
  const restore={self:globalThis.self,createImageBitmap:globalThis.createImageBitmap};
  globalThis.self??=globalThis;globalThis.createImageBitmap??=async()=>({width:1,height:1,close(){}});
  try{
    await MeshoptDecoder.ready;
    const model=fileURLToPath(new URL('../creature/models/roster/09-monolith-tanka--robot_3d_model2.glb',import.meta.url)),bytes=readFileSync(model),buffer=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
    const scene=(await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(buffer,'/creature/models/roster/')).scene;scene.updateWorldMatrix(true,true);
    const footRegion=scene.getObjectByName('feet'),footMeshes=[];footRegion.traverse(o=>{if(o instanceof THREE.Mesh&&o.visible)footMeshes.push(o);});
    const footBox=new THREE.Box3();for(const mesh of footMeshes)footBox.expandByObject(mesh);const ground=[];
    for(const mesh of footMeshes)for(const ids of connectedTriangleComponents(mesh)){
      const position=mesh.geometry.getAttribute('position'),index=mesh.geometry.index;let minY=Infinity,minX=Infinity,maxX=-Infinity;
      for(const id of ids)for(let k=0;k<3;k++){const v=new THREE.Vector3().fromBufferAttribute(position,index?index.getX(id*3+k):id*3+k).applyMatrix4(mesh.matrixWorld);minY=Math.min(minY,v.y);minX=Math.min(minX,v.x);maxX=Math.max(maxX,v.x);}
      if(minY<=footBox.min.y+(footBox.max.y-footBox.min.y)*.1)ground.push({mesh,ids,centerX:(minX+maxX)/2});
    }
    ground.sort((a,b)=>b.ids.length-a.ids.length);assert.ok(ground.length>=2);
    const plane=inferGroundedSidePlaneX(footRegion);assert.ok(Math.abs(plane-.7109)<.002,`inferred split plane ${plane}`);
    assert.ok(ground[0].centerX<plane&&ground[1].centerX>plane,'the two grounded feet straddle the inferred plane');
    const id='roster/09-monolith-tanka--robot_3d_model2',rig=createRig(scene,{eyeLayout:'single',armsFrom:id,feetFrom:id});
    const signatures=node=>{const result=new Set();node.traverse(o=>{if(!(o instanceof THREE.Mesh))return;const p=o.geometry.getAttribute('position'),ix=o.geometry.index,count=ix?.count??p.count;for(let i=0;i+2<count;i+=3){const vertices=[];for(let k=0;k<3;k++){const vertex=ix?ix.getX(i+k):i+k,v=new THREE.Vector3();if(o instanceof THREE.SkinnedMesh)o.getVertexPosition(vertex,v);else v.fromBufferAttribute(p,vertex);o.localToWorld(v);vertices.push([v.x,v.y,v.z].map(n=>n.toFixed(3)).join(','));}result.add(vertices.sort().join('|'));}});return result;};
    const sideMeshes={FootLeft:signatures(rig.nodes.FootLeft),FootRight:signatures(rig.nodes.FootRight)};
    for(const component of ground.slice(0,2)){
      const expected=component.centerX<plane?'FootLeft':'FootRight',opposite=expected==='FootLeft'?'FootRight':'FootLeft',p=component.mesh.geometry.getAttribute('position'),ix=component.mesh.geometry.index,wanted=[];
      for(const face of component.ids){const vertices=[];for(let k=0;k<3;k++){const v=new THREE.Vector3().fromBufferAttribute(p,ix?ix.getX(face*3+k):face*3+k).applyMatrix4(component.mesh.matrixWorld);vertices.push([v.x,v.y,v.z].map(n=>n.toFixed(3)).join(','));}wanted.push(vertices.sort().join('|'));}
      const retained=wanted.filter(key=>sideMeshes[expected].has(key)).length,misassigned=wanted.filter(key=>sideMeshes[opposite].has(key)).length;
      assert.equal(misassigned,0,`${expected} ground component must not be split to ${opposite}`);
      assert.ok(retained>=component.ids.length*.99,`${expected} retains its ground component (${retained}/${component.ids.length})`);
    }
    for(const node of [rig.nodes.FootLeft,rig.nodes.FootRight])assert.ok(node.children.some(o=>o instanceof THREE.SkinnedMesh),'each foot node remains movable');
  }finally{
    if(restore.self===undefined)delete globalThis.self;else globalThis.self=restore.self;
    if(restore.createImageBitmap===undefined)delete globalThis.createImageBitmap;else globalThis.createImageBitmap=restore.createImageBitmap;
  }
});

test('a shared cut boundary stays welded along its full height during arm motion',()=>{
 const source=new THREE.Group();source.userData.pivots={body:[0,0,0],head:[0,0,0],arm:[0,0,0],foot:[0,0,0]};
 for(const name of ['head','eye','collar','body','arms','feet']){const group=new THREE.Group();group.name=name;source.add(group);}
 const surface=(name,vertices)=>{const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices.flat(),3));source.getObjectByName(name).add(new THREE.Mesh(g,new THREE.MeshStandardMaterial()));};
 surface('body',[[.2,.2,0],[.2,.9,0],[0,.2,0]]);surface('head',[[0,1.1,0],[.1,1.1,0],[0,1.2,0]]);
 surface('arms',[[.2,.2,0],[.7,.4,0],[.2,.9,0]]);
 const rig=createRig(source,{eyeLayout:'single',armsFrom:'roster/test',feetFrom:'roster/test'}),arm=rig.nodes.ArmRight.children.find(m=>m instanceof THREE.Mesh);
 rig.root.updateMatrixWorld(true);const p=arm.geometry.getAttribute('position'),seams=[];let tip;
 for(let i=0;i<p.count;i++){const world=arm.getVertexPosition(i,new THREE.Vector3()).applyMatrix4(arm.matrixWorld);if(world.x<.21)seams.push([i,world]);else tip=[i,world];}
 assert.equal(seams.length,2);rig.nodes.ArmRight.rotation.z=.8;rig.root.updateMatrixWorld(true);
 for(const [i,rest] of seams)assert.ok(rest.distanceTo(arm.getVertexPosition(i,new THREE.Vector3()).applyMatrix4(arm.matrixWorld))<1e-6,'every real cut vertex stays attached to body');
 assert.ok(tip[1].distanceTo(arm.getVertexPosition(tip[0],new THREE.Vector3()).applyMatrix4(arm.matrixWorld))>.05,'distal arm still moves');
});

test('roster arm glue frees a hand near the hip while keeping the shoulder seam body-weighted',()=>{
  const makeSource=()=>{
    const source=new THREE.Group();source.userData.pivots={body:[0,0,0],head:[0,0,0],arm:[0,0,0],foot:[0,0,0]};
    for(const name of ['head','eye','collar','body','arms','feet']){const group=new THREE.Group();group.name=name;source.add(group);}
    const addSurface=(region,tris)=>{const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(tris.flat(2),3));source.getObjectByName(region).add(new THREE.Mesh(geometry,new THREE.MeshStandardMaterial()));};
    addSurface('head',[[[0,1.2,0],[.1,1.2,0],[.05,1.3,0]]]);
    addSurface('body',[[[.1,.2,0],[.2,.2,0],[.2,.9,0]],[[.1,.2,0],[.2,.9,0],[.1,.9,0]]]);
    // One connected arm surface: shoulder vertices sit against the torso; the hand returns
    // alongside the hip, where distance-only seam weighting would pin it to BodyMotion.
    addSurface('arms',[[[.19,.9,.01],[.3,.9,.01],[.19,.75,.01]],[[.19,.75,.01],[.3,.9,.01],[.3,.4,.01]],[[.19,.4,.01],[.3,.4,.01],[.24,.25,.01]]]);
    return source;
  };
  const roster=createRig(makeSource(),{eyeLayout:'single',armsFrom:'roster/test',feetFrom:'roster/test'}),arm=roster.nodes.ArmRight.children.find(o=>o instanceof THREE.SkinnedMesh);
  assert.ok(arm,'roster arm receives a skinned shoulder seam');
  roster.root.updateMatrixWorld(true);const position=arm.geometry.getAttribute('position'),weights=arm.geometry.getAttribute('skinWeight'),world=new THREE.Vector3();let handIndex=-1,shoulderIndex=-1;
  for(let i=0;i<position.count;i++){
    world.fromBufferAttribute(position,i).applyMatrix4(arm.matrixWorld);const {x,y}=world;
    if(y<.3&&x>.2)handIndex=i;
    if(y>.89&&x<.25)shoulderIndex=i;
  }
  assert.notEqual(handIndex,-1,'fixture includes a hand vertex next to the hip');
  assert.notEqual(shoulderIndex,-1,'fixture includes a torso-adjacent shoulder vertex');
  assert.equal(weights.getX(handIndex),0,'distal hand is not weighted to the torso, despite touching its surface');
  assert.equal(weights.getY(handIndex),1,'distal hand keeps full ArmRight ownership');
  assert.ok(weights.getX(shoulderIndex)>0,'proximal shoulder seam retains body influence');
  assert.ok(weights.getY(shoulderIndex)<1,'proximal seam blends into ArmRight');

  const native=createRig(makeSource(),{eyeLayout:'single',armsFrom:'myr5',feetFrom:'myr5'});let nativeArmMeshes=[];
  for(const node of [native.nodes.ArmLeft,native.nodes.ArmRight])node.traverse(o=>{if(o instanceof THREE.Mesh)nativeArmMeshes.push(o);});
  assert.ok(nativeArmMeshes.length>0);
  assert.ok(nativeArmMeshes.every(o=>!o.isSkinnedMesh),'native MYR5 arm geometry keeps its existing rigid pivots');
  for(const rig of [roster,native])rig.root.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();o.material.dispose();}});
});

test('a separated quadruped limb rotates around its transformed source joint',()=>{
  const source=new THREE.Group();source.userData.pivots={body:[0,.8,0],head:[0,0,0],arm:[.4,.2,0],foot:[.3,.2,0]};
  for(const name of ['head','body','arms','feet']){const group=new THREE.Group();group.name=name;source.add(group);}
  source.getObjectByName('body').add(new THREE.Mesh(new THREE.BoxGeometry(.4,.4,.4),new THREE.MeshStandardMaterial()));
  const priorGeometry=new THREE.BufferGeometry();priorGeometry.setAttribute('position',new THREE.Float32BufferAttribute([.2,.1,1.5,.3,.1,1.5,.2,.2,1.5],3));source.getObjectByName('arms').add(new THREE.Mesh(priorGeometry,new THREE.MeshStandardMaterial()));
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute([.6,.1,3.2,.7,.1,3.2,.6,.7,3.2],3));
  const leg=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial());leg.userData={rigNodeName:'ArmRight',rigJointLocal:[.6,.7,3.2]};source.getObjectByName('arms').add(leg);
  const rig=createRig(source,{eyeLayout:'single',armsFrom:'roster/test',feetFrom:'roster/test'}),node=rig.nodes.ArmRight;rig.root.updateMatrixWorld(true);
  const joint=new THREE.Vector3(.6,.7,3.2);assert.ok(node.getWorldPosition(new THREE.Vector3()).distanceTo(joint)<1e-6,'source joint replaces the distant humanoid pivot when no body contact exists');
  const mesh=node.children.find(o=>o.isMesh),before=mesh.getVertexPosition(0,new THREE.Vector3()).applyMatrix4(mesh.matrixWorld);node.rotation.x=.5;rig.root.updateMatrixWorld(true);
  assert.ok(before.distanceTo(new THREE.Vector3(.2,.1,1.5))<1e-6,'a later explicit pivot keeps earlier mixed-recipe surfaces in their rest positions');
  const after=mesh.getVertexPosition(0,new THREE.Vector3()).applyMatrix4(mesh.matrixWorld),expected=before.clone().sub(joint).applyAxisAngle(new THREE.Vector3(1,0,0),.5).add(joint);
  assert.ok(after.distanceTo(expected)<1e-6,'paw follows a local arc at its source attachment, without orbiting z=0');
  rig.root.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();o.material.dispose();}});
});

test('triangle partition conserves exact attribute values, including interleaved and normalized data',()=>{
  const source=new THREE.BufferGeometry();
  source.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,1,0,0,1,1,0,0,1,0],3));
  source.setAttribute('normal',new THREE.Float32BufferAttribute([0,0,1,0,0,1,0,0,1,0,0,1],3));
  source.setAttribute('color',new THREE.Uint8BufferAttribute([0,20,40,60,80,100,120,140,160,180,200,220],3,true));
  const interleaved=new THREE.InterleavedBuffer(new Float32Array([.1,.2,7,8,.3,.4,9,10,.5,.6,11,12,.7,.8,13,14]),4);
  source.setAttribute('uv',new THREE.InterleavedBufferAttribute(interleaved,2,0));
  source.setAttribute('custom',new THREE.InterleavedBufferAttribute(interleaved,2,2));
  source.setIndex([0,1,2,0,2,3]);
  source.morphAttributes.position=[new THREE.Float32BufferAttribute([0,0,.1,1,0,.1,1,1,.1,0,1,.1],3)];
  const chosen=triangleSubset(source,id=>id===0),remainder=triangleSubset(source,id=>id===1);
  assert.ok(chosen&&remainder);
  assert.equal(chosen.index.count/3+remainder.index.count/3,source.index.count/3);
  for(const out of [chosen,remainder])for(const [name,attribute]of Object.entries(source.attributes)){
    const copied=out.getAttribute(name);assert.ok(copied,`keeps ${name}`);assert.equal(copied.count,3);
    for(let i=0;i<copied.count;i++)for(let c=0;c<copied.itemSize;c++){
      const expectedVertices=out===chosen?[0,1,2]:[0,2,3];
      assert.equal(copied.getComponent(i,c),attribute.getComponent(expectedVertices[i],c),`${name}[${i},${c}]`);
    }
  }
  assert.equal(chosen.morphAttributes.position[0].count,3);
  assert.ok([...chosen.morphAttributes.position[0].array].every((value,i)=>Math.abs(value-[0,0,.1,1,0,.1,1,1,.1][i])<1e-6));
  chosen.dispose();remainder.dispose();source.dispose();
});
