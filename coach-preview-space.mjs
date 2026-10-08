import {TIERS,makeSky,makeStars,buildTerrain,glowTexture} from './drop-pod-opening.mjs';

// Borrow the supply-drop landscape without starting its opening, lights or particles.
// The coach keeps its existing pod floor and lighting; this is its distant view only.
export function createCoachPreviewSpace(THREE,{pixelRatio=1}={}){
 const tier=TIERS.rare,group=new THREE.Group();group.name='coach-preview-space';
 const background=makeSky(THREE,tier),fog=new THREE.Fog(0x1a1228,28,95);
 const terrain=buildTerrain(THREE,tier);terrain.group.name='supply-drop-ground';
 for(const effect of [terrain.mound,terrain.scorch]){
  terrain.group.remove(effect);effect.geometry.dispose();effect.material.map?.dispose();effect.material.dispose();
 }
 group.add(terrain.group);
 const sky=new THREE.Group();sky.name='supply-drop-sky';
 const uniforms={uTime:{value:0},uDpr:{value:pixelRatio}};
 for(const layer of makeStars(THREE,uniforms))sky.add(layer.pts);
 const nebulaTexture=glowTexture(THREE,'255,255,255',[[0,.55],[.35,.28],[.7,.08],[1,0]]);
 for(const [x,y,z,size,color,opacity] of [[-22,26,-85,110,tier.color,.5],[30,48,-95,95,0x5a3cff,.38],[0,60,-80,120,0x2fd0c0,.18]]){
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:nebulaTexture,color,transparent:true,opacity,depthWrite:false,blending:THREE.AdditiveBlending,fog:false}));
  sprite.position.set(x,y,z);sprite.scale.set(size,size*.7,1);sprite.renderOrder=-2;sky.add(sprite);
 }
 const moon=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTexture(THREE,'200,220,255',[[0,1],[.18,.95],[.22,.35],[.6,.08],[1,0]]),transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,fog:false}));
 moon.name='supply-drop-moon';moon.position.set(-30,34,-85);moon.scale.setScalar(30);sky.add(moon);
 group.add(sky);
 // Front/Back and drag rotations still look out into the same space landscape.
 const reverseSky=sky.clone();reverseSky.name='supply-drop-sky-back';reverseSky.rotation.y=Math.PI;group.add(reverseSky);
 let disposed=false;
 function dispose(){
  if(disposed)return;disposed=true;group.removeFromParent();
  // The reverse sky shares resources with the front. Sprite geometry belongs to
  // Three itself, so collect only this landscape's Mesh/Points geometry.
  const geometries=new Set(),materials=new Set(),textures=new Set([background]);
  group.traverse(object=>{
   if(object.isMesh||object.isPoints)geometries.add(object.geometry);
   if(object.material)for(const material of Array.isArray(object.material)?object.material:[object.material])materials.add(material);
  });
  for(const material of materials){
   for(const value of Object.values(material))if(value?.isTexture)textures.add(value);
   for(const uniform of Object.values(material.uniforms??{})){
    const values=Array.isArray(uniform.value)?uniform.value:[uniform.value];
    for(const value of values)if(value?.isTexture)textures.add(value);
   }
  }
  geometries.forEach(geometry=>geometry.dispose());
  materials.forEach(material=>material.dispose());
  textures.forEach(texture=>texture.dispose());
  group.clear();
 }
 return {group,background,fog,dispose};
}
