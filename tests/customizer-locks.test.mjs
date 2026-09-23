import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';

// #1 preview locked looks, #102 section-locked bodies, #9 framing: the save path, the lock rules
// and the camera math, without a browser.
const memory=new Map();
globalThis.localStorage={getItem:k=>memory.has(k)?memory.get(k):null,setItem:(k,v)=>memory.set(k,String(v)),removeItem:k=>memory.delete(k),clear:()=>memory.clear()};
const result=await build({
 stdin:{contents:"export * from './creature/source/save-look';export * from './creature/source/profile';export * from './creature/source/creator/materials-registry';export * from './creature/source/creator/track-placements';export * from './creature/source/creator/camera-focus';export * as T from 'three';",resolveDir:process.cwd(),loader:'ts'},
 bundle:true,format:'esm',platform:'neutral',mainFields:['module','main'],write:false,target:'es2022',
});
const m=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
const {saveRecipe,keepOwned,loadRecipe,fresh,RECIPE_KEY,lockSource,resolveRegionMaterial,grantUnlock,findPalette,sectionComplete,bodyLockSection,TRACK_PLACEMENTS,frameRegion,T}=m;

const CHEST_BODY='roster/16-spade-arch--stylized_humanoid_3d_model'; // Spade · Arch 2, Chest only
const DUAL_BODY='roster/16-spade-arch--pyramid_head_figure_3d_model'; // Spade · Arch 1, Chest + Martial Arts
const STARTER_BODY='roster/21-flyer--winged_humanoid_3d_model'; // Flyer 1, no placement
const row=(id,n,levels)=>Object.fromEntries(Array.from({length:n},(_,i)=>[`${id}-${i+1}`,levels]));
const owned={...fresh(),materials:{body:{textureId:'flat',colorId:'default-sapphire',sparkle:0,metallic:0}}};

test('lock sources read like the board: texture track level, aura day, battle pass; owned is null',()=>{
 memory.clear();
 assert.equal(lockSource('chest-plate-steel'),'Chest L1');
 assert.equal(lockSource('arms-rope'),'Arms & Shoulders L3');
 const aura=findPalette('pal-01');assert.equal(lockSource('pal-01'),`Aura day ${aura.unlockAtDay}`);
 assert.equal(lockSource('flat'),null);assert.equal(lockSource('default-ruby'),null);assert.equal(lockSource('creature-anything'),null);
});

test('a locked palette paints only in preview; the normal render still falls back',()=>{
 memory.clear();
 const choice={textureId:'flat',colorId:'pal-01',sparkle:0,metallic:0},palette=findPalette('pal-01');
 assert.notEqual(resolveRegionMaterial(0,choice).primary,palette.colors[0]);
 assert.equal(resolveRegionMaterial(0,choice,true).primary,palette.colors[0]);
});

test('save guard: a locked texture, palette or body forced into the save path is rejected and the last owned look is kept',()=>{
 memory.clear();
 // As devtools could: hand the save path a recipe carrying locked ids directly.
 const forced={...owned,body:CHEST_BODY,headFrom:CHEST_BODY,armsFrom:CHEST_BODY,feetFrom:CHEST_BODY,materials:{body:{textureId:'chest-plate-steel',colorId:'default-sapphire',sparkle:.3,metallic:0},head:{textureId:'flat',colorId:'pal-01',sparkle:0,metallic:0}}};
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

test('sectionComplete: every boss in the section row fully beaten (sample board progress)',()=>{
 assert.equal(sectionComplete('chest',{}),false);
 assert.equal(sectionComplete('chest',row('strider',6,5)),true);
 assert.equal(sectionComplete('chest',{...row('strider',6,5),'strider-6':4}),false,'one boss short');
 assert.equal(sectionComplete('arms',row('wedge',5,5)),true,'placement "arms" is the board\'s Arms & Shoulders row');
 assert.equal(sectionComplete('meditation',row('tanka',4,5)),true);
 assert.equal(sectionComplete('quads',row('strider',6,5)),false);
});

test('body locks: starter bodies never lock, a section body unlocks with its section, the dual body with either',()=>{
 assert.equal(bodyLockSection('myr5',{}),null);assert.equal(bodyLockSection(STARTER_BODY,{}),null);
 assert.equal(bodyLockSection(CHEST_BODY,{}),'Chest');
 assert.equal(bodyLockSection(CHEST_BODY,row('strider',6,5)),null);
 assert.equal(bodyLockSection(DUAL_BODY,{}),'Chest or Martial Arts');
 assert.equal(bodyLockSection(DUAL_BODY,row('cap',3,5)),null);
 assert.ok(TRACK_PLACEMENTS.every(p=>p.unlockRule==='section-complete'));
});

test('a grandfathered saved body still loads and stays saved; a new locked pick is rejected',()=>{
 memory.clear();
 const old={...fresh(),body:CHEST_BODY,headFrom:CHEST_BODY,armsFrom:CHEST_BODY,feetFrom:CHEST_BODY};
 localStorage.setItem(RECIPE_KEY,JSON.stringify(old));
 const loaded=loadRecipe(localStorage);assert.equal(loaded.body,CHEST_BODY);
 const grandfathered=new Set([loaded.body,loaded.headFrom,loaded.armsFrom,loaded.feetFrom]);
 assert.equal(saveRecipe(localStorage,{...loaded,fur:1.2},loaded,grandfathered).body,CHEST_BODY);
 const quads='roster/22-curve--stylized_cartoon_figure_3d_model';
 assert.equal(saveRecipe(localStorage,{...loaded,body:quads,headFrom:quads,armsFrom:quads,feetFrom:quads},loaded,grandfathered).body,CHEST_BODY,'falls back to the last owned body');
});

test('whole-creature framing from the back keeps every corner on screen',()=>{
 const bounds=new T.Box3(new T.Vector3(-1.2,0,-.6),new T.Vector3(1.2,3.9,.6));
 for(const aspect of [.45,1.7]){
  const camera=new T.PerspectiveCamera(36,aspect,.1,50),orbit={target:new T.Vector3(),minDistance:0,maxDistance:0,update(){camera.lookAt(this.target);camera.updateMatrixWorld();}};
  assert(frameRegion(camera,orbit,bounds,1.2,-1));assert(camera.position.z<orbit.target.z);
  for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){const p=new T.Vector3(x,y,z).project(camera);assert(Math.abs(p.x)<1&&Math.abs(p.y)<1&&p.z<1);}
 }
});
