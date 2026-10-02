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
  stdin:{contents:`export * from './design';export * from './materials-registry';export {isGranted} from './unlock-store';export {BUILTIN_SURFACE_PROFILES,builtinSurfaceProfile,sampleBuiltinSurface} from './material-patterns';export {surfaceSample,materialFor,sculptMaterial,MATERIAL_REVISION} from './material-language';export {createCoachReliefBudget,refineCoachGeometry} from './material-refinement';export * as THREE from 'three';`,resolveDir:creatorDir,loader:'ts'},
  bundle:true,format:'esm',platform:'neutral',write:false,target:'es2022',
 });
 return import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
}
const mod=await loadCreator();
const {fresh,parseRecipe,STYLES,TEXTURES,COLORS,PALETTES,resolveRegionMaterial,colorTriad,isTextureUnlocked,isColorUnlocked,isPaletteUnlocked,grantUnlock,isGranted,isLocked,FLAT_TEXTURE,BUILTIN_SURFACE_PROFILES,builtinSurfaceProfile,sampleBuiltinSurface,surfaceSample,materialFor,sculptMaterial,MATERIAL_REVISION,textureDefaultMetalness,createCoachReliefBudget,refineCoachGeometry,THREE}=mod;

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

test('registry has Flat+Clay, every legacy family, and stable procedural ids for all 24 battle-pass textures',()=>{
 assert.equal(isTextureUnlocked(FLAT_TEXTURE),true);
 assert.equal(TEXTURES.filter(t=>t.legacy).length,STYLES.length);
 // R18 G1: exactly 13 textures are free (pinned in r18-unlocks.test.mjs); every other one is pack-only, legacy included.
 for(const t of TEXTURES)assert.equal(isTextureUnlocked(t),t.unlockRule==='default');
 assert.equal(TEXTURES.filter(t=>t.unlockRule==='default').length,13);
 assert.equal(TEXTURES.filter(t=>t.unlockRule==='battle-pass').length,TEXTURES.length-13);
 const builtins=TEXTURES.filter(t=>t.familyId>=32).sort((a,b)=>a.familyId-b.familyId);
 assert.equal(builtins.length,24);assert.deepEqual(builtins.map(t=>t.familyId),Array.from({length:24},(_,i)=>32+i));
 for(const [i,t] of builtins.entries()){const p=builtinSurfaceProfile(t.familyId);assert.ok(p,`${t.displayName} profile exists`);assert.equal(p.name,t.displayName,`${t.displayName} keeps its named pattern`);assert.equal(p.id,32+i);assert.equal(textureDefaultMetalness(t.id),p.metalness);}
 assert.deepEqual(BUILTIN_SURFACE_PROFILES.map(p=>p.id),Array.from({length:24},(_,i)=>32+i));
 // The 12 aura-milestone palettes keep their ids, names and unlock days (D32 only cut them to triads).
 assert.deepEqual(PALETTES.filter(p=>p.unlockRule==='aura-milestone').map(p=>[p.id,p.unlockAtDay]),Array.from({length:12},(_,i)=>[`pal-${String(i+1).padStart(2,'0')}`,5*(i+1)]));
 assert.deepEqual(PALETTES.slice(0,12).map(p=>p.displayName),['Morning Mist','River Clay','Static Pop','Night Shift','Tin Star','Meadow Line','Campfire','Signal Jam','Deep Well','Chrome Garden','Sorbet Stand','Foundry Floor']);
 for(const p of PALETTES)assert.equal(isPaletteUnlocked(p),false);
});

