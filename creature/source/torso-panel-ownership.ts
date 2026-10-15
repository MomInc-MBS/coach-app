import * as T from 'three';
import {connectedTriangleComponents,triangleSubset} from './limb-ownership';

const CASK='roster/11-anvil-cask--clay-style_robot_3d_model';
const ALIEN='roster/22-curve--stylized_alien_3d_model';
const HONEYCOMB='roster/23-blob-texture-bodies--honeycomb_humanoid_3d_model';
const GHOST='roster/10-petal-wisp--ghost_character_3d_model';
const SPIRIT='roster/10-petal-wisp--fantasy_creature_3d_model4';

/** Restore torso surfaces removed by the roster's vertical arm cuts and horizontal hip cut. */
export function correctTorsoPanelOwnership(source:T.Group,id:string){
 if(![CASK,ALIEN,HONEYCOMB,GHOST,SPIRIT].includes(id))return 0;
 source.updateWorldMatrix(true,true);const body=source.getObjectByName('body'),region=source.getObjectByName(id===CASK?'feet':'arms');if(!body||!region)return 0;
 const bodyMeshes:T.Mesh[]=[],meshes:T.Mesh[]=[];body.traverse(o=>{if(o instanceof T.Mesh&&!Array.isArray(o.material))bodyMeshes.push(o);});region.traverse(o=>{if(o instanceof T.Mesh&&!Array.isArray(o.material))meshes.push(o);});if(!bodyMeshes.length)return 0;
 const samples:T.Vector3[]=[];for(const m of bodyMeshes){if(m.userData.restoredTorsoPanelTriangles)continue;const p=m.geometry.getAttribute('position');for(let i=0;i<p.count;i++)samples.push(new T.Vector3().fromBufferAttribute(p,i).applyMatrix4(m.matrixWorld));}
 const box=new T.Box3().setFromPoints(samples);
 // Honeycomb's arm cut goes through the torso at x=±.325. Its actual
 // shoulder necks are at x=±.85; retain the complete inner torso wall.
 let moved=0;
 for(const m of meshes){const g=m.geometry,p=g.getAttribute('position'),idx=g.index,selected=new Set<number>();
  if(id===CASK){for(const component of connectedTriangleComponents(m)){const b=new T.Box3();for(const f of component)for(let k=0;k<3;k++)b.expandByPoint(new T.Vector3().fromBufferAttribute(p,idx?idx.getX(f*3+k):f*3+k).applyMatrix4(m.matrixWorld));if(component.length===379&&b.min.x<-.6&&b.max.x>.6&&b.min.y>.63)for(const f of component)selected.add(f);}}
  else{for(let f=0;f<(idx?.count??p.count)/3;f++){const v=new T.Vector3();for(let k=0;k<3;k++)v.add(new T.Vector3().fromBufferAttribute(p,idx?idx.getX(f*3+k):f*3+k).applyMatrix4(m.matrixWorld));v.divideScalar(3);
   if(id===ALIEN){if(Math.abs(v.x)<.435&&v.y>=.929&&v.y<=1.64)selected.add(f);}
   else if(id===GHOST){if(Math.abs(v.x)<.60&&v.y>=.929&&v.y<1.5)selected.add(f);}
   else if(id===SPIRIT){if(Math.abs(v.x)<.36&&v.y>=.929&&v.y<1.8)selected.add(f);}
   else if(v.y>=box.min.y-.012&&v.y<=box.max.y+.005&&Math.abs(v.x)<.85)selected.add(f);
  }}
  if(!selected.size)continue;const restored=triangleSubset(g,f=>selected.has(f)),remaining=triangleSubset(g,f=>!selected.has(f));if(!restored)continue;
  restored.applyMatrix4(body.matrixWorld.clone().invert().multiply(m.matrixWorld));if(remaining)m.geometry=remaining;else m.removeFromParent();g.dispose();const part=new T.Mesh(restored,bodyMeshes[0].material);part.name='Restored torso panel';part.userData.restoredTorsoPanelTriangles=selected.size;body.add(part);moved+=selected.size;
 }
 source.updateWorldMatrix(true,true);return moved;
}
