import {scheduledDay} from './reminder-settings.mjs';
export const MAX_DAILY_MESSAGES=3;
export function missedTrainingDays(status,now,daysPerWeek=7){
 if(!status||!Number.isSafeInteger(status.startedDay))return 0;
 const today=Math.floor(now/86400000),last=Number.isSafeInteger(status.lastCompletedDay)?status.lastCompletedDay:status.startedDay-1;
 let missed=0;for(let day=Math.max(last+1,status.startedDay,today-30);day<today;day++)if(scheduledDay(new Date(day*86400000).toISOString().slice(0,10),daysPerWeek))missed++;
 return missed;
}
export function coachReminder(missed,tone='cheeky'){
 if(tone==='gentle')return missed?'Your pod is still here. Return with one comfortable set.':'A small session counts. Visit your pod when you’re ready.';
 if(missed>=7)return 'MOM is done waiting. Your arsenal is collecting dust. One steady set. Make your comeback.';
 if(missed>=3)return 'MOM is disappointed in that empty training log. Report to the pod. One set gets you moving again.';
 if(missed>=1)return 'You missed training. MOM noticed. Your next weapon upgrade is still waiting. Report to the pod.';
 return 'POD CHECK. Your weapon will not upgrade itself. One steady set. Log your category day.';
}
