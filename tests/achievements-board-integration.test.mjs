import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {GUIDE} from '../progression-guide.mjs';
import {EXERCISES} from '../exercise-library.mjs';
import {exerciseDifficulty} from '../performance-catalog.mjs';
import {workoutChoices,workoutLevel,workoutKind} from '../workout-levels.mjs';
import {weaponRewardSummary} from '../weapon-rewards.mjs';
import {PerformanceWorkout} from '../pod/performance-workout.mjs';
import {nextPerformanceChallenge} from '../workout-route-ui.mjs';
const storage=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)};};
test('field manual explains performance unlocks and daily cosmetics without old daily category XP',()=>{
 const text=GUIDE.flatMap(r=>r[3].flat()).join(' ');
 for(const phrase of ['5 uninterrupted minutes','10 uninterrupted minutes','15 reps','250 levels','500 XP','one uncommon pack','one legendary pack','Rest defeats do not unlock coaches'])assert(text.includes(phrase),phrase);
 assert(!text.includes('100 XP for that category'));
 const hub=readFileSync(new URL('../coach-hub.mjs',import.meta.url),'utf8');assert(hub.includes("from './progression-guide.mjs'"));assert(hub.includes('for(const [label,text] of items)'),'weapon tab renders its explanatory paragraphs too');
});
test('every stable exercise ID shows the same level its performance uses, with holds separated',()=>{
 for(const e of Object.values(EXERCISES)){const l=workoutLevel(e.id);assert.equal(l.difficulty,exerciseDifficulty(e.id));assert(l.unlock);assert(l.xp);assert(workoutChoices(e.group,l.kind).some(x=>x.id===e.id));if(e.kind==='hold')assert.equal(workoutKind(e.id),'hold');}
 for(const e of workoutChoices('legs','hold'))assert.equal(e.kind,'hold');
 for(const e of workoutChoices('legs','reps'))assert.equal(e.kind,'reps');
});
test('performance route has meaningful coach targets and no legacy five-round gating',()=>{
 const options={storage:storage(),account:null},reps=nextPerformanceChallenge('squat',options),hold=nextPerformanceChallenge('knee-plank',options);
 assert.equal(reps.goal,15);assert.equal(reps.unit,'reps');assert.equal(hold.goal,300);assert.equal(hold.unit,'seconds');assert.equal(reps.allowed,true);
 const source=readFileSync(new URL('../workout-route-ui.mjs',import.meta.url),'utf8');assert(!source.includes('route.limit'));assert(!source.includes('exerciseRoute'));
});

test('workout labels match the actual controller kind for every stable mode',()=>{
 for(const e of Object.values(EXERCISES)){const controller=new PerformanceWorkout({mode:e.id,kind:e.kind}),kind=workoutKind(e.id);assert.equal(kind,controller.kind==='gentle'?'cardio':controller.kind,e.id);if(e.group==='cardio'&&e.kind==='reps'){assert.match(workoutLevel(e.id).xp,/XP per rep/);assert.match(workoutLevel(e.id).unlock,/15/);}if(e.kind==='pace'&&e.group!=='cardio'){assert.match(workoutLevel(e.id).unlock,/5 active minutes/);assert(!workoutLevel(e.id).unlock.includes('sprint'));}}
});

test('library weapon summaries show actual earned tiers and type-specific performance targets',()=>{
 const options={storage:storage(),account:null},reps=weaponRewardSummary('legs',{kind:'reps',options}),hold=weaponRewardSummary('legs',{kind:'hold',options}),pace=weaponRewardSummary('boxing',{kind:'cardio',options});assert(reps.weapons.every(w=>w.tier===0));assert.match(reps.target,/8.+12.+15/);assert.match(hold.target,/1 uninterrupted minute.+3 minutes.+5 minutes.+10 minutes/);assert.match(pace.target,/5 active minutes/);assert(!pace.target.includes('sprint'));assert(!reps.target.includes('XP'));
});
