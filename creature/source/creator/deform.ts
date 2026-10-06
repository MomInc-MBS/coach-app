import * as THREE from 'three';
import type {Design,Region} from './design';
export function deformMesh(o:THREE.Mesh,region:Region,d:Design){
 const position=o.userData.basePosition as THREE.Vector3,scale=o.userData.baseScale as THREE.Vector3;
 if(!position||!scale)return;
 o.position.copy(position);o.scale.copy(scale);
 // The GLB is already converted to Y up. Scale around each feature's center.
 if(o.name.startsWith('Silky_collar')||o.name.startsWith('Silky collar')){
  o.scale.x*=1+.2*(d.fur-1);o.scale.z*=1+.2*(d.fur-1);o.scale.y*=d.fur;o.position.y+=1.5175*(1-d.fur);
 }
 if(region==='eye'&&/Iris|Pupil|Glint|glint/.test(o.name)){
  const factor=d.iris*(o.name==='Pupil'?d.pupilSize:1);
  // R25 anime eyes: a tall iris and pupil with oversized highlights.
  const glint=/glint/i.test(o.name),fx=factor*(d.eye==='anime'?glint?1.7:1.2:1),fy=factor*(d.eye==='anime'?glint?1.7:1.45:1);
  o.scale.x*=fx;o.scale.y*=fy;
  o.position.x=position.x*fx+.04*(1-fx);
  o.position.y=position.y*fy+2.1475*(1-fy);
 }
}

