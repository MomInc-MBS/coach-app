import {EXERCISES} from '../exercise-library.mjs';
import {DAILY_ROUND_LIMIT,exerciseFamily,makeExerciseRoute,routeDay} from '../workout-route.mjs';
import {fail,validateCompletion} from './domain.mjs';

export function workoutDayBounds(now,timezone='UTC'){
 const day=routeDay(now,timezone);
 // Find local midnight by calendar date; DST days need not be 24 hours long.
 function boundary(low,high,after){while(high-low>1){const mid=Math.floor((low+high)/2);if(after(routeDay(mid,timezone)))high=mid;else low=mid;}return high;}
 return {day,start:boundary(now-36*3600000,now,d=>d>=day),end:boundary(now,now+36*3600000,d=>d>day)};
}
const familyModes=mode=>[...Object.values(EXERCISES).filter(m=>m.group===exerciseFamily(mode)).map(m=>m.id),...(exerciseFamily(mode)==='cardio'?['jumping']:[])];
export async function readExerciseRoute(database,user,onboarding,now=Date.now()){
 const timezone=onboarding?.data?.profile?.timezone||'UTC',{day,start,end}=workoutDayBounds(now,timezone);
 const [history,today]=await Promise.all([
  database.prepare('SELECT mode,sets,value FROM (SELECT mode,value,COUNT(*) OVER (PARTITION BY mode) AS sets,ROW_NUMBER() OVER (PARTITION BY mode ORDER BY completed_at DESC,id DESC) AS recent FROM workouts WHERE user_id=? AND completed_at IS NOT NULL) WHERE recent=1').bind(user).all(),
  database.prepare('SELECT mode,COUNT(*) AS sets FROM workouts WHERE user_id=? AND completed_at>=? AND completed_at<? GROUP BY mode').bind(user,start,end).all()
 ]);
 return makeExerciseRoute(history.results,today.results,{day,timezone,goals:onboarding?.targets?.goals});
}
export async function assertRoundAvailable(database,user,mode,timezone,now){
 const {start,end}=workoutDayBounds(now,timezone),modes=familyModes(mode);
 const count=await database.prepare(`SELECT COUNT(*) AS n FROM workouts WHERE user_id=? AND mode IN (${modes.map(()=>'?').join(',')}) AND completed_at>=? AND completed_at<?`).bind(user,...modes,start,end).first();
 if(count.n>=DAILY_ROUND_LIMIT)fail('Five rounds completed for this exercise family today. Choose another family or come back tomorrow.',409);
}
export async function maximumRoundGoal(database,user,mode,personalGoal=0){
 const previous=await database.prepare('SELECT value FROM workouts WHERE user_id=? AND mode=? AND completed_at IS NOT NULL ORDER BY completed_at DESC,id DESC LIMIT 1').bind(user,mode).first();
 return Math.max(600,personalGoal,previous?Math.floor(Number(previous.value))+1:0);
}
export async function completeRound(database,user,workout,input,timezone,now){
 if(workout.completed_at!=null)return;
 validateCompletion(workout,input,now);
 const {start,end}=workoutDayBounds(now,timezone),modes=familyModes(workout.mode);
 // The limit and completion are one atomic write, including competing devices.
 const saved=await database.prepare(`UPDATE workouts SET completed_at=?,value=?,active=? WHERE id=? AND user_id=? AND completed_at IS NULL AND (SELECT COUNT(*) FROM workouts WHERE user_id=? AND mode IN (${modes.map(()=>'?').join(',')}) AND completed_at>=? AND completed_at<?)<? RETURNING id`).bind(now,input.value,Number.isFinite(input.active)?input.active:0,workout.id,user,user,...modes,start,end,DAILY_ROUND_LIMIT).first();
 if(!saved){const existing=await database.prepare('SELECT completed_at FROM workouts WHERE id=? AND user_id=?').bind(workout.id,user).first();if(existing?.completed_at==null)throw Object.assign(Error('Five rounds completed for this exercise family today. This extra round was not added.'),{status:409,code:'daily_round_limit'});}
}
