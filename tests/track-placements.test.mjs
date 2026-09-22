import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';

const repoRoot=join(dirname(fileURLToPath(import.meta.url)),'..');
const creatorDir=join(repoRoot,'creature','source','creator');

async function loadModule(){
 const result=await build({
  stdin:{contents:`export * from './track-placements';export {ROSTER} from './roster';`,resolveDir:creatorDir,loader:'ts'},
  bundle:true,format:'esm',platform:'neutral',write:false,target:'es2022',
 });
 return import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
}
const {TRACK_PLACEMENTS,REJECTED_BODY_IDS,TRACK_IDS,ROSTER}=await loadModule();
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
