import * as T from 'three';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {assembleCreature} from '../creature/source/creator/assemble';
import {createRig} from '../creature/source/rig';
import {fresh} from '../creature/source/creator/design';

const id='roster/07-bulb-sphereling--humanoid_robot_3d_model';
(globalThis as any).createImageBitmap=async()=>({width:1,height:1,close(){}});(globalThis as any).self=globalThis;
const nativeFetch=globalThis.fetch;globalThis.fetch=async(input:any)=>String(input).startsWith('http://audit/creature/models/')?new Response(readFileSync(fileURLToPath(new URL(`../creature/models/${String(input).split('/models/')[1]}`,import.meta.url)))):nativeFetch(input);
const recipe={...fresh(),body:id,headFrom:id,armsFrom:id,feetFrom:id},assembly=await assembleCreature(recipe,'http://audit/creature/'),rig=createRig(assembly.root,recipe);
const triangles=(node:T.Object3D)=>{let count=0;node.traverse(o=>{if(o instanceof T.Mesh)count+=(o.geometry.index?.count??o.geometry.getAttribute('position').count)/3;});return count;};
let regionRecovered=0;assembly.root.traverse(o=>{regionRecovered+=Number(o.userData.recoveredFootHandTriangles)||0;});const moving:Record<string,boolean>={};rig.root.updateMatrixWorld(true);
for(const name of ['ArmLeft','ArmRight'] as const){const node=rig.nodes[name];let mesh:T.Mesh|undefined,index=-1,rest=new T.Vector3();node.traverse(o=>{if(!(o instanceof T.Mesh)||mesh)return;const p=o.geometry.getAttribute('position');for(let i=0;i<p.count;i++){const v=o.getVertexPosition(i,new T.Vector3()).applyMatrix4(o.matrixWorld);if(v.y>.65&&v.y<1.25&&Math.abs(v.x)>.35){mesh=o;index=i;rest.copy(v);break;}}});
 if(!mesh)throw Error(`${name} is missing its hip-level hand surface (${JSON.stringify({regionRecovered,armTriangles:triangles(node)})})`);node.rotation.z+=name==='ArmRight'?.22:-.22;rig.root.updateMatrixWorld(true);const posed=mesh.getVertexPosition(index,new T.Vector3()).applyMatrix4(mesh.matrixWorld);if(rest.distanceTo(posed)<.02)throw Error(`${name} hand surface does not follow the arm pivot`);moving[name]=true;node.rotation.z=0;rig.root.updateMatrixWorld(true);}
if(regionRecovered!==2620)throw Error(JSON.stringify({regionRecovered,moving}));
console.log(JSON.stringify({id,recoveredHandTriangles:regionRecovered,bothHandsFollowArms:moving}));assembly.dispose();
