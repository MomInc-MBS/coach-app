import * as T from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {EYE_LAYOUTS} from './creator/eye-layouts';
import {eyePosition} from './creator/anatomy';
import type {Design} from './creator/design';
import {connectedComponentSides,connectedTriangleComponents} from './limb-ownership';

const ROUS_SIDE_PLANE_SOURCE='roster/09-monolith-tanka--robot_3d_model2';

/** Infer the bilateral split from the two largest grounded connected components under a source feet group. */
export function inferGroundedSidePlaneX(footRegion:T.Object3D){
 footRegion.updateWorldMatrix(true,true);const footMeshes:T.Mesh[]=[];footRegion.traverse(o=>{if(o instanceof T.Mesh&&o.visible)footMeshes.push(o);});const footBox=new T.Box3();for(const mesh of footMeshes)footBox.expandByObject(mesh);const height=footBox.max.y-footBox.min.y;if(!Number.isFinite(height)||height<=0)return 0;
 const grounded:{triangles:number;centerX:number}[]=[];
 for(const mesh of footMeshes)for(const ids of connectedTriangleComponents(mesh)){
  const p=mesh.geometry.getAttribute('position'),index=mesh.geometry.index;let minY=Infinity,minX=Infinity,maxX=-Infinity;
  for(const triangle of ids)for(let k=0;k<3;k++){const v=new T.Vector3().fromBufferAttribute(p,index?index.getX(triangle*3+k):triangle*3+k).applyMatrix4(mesh.matrixWorld);minY=Math.min(minY,v.y);minX=Math.min(minX,v.x);maxX=Math.max(maxX,v.x);}
  if(minY>footBox.min.y+height*.1)continue;grounded.push({triangles:ids.length,centerX:(minX+maxX)/2});
 }
 grounded.sort((a,b)=>b.triangles-a.triangles);return grounded.length>=2?(grounded[0].centerX+grounded[1].centerX)/2:0;
}

