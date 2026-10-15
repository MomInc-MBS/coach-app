import {goldenCoach} from '../../../performance-progress.mjs';
import {arrangeEyes} from './anatomy';
import {EYE_LAYOUTS,EYE_REFERENCE,EYE_SCALE_DEFAULT} from './eye-layouts';
import {EYE_OVERRIDES} from './eye-overrides';
import {pupilGeometry} from './pupils';
import {getCoach} from './coaching';
import {prepareEyeMesh,conformEyeMesh,bloodshotVeins,LID_RADIUS} from './eye-surface';
import {sculptMaterial,growMaterial,applySparkle,applyPaletteSurface} from './material-language';
import {boneSockets,skeletalStructure,materialCollar,robotStructure} from './skeletal-anatomy';
import {colorTriad,resolveRegionMaterial,regionChoice} from './materials-registry';
import {applyInstalledSkin,loadInstalledSkinTextures,type InstalledSkin,type SkinTextureCache} from './skin-materials';
import {createCoachReliefBudget} from './material-refinement';

import * as THREE from 'three';
import {GLTFLoader,type GLTF} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import {REGIONS,STYLES,type Region,type Design} from './design';
import {deformMesh} from './deform';
import {armBodyBandTriangles,armBodyTriangles,armFootTriangles,connectedTriangleComponents,detachedHandTriangles,groundedComponentsBelowBodyCut,triangleSubset} from '../limb-ownership';
import {correctQuadrupedOwnership} from '../quadruped-ownership';
import {correctRousArmOwnership} from '../rous-ownership';
import {inferGroundedSidePlaneX} from '../rig';
import {correctPetalWispArmOwnership} from '../petal-wisp-ownership';
import {correctConorPelvisOwnership} from '../conor-pelvis-ownership';
import {correctTorsoPanelOwnership} from '../torso-panel-ownership';

// Adapted from the existing MYR5 AlienViewer. The app and editor use this assembly.
const modelBuffers=new Map<string,Promise<ArrayBuffer>>();
function bytes(url:string){if(!modelBuffers.has(url))modelBuffers.set(url,fetch(url).then(response=>{if(!response.ok)throw Error('Creature model is unavailable.');return response.arrayBuffer();}).catch(error=>{modelBuffers.delete(url);throw error;}));return modelBuffers.get(url)!;}

