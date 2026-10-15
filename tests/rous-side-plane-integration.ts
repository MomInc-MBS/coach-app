import * as T from 'three';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {assembleCreature} from '../creature/source/creator/assemble';
import {createRig} from '../creature/source/rig';
import {connectedTriangleComponents} from '../creature/source/limb-ownership';
import {inferGroundedSidePlaneX} from '../creature/source/rig';
import {correctRousArmOwnership} from '../creature/source/rous-ownership';
import {fresh} from '../creature/source/creator/design';

const rous='roster/09-monolith-tanka--robot_3d_model2',otherFeet='roster/09-monolith-tanka--3d_robot_model';
(globalThis as any).createImageBitmap=async()=>({width:1,height:1,close(){}});(globalThis as any).self=globalThis;
const nativeFetch=globalThis.fetch;
globalThis.fetch=async(input:any)=>{const url=String(input),modelPath=url.startsWith('http://audit/creature/models/')?url.slice('http://audit/creature/models/'.length):'';if(modelPath.endsWith('.glb'))return new Response(readFileSync(fileURLToPath(new URL(`../creature/models/${modelPath}`,import.meta.url))));return nativeFetch(input);};
const recipe={...fresh(),body:'myr5',headFrom:'myr5',armsFrom:rous,feetFrom:otherFeet};
const sourceBytes=readFileSync(fileURLToPath(new URL(`../creature/models/${rous}.glb`,import.meta.url))),{GLTFLoader}=await import('three/examples/jsm/loaders/GLTFLoader.js'),{MeshoptDecoder}=await import('three/examples/jsm/libs/meshopt_decoder.module.js');await MeshoptDecoder.ready;
const source=(await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(sourceBytes.buffer.slice(sourceBytes.byteOffset,sourceBytes.byteOffset+sourceBytes.byteLength),'')).scene;
source.updateWorldMatrix(true,true);const sourceArms=source.getObjectByName('arms')!,armBox=new T.Box3().setFromObject(sourceArms),sourceFeet=source.getObjectByName('feet')!,components:{triangles:number;x:number}[]=[];
sourceArms.traverse(object=>{if(!(object instanceof T.Mesh)||!object.visible)return;const position=object.geometry.getAttribute('position'),index=object.geometry.index;for(const component of connectedTriangleComponents(object)){let x=0,y=0,z=0,n=0,min=new T.Vector3(Infinity,Infinity,Infinity),max=new T.Vector3(-Infinity,-Infinity,-Infinity);for(const face of component)for(let k=0;k<3;k++){const vertex=index?index.getX(face*3+k):face*3+k,p=new T.Vector3().fromBufferAttribute(position,vertex).applyMatrix4(object.matrixWorld);x+=p.x;y+=p.y;z+=p.z;min.min(p);max.max(p);n++;}if(n)components.push({triangles:component.length,x:x/n,y:y/n,z:z/n,minX:min.x,maxX:max.x,minY:min.y,maxY:max.y,minZ:min.z,maxZ:max.z});}});
components.sort((a,b)=>b.triangles-a.triangles);if(components.length<2)throw Error('Rous arm source does not have two major connected components');
const rawPlane=inferGroundedSidePlaneX(sourceFeet),rawPlanePoint=new T.Vector3(rawPlane,armBox.getCenter(new T.Vector3()).y,armBox.getCenter(new T.Vector3()).z),planeInArms=sourceArms.worldToLocal(rawPlanePoint.clone());
const sourceTriangleCount=()=>{let n=0;for(const region of ['body','arms','feet'])source.getObjectByName(region)!.traverse(o=>{if(o instanceof T.Mesh)n+=(o.geometry.index?.count??o.geometry.getAttribute('position').count)/3;});return n;};const beforeOwnership=sourceTriangleCount(),recoveredOwnership=correctRousArmOwnership(source,rous),afterOwnership=sourceTriangleCount(),extracted=(source.userData.rousExtractedFromArms??{}) as {body:number;feet:number},destination={body:0,feet:0};for(const region of ['body','feet'] as const)source.getObjectByName(region)!.traverse(o=>{if(o instanceof T.Mesh&&o.userData.rousRecoveredFromArms===region)destination[region]+=(o.geometry.index?.count??o.geometry.getAttribute('position').count)/3;});if(beforeOwnership!==afterOwnership||recoveredOwnership!==2188||extracted.body!==28||extracted.feet!==187||destination.body!==28||destination.feet!==187)throw Error(JSON.stringify({beforeOwnership,afterOwnership,recoveredOwnership,extracted,destination}));
async function verifyAssembly(recipe:any){
 const assembly=await assembleCreature(recipe,'http://audit/creature/'),actual=(assembly.root.userData.limbSidePlanes as any)?.arms,armsRegion=assembly.root.getObjectByName('arms')!,transformedSourceArms=armsRegion.children.find(o=>o.name==='arms')!;
 assembly.root.updateMatrixWorld(true);const expectedPlane=transformedSourceArms.localToWorld(planeInArms.clone()).x;
 if(!Number.isFinite(actual)||Math.abs(actual-expectedPlane)>.001)throw Error(JSON.stringify({rawPlane,expectedPlane,actual}));
 const rig=createRig(assembly.root,recipe),count=(name:string)=>{let n=0;rig.nodes[name].traverse(o=>{if(o instanceof T.Mesh)n+=(o.geometry.index?.count??o.geometry.getAttribute('position').count)/3;});return n;};
 let sourceArmTriangles=0;armsRegion.traverse(o=>{if(o instanceof T.Mesh)sourceArmTriangles+=(o.geometry.index?.count??o.geometry.getAttribute('position').count)/3;});
 const recovered:{body:number;feet:number}={body:0,feet:0};armsRegion.traverse(o=>{if(!(o instanceof T.Mesh))return;const origin=o.userData.rousRecoveredArmSource as 'body'|'feet'|undefined;if(origin)recovered[origin]+=(o.geometry.index?.count??o.geometry.getAttribute('position').count)/3;});if(!recovered.body||!recovered.feet)throw Error(`Rous left arm fragments were not recovered from both body and feet cuts: ${JSON.stringify(recovered)}`);
 const arms={leftTriangles:count('ArmLeft'),rightTriangles:count('ArmRight')};if(arms.leftTriangles+arms.rightTriangles!==sourceArmTriangles||!arms.leftTriangles||!arms.rightTriangles)throw Error(JSON.stringify({actual,arms,sourceArmTriangles}));
 rig.root.updateMatrixWorld(true);
 function movableVertex(name:string){let picked:T.Mesh|undefined,vertex=-1,before=new T.Vector3(),farthest=-1;const node=rig.nodes[name],pivot=node.getWorldPosition(new T.Vector3());node.traverse(o=>{if(!(o instanceof T.Mesh))return;const p=o.geometry.getAttribute('position');for(let i=0;i<p.count;i++){const world=o.getVertexPosition(i,new T.Vector3()).applyMatrix4(o.matrixWorld),distance=world.distanceToSquared(pivot);if(distance>farthest){picked=o;vertex=i;before.copy(world);farthest=distance;}}});if(!picked)throw Error(`${name} has no moving surface`);node.rotation.z=.2;rig.root.updateMatrixWorld(true);const after=picked.getVertexPosition(vertex,new T.Vector3()).applyMatrix4(picked.matrixWorld);node.rotation.z=0;rig.root.updateMatrixWorld(true);if(before.distanceTo(after)<.01)throw Error(`${name} source surface did not follow its rig node`);return before.toArray();}
 const leftPoint=movableVertex('ArmLeft'),rightPoint=movableVertex('ArmRight');assembly.dispose();return {actual,expectedPlane,sourceArmTriangles,recovered,arms,leftPoint,rightPoint};
}
const mixed=await verifyAssembly(recipe),single=await verifyAssembly({...fresh(),body:rous,headFrom:rous,armsFrom:rous,feetFrom:rous});
console.log(JSON.stringify({mixedArmsFrom:rous,feetFrom:otherFeet,rawPlane,components:components.slice(0,40),mixed,single}));
