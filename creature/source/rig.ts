import * as T from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {EYE_LAYOUTS} from './creator/eye-layouts';
import {eyePosition} from './creator/anatomy';
import type {Design} from './creator/design';

export function disposeObject(root:T.Object3D){const geometries=new Set<T.BufferGeometry>(),materials=new Set<T.Material>();root.traverse(o=>{if(o instanceof T.SkinnedMesh)o.skeleton.dispose();if(o instanceof T.Mesh){geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}

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
 // Rigid parts opened a gap wherever they met the body (neck, ankles) as soon as they turned. The head and
 // feet are skinned to BodyMotion instead: a vertex's share of its own part grows with its distance from the
 // body's surface, so the seam stays welded to the body and the joint bends rather than separating.
 root.updateMatrixWorld(true);
 const meshes=(node:T.Object3D)=>node.children.filter((o):o is T.Mesh=>o instanceof T.Mesh);
 const boxOf=(node:T.Object3D)=>{const b=new T.Box3();for(const m of meshes(node))b.expandByObject(m);return b;};
 // Distance to the body's surface on a voxel grid around `near` (two-pass chamfer transform), Infinity outside it.
 function bodyDistance(near:T.Box3,touch:number,reach:number){
  const zone=near.clone().expandByScalar(reach),size=zone.getSize(new T.Vector3()),voxel=Math.max(touch/2,Math.cbrt(size.x*size.y*size.z/4e5)),o=zone.min.clone().subScalar(voxel);
  // One empty voxel of padding on every side lets the sweeps skip bounds checks.
  const nx=Math.ceil(size.x/voxel)+3,ny=Math.ceil(size.y/voxel)+3,nz=Math.ceil(size.z/voxel)+3,field=new Float32Array(nx*ny*nz).fill(Infinity),at=(x:number,y:number,z:number)=>(x*ny+y)*nz+z;
  const t=new T.Box3(),c=[new T.Vector3(),new T.Vector3(),new T.Vector3()],q=new T.Vector3();
  for(const mesh of meshes(body)){const p=mesh.geometry.getAttribute('position'),index=mesh.geometry.index,n=index?index.count:p.count;
   for(let i=0;i<n;i+=3){for(let j=0;j<3;j++)c[j].fromBufferAttribute(p,index?index.getX(i+j):i+j).applyMatrix4(mesh.matrixWorld);if(!t.setFromPoints(c).intersectsBox(zone))continue;
    const k=Math.ceil(Math.max(c[0].distanceTo(c[1]),c[1].distanceTo(c[2]),c[2].distanceTo(c[0]))/voxel);
    for(let u=0;u<=k;u++)for(let w=0;u+w<=k;w++){q.copy(c[0]).multiplyScalar(1-(u+w)/k).addScaledVector(c[1],u/k).addScaledVector(c[2],w/k).sub(o).divideScalar(voxel).round();if(q.x>0&&q.y>0&&q.z>0&&q.x<nx-1&&q.y<ny-1&&q.z<nz-1)field[at(q.x,q.y,q.z)]=0;}}}
  const step:number[]=[],cost:number[]=[];for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++)for(let z=-1;z<=1;z++)if(x<0||(x===0&&(y<0||(y===0&&z<0)))){step.push(at(x,y,z)-at(0,0,0));cost.push(Math.hypot(x,y,z));}
  for(const s of [1,-1])for(let x=s>0?1:nx-2;x>0&&x<nx-1;x+=s)for(let y=s>0?1:ny-2;y>0&&y<ny-1;y+=s)for(let z=s>0?1:nz-2;z>0&&z<nz-1;z+=s){const i=at(x,y,z);let best=field[i];
   for(let k=0;k<13;k++){const d=field[i+s*step[k]]+cost[k];if(d<best)best=d;}field[i]=best;}
  const lookup=(v:T.Vector3)=>{q.copy(v).sub(o).divideScalar(voxel).round();return q.x>=0&&q.y>=0&&q.z>=0&&q.x<nx&&q.y<ny&&q.z<nz?field[at(q.x,q.y,q.z)]*voxel:Infinity;};
  return {lookup,voxel};
 }
 // Weld `node` to the body: within `touch` of the body a vertex follows BodyMotion, by `touch+band` it
 // follows its own pivot. With movePivot the pivot moves onto the seam (the true joint). Parts that don't
 // meet the body stay rigid.
 function glue(node:T.Group,touch:number,band:number,movePivot=false){
  const box=boxOf(node),parts=meshes(node);if(box.isEmpty())return;
  const {lookup:distance,voxel}=bodyDistance(box,touch,touch+band),v=new T.Vector3(),seam=new T.Vector3();let count=0;
  // A coarse grid (very large parts) widens the welded band so voxel rounding never loosens the seam.
  touch=Math.max(touch,2*voxel);const reach=touch+band;
  const distances=parts.map(mesh=>{const p=mesh.geometry.getAttribute('position'),d=new Float32Array(p.count);for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld);d[i]=distance(v);if(d[i]<touch){seam.add(v);count++;}}return d;});
  if(!count)return;
  if(movePivot){const shift=seam.divideScalar(count).sub(node.getWorldPosition(v));node.position.add(shift);for(const child of node.children)if(child instanceof T.Mesh)child.geometry.translate(-shift.x,-shift.y,-shift.z);else child.position.sub(shift);root.updateMatrixWorld(true);}
  parts.forEach((mesh,j)=>{const g=mesh.geometry,d=distances[j],index=new Uint16Array(d.length*4),w=new Float32Array(d.length*4);
   for(let i=0;i<d.length;i++){const own=T.MathUtils.smoothstep(d[i],touch,reach);index[i*4+1]=1;w[i*4]=1-own;w[i*4+1]=own;}
   g.setAttribute('skinIndex',new T.Uint16BufferAttribute(index,4));g.setAttribute('skinWeight',new T.Float32BufferAttribute(w,4));g.computeBoundingSphere();
   const skinned=new T.SkinnedMesh(g,mesh.material);skinned.name=mesh.name;node.remove(mesh);node.add(skinned);skinned.bind(new T.Skeleton([body,node] as unknown as T.Bone[]));});
 }
 const headBox=boxOf(head),headH=headBox.max.y-headBox.min.y,eyeY=Math.min(...Object.keys(nodes).filter(n=>n.startsWith('EyeBlink')).map(n=>nodes[n].getWorldPosition(new T.Vector3()).y));
 // The neck blends in below the eyes (they ride the head rigidly), over at most 30% of the head.
 glue(head,.06*Math.max(headH,headBox.max.x-headBox.min.x),T.MathUtils.clamp(.6*(eyeY-headBox.min.y),.12*headH,.3*headH),true);
 // A foot's scale is its largest side: a leg's length, a flat foot's length.
 for(const foot of [nodes.FootLeft,nodes.FootRight]){const size=boxOf(foot).getSize(new T.Vector3()),h=Math.max(size.x,size.y,size.z);glue(foot,.15*h,.5*h);}
 const rest=Object.fromEntries(Object.entries(nodes).map(([name,node])=>[name,{position:node.position.clone(),scale:node.scale.clone(),quaternion:node.quaternion.clone()}]));
 return {root,nodes,rest,recipe};
}
export type CreatureRig=ReturnType<typeof createRig>;