type Fit={s:number;t:THREE.Vector3};
const clamp=(v:number,lo:number,hi:number)=>Math.max(lo,Math.min(hi,v));
// These roster entries are continuous shell creatures. Their source "arms" are body
// surface panels, and their broad bases are not separately articulated feet.
const BODY_OWNED_LIMBS=new Set([
 'roster/12-seedpod-snailslug--stylized_slug_3d_model',
 'roster/23-blob-texture-bodies--cute_blob_creature_3d_model',
 // Their broad body cuts already contain the real appendages. The nominal
 // arms are isolated shell strips/tips, so rotating those alone tears the shell.
 'roster/12-seedpod-snailslug--stylized_worm_3d_model',
 'roster/19-genie-multi--fantasy_creature_3d_model',
 'roster/19-genie-multi--stylized_octopus_3d_model',
]);
const BODY_OWNED_FEET=new Set([
 'roster/12-seedpod-snailslug--stylized_worm_3d_model',
 'roster/10-petal-wisp--ghost_character_3d_model',
 'roster/10-petal-wisp--fantasy_creature_3d_model4',
 'roster/19-genie-multi--fantasy_creature_3d_model',
 'roster/19-genie-multi--stylized_octopus_3d_model',
]);
const BLOB_SPLIT_OWNERSHIP='roster/23-blob-texture-bodies--blob_creature_3d_model';
const OLIVA_CENTER_BRIDGE='roster/06-ridge-triad--geometric_robot_3d_model1';
const PEC_UPPER_ARM_CHAIN='roster/08-shard-asym--geometric_robot_3d_model';
const BOLT_HAND_COMPONENTS='roster/07-bulb-sphereling--humanoid_robot_3d_model';
const REASPIRE_HIP_SLIVER='roster/14-chisel-spire--low_poly_robot_3d_model';
const MULTI_ARM_TORSO_EDGE='roster/19-genie-multi--multi-armed_humanoid_3d_model1';
const PEARL_RING_UNDERARM_STRIPS=new Set(['roster/03-pearl-orb-ring--circle_center','roster/03-pearl-orb-ring--ringed_humanoid_3d_model']);
const GHOST4_BODY_CONTACT_FRAGMENT='roster/10-petal-wisp--fantasy_creature_3d_model4';
const ROUS_SIDE_PLANE_SOURCE='roster/09-monolith-tanka--robot_3d_model2';
function boxOf(object:THREE.Object3D|undefined){const box=new THREE.Box3();if(object){object.updateWorldMatrix(true,true);box.setFromObject(object);}return box;}
/** Correct source-region arm cuts before fitting or applying chosen region styles. */
export function correctArmFootOwnership(source:THREE.Group,sourceId:string){
 if(sourceId.startsWith('roster/18-quad-all--'))return 0;
 source.updateWorldMatrix(true,true);const arms=source.getObjectByName('arms'),feet=source.getObjectByName('feet'),body=source.getObjectByName('body');if(!arms||!feet||!body)return 0;
 const feetMeshes:THREE.Mesh[]=[],bodyMeshes:THREE.Mesh[]=[];feet.traverse(o=>{if(o instanceof THREE.Mesh&&o.visible)feetMeshes.push(o);});body.traverse(o=>{if(o instanceof THREE.Mesh&&o.visible)bodyMeshes.push(o);});if(!feetMeshes.length||!bodyMeshes.length)return 0;
 const feetBox=new THREE.Box3();for(const mesh of feetMeshes)feetBox.expandByObject(mesh);
 const bodyBox=new THREE.Box3();for(const mesh of bodyMeshes)bodyBox.expandByObject(mesh);
 const footMaterial=feetMeshes.find(m=>!Array.isArray(m.material))?.material,bodyMaterial=bodyMeshes.find(m=>!Array.isArray(m.material))?.material;if(!footMaterial||Array.isArray(footMaterial)||!bodyMaterial||Array.isArray(bodyMaterial))return 0;
 let moved=0;const armMeshes:THREE.Mesh[]=[];arms.traverse(o=>{if(o instanceof THREE.Mesh&&o.visible&&!Array.isArray(o.material))armMeshes.push(o);});
  for(const mesh of armMeshes){let active=mesh.geometry;const blobSplit=sourceId===BLOB_SPLIT_OWNERSHIP;const footIds=blobSplit||BODY_OWNED_FEET.has(sourceId)?new Set<number>():armFootTriangles(mesh,feetBox,feetMeshes,{bodyLowerY:bodyBox.min.y});
  // Pec-n0ld's arm-foot classifier selects a 581-face source-ARMS component,
  // while the measured mirrored counterpart remains in arms. Keep the complete
  // pair under arm ownership so both arms animate; match by source bounds and
  // component size rather than assuming triangle indices.
  if(sourceId===PEC_UPPER_ARM_CHAIN&&footIds.size){
    const components=connectedTriangleComponents(mesh),componentBounds=(ids:number[])=>{const box=new THREE.Box3(),p=mesh.geometry.getAttribute('position'),index=mesh.geometry.index;for(const id of ids)for(let k=0;k<3;k++)box.expandByPoint(new THREE.Vector3().fromBufferAttribute(p,index?index.getX(id*3+k):id*3+k).applyMatrix4(mesh.matrixWorld));return box;},all=components.map(ids=>({ids,selected:ids.filter(id=>footIds.has(id)).length,box:componentBounds(ids)})),centerX=bodyBox.getCenter(new THREE.Vector3()).x,keep=new Set<number>();
    for(const candidate of all){if(candidate.selected!==candidate.ids.length||candidate.ids.length<500)continue;const a=candidate.box;
      for(const opposite of all){if(opposite===candidate||opposite.selected||opposite.ids.length<500)continue;const b=opposite.box,ratio=candidate.ids.length/opposite.ids.length;
        const mirrored=Math.abs((a.min.x-centerX)+(b.max.x-centerX))<.045&&Math.abs((a.max.x-centerX)+(b.min.x-centerX))<.045;
        const aligned=Math.abs(a.min.y-b.min.y)<.08&&Math.abs(a.max.y-b.max.y)<.08&&Math.abs(a.getSize(new THREE.Vector3()).x-b.getSize(new THREE.Vector3()).x)<.04;
        if(mirrored&&aligned&&ratio>.85&&ratio<1.15){for(const id of candidate.ids)keep.add(id);break;}
      }
    }
    for(const id of keep)footIds.delete(id);
  }
  if(footIds.size){const selected=triangleSubset(active,id=>footIds.has(id)),remaining=triangleSubset(active,id=>!footIds.has(id));if(selected){moved+=footIds.size;if(remaining){mesh.geometry=remaining;active.dispose();active=remaining;}else{mesh.removeFromParent();active.dispose();active=null as any;}
   const intoFeet=feet.matrixWorld.clone().invert().multiply(mesh.matrixWorld);selected.applyMatrix4(intoFeet);const footMesh=new THREE.Mesh(selected,footMaterial);footMesh.name='Recovered foot section';footMesh.userData.recoveredArmFootTriangles=footIds.size;feet.add(footMesh);}}
  if(!active)continue;
    const triangleCount=(active.index?.count??active.getAttribute('position').count)/3;
    const bodyOptions=sourceId===MULTI_ARM_TORSO_EDGE?{bodyUpperFraction:.425}:undefined;
    // Pec-n0ld's 137- and 64-face side components close the upper arm that
    // continues through the retained 581-face lower-arm component. They touch
    // Body geometrically but belong to the arm chain in the source cut.
    const tailCutIds=new Set<number>(),bodyIds=blobSplit?new Set(Array.from({length:triangleCount},(_,i)=>i)):sourceId===PEC_UPPER_ARM_CHAIN?new Set<number>():armBodyTriangles(mesh,bodyBox,bodyMeshes,bodyOptions);if(BODY_OWNED_FEET.has(sourceId)){const cutTolerance=Math.max(.002,(bodyBox.max.y-bodyBox.min.y)*.002);for(const id of groundedComponentsBelowBodyCut(mesh,bodyBox.min.y,feetBox,cutTolerance))if(!bodyIds.has(id)){bodyIds.add(id);tailCutIds.add(id);}
      // Continuous tail creatures may contain small proximal web panels in the
      // animated arms source. Move only faces whose complete corner set is
      // within a tight source-surface tolerance of the body in its lower band;
      // distal fingers and tentacle surfaces remain arm-owned.
      for(const id of armBodyBandTriangles(mesh,bodyBox,bodyMeshes,{bodyUpperFraction:.45,contactTolerance:.03,allVerticesOnBody:true}))bodyIds.add(id);
    }
    if(PEARL_RING_UNDERARM_STRIPS.has(sourceId))for(const id of armBodyBandTriangles(mesh,bodyBox,bodyMeshes,{bodyUpperFraction:.45}))bodyIds.add(id);
    // This second ghost has a detached 66-face plate touching the body's crown
    // at a measured vertex seam; move just that complete component to BodyMotion.
    if(sourceId===GHOST4_BODY_CONTACT_FRAGMENT){
      const p=mesh.geometry.getAttribute('position'),index=mesh.geometry.index,bodyVertices:THREE.Vector3[]=[];
      for(const bodyMesh of bodyMeshes){const bp=bodyMesh.geometry.getAttribute('position');for(let i=0;i<bp.count;i++)bodyVertices.push(new THREE.Vector3().fromBufferAttribute(bp,i).applyMatrix4(bodyMesh.matrixWorld));}
      for(const component of connectedTriangleComponents(mesh)){if(component.length>100)continue;const box=new THREE.Box3(),vertices=new Map<number,THREE.Vector3>();
        for(const id of component)for(let k=0;k<3;k++){const vi=index?index.getX(id*3+k):id*3+k;if(!vertices.has(vi))vertices.set(vi,new THREE.Vector3().fromBufferAttribute(p,vi).applyMatrix4(mesh.matrixWorld));box.expandByPoint(vertices.get(vi)!);}
        if(box.min.y<bodyBox.max.y-.25||box.max.y>bodyBox.max.y+.02)continue;
        let nearest=Infinity;for(const v of vertices.values())for(const bv of bodyVertices)nearest=Math.min(nearest,v.distanceTo(bv));
        if(nearest<=.015)for(const id of component)bodyIds.add(id);
      }
    }
    if(!bodyIds.size)continue;
  const bodyPart=triangleSubset(active,id=>bodyIds.has(id)),armPart=triangleSubset(active,id=>!bodyIds.has(id));if(!bodyPart)continue;
  moved+=bodyIds.size;if(armPart){mesh.geometry=armPart;active.dispose();}else mesh.removeFromParent();
  const intoBody=body.matrixWorld.clone().invert().multiply(mesh.matrixWorld);bodyPart.applyMatrix4(intoBody);const bodyMesh=new THREE.Mesh(bodyPart,bodyMaterial);bodyMesh.name='Recovered torso section';bodyMesh.userData.recoveredArmBodyTriangles=bodyIds.size;if(tailCutIds.size)bodyMesh.userData.recoveredTailCutTriangles=tailCutIds.size;body.add(bodyMesh);if(!armPart)active.dispose();
 }
 source.updateWorldMatrix(true,true);return moved;
}
/** Move only verified detached hand components that were authored in a feet cut. */
export function correctFootHandOwnership(source:THREE.Group,sourceId:string){
  if(BODY_OWNED_LIMBS.has(sourceId)||BODY_OWNED_FEET.has(sourceId)||sourceId.startsWith('roster/18-quad-all--'))return 0;
 source.updateWorldMatrix(true,true);const arms=source.getObjectByName('arms'),feet=source.getObjectByName('feet'),body=source.getObjectByName('body');if(!arms||!feet||!body)return 0;
 const meshes=(group:THREE.Object3D)=>{const out:THREE.Mesh[]=[];group.traverse(o=>{if(o instanceof THREE.Mesh&&o.visible&&!Array.isArray(o.material))out.push(o);});return out;};
 const footMeshes=meshes(feet),armMeshes=meshes(arms),bodyMeshes=meshes(body);if(!footMeshes.length||!armMeshes.length||!bodyMeshes.length)return 0;
 const feetBox=new THREE.Box3(),armsBox=new THREE.Box3(),bodyBox=new THREE.Box3();for(const m of footMeshes)feetBox.expandByObject(m);for(const m of armMeshes)armsBox.expandByObject(m);for(const m of bodyMeshes)bodyBox.expandByObject(m);
 const bodyHeight=bodyBox.max.y-bodyBox.min.y;if(!(bodyHeight>0))return 0;
 const lowerBody=new THREE.Box3(),lowerCap=bodyBox.min.y+bodyHeight*.35;
 for(const mesh of bodyMeshes){const p=mesh.geometry.getAttribute('position'),index=mesh.geometry.index,count=index?.count??p.count;for(let i=0;i<count;i++){const v=new THREE.Vector3().fromBufferAttribute(p,index?index.getX(i):i).applyMatrix4(mesh.matrixWorld);if(v.y<=lowerCap)lowerBody.expandByPoint(v);}}
 if(lowerBody.isEmpty())return 0;
 let moved=0;
 for(const mesh of footMeshes){const selected=detachedHandTriangles(mesh,feetBox,footMeshes,armsBox,armMeshes,bodyBox,bodyMeshes,lowerBody,{maxComponentTriangles:sourceId===BOLT_HAND_COMPONENTS?1500:600});
  if(!selected.size)continue;const original=mesh.geometry,hand=triangleSubset(original,id=>selected.has(id)),remaining=triangleSubset(original,id=>!selected.has(id));if(!hand)continue;
  const p=original.getAttribute('position'),index=original.index,center=new THREE.Vector3();for(const id of selected)for(let k=0;k<3;k++)center.add(new THREE.Vector3().fromBufferAttribute(p,index?index.getX(id*3+k):id*3+k).applyMatrix4(mesh.matrixWorld));center.divideScalar(selected.size*3);
  let armMaterialMesh=armMeshes[0],nearest=Infinity;for(const candidate of armMeshes){const box=new THREE.Box3().setFromObject(candidate),candidateCenter=box.getCenter(new THREE.Vector3()),distance=center.distanceToSquared(candidateCenter);if(distance<nearest){nearest=distance;armMaterialMesh=candidate;}}
  moved+=selected.size;if(remaining){mesh.geometry=remaining;original.dispose();}else{mesh.removeFromParent();original.dispose();}
  const intoArms=arms.matrixWorld.clone().invert().multiply(mesh.matrixWorld);hand.applyMatrix4(intoArms);const handMesh=new THREE.Mesh(hand,armMaterialMesh.material as THREE.Material);handMesh.name='Recovered hand section';handMesh.userData.recoveredFootHandTriangles=selected.size;arms.add(handMesh);
 }
 source.updateWorldMatrix(true,true);return moved;
}
/** Blob1's high, cross-center pelvis bowl is authored in `feet` but must follow BodyMotion. */
export function correctBlobPelvisOwnership(source:THREE.Group,sourceId:string){
 if(sourceId!==BLOB_SPLIT_OWNERSHIP&&sourceId!==OLIVA_CENTER_BRIDGE)return 0;
 source.updateWorldMatrix(true,true);const feet=source.getObjectByName('feet'),body=source.getObjectByName('body');if(!feet||!body)return 0;
 const feetMeshes:THREE.Mesh[]=[],bodyMeshes:THREE.Mesh[]=[];feet.traverse(o=>{if(o instanceof THREE.Mesh&&o.visible&&!Array.isArray(o.material))feetMeshes.push(o);});body.traverse(o=>{if(o instanceof THREE.Mesh&&o.visible&&!Array.isArray(o.material))bodyMeshes.push(o);});
 if(!feetMeshes.length||!bodyMeshes.length)return 0;const bodyBox=new THREE.Box3();for(const mesh of bodyMeshes)bodyBox.expandByObject(mesh);const bodySize=bodyBox.getSize(new THREE.Vector3()),bodyCenter=bodyBox.getCenter(new THREE.Vector3());if(bodySize.x<=0||bodySize.y<=0)return 0;
 const bodyMaterial=bodyMeshes[0].material as THREE.Material;let moved=0;
 for(const mesh of feetMeshes){const components=connectedTriangleComponents(mesh),selected=new Set<number>();
  for(const component of components){const box=new THREE.Box3(),center=new THREE.Vector3(),position=mesh.geometry.getAttribute('position'),index=mesh.geometry.index;
   for(const id of component)for(let k=0;k<3;k++){const v=new THREE.Vector3().fromBufferAttribute(position,index?index.getX(id*3+k):id*3+k).applyMatrix4(mesh.matrixWorld);box.expandByPoint(v);center.add(v);}
   center.divideScalar(component.length*3);const spansCenter=box.min.x<bodyCenter.x-bodySize.x*.08&&box.max.x>bodyCenter.x+bodySize.x*.08,contactsBodyBottom=box.max.y>=bodyBox.min.y-bodySize.y*.025&&box.min.y<bodyBox.min.y+bodySize.y*.04,central=Math.abs(center.x-bodyCenter.x)<bodySize.x*.18;
   if(spansCenter&&contactsBodyBottom&&central)for(const id of component)selected.add(id);
  }
  if(!selected.size)continue;const original=mesh.geometry,part=triangleSubset(original,id=>selected.has(id)),remaining=triangleSubset(original,id=>!selected.has(id));if(!part)continue;
  moved+=selected.size;if(remaining){mesh.geometry=remaining;original.dispose();}else{mesh.removeFromParent();original.dispose();}
  const intoBody=body.matrixWorld.clone().invert().multiply(mesh.matrixWorld);part.applyMatrix4(intoBody);const bodyPart=new THREE.Mesh(part,bodyMaterial);bodyPart.name='Recovered center pelvis';bodyPart.userData.recoveredPelvisTriangles=selected.size;body.add(bodyPart);
 }
 source.updateWorldMatrix(true,true);return moved;
}

