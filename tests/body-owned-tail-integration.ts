import * as T from 'three';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {assembleCreature} from '../creature/source/creator/assemble';
import {fresh} from '../creature/source/creator/design';
import {createRig} from '../creature/source/rig';

(globalThis as any).createImageBitmap=async()=>({width:1,height:1,close(){}});(globalThis as any).self=globalThis;
const nativeFetch=globalThis.fetch;
globalThis.fetch=async(input:any)=>{const url=String(input),prefix='http://audit/creature/models/';if(!url.startsWith(prefix))return nativeFetch(input);return new Response(readFileSync(fileURLToPath(new URL(`../creature/models/${url.slice(prefix.length)}`,import.meta.url))));};
function triangles(object:T.Object3D|undefined){let n=0;object?.traverse(o=>{if(o instanceof T.Mesh)n+=(o.geometry.index?.count??o.geometry.getAttribute('position').count)/3;});return n;}
function recoveredBodyTriangles(object:T.Object3D|undefined){let n=0;object?.traverse(o=>{if(o instanceof T.Mesh)n+=Number(o.userData.recoveredArmBodyTriangles)||0;});return n;}
function recoveredTailCutTriangles(object:T.Object3D|undefined){let n=0;object?.traverse(o=>{if(o instanceof T.Mesh)n+=Number(o.userData.recoveredTailCutTriangles)||0;});return n;}
const ids=[
 'roster/12-seedpod-snailslug--stylized_worm_3d_model',
 'roster/10-petal-wisp--ghost_character_3d_model',
 'roster/10-petal-wisp--fantasy_creature_3d_model4',
 'roster/19-genie-multi--fantasy_creature_3d_model',
 'roster/19-genie-multi--stylized_octopus_3d_model',
];
const needsBelowCutRecovery=new Set([ids[0],ids[1],ids[2],ids[3],ids[4]]);
const continuousShell=new Set([ids[0],ids[3],ids[4]]);
for(const id of ids){const recipe={...fresh(),body:id,headFrom:id,armsFrom:id,feetFrom:id},assembly=await assembleCreature(recipe,'http://audit/creature/');const region=(name:string)=>assembly.root.children.find(o=>o.name===name),feet=region('feet'),body=region('body'),arms=region('arms'),metrics={feet:triangles(feet),body:triangles(body),arms:triangles(arms),recoveredArmToBody:recoveredBodyTriangles(body),recoveredTailCut:recoveredTailCutTriangles(body)};if(metrics.feet!==0||metrics.body===0||(continuousShell.has(id)?metrics.arms!==0:metrics.arms===0)||(needsBelowCutRecovery.has(id)&&metrics.recoveredArmToBody===0))throw Error(JSON.stringify({id,...metrics}));
 const rig=createRig(assembly.root,recipe);if(continuousShell.has(id)){for(const name of ['ArmLeft','ArmRight','FootLeft','FootRight'])if(triangles(rig.nodes[name]))throw Error(`${id} shell split into ${name}`);const mesh=rig.nodes.BodyMotion.children.find(o=>o instanceof T.Mesh) as T.Mesh;rig.root.updateMatrixWorld(true);const before=mesh.getVertexPosition(0,new T.Vector3()).applyMatrix4(mesh.matrixWorld);rig.nodes.BodyMotion.rotation.y=.3;rig.root.updateMatrixWorld(true);if(before.distanceTo(mesh.getVertexPosition(0,new T.Vector3()).applyMatrix4(mesh.matrixWorld))<1e-5)throw Error(`${id} shell stopped moving`);}
 if(!continuousShell.has(id))for(const name of ['ArmLeft','ArmRight']){const node=rig.nodes[name],samples:{m:T.Mesh;i:number;p:T.Vector3}[]=[];rig.root.updateMatrixWorld(true);node.traverse(m=>{if(m instanceof T.Mesh)for(let i=0;i<m.geometry.getAttribute('position').count;i++)samples.push({m,i,p:m.getVertexPosition(i,new T.Vector3()).applyMatrix4(m.matrixWorld)});});node.rotation.z=.3;rig.root.updateMatrixWorld(true);if(!samples.some(({m,i,p})=>p.distanceTo(m.getVertexPosition(i,new T.Vector3()).applyMatrix4(m.matrixWorld))>.03))throw Error(`${id} ${name} stopped moving`);node.rotation.z=0;rig.root.updateMatrixWorld(true);}
 console.log(JSON.stringify({id,...metrics,baseFollowsBody:true,continuousShell:continuousShell.has(id)}));assembly.dispose();}
