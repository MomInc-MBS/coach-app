import {EXERCISES,FOCUS_GROUPS,GROUP_EXERCISES} from './exercise-library.mjs';
import {exerciseDifficulty} from './performance-catalog.mjs';
import {DIFFICULTIES,HOLD_XP_PER_MINUTE,REP_XP} from './progression-rules.mjs';
export const WORKOUT_KINDS=[{id:'hold',name:'Holds'},{id:'reps',name:'Working reps'},{id:'cardio',name:'Cardio & active movement'}];
export const workoutKind=mode=>EXERCISES[mode]?.kind==='hold'?'hold':EXERCISES[mode]?.kind==='reps'?'reps':'cardio';
export function workoutChoices(group,kind){return (GROUP_EXERCISES[group]||[]).filter(e=>workoutKind(e.id)===kind);}
export function workoutLevel(mode){
 const e=EXERCISES[mode];if(!e)return null;
 const difficulty=exerciseDifficulty(mode),i=DIFFICULTIES.indexOf(difficulty),label=difficulty[0].toUpperCase()+difficulty.slice(1),kind=workoutKind(mode);
 return {difficulty,label,kind,group:e.group,groupName:FOCUS_GROUPS.find(g=>g.id===e.group)?.name||e.group,
  xp:kind==='hold'?`${HOLD_XP_PER_MINUTE[i].join(' / ')} base XP per active minute at 1 / 3 / 5-minute tiers`:kind==='reps'?`${REP_XP[i].join(' / ')} base XP per rep at 1–7 / 8–11 / 12–15 reps`:e.group==='cardio'?'Gentle cardio: 4 base XP per active minute. Sprinting: 35 base XP for five rounds.':'4 base XP per active minute',
  unlock:kind==='hold'?'Weapons at 1 and 3 uninterrupted minutes · Coach at 5 · Golden at 10':kind==='reps'?'Weapons at 8 and 12 reps · Coach at 15':e.group==='cardio'?'Coach at 5 sprint rounds or 5 active minutes':'Coach at 5 active minutes',
  target:kind==='hold'?300:kind==='reps'?15:300,unit:kind==='reps'?'reps':'seconds'};
}
