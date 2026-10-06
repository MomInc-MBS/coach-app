import {test,describe,beforeEach,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {STARTER_COACH_IDS,EXCLUDED_COACH_IDS,COACHES,COACH_REQUIREMENTS,PATH_INTRO_COACH_IDS,CHOOSABLE_TRACKS} from '../performance-catalog.mjs';
import {chooseWorkoutPaths,readSelectedTracks,SELECTED_TRACKS_KEY} from '../chosen-styles.mjs';
import {COACH_NAMES,COACH_NAME_META,coachName,cycleCoachName,normalizePun} from '../coach-names.mjs';
import {PERFORMANCE_KEY,readPerformanceProgress,recordPerformanceSession,recordDailyActivity,coachAccess,mergeVerifiedPerformance,validPerformanceState,migratePerformanceAccess} from '../performance-progress.mjs';
import {rosterModels} from '../creature/source/creator/roster.ts';

const BLOB1='roster/23-blob-texture-bodies--blob_creature_3d_model';
const id=suffix=>COACHES.find(c=>c.id.endsWith(suffix))?.id??assert.fail(`no coach ${suffix}`);
const store=()=>{const map=new Map();return {map,getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,String(v))};};
const requirement=coachId=>COACH_REQUIREMENTS.find(c=>c.id===coachId);
// Every coach the old code handed out as a free implicit starter.
const IMPLICIT=COACHES.map(c=>c.id).filter(coachId=>!requirement(coachId));
const FORMERLY_FREE=COACH_REQUIREMENTS.filter(c=>c.id.match(/01-seed-pearo|02-taper-tallstalk--(3d|white)|03-pearl-orb-ring--(abstract|circle)|04-crest-wedge--stylized_3d_character$|07-bulb-sphereling--cute|09-monolith-tanka--(3d_robot|white_horned)|17-shellcap-manyarm--3d_|18-quad-all--wooden_four|23-blob-texture-bodies--cute/)).map(c=>c.id);
const legacy=(overrides={})=>({version:2,sessions:{},days:{},coaches:[...IMPLICIT,...FORMERLY_FREE],goldenCoaches:[],weapons:{},ships:[],completions:{},totalXp:0,excludedCoaches:[],...overrides});
const put=(storage,owner,state)=>storage.setItem(`${PERFORMANCE_KEY}/${owner}`,JSON.stringify(state));
const earnedCoaches=state=>state.coaches.filter(coachId=>!STARTER_COACH_IDS.includes(coachId));

describe('starters and exclusions',()=>{
 test('starters are exactly myr5 and Blob 1',()=>assert.deepEqual([...STARTER_COACH_IDS],['myr5',BLOB1]));
 test('a fresh owner owns only the starters',()=>assert.deepEqual(readPerformanceProgress({storage:store(),owner:'new'}).coaches,['myr5',BLOB1]));
 test('Flyer and Quad 10 are excluded exactly, and nothing else is',()=>{
  assert.deepEqual([...EXCLUDED_COACH_IDS].sort(),['roster/18-quad-all--wooden_robot_3d_model','roster/21-flyer--winged_humanoid_3d_model']);
  assert.ok(COACHES.some(c=>c.id.includes('wooden_four-legged_robot')),'Four-legged 9 stays');
  assert.ok(!COACHES.some(c=>EXCLUDED_COACH_IDS.includes(c.id)));
  assert.ok(!Object.keys(COACH_NAMES).some(coachId=>EXCLUDED_COACH_IDS.includes(coachId)));
 });
 test('rosterModels is filtered and relabelled from the central names',()=>{
  assert.ok(rosterModels.length>=COACHES.length);
  for(const model of rosterModels){
   assert.ok(!EXCLUDED_COACH_IDS.includes(model.id));
   assert.equal(model.label,coachName(model.id));
   assert.match(model.sourceLabel,/^(Seed|Taper|Pearl|Crest|Slope|Ridge|Bulb|Shard|Monolith|Petal|Anvil|Seedpod|Fan|Chisel|Orbital|Spade|Shellcap|Four-legged|Genie|Lume|Curve|Blob)/);
  }
  for(const coach of COACHES.filter(c=>c.id!=='myr5'))assert.ok(rosterModels.some(m=>m.id===coach.id),coach.id);
 });
});

