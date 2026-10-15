import * as T from 'three';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {assembleCreature} from '../creature/source/creator/assemble';
import {createRig} from '../creature/source/rig';
import {fresh} from '../creature/source/creator/design';

const id='roster/08-shard-asym--geometric_robot_3d_model';
(globalThis as any).createImageBitmap=async()=>({width:1,height:1,close(){}});(globalThis as any).self=globalThis;
const nativeFetch=globalThis.fetch;globalThis.fetch=async(input:any)=>String(input).startsWith('http://audit/creature/models/')?new Response(readFileSync(fileURLToPath(new URL(`../creature/models/${String(input).split('/models/')[1]}`,import.meta.url)))):nativeFetch(input);
const recipe={...fresh(),body:id,headFrom:id,armsFrom:id,feetFrom:id},assembly=await assembleCreature(recipe,'http://audit/creature/'),rig=createRig(assembly.root,recipe);
const triangles=(node:T.Object3D)=>{let count=0;node.traverse(o=>{if(o instanceof T.Mesh)count+=(o.geometry.index?.count??o.geometry.getAttribute('position').count)/3;});return count;};
const armTriangles={ArmLeft:triangles(rig.nodes.ArmLeft),ArmRight:triangles(rig.nodes.ArmRight)},moving:any={};rig.root.updateMatrixWorld(true);
for(const name of ['ArmLeft','ArmRight'] as const){const node=rig.nodes[name],find=(minY:number,maxY:number)=>{let mesh:T.Mesh|undefined,index=-1,point=new T.Vector3();node.traverse(o=>{if(!(o instanceof T.Mesh)||mesh)return;const p=o.geometry.getAttribute('position');for(let i=0;i<p.count;i++){const v=o.getVertexPosition(i,new T.Vector3()).applyMatrix4(o.matrixWorld);if(v.y>minY&&v.y<maxY&&Math.abs(v.x)>.5){mesh=o;index=i;point.copy(v);break;}}});return {mesh,index,point};},lower=find(.35,1.28),upper=find(1.28,2.05);
 if(!lower.mesh||!upper.mesh)throw Error(`${name} is missing a complete lower/upper arm chain`);node.rotation.z+=name==='ArmRight'?.22:-.22;rig.root.updateMatrixWorld(true);const lowerMoved=lower.mesh.getVertexPosition(lower.index,new T.Vector3()).applyMatrix4(lower.mesh.matrixWorld).distanceTo(lower.point)>.02,upperMoved=upper.mesh.getVertexPosition(upper.index,new T.Vector3()).applyMatrix4(upper.mesh.matrixWorld).distanceTo(upper.point)>.02;if(!lowerMoved||!upperMoved)throw Error(`${name} upper/lower arm chain did not follow its pivot`);moving[name]={upper:upperMoved,lower:lowerMoved};node.rotation.z=0;rig.root.updateMatrixWorld(true);}
if(!armTriangles.ArmLeft||!armTriangles.ArmRight)throw Error(JSON.stringify({armTriangles,moving}));
console.log(JSON.stringify({id,armTriangles,bothCompleteArmsMove:moving}));assembly.dispose();
