import {EXERCISES,FOCUS_GROUPS} from './exercise-library.mjs';

const families={chest:['crossbow','cannon'],legs:['greatsword','hammer'],hips:['scythe','halberd'],core:['mace','tome'],shoulders:['bow','trident'],balance:['axe','sabre'],yoga:['staff','wand'],stances:['dagger','spear'],boxing:['gauntlets','rapier'],cardio:['chakram','flail']};
export const TRAINING_TRACKS=Object.freeze(Object.fromEntries(FOCUS_GROUPS.map(g=>[g.id,Object.freeze({id:g.id,name:g.name,weapons:Object.freeze(families[g.id])})])));
export const WEAPON_TRACK=Object.freeze(Object.fromEntries(Object.entries(families).flatMap(([group,ids])=>ids.map(id=>[id,group]))));
export const trainingGroup=mode=>EXERCISES[mode]?.group||(mode==='jumping'?'cardio':null);
export function emptyTraining(){return Object.fromEntries(Object.keys(TRAINING_TRACKS).map(id=>[id,{activeDays:0,completedSets:0,totalXp:0,strength:1}]));}
export function trainingFromDaily(rows){
 const result=emptyTraining(),days=Object.fromEntries(Object.keys(result).map(id=>[id,new Set()]));
 for(const row of rows){const group=trainingGroup(row.mode),sets=Number(row.sets),day=Number(row.day);if(!group||!Number.isSafeInteger(sets)||sets<1||!Number.isSafeInteger(day)||day<0)continue;result[group].completedSets+=sets;days[group].add(day);}
 for(const [group,p] of Object.entries(result)){p.activeDays=days[group].size;p.totalXp=p.activeDays*100;p.strength=1+Math.floor(p.completedSets/4);}
 return result;
}
export function trainingFromWorkouts(workouts){
 const seen=new Set(),rows=[];
 for(const row of workouts){if(row.completed_at==null||!Number.isSafeInteger(row.completed_at)||row.completed_at<0||!row.id||seen.has(row.id))continue;seen.add(row.id);rows.push({mode:row.mode,day:Math.floor(row.completed_at/86400000),sets:1});}
 return trainingFromDaily(rows);
}
export function trackProgress(value,group){
 const p=value?.training?.[group];
 if(value?.trainingVersion!==1||!p||!Number.isSafeInteger(p.activeDays)||p.activeDays<0||!Number.isSafeInteger(p.completedSets)||p.completedSets<p.activeDays||p.completedSets>1000000)return {activeDays:0,completedSets:0,totalXp:0,strength:1};
 return {activeDays:p.activeDays,completedSets:p.completedSets,totalXp:p.activeDays*100,strength:1+Math.floor(p.completedSets/4)};
}
