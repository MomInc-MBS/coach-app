import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';

// Node has no global localStorage in this runtime; unlock-store.ts is defensive about that
// (falls back to "nothing granted" - tested below), but the grant-round-trip tests need a
// real one, so give it a tiny in-memory stand-in.
const memory=new Map();
globalThis.localStorage={
 getItem:k=>memory.has(k)?memory.get(k):null,
 setItem:(k,v)=>memory.set(k,String(v)),
 removeItem:k=>memory.delete(k),
 clear:()=>memory.clear(),
};

const creatorDir=join(dirname(fileURLToPath(import.meta.url)),'..','creature','source','creator');
async function loadCreator(){
 const result=await build({
  stdin:{contents:`export * from './design';export * from './materials-registry';export {isGranted} from './unlock-store';`,resolveDir:creatorDir,loader:'ts'},
  bundle:true,format:'esm',platform:'neutral',write:false,target:'es2022',
 });
 return import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
}
const mod=await loadCreator();
const {fresh,parseRecipe,STYLES,TEXTURES,COLORS,PALETTES,resolveRegionMaterial,colorTriad,isTextureUnlocked,isColorUnlocked,isPaletteUnlocked,grantUnlock,isGranted,FLAT_TEXTURE}=mod;

test('an old recipe (no materials field) parses, round-trips and resolves exactly like today',()=>{
 const old=fresh();delete old.materials;
 const parsed=parseRecipe(JSON.stringify(old));
 assert.equal(parsed.materials,undefined);
 for(const id of [0,3,7,18,20,21,22]){
  const resolved=resolveRegionMaterial(id);
  assert.equal(resolved.id,STYLES[id].id);assert.equal(resolved.primary,STYLES[id].primary);
  assert.equal(resolved.secondary,STYLES[id].secondary);assert.equal(resolved.accent,STYLES[id].accent);
  assert.equal(resolved.roughness,STYLES[id].roughness);assert.equal(resolved.metalness,STYLES[id].metalness);
  assert.equal(resolved.sparkle,0);
 }
});

test('parseRecipe accepts a valid optional materials override and rejects malformed ones',()=>{
 const base=fresh();
 const withMaterial={...base,materials:{head:{textureId:'clay',colorId:'default-gold',sparkle:.5,metallic:.2}}};
 const parsed=parseRecipe(JSON.stringify(withMaterial));
 assert.deepEqual(parsed.materials,withMaterial.materials);
 for(const bad of [
  {...base,materials:{head:{textureId:'clay',colorId:'default-gold',sparkle:1.5,metallic:.2}}},
  {...base,materials:{head:{textureId:123,colorId:'default-gold',sparkle:.5,metallic:.2}}},
  {...base,materials:{notARegion:{textureId:'clay',colorId:'default-gold',sparkle:.5,metallic:.2}}},
 ]) assert.throws(()=>parseRecipe(JSON.stringify(bad)));
});

test('registry has Flat+Clay (always unlocked) plus every legacy family plus the 24 battle-pass textures, all locked by default',()=>{
 assert.equal(isTextureUnlocked(FLAT_TEXTURE),true);
 assert.equal(TEXTURES.filter(t=>t.legacy).length,STYLES.length);
 for(const t of TEXTURES.filter(t=>t.legacy))assert.equal(isTextureUnlocked(t),true);
 const battlePass=TEXTURES.filter(t=>t.unlockRule==='battle-pass');
 assert.equal(battlePass.length,24);
 for(const t of battlePass){assert.equal(isTextureUnlocked(t),false);assert.ok(t.track&&[1,3,5].includes(t.passLevel));}
 assert.equal(PALETTES.length,12);
 for(const p of PALETTES)assert.equal(isPaletteUnlocked(p),false);
});

test('a locked battle-pass texture cannot be applied - resolveRegionMaterial falls back to Flat instead of crashing',()=>{
 const locked=TEXTURES.find(t=>t.unlockRule==='battle-pass');
 const resolved=resolveRegionMaterial(0,{textureId:locked.id,colorId:'default-gold',sparkle:0,metallic:0});
 assert.equal(resolved.id,FLAT_TEXTURE.familyId);
});

test('any colour choice applies to any texture choice, and colours are independently locked/unlocked',()=>{
 const a=resolveRegionMaterial(0,{textureId:'clay',colorId:'default-ruby',sparkle:0,metallic:0});
 const b=resolveRegionMaterial(0,{textureId:'legacy-3',colorId:'default-ruby',sparkle:0,metallic:0});
 assert.equal(a.primary,b.primary);assert.notEqual(a.id,b.id);
 const palette=PALETTES[0];
 assert.equal(colorTriad(palette.id),undefined);
 grantUnlock('palette',palette.id);
 assert.ok(colorTriad(palette.id));
 assert.equal(isGranted('palette',palette.id),true);
});

test('metallic and sparkle are continuous and pass straight through',()=>{
 const resolved=resolveRegionMaterial(0,{textureId:'flat',colorId:'default-slate',sparkle:.73,metallic:.4});
 assert.equal(resolved.sparkle,.73);assert.equal(resolved.metalness,.4);
});
