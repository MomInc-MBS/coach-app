import * as T from 'three';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {assembleCreature} from '../creature/source/creator/assemble';
import {createRig,disposeObject} from '../creature/source/rig';
import {fresh} from '../creature/source/creator/design';

const id='roster/19-genie-multi--multi-armed_humanoid_3d_model1';
(globalThis as any).createImageBitmap=async()=>({width:1,height:1,close(){}});(globalThis as any).self=globalThis;
const nativeFetch=globalThis.fetch;
globalThis.fetch=async(input:any)=>String(input).startsWith('http://audit/creature/models/')?new Response(readFileSync(fileURLToPath(new URL(`../creature/models/${String(input).split('/models/')[1]}`,import.meta.url)))):nativeFetch(input);
const recipe={...fresh(),body:id,headFrom:id,armsFrom:id,feetFrom:id},assembly=await assembleCreature(recipe,'http://audit/creature/');
let recovered=0;assembly.root.traverse(o=>{recovered+=Number(o.userData.recoveredArmFootTriangles)||0;});
if(recovered!==1597)throw Error(`Expected both grounded arm-cut legs (1597 triangles), got ${recovered}`);
const rig=createRig(assembly.root,recipe),movingFeet:any={};rig.root.updateMatrixWorld(true);
for(const name of ['FootLeft','FootRight']){const node=rig.nodes[name];let mesh:T.Mesh|undefined,vertex=-1,rest=new T.Vector3();
 node.traverse(o=>{if(!(o instanceof T.Mesh)||mesh)return;const p=o.geometry.getAttribute('position');for(let i=0;i<p.count;i++){const v=o.getVertexPosition(i,new T.Vector3()).applyMatrix4(o.matrixWorld);if(v.y<.25&&Math.abs(v.x)>.35){mesh=o;vertex=i;rest.copy(v);break;}}});
 if(!mesh)throw Error(`${name} lost its ground-level toe surface`);node.rotation.x=.45;rig.root.updateMatrixWorld(true);const posed=mesh.getVertexPosition(vertex,new T.Vector3()).applyMatrix4(mesh.matrixWorld);if(rest.distanceTo(posed)<.05)throw Error(`${name} toe skin did not move`);movingFeet[name]=true;node.rotation.x=0;rig.root.updateMatrixWorld(true);
}
console.log(JSON.stringify({id,recoveredGroundedLegTriangles:recovered,movingFeet}));disposeObject(rig.root);assembly.dispose();
