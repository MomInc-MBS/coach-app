// Daily circuit (VISUAL-CHANGES-HANDOFF.md §9): 10 push-ups -> 10 squats -> 10 sit-ups ->
// meditation -> food photo. This module is pure logic only (no DOM, no DB) so it can be
// shared by the server (server/worker.mjs, computing from real rows) and the client
// (circuit-ui.mjs, rendering window.coachProgress.circuit) and unit tested directly.
import {exerciseFamily} from './workout-route.mjs';

// ponytail: no sit-up/crunch pose detector exists anywhere in exercise-library.mjs or
// movement-engine.mjs (only isometric core holds: plank/side-plank). Building a real one is
// a movement-detection project, out of scope for "circuit meter + voice". Standing in with
// the existing "High plank" core hold until a real sit-up detector ships -- see
// plan/reports/circuit.md for the flagged gap. Manual mode (the tested path) does not care
// which exercise id is used; only camera mode would show the "wrong" movement name.
export const CIRCUIT_STEPS=Object.freeze([
 {key:'pushups',mode:'pushup',goal:10,voice:true},
 {key:'squats',mode:'squat',goal:10,voice:true},
 {key:'situps',mode:'high-plank',goal:15,voice:true},
 {key:'meditation',mode:null,goal:null,voice:true},
 {key:'food',mode:null,goal:null,voice:false},
]);

// D25 collapses the 10 exercise-library focus groups into the 8 dial sections; meditation
// (core+balance) is a constant track (D9), never a "chosen" style, so it is left out here --
// its step comes only from a completed breathing round, not from completing a core/balance set.
export const STYLE_OF_GROUP=Object.freeze({chest:'chest',legs:'legs',hips:'hips',shoulders:'shoulders',yoga:'yoga',stances:'martial-arts',boxing:'martial-arts',cardio:'cardio'});
export const STYLES=Object.freeze(['chest','legs','hips','shoulders','yoga','martial-arts','cardio']);
export const STEP_TRACKS=Object.freeze([...STYLES,'meditation','food']);
export const MAX_STYLE_STEPS_PER_DAY=3;
export const MAX_STEPS_PER_DAY=5; // 3 styles + food + meditation. 5/day * 7 days = 35/week (D15) falls out for free.
export const STEPS_PER_LEVEL=5,LEVELS_PER_TRACK=5;
export const trackLevel=steps=>Math.min(LEVELS_PER_TRACK,1+Math.floor(Math.max(0,Number(steps)||0)/STEPS_PER_LEVEL));

// rows: [{mode,day,sets}] -- exactly server/worker.mjs's existing workoutProgress() aggregate
// (mode+day grouped COUNT over `workouts`). breathingDays/mealDays: iterables of UTC day
// numbers (Math.floor(ms/86400000)) with >=1 completed breathing session / logged meal.
// today: the current UTC day number.
export function circuitProgress(rows,breathingDays,mealDays,today){
 const byDay=new Map();
 for(const row of rows||[]){
  const style=STYLE_OF_GROUP[exerciseFamily(row.mode)];
  if(!style||!(Number(row.sets)>0)||!Number.isSafeInteger(row.day))continue;
  if(!byDay.has(row.day))byDay.set(row.day,new Set());
  byDay.get(row.day).add(style);
 }
 const breathing=new Set(Array.from(breathingDays||[],Number)),meals=new Set(Array.from(mealDays||[],Number));
 const tracks=Object.fromEntries(STEP_TRACKS.map(t=>[t,0]));
 // ponytail: alphabetical tie-break when >3 styles are touched the same day -- deterministic,
 // not "first completed"; upgrade to completed_at ordering if that distinction ever matters.
 for(const [,styles] of byDay)for(const style of [...styles].sort().slice(0,MAX_STYLE_STEPS_PER_DAY))tracks[style]++;
 for(const day of breathing)tracks.meditation++;
 for(const day of meals)tracks.food++;
 const modesToday=new Set();for(const row of rows||[])if(row.day===today&&Number(row.sets)>0)modesToday.add(row.mode);
 const stepDone={};
 for(const step of CIRCUIT_STEPS){
  if(step.key==='meditation')stepDone[step.key]=breathing.has(today);
  else if(step.key==='food')stepDone[step.key]=meals.has(today);
  else stepDone[step.key]=modesToday.has(step.mode);
 }
 const stylesStepped=[...(byDay.get(today)||[])].sort().slice(0,MAX_STYLE_STEPS_PER_DAY);
 const stepsToday=stylesStepped.length+(stepDone.meditation?1:0)+(stepDone.food?1:0);
 const nextStep=CIRCUIT_STEPS.find(step=>!stepDone[step.key])||null;
 return {
  day:today,
  tracks:Object.fromEntries(STEP_TRACKS.map(t=>[t,{steps:tracks[t],level:trackLevel(tracks[t])}])),
  today:{stepDone,stylesStepped,stepsToday,maxStepsToday:MAX_STEPS_PER_DAY,nextStep:nextStep?.key??null},
 };
}
