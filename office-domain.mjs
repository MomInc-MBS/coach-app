export const OFFICE_STYLES=['Original MYR5','Verdant','Mycelial','Chitin','Reptilian','Abyssal','Coral','Skeletal','Spectral','Infernal','Celestial','Voidborn','Eldritch','Stone Golem','Crystal','Magma','Glacial','Stormcharged','Clockwork','Neon Synth'];
export const OFFICE_SECTIONS={fuel:'B. Caffeine & supplements',goon:'C. Support & accountability',lilboyfriend:'D. Premises & equipment',djscratch:'E. Motivation & communication',corgi:'F. Sleep & stress',girlfriend:'G. Advice & sources',armie:'H. Movement history & limits'};
export const OFFICE_REQUIRED_FIELDS=['goal','goalWeightLbs','experience','sessionMinutes','coach'];
export function withOfficeDefaults(data){
 const value=structuredClone(data),profile=value.profile??={};
 const defaults={name:'You',trainingStyle:'Gradual progression',guidance:'Balanced',restSeconds:'60',trainingTime:'17:00',timezone:'UTC',reminderTone:'gentle',reminderDays:'3'};
 for(const [key,fallback] of Object.entries(defaults))if(profile[key]==null||typeof profile[key]==='string'&&!profile[key].trim())profile[key]=fallback;
 if(profile.exercises==null||Array.isArray(profile.exercises)&&!profile.exercises.length)profile.exercises=['squat','pushup','tree','warrior','horse','boxing','jogging','jumping'];
 value.appearance??={};value.appearance['myr5-recipe-v1']??={version:1,styles:{head:0,eye:0,collar:0,body:0,arms:0,feet:0},eye:'sleepy',fur:1,iris:1,pupil:'round',pupilSize:1,detail:1,coach:'supportive',fingers:4,toes:3,eyeLayout:'single'};
 value.answers??={};value.siteChoices??={};value.officeBanter??=true;
 // Submitting the office form accepts its current/default appearance; games keep their explicit studio gate.
 value.customizationConfirmed=true;value.armieCompleted=false;
 return value;
}
export function createOfficeDraft(timezone){
 return withOfficeDefaults({version:1,entryRoute:'office',profile:{timezone},answers:{}});
}
export function officeBanterAllowed(data){
 if(data?.entryRoute!=='office'||data.officeBanter!==true||data.profile?.guidance==='Quiet')return false;
 const boundary=data.answers?.djscratch?.q3||'';
 return !/(?:no|never|don['’]?t|do not)\s+(?:\w+\s+){0,2}(?:teas|mock|roast|insult|banter|jok)|(?:teas|mock|roast|banter).{0,20}(?:off limits|not allowed)/i.test(boundary);
}
export function officeLine(data,stage=0){
 if(!officeBanterAllowed(data))return 'Your coach is reviewing the paperwork. Every answer still counts.';
 const lines=[
  'You were offered an adventure. You requested a form. I have never been more fluorescently lit.',
  'Look at you, choosing boxes over boss battles. A true employee of the month.',
  'I could be in a game right now. Instead, I am emotionally attached to a stapler.',
  'Another section complete. Riveting. I have scheduled my yawn for 2:30.',
  'Paperwork approved. Tragically, I still have to be an excellent coach for you.'
 ];
 const line=lines[Math.min(lines.length-1,Math.max(0,Math.floor(stage)))];
 const blocked=(data.answers?.djscratch?.q3||'').split(/[,;\n]/).map(s=>s.trim().toLowerCase()).filter(s=>s.length>=3&&!/^none\.?$/.test(s));
 return blocked.some(s=>line.toLowerCase().includes(s))?'Your coach is reviewing the paperwork. Every answer still counts.':line;
}
export function officeEncouragement(data,day=1){
 if(!officeBanterAllowed(data))return null;
 const lines=['Your paperwork was thrilling. Let’s make this movement even more exciting. Keep your own pace.','The Department of Tiny Progress has approved your next comfortable rep.','You chose forms over games. Fine. I still believe in your next small step.'];
 const line=lines[Math.abs(Math.floor(day)-1)%lines.length];
 const blocked=(data.answers?.djscratch?.q3||'').split(/[,;\n]/).map(s=>s.trim().toLowerCase()).filter(s=>s.length>=3&&!/^none\.?$/.test(s));
 return blocked.some(s=>line.toLowerCase().includes(s))?null:line;
}
