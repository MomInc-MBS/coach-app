import {EXERCISES,FOCUS_GROUPS,GROUP_EXERCISES} from './exercise-library.mjs';

export const DAILY_ROUND_LIMIT=5;
export const exerciseFamily=mode=>EXERCISES[mode]?.group||(mode==='jumping'?'cardio':null);
export const exerciseUnit=mode=>['hold','pace'].includes(EXERCISES[mode]?.kind)?'seconds':EXERCISES[mode]?.kind==='steps'?'steps':'reps';
export const ROUTE_LINES=Object.freeze({
 advance:"That wasn't enough to impress my clipboard. Ready for the next level?",
 max:"Maximum difficulty? Fine. One more than your last round. Now we're negotiating.",
 limit:"Five rounds. Even I have to respect the paperwork. This exercise family is done for today.",
 rest:'Rest first. The next challenge can wait.'
});

const dateFormats=new Map();
export function routeDay(now,timezone){
 let format=dateFormats.get(timezone);if(!format){format=new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'});if(dateFormats.size>=32)dateFormats.delete(dateFormats.keys().next().value);dateFormats.set(timezone,format);}
 const fields=Object.fromEntries(format.formatToParts(new Date(now)).map(p=>[p.type,p.value]));
 return `${fields.year}-${fields.month}-${fields.day}`;
}
export function makeExerciseRoute(history,today,{day,timezone,goals={}}){
 const records=new Map(history.map(r=>[r.mode,r])),rounds=Object.fromEntries(FOCUS_GROUPS.map(g=>[g.id,0]));
 for(const row of today){const group=exerciseFamily(row.mode);if(group)rounds[group]+=Number(row.sets)||0;}
 const groups=Object.fromEntries(FOCUS_GROUPS.map(group=>{
  const choices=GROUP_EXERCISES[group.id];let highest=-1;
  const steps=choices.map((m,index)=>{const complete=Number(records.get(m.id)?.sets)>0;if(complete)highest=index;return {mode:m.id,name:m.name,level:index+1,complete};});
  const index=Math.min(choices.length-1,highest+1),movement=choices[index],mastered=highest===choices.length-1,previous=records.get(movement.id);
  const goal=mastered&&Number.isFinite(Number(previous?.value))?Math.floor(Number(previous.value))+1:Number(goals[movement.id])||movement.defaultGoal;
  return [group.id,{id:group.id,name:group.name,steps,mastered,level:index+1,maxLevel:choices.length,today:rounds[group.id],remaining:Math.max(0,DAILY_ROUND_LIMIT-rounds[group.id]),next:{mode:movement.id,name:movement.name,goal:Math.max(1,goal),unit:exerciseUnit(movement.id),group:group.id}}];
 }));
 return {version:1,day,timezone,limit:DAILY_ROUND_LIMIT,groups};
}
export function nextChallenge(route,mode){
 const current=route?.groups?.[exerciseFamily(mode)];if(!current)return null;
 if(current.remaining)return {...current.next,line:current.mastered?ROUTE_LINES.max:ROUTE_LINES.advance,level:current.level,maxLevel:current.maxLevel,round:current.today+1};
 // Move through the existing focus order after a family's daily allowance.
 const index=FOCUS_GROUPS.findIndex(g=>g.id===current.id),ordered=[...FOCUS_GROUPS.slice(index+1),...FOCUS_GROUPS.slice(0,index)];
 const available=ordered.map(g=>route.groups[g.id]).filter(g=>g.remaining>0),next=available.find(g=>!g.mastered)||available[0];
 return next?{...next.next,line:ROUTE_LINES.limit,level:next.level,maxLevel:next.maxLevel,round:next.today+1,changedFamily:true}:null;
}
