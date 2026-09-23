// Rank 11b: proves the derived numbers in combat-config.mjs (and the
// arithmetic in plan/COMBAT-TUNING.md) actually hold once wired through the
// real SetFlow tap loop, not just on paper.
import test from 'node:test';
import assert from 'node:assert/strict';
import {SetFlow} from '../pod/set-flow.mjs';
import {KILL_TARGET_SECONDS,TAPS_PER_SECOND,RESTS_PER_WORKOUT,BOSS_ATTACK_EVERY_HITS,dailyCap,bossHp} from '../combat-config.mjs';

// The level-5 boss's fixed HP — both scenarios below measure raw damage
// dealt against this SAME number. In live play coachHealth is self-relative
// (a level-4 player fights a level-4 boss their own kit can clear — see
// pod/set-flow.mjs's coachHealth getter and plan/COMBAT-TUNING.md's per-level
// table); this fixed reference is what proves the level-5 boss genuinely
// requires the level-5 kit, i.e. that reaching level 5 is a real combat
// upgrade and not just a reskin.
const LEVEL_5_BOSS_HP=bossHp(5);

// One workout: RESTS_PER_WORKOUT rests, each carrying its even share of
// KILL_TARGET_SECONDS of tapping at TAPS_PER_SECOND (D20: "spread across the
// 3 rests"). The gap between rests (the set itself) deals no damage and
// doesn't advance the pet clock (pod/set-flow.mjs only ticks the pet between
// taps inside a rest). Returns the raw cumulative damage dealt.
function tapDamageOverWorkout(kitLevel){
 const flow=new SetFlow(null,{now:0});flow.kitLevel=kitLevel;
 const tapIntervalMs=1000/TAPS_PER_SECOND;
 const tapsPerRest=Math.round((KILL_TARGET_SECONDS/RESTS_PER_WORKOUT)*TAPS_PER_SECOND);
 let now=0,landed=0;
 for(let rest=0;rest<RESTS_PER_WORKOUT;rest++){
  now+=45000; // time spent doing the set between rests; irrelevant to combat math
  flow.previewRest(now,180);
  for(let i=0;i<tapsPerRest;i++){now+=tapIntervalMs;if(flow.tap(now))landed++;}
 }
 return {dealt:flow.damage,landed};
}

test('the L5 kit kills the boss within killTargetSeconds of tapping across the 3 rests',()=>{
 const {dealt,landed}=tapDamageOverWorkout(5);
 assert.equal(landed,KILL_TARGET_SECONDS*TAPS_PER_SECOND,'the daily cap must not reject a single tap before the kill');
 assert.ok(dealt>=LEVEL_5_BOSS_HP,`L5 kit dealt ${dealt}, needed ${LEVEL_5_BOSS_HP} to kill in time`);
});

test('the L4 kit does not kill the same boss in the same window',()=>{
 const {dealt}=tapDamageOverWorkout(4);
 assert.ok(dealt<LEVEL_5_BOSS_HP,`L4 kit dealt ${dealt}, which should fall short of ${LEVEL_5_BOSS_HP} — level 5 has to matter`);
});

test('once the daily cap is reached, no further damage events occur',()=>{
 const flow=new SetFlow(null,{now:0});flow.kitLevel=5;
 const cap=dailyCap(5);
 let now=0,taps=0;
 flow.previewRest(now,600);
 // Tap far past what the kill needs so the cap actually gets exercised.
 for(let i=0;i<3000;i++){now+=1000/TAPS_PER_SECOND;if(flow.tap(now))taps++;}
 assert.ok(taps<3000,'the cap should have started rejecting taps well before 3000');
 assert.ok(flow.tapDamageToday>=cap,'accumulated tap damage should have reached the cap');
 const damageAtCap=flow.damage;
 for(let i=0;i<50;i++){now+=1000/TAPS_PER_SECOND;assert.equal(flow.tap(now),null,'no hit event once the cap is reached');}
 assert.equal(flow.special({type:'cannon',tier:20},{now}).reason,'daily-cap','specials are capped too');
 assert.equal(flow.damage,damageAtCap,'no further damage should be dealt once the cap is reached');
});

test('the streak curve from the config reaches live taps',()=>{
 const flow=new SetFlow(null,{now:0});flow.kitLevel=3; // L3: no pet, so the hit is pure tap damage (6)
 flow.combat={day:0,loginStreak:20,breathingCompleted:false};flow.previewRest(0);
 assert.equal(flow.tap(500).damage,6*1.5);
});

test('boss attacks are a flag on the hit and change no numbers (D7 spectacle only)',()=>{
 const flow=new SetFlow(null,{now:0});flow.previewRest(0);
 const hits=Array.from({length:BOSS_ATTACK_EVERY_HITS*2},(_,i)=>flow.tap(500*(i+1)));
 assert.deepEqual(hits.map(h=>h.bossAttack),hits.map((_,i)=>(i+1)%BOSS_ATTACK_EVERY_HITS===0));
 assert.ok(hits.every(h=>h.damage===hits[0].damage),'an attack hit deals the same damage as any other');
});
