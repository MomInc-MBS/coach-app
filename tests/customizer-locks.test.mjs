import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';

// #1 preview locked looks, #102 section-locked bodies, #9 framing: the save path, the lock rules
// and the camera math, without a browser.
const memory=new Map();
globalThis.localStorage={getItem:k=>memory.has(k)?memory.get(k):null,setItem:(k,v)=>memory.set(k,String(v)),removeItem:k=>memory.delete(k),clear:()=>memory.clear()};
const result=await build({
 stdin:{contents:"export * from './creature/source/save-look';export * from './creature/source/profile';export * from './creature/source/creator/materials-registry';export * from './creature/source/creator/track-placements';export * from './creature/source/creator/camera-focus';export {choosePerformancePaths,recordPerformanceSession} from './performance-progress.mjs';export {coachRequirements} from './achievements-board.mjs';export * as T from 'three';",resolveDir:process.cwd(),loader:'ts'},
 bundle:true,format:'esm',platform:'neutral',mainFields:['module','main'],write:false,target:'es2022',
});
const m=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
const {saveRecipe,keepOwned,loadRecipe,fresh,RECIPE_KEY,isLocked,resolveRegionMaterial,grantUnlock,grandfatherSwappedTextures,findPalette,findColor,TEXTURES,sectionComplete,bodyLockSection,TRACK_PLACEMENTS,choosePerformancePaths,recordPerformanceSession,coachRequirements,frameRegion,T}=m;

const CHEST_BODY='roster/16-spade-arch--stylized_humanoid_3d_model'; // Spade · Arch 2, Chest only
const DUAL_BODY='roster/16-spade-arch--pyramid_head_figure_3d_model'; // Spade · Arch 1, Chest + Martial Arts
const STARTER_BODY='roster/23-blob-texture-bodies--blob_creature_3d_model'; // Blob 1
const EXCLUDED_BODY='roster/21-flyer--winged_humanoid_3d_model'; // formerly selectable Flyer 1
const row=(id,n,levels)=>Object.fromEntries(Array.from({length:n},(_,i)=>[`${id}-${i+1}`,levels]));
const owned={...fresh(),materials:{body:{textureId:'flat',colorId:'#2454d6',sparkle:0,metallic:0}}};

test('R18: only the free 13 textures and 15 colours are open; the rest read as locked (no unlock text)',()=>{
 memory.clear();
 assert.equal(isLocked('chest-plate-steel'),true);
 // #140: the legacy textures take the freed slots; the "lame" ones are open.
 assert.equal(isLocked('legacy-15'),true);assert.equal(isLocked('legacy-14'),true);assert.equal(isLocked('legacy-13'),true);
 assert.equal(isLocked('arms-rope'),false);assert.equal(isLocked('chest-rubber-grip'),true);assert.equal(isLocked('legacy-3'),true);assert.equal(isLocked('legacy-4'),false);
 assert.equal(isLocked('pal-01'),true);
 assert.equal(isLocked('flat'),false);assert.equal(isLocked('default-ruby'),true);assert.equal(isLocked('#ff3b30'),false);assert.equal(isLocked('default-gold'),true);assert.equal(isLocked('creature-anything'),false);assert.equal(isLocked('#060409'),false);assert.equal(isLocked('#0a0a0a'),true);
});

test('a locked palette paints only in preview; the normal render still falls back',()=>{
 memory.clear();
 const choice={textureId:'flat',colorId:'pal-01',sparkle:0,metallic:0},palette=findPalette('pal-01');
 assert.notEqual(resolveRegionMaterial(0,choice).primary,palette.colors[0]);
 assert.equal(resolveRegionMaterial(0,choice,true).primary,palette.colors[0]);
});

test('a locked battle-pass texture previews its built-in pattern without changing its unlock status',()=>{
 memory.clear();
 const texture=TEXTURES.find(t=>t.id==='chest-plate-steel');
 const choice={textureId:'chest-plate-steel',colorId:'#ff3b30',sparkle:0,metallic:0};
 const previewed=resolveRegionMaterial(0,choice,true);
 assert.equal(previewed.id,32,'preview paints the Plate Steel family');
 assert.equal(previewed.primary,'#ff3b30','the selected colour stays independent from surface family');
 assert.equal(isLocked(texture.id),true,'renderable preview does not grant a locked texture');
 const real=resolveRegionMaterial(0,choice); // normal assembly still enforces the existing reward gate
 assert.equal(real.detail,'flat');
});

