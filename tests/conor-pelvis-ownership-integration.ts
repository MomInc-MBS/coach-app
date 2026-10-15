import * as T from 'three';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import {assembleCreature,repairRosterSource} from '../creature/source/creator/assemble';
import {createRig} from '../creature/source/rig';
import {correctConorPelvisOwnership} from '../creature/source/conor-pelvis-ownership';
import {fresh} from '../creature/source/creator/design';

const id='roster/05-slope-bobble--clay_humanoid_figure_3d_model';
(globalThis as any).createImageBitmap=async()=>({width:1,height:1,close(){}});(globalThis as any).self=globalThis;
await MeshoptDecoder.ready;
const nativeFetch=globalThis.fetch;
globalThis.fetch=async(input:any)=>{const url=String(input),modelPath=url.startsWith('http://audit/creature/models/')?url.slice('http://audit/creature/models/'.length):'';if(modelPath.endsWith('.glb'))return new Response(readFileSync(fileURLToPath(new URL(`../creature/models/${modelPath}`,import.meta.url))));return nativeFetch(input);};
const rawBytes=readFileSync(fileURLToPath(new URL(`../creature/models/${id}.glb`,import.meta.url)));
const loadRaw=async()=>{const data=rawBytes.buffer.slice(rawBytes.byteOffset,rawBytes.byteOffset+rawBytes.byteLength);return(await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(data,'')).scene;};
const triangles=(node:T.Object3D)=>{let n=0;node.traverse(o=>{if(o instanceof T.Mesh)n+=(o.geometry.index?.count??o.geometry.getAttribute('position').count)/3;});return n;};
const raw=await loadRaw(),sourceCount=triangles(raw),repairReport=repairRosterSource(raw,id),candidate=Number((repairReport as any).conorPelvisTriangles),secondCall=correctConorPelvisOwnership(raw,id),afterCount=triangles(raw);
if(!candidate||sourceCount!==afterCount||secondCall!==0)throw Error(JSON.stringify({sourceCount,afterCount,candidate,secondCall,repairReport}));
let tagged=0;raw.getObjectByName('body')!.traverse(o=>{if(o instanceof T.Mesh)tagged+=Number(o.userData.conorRecoveredPelvisTriangles)||0;});if(tagged!==candidate)throw Error(`Transferred bowl count ${candidate} does not match body-tagged count ${tagged}`);
const recipe={...fresh(),body:id,headFrom:id,armsFrom:id,feetFrom:id},assembly=await assembleCreature(recipe,'http://audit/creature/'),rig=createRig(assembly.root,recipe);rig.root.updateMatrixWorld(true);
let bodyProbe:T.Mesh|undefined,bodyVertex=-1,bestY=Infinity;
rig.nodes.BodyMotion.traverse(o=>{if(!(o instanceof T.Mesh))return;const p=o.geometry.getAttribute('position');for(let i=0;i<p.count;i++){const world=o.getVertexPosition(i,new T.Vector3()).applyMatrix4(o.matrixWorld);if(world.y>.72&&world.y<1.14&&Math.abs(world.x)<.68&&world.y<bestY){bodyProbe=o;bodyVertex=i;bestY=world.y;}}});
if(!bodyProbe)throw Error('No lower-bowl torso surface remains owned by BodyMotion');
const bodyPosition=()=>bodyProbe!.getVertexPosition(bodyVertex,new T.Vector3()).applyMatrix4(bodyProbe!.matrixWorld),beforeBody=bodyPosition(),bodyDrift:number[]=[];
for(const name of ['FootLeft','FootRight'] as const){rig.nodes[name].rotation.x=.3;rig.root.updateMatrixWorld(true);bodyDrift.push(beforeBody.distanceTo(bodyPosition()));rig.nodes[name].rotation.x=0;rig.root.updateMatrixWorld(true);}
if(bodyDrift.some(d=>d>.001))throw Error(`Pelvis body point moved with a foot: ${bodyDrift}`);
const footMovement:Record<string,number>={};
for(const name of ['FootLeft','FootRight'] as const){let picked:T.Mesh|undefined,vertex=-1,best=-1;rig.nodes[name].traverse(o=>{if(!(o instanceof T.Mesh))return;const p=o.geometry.getAttribute('position');for(let i=0;i<p.count;i++){const world=o.getVertexPosition(i,new T.Vector3()).applyMatrix4(o.matrixWorld),d=world.distanceTo(rig.nodes[name].getWorldPosition(new T.Vector3()));if(d>best){best=d;picked=o;vertex=i;}}});if(!picked)throw Error(`${name} has no limb surface`);const before=picked.getVertexPosition(vertex,new T.Vector3()).applyMatrix4(picked.matrixWorld);rig.nodes[name].rotation.x=.3;rig.root.updateMatrixWorld(true);const after=picked.getVertexPosition(vertex,new T.Vector3()).applyMatrix4(picked.matrixWorld);footMovement[name]=before.distanceTo(after);rig.nodes[name].rotation.x=0;rig.root.updateMatrixWorld(true);if(footMovement[name]<.05)throw Error(`${name} leg does not move with its foot pivot`);}
console.log(JSON.stringify({id,trianglesConserved:true,transferredPelvisTriangles:candidate,bodyPointY:bestY,bodyDriftDuringFootRotation:bodyDrift,footMovement}));assembly.dispose();
