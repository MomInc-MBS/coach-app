import test from 'node:test';
import assert from 'node:assert/strict';
import {holdXp,repXp,repRate,coachXpMultiplier,performanceMilestones,performanceWeaponTier,
 COSMETIC_LEVEL_XP,COSMETIC_XP_TARGET,cosmeticLevel,PACK_SIZES,COSMETIC_PACK_ODDS} from '../progression-rules.mjs';

test('confirmed shallow minimum and progressive deep five-minute example',()=>{
 assert.equal(holdXp({difficulty:'easy',to:14.99}),0);
 assert.equal(holdXp({difficulty:'easy',to:15}),1);
 assert.equal(holdXp({difficulty:'easy',to:30}),2);
 assert.equal(holdXp({difficulty:'easy',to:60}),4);
 assert.equal(holdXp({difficulty:'expert',to:300}),16+2*20+2*28);
});
test('sampling partial time does not repeatedly round up or duplicate XP',()=>{
 let earned=0,last=0;
 for(let seconds=1;seconds<=300;seconds++){
  earned+=holdXp({difficulty:'expert',from:last,to:seconds,continuousAtFrom:last});last=seconds;
 }
 assert.equal(earned,112);
 assert.equal(holdXp({difficulty:'expert',from:300,to:300,continuousAtFrom:300}),0);
});
test('changing difficulty preserves time and pays only what was performed',()=>{
 const easy=holdXp({difficulty:'easy',to:45});
 const hard=holdXp({difficulty:'expert',from:45,to:60,continuousAtFrom:45});
 assert.equal(easy+hard,7);
});
test('a hold break resets achievement time but not the active XP-rate band',()=>{
 assert.equal(holdXp({difficulty:'expert',from:300,to:360,continuousAtFrom:0}),28);
 assert.equal(performanceMilestones('hold',59).weapon1,false);
 assert.equal(performanceMilestones('hold',300).coach,true);
 assert.equal(performanceMilestones('hold',599).golden,false);
 assert.equal(performanceMilestones('hold',600).golden,true);
});
test('extended bonuses apply only after their continuous-time boundaries',()=>{
 assert.equal(holdXp({difficulty:'expert',from:585,to:600,continuousAtFrom:585}),7);
 assert.equal(holdXp({difficulty:'expert',from:600,to:615,continuousAtFrom:600}),8.75);
 assert.equal(holdXp({difficulty:'expert',from:900,to:915,continuousAtFrom:900}),10.5);
 assert.equal(holdXp({difficulty:'expert',from:1200,to:1215,continuousAtFrom:1200}),14);
 assert.equal(holdXp({difficulty:'expert',from:1800,to:3600,continuousAtFrom:1800}),0);
});
test('rep working sets use the confirmed boundaries, cap, and zero-XP preparation',()=>{
 assert.equal(repRate('expert',7),4);assert.equal(repRate('expert',8),5);
 assert.equal(repRate('expert',11),5);assert.equal(repRate('expert',12),7);
 assert.equal(repRate('expert',15),7);assert.equal(repRate('expert',16),8.75);
 assert.equal(repRate('expert',20),8.75);assert.equal(repRate('expert',21),10.5);
 assert.equal(repRate('expert',25),10.5);assert.equal(repRate('expert',26),14);
 assert.equal(repRate('expert',30),14);assert.equal(repRate('expert',31),0);
 assert.equal(repXp({difficulty:'expert',to:15}),76);
 assert.equal(repXp({difficulty:'expert',to:30,preparation:true}),0);
 assert.equal(repXp({difficulty:'expert',to:100}),repXp({difficulty:'expert',to:30}));
});
test('coach multiplier is additive and no XP level grants an achievement',()=>{
 assert.equal(coachXpMultiplier(20),6);
 assert.equal(holdXp({difficulty:'easy',to:15,unlockedCoaches:20}),6);
 assert.equal(performanceMilestones('reps',15).golden,false);
 assert.equal(performanceWeaponTier('expert',2),17);
 assert.equal(performanceWeaponTier('expert',100),20);
});
test('250 cosmetic levels have strictly increasing costs and exact benchmark endpoint',()=>{
 assert.equal(COSMETIC_LEVEL_XP.length,250);
 const gaps=COSMETIC_LEVEL_XP.slice(1).map((xp,i)=>xp-COSMETIC_LEVEL_XP[i]);
 for(let i=1;i<gaps.length;i++)assert.ok(gaps[i]>gaps[i-1]);
 assert.equal(COSMETIC_XP_TARGET,261600);
 assert.equal(COSMETIC_LEVEL_XP.at(-1),261600);
 assert.equal(cosmeticLevel(261599).level,249);assert.equal(cosmeticLevel(261600).level,250);
});
test('pack content sizes and category odds retain the confirmed values',()=>{
 assert.deepEqual(PACK_SIZES,{uncommon:1,rare:2,legendary:3,secret:3});
 assert.deepEqual(Object.values(COSMETIC_PACK_ODDS).map(o=>o.texture),[3,5,10,20]);
 for(const odds of Object.values(COSMETIC_PACK_ODDS))assert.equal(Object.values(odds).reduce((a,b)=>a+b),100);
});
test('reject invalid progress rather than minting arbitrary XP',()=>{
 assert.throws(()=>holdXp({difficulty:'easy',to:NaN}));
 assert.throws(()=>holdXp({difficulty:'easy',from:20,to:15}));
 assert.throws(()=>repXp({difficulty:'expert',to:1.5}));
 assert.throws(()=>coachXpMultiplier(-1));
});
