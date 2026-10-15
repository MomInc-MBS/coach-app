import * as THREE from 'three';
import { triangleSubset } from './limb-ownership';

const CONOR_PELVIS_SOURCE='roster/05-slope-bobble--clay_humanoid_figure_3d_model';
const WAIST_Y=.715;
const WAIST_HALF_WIDTH=.68;

/** Move the central lower torso bowl out of Conor's feet cut while leaving both leg tubes intact. */
export function correctConorPelvisOwnership(source:THREE.Group,sourceId:string):number{
 if(sourceId!==CONOR_PELVIS_SOURCE)return 0;
 source.updateWorldMatrix(true,true);
 const body=source.getObjectByName('body'),feet=source.getObjectByName('feet');
 if(!body||!feet)return 0;
 let bodyMaterial:THREE.Material|undefined;
 body.traverse(o=>{if(!bodyMaterial&&o instanceof THREE.Mesh&&o.visible&&!Array.isArray(o.material))bodyMaterial=o.material;});
 if(!bodyMaterial)return 0;
 const intoBody=body.matrixWorld.clone().invert();
 const meshes:THREE.Mesh[]=[];feet.traverse(o=>{if(o instanceof THREE.Mesh&&o.visible&&!Array.isArray(o.material))meshes.push(o);});
 let moved=0;
 for(const mesh of meshes){
  const geometry=mesh.geometry,position=geometry.getAttribute('position'),index=geometry.index,selected=new Set<number>();
  const meshToWorld=mesh.matrixWorld;
  const triangleCount=index?index.count/3:position.count/3;
  for(let face=0;face<triangleCount;face++){
   let x=0,y=0;
   for(let k=0;k<3;k++){
    const vertex=index?index.getX(face*3+k):face*3+k;
    const p=new THREE.Vector3().fromBufferAttribute(position,vertex).applyMatrix4(meshToWorld);
    x+=p.x/3;y+=p.y/3;
   }
   if(y>=WAIST_Y&&Math.abs(x)<WAIST_HALF_WIDTH)selected.add(face);
  }
  if(!selected.size)continue;
  const bodyPart=triangleSubset(geometry,face=>selected.has(face)),remainder=triangleSubset(geometry,face=>!selected.has(face));
  if(!bodyPart)continue;
  bodyPart.applyMatrix4(intoBody.clone().multiply(meshToWorld));
  moved+=selected.size;
  if(remainder){mesh.geometry=remainder;geometry.dispose();}else{mesh.removeFromParent();geometry.dispose();}
  const recovered=new THREE.Mesh(bodyPart,bodyMaterial);
  recovered.name='Conor recovered central pelvis';
  recovered.userData.region='body';
  recovered.userData.conorRecoveredPelvisTriangles=selected.size;
  body.add(recovered);
 }
 source.updateWorldMatrix(true,true);
 source.userData.conorRecoveredPelvisTriangles=moved;
 return moved;
}