export type RosterSourceRepairReport={armOwnershipTriangles:number;handOwnershipTriangles:number;pelvisTriangles:number;petalWispArmTriangles:number;conorPelvisTriangles:number;torsoPanelTriangles:number;quadrupedRepaired:boolean};
/** Run the complete source-only ownership repair chain before models are mixed or fitted. */
export function repairRosterSource(source:THREE.Group,sourceId:string):RosterSourceRepairReport{
 const report:RosterSourceRepairReport={armOwnershipTriangles:0,handOwnershipTriangles:0,pelvisTriangles:0,petalWispArmTriangles:0,conorPelvisTriangles:0,torsoPanelTriangles:0,quadrupedRepaired:false};
 if(!sourceId.startsWith('roster/'))return report;
 report.armOwnershipTriangles=sourceId.startsWith('roster/18-quad-all--')?0:sourceId===ROUS_SIDE_PLANE_SOURCE?correctRousArmOwnership(source,sourceId):correctArmFootOwnership(source,sourceId);
 for(let pass=0;pass<4;pass++){const moved=correctFootHandOwnership(source,sourceId);report.handOwnershipTriangles+=moved;if(!moved)break;}
 report.pelvisTriangles=correctBlobPelvisOwnership(source,sourceId);
 report.quadrupedRepaired=correctQuadrupedOwnership(source,sourceId);
 report.petalWispArmTriangles=correctPetalWispArmOwnership(source,sourceId);
 report.conorPelvisTriangles=correctConorPelvisOwnership(source,sourceId);
 report.torsoPanelTriangles=correctTorsoPanelOwnership(source,sourceId);
 return report;
}

