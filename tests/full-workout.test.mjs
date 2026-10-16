import test from 'node:test';
import assert from 'node:assert/strict';
import {buildFullWorkout,circuitExercises,FULL_WORKOUT} from '../full-workout.mjs';
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