describe('coach names',()=>{
 const metas=Object.entries(COACH_NAME_META);
 test('every catalog and roster coach has two distinct named candidates, no fallback',()=>{
  for(const coach of [...COACHES,...rosterModels]){
   const pair=COACH_NAMES[coach.id];
   assert.ok(pair,`${coach.id} unnamed`);
   assert.equal(pair.length,2);assert.notEqual(pair[0],pair[1]);
   assert.equal(coachName(coach.id),pair[0]);assert.equal(coachName(coach.id,true),pair[1]);
  }
  assert.throws(()=>coachName('roster/unknown--test'),/No coach name/);
 });
 test('catalog labels use the central names and keep the old source label',()=>{
  for(const coach of COACHES){assert.equal(coach.label,coachName(coach.id));assert.ok(coach.sourceLabel);}
  assert.equal(COACHES.find(c=>c.id==='myr5').sourceLabel,'Original MYR5');
  assert.equal(COACHES.find(c=>c.id===BLOB1).sourceLabel,'Blob 1');
 });
 test('every name is unique, compact and annotated with fitness provenance and its two ideas',()=>{
  const seen=new Set();
  for(const [coachId,meta] of metas)for(const n of meta.names){
   const flat=normalizePun(n.name);
   assert.ok(n.person,`${n.name} lacks a person reference`);
   assert.ok(n.workout?.trim(),`${n.name} lacks a workout idea`);
   assert.ok(n.scifi?.trim(),`${n.name} lacks a technology or science-fiction idea`);
   assert.ok(!flat.includes(normalizePun(n.person)),`${n.name} shows the full famous name`);
   assert.ok(n.name.length<=42,`${n.name} is too long for a coach label`);
   assert.ok(!/['’]/.test(n.name),`${n.name} has an apostrophe`);
   assert.ok(!seen.has(n.name),`${n.name} duplicated`);seen.add(n.name);
  }
  assert.equal(seen.size,metas.length*2);
  for(const [coachId,meta] of metas)assert.notEqual(meta.names[0].person,meta.names[1].person,`${coachId} pair repeats a person`);
 });
 test('names follow the mapped workout group',()=>{
  for(const c of COACH_REQUIREMENTS)assert.equal(COACH_NAME_META[c.id].track,c.tracks[0],c.id);
  assert.deepEqual(COACH_NAMES[id('taper-tallstalk--humanoid_robot_3d_model1')][0],'Arnoid Press');
  assert.equal(COACH_NAMES[id('monolith-tanka--boxy_humanoid_3d_model')][0],'Bruce L33 Kick');
  assert.equal(COACH_NAMES[id('petal-wisp--fantasy_creature_3d_model4')][0],'Iyeng-Align Gyro');
 });
 test('original MYR5 and Blob 1 stay recognisable',()=>{
  for(const name of COACH_NAMES.myr5)assert.match(name,/^MYR5 /);
  for(const name of COACH_NAMES[BLOB1])assert.match(name,/^Blob 1 /);
 });
 test('cycleCoachName toggles between the two candidates',()=>{
  const [a,b]=COACH_NAMES.myr5;assert.equal(cycleCoachName('myr5',a),b);assert.equal(cycleCoachName('myr5',b),a);
 });
});

describe('catalog requirements',()=>{
 test('every non-starter coach has a performance requirement; no starter does',()=>{
  const required=COACH_REQUIREMENTS.map(c=>c.id).sort();
  assert.deepEqual(required,COACHES.map(c=>c.id).filter(coachId=>!STARTER_COACH_IDS.includes(coachId)).sort());
  assert.equal(COACH_REQUIREMENTS.length,COACHES.length-2);
  for(const c of COACH_REQUIREMENTS)assert.ok(['easy','medium','hard','expert'].includes(c.difficulty)&&c.groups.length,c.id);
 });
 test('existing mapped difficulties are frozen',()=>{
  const old={'dragon_creature_3d_model':'easy','fantasy_creature_3d_model1':'easy','four-legged_robot_3d_model':'medium','quadruped_robot_3d_model1':'medium','robotic_dog_3d_model':'hard','stylized_worm_3d_model':'expert','low_poly_robot_3d_model':'expert','humanoid_robot_3d_model':'easy','ringed_humanoid_3d_model':'easy','robot_3d_model1':'medium','robotic_figure_3d_model':'expert','mushroom_robot_3d_model':'hard','multi-armed_humanoid_3d_model':'medium','robot_3d_model4':'expert','geometric_robot_3d_model1':'easy','pyramid_head_figure_3d_model':'medium','stylized_humanoid_3d_model':'expert','sand_creature_3d_model':'medium','stylized_humanoid_figure_3d_model':'expert','robot_character_3d_model':'easy','stylized_cartoon_figure_3d_model':'hard','stylized_octopus_3d_model':'expert','boxy_humanoid_3d_model':'easy','robot_3d_model3':'expert','stylized_toy_3d_model':'expert'};
  for(const [stem,level] of Object.entries(old))assert.equal(COACH_REQUIREMENTS.find(c=>c.id.endsWith(`--${stem}`)).difficulty,level,stem);
 });
 test('each choosable path has a distinct easy introductory coach',()=>{
  assert.equal(new Set(Object.values(PATH_INTRO_COACH_IDS)).size,CHOOSABLE_TRACKS.length);
  for(const path of CHOOSABLE_TRACKS)assert.equal(requirement(PATH_INTRO_COACH_IDS[path]).difficulty,'easy');
 });
});

describe('legacy access migration',()=>{
 const owner='guest:legacy';
 let storage;beforeEach(()=>{storage=store();});
 test('old implicit starters do not survive; XP, days, sessions, weapons and ships do',()=>{
  const session={mode:'pushup',group:'chest',kind:'reps',difficulty:'easy',value:15,continuous:0,day:'2026-01-02',xp:40};
  put(storage,owner,legacy({sessions:{s1:session},days:{'2026-01-02':{workoutXp:40,workout:true,meditation:false,food:false}},weapons:{crossbow:2},ships:['analytical'],completions:{'chest/reps/easy':1},totalXp:40}));
  const state=readPerformanceProgress({storage,owner});
  assert.deepEqual(new Set(state.coaches),new Set([...STARTER_COACH_IDS,id('06-ridge-triad--geometric_robot_3d_model1'),id('08-shard-asym--geometric_robot_3d_model'),id('04-crest-wedge--stylized_3d_character')]));
  assert.deepEqual(state.sessions.s1,session);assert.equal(state.totalXp,40);assert.deepEqual(state.weapons,{crossbow:2});assert.deepEqual(state.ships,['analytical']);
  assert.equal(state.days['2026-01-02'].workoutXp,40);assert.equal(state.accessVersion,3);assert.deepEqual(state.paths,[]);
 });
 test('unearned legacy coaches fall away with no sessions',()=>{
  put(storage,owner,legacy());
  assert.deepEqual(readPerformanceProgress({storage,owner}).coaches,['myr5',BLOB1]);
 });
 test('hold milestones, meditation days and golden coaches are reconstructed',()=>{
  const hold={mode:'high-plank',group:'core',kind:'hold',difficulty:'medium',value:700,continuous:700,perDifficultyContinuous:{medium:700},day:'2026-01-03',xp:5};
  const days={};for(const d of ['2026-02-01','2026-02-02','2026-02-03'])days[d]={workoutXp:0,workout:false,meditation:true,food:false};
  const mapped=COACH_REQUIREMENTS.filter(c=>c.groups.includes('core')&&c.difficulty==='medium').map(c=>c.id);
  const meditation=COACH_REQUIREMENTS.filter(c=>c.groups.includes('meditation')&&c.difficulty==='easy').map(c=>c.id);
  put(storage,owner,legacy({sessions:{h:hold},days,coaches:[...IMPLICIT,...FORMERLY_FREE,mapped[0]],goldenCoaches:[mapped[0],FORMERLY_FREE[0]]}));
  const state=readPerformanceProgress({storage,owner});
  assert.deepEqual(new Set(earnedCoaches(state)),new Set([...mapped,...meditation]));
  assert.deepEqual(state.goldenCoaches,[mapped[0]]);
 });
 test('migrated records round-trip: earning after migration persists and is not re-derived away',()=>{
  put(storage,owner,legacy());
  const options={storage,owner};
  recordPerformanceSession({id:'new',mode:'knee-pushup',value:15,day:'2026-03-01'},options);
  const state=readPerformanceProgress(options);
  assert.ok(state.coaches.includes(id('06-ridge-triad--geometric_robot_3d_model1')));
  assert.equal(JSON.parse(storage.getItem(`${PERFORMANCE_KEY}/${owner}`)).accessVersion,3);
  assert.ok(!state.coaches.includes(FORMERLY_FREE[0]));
 });
 test('formerly free coaches are now earned through their new requirement',()=>{
  const options={storage,owner:'earn'};
  recordPerformanceSession({id:'a',mode:'wall-sit',value:420,activeSeconds:420,continuousSeconds:420,day:'2026-03-01'},options);
  const taper=id('02-taper-tallstalk--3d_humanoid_figure');
  assert.equal(requirement(taper).tracks[0],'quads');
  assert.ok(!coachAccess(taper,options),'hard coach needs hard legs');
  recordPerformanceSession({id:'b',mode:'wall-sit',kind:'hold',difficulty:'hard',value:420,activeSeconds:420,continuousSeconds:420,perDifficultyContinuous:{hard:420},day:'2026-03-02'},options);
  assert.ok(coachAccess(taper,options));
 });
 test('migratePerformanceAccess is pure on the record and idempotent',()=>{
  const state=legacy({sessions:{}});const once=migratePerformanceAccess(JSON.parse(JSON.stringify(state)));
  assert.deepEqual(migratePerformanceAccess(JSON.parse(JSON.stringify(once))),once);assert.ok(validPerformanceState(once));
 });
});

describe('owner-scoped workout paths',()=>{
 let storage,saved;
 beforeEach(()=>{storage=store();saved=Object.getOwnPropertyDescriptor(globalThis,'localStorage');});
 afterEach(()=>{if(saved)Object.defineProperty(globalThis,'localStorage',saved);else delete globalThis.localStorage;});
 const intro=paths=>paths.map(p=>PATH_INTRO_COACH_IDS[p]);
 test('choosing grants exactly the two introductory coaches and persists them for that owner only',()=>{
  const a={storage,owner:'a'},b={storage,owner:'b'};
  put(storage,'a',legacy({totalXp:99,days:{'2026-10-04':{workoutXp:99,workout:true,meditation:false,food:false}}}));
  assert.deepEqual(chooseWorkoutPaths(['chest','yoga'],a),['chest','yoga']);
  assert.deepEqual(readSelectedTracks(a),['chest','yoga']);
  const state=readPerformanceProgress(a);
  assert.deepEqual(earnedCoaches(state),intro(['chest','yoga']));assert.equal(state.totalXp,99);
  assert.deepEqual(readSelectedTracks(b),[]);assert.deepEqual(readPerformanceProgress(b).coaches,['myr5',BLOB1]);
 });
 test('the choice ignores a poisoned global store and the legacy global key',()=>{
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:()=>JSON.stringify(['chest','yoga']),setItem(){throw Error('global storage touched');}}});
  assert.deepEqual(readSelectedTracks({storage,owner:'x'}),[]);
  assert.deepEqual(readPerformanceProgress({storage:store(),owner:'x'}).coaches,['myr5',BLOB1]);
  chooseWorkoutPaths(['quads','cardio'],{storage,owner:'x'});
  assert.equal(storage.getItem(SELECTED_TRACKS_KEY),null);
 });
 test('accounts are separate owners',()=>{
  const one={storage,account:{user:{id:'u1'},dataEpoch:1}},two={storage,account:{user:{id:'u2'},dataEpoch:1}};
  chooseWorkoutPaths(['glutes','cardio'],one);
  assert.deepEqual(readSelectedTracks(one),['glutes','cardio']);assert.deepEqual(readSelectedTracks(two),[]);
 });
 test('arms is an alias of arms-shoulders and still grants the arms introduction',()=>{
  const options={storage,owner:'alias'};
  assert.deepEqual(chooseWorkoutPaths(['arms','martial-arts'],options),['arms-shoulders','martial-arts']);
  assert.deepEqual(earnedCoaches(readPerformanceProgress(options)),intro(['arms-shoulders','martial-arts']));
  assert.throws(()=>chooseWorkoutPaths(['arms','arms-shoulders'],{storage,owner:'dup'}),/Exactly 2/);
 });
 test('selection needs exactly two valid paths',()=>{
  for(const bad of [['chest'],['chest','quads','yoga'],['invalid','chest'],[]])assert.throws(()=>chooseWorkoutPaths(bad,{storage,owner:'bad'}),/Exactly 2/);
  assert.deepEqual(readSelectedTracks({storage,owner:'bad'}),[]);
 });
 test('the choice is one-time: repeats are no-ops, a different pair needs reset, and farming is impossible',()=>{
  const options={storage,owner:'once'};
  chooseWorkoutPaths(['chest','yoga'],options);chooseWorkoutPaths(['yoga','chest'],options);
  assert.equal(earnedCoaches(readPerformanceProgress(options)).length,2);
  assert.throws(()=>chooseWorkoutPaths(['quads','cardio'],options),/already chosen/);
  assert.deepEqual(readSelectedTracks(options),['chest','yoga']);
  chooseWorkoutPaths(['quads','cardio'],{...options,reset:true});
  assert.deepEqual(earnedCoaches(readPerformanceProgress(options)),intro(['quads','cardio']));
 });
 test('reset never revokes a coach that was earned',()=>{
  const options={storage,owner:'keep'};
  chooseWorkoutPaths(['chest','yoga'],options);
  recordPerformanceSession({id:'e',mode:'knee-pushup',value:15,day:'2026-03-01'},options);
  chooseWorkoutPaths(['quads','cardio'],{...options,reset:true});
  const state=readPerformanceProgress(options);
  assert.ok(state.coaches.includes(PATH_INTRO_COACH_IDS.chest)&&state.coaches.includes(PATH_INTRO_COACH_IDS.quads));
  assert.ok(!state.coaches.includes(PATH_INTRO_COACH_IDS.yoga));
 });
 test('server-style derivation of a record uses the record, not the client store',()=>{
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:store()});
  chooseWorkoutPaths(['chest','yoga'],{storage:globalThis.localStorage,owner:'client'});
  const record=JSON.parse(JSON.stringify(readPerformanceProgress({storage:store(),owner:'server'})));
  assert.deepEqual(migratePerformanceAccess(record).coaches,['myr5',BLOB1]);
  assert.deepEqual(record.paths,[]);
 });
});

describe('verified merge',()=>{
 const account={user:{id:'u9'},dataEpoch:1,progress:{}};
 test('a legacy remote copy does not resurrect implicit starters; remote paths are adopted',()=>{
  const storage=store();
  chooseWorkoutPaths(['chest','yoga'],{storage,account});
  const remote=legacy({totalXp:5,paths:['cardio','quads'],accessVersion:3,coaches:[...STARTER_COACH_IDS,PATH_INTRO_COACH_IDS.cardio,PATH_INTRO_COACH_IDS.quads]});
  const merged=mergeVerifiedPerformance({...account,progress:{performance:remote}},{storage});
  assert.deepEqual(merged.paths,['cardio','quads']);
  assert.deepEqual(earnedCoaches(merged).sort(),[PATH_INTRO_COACH_IDS.quads,PATH_INTRO_COACH_IDS.cardio].sort());
  const stale=mergeVerifiedPerformance({user:{id:'fresh'},dataEpoch:1,progress:{performance:legacy()}},{storage:store()});
  assert.deepEqual(stale.coaches,['myr5',BLOB1]);
 });
});