export type InstalledSkinResolver=(id:string)=>Promise<InstalledSkin|null>;
// `preview` paints locked textures/colours (the editor's unsaved look-before-you-unlock layer).
export async function assembleCreature(d:Design,assetBase:string,resolveInstalledSkin?:InstalledSkinResolver,preview=false){
 // The build meshopt-compresses these models (scripts/optimize-glb.mjs).
 const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
 const look=(region:Region)=>resolveRegionMaterial(d.styles[region],regionChoice(d.materials,region),preview,d.body);
 const load=async(name:string)=>loader.parseAsync(await bytes(assetBase+'models/'+name+'.glb'),assetBase+'models/');
 // Each region can come from a different creature. A GLTF scene can only give each node away once,
 // so every distinct source id is parsed once and reused across the regions that name it.
 const from:Record<Region,string>={head:d.headFrom,eye:'myr5',collar:d.body,body:d.body,arms:d.armsFrom,feet:d.feetFrom};
 const extraIds=[...new Set(REGIONS.map(r=>from[r]).filter(id=>id!=='myr5'))];
 const [gltf,anatomy,hands,...extras]=await Promise.all([load('myr5'),load('anatomy'),load('hands-v2'),...extraIds.map(load)]);
 const installedSkins=new Map<Region,InstalledSkin>();
 if(resolveInstalledSkin)for(const region of REGIONS){const id=d.materials?.[region]?.textureId;if(!id?.startsWith('creature-'))continue;try{const skin=await resolveInstalledSkin(id);if(skin?.id===id)installedSkins.set(region,skin);}catch{/* Missing, revoked, offline, or untrusted optional packs fail closed to built-in materials. */}}
 const skinTextures=new Set<THREE.Texture>(),skinTextureCache:SkinTextureCache=new Map();
 const sources=new Map<string,GLTF>([['myr5',gltf],...extraIds.map((id,i)=>[id,extras[i]] as [string,GLTF])]);
 const scene=(id:string)=>sources.get(id)!.scene;

 // Repair only roster-sourced arms. Their lower fragments are detected against the same
 // model's actual feet cut boundary before sources are mixed or material styling is applied.
 // If another coach supplies feet, the selected arm source's recovered feet are excluded;
 // the chosen feet source owns that region in the assembled coach.
 for(const id of extraIds)repairRosterSource(scene(id),id);

 // Fit every limb region onto the chosen body. Boxes are measured in each source's own space before
 // any node moves. Pure single-source creatures (the original MYR5 included) keep identity transforms.
 const mixed=new Set([d.body,d.headFrom,d.armsFrom,d.feetFrom]).size>1;
 const fits={} as Record<Region,Fit>;for(const r of REGIONS)fits[r]={s:1,t:new THREE.Vector3()};
 const bodyBox=boxOf(scene(d.body).getObjectByName('body'));
 const headBox=boxOf(scene(d.headFrom).getObjectByName('head'));
 if(mixed){
  const size=new THREE.Vector3(),own=new THREE.Vector3(),c=new THREE.Vector3(),oc=new THREE.Vector3();bodyBox.getSize(size);bodyBox.getCenter(c);
  const fit=(id:string,anchorY:(b:THREE.Box3)=>number):Fit=>{
   const ob=boxOf(scene(id).getObjectByName('body'));ob.getSize(own);ob.getCenter(oc);
   const s=clamp(size.x/Math.max(own.x,1e-3),.6,1.6);
   return {s,t:new THREE.Vector3(c.x-oc.x*s,anchorY(bodyBox)-anchorY(ob)*s,c.z-oc.z*s)};
  };
  fits.head=fit(d.headFrom,b=>b.max.y);fits.arms=fit(d.armsFrom,b=>b.max.y);fits.feet=fit(d.feetFrom,b=>b.min.y);
  // Stand the assembled creature back on the floor.
  const feetBottom=boxOf(scene(d.feetFrom).getObjectByName('feet')).min.y*fits.feet.s+fits.feet.t.y;
  for(const r of REGIONS)fits[r].t.y-=feetBottom;
 }
 fits.eye=fits.head;

 // Eyes: the proven layout table is tuned to MYR5's head. Move it to the chosen head's eye anchor and
 // scale it by head width so the layouts keep their proportions on every head.
 const myr5HeadWidth=boxOf(gltf.scene.getObjectByName('head')).getSize(new THREE.Vector3()).x||1;
 const headWidth=headBox.getSize(new THREE.Vector3()).x*fits.head.s;
 const baseEyeScale=d.headFrom==='myr5'?fits.head.s:clamp(headWidth/myr5HeadWidth,.5,1.2);
 const eyeOverride=EYE_OVERRIDES[d.headFrom];
 // Global eye-scale multiplier (handoff §5, ~0.65) applies to roster heads only: MYR5's own head has eye
 // sockets carved for its native eye size (see eye-layouts.ts), so it stays at its own fitted scale.
 const globalEyeScale=d.headFrom==='myr5'?1:EYE_SCALE_DEFAULT;
 const eyeScale=eyeOverride?.eyeScale??baseEyeScale*globalEyeScale;
 const reference=new THREE.Vector3(EYE_REFERENCE.x,EYE_REFERENCE.y,EYE_REFERENCE.z);
 if(d.headFrom!=='myr5')scene(d.headFrom).updateMatrixWorld(true);
 const anchor=d.headFrom==='myr5'?null:scene(d.headFrom).getObjectByName('eye_anchor');
 const anchorWorld=anchor?anchor.getWorldPosition(new THREE.Vector3()):null;
 // flipX mirrors the head's own geometry (below); the anchor lives outside that node (a root sibling,
 // per the roster GLB contract) so its X has to be corrected here to keep the eyes on the mirrored side.
 if(anchorWorld&&eyeOverride?.flipX)anchorWorld.x=-anchorWorld.x;
 const eyeCenter=anchorWorld?anchorWorld.clone().sub(new THREE.Vector3(0,0,.605*eyeScale)):reference.clone();
 eyeCenter.multiplyScalar(fits.head.s).add(fits.head.t);
 // Roster heads have no carved sockets: remember their front surface so eyes sit on it, not inside it.
 const surfaceZ=anchorWorld?anchorWorld.z*fits.head.s+fits.head.t.z:undefined;
 // Anchor-derived offset first; a per-variant eyeOffset override (once the owner supplies one from the
 // before/after renders) nudges it afterward rather than replacing the anchor's own placement.
 const eyeOffset=eyeCenter.sub(reference);
 if(eyeOverride?.eyeOffset)eyeOffset.add(new THREE.Vector3(...eyeOverride.eyeOffset));
 const eyeMoved=eyeOffset.lengthSq()>1e-8||Math.abs(eyeScale-1)>1e-4;

 const root=new THREE.Group(),details=new THREE.Group(),coachRelief=createCoachReliefBudget();details.name='Style ornaments';root.add(details);
 // Keep source-local points on Rous's grounded-foot split until each selected region
 // has its final fit/facing transform. The region's own matrixWorld then accounts for
 // source offsets, fit translation/scale, and any local X mirror in one operation.
 const rousPlaneLocal:Partial<Record<'arms'|'feet',THREE.Vector3>>={};
 const rousPlaneSources:Partial<Record<'arms'|'feet',THREE.Object3D>>={};
 if(extraIds.includes(ROUS_SIDE_PLANE_SOURCE)){
  const rousScene=scene(ROUS_SIDE_PLANE_SOURCE),feet=rousScene.getObjectByName('feet')??rousScene,footBox=boxOf(feet),feetPlane=inferGroundedSidePlaneX(feet);
  const arms=rousScene.getObjectByName('arms'),armBox=boxOf(arms);
  for(const region of ['arms','feet'] as const)if(d[region==='arms'?'armsFrom':'feetFrom']===ROUS_SIDE_PLANE_SOURCE){const sourceRegion=rousScene.getObjectByName(region),referenceBox=region==='arms'?armBox:footBox,point=new THREE.Vector3(feetPlane,referenceBox.getCenter(new THREE.Vector3()).y,referenceBox.getCenter(new THREE.Vector3()).z);if(sourceRegion){sourceRegion.updateWorldMatrix(true,false);rousPlaneSources[region]=sourceRegion;rousPlaneLocal[region]=sourceRegion.worldToLocal(point);}}
 }
 const materials:THREE.MeshStandardMaterial[]=[];
    const regions={} as Record<Region,THREE.Group>;
 for(const region of REGIONS){const source=scene(from[region]).getObjectByName(region);if(!source){throw Error('A creature section could not load.');}
    // Facing correction (handoff §5 flipX): mirror this region's own geometry in its local space. The eye
    // region is excluded — it always comes from MYR5's own template (see `from.eye` above), never the
    // flagged roster source, and the eye anchor's X is corrected separately above.
    if(region!=='eye'&&EYE_OVERRIDES[from[region]]?.flipX){source.scale.x*=-1;source.traverse(o=>{const name=o.userData.rigNodeName;if(typeof name==='string'&&/^(Arm|Foot)(Left|Right)$/.test(name))o.userData.rigNodeName=name.endsWith('Left')?name.replace(/Left$/,'Right'):name.replace(/Right$/,'Left');});}
    const wrapper=new THREE.Group();wrapper.name=region;root.add(wrapper);regions[region]=wrapper;
    const bodyOwned=(region==='arms'||region==='feet')&&BODY_OWNED_LIMBS.has(from[region])||(region==='feet'&&BODY_OWNED_FEET.has(from[region]));
    const materialRegion=bodyOwned?'body':region;
    if(bodyOwned){const bodyWrapper=regions.body,fit=fits[region],bodyFit=fits.body,relative=new THREE.Group();relative.name='BodyOwned '+region;relative.position.copy(fit.t).sub(bodyFit.t).divideScalar(bodyFit.s);relative.scale.setScalar(fit.s/bodyFit.s);bodyWrapper.add(relative);relative.add(source);}
    else wrapper.add(source);
    source.traverse(o=>{if(o instanceof THREE.Mesh){if(region==='eye')prepareEyeMesh(o);o.userData.region=materialRegion;o.userData.basePosition=o.position.clone();o.userData.baseScale=o.scale.clone();o.material=(o.material as THREE.MeshStandardMaterial).clone();const m=o.material as THREE.MeshStandardMaterial;m.userData={baseColor:m.color.clone(),baseRough:m.roughness,baseMetal:m.metalness,name:m.name};materials.push(m);}});}
   const lid=new THREE.Mesh(new THREE.SphereGeometry(LID_RADIUS,48,24,0,Math.PI*2,0,.57),new THREE.MeshStandardMaterial({color:STYLES[0].primary,roughness:.58}));lid.position.copy(reference);lid.name='Expression eyelid';lid.userData.region='eye';const eyeTemplate=regions.eye.children[0] as THREE.Group;eyeTemplate.add(lid);
   // R25 eye styles: squinty adds a lower lid (below); bloodshot adds veins that conform to the globe like the iris.
   if(d.eye==='bloodshot'){const veinMaterial=new THREE.MeshStandardMaterial({color:'#b0122b',roughness:.42,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-1});veinMaterial.userData={baseColor:veinMaterial.color.clone(),baseRough:.42,baseMetal:0,name:'Eye vein'};const veins=new THREE.Mesh(bloodshotVeins(),veinMaterial);veins.name='Eye vein';veins.userData={region:'eye',basePosition:veins.position.clone(),baseScale:veins.scale.clone()};eyeTemplate.add(veins);}
   // MYR5's anatomy variants (eye-socket crowns, finger and toe counts) only apply to regions MYR5 supplies.
   const variants=new Map<string,THREE.Object3D>();if(from.head==='myr5')variants.set('head_single',regions.head.children[0]);if(regions.arms.children[0])variants.set('original_arms',regions.arms.children[0]);if(regions.feet.children[0])variants.set('original_feet',regions.feet.children[0]);
   for(const object of [...anatomy.scene.children].filter(o=>!o.name.startsWith('arms_')).concat([...hands.scene.children])){const region=object.name.split('_')[0] as Region;object.traverse(o=>{if(o instanceof THREE.Mesh){o.userData.region=region;o.userData.basePosition=o.position.clone();o.userData.baseScale=o.scale.clone();o.material=(o.material as THREE.MeshStandardMaterial).clone();const m=o.material as THREE.MeshStandardMaterial;m.userData={baseColor:m.color.clone(),baseRough:m.roughness,baseMetal:m.metalness,name:m.name};}});object.removeFromParent();variants.set(object.name,object);}

 const e={root,regions,details,lid,materials,variants,eyeTemplate,eyeCopies:null as THREE.Group|null};
 const hologram=false,parts=false;
   if(e.eyeCopies){e.regions.eye.remove(e.eyeCopies);e.eyeCopies=null;}e.eyeTemplate.visible=true;
  for(const [region,key] of [['head','head_'+d.eyeLayout],['arms','arms_'+d.fingers],['feet','feet_'+d.toes]] as const){if(from[region]!=='myr5')continue;const variant=e.variants.get(key);if(variant&&e.regions[region].children[0]!==variant){e.regions[region].clear();e.regions[region].add(variant);}if(region==='head')variant?.traverse(o=>{o.userData.eyeSockets=EYE_LAYOUTS[d.eyeLayout].eyes;});}
  const fittedSidePlanes:Partial<Record<'arms'|'feet',number>>={};
  for(const region of REGIONS){const style=look(region),group=e.regions[region];
   // The eye region is placed by arrangeEyes below, so its wrapper stays at the origin.
   group.position.set(0,0,0);group.scale.setScalar(1);if(region!=='eye'){group.position.copy(fits[region].t);group.scale.setScalar(fits[region].s);}
   if((region==='arms'||region==='feet')&&rousPlaneLocal[region]){const sourceRegion=rousPlaneSources[region]!;sourceRegion.updateWorldMatrix(true,false);fittedSidePlanes[region]=sourceRegion.localToWorld(rousPlaneLocal[region]!.clone()).x;}
   if(parts){const offsets:Record<Region,number[]>={head:[0,.65,0],eye:[0,.18,1.0],collar:[0,-.1,0],body:[0,-.45,0],arms:[.45,0,0],feet:[0,-.65,0]};group.position.add(new THREE.Vector3().fromArray(offsets[region]));}
   group.traverse(o=>{if(!(o instanceof THREE.Mesh)||o===e.lid)return;const m=o.material as THREE.MeshStandardMaterial;const base=m.userData.baseColor as THREE.Color;const name=m.userData.name as string;const fixed=['Eye ivory','Pupil','Eye glint','Eye vein'].includes(name);
    m.color.copy(base);m.emissive.set(0);m.metalness=m.userData.baseMetal;m.roughness=m.userData.baseRough;m.transparent=false;m.opacity=1;m.depthWrite=true;
    if(style.id!==0&&!fixed){m.color.set(name==='Lilac hair'||name==='Raised scales'?style.accent:style.primary);if(name==='Socket shadow'||name==='Body velvet')m.color.multiplyScalar(.43);m.roughness=style.roughness;m.metalness=style.metalness;m.emissive.set(style.emissive).multiplyScalar(.25);}
    if(hologram){m.color.set(fixed&&name==='Pupil'?'#261336':'#c9b0ea');m.emissive.set('#76518f');m.emissiveIntensity=.55;m.roughness=.25;m.metalness=.1;}
    if(o.name==='Pupil'&&o.userData.pupilType!==d.pupil){o.geometry.dispose();o.geometry=pupilGeometry(d.pupil);o.userData.basePosition=new THREE.Vector3(.04,2.1475,1.183);o.userData.baseScale=new THREE.Vector3(1,1,1);o.userData.pupilType=d.pupil;}
    if(o.name==='Iris'&&o.userData.irisType!==d.pupil){o.geometry.dispose();o.geometry=pupilGeometry(d.pupil);o.geometry.scale(1.48,1.48,1);o.userData.basePosition=new THREE.Vector3(.04,2.1475,1.133);o.userData.baseScale=new THREE.Vector3(1,1,1);o.userData.irisType=d.pupil;}
    if(/^Iris.fiber/.test(o.name))o.visible=d.pupil==='round';
    if(/^Crown.scale/.test(o.name))o.visible=d.styles[region]===0;
    deformMesh(o,region,d);if(region==='eye')conformEyeMesh(o);else if(o.visible){const customSkin=d.materials?.[region]?.textureId?.startsWith('creature-')??false,alternate=from[region]!=='myr5'&&!customSkin;if(style.id!==0){sculptMaterial(o,style,1,d.detail,alternate?coachRelief:undefined);applySparkle(o.material as THREE.MeshPhysicalMaterial,style.sparkle);}}
    if(o.name==='Iris'){const p=o.geometry.attributes.position,colors=new Float32Array(p.count*3);for(let j=0;j<p.count;j++){const a=Math.atan2(p.getY(j),p.getX(j)),r=Math.hypot(p.getX(j),p.getY(j));const shade=.78+.16*Math.sin(a*117+r*35)+.06*Math.cos(a*61);colors[j*3]=shade;colors[j*3+1]=shade;colors[j*3+2]=Math.min(1,shade+.07);}o.geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));m.vertexColors=true;m.needsUpdate=true;}
    if(style.paletteId&&!fixed&&(region==='eye'&&o.name==='Iris'||region!=='eye'&&style.id===0))applyPaletteSurface(m,style);
    // R25: bloodshot whites blush pink; blind eyes are milky, with no pupil or iris fibres.
    if(region==='eye'&&d.eye==='bloodshot'&&name==='Eye ivory')m.color.lerp(new THREE.Color('#ff9c9c'),.28);
    // R25 eye extras, on top of any style: black whites, and a centre in a light shade of the Eyes colour.
    if(region==='eye'&&d.blackSclera&&name==='Eye ivory'){m.color.set('#09080c');m.roughness=.16;}
    if(region==='eye'&&d.colourPupil&&o.name==='Pupil')m.color.set(style.id!==0?style.accent:STYLES[0].accent);
    if(region==='eye'&&d.eye==='blind'){if(o.name==='Pupil'||/^Iris.fiber/.test(o.name))o.visible=false;if(o.name==='Iris'){m.map=null;m.color.set('#dfe7ea');m.roughness=.3;m.needsUpdate=true;}}
   });
  }
  if(Object.keys(fittedSidePlanes).length)root.userData.limbSidePlanes=fittedSidePlanes;
  const cap=({sleepy:1.56,wide:.30,anime:.22,squinty:1.28,bloodshot:.78,blind:.66} as Record<string,number>)[d.eye]??.57;e.lid.geometry.dispose();e.lid.geometry=new THREE.SphereGeometry(LID_RADIUS,48,24,0,Math.PI*2,0,cap);(e.lid.material as THREE.MeshStandardMaterial).color.set(hologram?'#c9b0ea':look('head').primary);
  if(d.eye==='squinty'){const lower=new THREE.Mesh(new THREE.SphereGeometry(LID_RADIUS,48,24,0,Math.PI*2,0,1.2).rotateX(Math.PI),e.lid.material);lower.position.copy(e.lid.position);lower.name='Expression lower eyelid';lower.userData.region='eye';e.eyeTemplate.add(lower);}
  if(d.eyeLayout!=='single'||eyeMoved){e.eyeCopies=arrangeEyes(e.eyeTemplate,d.eyeLayout,eyeOffset,eyeScale,surfaceZ);e.regions.eye.add(e.eyeCopies);e.eyeTemplate.visible=false;}
  const key=JSON.stringify([d.styles,d.detail,d.eyeLayout,d.fingers,d.toes,d.body,d.headFrom,d.armsFrom,d.feetFrom,hologram,parts]);e.details.userData.key=key;
  e.details.children.slice().forEach(o=>{o.traverse(c=>{if(c instanceof THREE.Mesh){c.geometry.dispose();(c.material as THREE.Material).dispose();}});e.details.remove(o);});
  for(const region of REGIONS){
   const style=look(region),original=e.regions[region];
   // Bone and robot structures are sculpted around MYR5's own proportions, so roster parts keep their mesh.
   const own=from[region]==='myr5';
   if(own&&style.id===7&&region!=='head'&&region!=='eye'){original.visible=false;e.details.add(skeletalStructure(region,d));continue;}
   if(own&&style.id===18&&['body','arms','feet'].includes(region)){original.visible=false;e.details.add(robotStructure(region,d));continue;}
   let surface=original;
   // materialCollar()/STYLES only know legacy ids 1-22 (0 and 20 are excluded on purpose above);
   // Flat/Clay/battle-pass family ids (30, 31, -1) fall outside that range and must skip this swap.
   if(own&&region==='collar'&&style.id>0&&style.id<=22&&style.id!==20){original.visible=false;surface=materialCollar(style.id);e.details.add(surface);}
   const growth=growMaterial(surface,style,region,1,d.detail);growth.position.copy(surface.position);growth.scale.copy(surface.scale);e.details.add(growth);
  }
  if(from.head==='myr5'&&look('head').id===7){e.regions.eye.visible=false;e.details.add(boneSockets(d));}
 // Animation pivots fitted to this creature's measured parts; the rig falls back to MYR5's own numbers.
 root.updateMatrixWorld(true);
 const measured=(r:Region)=>boxOf(e.regions[r]);
 const pivots=d.body==='myr5'&&!mixed?null:(()=>{
  const b=measured('body'),h=measured('head'),a=measured('arms'),f=measured('feet');
  const hip=Math.max(.2,f.max.y),neck=Math.max(hip+.2,h.min.y),shoulder=a.isEmpty()?hip:clamp(a.max.y-(a.max.y-a.min.y)*.12,hip,neck);
  return {body:[0,hip,0],head:[0,neck-hip,0],arm:a.isEmpty()?[0,0,0]:[Math.max(.15,b.max.x*.9),shoulder-hip,0],foot:f.isEmpty()?[0,0,0]:[Math.max(.08,(f.max.x-f.min.x)*.25),hip*.44,0]};
 })();
 // Retain unused variants for cleanup after geometry is baked into the animation rig.
 const disposeAssembly=()=>{const geometries=new Set<THREE.BufferGeometry>(),mats=new Set<THREE.Material>();for(const object of [root,...variants.values(),anatomy.scene,hands.scene,...[...sources.values()].map(s=>s.scene)])object.traverse(o=>{if(o instanceof THREE.Mesh){geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])mats.add(m);}});geometries.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());};
 for(const [region,skin]of installedSkins){const selected=regionChoice(d.materials,region),triad=colorTriad(selected?.colorId||'#7f7d78',preview,d.body)??colorTriad('#7f7d78')!,group=e.regions[region];
  let meshes:THREE.Mesh[]=[];group.traverse(object=>{if(object instanceof THREE.Mesh)meshes.push(object);});
  try{await loadInstalledSkinTextures(skin,skinTextures,skinTextureCache);}catch{/* Optional corrupted skin: this whole region keeps its built-in materials. */continue;}
  const previous=meshes.map(mesh=>({mesh,material:mesh.material})),stagedMaterials=new Set<THREE.Material>();
  const stage=(material:THREE.Material)=>{const clone=material.clone();clone.onBeforeCompile=material.onBeforeCompile;clone.customProgramCacheKey=material.customProgramCacheKey.bind(material);stagedMaterials.add(clone);return clone;};
  for(const {mesh}of previous)mesh.material=Array.isArray(mesh.material)?mesh.material.map(stage):stage(mesh.material);
  const results=await Promise.allSettled(meshes.map(mesh=>applyInstalledSkin(mesh,skin,triad,skinTextures,skinTextureCache))),failed=results.find(result=>result.status==='rejected');
  if(failed?.status==='rejected'){for(const state of previous)state.mesh.material=state.material;stagedMaterials.forEach(material=>material.dispose());continue;}
  const replaced=new Set<THREE.Material>();for(const state of previous)for(const material of Array.isArray(state.material)?state.material:[state.material])replaced.add(material);replaced.forEach(material=>material.dispose());
 }
 if(d.golden!==false&&goldenCoach(d.body))root.traverse(object=>{if(!(object instanceof THREE.Mesh))return;for(const material of Array.isArray(object.material)?object.material:[object.material]){const m=material as THREE.MeshStandardMaterial;if(m.color&&object.userData.region!=='eye'){m.color.set('#e8bc4d');m.metalness=.8;m.roughness=.24;}}});
 root.userData.recipe=JSON.parse(JSON.stringify(d));root.userData.eyeOffset=eyeOffset;root.userData.eyeScale=eyeScale;root.userData.eyeSurfaceZ=surfaceZ;root.userData.pivots=pivots;
 return {root,skinTextures,dispose:disposeAssembly};
}
