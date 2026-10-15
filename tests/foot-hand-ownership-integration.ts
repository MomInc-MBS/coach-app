import * as T from 'three';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import {correctFootHandOwnership} from '../creature/source/creator/assemble';

const expected:Record<string,number>={
 'roster/02-taper-tallstalk--3d_humanoid_figure':1069,
 'roster/03-pearl-orb-ring--stylized_3d_character1':124,
 'roster/08-shard-asym--fantasy_creature_3d_model2':725,
 'roster/09-monolith-tanka--3d_robot_model':360,
 'roster/09-monolith-tanka--white_horned_robot_3d_model':925,
 'roster/16-spade-arch--pyramid_head_figure_3d_model':82,
};
(globalThis as any).createImageBitmap=async()=>({width:1,height:1,close(){}});(globalThis as any).self=globalThis;
await MeshoptDecoder.ready;
const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
function triangleCount(root:T.Object3D){let count=0;root.traverse(o=>{if(o instanceof T.Mesh)count+=(o.geometry.index?.count??o.geometry.getAttribute('position').count)/3;});return count;}
function worldTriangleHash(root:T.Object3D){root.updateMatrixWorld(true);const rows:string[]=[];root.traverse(o=>{if(!(o instanceof T.Mesh))return;const g=o.geometry,index=g.index,count=index?.count??g.getAttribute('position').count;for(let i=0;i+2<count;i+=3){const tri=[];for(let j=0;j<3;j++){const vertex=index?index.getX(i+j):i+j,world=new T.Vector3().fromBufferAttribute(g.getAttribute('position'),vertex).applyMatrix4(o.matrixWorld).toArray().map(v=>Math.round(v*1e3)/1e3);tri.push(world);}tri.sort((a,b)=>a.join(',').localeCompare(b.join(',')));rows.push(JSON.stringify(tri));}});rows.sort();return createHash('sha256').update(rows.join('\n')).digest('hex');}
const rows:any[]=[];
for(const [id,expectedMoved]of Object.entries(expected)){
 const bytes=readFileSync(fileURLToPath(new URL(`../creature/models/${id}.glb`,import.meta.url))),scene=(await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'')).scene;
 const arms=scene.getObjectByName('arms')!,feet=scene.getObjectByName('feet')!,before=triangleCount(scene),beforeHash=worldTriangleHash(scene),beforeArms=triangleCount(arms),beforeFeet=triangleCount(feet);
 const moved=correctFootHandOwnership(scene,id);scene.updateMatrixWorld(true);const after=triangleCount(scene),afterArms=triangleCount(arms),afterFeet=triangleCount(feet),afterHash=worldTriangleHash(scene);
 if(moved!==expectedMoved||after!==before||afterHash!==beforeHash||afterArms!==beforeArms+expectedMoved||afterFeet!==beforeFeet-expectedMoved)throw Error(JSON.stringify({id,moved,expectedMoved,before,after,beforeArms,afterArms,beforeFeet,afterFeet,worldTrianglesPreserved:afterHash===beforeHash}));
 rows.push({id,moved,triangleCountConserved:after===before,worldTrianglesConserved:afterHash===beforeHash,armDelta:afterArms-beforeArms,feetDelta:afterFeet-beforeFeet});
 scene.traverse(o=>{if(o instanceof T.Mesh)o.geometry.dispose();});
}
console.log(JSON.stringify(rows));
