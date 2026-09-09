import {FIELDS,SITE_QUESTIONS} from '../onboarding-domain.mjs';
export function completeCoach(){
 const profile=Object.fromEntries(FIELDS.map(f=>[f.key,f.options?.[0]??(f.type==='number'?15:f.type==='time'?'17:00':'None')]));Object.assign(profile,{name:'Sam',goalWeightLbs:100,timezone:'America/Los_Angeles',exercises:['squat','tree']});
 return {version:1,profile,answers:Object.fromEntries(SITE_QUESTIONS.map(g=>[g.id,Object.fromEntries(g.questions.map((_,i)=>['q'+(i+1),'None']))])),appearance:{'myr5-recipe-v1':{version:1,styles:{head:1,eye:2,collar:3,body:4,arms:5,feet:6},eye:'open',fur:1,iris:1,pupil:'round',pupilSize:1,detail:1,coach:'supportive',fingers:4,toes:3,eyeLayout:'single'}},siteChoices:{armie:{plan:{sleep:'7'}}},armieCompleted:true,customizationConfirmed:true};
}
