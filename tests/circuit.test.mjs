import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {CIRCUIT_STEPS,circuitProgress,trackLevel,MAX_STYLE_STEPS_PER_DAY,MAX_STEPS_PER_DAY} from '../circuit.mjs';
import {voicePhrases} from '../robot-audio.mjs';

// The exact `default` lines circuit-ui.mjs speaks (plan/muse/voice-lines.csv). Kept as a second
// copy here (rather than imported) so this test still catches a rendering regression even if
// circuit-ui.mjs's own constants are ever renamed or restructured.
const NEXT_LINE={pushups:'Next up: pushups. Chest day energy.',squats:'Next: squats. Legs, assemble.',situps:'Situps next. Crunch time, literally.',meditation:'Next: meditation. Sit. Breathe. Done.'};
const CIRCUIT_DONE_LINE='Circuit done. Rest, champion.';

test('every spoken circuit line has a rendered clip in the existing robot voice pack',async()=>{
 const manifest=JSON.parse(await readFile('voice/manifest.json','utf8'));
 for(const line of [...Object.values(NEXT_LINE),CIRCUIT_DONE_LINE])assert(voicePhrases(line,manifest.phrases).length>0,`missing rendered clip for: ${line}`);
});

test('circuit has the fixed five-step order from VISUAL-CHANGES-HANDOFF §9',()=>{
 assert.deepEqual(CIRCUIT_STEPS.map(s=>s.key),['pushups','squats','situps','meditation','food']);
 assert.equal(CIRCUIT_STEPS.find(s=>s.key==='food').voice,false);
 assert.ok(CIRCUIT_STEPS.filter(s=>s.key!=='food').every(s=>s.voice===true));
});

test('a 4th distinct workout style in a day adds no step (D15: up to 3, one per style)',()=>{
 const today=20000,rows=[
  {mode:'pushup',day:today,sets:1}, // chest
  {mode:'squat',day:today,sets:1}, // legs
  {mode:'tree',day:today,sets:1}, // balance -> meditation domain, not a style
  {mode:'jab-left',day:today,sets:1}, // boxing -> martial-arts
  {mode:'jumping-jack',day:today,sets:1}, // cardio -- the 4th distinct STYLE today
 ];
 const p=circuitProgress(rows,[],[],today);
 assert.equal(p.today.stylesStepped.length,MAX_STYLE_STEPS_PER_DAY);
 // ponytail: deterministic alphabetical tie-break (see circuit.mjs) -- 'martial-arts' sorts
 // last among {cardio,chest,legs,martial-arts} and is the one capped out today.
 assert.deepEqual(p.today.stylesStepped,['cardio','chest','legs']);
 assert.equal(p.tracks['martial-arts'].steps,0);
 assert.equal(p.today.stepsToday,3);
});

test('two workouts in the same style the same day still add only one step',()=>{
 const today=20001,rows=[{mode:'pushup',day:today,sets:1},{mode:'wide-pushup',day:today,sets:3}];
 const p=circuitProgress(rows,[],[],today);
 assert.deepEqual(p.today.stylesStepped,['chest']);
 assert.equal(p.tracks.chest.steps,1);
});

test('meditation and food steps come only from a breathing round / logged meal, not a workout',()=>{
 const today=20002,rows=[{mode:'high-plank',day:today,sets:1},{mode:'knee-balance',day:today,sets:1}];
 const noBreathingNoFood=circuitProgress(rows,[],[],today);
 assert.equal(noBreathingNoFood.today.stepDone.meditation,false);
 assert.equal(noBreathingNoFood.today.stepDone.food,false);
 assert.equal(noBreathingNoFood.today.stylesStepped.length,0); // core/balance are not "chosen styles"
 const withBoth=circuitProgress(rows,[today],[today],today);
 assert.equal(withBoth.today.stepDone.meditation,true);
 assert.equal(withBoth.today.stepDone.food,true);
 assert.equal(withBoth.today.stepsToday,2);
});

test('max steps in a day is 5, which is exactly 35/week if hit every day (D15)',()=>{
 const today=20003,rows=[{mode:'pushup',day:today,sets:1},{mode:'squat',day:today,sets:1},{mode:'jab-left',day:today,sets:1}];
 const p=circuitProgress(rows,[today],[today],today);
 assert.equal(p.today.stepsToday,MAX_STEPS_PER_DAY);
 assert.equal(MAX_STEPS_PER_DAY*7,35);
});

test('circuit step-done flags gate on the exact mode, in fixed order, independent of the ladder',()=>{
 const today=20004,rows=[{mode:'pushup',day:today,sets:1}];
 const p=circuitProgress(rows,[],[],today);
 assert.equal(p.today.stepDone.pushups,true);
 assert.equal(p.today.stepDone.squats,false);
 assert.equal(p.today.nextStep,'squats');
});

test('circuit reports done when all five steps are complete for the day',()=>{
 const today=20005,rows=[{mode:'pushup',day:today,sets:1},{mode:'squat',day:today,sets:1},{mode:'high-plank',day:today,sets:1}];
 const p=circuitProgress(rows,[today],[today],today);
 assert.equal(p.today.nextStep,null);
 // pass-track steps are separate from the circuit checklist: chest (pushup) + legs (squat)
 // are "chosen styles"; the situps stand-in (high-plank, group 'core') is not a style at all
 // (D9/D25 -- meditation's step comes only from the breathing round) + food = 4 pass-track steps.
 assert.equal(p.today.stepsToday,4);
});

test('lifetime per-track steps accumulate across days for later battle-pass leveling (5 steps = 1 level)',()=>{
 const rows=[];
 for(let day=30000;day<30006;day++)rows.push({mode:'pushup',day,sets:1}); // 6 distinct days -> 6 chest steps
 const p=circuitProgress(rows,[],[],30006);
 assert.equal(p.tracks.chest.steps,6);
 assert.equal(trackLevel(0),1);
 assert.equal(trackLevel(4),1);
 assert.equal(trackLevel(5),2);
 assert.equal(trackLevel(6),2);
 assert.equal(p.tracks.chest.level,2);
 assert.equal(trackLevel(24),5);
 assert.equal(trackLevel(9999),5); // capped at 5 levels/track
});

test('specials unlock at level 3 (D17) is checkable from the exposed track level alone',()=>{
 assert.equal(trackLevel(9),2);
 assert.equal(trackLevel(10),3);
 assert.ok(trackLevel(10)>=3);
});
