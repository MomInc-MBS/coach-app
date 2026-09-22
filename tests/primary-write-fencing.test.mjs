import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {Miniflare} from 'miniflare';
const product=new URL('../',import.meta.url);
import worker from '../server/worker.mjs';
import {saveOnboarding} from '../server/onboarding.mjs';
import {completeCoach} from './onboarding-fixture.mjs';

let mf,db,seq=0;
before(async()=>{
 mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("ok")}}',d1Databases:['DB']});db=await mf.getD1Database('DB');
 const directory=new URL('drizzle/',product);
 for(const name of (await readdir(directory)).filter(n=>n.endsWith('.sql')).sort())await db.batch((await readFile(new URL(name,directory),'utf8')).split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean).map(s=>db.prepare(s)));
});
after(()=>mf?.dispose());
const owner=()=>`workout-fence-${++seq}`;
async function onboard(user){await saveOnboarding(db,user,{data:completeCoach(),revision:0});}
async function call(user,path,{method='POST',data,epoch=1,target=user,database=db,headers={}}={}){
 const request=new Request(`https://coach.test${path}`,{method,headers:{'oai-authenticated-user-id':user,'Origin':'https://coach.test','Content-Type':'application/json',...(target===null?{}:{'X-Target-Account':target}),...(epoch===null?{}:{'X-Expected-Data-Epoch':String(epoch)}),...headers},body:method==='GET'?undefined:JSON.stringify(data??{})});
 const response=await worker.fetch(request,{DB:database});return {status:response.status,data:await response.json()};
}
const start=(user,options={})=>call(user,'/api/workouts/start',{data:{mode:'squat',goal:3},...options});
const remove=(user,epoch=1)=>call(user,'/api/account',{method:'DELETE',epoch,data:{confirm:'DELETE',expectedDataEpoch:epoch}});
async function ticket(user,epoch=1){const response=await start(user,{epoch});assert.equal(response.status,200,JSON.stringify(response));await db.prepare('UPDATE workouts SET started_at=? WHERE id=?').bind(Date.now()-20000,response.data.id).run();return response.data;}
const complete=(user,id,options={})=>call(user,'/api/workouts/complete',{data:{id,value:3,active:3},...options});
async function empty(user){
 assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM workouts WHERE user_id=?').bind(user).first()).n,0);
 assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM login_days WHERE user_id=?').bind(user).first()).n,0);
 assert.equal(await db.prepare('SELECT value FROM system WHERE key=?').bind('training:'+user).first(),null);
}
// Holds one exact, real D1 batch after all request preflight work has finished.
// No SQL is replaced, and release executes the original batch in Miniflare.
function holdBatch(matches){
 const info=new WeakMap();let release,entered,held=false;
 const gate=new Promise(r=>release=r),ready=new Promise(r=>entered=r);
 const decorate=(statement,sql,args=[])=>{
  const wrapper={bind:(...values)=>decorate(statement.bind(...values),sql,values),first:(...values)=>statement.first(...values),all:(...values)=>statement.all(...values),run:(...values)=>statement.run(...values),raw:(...values)=>statement.raw(...values)};
  info.set(wrapper,{statement,sql,args});return wrapper;
 };
 const database={prepare:sql=>decorate(db.prepare(sql),sql),batch:async statements=>{
  const rows=statements.map(s=>info.get(s)||{statement:s,sql:'',args:[]});
  if(!held&&rows.some(matches)){held=true;entered();await gate;}
  return db.batch(rows.map(r=>r.statement));
 }};
 return {database,ready,release};
}
const wait=p=>Promise.race([p,new Promise((_,reject)=>{const timer=setTimeout(()=>reject(Error('Expected batch was not reached.')),5000);timer.unref?.();})]);


