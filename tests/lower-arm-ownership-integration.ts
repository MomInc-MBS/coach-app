import * as T from 'three';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import {repairRosterSource} from '../creature/source/creator/assemble';

(globalThis as any).createImageBitmap=async()=>({width:1,height:1,close(){}});(globalThis as any).self=globalThis;
await MeshoptDecoder.ready;
async function source(id:string){const bytes=readFileSync(fileURLToPath(new URL(`../creature/models/${id}.glb`,import.meta.url)));const gltf=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');gltf.scene.updateMatrixWorld(true);return gltf.scene;}
function tris(object:T.Object3D){let n=0;object.traverse(o=>{if(o instanceof T.Mesh)n+=(o.geometry.index?.count??o.geometry.getAttribute('position').count)/3;});return n;}
function marker(object:T.Object3D,name:string){let n=0;object.traverse(o=>{if(o instanceof T.Mesh)n+=Number(o.userData[name])||0;});return n;}
for(const [id,expectedFeet,expectedBody] of [
 ['roster/02-taper-tallstalk--3d_humanoid_figure',0,233],
 ['roster/02-taper-tallstalk--humanoid_robot_3d_model1',663,97],
 ['roster/08-shard-asym--geometric_robot_3d_model',101,0],
 ['roster/14-chisel-spire--low_poly_robot_3d_model',871,0],
 ['roster/03-pearl-orb-ring--circle_center',322,60],
 ['roster/03-pearl-orb-ring--ringed_humanoid_3d_model',324,60],
 ['roster/19-genie-multi--multi-armed_humanoid_3d_model1',1597,164],
] as const){
 const scene=await source(id),arms=scene.getObjectByName('arms')!,feet=scene.getObjectByName('feet')!,body=scene.getObjectByName('body')!,before=tris(scene);
 repairRosterSource(scene,id);scene.updateMatrixWorld(true);
 const actualFeet=marker(feet,'recoveredArmFootTriangles'),actualBody=marker(body,'recoveredArmBodyTriangles');
 if(actualFeet!==expectedFeet||actualBody!==expectedBody||tris(scene)!==before)throw Error(JSON.stringify({id,expectedFeet,actualFeet,expectedBody,actualBody,trianglesBefore:before,trianglesAfter:tris(scene),arms:tris(arms),feet:tris(feet),body:tris(body)}));
 console.log(JSON.stringify({id,recoveredToFeet:actualFeet,recoveredToBody:actualBody,triangleCountConserved:true}));
}
