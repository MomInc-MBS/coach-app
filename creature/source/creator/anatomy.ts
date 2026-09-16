import * as THREE from 'three';
import {EYE_LAYOUTS,EYE_REFERENCE,type EyeLayout} from './eye-layouts';
import {EYE_CENTER} from './eye-surface';
// Layouts are authored around MYR5's head. `offset` moves the whole arrangement onto another head and
// `scale` shrinks or grows spacing and eye size around the reference eye together. `surfaceZ`, set for heads
// without MYR5's carved sockets, seats each front-facing eye on that surface instead of recessing it.
export function eyePosition([x,y,z,r,yaw]:readonly number[],offset:THREE.Vector3,scale:number,surfaceZ?:number){
 const px=EYE_REFERENCE.x+(x-EYE_REFERENCE.x)*scale+offset.x,py=EYE_REFERENCE.y+(y-EYE_REFERENCE.y)*scale+offset.y;
 const pz=surfaceZ!==undefined&&yaw===0?surfaceZ-r*scale*.55:EYE_REFERENCE.z+(z-EYE_REFERENCE.z)*scale+offset.z;
 return [px,py,pz];
}
export function arrangeEyes(template:THREE.Group,layout:EyeLayout,offset:THREE.Vector3=new THREE.Vector3(),scale=1,surfaceZ?:number){
 const group=new THREE.Group();group.name='Eye arrangement';
 for(const [i,eye] of EYE_LAYOUTS[layout].eyes.entries()){
  const [,,,r,yaw]=eye;const instance=new THREE.Group();instance.name='Eye '+(i+1);
  instance.position.fromArray(eyePosition(eye,offset,scale,surfaceZ));
  instance.rotation.y=THREE.MathUtils.degToRad(yaw);instance.scale.setScalar(r/.605*scale);
  const content=template.clone(true);content.visible=true;content.position.copy(EYE_CENTER).negate();instance.add(content);group.add(instance);
 }
 return group;
}
