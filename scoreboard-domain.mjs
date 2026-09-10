import {GROUP_EXERCISES} from './exercise-library.mjs';
export const GROUP_INKS={chest:'#a32b49',legs:'#2356a0',hips:'#754094',core:'#21715c',shoulders:'#95460e',balance:'#326d30',yoga:'#76458b',stances:'#374a7d',boxing:'#a33125',cardio:'#086e7c'};
export const scoreUnit=exercise=>exercise.kind==='hold'?'sec held':exercise.kind==='pace'?'sec active':exercise.kind==='steps'?'knee lifts':'reps';
export const displayScore=value=>Number.isFinite(value)?String(Math.floor(value)):'—';
export function comparisonRows(group,members=[]){
 return (GROUP_EXERCISES[group]||[]).slice().reverse().map(exercise=>{
  const values=Array.from({length:3},(_,slot)=>{const record=members[slot]?.items?.find(item=>item.mode===exercise.id);return record&&record.sets>0&&Number.isFinite(Number(record.best))?Math.floor(Number(record.best)):null;});
  const maximum=Math.max(1,...values.filter(v=>v!==null));
  return {exercise,unit:scoreUnit(exercise),bars:values.map((value,slot)=>{const rank=value===null?null:1+values.filter(v=>v!==null&&v>value).length;return {slot,value,rank,medal:rank===1?'gold':rank===2?'silver':rank===3?'bronze':null,height:value===null?0:Math.max(0,value)/maximum*100};})};
 });
}
