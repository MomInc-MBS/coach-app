import test from 'node:test';
import assert from 'node:assert/strict';
import {buildFullWorkout,circuitExercises,FULL_WORKOUT,styleLadder,maxLevel,tapLevel,sectionPicks} from '../full-workout.mjs';
import {EXERCISES} from '../exercise-library.mjs';

const all=circuitExercises().map(e=>e.id);
const ex=steps=>steps.filter(s=>s.type==='exercise');

test('every checked exercise appears exactly once, endless runner excluded',()=>{
 const steps=buildFullWorkout([...all,'jogging',all[0]],{seed:1});
 assert.deepEqual(ex(steps).map(s=>s.id).sort(),[...all].sort());
 assert(!ex(steps).some(s=>EXERCISES[s.id].endless));
});

test('exercises are grouped into one contiguous block per style with a long break between blocks',()=>{
 const steps=buildFullWorkout(all,{seed:7}),seen=new Set();let last=null;
 for(const s of ex(steps)){if(s.style!==last){assert(!seen.has(s.style),`style ${s.style} split into two blocks`);seen.add(s.style);last=s.style;}}
 steps.forEach((s,i)=>{
  if(s.type!=='break')return;
  const before=steps[i-1],after=steps[i+1];
  assert.equal(before.type,'exercise');assert.equal(after.type,'exercise');assert.equal(s.next.id,after.id);
  const change=before.style!==after.style;
  assert.equal(s.between,change?'styles':'exercises');
  assert.equal(s.seconds,change?FULL_WORKOUT.restBetweenStylesSeconds:FULL_WORKOUT.restBetweenExercisesSeconds);
 });
 assert.equal(steps.filter(s=>s.between==='styles').length,seen.size-1);
 assert.notEqual(steps.at(-1).type,'break');
});

test('shuffle is deterministic per seed and differs across seeds',()=>{
 const a=buildFullWorkout(all,{seed:42}),b=buildFullWorkout(all,{seed:42}),c=buildFullWorkout(all,{seed:43});
 assert.deepEqual(a,b);
 assert.notDeepEqual(ex(a).map(s=>s.id),ex(c).map(s=>s.id));
});

test('empty and single selections are valid',()=>{
 assert.deepEqual(buildFullWorkout([],{seed:1}),[]);
 assert.equal(buildFullWorkout(['squat'],{seed:1}).length,1);
});

test('level ladder: tapping N engages 1..N, tapping a lower engaged switch drops to it, dead rungs ignore taps',()=>{
 assert.equal(tapLevel(0,3),3);assert.equal(tapLevel(3,7),7);assert.equal(tapLevel(7,2),1,'flipping engaged switch 2 down leaves only 1');
 assert.equal(tapLevel(1,1),0);assert.equal(tapLevel(2,6,3),2,'rung above the unlock cap is dead');
});

test('one exercise per powered section at its top engaged level',()=>{
 const all=()=>true,legs=styleLadder('legs');
 assert.deepEqual(sectionPicks({powered:new Set(['legs','chest']),levels:{legs:3,chest:0},canUse:all}),[legs[2].id],'chest is plugged but has no switch on');
 assert.deepEqual(sectionPicks({powered:new Set(),levels:{legs:3},canUse:all}),[],'unplugged contributes nothing');
 assert.deepEqual(sectionPicks({powered:new Set(['legs']),levels:{legs:99},canUse:all}),[legs.at(-1).id],'level clamps to the ladder');
 const cap=id=>legs.slice(0,2).some(e=>e.id===id);
 assert.equal(maxLevel('legs',cap),2);
 assert.deepEqual(sectionPicks({powered:new Set(['legs']),levels:{legs:6},canUse:cap}),[legs[1].id],'locked rungs stay dead');
 const picks=sectionPicks({powered:new Set(['legs','boxing','yoga']),levels:{legs:2,boxing:1,yoga:4},canUse:all});
 assert.equal(picks.length,3);assert.equal(buildFullWorkout(picks,{seed:3}).filter(s=>s.type==='exercise').length,3);
});
