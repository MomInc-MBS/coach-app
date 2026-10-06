import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';

const repoRoot=join(dirname(fileURLToPath(import.meta.url)),'..');
const creatorDir=join(repoRoot,'creature','source','creator');
const memory=new Map();
globalThis.localStorage={getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,String(value)),removeItem:key=>memory.delete(key),clear:()=>memory.clear()};

async function loadModule(){
 const result=await build({
  stdin:{contents:`export * from './track-placements';export {ROSTER} from './roster';export {choosePerformancePaths} from '../../../performance-progress.mjs';export {coachRequirements} from '../../../achievements-board.mjs';`,resolveDir:creatorDir,loader:'ts'},
  bundle:true,format:'esm',platform:'neutral',write:false,target:'es2022',
 });
 return import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
}
const {TRACK_PLACEMENTS,REJECTED_BODY_IDS,TRACK_IDS,ROSTER,bodyLockSection,choosePerformancePaths,coachRequirements}=await loadModule();
const rosterIds=new Set(ROSTER.map(r=>r.id));

test('50 unique stable ids',()=>{
 const ids=TRACK_PLACEMENTS.map(p=>p.stableId);
 assert.equal(ids.length,50);
 assert.equal(new Set(ids).size,50);
});

test('51 total placements',()=>{
 const total=TRACK_PLACEMENTS.reduce((sum,p)=>sum+p.tracks.length,0);
 assert.equal(total,51);
});

test('exactly one dual placement, and it is Spade · Arch 1',()=>{
 const duals=TRACK_PLACEMENTS.filter(p=>p.tracks.length>1);
 assert.equal(duals.length,1);
 assert.equal(duals[0].displayName,'Spade · Arch 1');
 assert.deepEqual([...duals[0].tracks].sort(),['chest','martial-arts']);
});

test('Chisel · Spire 2 is not pet or mount eligible',()=>{
 const chisel2=TRACK_PLACEMENTS.find(p=>p.displayName==='Chisel · Spire 2');
 assert.ok(chisel2,'Chisel · Spire 2 must be present');
 assert.equal(chisel2.petEligible,false);
 assert.equal(chisel2.mountEligible,false);
});

test('exactly 10 pet-eligible models (the Meditation pet family)',()=>{
 const pets=TRACK_PLACEMENTS.filter(p=>p.petEligible);
 assert.equal(pets.length,10);
 assert.ok(pets.every(p=>p.tracks.includes('meditation')));
});

test('Four-legged 7 is the Meditation starting boss and mount-eligible',()=>{
 const fl7=TRACK_PLACEMENTS.find(p=>p.displayName==='Four-legged 7');
 assert.equal(fl7.bossOf,'meditation');
 assert.equal(fl7.mountEligible,true);
 assert.equal(fl7.petEligible,true);
});

test('every stableId exists in roster.ts and its GLB file exists on disk',()=>{
 for(const p of TRACK_PLACEMENTS){
  assert.ok(rosterIds.has(p.stableId),`${p.stableId} missing from roster.ts`);
  assert.ok(existsSync(join(repoRoot,p.sourceAsset)),`${p.sourceAsset} missing on disk`);
 }
});

test('no rejected id is present',()=>{
 for(const p of TRACK_PLACEMENTS) assert.ok(!REJECTED_BODY_IDS.has(p.stableId),`${p.stableId} is a hidden reject`);
});

test('every placement uses one of the 8 track ids',()=>{
 for(const p of TRACK_PLACEMENTS) for(const t of p.tracks) assert.ok(TRACK_IDS.includes(t),`${t} is not a known track id`);
});

test('body access uses two chosen intro paths and exact central performance requirements',()=>{
 memory.clear();
 const id=name=>TRACK_PLACEMENTS.find(p=>p.displayName===name).stableId;
 const lock=name=>bodyLockSection(id(name),{});
 assert.equal(lock('Blob 1'),null);
 assert.equal(lock('Ridge · Triad 1'),coachRequirements(id('Ridge · Triad 1')).unlock,'a path body is locked before choosing paths');
 choosePerformancePaths(['chest','arms-shoulders']);
 assert.equal(lock('Ridge · Triad 1'),null,'first Chest body');
 assert.equal(lock('Shard · Asym 1'),coachRequirements(id('Shard · Asym 1')).unlock);
 assert.equal(lock('Spade · Arch 1'),coachRequirements(id('Spade · Arch 1')).unlock);
 assert.equal(lock('Taper · Tallstalk 2'),null,'first Arms & Shoulders body');
 assert.equal(lock('Genie · Multi 2'),coachRequirements(id('Genie · Multi 2')).unlock);
 assert.equal(lock('Petal · Wisp 3'),coachRequirements(id('Petal · Wisp 3')).unlock,'a third path gets nothing');
 assert.equal(lock('Four-legged 1'),coachRequirements(id('Four-legged 1')).unlock);
 assert.equal(bodyLockSection(id('Shard · Asym 1'),Object.fromEntries(Array.from({length:6},(_,i)=>[`strider-${i+1}`,5]))),coachRequirements(id('Shard · Asym 1')).unlock,'board section completion never grants access');
 assert.equal(bodyLockSection('roster/01-seed-pearo--3d_character_model',{}),coachRequirements('roster/01-seed-pearo--3d_character_model').unlock,'approved body outside the legacy placement table still locks');
 assert.equal(bodyLockSection('roster/21-flyer--winged_humanoid_3d_model',{}),'Unavailable coach');
 assert.equal(bodyLockSection([...REJECTED_BODY_IDS][0],{}),'Unavailable coach');
});