export function disposeObject(root:T.Object3D){const geometries=new Set<T.BufferGeometry>(),materials=new Set<T.Material>();root.traverse(o=>{if(o instanceof T.SkinnedMesh)o.skeleton.dispose();if(o instanceof T.Mesh){geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}

// The source arms and feet contain both sides in one mesh. Partition complete
// triangles at the empty center gap, preserving the creator's world coordinates.
function bake(mesh:T.Mesh,side=0,pick?:(triangle:number)=>boolean,componentSides?:Int8Array,sidePlaneX=0){
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
 for(let i=0;i<count;i+=3){const triangleId=i/3;if(pick&&!pick(triangleId))continue;const triangle=[vertex(i),vertex(i+1),vertex(i+2)],x=triangle.reduce((sum,j)=>sum+pos.getX(j),0)/3,componentSide=componentSides?.[triangleId]??0,chosenSide=componentSide|| (x<sidePlaneX?-1:1);if(side&&chosenSide!==side)continue;
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
 // Assemblies preserve a plane fitted from the matching roster source. A direct source-model rig can
 // infer it from its own feet; never borrow another coach's feet for a mixed-source recipe.
 const fittedSidePlanes=source.userData.limbSidePlanes as Partial<Record<'arms'|'feet',number>>|undefined;
 const directFeetSidePlane=recipe.feetFrom===ROUS_SIDE_PLANE_SOURCE?inferGroundedSidePlaneX(source.getObjectByName('feet')??source):0;
 const sidePlaneX=(region:'arms'|'feet')=>Number.isFinite(fittedSidePlanes?.[region])?fittedSidePlanes![region]!:region==='feet'?directFeetSidePlane:recipe.feetFrom===ROUS_SIDE_PLANE_SOURCE?directFeetSidePlane:0;
 const buckets=new Map<string,{node:T.Group;material:T.MeshStandardMaterial;geometries:T.BufferGeometry[]}>();
 function add(mesh:T.Mesh,node:T.Group,side=0,pick?:(triangle:number)=>boolean,componentSides?:Int8Array,sidePlaneX=0){
  if(Array.isArray(mesh.material))throw Error('This MYR5 mesh uses an unsupported material layout.');
  const geometry=bake(mesh,side,pick,componentSides,sidePlaneX);if(!geometry)return;
  geometry.applyMatrix4(node.matrixWorld.clone().invert());
  const mat=mesh.material as T.MeshStandardMaterial;
  const physical=mat as T.MeshPhysicalMaterial;
  const key=node.name+JSON.stringify([mat.type,mat.color.getHex(),mat.emissive.getHex(),mat.emissiveIntensity,mat.roughness,mat.metalness,mat.opacity,mat.side,mat.map?.uuid,mat.normalMap?.uuid,mat.bumpMap?.uuid,mat.roughnessMap?.uuid,mat.emissiveMap?.uuid,mat.bumpScale,physical.transmission,physical.thickness,physical.ior,physical.clearcoat,physical.sheen,mat.userData.installedSkinId?mat.uuid:null]);
  if(!buckets.has(key)){const material=mat.clone();material.vertexColors=true;material.userData={};if(mat.userData.installedSkinId){material.onBeforeCompile=mat.onBeforeCompile;material.customProgramCacheKey=mat.customProgramCacheKey;material.userData.installedSkinId=mat.userData.installedSkinId;material.userData.normalConvention=mat.userData.normalConvention;}buckets.set(key,{node,material,geometries:[]});}
  buckets.get(key)!.geometries.push(geometry);
 }
 function visit(obj:T.Object3D,region:string,eyeIndex=0,sourceLimb=false){
  if(!obj.visible)return;
  if(/^Eye [1-8]$/.test(obj.name))eyeIndex=Number(obj.name.split(' ')[1])-1;
  if(obj instanceof T.Mesh){
   const explicitNode=sourceLimb&&typeof obj.userData.rigNodeName==='string'?nodes[obj.userData.rigNodeName]:undefined;
   if(explicitNode){
    explicitNode.userData.explicitSourceLimb=true;
    const localJoint=obj.userData.rigJointLocal;
    if(!explicitNode.userData.explicitJointSet&&Array.isArray(localJoint)&&localJoint.length===3&&localJoint.every(Number.isFinite)){
     const previousWorld=explicitNode.matrixWorld.clone();
     const joint=new T.Vector3().fromArray(localJoint).applyMatrix4(obj.matrixWorld);
     explicitNode.position.copy(explicitNode.parent!.worldToLocal(joint));explicitNode.updateWorldMatrix(true,true);explicitNode.userData.explicitJointSet=true;
     // A mixed recipe may have already supplied geometry to this motion node.
     // Changing its pivot must preserve those surfaces in their rest positions.
     const correction=explicitNode.matrixWorld.clone().invert().multiply(previousWorld);
     for(const bucket of buckets.values())if(bucket.node===explicitNode)for(const geometry of bucket.geometries)geometry.applyMatrix4(correction);
    }
    add(obj,explicitNode);
   }
   else if(region==='arms'){
    const sidePlane=recipe.armsFrom===ROUS_SIDE_PLANE_SOURCE?sidePlaneX('arms'):0,componentSides=recipe.armsFrom!=='myr5'&&sourceLimb?connectedComponentSides(obj,sidePlane):undefined;
    // Keep a fused center-crossing component animated: complete one-sided components
    // retain their component owner, while neutral triangles fall back to their own
    // centroid side inside bake (each face stays intact and no triangles are lost).
    if(componentSides){add(obj,nodes.ArmLeft,-1,i=>componentSides[i]===-1||componentSides[i]===0,componentSides,sidePlane);add(obj,nodes.ArmRight,1,i=>componentSides[i]===1||componentSides[i]===0,componentSides,sidePlane);}
    else{add(obj,nodes.ArmLeft,-1);add(obj,nodes.ArmRight,1);}
   }
   else if(region==='feet'){
    const sidePlane=recipe.feetFrom===ROUS_SIDE_PLANE_SOURCE?sidePlaneX('feet'):0,componentSides=recipe.feetFrom!=='myr5'&&sourceLimb?connectedComponentSides(obj,sidePlane):undefined;
    if(componentSides){add(obj,nodes.FootLeft,-1,i=>componentSides[i]===-1||componentSides[i]===0,componentSides,sidePlane);add(obj,nodes.FootRight,1,i=>componentSides[i]===1||componentSides[i]===0,componentSides,sidePlane);}
    else{add(obj,nodes.FootLeft,-1);add(obj,nodes.FootRight,1);}
   }
   else add(obj,region==='eye'?nodes['EyeBlink'+eyeIndex]:region==='head'?head:body);
  }
  for(const child of obj.children)visit(child,region,eyeIndex,sourceLimb);
 }
 for(const part of source.children){if(part.name==='Style ornaments'){for(const detail of part.children)visit(detail,detail.userData.region);}else visit(part,part.name,0,part.name==='arms'||part.name==='feet');}
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
 function surfaceDistance(anchor:T.Object3D,near:T.Box3,touch:number,reach:number){
  const zone=near.clone().expandByScalar(reach),size=zone.getSize(new T.Vector3()),voxel=Math.max(touch/2,Math.cbrt(size.x*size.y*size.z/4e5)),o=zone.min.clone().subScalar(voxel);
  // One empty voxel of padding on every side lets the sweeps skip bounds checks.
  const nx=Math.ceil(size.x/voxel)+3,ny=Math.ceil(size.y/voxel)+3,nz=Math.ceil(size.z/voxel)+3,field=new Float32Array(nx*ny*nz).fill(Infinity),at=(x:number,y:number,z:number)=>(x*ny+y)*nz+z;
  const t=new T.Box3(),c=[new T.Vector3(),new T.Vector3(),new T.Vector3()],q=new T.Vector3();
  for(const mesh of meshes(anchor)){const p=mesh.geometry.getAttribute('position'),index=mesh.geometry.index,n=index?index.count:p.count;
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
 function closestAnchor(node:T.Group,touch:number,band:number){
  const near=boxOf(node);let selected:T.Group=body,bestContacts=-1,bestDistance=Infinity;
  if(near.isEmpty())return body;
  for(const candidate of [body,head]){if(boxOf(candidate).isEmpty())continue;const {lookup}=surfaceDistance(candidate,near,touch,touch+band),v=new T.Vector3();let contacts=0,minDistance=Infinity;
   for(const mesh of meshes(node)){const p=mesh.geometry.getAttribute('position');for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld);const d=lookup(v);if(d<touch)contacts++;if(d<minDistance)minDistance=d;}}
   if(contacts>bestContacts||(contacts===bestContacts&&minDistance<bestDistance)){selected=candidate;bestContacts=contacts;bestDistance=minDistance;}
  }
  return selected;
 }
 function glue(node:T.Group,touch:number,band:number,movePivot=false,anchor:T.Object3D=body){
  const box=boxOf(node),parts=meshes(node);if(box.isEmpty())return;
  const limb=/^(Arm|Foot)/.test(node.name)&&((node.name.startsWith('Arm')?recipe.armsFrom:recipe.feetFrom)!=='myr5'),size=box.getSize(new T.Vector3()),limbExtent=Math.max(size.x,size.y,size.z);
  const {lookup:distance,voxel}=surfaceDistance(anchor,box,touch,touch+band),v=new T.Vector3(),seam=new T.Vector3();let count=0;
  // A coarse grid (very large parts) widens the welded band so voxel rounding never loosens the seam.
  touch=Math.max(touch,2*voxel);const reach=touch+band;
  let highestContact=-Infinity;
  const distances=parts.map(mesh=>{const p=mesh.geometry.getAttribute('position'),d=new Float32Array(p.count);for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld);d[i]=distance(v);if(d[i]<touch)highestContact=Math.max(highestContact,v.y);}return d;});
  parts.forEach((mesh,j)=>{const p=mesh.geometry.getAttribute('position');for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld);if(distances[j][i]<touch&&(!limb||v.y>=highestContact-limbExtent*.15)){seam.add(v);count++;}}});
  if(!count)return;
  const joint=seam.divideScalar(count);
  const weldSize=Math.max(1e-5,limbExtent*1e-4),anchorVertices=new Map<string,T.Vector3[]>(),weldKey=(x:number,y:number,z:number)=>`${x},${y},${z}`;
  if(limb)for(const mesh of meshes(anchor)){const p=mesh.geometry.getAttribute('position');for(let i=0;i<p.count;i++){const point=new T.Vector3().fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld),key=weldKey(Math.round(point.x/weldSize),Math.round(point.y/weldSize),Math.round(point.z/weldSize));const list=anchorVertices.get(key)||[];list.push(point);anchorVertices.set(key,list);}}
  const isCutSeam=(point:T.Vector3)=>{const x=Math.round(point.x/weldSize),y=Math.round(point.y/weldSize),z=Math.round(point.z/weldSize);for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)for(let dz=-1;dz<=1;dz++)for(const other of anchorVertices.get(weldKey(x+dx,y+dy,z+dz))||[])if(point.distanceToSquared(other)<=weldSize*weldSize)return true;return false;};
  if(movePivot){const shift=joint.clone().sub(node.getWorldPosition(v));node.position.add(shift);for(const child of node.children)if(child instanceof T.Mesh)child.geometry.translate(-shift.x,-shift.y,-shift.z);else child.position.sub(shift);root.updateMatrixWorld(true);}
  parts.forEach((mesh,j)=>{const g=mesh.geometry,d=distances[j],index=new Uint16Array(d.length*4),w=new Float32Array(d.length*4);
   const connectedToAnchor=new Uint8Array(d.length);
   if(limb)for(const faces of connectedTriangleComponents(mesh)){
    const vertices=new Set<number>();for(const face of faces)for(let k=0;k<3;k++)vertices.add(g.index?g.index.getX(face*3+k):face*3+k);
    if([...vertices].some(i=>d[i]<touch))for(const i of vertices)connectedToAnchor[i]=1;
   }
   // Separate armor, hands and toes follow the limb rigidly. Only components
   // that actually meet the anchor need a blended shoulder/hip seam.
   for(let i=0;i<d.length;i++){v.fromBufferAttribute(g.getAttribute('position'),i).applyMatrix4(mesh.matrixWorld);const distal=limb?T.MathUtils.smoothstep(v.distanceTo(joint),limbExtent*.15,limbExtent*.5):0,own=limb&&!connectedToAnchor[i]?1:limb&&v.distanceTo(joint)<=limbExtent*.35&&isCutSeam(v)?0:Math.max(distal,T.MathUtils.smoothstep(d[i],touch,reach));index[i*4+1]=1;w[i*4]=1-own;w[i*4+1]=own;}
   g.setAttribute('skinIndex',new T.Uint16BufferAttribute(index,4));g.setAttribute('skinWeight',new T.Float32BufferAttribute(w,4));g.computeBoundingSphere();
   const skinned=new T.SkinnedMesh(g,mesh.material);skinned.name=mesh.name;node.remove(mesh);node.add(skinned);skinned.bind(new T.Skeleton([anchor,node] as unknown as T.Bone[]));});
 }
 const headBox=boxOf(head),headH=headBox.max.y-headBox.min.y,eyeY=Math.min(...Object.keys(nodes).filter(n=>n.startsWith('EyeBlink')).map(n=>nodes[n].getWorldPosition(new T.Vector3()).y));
 // The neck blends in below the eyes (they ride the head rigidly), over at most 30% of the head.
 glue(head,.06*Math.max(headH,headBox.max.x-headBox.min.x),T.MathUtils.clamp(.6*(eyeY-headBox.min.y),.12*headH,.3*headH),true);
 // Roster arms share a narrow, body-weighted shoulder seam; the source MYR5 arms keep their existing pivots.
 if(recipe.armsFrom!=='myr5'){
  const arms=[nodes.ArmLeft,nodes.ArmRight],largest=Math.max(...arms.map(arm=>{const size=boxOf(arm).getSize(new T.Vector3());return Math.max(size.x,size.y,size.z);}));
  if(largest>0)for(const arm of arms){const touch=.04*largest,band=.15*largest,anchor=closestAnchor(arm,touch,band);glue(arm,touch,band,true,anchor);}
 }
 // A foot's scale is its largest side: a leg's length, a flat foot's length.
 for(const foot of [nodes.FootLeft,nodes.FootRight]){const size=boxOf(foot).getSize(new T.Vector3()),h=Math.max(size.x,size.y,size.z),touch=.15*h,band=.5*h,anchor=recipe.feetFrom!=='myr5'?closestAnchor(foot,touch,band):body;glue(foot,touch,band,recipe.feetFrom!=='myr5',anchor);}
 const rest=Object.fromEntries(Object.entries(nodes).map(([name,node])=>[name,{position:node.position.clone(),scale:node.scale.clone(),quaternion:node.quaternion.clone()}]));
 return {root,nodes,rest,recipe};
}
export type CreatureRig=ReturnType<typeof createRig>;
