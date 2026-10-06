import * as THREE from 'three';
export const EYE_CENTER=new THREE.Vector3(0,2.1575,.55);
export const LID_RADIUS=.619;
const originals=new WeakMap<THREE.Mesh,{source:THREE.BufferGeometry;projected:THREE.BufferGeometry}>();
function subdivideSurface(source:THREE.BufferGeometry){
 const flat=source.index?source.toNonIndexed():source.clone();const positions=flat.getAttribute('position');const vertices:number[]=[];
 const split=(a:THREE.Vector3,b:THREE.Vector3,c:THREE.Vector3,depth:number)=>{
  if(depth<6&&Math.max(a.distanceTo(b),b.distanceTo(c),c.distanceTo(a))>.04){const ab=a.clone().lerp(b,.5),bc=b.clone().lerp(c,.5),ca=c.clone().lerp(a,.5);split(a,ab,ca,depth+1);split(ab,b,bc,depth+1);split(ca,bc,c,depth+1);split(ab,bc,ca,depth+1);}else vertices.push(...a.toArray(),...b.toArray(),...c.toArray());
 };
 for(let i=0;i<positions.count;i+=3)split(new THREE.Vector3().fromBufferAttribute(positions,i),new THREE.Vector3().fromBufferAttribute(positions,i+1),new THREE.Vector3().fromBufferAttribute(positions,i+2),0);
 flat.dispose();const dense=new THREE.BufferGeometry();dense.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));return dense;
}
export function prepareEyeMesh(o:THREE.Mesh){
 if(o.name==='Iris'){
  o.geometry.dispose();o.geometry=new THREE.CircleGeometry(.375,128);o.geometry.scale(1, .395/.375,1);o.position.set(.04,2.1475,1.133);
 }else if(o.name==='Glint'||o.name==='Small_glint'||o.name==='Small glint'){
  const small=o.name!=='Glint';o.geometry.dispose();o.geometry=new THREE.CircleGeometry(small?.024:.063,32);o.geometry.scale(1,small?.028/.024:.081/.063,1);o.position.y-=.4725;
 }
}
// R25 bloodshot eyes: branching red veins that run from the rim of the white toward the iris. Built flat
// in the eye's own frame, then wrapped onto the globe by conformEyeMesh like the iris and glints.
export function bloodshotVeins(){
 const vertices:number[]=[];let seed=11;const rand=()=>(seed=seed*16807%2147483647)/2147483647;
 const strip=(path:[number,number][],width:number)=>{for(let i=0;i+1<path.length;i++){
  const [ax,ay]=path[i],[bx,by]=path[i+1],l=Math.hypot(bx-ax,by-ay)||1,wa=width*(1-i/path.length),wb=width*(1-(i+1)/path.length);
  const nx=-(by-ay)/l,ny=(bx-ax)/l;vertices.push(ax-nx*wa,ay-ny*wa,1.15,bx+nx*wb,by+ny*wb,1.15,ax+nx*wa,ay+ny*wa,1.15,ax-nx*wa,ay-ny*wa,1.15,bx-nx*wb,by-ny*wb,1.15,bx+nx*wb,by+ny*wb,1.15);}};
 const walk=(angle:number,from:number,to:number,steps:number):[number,number][]=>Array.from({length:steps+1},(_,i)=>{const r=from+(to-from)*i/steps;angle+=(rand()-.5)*.22;return [.04+Math.cos(angle)*r,2.1475+Math.sin(angle)*r];});
 for(let k=0;k<13;k++){const angle=k/13*Math.PI*2+rand()*.35,main=walk(angle,.6,.4+rand()*.06,7);strip(main,.011);
  const at=2+Math.floor(rand()*3),[x,y]=main[at],r=Math.hypot(x-.04,y-2.1475);strip(walk(Math.atan2(y-2.1475,x-.04)+(rand()<.5?-.35:.35),r,r-.09,3),.006);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));return g;
}
// A geometric mask keeps eye markings on the globe and inside the eyelid.
// Actual surface geometry also preserves occlusion in GLB and OBJ exports.
export function conformEyeMesh(o:THREE.Mesh){
 if(!/^(Iris|Pupil|Glint|Small.glint|Eye vein)/.test(o.name))return;
 let entry=originals.get(o);
 if(!entry||entry.projected!==o.geometry){entry?.source.dispose();entry={source:subdivideSurface(o.geometry),projected:o.geometry};originals.set(o,entry);}
 const geometry=entry.source.clone();const positions=geometry.getAttribute('position');const point=new THREE.Vector3();o.updateMatrix();const inverse=o.matrix.clone().invert();const localNormalMatrix=new THREE.Matrix3().setFromMatrix4(o.matrix).transpose();const normal=new THREE.Vector3();const normals=new Float32Array(positions.count*3);
 const radius=o.name==='Pupil'?.609:/glint/i.test(o.name)?.611:o.name==='Iris'?.606:o.name==='Eye vein'?.6058:.6075;
 for(let i=0;i<positions.count;i++){
  point.fromBufferAttribute(positions,i).applyMatrix4(o.matrix);
  let x=point.x-EYE_CENTER.x,y=point.y-EYE_CENTER.y;const distance=Math.hypot(x,y),limit=.595;
  if(distance>limit){x*=limit/distance;y*=limit/distance;}
  point.set(EYE_CENTER.x+x,EYE_CENTER.y+y,EYE_CENTER.z+Math.sqrt(radius*radius-x*x-y*y));normal.copy(point).sub(EYE_CENTER).normalize().applyMatrix3(localNormalMatrix).normalize();normal.toArray(normals,i*3);point.applyMatrix4(inverse);
  positions.setXYZ(i,point.x,point.y,point.z);
 }
 geometry.setAttribute('normal',new THREE.BufferAttribute(normals,3));geometry.computeBoundingBox();geometry.computeBoundingSphere();o.geometry.dispose();o.geometry=geometry;entry.projected=geometry;
}
