import * as T from 'three';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import {correctBlobPelvisOwnership} from '../creature/source/creator/assemble';
import {createRig} from '../creature/source/rig';
import {fresh} from '../creature/source/creator/design';

const id='roster/06-ridge-triad--geometric_robot_3d_model1';
(globalThis as any).createImageBitmap=async()=>({width:1,height:1,close(){}});(globalThis as any).self=globalThis;
await MeshoptDecoder.ready;
const file=fileURLToPath(new URL(`../creature/models/${id}.glb`,import.meta.url));
const bytes=readFileSync(file),scene=(await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'')).scene;
scene.updateMatrixWorld(true);
function tris(root:T.Object3D){let count=0;root.traverse(o=>{if(o instanceof T.Mesh)count+=(o.geometry.index?.count??o.geometry.getAttribute('position').count)/3;});return count;}
function verts(root:T.Object3D){let count=0;root.traverse(o=>{if(o instanceof T.Mesh)count+=o.geometry.getAttribute('position').count;});return count;}
const feet=scene.getObjectByName('feet')!,body=scene.getObjectByName('body')!,beforeTotal=tris(scene),beforeFeet=tris(feet),beforeBody=tris(body);
const moved=correctBlobPelvisOwnership(scene,id);scene.updateMatrixWorld(true);
const afterTotal=tris(scene),afterFeet=tris(feet),afterBody=tris(body);
if(moved<2500||afterTotal!==beforeTotal||afterFeet!==beforeFeet-moved||afterBody!==beforeBody+moved)throw Error(JSON.stringify({moved,beforeTotal,afterTotal,beforeFeet,afterFeet,beforeBody,afterBody}));
const rig=createRig(scene,{...fresh(),body:id,headFrom:id,armsFrom:id,feetFrom:id}),footMetrics:any={};
for(const name of ['FootLeft','FootRight']){const node=rig.nodes[name];if(verts(node)===0)throw Error(`${name} has no geometry after center bridge transfer`);rig.root.updateMatrixWorld(true);const mesh=node.children.find((o:any)=>o.isMesh) as T.Mesh,p=mesh.geometry.getAttribute('position'),before=new T.Vector3().fromBufferAttribute(p,0).applyMatrix4(mesh.matrixWorld);node.rotation.z=.37;rig.root.updateMatrixWorld(true);const after=new T.Vector3().fromBufferAttribute(p,0).applyMatrix4(mesh.matrixWorld);node.rotation.z=0;rig.root.updateMatrixWorld(true);if(before.distanceTo(after)<1e-5)throw Error(`${name} no longer moves`);footMetrics[name]={triangles:tris(node),vertices:verts(node),pivotMoves:true};}
console.log(JSON.stringify({id,movedCenterBridgeTriangles:moved,totalTrianglesConserved:afterTotal===beforeTotal,bodyTriangleDelta:afterBody-beforeBody,feetTriangleDelta:afterFeet-beforeFeet,footMetrics}));
