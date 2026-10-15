import * as T from 'three';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {assembleCreature} from '../creature/source/creator/assemble';
import {createRig} from '../creature/source/rig';
import {fresh} from '../creature/source/creator/design';

const id='roster/08-shard-asym--fantasy_creature_3d_model2';
(globalThis as any).createImageBitmap=async()=>({width:1,height:1,close(){}});(globalThis as any).self=globalThis;
const nativeFetch=globalThis.fetch;globalThis.fetch=async(input:any)=>{const url=String(input),modelPath=url.startsWith('http://audit/creature/models/')?url.slice('http://audit/creature/models/'.length):'';if(modelPath.endsWith('.glb'))return new Response(readFileSync(fileURLToPath(new URL(`../creature/models/${modelPath}`,import.meta.url))));return nativeFetch(input);};
const recipe={...fresh(),body:id,headFrom:id,armsFrom:id,feetFrom:id},assembly=await assembleCreature(recipe,'http://audit/creature/'),armsRegion=assembly.root.children.find(o=>o.name==='arms')!,feetRegion=assembly.root.children.find(o=>o.name==='feet')!;
const triangles=(node:T.Object3D)=>{let n=0;node.traverse(o=>{if(o instanceof T.Mesh)n+=(o.geometry.index?.count??o.geometry.getAttribute('position').count)/3;});return n;};
const armRegionTriangles=triangles(armsRegion),feetRegionTriangles=triangles(feetRegion);if(armRegionTriangles<3300||feetRegionTriangles<2500)throw Error(JSON.stringify({armRegionTriangles,feetRegionTriangles}));
const rig=createRig(assembly.root,recipe),armCounts={ArmLeft:triangles(rig.nodes.ArmLeft),ArmRight:triangles(rig.nodes.ArmRight)},clawVertices:{ArmLeft:number;ArmRight:number}={ArmLeft:0,ArmRight:0};
for(const name of ['ArmLeft','ArmRight'] as const){const node=rig.nodes[name];node.traverse(o=>{if(!(o instanceof T.Mesh))return;const p=o.geometry.getAttribute('position'),weight=o.geometry.getAttribute('skinWeight');for(let i=0;i<p.count;i++){const v=new T.Vector3().fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld);if(v.y>.48&&v.y<.84&&Math.abs(v.x)>.55&&(!weight||weight.getY(i)>.75))clawVertices[name]++;}});}
if(!armCounts.ArmLeft||!armCounts.ArmRight||!clawVertices.ArmLeft||!clawVertices.ArmRight)throw Error(JSON.stringify({armRegionTriangles,feetRegionTriangles,armCounts,clawVertices}));
const node=rig.nodes.ArmRight;rig.root.updateMatrixWorld(true);const meshes:T.Mesh[]=[];node.traverse(o=>{if(o instanceof T.Mesh)meshes.push(o);});let selectedMesh:T.Mesh|undefined,selectedVertex=-1,selectedPoint=new T.Vector3();for(const mesh of meshes){const p=mesh.geometry.getAttribute('position'),w=mesh.geometry.getAttribute('skinWeight');for(let i=0;i<p.count;i++){const v=new T.Vector3().fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld);if(v.x>.55&&v.y>.48&&v.y<.84&&(!w||w.getY(i)>.75)){selectedMesh=mesh;selectedVertex=i;selectedPoint.copy(v);break;}}if(selectedMesh)break;}
if(!selectedMesh)throw Error('Could not locate a distal WaterSonic arm vertex');selectedMesh.getVertexPosition(selectedVertex,selectedPoint).applyMatrix4(selectedMesh.matrixWorld);node.rotation.z=.25;rig.root.updateMatrixWorld(true);const after=selectedMesh.getVertexPosition(selectedVertex,new T.Vector3()).applyMatrix4(selectedMesh.matrixWorld);if(selectedPoint.distanceTo(after)<.05)throw Error('WaterSonic skinned claw/arm geometry did not follow the arm pivot');
console.log(JSON.stringify({id,armRegionTriangles,feetRegionTriangles,armCounts,clawVertices,armPivotMoves:true}));assembly.dispose();
