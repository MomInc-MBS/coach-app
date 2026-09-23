// Rank 11b combat tuning. Every number the boss fight needs lives here so the
// owner can retune it — including picking D20's 90s target over the shipped
// 60s-per-rest default (3 x 60s = 180s) — by changing killTargetSeconds alone.
// See plan/COMBAT-TUNING.md for the arithmetic this file produces.
import {dayAt} from './combat.mjs';

export const TAPS_PER_SECOND=2;          // D8/D20: assumed tap rate
export const KILL_TARGET_SECONDS=90;     // D20's target. Audit found the shipped rest default is 60s (user-selectable 30-120s), not the ~30s D20 assumed — owner has not picked yet. Set to REST_SECONDS*RESTS_PER_WORKOUT (180) to use the shipped default instead; the L5/L4 split below holds at either setting (see plan/COMBAT-TUNING.md).
export const REST_SECONDS=60;            // shipped default, pose.html #restDuration / pod/set-flow.mjs start()'s restSeconds=60 default (reports/audit-game.md "Rest timer length between sets")
export const RESTS_PER_WORKOUT=3;

export const BASE_TAP_DAMAGE_PER_LEVEL=1; // base tap damage == level * this
export const WEAPON_1_LEVEL=1,WEAPON_1_BONUS=1; // D22: weapon 1 unlocks at L1
export const WEAPON_2_LEVEL=3,WEAPON_2_BONUS=2; // D22: weapon 2 unlocks at L3
export const PET_LEVEL=4,PET_DPS=5;             // D22: pet unlocks at L4 (aura at L5 is cosmetic only — D22/D7 — so it adds no combat stat)
export const SPECIAL_LEVEL=3;                   // D17: weapon specials unlock at L3; refused below it
// The ONE special-damage knob: everything a day's specials deal together is capped at this share of
// that level's boss max HP. 0.05 keeps D8/D20 true even with a special on every cooldown: L4 kit =
// 19/s·T x (1 + 0.95 x 0.05) = 19.90/s·T, still under the L5 boss's 19.95/s·T at any killTargetSeconds.
// Above ~0.052 the L4 kit plus specials would kill the L5 boss (tests/combat-tuning.test.mjs).
export const SPECIAL_DAMAGE_FRACTION=0.05;

// [minStreak,multiplier], highest matching breakpoint wins; below all of them the multiplier is 1.
export const STREAK_BREAKPOINTS=[[20,1.5],[10,1.25],[5,1.1]];

export const BOSS_HP_FACTOR=0.95;   // a level's boss HP = this fraction of that level's own kit output over KILL_TARGET_SECONDS — killable by that level's kit, not by the level below (see plan/COMBAT-TUNING.md for why 0.95 keeps that true at any KILL_TARGET_SECONDS)
export const DAILY_CAP_FACTOR=2;    // daily cap = this many boss-kills worth of damage, so it never blocks the intended kill

export const BOSS_ATTACK_EVERY_HITS=6; // spectacle only (D7) — no gameplay listener consumes this

export function streakMultiplier(streak){
 const s=Number.isSafeInteger(streak)?streak:1;
 for(const [min,mult] of STREAK_BREAKPOINTS)if(s>=min)return mult;
 return 1;
}
export function kitTapDamage(level){
 const l=Number.isSafeInteger(level)&&level>=1?level:1;
 return l*BASE_TAP_DAMAGE_PER_LEVEL+(l>=WEAPON_1_LEVEL?WEAPON_1_BONUS:0)+(l>=WEAPON_2_LEVEL?WEAPON_2_BONUS:0);
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