test('D32: every palette is a primary/secondary/accent triad of valid hex, with unique ids, names and taglines of at most 6 words',()=>{
 assert.equal(PALETTES.length,12+95);
 for(const p of PALETTES){
  assert.equal(p.colors.length,3,p.id);
  for(const c of p.colors)assert.match(c,/^#[0-9A-F]{6}$/i,p.id);
  assert.ok(p.tagline&&p.tagline.trim().split(/\s+/).length<=6,`${p.id} tagline`);
  if(p.unlockRule==='battle-pass')assert.ok(/^([a-z]+-\d|food):L[1-5]$/.test(p.reward)&&p.unlockAtDay===undefined,p.id);
  else assert.equal(p.unlockRule,'aura-milestone',p.id);
 }
 const unique=key=>assert.equal(new Set(PALETTES.map(key)).size,PALETTES.length);
 unique(p=>p.id);unique(p=>p.displayName.toLowerCase());unique(p=>p.reward??p.id);
 // Pattern bakes are isolated by the whole colour triad; no palette can reuse the wrong secondary/accent maps.
 const primaries=[...PALETTES.map(p=>p.colors[0]),...COLORS.map(c=>c.primary)].map(c=>c.toUpperCase());
 assert.equal(new Set(primaries).size,primaries.length);
 // The triad is used as-is: colours[0..2] -> primary/secondary/accent.
 const p=PALETTES.find(p=>p.id==='pal-40');grantUnlock('palette',p.id);
 assert.deepEqual(colorTriad(p.id),{primary:p.colors[0],secondary:p.colors[1],accent:p.colors[2]});
});

test('a locked battle-pass texture stays locked in normal assembly while its preview uses the named pattern',()=>{
 const locked=TEXTURES.find(t=>t.familyId===32);
 const choice={textureId:locked.id,colorId:'default-ruby',sparkle:0,metallic:0};
 const resolved=resolveRegionMaterial(0,choice);
 assert.equal(resolved.id,FLAT_TEXTURE.familyId,'a normal render still blocks locked texture ids');
 const preview=resolveRegionMaterial(0,choice,true);
 assert.equal(preview.id,locked.familyId);assert.equal(preview.detail,builtinSurfaceProfile(locked.familyId)?.name.toLowerCase().replace(/[^a-z0-9]+/g,'-'));
 assert.equal(preview.primary,colorTriad('default-ruby')?.primary,'preview shows the selected colour over the real pattern');
});

test('all 24 named surfaces return distinguishable phone-scale height/roughness patterns and material relief',()=>{
 const textures=TEXTURES.filter(t=>t.familyId>=32).sort((a,b)=>a.familyId-b.familyId),fingerprints=new Set();
 for(const t of textures){
  const heights=[],rough=[];for(let y=0;y<24;y++)for(let x=0;x<24;x++){const s=surfaceSample(t.familyId,x/24,y/24);assert.ok(Number.isFinite(s.height)&&Number.isFinite(s.rough),t.displayName);heights.push(s.height);rough.push(s.rough);}
  const mean=heights.reduce((a,b)=>a+b,0)/heights.length,variance=heights.reduce((a,b)=>a+(b-mean)**2,0)/heights.length,roughMean=rough.reduce((a,b)=>a+b,0)/rough.length;
  assert.ok(variance>.0001,`${t.displayName} has visible height variation at a 24x24 sample`);
  const signature=heights.map(v=>Math.round(v*255)).join(',');assert.ok(!fingerprints.has(signature),`${t.displayName} does not reuse another texture's pattern`);fingerprints.add(signature);
  const profile=builtinSurfaceProfile(t.familyId);assert.ok(profile);const style=resolveRegionMaterial(0,{textureId:t.id,colorId:'default-slate',sparkle:0,metallic:profile.metalness},true);
  assert.equal(style.id,t.familyId);assert.equal(style.roughness,profile.roughness);assert.equal(style.metalness,profile.metalness);
 }
 assert.equal(fingerprints.size,24);
});

test('all 49 registry choices resolve in preview; saved zero metalness and unlock checks remain intact',()=>{
 assert.equal(TEXTURES.length,49);
 for(const t of TEXTURES){
  const preview=resolveRegionMaterial(0,{textureId:t.id,colorId:'default-slate',sparkle:0,metallic:0},true);
  assert.equal(preview.id,t.familyId,`${t.displayName} preview family`);
  const normally=resolveRegionMaterial(0,{textureId:t.id,colorId:'default-slate',sparkle:0,metallic:0});
  assert.equal(normally.id,isTextureUnlocked(t)?t.familyId:FLAT_TEXTURE.familyId,`${t.displayName} normal unlock gate`);
  assert.equal(resolveRegionMaterial(0,{textureId:t.id,colorId:'default-slate',sparkle:0,metallic:0},true).metalness,0,`${t.displayName} preserves explicit saved slider zero`);
 }
 assert.equal(isLocked('chest-plate-steel'),true);assert.equal(isTextureUnlocked(TEXTURES.find(t=>t.id==='chest-plate-steel')),false);
});

test('repeat-wrapped geometry samples match texture-domain samples for all 24 families and Quilted rises inside each seam',()=>{
 for(const p of BUILTIN_SURFACE_PROFILES){
  const sample=sampleBuiltinSurface(p.id,.217,.438),wrapped=sampleBuiltinSurface(p.id,1.217,-.562);for(const key of ['height','tint','glow','rough'])assert.ok(Math.abs(wrapped[key]-sample[key])<1e-10,`${p.name} repeats ${key}`);
 }
 const center=sampleBuiltinSurface(39,.125,.125),seam=sampleBuiltinSurface(39,.25,.125);
 assert.ok(center.height>seam.height+.2,'Quilted pads stand above the recessed diamond seam');
});

test('every built-in family sculpts measurable vertex relief on a real mesh',()=>{
 const geometry=new THREE.SphereGeometry(.6,32,20),base=geometry.attributes.position.array.slice();
 for(const t of TEXTURES.filter(t=>t.familyId>=32)){
  const style=resolveRegionMaterial(0,{textureId:t.id,colorId:'default-slate',sparkle:0,metallic:textureDefaultMetalness(t.id)??0},true),mesh=new THREE.Mesh(geometry.clone(),new THREE.MeshStandardMaterial());
  sculptMaterial(mesh,style,1,1);
  const after=mesh.geometry.attributes.position.array;let displacement=0;for(let i=0;i<after.length;i+=3)displacement=Math.max(displacement,Math.hypot(after[i]-base[i],after[i+1]-base[i+1],after[i+2]-base[i+2]));
  assert.ok(displacement>.0002,`${t.displayName} deforms actual vertices (${displacement})`);mesh.geometry.dispose();mesh.material.dispose();
 }
 geometry.dispose();
});

test('alternate static meshes refine within budget while authored normals and UV seams stay safe',()=>{
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,1,0,0,0,1,0, 1,0,0,1,1,0,0,1,0],3));
 geometry.setAttribute('normal',new THREE.Float32BufferAttribute([0,0,1,0,0,1,0,0,1, 0,1,0,0,1,0,0,1,0],3));
 geometry.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,1,0,0,1, .25,.25,1,1,.75,.75],2));
 const budget=createCoachReliefBudget(),refined=refineCoachGeometry(geometry,budget);
 assert.ok(refined,'sparse roster surface is refined');const g=refined.geometry;assert.ok(g.attributes.position.count>geometry.attributes.position.count);
 assert.ok(refined.addedTriangles<=budget.perMeshAddedTriangles);assert.ok(refined.addedVertices<=budget.perMeshVertices);assert.ok(g.attributes.position.count<=budget.perMeshVertices);assert.ok(budget.usedTriangles<=240_000);
 g.computeBoundingBox();geometry.computeBoundingBox();for(const axis of ['x','y','z']){assert.ok(Math.abs(g.boundingBox.min[axis]-geometry.boundingBox.min[axis])<1e-6);assert.ok(Math.abs(g.boundingBox.max[axis]-geometry.boundingBox.max[axis])<1e-6);}
 // Midpoint normals remain their authored direction instead of being replaced by faceted face normals.
 let smoothNormal=false,hardNormal=false;for(let i=0;i<g.attributes.position.count;i++){const n=g.attributes.normal;smoothNormal||=n.getZ(i)>.99;hardNormal||=n.getY(i)>.99;}assert.ok(smoothNormal&&hardNormal,'both authored smooth/hard-edge normal families survive refinement');
 const seamMesh=new THREE.Mesh(geometry.clone(),new THREE.MeshStandardMaterial()),style=resolveRegionMaterial(1),seamBudget=createCoachReliefBudget();sculptMaterial(seamMesh,style,1,1,seamBudget);const seamGeometry=seamMesh.geometry,pos=seamGeometry.attributes.position,norm=seamGeometry.attributes.normal,coincident=new Map();
 for(let i=0;i<pos.count;i++){const key=[pos.getX(i),pos.getY(i),pos.getZ(i)].map(v=>Math.round(v*1e5)).join(','),list=coincident.get(key)??[];list.push(i);coincident.set(key,list);}
 let preservedSeams=0;for(const ids of coincident.values())if(ids.length>1){const a=ids[0];let uvSplit=false,normalSplit=false;for(const b of ids.slice(1)){assert.ok(Math.hypot(pos.getX(a)-pos.getX(b),pos.getY(a)-pos.getY(b),pos.getZ(a)-pos.getZ(b))<1e-6,'every duplicate chart position remains coincident after displacement');uvSplit||=Math.hypot(seamGeometry.attributes.uv.getX(a)-seamGeometry.attributes.uv.getX(b),seamGeometry.attributes.uv.getY(a)-seamGeometry.attributes.uv.getY(b))>.01;normalSplit||=Math.hypot(norm.getX(a)-norm.getX(b),norm.getY(a)-norm.getY(b),norm.getZ(a)-norm.getZ(b))>.5;}if(uvSplit){preservedSeams++;assert.ok(normalSplit,'UV chart duplicates retain their authored hard-edge normals');}}
 assert.ok(preservedSeams>=5,'all endpoints and subdivided midpoint copies of the UV seam remain welded in position');
 const boundary=createCoachReliefBudget(29,29,100),firstRefinement=refineCoachGeometry(geometry,boundary),secondRefinement=refineCoachGeometry(geometry,boundary);assert.equal(firstRefinement.addedTriangles,6,'only the first split fits the exact total cap');assert.equal(secondRefinement.addedTriangles,6,'subsequent meshes are charged against the remaining coach budget');assert.equal(boundary.usedTriangles,12);assert.equal(boundary.remainingTriangles,17,'multi-level refinement never exceeds its cumulative bound');firstRefinement.geometry.dispose();secondRefinement.geometry.dispose();
 const limited=createCoachReliefBudget(12,8,8),noRoom=refineCoachGeometry(geometry,limited);assert.equal(noRoom,undefined);assert.equal(limited.usedTriangles,0,'a tight coach budget cleanly skips refinement');
 const animated=geometry.clone();animated.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(new Uint16Array(24),4));animated.setAttribute('skinWeight',new THREE.Float32BufferAttribute(new Float32Array(24),4));const skinBudget=createCoachReliefBudget();assert.equal(refineCoachGeometry(animated,skinBudget),undefined,'skinned geometry safely bypasses the static path');assert.equal(skinBudget.usedTriangles,0);
 const half=geometry.clone();half.setAttribute('halfProbe',new THREE.Float16BufferAttribute([1,1,1,1,1,1],1));const halfBudget=createCoachReliefBudget();assert.equal(refineCoachGeometry(half,halfBudget),undefined,'Three Float16BufferAttribute marker bypasses safe static refinement');assert.equal(halfBudget.usedTriangles,0);
 const flatMesh=new THREE.Mesh(geometry.clone(),new THREE.MeshStandardMaterial()),flatBudget=createCoachReliefBudget();sculptMaterial(flatMesh,resolveRegionMaterial(0,{textureId:'cardio-terry-cloth',colorId:'default-slate',sparkle:0,metallic:0},true),1,0,flatBudget);const refinedBaseline=refined.geometry.attributes.normal,flatNormals=flatMesh.geometry.attributes.normal;assert.equal(flatMesh.geometry.attributes.position.count,refined.geometry.attributes.position.count);for(let i=0;i<flatNormals.count;i++)assert.ok(Math.hypot(flatNormals.getX(i)-refinedBaseline.getX(i),flatNormals.getY(i)-refinedBaseline.getY(i),flatNormals.getZ(i)-refinedBaseline.getZ(i))<1e-6,'zero displacement retains interpolated authored normals');
 const reliefMesh=new THREE.Mesh(geometry.clone(),new THREE.MeshStandardMaterial()),reliefBudget=createCoachReliefBudget();sculptMaterial(reliefMesh,resolveRegionMaterial(0,{textureId:'cardio-terry-cloth',colorId:'default-slate',sparkle:0,metallic:0},true),1,1,reliefBudget);let normalDelta=0;for(let i=0;i<refinedBaseline.count;i++)normalDelta=Math.max(normalDelta,Math.hypot(reliefMesh.geometry.attributes.normal.getX(i)-refinedBaseline.getX(i),reliefMesh.geometry.attributes.normal.getY(i)-refinedBaseline.getY(i),reliefMesh.geometry.attributes.normal.getZ(i)-refinedBaseline.getZ(i)));assert.ok(normalDelta>.005,`nonconstant height adds a measurable normal slope (${normalDelta})`);
 flatMesh.geometry.dispose();flatMesh.material.dispose();reliefMesh.geometry.dispose();reliefMesh.material.dispose();half.dispose();seamGeometry.dispose();seamMesh.material.dispose();g.dispose();geometry.dispose();animated.dispose();
});

test('texture map cache includes the full triad and revision',()=>{
 const style={...resolveRegionMaterial(0,{textureId:'chest-plate-steel',colorId:'default-slate',sparkle:0,metallic:0},true)};
 const a=materialFor(style,1),b=materialFor({...style,secondary:'#012345'},1),c=materialFor({...style,accent:'#fedcba'},1);
 assert.equal(a.userData.materialStyle,32);assert.notEqual(a.map,b.map);assert.notEqual(a.map,c.map);assert.notEqual(b.map,c.map);
 assert.match(a.name,new RegExp(MATERIAL_REVISION));a.dispose();b.dispose();c.dispose();
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
