import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {readFile} from 'node:fs/promises';
const result=await build({stdin:{contents:`export * from './creature/source/creator/materials-registry';export {materialFor,surfaceSample,growMaterial} from './creature/source/creator/material-language';export {parseRecipe,fresh} from './creature/source/creator/design';export {keepOwned} from './creature/source/save-look';export {STYLES as HAND_STYLES} from './handborne/source/app/catalog';export {parseDesign,designCode,randomize} from './handborne/source/app/recipe';export {isHandStyleUnlocked,assertHandStylesUnlocked,subscribeHandUnlocks} from './handborne/source/app/material-access';export * as THREE from 'three';`,resolveDir:process.cwd(),loader:'ts'},bundle:true,format:'esm',platform:'neutral',write:false,target:'es2022'});
const m=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
test('every Coach texture has the same stable material ID in the hand catalog, and added hand recipes round-trip',()=>{
 for(const texture of m.TEXTURES)assert(m.HAND_STYLES.some(s=>s.id===texture.familyId),texture.displayName);
 for(const texture of m.SPECIAL_TEXTURES){
  const sections=Object.fromEntries(['nails','fingertips','fingers','palm','back_of_hand','wrist'].map(r=>[r,texture.familyId]));
  const hand={sections,pose:'relaxed',nailShape:'family'};
  assert.deepEqual(m.parseDesign(m.designCode(hand)).sections,sections);
  const coach=m.fresh();coach.materials={body:{textureId:texture.id,colorId:texture.defaultColorId,sparkle:.8,metallic:0}};
  assert.equal(m.parseRecipe(JSON.stringify(coach)).materials.body.textureId,texture.id);
 }
 assert.throws(()=>m.parseDesign('HB3-24-24-24-24-24-24-01-01'),'reserved IDs cannot load missing geometry');
});
test('clear volumes retain refraction under glitter and pearl palettes; prism and foil retain distinct optics',()=>{
 for(const id of [14,57,59,61])for(const paletteId of ['glitter-resin','opal-jelly']){
  const style=m.resolveRegionMaterial(0,{textureId:m.TEXTURES.find(t=>t.familyId===id).id,colorId:paletteId,sparkle:0,metallic:0},true);
  const mat=m.materialFor(style,1);assert(mat.transmission>0);assert(mat.thickness>0);assert.equal(mat.metalness,0);mat.dispose();
 }
 const material=id=>m.materialFor(m.resolveRegionMaterial(0,{textureId:id,colorId:id,sparkle:0,metallic:0},true),1);
 const prism=material('prism-crystal'),foil=material('holo-foil');
 assert(prism.dispersion>.5);assert(prism.flatShading);assert.equal(foil.transmission,0);assert.equal(foil.iridescence,1);assert(foil.metalness>.8);
 prism.dispose();foil.dispose();
});
test('published hand and Coach share the exact material implementation',async()=>{
 for(const name of ['material-language.ts','material-patterns.ts','material-refinement.ts','palette-finishes.ts','palettes.json'])
  assert.equal(await readFile('creature/source/creator/'+name,'utf8'),await readFile('handborne/source/app/'+name,'utf8'),name);
});

test('all new textures and colors start locked, remain separate grants, and cannot enter a hand through remix or recipe application',()=>{
 const memory=new Map();globalThis.localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,String(v))};
 globalThis.myr5AuthenticatedAccount={user:{id:'new-material-locks'}};
 const added=m.SPECIAL_TEXTURES;assert.equal(added.length,17); // R25: Bubble Glass retired
 for(const t of added){
  const palette=m.PALETTES.find(p=>p.id===t.defaultColorId);assert(palette);assert.equal(t.unlockRule,'battle-pass');assert.equal(palette.unlockRule,'battle-pass');
  assert.equal(m.isTextureUnlocked(t),false);assert.equal(m.isPaletteUnlocked(palette),false);assert.equal(m.isHandStyleUnlocked(t.familyId),false);
  const selection=Object.fromEntries(['nails','fingertips','fingers','palm','back_of_hand','wrist'].map(r=>[r,t.familyId]));assert.throws(()=>m.assertHandStylesUnlocked(selection),/locked/);
  m.grantUnlock('texture',t.id,'myr5');assert(m.isTextureUnlocked(t));assert.equal(m.isPaletteUnlocked(palette),false);assert.equal(m.isLocked(palette.id,'myr5','color'),true,'earning a texture cannot unlock its matching color');
  const attempted={...m.fresh(),materials:{body:{textureId:t.id,colorId:palette.id,sparkle:0,metallic:0}}};assert.equal(m.keepOwned(attempted).materials,undefined,'unearned matching color cannot be saved');
  m.grantUnlock('palette',palette.id,'myr5');assert(m.isPaletteUnlocked(palette));assert.equal(m.keepOwned(attempted).materials.body.colorId,palette.id);
 }
 const selection=Object.fromEntries(['nails','fingertips','fingers','palm','back_of_hand','wrist'].map(r=>[r,0]));
 for(let seed=0;seed<100;seed++)assert(Object.values(m.randomize(selection,[],seed)).every(id=>id<57));
 delete globalThis.myr5AuthenticatedAccount;delete globalThis.localStorage;
});
test('all twelve new surfaces have distinct masks and actual structural meshes',()=>{
 const signatures=new Set();
 for(const t of m.SPECIAL_TEXTURES.filter(t=>t.familyId>=63)){
  const sample=[];for(let y=0;y<16;y++)for(let x=0;x<16;x++){const v=m.surfaceSample(t.familyId,x/16,y/16);assert(Object.values(v).every(Number.isFinite));sample.push(Math.round(v.height*255),Math.round(v.tint*255));}
  signatures.add(sample.join(','));
  const style=m.resolveRegionMaterial(0,{textureId:t.id,colorId:t.defaultColorId,sparkle:0,metallic:m.textureDefaultMetalness(t.id)},true);
  const group=new m.THREE.Group();group.add(new m.THREE.Mesh(new m.THREE.SphereGeometry(1,12,8),new m.THREE.MeshStandardMaterial()));
  const details=m.growMaterial(group,style,'body',1,1,false);assert(details.children.length>0,t.id+' has structural geometry');
  details.traverse(o=>{if(o.isMesh){assert([...o.geometry.attributes.position.array].every(Number.isFinite));o.geometry.dispose();o.material.dispose();}});
 }
 assert.equal(signatures.size,12);
});

test('hand ownership accepts only the Coach iframe and trusted origin, and clears grants when disposed',()=>{
 const events=new Map(),frame={contentWindow:{postMessage(){}},addEventListener(){},remove(){}};
 globalThis.window={addEventListener:(type,fn)=>events.set(type,fn),removeEventListener:type=>events.delete(type)};
 globalThis.document={createElement:()=>frame,body:{appendChild(){}}};let updates=0;
 const stop=m.subscribeHandUnlocks(()=>updates++),receive=events.get('message'),data={type:'handborne:unlock-state',styles:[63,74,999]};
 receive({origin:'https://untrusted.example',source:frame.contentWindow,data});assert.equal(m.isHandStyleUnlocked(63),false);
 receive({origin:'https://myr5.mominc.online',source:{},data});assert.equal(m.isHandStyleUnlocked(63),false);
 receive({origin:'https://myr5.mominc.online',source:frame.contentWindow,data});assert(m.isHandStyleUnlocked(63));assert(m.isHandStyleUnlocked(74));assert.equal(m.isHandStyleUnlocked(999),false);assert.equal(updates,1);
 stop();assert.equal(m.isHandStyleUnlocked(63),false);delete globalThis.window;delete globalThis.document;
});