test('save guard: a locked texture, palette or body forced into the save path is rejected and the last owned look is kept',()=>{
 memory.clear();
 // As devtools could: hand the save path a recipe carrying locked ids directly.
 const forced={...owned,body:CHEST_BODY,headFrom:CHEST_BODY,armsFrom:CHEST_BODY,feetFrom:CHEST_BODY,materials:{body:{textureId:'chest-plate-steel',colorId:'#2454d6',sparkle:.3,metallic:0},head:{textureId:'flat',colorId:'pal-01',sparkle:0,metallic:0}}};
 const kept=saveRecipe(localStorage,forced,owned,new Set(['myr5']));
 const stored=JSON.parse(localStorage.getItem(RECIPE_KEY));
 assert.deepEqual(stored,kept);
 assert.deepEqual(stored.materials,owned.materials,'locked body texture falls back to the owned choice; locked head palette (no owned choice) drops to the original style');
 for(const key of ['body','headFrom','armsFrom','feetFrom'])assert.equal(stored[key],'myr5',key);
 assert.doesNotMatch(localStorage.getItem(RECIPE_KEY),/chest-plate-steel|pal-01|spade-arch/);
 assert.equal(localStorage.getItem('myr5-unlocks-v1'),null,'nothing was granted');
});

test('save guard keeps what is owned: granted items, clean recipes unchanged',()=>{
 memory.clear();
 assert.equal(keepOwned(owned,owned,new Set(),{}),owned,'a clean recipe is returned as-is');
 grantUnlock('texture','chest-plate-steel');
 const next={...owned,materials:{body:{...owned.materials.body,textureId:'chest-plate-steel'}}};
 assert.deepEqual(saveRecipe(localStorage,next,owned).materials,next.materials);
});

test('#140 grandfather: a coach saved with a newly locked texture keeps it, once per device, and nothing else is granted',()=>{
 memory.clear();
 const magma={textureId:'legacy-15',colorId:'#7f7d78',sparkle:0,metallic:0},before={...fresh(),materials:{body:magma,head:{...magma,textureId:'flat'}}};
 assert.equal(resolveRegionMaterial(0,magma).detail,'flat','locked for a user who never had it');
 grandfatherSwappedTextures(before);
 assert.equal(isLocked('legacy-15'),false);assert.equal(resolveRegionMaterial(0,magma).detail,'magma');
 assert.deepEqual(saveRecipe(localStorage,before,before).materials,before.materials,'the save guard keeps it');
 grandfatherSwappedTextures({...fresh(),materials:{body:{...magma,textureId:'legacy-14'}}});
 assert.equal(isLocked('legacy-14'),true,'one-time: a later recipe grants nothing');
 assert.ok([...memory.keys()].some(key=>key.startsWith('myr5-unlocks-v2/')&&JSON.parse(memory.get(key)).texture?.some(id=>id.endsWith(':legacy-15'))),'the earned legacy finish stays scoped to its coach');
});

test('sectionComplete: every boss in the section row fully beaten (sample board progress)',()=>{
 assert.equal(sectionComplete('chest',{}),false);
 assert.equal(sectionComplete('chest',row('strider',6,5)),true);
 assert.equal(sectionComplete('chest',{...row('strider',6,5),'strider-6':4}),false,'one boss short');
 assert.equal(sectionComplete('arms',row('wedge',5,5)),true,'placement "arms" is the board\'s Arms & Shoulders row');
 assert.equal(sectionComplete('meditation',row('tanka',4,5)),true);
 assert.equal(sectionComplete('quads',row('strider',6,5)),false);
});

