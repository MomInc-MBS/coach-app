import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {readFile} from 'node:fs/promises';
const result=await build({stdin:{contents:`export * from './creature/source/creator/materials-registry';export {materialFor} from './creature/source/creator/material-language';export {parseRecipe,fresh} from './creature/source/creator/design';export {STYLES as HAND_STYLES} from './handborne/source/app/catalog';export {parseDesign,designCode} from './handborne/source/app/recipe';`,resolveDir:process.cwd(),loader:'ts'},bundle:true,format:'esm',platform:'neutral',write:false,target:'es2022'});
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
 for(const id of [14,21,57,58,59,61])for(const paletteId of ['glitter-resin','opal-jelly']){
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
