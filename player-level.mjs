// One global player level fed by all workouts (R21 L9). Level N unlocks weapon tier N-1 for every weapon.
// Typical-training assumption used to tune the curve: ~4 sessions/week, ~15 sets/session
// => 100 + 15*10 = 250 XP/session, ~143 XP/day averaged over a week, level 21 ~ day 365.
export const XP_KNOBS={dayXp:100,setXp:10,levels:21,level2Xp:200,maxXp:52000,sessionsPerWeek:4,setsPerSession:15};
const k=XP_KNOBS,curve=Math.log(k.level2Xp/k.maxXp)/Math.log(1/(k.levels-1));
// Cumulative XP needed to reach each level (index 0 = level 1). Fast early, slow late (power curve).
export const LEVEL_XP=Object.freeze(Array.from({length:k.levels},(_,i)=>i?Math.round(k.maxXp*((i/(k.levels-1))**curve)/10)*10:0));
export const xpFromHistory=({activeDays=0,completedSets=0}={})=>Math.max(0,Math.floor(Number(activeDays)||0))*k.dayXp+Math.max(0,Math.floor(Number(completedSets)||0))*k.setXp;
export function levelFor(xp){
 xp=Math.max(0,Number(xp)||0);let i=0;while(i<LEVEL_XP.length-1&&xp>=LEVEL_XP[i+1])i++;
 const max=i===LEVEL_XP.length-1;
 return {level:i+1,xp,floor:LEVEL_XP[i],next:max?null:LEVEL_XP[i+1],into:max?0:xp-LEVEL_XP[i],need:max?0:LEVEL_XP[i+1]-LEVEL_XP[i],max};
}
// Reset (no grandfathering): the first time this version sees real account totals it stores them as a baseline;
// level counts only history logged after it. Totals unknown (guest/offline, no trainingVersion) = level 1.
// ponytail: baseline is per device, not per account; a second account on one device shows 0 XP until it passes the baseline.
export const BASELINE_KEY='myr5.xpBaseline.v1';
export function playerLevel(progress,store=globalThis.localStorage){
 if(progress?.trainingVersion!==1)return levelFor(0);
 const now={activeDays:Number(progress.activeDays)||0,completedSets:Number(progress.completedSets)||0};let base;
 try{base=JSON.parse(store?.getItem(BASELINE_KEY));}catch{}
 if(!base||!Number.isFinite(base.activeDays)||!Number.isFinite(base.completedSets)){base=now;try{store?.setItem(BASELINE_KEY,JSON.stringify(base));}catch{}}
 return levelFor(xpFromHistory({activeDays:now.activeDays-base.activeDays,completedSets:now.completedSets-base.completedSets}));
}
