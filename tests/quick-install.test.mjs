import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {Miniflare} from 'miniflare';
import {readFile,readdir} from 'node:fs/promises';
import worker from '../server/worker.mjs';
import {completeCoach} from './onboarding-fixture.mjs';
import {withQuickDefaults} from '../quick-setup.mjs';
import {createOfficeDraft} from '../office-domain.mjs';
import {missingFields,validateOnboarding,dailyTargets} from '../onboarding-domain.mjs';
import {prepareInstall,restoreInstall} from '../install-transfer.mjs';
import {readIncomingCoach} from '../pending-coach.mjs';
import {setupAllowed,isInstalled} from '../install-context.mjs';
const storage=()=>{const map=new Map();return {getItem:key=>map.get(key)||null,setItem:(key,value)=>map.set(key,value),removeItem:key=>map.delete(key)};};
function quick(){const data=completeCoach();data.profile={};data.answers={};return withQuickDefaults(data);}
function answered(){const data=quick();data.profile.goal='Build a routine';data.profile.sessionMinutes=10;data.answers.armie={q3:'Avoid jumping'};return data;}
test('both setup routes require only goal, session length, and movement limits',()=>{
 for(const data of [quick(),withQuickDefaults(createOfficeDraft('America/Los_Angeles'))]){
  assert.equal(missingFields(data).length,3);data.profile.goal='Build a routine';data.profile.sessionMinutes=10;data.answers.armie={q3:'None'};
  assert.deepEqual(missingFields(data),[]);const saved=validateOnboarding(data);assert.equal(saved.setupMode,'quick');
  assert.equal(saved.profile.goalWeightLbs,undefined);assert.equal(saved.profile.experience,undefined);assert.equal(saved.profile.foodLimits,undefined);assert.equal(saved.answers.fuel.q1,'');
  assert.equal(dailyTargets(saved.profile,'2026-09-09').proteinGrams,null);
 }
 for(const change of [d=>delete d.profile.goal,d=>delete d.profile.sessionMinutes,d=>d.answers.armie.q3=' ',d=>d.profile.sessionMinutes=0,d=>d.profile.goalWeightLbs=-1,d=>d.answers.fuel={q1:12},d=>d.armieCompleted=false]){const data=answered();change(data);assert.throws(()=>validateOnboarding(data));}
});
test('short setup preserves every supplied answer and appearance without inventing personal answers',()=>{
 const initial=completeCoach(),saved=validateOnboarding(withQuickDefaults(initial));assert.deepEqual(saved.answers,initial.answers);assert.deepEqual(saved.appearance,initial.appearance);assert.equal(saved.profile.goalWeightLbs,100);assert.equal(initial.setupMode,undefined);
 const data=answered();const savedMinimal=validateOnboarding(data);assert.equal(savedMinimal.profile.coach,data.appearance['myr5-recipe-v1'].coach);assert.equal(savedMinimal.answers.armie.q3,'Avoid jumping');assert.deepEqual(missingFields(JSON.parse(JSON.stringify(savedMinimal))),[]);
});
test('browser setup is available without claiming an app installation',()=>{
 const win={matchMedia:()=>({matches:false}),navigator:{},sessionStorage:{getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}}};
 assert.equal(setupAllowed(win),true);assert.equal(isInstalled(win),false);
 win.navigator.standalone=true;assert.equal(setupAllowed(win),true);assert.equal(isInstalled(win),true);
 win.navigator.standalone=false;win.matchMedia=()=>({matches:true});assert.equal(setupAllowed(win),true);assert.equal(isInstalled(win),true);
});
let mf,env;
before(async()=>{mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("ok")}}',d1Databases:['DB']});env={DB:await mf.getD1Database('DB')};for(const name of (await readdir('drizzle')).filter(n=>n.endsWith('.sql')).sort())await env.DB.batch((await readFile('drizzle/'+name,'utf8')).split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean).map(s=>env.DB.prepare(s)));});
after(async()=>mf?.dispose());
function client(initialCookie='',ip='127.0.0.1'){
 let cookie=initialCookie;return {get cookie(){return cookie;},async fetch(path,options={}){const response=await worker.fetch(new Request('https://coach.test'+path,{...options,headers:{...options.headers,Origin:'https://coach.test','CF-Connecting-IP':ip,...(cookie?{Cookie:cookie}:{})}}),env);const set=response.headers.get('set-cookie');if(set)cookie=set.split(';')[0];return response;}};
}
test('install first carries a saved design into a fresh app store without any account or form',async()=>{
 const browser=client(),data=completeCoach();await prepareInstall(data,browser.fetch);assert.match(browser.cookie,/^__Host-coach-install=[a-f0-9]{64}$/);assert(!browser.cookie.includes('Sam'));
 const newApp=client(browser.cookie),session=storage(),local=storage();assert.equal(readIncomingCoach(session,local),null);
 assert.deepEqual(await restoreInstall(newApp.fetch,session,local),data);assert.deepEqual(readIncomingCoach(session,local),data);
 assert.equal((await(await browser.fetch('/api/install-draft')).json()).data,null,'Consumed transfer cannot be replayed from the browser');
 assert.equal((await env.DB.prepare('SELECT COUNT(*) AS n FROM onboarding').first()).n,0,'Installation does not create an account or submit the form');
 assert.equal((await(await client().fetch('/api/install-draft')).json()).data,null,'Other visitors cannot read the draft');
});
test('a failed app storage write keeps the install draft available to retry',async()=>{
 const browser=client();await prepareInstall(completeCoach(),browser.fetch);const app=client(browser.cookie);await assert.rejects(()=>restoreInstall(app.fetch,storage(),{setItem(){throw Error('full');}}),/full/);
 assert((await(await app.fetch('/api/install-draft')).json()).data);await restoreInstall(app.fetch,storage(),storage());
});
test('install drafts expire, reject incomplete coaches and cross-origin writes',async()=>{
 const browser=client();await prepareInstall(completeCoach(),browser.fetch);await env.DB.prepare('UPDATE install_drafts SET expires_at=0').run();assert.equal((await(await browser.fetch('/api/install-draft')).json()).data,null);
 assert.equal((await browser.fetch('/api/install-draft',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({data:{}})})).status,400);
 const bad=await worker.fetch(new Request('https://coach.test/api/install-draft',{method:'POST',headers:{Origin:'https://wrong.test','Content-Type':'application/json'},body:JSON.stringify({data:completeCoach()})}),env);assert.equal(bad.status,403);
});
test('three answers save privately and unlock workouts without optional weight or questionnaire answers',async()=>{
 const data=answered(),c=client();const saved=await c.fetch('/api/onboarding',{method:'PUT',headers:{'Content-Type':'application/json','oai-authenticated-user-id':'quick-alice'},body:JSON.stringify({data,revision:0})});assert.equal(saved.status,200);const result=await saved.json();assert.equal(result.onboarding.targets.proteinGrams,null);assert.equal(result.onboarding.targets.reps,3);assert.equal(result.onboarding.data.setupMode,'quick');
 const start=await c.fetch('/api/workouts/start',{method:'POST',headers:{'Content-Type':'application/json','oai-authenticated-user-id':'quick-alice'},body:JSON.stringify({mode:'tree',goal:9})});assert.equal(start.status,200);
 assert.equal((await c.fetch('/api/onboarding',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({data,revision:0})})).status,401);
});