const mutations=[
 ['/api/profile','PUT',()=>({revision:0,data:{}}),'INSERT INTO profiles','profiles'],
 ['/api/goals','POST',()=>({title:'Old goal'}),'INSERT INTO goals','goals'],
 ['/api/meals','POST',()=>({id:crypto.randomUUID(),name:'Meal',portion:'1 bowl',calories:350,protein:12,carbs:null,fat:5,micros:{},nutritionSource:'manual',eatenAt:new Date().toISOString()}),'INSERT INTO meals','meals'],
 ['/api/onboarding','PUT',()=>({revision:1,data:completeCoach()}),'INSERT INTO onboarding','onboarding'],
 ['/api/breathing/start','POST',()=>({}),'INSERT INTO breathing_sessions','breathing_sessions'],
];
for(const [path,method,data,prefix,table]of mutations){
 test(`delete wins against paused ${path}`,async()=>{
  const user=owner();await onboard(user);const held=holdBatch(r=>r.sql.startsWith(prefix));
  const pending=call(user,path,{method,data:data(),database:held.database});await wait(held.ready);
  try{assert.equal((await remove(user)).status,200);}finally{held.release();}
  const response=await pending;assert.equal(response.status,409,JSON.stringify(response));assert.equal(response.data.code,'target_epoch_mismatch');
  assert.equal((await db.prepare(`SELECT count(*) AS n FROM ${table} WHERE user_id=?`).bind(user).first()).n,0);
 });
 test(`first arriving stale/missing/mismatched assertion rejected for ${path}`,async()=>{
  const user=owner();await onboard(user);
  assert.equal((await call(user,path,{method,data:data(),target:null})).status,428);
  assert.equal((await call(user,path,{method,data:data(),target:'other'})).status,409);
  assert.equal((await remove(user)).status,200);
  assert.equal((await call(user,path,{method,data:data()})).status,409);
 });
}
test('breathing completion and login are one fenced batch after deletion',async()=>{
 const user=owner();await onboard(user);
 const started=await call(user,'/api/breathing/start');assert.equal(started.status,200);
 await db.prepare('UPDATE breathing_sessions SET started_at=? WHERE id=?').bind(Date.now()-181000,started.data.id).run();
 const held=holdBatch(r=>r.sql.startsWith('UPDATE breathing_sessions'));
 const pending=call(user,'/api/breathing/complete',{data:{id:started.data.id,activeMs:180000},database:held.database});await wait(held.ready);
 try{assert.equal((await remove(user)).status,200);}finally{held.release();}
 const response=await pending;assert.equal(response.status,409,JSON.stringify(response));
 for(const table of ['breathing_sessions','login_days'])assert.equal((await db.prepare(`SELECT count(*) n FROM ${table} WHERE user_id=?`).bind(user).first()).n,0);
});
test('fresh generation preserves response shapes and accepts new work',async()=>{
 const user=owner();await onboard(user);await remove(user);
 const ob=await call(user,'/api/onboarding',{method:'PUT',epoch:2,data:{revision:0,data:completeCoach()}});assert.equal(ob.status,200,JSON.stringify(ob));assert(ob.data.appearance);assert.equal(ob.data.onboarding.revision,1);
 const profile=await call(user,'/api/profile',{method:'PUT',epoch:2,data:{revision:1,data:{}}});assert.equal(profile.status,200);assert.equal(profile.data.revision,2);
 const goal=await call(user,'/api/goals',{epoch:2,data:{title:'Fresh'}});assert.equal(goal.status,200);assert(goal.data.saved);
 assert.deepEqual((await call(user,'/api/goals/'+goal.data.id,{method:'PATCH',epoch:2,data:{status:'completed'}})).data,{saved:true});
 const meal=mutations[2][2]();assert.deepEqual((await call(user,'/api/meals',{epoch:2,data:meal})).data,{saved:true});
 assert.deepEqual((await call(user,'/api/meals/'+meal.id,{method:'DELETE',epoch:2})).data,{deleted:true});
 const breath=await call(user,'/api/breathing/start',{epoch:2});assert.equal(breath.status,200);assert.equal(breath.data.durationMs,180000);assert.equal(breath.data.targetAccountId,user);assert.equal(breath.data.dataEpoch,2);
 await db.prepare('UPDATE breathing_sessions SET started_at=? WHERE id=?').bind(Date.now()-181000,breath.data.id).run();const completed=await call(user,'/api/breathing/complete',{epoch:2,data:{id:breath.data.id,activeMs:180000}});assert.equal(completed.status,200);assert.equal(completed.data.targetAccountId,user);assert.equal(completed.data.dataEpoch,2);assert.equal(completed.data.combat.breathingCompleted,true);
});
test('default account GET never requests remote health; optional readiness is separate from account content',async()=>{
 const oldFetch=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;return Response.json({configured:true,publicKey:'test',schedulerActive:true});};
 try{
  const user=owner(),env={DB:db,REMINDER_SERVICE_ORIGIN:'https://remote.test',REMINDER_SERVICE_TOKEN:'test'};
  const request=path=>worker.fetch(new Request('https://coach.test'+path,{headers:{'oai-authenticated-user-id':user}}),env);
  const core=await request('/api/account');assert.equal(core.status,200);assert.equal(calls,0);assert.equal((await core.json()).push.status,'pending');
  const status=await request('/api/account/readiness');assert.equal(status.status,200);assert.equal(calls,1);assert.equal((await status.json()).push.status,'ready');
  assert.equal(await db.prepare('SELECT * FROM account_data_epochs WHERE owner_id=?').bind(user).first(),null);
 }finally{globalThis.fetch=oldFetch;}
});

test('paused goal PATCH cannot mutate a new generation row after delete and same id recreation',async()=>{
 const user=owner();await onboard(user);const id=crypto.randomUUID();await call(user,'/api/goals',{data:{id,title:'Old'}});
 const held=holdBatch(r=>r.sql.startsWith('UPDATE goals SET'));
 const pending=call(user,'/api/goals/'+id,{method:'PATCH',data:{title:'Stale change'},database:held.database});await wait(held.ready);
 try{assert.equal((await remove(user)).status,200);assert.equal((await call(user,'/api/goals',{epoch:2,data:{id,title:'Fresh'}})).status,200);}finally{held.release();}
 assert.equal((await pending).status,409);assert.equal((await db.prepare('SELECT title FROM goals WHERE id=?').bind(id).first()).title,'Fresh');
});
test('paused meal DELETE cannot remove same id recreated in a new generation',async()=>{
 const user=owner();await onboard(user);const meal=mutations[2][2]();await call(user,'/api/meals',{data:meal});
 const held=holdBatch(r=>r.sql.startsWith('DELETE FROM meals WHERE'));
 const pending=call(user,'/api/meals/'+meal.id,{method:'DELETE',database:held.database});await wait(held.ready);
 try{assert.equal((await remove(user)).status,200);await call(user,'/api/onboarding',{method:'PUT',epoch:2,data:{revision:0,data:completeCoach()}});assert.equal((await call(user,'/api/meals',{epoch:2,data:meal})).status,200);}finally{held.release();}
 assert.equal((await pending).status,409);assert(await db.prepare('SELECT id FROM meals WHERE id=?').bind(meal.id).first());
});
