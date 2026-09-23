// Rank 11b combat tuning. Every number the boss fight needs lives here so the
// owner can retune it — including picking D20's 90s target over the shipped
// 60s-per-rest default (3 x 60s = 180s) — by changing killTargetSeconds alone.
// See plan/COMBAT-TUNING.md for the arithmetic this file produces.
import {dayAt} from './combat.mjs';

export const TAPS_PER_SECOND=2;          // D8/D20: assumed tap rate
export const KILL_TARGET_SECONDS=90;     // D20's target. Audit found the shipped rest default is 60s (user-selectable 30-120s), not the ~30s D20 assumed — owner has not picked yet. Set to REST_SECONDS*RESTS_PER_WORKOUT (180) to use the shipped default instead; the L5/L4 split below holds at either setting (see plan/COMBAT-TUNING.md).
export const REST_SECONDS=60;            // shipped default, pose.html #restDuration / pod/set-flow.mjs start()'s restSeconds=60 default (reports/audit-game.md "Rest timer length between sets")
export const RESTS_PER_WORKOUT=3;

// Base tap damage by level (index = level-1). L1-L4 = level; L5 jumps to 8 (D33: L4 kit ~15% short of the L5 boss).
// A linear level x N base can't reach D33: weapons+pet add the same to L4 and L5, so L4/L5 output never drops below
// 4/5, and 4/5 x 1.1 (L5's 10% kill margin) leaves L4 at most 12% short even with no weapon, pet or special damage.
export const BASE_TAP_DAMAGE=[1,2,3,4,8];
export const WEAPON_1_LEVEL=1,WEAPON_1_BONUS=1; // D22: weapon 1 unlocks at L1
export const WEAPON_2_LEVEL=3,WEAPON_2_BONUS=2; // D22: weapon 2 unlocks at L3
export const PET_LEVEL=4,PET_DPS=5;             // D22: pet unlocks at L4 (aura at L5 is cosmetic only — D22/D7 — so it adds no combat stat)
export const SPECIAL_LEVEL=3;                   // D17: weapon specials unlock at L3; refused below it
// The ONE special-damage knob: everything a day's specials deal together is capped at this share of
// that level's boss max HP. With a special on every cooldown the L4 kit deals 19/s·T x (1 + 0.9 x 0.1) =
// 20.71/s·T against the L5 boss's 0.9 x 27/s·T = 24.3/s·T: 14.8% short at any killTargetSeconds (D33).
// Above ~0.139 the L4 shortfall drops under 12% (tests/combat-tuning.test.mjs).
export const SPECIAL_DAMAGE_FRACTION=0.1;

// [minStreak,multiplier], highest matching breakpoint wins; below all of them the multiplier is 1.
export const STREAK_BREAKPOINTS=[[20,1.5],[10,1.25],[5,1.1]];

export const BOSS_HP_FACTOR=0.9;    // a level's boss HP = this fraction of that level's own kit output over KILL_TARGET_SECONDS — every level's own kit (taps only) clears it with 1/0.9 = 11.1% to spare, at any KILL_TARGET_SECONDS (plan/COMBAT-TUNING.md)
export const DAILY_CAP_FACTOR=2;    // daily cap = this many boss-kills worth of damage, so it never blocks the intended kill

export const BOSS_ATTACK_EVERY_HITS=6; // spectacle only (D7) — no gameplay listener consumes this

export function streakMultiplier(streak){
 const s=Number.isSafeInteger(streak)?streak:1;
 for(const [min,mult] of STREAK_BREAKPOINTS)if(s>=min)return mult;
 return 1;
}
export function kitTapDamage(level){
 const l=Number.isSafeInteger(level)&&level>=1?level:1;
 return BASE_TAP_DAMAGE[Math.min(l,BASE_TAP_DAMAGE.length)-1]+(l>=WEAPON_1_LEVEL?WEAPON_1_BONUS:0)+(l>=WEAPON_2_LEVEL?WEAPON_2_BONUS:0);
}
export function kitPetDps(level){
 const l=Number.isSafeInteger(level)&&level>=1?level:1;
 return l>=PET_LEVEL?PET_DPS:0;
}
// Per-tap damage for live play: kit strength x the streak curve. `combat` is
// whatever shape combat.mjs's exported progress carries ({day,loginStreak,...})
// — read here, never recomputed (combat.mjs owns loginStreak()).
export function tapDamage(level,combat,now=Date.now()){
 const fresh=combat?.day===dayAt(now)&&Number.isSafeInteger(combat.loginStreak)&&combat.loginStreak>=1;
 return kitTapDamage(level)*streakMultiplier(fresh?combat.loginStreak:1);
}
// Total damage a level's own kit can land in `seconds` of tapping, at streak 1
// (the guaranteed floor with no login-streak bonus — a real streak only helps).
export function maxKitDamage(level,seconds=KILL_TARGET_SECONDS){
 return kitTapDamage(level)*TAPS_PER_SECOND*seconds+kitPetDps(level)*seconds;
}
export function bossHp(level,seconds=KILL_TARGET_SECONDS){
 return Math.round(BOSS_HP_FACTOR*maxKitDamage(level,seconds));
}
export function dailyCap(level,seconds=KILL_TARGET_SECONDS){
 return Math.round(DAILY_CAP_FACTOR*maxKitDamage(level,seconds));
}
// Total special damage allowed per boss (per day) at this level; whole numbers so the UI never shows float noise.
export function specialBudget(level,seconds=KILL_TARGET_SECONDS){
 return Math.floor(SPECIAL_DAMAGE_FRACTION*bossHp(level,seconds));
}
