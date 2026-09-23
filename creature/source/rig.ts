import * as T from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {EYE_LAYOUTS} from './creator/eye-layouts';
import {eyePosition} from './creator/anatomy';
import type {Design} from './creator/design';

export function disposeObject(root:T.Object3D){const geometries=new Set<T.BufferGeometry>(),materials=new Set<T.Material>();root.traverse(o=>{if(o instanceof T.Mesh){geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}

// The source arms and feet contain both sides in one mesh. Partition complete
// triangles at the empty center gap, preserving the creator's world coordinates.
function bake(mesh:T.Mesh,side=0){
 const input=mesh.geometry.clone();input.applyMatrix4(mesh.matrixWorld);
 if(!input.getAttribute('normal'))input.computeVertexNormals();
 // A flipX mirror (negative-scale ancestor, e.g. assemble.ts's facing correction) reverses handedness:
 // applyMatrix4 above already re-orients the normal attribute correctly, but triangle winding order is
 // a vertex-index property it can't touch, so front/back-face culling would go inside-out unless the
 // winding is reversed here too (swap the last two vertices of every triangle).
 const mirrored=mesh.matrixWorld.determinant()<0;
 const pos=input.getAttribute('position'),normal=input.getAttribute('normal'),color=input.getAttribute('color'),uv=input.getAttribute('uv');
 const p:number[]=[],n:number[]=[],c:number[]=[],tex:number[]=[],indices:number[]=[],remap=new Map<number,number>();
 const count=input.index?.count??pos.count,vertex=(i:number)=>input.index?input.index.getX(i):i;
 for(let i=0;i<count;i+=3){const triangle=[vertex(i),vertex(i+1),vertex(i+2)],x=triangle.reduce((sum,j)=>sum+pos.getX(j),0)/3;if(side&&((side<0&&x>=0)||(side>0&&x<0)))continue;
  if(mirrored)[triangle[1],triangle[2]]=[triangle[2],triangle[1]];
  for(const j of triangle){if(!remap.has(j)){remap.set(j,p.length/3);p.push(pos.getX(j),pos.getY(j),pos.getZ(j));n.push(normal.getX(j),normal.getY(j),normal.getZ(j));c.push(color?color.getX(j):1,color?color.getY(j):1,color?color.getZ(j):1);tex.push(uv?uv.getX(j):0,uv?uv.getY(j):0);}indices.push(remap.get(j)!);}
 }
 input.dispose();if(!p.length)return null;
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(p,3));geometry.setAttribute('normal',new T.Float32BufferAttribute(n,3));geometry.setAttribute('color',new T.Float32BufferAttribute(c,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(tex,2));geometry.setIndex(indices);return geometry;
}

export function createRig(source:T.Group,recipe:Design){
 const root=new T.Group();root.name='MYR5';root.userData={rigVersion:1,recipe:JSON.parse(JSON.stringify(recipe))};
 const nodes:Record<string,T.Group>={};
 function pivot(name:string,position:number[],parent=root){const node=new T.Group();node.name=name;node.position.fromArray(position);parent.add(node);nodes[name]=node;return node;}
 const fitted=source.userData.pivots as {body:number[];head:number[];arm:number[];foot:number[]}|null|undefined;
 const P=fitted??{body:[0,.8,0],head:[0,.75,0],arm:[.55,.48,0],foot:[.35,.35,0]};
 const body=pivot('BodyMotion',P.body);
 const head=pivot('HeadMotion',P.head,body);
 pivot('ArmLeft',[-P.arm[0],P.arm[1],P.arm[2]],body);pivot('ArmRight',P.arm,body);
 pivot('FootLeft',[-P.foot[0],P.foot[1],P.foot[2]]);pivot('FootRight',P.foot);
 const eyes=EYE_LAYOUTS[recipe.eyeLayout].eyes;
 const eyeOffset=(source.userData.eyeOffset as T.Vector3|undefined)??new T.Vector3();
 const eyeScale=(source.userData.eyeScale as number|undefined)??1,headY=P.body[1]+P.head[1];
 eyes.forEach((eye,i)=>{const [x,y,z]=eyePosition(eye,eyeOffset,eyeScale,source.userData.eyeSurfaceZ as number|undefined);pivot('EyeBlink'+i,[x,y-headY,z],head);});
 root.updateMatrixWorld(true);source.updateMatrixWorld(true);
 const buckets=new Map<string,{node:T.Group;material:T.MeshStandardMaterial;geometries:T.BufferGeometry[]}>();
 function add(mesh:T.Mesh,node:T.Group,side=0){
  if(Array.isArray(mesh.material))throw Error('This MYR5 mesh uses an unsupported material layout.');
  const geometry=bake(mesh,side);if(!geometry)return;
  geometry.applyMatrix4(node.matrixWorld.clone().invert());
  const mat=mesh.material as T.MeshStandardMaterial;
  const physical=mat as T.MeshPhysicalMaterial;
  const key=node.name+JSON.stringify([mat.type,mat.color.getHex(),mat.emissive.getHex(),mat.emissiveIntensity,mat.roughness,mat.metalness,mat.opacity,mat.side,mat.map?.uuid,mat.normalMap?.uuid,mat.bumpMap?.uuid,mat.roughnessMap?.uuid,mat.emissiveMap?.uuid,mat.bumpScale,physical.transmission,physical.thickness,physical.ior,physical.clearcoat,physical.sheen,mat.userData.installedSkinId?mat.uuid:null]);
  if(!buckets.has(key)){const material=mat.clone();material.vertexColors=true;material.userData={};if(mat.userData.installedSkinId){material.onBeforeCompile=mat.onBeforeCompile;material.customProgramCacheKey=mat.customProgramCacheKey;material.userData.installedSkinId=mat.userData.installedSkinId;material.userData.normalConvention=mat.userData.normalConvention;}buckets.set(key,{node,material,geometries:[]});}
  buckets.get(key)!.geometries.push(geometry);
 }
 function visit(obj:T.Object3D,region:string,eyeIndex=0){
  if(!obj.visible)return;
  if(/^Eye [1-8]$/.test(obj.name))eyeIndex=Number(obj.name.split(' ')[1])-1;
  if(obj instanceof T.Mesh){
   if(region==='arms'){add(obj,nodes.ArmLeft,-1);add(obj,nodes.ArmRight,1);}
   else if(region==='feet'){add(obj,nodes.FootLeft,-1);add(obj,nodes.FootRight,1);}
   else add(obj,region==='eye'?nodes['EyeBlink'+eyeIndex]:region==='head'?head:body);
  }
  for(const child of obj.children)visit(child,region,eyeIndex);
 }
 for(const part of source.children){if(part.name==='Style ornaments'){for(const detail of part.children)visit(detail,detail.userData.region);}else visit(part,part.name);}
 for(const {node,material,geometries} of buckets.values()){
  const combined=mergeGeometries(geometries,false);geometries.forEach(g=>g.dispose());if(!combined)throw Error('Could not assemble this creature.');
  combined.computeBoundingSphere();const mesh=new T.Mesh(combined,material);mesh.name=node.name+'Surface';node.add(mesh);
 }
 const rest=Object.fromEntries(Object.entries(nodes).map(([name,node])=>[name,{position:node.position.clone(),scale:node.scale.clone(),quaternion:node.quaternion.clone()}]));
 return {root,nodes,rest,recipe};
}
export type CreatureRig=ReturnType<typeof createRig>;
