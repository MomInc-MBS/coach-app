import * as T from 'three';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {assembleCreature} from '../creature/source/creator/assemble';
import {createRig} from '../creature/source/rig';
import {connectedTriangleComponents} from '../creature/source/limb-ownership';
import {fresh} from '../creature/source/creator/design';

const id='roster/14-chisel-spire--low_poly_robot_3d_model';
(globalThis as any).createImageBitmap=async()=>({width:1,height:1,close(){}});(globalThis as any).self=globalThis;
const nativeFetch=globalThis.fetch;
globalThis.fetch=async(input:any)=>{const url=String(input),modelPath=url.startsWith('http://audit/creature/models/')?url.slice('http://audit/creature/models/'.length):'';if(modelPath.endsWith('.glb'))return new Response(readFileSync(fileURLToPath(new URL(`../creature/models/${modelPath}`,import.meta.url))));return nativeFetch(input);};

const recipe={...fresh(),body:id,headFrom:id,armsFrom:id,feetFrom:id};
const assembly=await assembleCreature(recipe,'http://audit/creature/');
const armsWrapper=assembly.root.children.find(o=>o.name==='arms')!,sourceArms=armsWrapper.children.find(o=>o.name==='arms')!;
assembly.root.updateMatrixWorld(true);
let targetMesh:T.Mesh|undefined,targetComponent:number[]|undefined,targetBox=new T.Box3();
sourceArms.traverse(o=>{if(!(o instanceof T.Mesh)||!o.visible)return;for(const component of connectedTriangleComponents(o)){if(component.length!==204)continue;const p=o.geometry.getAttribute('position'),ix=o.geometry.index,box=new T.Box3();for(const face of component)for(let k=0;k<3;k++)box.expandByPoint(new T.Vector3().fromBufferAttribute(p,ix?ix.getX(face*3+k):face*3+k).applyMatrix4(o.matrixWorld));if(box.min.x<-.92&&box.max.x<-.54&&box.min.y>=1.22&&box.max.y<1.4){targetMesh=o;targetComponent=component;targetBox=box;}}});
if(!targetMesh||!targetComponent)throw Error('Could not locate the original 204-triangle Rea-Spire arm plate after source repairs');
const p=targetMesh.geometry.getAttribute('position'),ix=targetMesh.geometry.index,expected=new Set<string>(),key=(v:T.Vector3)=>[v.x,v.y,v.z].map(n=>Math.round(n*1e4)).join(',');
for(const face of targetComponent)for(let k=0;k<3;k++)expected.add(key(new T.Vector3().fromBufferAttribute(p,ix?ix.getX(face*3+k):face*3+k).applyMatrix4(targetMesh.matrixWorld)));
const rig=createRig(assembly.root,recipe);rig.root.updateMatrixWorld(true);
const matches:{mesh:T.SkinnedMesh;vertex:number;own:number;body:number;point:T.Vector3}[]=[];
rig.nodes.ArmLeft.traverse(o=>{if(!(o instanceof T.SkinnedMesh))return;const weights=o.geometry.getAttribute('skinWeight'),pos=o.geometry.getAttribute('position');for(let i=0;i<pos.count;i++){const world=o.getVertexPosition(i,new T.Vector3()).applyMatrix4(o.matrixWorld);if(expected.has(key(world)))matches.push({mesh:o,vertex:i,own:weights.getY(i),body:weights.getX(i),point:world});}});
if(matches.length<40)throw Error(JSON.stringify({reason:'plate vertices were not preserved in ArmLeft',targetBox:targetBox.min.toArray().concat(targetBox.max.toArray()),matches:matches.length}));
const mixed=matches.filter(v=>v.own<.999||v.body>.001);if(mixed.length)throw Error(JSON.stringify({reason:'detached Rea-Spire plate was blended into BodyMotion despite having no body contact',matchedVertices:matches.length,mixedVertices:mixed.length,minOwn:Math.min(...matches.map(v=>v.own)),maxBody:Math.max(...matches.map(v=>v.body))}));
const selected=matches[0],before=selected.mesh.getVertexPosition(selected.vertex,new T.Vector3()).applyMatrix4(selected.mesh.matrixWorld);rig.nodes.ArmLeft.rotation.z=.3;rig.root.updateMatrixWorld(true);const after=selected.mesh.getVertexPosition(selected.vertex,new T.Vector3()).applyMatrix4(selected.mesh.matrixWorld);if(before.distanceTo(after)<.05)throw Error(`The Rea-Spire plate did not move with ArmLeft: ${before.distanceTo(after)}`);
console.log(JSON.stringify({id,plateTriangles:targetComponent.length,plateBounds:{min:targetBox.min.toArray(),max:targetBox.max.toArray()},matchedVertices:matches.length,allVerticesOwnedByArm:true,armPivotDisplacement:before.distanceTo(after)}));assembly.dispose();
