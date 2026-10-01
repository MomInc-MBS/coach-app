import {evaluateStreakHistory} from './streak-forgiveness.mjs';
export const DAY_MS=86400000;
export const BREATHING_MS=180000;
export const dayAt=now=>Math.floor(now/DAY_MS);
export function loginStreak(days,today){return evaluateStreakHistory(days,today).at(-1)?.streak??0;}
export function weaponDamage(combat,weapon,now=Date.now()){
 const current=combat?.day===dayAt(now)&&Number.isSafeInteger(combat.loginStreak)&&combat.loginStreak>=1;
 const level=Number.isInteger(weapon?.tier)&&weapon.tier>=0&&weapon.tier<=20?weapon.tier+1:1;
 return 10*(current?combat.loginStreak:1)*level*(current&&combat.breathingCompleted===true?100:1);
}
export class BreathingSession{
 constructor(durationMs=BREATHING_MS){this.durationMs=Math.max(BREATHING_MS,Math.min(2*60*60*1000,Number(durationMs)||BREATHING_MS));this.elapsed=0;this.last=null;this.active=false;}
 sample(now,active){if(this.last!==null&&this.active&&active)this.elapsed=Math.min(this.durationMs,this.elapsed+Math.max(0,Math.min(1500,now-this.last)));this.last=now;this.active=active;return this.elapsed;}
 get complete(){return this.elapsed>=this.durationMs;}
}