test('body locks use performance ownership and the central requirement, not completed board sections',()=>{
 memory.clear();
 assert.equal(bodyLockSection('myr5',{}),null);assert.equal(bodyLockSection(STARTER_BODY,{}),null);
 assert.equal(bodyLockSection(EXCLUDED_BODY,{}),'Unavailable coach');
 assert.equal(bodyLockSection(CHEST_BODY,{}),coachRequirements(CHEST_BODY).unlock);
 assert.equal(bodyLockSection(CHEST_BODY,row('strider',6,5)),coachRequirements(CHEST_BODY).unlock);
 assert.equal(bodyLockSection(DUAL_BODY,row('cap',3,5)),coachRequirements(DUAL_BODY).unlock);
 recordPerformanceSession({id:'chest-proof',group:'chest',kind:'reps',difficulty:coachRequirements(CHEST_BODY).difficulty,value:15});
 assert.equal(bodyLockSection(CHEST_BODY,{}),null,'real workout proof grants access');
 assert.ok(TRACK_PLACEMENTS.every(p=>p.unlockRule==='performance-milestone'));
});

test('#138 save guard: a new user\'s allowed body saves, a locked one is rejected',()=>{
 memory.clear();choosePerformancePaths(['chest','quads']);
 const ridge='roster/06-ridge-triad--geometric_robot_3d_model1',shard='roster/08-shard-asym--geometric_robot_3d_model';
 const as=id=>({...fresh(),body:id,headFrom:id,armsFrom:id,feetFrom:id});
 assert.equal(saveRecipe(localStorage,as(ridge),fresh()).body,ridge,'first Chest body: allowed');
 assert.equal(saveRecipe(localStorage,as(shard),as(ridge)).body,ridge,'second Chest body: locked, falls back to the last owned body');
});

test('a saved unearned body cannot grandfather access, while non-body look data survives',()=>{
 memory.clear();
 const old={...fresh(),body:CHEST_BODY,headFrom:CHEST_BODY,armsFrom:CHEST_BODY,feetFrom:CHEST_BODY};
 localStorage.setItem(RECIPE_KEY,JSON.stringify(old));
 const loaded=loadRecipe(localStorage);assert.equal(loaded.body,CHEST_BODY);
 const grandfathered=new Set([loaded.body,loaded.headFrom,loaded.armsFrom,loaded.feetFrom]);
 const saved=saveRecipe(localStorage,{...loaded,fur:1.2},loaded,grandfathered);
 assert.equal(saved.body,'myr5');assert.equal(saved.fur,1.2);
 for(const key of ['headFrom','armsFrom','feetFrom'])assert.equal(saved[key],'myr5');
 const quads='roster/22-curve--stylized_cartoon_figure_3d_model';
 assert.equal(saveRecipe(localStorage,{...loaded,body:quads,headFrom:quads,armsFrom:quads,feetFrom:quads},loaded,grandfathered).body,'myr5','an unearned lastOwned body cannot be reused');
 assert.equal(saveRecipe(localStorage,{...loaded,body:EXCLUDED_BODY},loaded,new Set([EXCLUDED_BODY])).body,'myr5','excluded saved IDs cannot be selected');
});

test('ship save guard rejects unearned selection and stale last-owned ship',()=>{
 memory.clear();
 const forced={...fresh(),shipId:'direct',shipColor:'#ff3b30'};
 const saved=saveRecipe(localStorage,forced,{...fresh(),shipId:'analytical'});
 assert.equal(saved.shipId,'supportive');
 assert.equal(saved.shipColor,'#ff3b30','ship colour is independent of ship access');
 assert.equal(JSON.parse(localStorage.getItem(RECIPE_KEY)).shipId,'supportive');
 assert.equal(saveRecipe(localStorage,{...fresh(),shipId:'supportive'},forced).shipId,'supportive');
});

test('whole-creature framing from the back keeps every corner on screen',()=>{
 const bounds=new T.Box3(new T.Vector3(-1.2,0,-.6),new T.Vector3(1.2,3.9,.6));
 for(const aspect of [.45,1.7]){
  const camera=new T.PerspectiveCamera(36,aspect,.1,50),orbit={target:new T.Vector3(),minDistance:0,maxDistance:0,update(){camera.lookAt(this.target);camera.updateMatrixWorld();}};
  assert(frameRegion(camera,orbit,bounds,1.2,-1));assert(camera.position.z<orbit.target.z);
  for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){const p=new T.Vector3(x,y,z).project(camera);assert(Math.abs(p.x)<1&&Math.abs(p.y)<1&&p.z<1);}
 }
});
