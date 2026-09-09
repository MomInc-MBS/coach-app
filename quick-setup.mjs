import {withOfficeDefaults} from './office-domain.mjs';
export const QUICK_REQUIRED_FIELDS=['goal','sessionMinutes'];
export function withQuickDefaults(initial){
 const data=initial.entryRoute==='office'?withOfficeDefaults(initial):structuredClone(initial);
 data.setupMode='quick';data.profile??={};data.answers??={};
 const defaults={name:'You',coach:data.appearance?.['myr5-recipe-v1']?.coach||'supportive',trainingStyle:'Gradual progression',guidance:'Balanced',restSeconds:'60',trainingTime:'17:00',timezone:'UTC',reminderTone:'gentle',reminderDays:'3'};
 for(const [key,value] of Object.entries(defaults))if(data.profile[key]==null||data.profile[key]==='')data.profile[key]=value;
 if(data.profile.exercises==null||Array.isArray(data.profile.exercises)&&!data.profile.exercises.length)data.profile.exercises=['squat','pushup','tree','warrior','horse','boxing','jogging','jumping'];
 return data;
}
