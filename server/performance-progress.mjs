import {EXERCISES} from '../exercise-library.mjs';
import {exerciseDifficulty} from '../performance-catalog.mjs';
import {holdXp,repXp} from '../progression-rules.mjs';
import {importedPerformanceXp} from '../performance-import-codec.mjs';
import {validateImportSnapshot} from '../workout-import-codec.mjs';
import {readPerformanceProgress,recordPerformanceSession,recordDailyActivity,workoutEligibility} from '../performance-progress.mjs';

export function performanceDay(timestamp,timezone='UTC'){
 const parts=new Intl.DateTimeFormat('en-US',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(timestamp));
 return ['year','month','day'].map(type=>parts.find(p=>p.type===type).value).join('-');
}
/** Request-local derivation from authenticated durable records. Client XP,
 * claimed ownership, cosmetic level and coach bonuses never authorize rewards. */
export function deriveAccountPerformance({workouts=[],breathing=[],meals=[],timezone='UTC'}={}){
 const cache=new Map(),options={owner:'server-derivation',storage:{getItem:k=>cache.get(k)??null,setItem:(k,v)=>cache.set(k,v)}};
 const activities=[...breathing.filter(b=>Number.isSafeInteger(b.completed_at)).map(b=>({time:b.completed_at,kind:'meditation',id:b.id})),...meals.map(m=>({time:Date.parse(m.eaten_at),kind:'food',id:m.id})).filter(m=>Number.isFinite(m.time)),...workouts.filter(w=>Number.isSafeInteger(w.completed_at)).map(w=>({time:w.completed_at,kind:'workout',row:w}))].sort((a,b)=>a.time-b.time||String(a.id??a.row.id).localeCompare(String(b.id??b.row.id)));
 for(const activity of activities){const day=performanceDay(activity.time,timezone);if(activity.kind!=='workout'){recordDailyActivity(activity.kind,{day,id:activity.id},options);continue;}
  const w=activity.row,e=EXERCISES[w.mode];if(!e)continue;
  let record;
  if(w.performance_snapshot){try{const snapshot=validateImportSnapshot(JSON.parse(w.performance_snapshot));if(!snapshot.performance||snapshot.mode!==w.mode||snapshot.clientWorkoutId!==(w.client_workout_id??w.id)||snapshot.value!==w.value||snapshot.activeSeconds!==w.active||snapshot.completedAt!==w.completed_at)continue;const p=snapshot.performance;record={...p,id:w.client_workout_id??w.id,mode:w.mode,value:snapshot.value,activeSeconds:snapshot.activeSeconds,xpBase:importedPerformanceXp(snapshot),day};}catch{continue;}}
  else if(w.source==='server'){
   const difficulty=exerciseDifficulty(w.mode),kind=e.kind==='hold'?'hold':e.kind==='reps'&&e.group!=='cardio'?'reps':'gentle',active=Math.max(0,Math.min(1800,Number(w.active)||0)),value=Math.max(0,Number(w.value)||0);
   let xpBase=kind==='reps'?repXp({difficulty,to:Math.floor(value)}):kind==='gentle'?Math.floor(active/15):0;
   if(kind==='hold')for(let start=0;start+15<=active;start+=15)xpBase+=holdXp({difficulty,from:start,to:start+15,continuousAtFrom:0});
   record={id:w.id,mode:w.mode,kind,difficulty,value,activeSeconds:active,maxContinuousSeconds:0,perDifficultyContinuous:{},xpBase,day};
  }else continue;
  if(record.xpBase<=0||!workoutEligibility(record.mode,{...options,day,kind:record.kind}).allowed)continue;
  recordPerformanceSession(record,options);
 }
 return readPerformanceProgress(options);
}
export async function readAccountPerformance(database,user,timezone){
 if(!timezone){const row=await database.prepare('SELECT data FROM onboarding WHERE user_id=?').bind(user).first();try{timezone=JSON.parse(row?.data||'{}').profile?.timezone||'UTC';}catch{timezone='UTC';}}
 const [workouts,breathing,meals]=await Promise.all([
  database.prepare('SELECT id,mode,source,client_workout_id,value,active,completed_at,performance_snapshot FROM workouts WHERE user_id=? AND completed_at IS NOT NULL ORDER BY completed_at,id').bind(user).all(),
  database.prepare('SELECT id,completed_at FROM breathing_sessions WHERE user_id=? AND completed_at IS NOT NULL').bind(user).all(),
  database.prepare('SELECT id,eaten_at FROM meals WHERE user_id=?').bind(user).all(),
 ]);
 return deriveAccountPerformance({workouts:workouts.results,breathing:breathing.results,meals:meals.results,timezone});
}
