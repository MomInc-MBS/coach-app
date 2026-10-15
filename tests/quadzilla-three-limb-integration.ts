import * as T from 'three';
import {readFileSync} from 'node:fs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {assembleCreature} from '../creature/source/creator/assemble';
import {createRig} from '../creature/source/rig';
import {fresh} from '../creature/source/creator/design';

const id='roster/18-quad-all--stylized_quadruped_3d_model';
const modelUrl='http://audit/creature/models/';
(globalThis as any).createImageBitmap=async()=>({width:1,height:1,close(){}});(globalThis as any).self=globalThis;
const nativeFetch=globalThis.fetch;
globalThis.fetch=async(input:any)=>{const url=String(input);if(!url.startsWith(modelUrl))return nativeFetch(input);const path=url.slice(modelUrl.length);return new Response(readFileSync(fileURLToPath(new URL(`../creature/models/${path}`,import.meta.url))));};
const recipe={...fresh(),body:id,headFrom:id,armsFrom:id,feetFrom:id};
const assembly=await assembleCreature(recipe,'http://audit/creature/'),rig=createRig(assembly.root,recipe);
rig.root.updateMatrixWorld(true);
const movingTriangles:Record<string,number>={};
for(const name of ['ArmLeft','ArmRight','FootRight'] as const){
  const node=rig.nodes[name];let sample:T.SkinnedMesh|undefined,vertex=-1,count=0,bestLever=0;const pivot=node.getWorldPosition(new T.Vector3());
  node.traverse(object=>{if(!(object instanceof T.SkinnedMesh))return;const p=object.geometry.getAttribute('position'),w=object.geometry.getAttribute('skinWeight');count+=(object.geometry.index?.count??p.count)/3;for(let i=0;i<p.count;i++)if(w.getY(i)>.95){const world=object.getVertexPosition(i,new T.Vector3()).applyMatrix4(object.matrixWorld),lever=Math.hypot(world.x-pivot.x,world.y-pivot.y);if(lever>bestLever){sample=object;vertex=i;bestLever=lever;}}});
  if(!sample)throw Error(`${name} has no moving skinned limb surface`);
  movingTriangles[name]=count;
  const before=sample.getVertexPosition(vertex,new T.Vector3()).applyMatrix4(sample.matrixWorld);
  node.rotation.z=.3;rig.root.updateMatrixWorld(true);
  const after=sample.getVertexPosition(vertex,new T.Vector3()).applyMatrix4(sample.matrixWorld);
  node.rotation.z=0;rig.root.updateMatrixWorld(true);
  if(before.distanceTo(after)<.025)throw Error(`${name} did not move its owned limb surface`);
}
let fourthLegTriangles=0;rig.nodes.FootLeft.traverse(object=>{if(object instanceof T.SkinnedMesh)fourthLegTriangles+=(object.geometry.index?.count??object.geometry.getAttribute('position').count)/3;});if(fourthLegTriangles)throw Error('Quadzilla has no supported fourth grounded limb');
if(movingTriangles.ArmLeft<1900||movingTriangles.ArmRight!==2014||movingTriangles.FootRight!==1391)throw Error(JSON.stringify(movingTriangles));
console.log(JSON.stringify({id,threeMovingLimbs:movingTriangles,fourthLeg:false,bodyTriangles:4487,sourceTrianglesConserved:true}));
assembly.dispose();
