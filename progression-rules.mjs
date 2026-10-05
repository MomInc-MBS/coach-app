// Confirmed workout philosophy. Shared pure rules for client, local history and server.
// Counts are active exercise time/repetitions, never rest or camera wall-clock time.
export const PROGRESSION_VERSION=2;
export const DIFFICULTIES=Object.freeze(['easy','medium','hard','expert']);
export const HOLD_XP_PER_MINUTE=Object.freeze([
 Object.freeze([4,8,16]),Object.freeze([8,12,20]),
 Object.freeze([12,16,24]),Object.freeze([16,20,28]),
]);
export const REP_XP=Object.freeze([
 Object.freeze([1,2,4]),Object.freeze([2,3,5]),
 Object.freeze([3,4,6]),Object.freeze([4,5,7]),
]);
export const HOLD_BLOCK_SECONDS=15,HOLD_TARGET_SECONDS=600,HOLD_CAP_SECONDS=1800;
export const HOLD_RECOVERY_SECONDS=15,WORKOUT_REST_SECONDS=30;
export const GOLD_HOLD_SECONDS=600,REP_CAP=30;
export const PREPARATION_REPS=3,SECOND_PREPARATION_TEMPO_SECONDS=5;
export const SPRINT_ROUNDS=5,SPRINT_SECONDS=15,SPRINT_REST_SECONDS=45;
export const MAX_CONSECUTIVE_TRAINING_DAYS=2;
export const PACK_SIZES=Object.freeze({uncommon:1,rare:2,legendary:3});
export const COSMETIC_PACK_ODDS=Object.freeze({
 uncommon:Object.freeze({color:90,'64-bit':7,texture:3}),
 rare:Object.freeze({color:80,'64-bit':15,texture:5}),
 legendary:Object.freeze({color:70,'64-bit':20,texture:10}),
});
export const BENCHMARK=Object.freeze({sessions:120,activeMinutes:30,expertXpPerMinute:28});
export const COSMETIC_XP_TARGET=BENCHMARK.sessions*BENCHMARK.activeMinutes*BENCHMARK.expertXpPerMinute;
export const COSMETIC_LEVEL_COUNT=250;
const transitions=COSMETIC_LEVEL_COUNT-1,firstCost=40;
// Increasing per-level costs, exact 100,800 base-XP endpoint. Additive coach bonuses
// deliberately accelerate this conservative benchmark; achievements never require XP.
export const COSMETIC_LEVEL_XP=Object.freeze(Array.from({length:COSMETIC_LEVEL_COUNT},(_,n)=>
 firstCost*n+Math.floor((COSMETIC_XP_TARGET-firstCost*transitions)*n*(n-1)/(transitions*(transitions-1)))
));

function nonnegative(value,name){if(!Number.isFinite(value)||value<0)throw RangeError(`Invalid ${name}.`);return value;}
function difficultyIndex(value){
 const index=typeof value==='string'?DIFFICULTIES.indexOf(value):value;
 if(!Number.isInteger(index)||index<0||index>=DIFFICULTIES.length)throw RangeError('Invalid difficulty.');
 return index;
}
export function coachXpMultiplier(unlockedCoaches=0){
 if(!Number.isSafeInteger(unlockedCoaches)||unlockedCoaches<0)throw RangeError('Invalid unlocked coach count.');
 return 1+unlockedCoaches*.25;
}
export function holdRate(difficulty,activeSeconds){
 nonnegative(activeSeconds,'active time');
 return HOLD_XP_PER_MINUTE[difficultyIndex(difficulty)][activeSeconds<60?0:activeSeconds<180?1:2];
}
export function extendedHoldMultiplier(continuousSeconds){
 nonnegative(continuousSeconds,'continuous time');
 return continuousSeconds>=1200?2:continuousSeconds>=900?1.5:continuousSeconds>=600?1.25:1;
}
/** Completed blocks only. `from` is already credited active time: no rounding on
 * pause/restart. The owner carries unfinished blocks across breaks in the session.
 * Continuous time is a separate attempt clock, supplied by the session controller. */
export function holdXp({difficulty,from=0,to,continuousAtFrom=0,unlockedCoaches=0}={}){
 nonnegative(from,'credited active time');nonnegative(to,'active time');nonnegative(continuousAtFrom,'continuous time');
 const index=difficultyIndex(difficulty),multiplier=coachXpMultiplier(unlockedCoaches);
 const end=Math.min(HOLD_CAP_SECONDS,to),start=Math.min(HOLD_CAP_SECONDS,from);
 if(end<start)throw RangeError('Active time cannot move backwards.');
 let xp=0;
 for(let block=Math.floor(start/HOLD_BLOCK_SECONDS);block<Math.floor(end/HOLD_BLOCK_SECONDS);block++){
  const activeStart=block*HOLD_BLOCK_SECONDS;
  // The block began before `from` when a controller samples a partial block.
  const continuousStart=Math.max(0,continuousAtFrom+activeStart-from);
  xp+=holdRate(index,activeStart)/4*extendedHoldMultiplier(continuousStart)*multiplier;
 }
 return xp;
}
export function repRate(difficulty,rep){
 if(!Number.isInteger(rep)||rep<1)throw RangeError('Invalid repetition.');
 const rates=REP_XP[difficultyIndex(difficulty)];
 if(rep>REP_CAP)return 0;
 const base=rates[rep<8?0:rep<12?1:2];
 return base*(rep>25?2:rep>20?1.5:rep>15?1.25:1);
}
export function repXp({difficulty,from=0,to,unlockedCoaches=0,preparation=false}={}){
 difficultyIndex(difficulty);
 if(!Number.isSafeInteger(from)||!Number.isSafeInteger(to)||from<0||to<from)throw RangeError('Invalid repetition range.');
 const multiplier=coachXpMultiplier(unlockedCoaches);if(preparation)return 0;
 let xp=0;for(let rep=from+1;rep<=Math.min(REP_CAP,to);rep++)xp+=repRate(difficulty,rep)*multiplier;
 return xp;
}
export function performanceMilestones(kind,value){
 nonnegative(value,'performance');
 if(kind==='hold')return {weapon1:value>=60,weapon2:value>=180,coach:value>=300,golden:value>=GOLD_HOLD_SECONDS,special:value>=GOLD_HOLD_SECONDS};
 if(kind==='reps')return {weapon1:value>=8,weapon2:value>=12,coach:value>=15,golden:false,special:false};
 throw RangeError('Unknown performance kind.');
}
export function performanceWeaponTier(difficulty,repeatedCompletions=0){
 const index=difficultyIndex(difficulty);
 if(!Number.isSafeInteger(repeatedCompletions)||repeatedCompletions<0)throw RangeError('Invalid repeat count.');
 return Math.min(20,index*5+Math.min(5,repeatedCompletions));
}
export function cosmeticLevel(xp){
 nonnegative(xp,'XP');let index=0;
 while(index<COSMETIC_LEVEL_XP.length-1&&xp>=COSMETIC_LEVEL_XP[index+1])index++;
 const max=index===COSMETIC_LEVEL_XP.length-1;
 return {level:index+1,xp,floor:COSMETIC_LEVEL_XP[index],next:max?null:COSMETIC_LEVEL_XP[index+1],
  into:max?0:xp-COSMETIC_LEVEL_XP[index],need:max?0:COSMETIC_LEVEL_XP[index+1]-COSMETIC_LEVEL_XP[index],max};
}
