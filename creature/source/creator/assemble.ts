import {arrangeEyes} from './anatomy';
import {EYE_LAYOUTS,EYE_REFERENCE,EYE_SCALE_DEFAULT} from './eye-layouts';
import {EYE_OVERRIDES} from './eye-overrides';
import {pupilGeometry} from './pupils';
import {getCoach} from './coaching';
import {prepareEyeMesh,conformEyeMesh,LID_RADIUS} from './eye-surface';
import {sculptMaterial,growMaterial,applySparkle} from './material-language';
import {boneSockets,skeletalStructure,materialCollar,robotStructure} from './skeletal-anatomy';
import {colorTriad,resolveRegionMaterial} from './materials-registry';
import {applyInstalledSkin,type InstalledSkin} from './skin-materials';

import * as THREE from 'three';
import {GLTFLoader,type GLTF} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {REGIONS,STYLES,type Region,type Design} from './design';
import {deformMesh} from './deform';

// Adapted from the existing MYR5 AlienViewer. The app and editor use this assembly.
const modelBuffers=new Map<string,Promise<ArrayBuffer>>();
function bytes(url:string){if(!modelBuffers.has(url))modelBuffers.set(url,fetch(url).then(response=>{if(!response.ok)throw Error('Creature model is unavailable.');return response.arrayBuffer();}).catch(error=>{modelBuffers.delete(url);throw error;}));return modelBuffers.get(url)!;}

type Fit={s:number;t:THREE.Vector3};
const clamp=(v:number,lo:number,hi:number)=>Math.max(lo,Math.min(hi,v));
function boxOf(object:THREE.Object3D|undefined){const box=new THREE.Box3();if(object){object.updateWorldMatrix(true,true);box.setFromObject(object);}return box;}

