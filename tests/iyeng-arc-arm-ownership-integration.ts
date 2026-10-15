import * as T from 'three';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import {assembleCreature,repairRosterSource} from '../creature/source/creator/assemble';
import {createRig} from '../creature/source/rig';
import {connectedTriangleComponents} from '../creature/source/limb-ownership';
import {correctPetalWispArmOwnership} from '../creature/source/petal-wisp-ownership';
import {fresh} from '../creature/source/creator/design';

const id='roster/10-petal-wisp--stylized_creature_3d_model';
(globalThis as any).createImageBitmap=async()=>({width:1,height:1,close(){}});(globalThis as any).self=globalThis;
await MeshoptDecoder.ready;
const nativeFetch=globalThis.fetch;
globalThis.fetch=async(input:any)=>{const url=String(input),modelPath=url.startsWith('http://audit/creature/models/')?url.slice('http://audit/creature/models/'.length):'';if(modelPath.endsWith('.glb'))return new Response(readFileSync(fileURLToPath(new URL(`../creature/models/${modelPath}`,import.meta.url))));return nativeFetch(input);};
const rawBytes=readFileSync(fileURLToPath(new URL(`../creature/models/${id}.glb`,import.meta.url)));
const loadRaw=async()=>{const data=rawBytes.buffer.slice(rawBytes.byteOffset,rawBytes.byteOffset+rawBytes.byteLength);return (await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(data,'')).scene;};
const triangles=(node:T.Object3D)=>{let n=0;node.traverse(o=>{if(o instanceof T.Mesh)n+=(o.geometry.index?.count??o.geometry.getAttribute('position').count)/3;});return n;};
const source=await loadRaw(),sourceCount=triangles(source),repairReport=repairRosterSource(source,id),recovered=correctPetalWispArmOwnership(source,id),afterSourceCount=triangles(source);
if(sourceCount!==afterSourceCount||(repairReport as any).petalWispArmTriangles!==1313||recovered!==0||repairReport.handOwnershipTriangles!==292)throw Error(JSON.stringify({sourceCount,afterSourceCount,recovered,repairReport}));
const recipe={...fresh(),body:id,headFrom:id,armsFrom:id,feetFrom:id},assembly=await assembleCreature(recipe,'http://audit/creature/'),armsWrapper=assembly.root.children.find(o=>o.name==='arms')!;
assembly.root.updateMatrixWorld(true);
const recoveredMeshes:T.Mesh[]=[];armsWrapper.traverse(o=>{if(o instanceof T.Mesh&&[581,732].includes(Number(o.userData.petalWispRecoveredArmTriangles)))recoveredMeshes.push(o);});if(recoveredMeshes.length!==2||recoveredMeshes.reduce((n,m)=>n+Number(m.userData.petalWispRecoveredArmTriangles),0)!==1313)throw Error('The repaired 581+732-triangle fin/arm components were not assembled');
const rig=createRig(assembly.root,recipe);rig.root.updateMatrixWorld(true);
const movement:Record<string,number>={};
for(const name of ['ArmLeft','ArmRight'] as const){let picked:T.Mesh|undefined,vertex=-1,best=-1;rig.nodes[name].traverse(o=>{if(!(o instanceof T.Mesh))return;const p=o.geometry.getAttribute('position');for(let i=0;i<p.count;i++){const point=new T.Vector3().fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld),d=point.distanceTo(rig.nodes[name].getWorldPosition(new T.Vector3()));if(d>best){best=d;picked=o;vertex=i;}}});if(!picked)throw Error(`${name} has no arm surface (rigid or skinned)`);const before=picked.getVertexPosition(vertex,new T.Vector3()).applyMatrix4(picked.matrixWorld);rig.nodes[name].rotation.z=.28;rig.root.updateMatrixWorld(true);const after=picked.getVertexPosition(vertex,new T.Vector3()).applyMatrix4(picked.matrixWorld);movement[name]=before.distanceTo(after);rig.nodes[name].rotation.z=0;rig.root.updateMatrixWorld(true);if(movement[name]<.05)throw Error(`${name} source surface did not move with its arm pivot`);}
console.log(JSON.stringify({id,sourceTrianglesConserved:true,originalFootFinTriangles:repairReport.handOwnershipTriangles,recoveredFinArmTriangles:(repairReport as any).petalWispArmTriangles,armMovement:movement}));assembly.dispose();
