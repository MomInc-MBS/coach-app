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



import {readAccountReadiness,refreshReminderHealth,refreshTrainingReadiness,scheduleAccountReadiness,trainingReadinessKey} from '../server/account-readiness.mjs';

const remote=()=>({DB:db,REMINDER_SERVICE_ORIGIN:'https://remote.test',REMINDER_SERVICE_TOKEN:'test'});
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
const proof=user=>({ownerId:user,currentDataEpoch:1,deletedThroughEpoch:0});
const health=(configured=true)=>Response.json({configured,publicKey:'key',schedulerActive:true});
async function resetHealth(){await db.prepare('DELETE FROM system WHERE key=?').bind('readiness:reminders').run();}
async function withFetch(fn,run){const original=globalThis.fetch;globalThis.fetch=fn;try{return await run();}finally{globalThis.fetch=original;}}
test('old remote health response cannot replace a newer observation',async()=>{
 await resetHealth();const gate=deferred();let calls=0;
 await withFetch(async()=>++calls===1?gate.promise:health(false),async()=>{
  const old=refreshReminderHealth(db,remote(),'status',{now:1000,observationId:'a'});await new Promise(r=>setImmediate(r));
  await refreshReminderHealth(db,remote(),'status',{now:2000,observationId:'b'});gate.resolve(health(true));await old;
  const result=await readAccountReadiness(db,'status',1,3000);assert.equal(result.reminders.startedAt,2000);assert.equal(result.reminders.push.configured,false);
 });
});
test('old training response cannot replace newer readiness and keeps owner separation',async()=>{
 const user=owner(),gate=deferred();let calls=0;
 await withFetch(async()=>++calls===1?gate.promise:Response.json({synced:true}),async()=>{
  const old=refreshTrainingReadiness(db,remote(),user,proof(user),{startedDay:1,lastCompletedDay:1},{now:1000,observationId:'a'});await new Promise(r=>setImmediate(r));
  await refreshTrainingReadiness(db,remote(),user,proof(user),{startedDay:1,lastCompletedDay:2},{now:2000,observationId:'b'});gate.resolve(Response.json({synced:true}));await old;
  const result=await readAccountReadiness(db,user,1,3000);assert.equal(result.training.startedAt,2000);assert.equal(result.training.state,'ready');assert.equal((await readAccountReadiness(db,owner(),1,3000)).training.state,'unknown');
 });
});
test('late remote training result cannot recreate readiness after primary deletion',async()=>{
 const user=owner(),gate=deferred(),started=deferred();
 await withFetch(async()=>{started.resolve();return gate.promise;},async()=>{
  const pending=refreshTrainingReadiness(db,remote(),user,proof(user),{startedDay:1,lastCompletedDay:1},{now:1000,observationId:'a'});await started.promise;
  assert.equal((await remove(user)).status,200);gate.resolve(Response.json({synced:true}));await assert.rejects(pending,{code:'target_epoch_mismatch'});
  assert.equal(await db.prepare('SELECT value FROM system WHERE key=?').bind(trainingReadinessKey(user)).first(),null);
 });
});
test('cache lookup failures independently fall back without failing account hydration',async()=>{
 const user=owner();await onboard(user);
 const wrapped={batch:s=>db.batch(s),prepare:sql=>{const original=db.prepare(sql);if(sql==='SELECT value FROM system WHERE key=?')return {bind:key=>String(key).startsWith('readiness:')?{first:async()=>{throw Error('cache unavailable');}}:original.bind(key)};return original;}};
 const readiness=await readAccountReadiness(wrapped,user,1);assert.equal(readiness.reminders.state,'unknown');assert.equal(readiness.training.state,'unknown');
 const result=await call(user,'/api/account',{method:'GET',database:wrapped});assert.equal(result.status,200,JSON.stringify(result));assert.equal(result.data.readiness.training.state,'unknown');
});
test('malformed JSON cache is replaced and health write failure does not discard live success',async()=>{
 await resetHealth();await db.prepare('INSERT INTO system(key,value) VALUES(?,?)').bind('readiness:reminders','broken-json').run();
 await withFetch(async()=>health(true),async()=>{
  await refreshReminderHealth(db,remote(),'status',{now:3000,observationId:'c'});assert.equal((await readAccountReadiness(db,'status',1,3000)).reminders.state,'ready');
  const broken={prepare:sql=>sql.startsWith('INSERT INTO system')?{bind:()=>({run:async()=>{throw Error('write unavailable');}})}:db.prepare(sql)};
  const live=await refreshReminderHealth(broken,remote(),'status',{now:4000,observationId:'d'});assert.equal(live.state,'ready');assert.equal(live.push.configured,true);
 });
});
test('background health and training jobs are independent; health failure retains successful config',async()=>{
 await resetHealth();const user=owner(),jobs=[];
 await withFetch(async url=>String(url).endsWith('/internal/status')?health(true):Response.json({synced:true}),async()=>{
  scheduleAccountReadiness({waitUntil:p=>jobs.push(p)},db,remote(),user,proof(user),{startedDay:1,lastCompletedDay:1});assert.equal(jobs.length,2);await Promise.all(jobs);
 });
 const previous=await readAccountReadiness(db,user,1);assert.equal(previous.reminders.state,'ready');assert.equal(previous.training.state,'ready');
 await withFetch(async url=>{if(String(url).endsWith('/internal/status'))throw Error('offline');return Response.json({synced:true});},async()=>{
  const jobs=[];scheduleAccountReadiness({waitUntil:p=>jobs.push(p)},db,remote(),user,proof(user),{startedDay:1,lastCompletedDay:1});await Promise.all(jobs);
 });
 const current=await readAccountReadiness(db,user,1);assert.equal(current.reminders.push.publicKey,'key');assert.equal(current.training.state,'ready');
});
test('core HTTP response completes while both background network requests remain pending',async()=>{
 const user=owner(),gate=deferred(),jobs=[];let calls=0;
 await withFetch(async()=>{calls++;return gate.promise;},async()=>{
  const response=await wait(worker.fetch(new Request('https://coach.test/api/account',{headers:{'oai-authenticated-user-id':user}}),remote(),{waitUntil:p=>jobs.push(p)}));assert.equal(response.status,200);assert.equal(jobs.length,2);assert.equal(calls,2);
  gate.resolve(health(true));await Promise.all(jobs);
 });
});
test('optional readiness response contains current owner/epoch; cache read deletion race rejects core result',async()=>{
 const user=owner();await withFetch(async()=>health(),async()=>{const response=await worker.fetch(new Request('https://coach.test/api/account/readiness',{headers:{'oai-authenticated-user-id':user}}),remote());assert.equal(response.status,200);const value=await response.json();assert.equal(value.targetAccountId,user);assert.equal(value.dataEpoch,1);assert(value.readiness.training);});
 let fired=false;const wrapped={batch:s=>db.batch(s),prepare:sql=>{const raw=db.prepare(sql);if(sql==='SELECT value FROM system WHERE key=?')return {bind:key=>{const statement=raw.bind(key);return {first:async()=>{if(!fired&&key===trainingReadinessKey(user)){fired=true;assert.equal((await remove(user)).status,200);}return statement.first();}};}};return raw;}};
 const result=await call(user,'/api/account',{method:'GET',database:wrapped});assert.equal(result.status,409);assert.equal(result.data.code,'account_epoch_changed');
});
