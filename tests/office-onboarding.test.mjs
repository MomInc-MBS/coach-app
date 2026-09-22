import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {Miniflare} from 'miniflare';
import {readFile,readdir} from 'node:fs/promises';
import worker from '../server/worker.mjs';
import {FIELDS,SITE_QUESTIONS,missingFields,validateOnboarding,encodeHandoff,decodeHandoff} from '../onboarding-domain.mjs';
import {OFFICE_REQUIRED_FIELDS,createOfficeDraft,officeBanterAllowed,officeLine,officeEncouragement} from '../office-domain.mjs';
import {completeCoach} from './onboarding-fixture.mjs';
function office(){const d=createOfficeDraft('America/Los_Angeles'),filled=completeCoach();for(const k of OFFICE_REQUIRED_FIELDS)d.profile[k]=filled.profile[k];d.answers=Object.fromEntries(SITE_QUESTIONS.map(g=>[g.id,Object.fromEntries(g.questions.map((_,i)=>['q'+(i+1),'']))]));d.answers.armie.q3='None';return d;}
test('office is a real alternate route, not a forged Armie completion',()=>{
 const d=office(),saved=validateOnboarding(d);assert.deepEqual(missingFields(d),[]);assert.equal(saved.entryRoute,'office');assert.equal(saved.armieCompleted,false);assert.equal(saved.appearance['myr5-recipe-v1'].eye,'sleepy');assert.equal(saved.officeBanter,true);
 assert.equal(validateOnboarding(completeCoach()).entryRoute,'games');
 const games=completeCoach();games.armieCompleted=false;assert.throws(()=>validateOnboarding(games),/Finish Coach Armie/);
 d.entryRoute='skip';assert.throws(()=>validateOnboarding(d),/Choose games or the office form/);
});
test('office requires exactly the six essentials; skipped extras do not block unlocking',()=>{
 assert.equal(missingFields(createOfficeDraft('America/Los_Angeles')).length,6);
 for(const key of OFFICE_REQUIRED_FIELDS){const d=office();delete d.profile[key];assert.throws(()=>validateOnboarding(d),undefined,key);}
 const d=office();d.answers.armie.q3=' ';assert.throws(()=>validateOnboarding(d),/movement|injury|limit/);
 const minimal={entryRoute:'office',profile:Object.fromEntries(OFFICE_REQUIRED_FIELDS.map(k=>[k,office().profile[k]])),answers:{armie:{q3:'None'}}};
 const saved=validateOnboarding(minimal);assert.equal(saved.profile.name,'You');assert.equal(saved.profile.restSeconds,'60');assert.equal(saved.profile.guidance,'Balanced');assert.equal(saved.profile.trainingStyle,'Gradual progression');assert.equal(saved.profile.timezone,'UTC');assert.equal(saved.appearance['myr5-recipe-v1'].eye,'sleepy');assert.equal(saved.armieCompleted,false);
 assert.equal(saved.answers.fuel.q1,'');assert.equal(saved.answers.girlfriend.q1,'');assert.equal(saved.profile.foodLimits,undefined);assert.equal(saved.profile.foodPreference,undefined);
 assert.equal(minimal.profile.name,undefined);assert.equal(minimal.appearance,undefined);
});
test('optional saved answers and appearance remain validated and survive a shorter-form edit',()=>{
 const d=completeCoach();d.entryRoute='office';d.officeBanter=false;d.profile.name='Sam';d.answers.fuel.q1='No caffeine';const saved=validateOnboarding(d);assert.equal(saved.answers.fuel.q1,'No caffeine');assert.equal(saved.profile.name,'Sam');assert.equal(saved.officeBanter,false);assert.equal(saved.appearance['myr5-recipe-v1'].styles.arms,5);
 for(const change of [d=>d.profile.restSeconds='999',d=>d.profile.name='x'.repeat(61),d=>d.appearance['myr5-recipe-v1'].styles.body=99,d=>d.officeBanter='yes',d=>d.answers.fuel.q1=55]){const value=office();change(value);assert.throws(()=>validateOnboarding(value));}
});
test('office answers, customization and mute choice survive storage/sign-in serialization',()=>{
 const d=office();d.profile.name='Zoë';d.answers.djscratch.q1='Music 🎵';d.officeBanter=false;d.appearance['myr5-recipe-v1'].styles.body=19;
 const restored=JSON.parse(JSON.stringify(d));assert.deepEqual(validateOnboarding(restored),validateOnboarding(d));assert.deepEqual(decodeHandoff(encodeHandoff(d)),d);
});
test('paperwork jokes change with progress and respect mute, quiet guidance and boundaries',()=>{
 const d=office();d.profile.guidance='Balanced';assert.equal(officeBanterAllowed(d),true);assert.notEqual(officeLine(d,0),officeLine(d,3));assert.match(officeLine(d,4),/approved/);assert.match(officeEncouragement(d,1),/paperwork/);
 d.officeBanter=false;assert.equal(officeEncouragement(d),null);assert.doesNotMatch(officeLine(d),/stapler|boss battles/);
 d.officeBanter=true;d.profile.guidance='Quiet';assert.equal(officeEncouragement(d),null);
 d.profile.guidance='Balanced';for(const boundary of ['No teasing','Do not mock me','Never roast me',"Don't make jokes about paperwork"]){d.answers.djscratch.q3=boundary;assert.equal(officeEncouragement(d),null);}
 d.answers.djscratch.q3='stapler';assert.doesNotMatch(officeLine(d,2),/stapler/);d.answers.djscratch.q3='None';assert.equal(officeEncouragement(completeCoach()),null);
});
let mf,env;
before(async()=>{mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("ok")}}',d1Databases:['DB']});env={DB:await mf.getD1Database('DB')};for(const f of (await readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort()){await env.DB.batch((await readFile('drizzle/'+f,'utf8')).split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean).map(s=>env.DB.prepare(s)));}});
after(async()=>mf?.dispose());
async function call(path,{user='office-alice',method='GET',data}={}){const r=await worker.fetch(new Request('https://coach.test'+path,{method,headers:{...(user?{'oai-authenticated-user-id':user,'X-Target-Account':user,'X-Expected-Data-Epoch':'1'}:{}),Origin:'https://coach.test','Content-Type':'application/json'},body:data?JSON.stringify(data):undefined}),env);return {status:r.status,data:await r.json()};}
test('a shared-link recipient can activate via office, privately save answers, and start the same day-one plan',async()=>{
 const filled=office(),d={entryRoute:'office',profile:Object.fromEntries(OFFICE_REQUIRED_FIELDS.map(k=>[k,filled.profile[k]])),answers:{armie:{q3:'None'}}};assert.equal((await call('/api/onboarding',{user:null,method:'PUT',data:{data:d,revision:0}})).status,401);
 const missing=office();missing.answers.armie.q3='';assert.equal((await call('/api/onboarding',{method:'PUT',data:{data:missing,revision:0}})).status,400);
 assert.equal((await call('/api/workouts/start',{method:'POST',data:{mode:'squat',goal:3}})).status,403);
 assert.equal((await call('/api/onboarding',{method:'PUT',data:{data:d,revision:0}})).status,200);
 const a=(await call('/api/account')).data;assert.equal(a.onboarding.data.armieCompleted,false);assert.deepEqual(a.onboarding.data.answers,validateOnboarding(d).answers);assert.equal(a.onboarding.targets.reps,3);assert.equal(a.onboarding.targets.holdSeconds,9);assert.equal(a.onboarding.targets.waterOz,100);assert.equal(a.onboarding.targets.proteinGrams,100);assert.equal(a.onboarding.data.profile.foodLimits,undefined);
 assert.equal((await call('/api/account',{user:'office-bob'})).data.onboarding,null);
 assert.equal((await call('/api/workouts/start',{method:'POST',data:{mode:'tree',goal:9}})).status,200);
 d.officeBanter=false;d.profile.coach='calm';const updated=await call('/api/onboarding',{method:'PUT',data:{data:d,revision:a.onboarding.revision}});assert.equal(updated.status,200);assert.equal(updated.data.onboarding.startDay,a.onboarding.startDay);assert.equal(updated.data.onboarding.completedAt,a.onboarding.completedAt);assert.equal(updated.data.onboarding.data.officeBanter,false);assert.equal(JSON.parse((await call('/api/account')).data.profile['myr5-recipe-v1']).coach,'calm');
});