export type InstalledSkinResolver=(id:string)=>Promise<InstalledSkin|null>;
export async function assembleCreature(d:Design,assetBase:string,resolveInstalledSkin?:InstalledSkinResolver){
 const loader=new GLTFLoader();
 const load=async(name:string)=>loader.parseAsync(await bytes(assetBase+'models/'+name+'.glb'),assetBase+'models/');
 // Each region can come from a different creature. A GLTF scene can only give each node away once,
 // so every distinct source id is parsed once and reused across the regions that name it.
 const from:Record<Region,string>={head:d.headFrom,eye:'myr5',collar:d.body,body:d.body,arms:d.armsFrom,feet:d.feetFrom};
 const extraIds=[...new Set(REGIONS.map(r=>from[r]).filter(id=>id!=='myr5'))];
 const [gltf,anatomy,hands,...extras]=await Promise.all([load('myr5'),load('anatomy'),load('hands-v2'),...extraIds.map(load)]);
 const installedSkins=new Map<Region,InstalledSkin>();
 if(resolveInstalledSkin)for(const region of REGIONS){const id=d.materials?.[region]?.textureId;if(!id?.startsWith('creature-'))continue;try{const skin=await resolveInstalledSkin(id);if(skin?.id===id)installedSkins.set(region,skin);}catch{/* Missing, revoked, offline, or untrusted optional packs fail closed to built-in materials. */}}
 const skinTextures=new Set<THREE.Texture>();
 const sources=new Map<string,GLTF>([['myr5',gltf],...extraIds.map((id,i)=>[id,extras[i]] as [string,GLTF])]);
 const scene=(id:string)=>sources.get(id)!.scene;

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

 const root=new THREE.Group(),details=new THREE.Group();details.name='Style ornaments';root.add(details);
 const materials:THREE.MeshStandardMaterial[]=[];
    const regions={} as Record<Region,THREE.Group>;
   for(const region of REGIONS){const source=scene(from[region]).getObjectByName(region);if(!source){throw Error('A creature section could not load.');}
    // Facing correction (handoff §5 flipX): mirror this region's own geometry in its local space. The eye
    // region is excluded — it always comes from MYR5's own template (see `from.eye` above), never the
    // flagged roster source, and the eye anchor's X is corrected separately above.
    if(region!=='eye'&&EYE_OVERRIDES[from[region]]?.flipX)source.scale.x*=-1;
    const wrapper=new THREE.Group();wrapper.name=region;root.add(wrapper);wrapper.add(source);regions[region]=wrapper;wrapper.traverse(o=>{if(o instanceof THREE.Mesh){if(region==='eye')prepareEyeMesh(o);o.userData.region=region;o.userData.basePosition=o.position.clone();o.userData.baseScale=o.scale.clone();o.material=(o.material as THREE.MeshStandardMaterial).clone();const m=o.material as THREE.MeshStandardMaterial;m.userData={baseColor:m.color.clone(),baseRough:m.roughness,baseMetal:m.metalness,name:m.name};materials.push(m);}});}
   const lid=new THREE.Mesh(new THREE.SphereGeometry(LID_RADIUS,48,24,0,Math.PI*2,0,.57),new THREE.MeshStandardMaterial({color:STYLES[0].primary,roughness:.58}));lid.position.copy(reference);lid.name='Expression eyelid';lid.userData.region='eye';const eyeTemplate=regions.eye.children[0] as THREE.Group;eyeTemplate.add(lid);
   // MYR5's anatomy variants (eye-socket crowns, finger and toe counts) only apply to regions MYR5 supplies.
   const variants=new Map<string,THREE.Object3D>();if(from.head==='myr5')variants.set('head_single',regions.head.children[0]);variants.set('original_arms',regions.arms.children[0]);variants.set('original_feet',regions.feet.children[0]);
   for(const object of [...anatomy.scene.children].filter(o=>!o.name.startsWith('arms_')).concat([...hands.scene.children])){const region=object.name.split('_')[0] as Region;object.traverse(o=>{if(o instanceof THREE.Mesh){o.userData.region=region;o.userData.basePosition=o.position.clone();o.userData.baseScale=o.scale.clone();o.material=(o.material as THREE.MeshStandardMaterial).clone();const m=o.material as THREE.MeshStandardMaterial;m.userData={baseColor:m.color.clone(),baseRough:m.roughness,baseMetal:m.metalness,name:m.name};}});object.removeFromParent();variants.set(object.name,object);}

 const e={root,regions,details,lid,materials,variants,eyeTemplate,eyeCopies:null as THREE.Group|null};
 const hologram=false,parts=false;
   if(e.eyeCopies){e.regions.eye.remove(e.eyeCopies);e.eyeCopies=null;}e.eyeTemplate.visible=true;
  for(const [region,key] of [['head','head_'+d.eyeLayout],['arms','arms_'+d.fingers],['feet','feet_'+d.toes]] as const){if(from[region]!=='myr5')continue;const variant=e.variants.get(key);if(variant&&e.regions[region].children[0]!==variant){e.regions[region].clear();e.regions[region].add(variant);}if(region==='head')variant?.traverse(o=>{o.userData.eyeSockets=EYE_LAYOUTS[d.eyeLayout].eyes;});}
  for(const region of REGIONS){const style=resolveRegionMaterial(d.styles[region],d.materials?.[region]),group=e.regions[region];
   // The eye region is placed by arrangeEyes below, so its wrapper stays at the origin.
   group.position.set(0,0,0);group.scale.setScalar(1);if(region!=='eye'){group.position.copy(fits[region].t);group.scale.setScalar(fits[region].s);}
   if(parts){const offsets:Record<Region,number[]>={head:[0,.65,0],eye:[0,.18,1.0],collar:[0,-.1,0],body:[0,-.45,0],arms:[.45,0,0],feet:[0,-.65,0]};group.position.add(new THREE.Vector3().fromArray(offsets[region]));}
   group.traverse(o=>{if(!(o instanceof THREE.Mesh)||o===e.lid)return;const m=o.material as THREE.MeshStandardMaterial;const base=m.userData.baseColor as THREE.Color;const name=m.userData.name as string;const fixed=['Eye ivory','Pupil','Eye glint'].includes(name);
    m.color.copy(base);m.emissive.set(0);m.metalness=m.userData.baseMetal;m.roughness=m.userData.baseRough;m.transparent=false;m.opacity=1;m.depthWrite=true;
    if(style.id!==0&&!fixed){m.color.set(name==='Lilac hair'||name==='Raised scales'?style.accent:style.primary);if(name==='Socket shadow'||name==='Body velvet')m.color.multiplyScalar(.43);m.roughness=style.roughness;m.metalness=style.metalness;m.emissive.set(style.emissive).multiplyScalar(.25);}
    if(hologram){m.color.set(fixed&&name==='Pupil'?'#261336':'#c9b0ea');m.emissive.set('#76518f');m.emissiveIntensity=.55;m.roughness=.25;m.metalness=.1;}
    if(o.name==='Pupil'&&o.userData.pupilType!==d.pupil){o.geometry.dispose();o.geometry=pupilGeometry(d.pupil);o.userData.basePosition=new THREE.Vector3(.04,2.1475,1.183);o.userData.baseScale=new THREE.Vector3(1,1,1);o.userData.pupilType=d.pupil;}
    if(o.name==='Iris'&&o.userData.irisType!==d.pupil){o.geometry.dispose();o.geometry=pupilGeometry(d.pupil);o.geometry.scale(1.48,1.48,1);o.userData.basePosition=new THREE.Vector3(.04,2.1475,1.133);o.userData.baseScale=new THREE.Vector3(1,1,1);o.userData.irisType=d.pupil;}
    if(/^Iris.fiber/.test(o.name))o.visible=d.pupil==='round';
    if(/^Crown.scale/.test(o.name))o.visible=d.styles[region]===0;
    deformMesh(o,region,d);if(region==='eye')conformEyeMesh(o);else if(o.visible&&style.id!==0){sculptMaterial(o,style,1,d.detail);applySparkle(o.material as THREE.MeshPhysicalMaterial,style.sparkle);}
    if(o.name==='Iris'){const p=o.geometry.attributes.position,colors=new Float32Array(p.count*3);for(let j=0;j<p.count;j++){const a=Math.atan2(p.getY(j),p.getX(j)),r=Math.hypot(p.getX(j),p.getY(j));const shade=.78+.16*Math.sin(a*117+r*35)+.06*Math.cos(a*61);colors[j*3]=shade;colors[j*3+1]=shade;colors[j*3+2]=Math.min(1,shade+.07);}o.geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));m.vertexColors=true;m.needsUpdate=true;}
   });
  }
  const cap=d.eye==='sleepy'?1.56:d.eye==='wide'?.30:.57;e.lid.geometry.dispose();e.lid.geometry=new THREE.SphereGeometry(LID_RADIUS,48,24,0,Math.PI*2,0,cap);(e.lid.material as THREE.MeshStandardMaterial).color.set(hologram?'#c9b0ea':resolveRegionMaterial(d.styles.head,d.materials?.head).primary);
  if(d.eyeLayout!=='single'||eyeMoved){e.eyeCopies=arrangeEyes(e.eyeTemplate,d.eyeLayout,eyeOffset,eyeScale,surfaceZ);e.regions.eye.add(e.eyeCopies);e.eyeTemplate.visible=false;}
  const key=JSON.stringify([d.styles,d.detail,d.eyeLayout,d.fingers,d.toes,d.body,d.headFrom,d.armsFrom,d.feetFrom,hologram,parts]);e.details.userData.key=key;
  e.details.children.slice().forEach(o=>{o.traverse(c=>{if(c instanceof THREE.Mesh){c.geometry.dispose();(c.material as THREE.Material).dispose();}});e.details.remove(o);});
  for(const region of REGIONS){
   const style=resolveRegionMaterial(d.styles[region],d.materials?.[region]),original=e.regions[region];
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
  if(from.head==='myr5'&&resolveRegionMaterial(d.styles.head,d.materials?.head).id===7){e.regions.eye.visible=false;e.details.add(boneSockets(d));}
 // Animation pivots fitted to this creature's measured parts; the rig falls back to MYR5's own numbers.
 root.updateMatrixWorld(true);
 const measured=(r:Region)=>boxOf(e.regions[r]);
 const pivots=d.body==='myr5'&&!mixed?null:(()=>{
  const b=measured('body'),h=measured('head'),a=measured('arms'),f=measured('feet');
  const hip=Math.max(.2,f.max.y),neck=Math.max(hip+.2,h.min.y),shoulder=clamp(a.max.y-(a.max.y-a.min.y)*.12,hip,neck);
  return {body:[0,hip,0],head:[0,neck-hip,0],arm:[Math.max(.15,b.max.x*.9),shoulder-hip,0],foot:[Math.max(.08,(f.max.x-f.min.x)*.25),hip*.44,0]};
 })();
 // Retain unused variants for cleanup after geometry is baked into the animation rig.
 const disposeAssembly=()=>{const geometries=new Set<THREE.BufferGeometry>(),mats=new Set<THREE.Material>();for(const object of [root,...variants.values(),anatomy.scene,hands.scene,...[...sources.values()].map(s=>s.scene)])object.traverse(o=>{if(o instanceof THREE.Mesh){geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])mats.add(m);}});geometries.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());};
 try{
  for(const [region,skin]of installedSkins){const selected=d.materials?.[region],triad=colorTriad(selected?.colorId||'default-slate')??colorTriad('default-slate')!;const group=e.regions[region];
   const tasks:Promise<boolean>[]=[];group.traverse(object=>{if(object instanceof THREE.Mesh)tasks.push(applyInstalledSkin(object,skin,triad,skinTextures));});const results=await Promise.allSettled(tasks),failed=results.find(result=>result.status==='rejected');if(failed?.status==='rejected')throw failed.reason;
  }
 }catch(error){skinTextures.forEach(texture=>texture.dispose());disposeAssembly();throw error;}
 root.userData.recipe=JSON.parse(JSON.stringify(d));root.userData.eyeOffset=eyeOffset;root.userData.eyeScale=eyeScale;root.userData.eyeSurfaceZ=surfaceZ;root.userData.pivots=pivots;
 return {root,skinTextures,dispose:disposeAssembly};
}
