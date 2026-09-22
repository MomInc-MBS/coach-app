import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {Miniflare} from 'miniflare';
import worker from '../server/worker.mjs';
import {saveOnboarding} from '../server/onboarding.mjs';
import {completeCoach} from './onboarding-fixture.mjs';
const product=new URL('../',import.meta.url);
let mf,db,seq=0;
before(async()=>{
 mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("ok")}}',d1Databases:['DB']});db=await mf.getD1Database('DB');
 const directory=new URL('drizzle/',product);
 for(const name of (await readdir(directory)).filter(n=>n.endsWith('.sql')).sort())await db.batch((await readFile(new URL(name,directory),'utf8')).split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean).map(s=>db.prepare(s)));
});
after(()=>mf?.dispose());
const owner=()=>`workout-fence-${++seq}`;
async function onboard(user,epoch=1){await saveOnboarding(db,user,{data:completeCoach(),revision:0},Date.now(),{dataEpoch:epoch});}
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

test('ordinary write assertions required and target/epoch mismatch precedes body consumption',async()=>{
 const user=owner();await onboard(user);
 assert.equal((await start(user,{target:null,epoch:null})).status,428);
 assert.equal((await start(user,{epoch:'01'})).status,422);
 for(const path of ['/api/workouts/start','/api/workouts/complete']){
  for(const [target,epoch,code]of [['other',1,'target_mismatch'],[user,2,'target_epoch_mismatch']]){
   let reads=0;const raw=new Request(`https://coach.test${path}`,{method:'POST',headers:{'oai-authenticated-user-id':user,'Origin':'https://coach.test','Content-Type':'application/json','X-Target-Account':target,'X-Expected-Data-Epoch':String(epoch)},body:'not json'});
   const request=new Proxy(raw,{get(t,key){if(key==='body'){reads++;throw Error('Body must not be touched.');}const value=Reflect.get(t,key,t);return typeof value==='function'?value.bind(t):value;}});
   const response=await worker.fetch(request,{DB:db});assert.equal(response.status,409);assert.equal((await response.json()).code,code);assert.equal(reads,0);
  }
 }
 await empty(user);
});

test('delayed start batch cannot resurrect a workout after deletion wins',async()=>{
 const user=owner();await onboard(user);const held=holdBatch(r=>r.sql.startsWith('INSERT INTO workouts('));
 const pending=start(user,{database:held.database});await wait(held.ready);
 try{assert.equal((await remove(user)).status,200);}finally{held.release();}
 const response=await pending;assert.equal(response.status,409,JSON.stringify(response));assert.equal(response.data.code,'target_epoch_mismatch');await empty(user);
});

test('start-first order is cleared by deletion and fresh epoch can start and complete',async()=>{
 const user=owner();await onboard(user);const first=await ticket(user);assert.equal(first.targetAccountId,user);assert.equal(first.dataEpoch,1);
 assert.equal((await remove(user)).status,200);await empty(user);
 await onboard(user,2);const fresh=await ticket(user,2);assert.equal(fresh.dataEpoch,2);assert.equal((await complete(user,fresh.id,{epoch:2})).status,200);
 assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM workouts WHERE user_id=? AND completed_at IS NOT NULL').bind(user).first()).n,1);
});

test('delayed completion batch cannot recreate workouts login days or training after deletion wins',async()=>{
 const user=owner();await onboard(user);const {id}=await ticket(user),held=holdBatch(r=>r.sql.startsWith('UPDATE workouts SET completed_at='));
 const pending=complete(user,id,{database:held.database});await wait(held.ready);
 try{assert.equal((await remove(user)).status,200);}finally{held.release();}
 const response=await pending;assert.equal(response.status,409,JSON.stringify(response));assert.equal(response.data.code,'target_epoch_mismatch');await empty(user);
});

test('completion-first order writes login atomically and deletion removes all effects',async()=>{
 const user=owner();await onboard(user);const {id}=await ticket(user);const completed=await complete(user,id);assert.equal(completed.status,200,JSON.stringify(completed));
 assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM login_days WHERE user_id=?').bind(user).first()).n,1);
 assert.notEqual(await db.prepare('SELECT value FROM system WHERE key=?').bind('training:'+user).first(),null);
 assert.equal((await remove(user)).status,200);await empty(user);
});

test('training delayed after completion uses original proof and cannot recreate state after deletion',async()=>{
 const user=owner();await onboard(user);const {id}=await ticket(user),held=holdBatch(r=>r.sql.startsWith('INSERT INTO system(key,value)')&&r.args[0]==='training:'+user);
 const pending=complete(user,id,{database:held.database});await wait(held.ready);
 // Completion and login are already committed, but optional training is held.
 assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM login_days WHERE user_id=?').bind(user).first()).n,1);
 try{assert.equal((await remove(user)).status,200);}finally{held.release();}
 const response=await pending;assert.equal(response.status,409,JSON.stringify(response));await empty(user);
});

test('lost completion response replays once; old epoch retry after deletion cannot affect fresh generation',async()=>{
 const user=owner();await onboard(user);const first=await ticket(user);assert.equal((await complete(user,first.id)).status,200);
 const replay=await complete(user,first.id);assert.equal(replay.status,200);assert.equal(replay.data.progress.completedSets,1);
 assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM login_days WHERE user_id=?').bind(user).first()).n,1);
 assert.equal((await remove(user)).status,200);await onboard(user,2);const fresh=await ticket(user,2);assert.equal((await complete(user,fresh.id,{epoch:2})).status,200);
 const before=await db.prepare('SELECT * FROM workouts WHERE user_id=?').bind(user).all();const stale=await complete(user,first.id);assert.equal(stale.status,409);assert.equal(stale.data.code,'target_epoch_mismatch');
 assert.deepEqual(await db.prepare('SELECT * FROM workouts WHERE user_id=?').bind(user).all().then(r=>r.results),before.results);
});

test('account progress reads do not record login days or training state',async()=>{
 const user=owner();await onboard(user);const account=await call(user,'/api/account',{method:'GET'});assert.equal(account.status,200);assert.equal(account.data.dataEpoch,1);await empty(user);
});

test('runtime login insertion failure rolls back completion in the same fenced batch',async()=>{
 const user=owner();await onboard(user);const {id}=await ticket(user);
 const workout=await db.prepare('SELECT * FROM workouts WHERE id=?').bind(id).first();
 const {completeRound}=await import(new URL('server/workout-route.mjs',product));
 await db.prepare("CREATE TRIGGER reject_login_for_atomicity_test BEFORE INSERT ON login_days BEGIN SELECT RAISE(ABORT,'injected login write failure'); END").run();
 try{await assert.rejects(completeRound(db,user,workout,{id,value:3,active:3},'UTC',Date.now(),{dataEpoch:1}));}
 finally{await db.prepare('DROP TRIGGER reject_login_for_atomicity_test').run();}
 assert.equal((await db.prepare('SELECT completed_at FROM workouts WHERE id=?').bind(id).first()).completed_at,null);
 assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM login_days WHERE user_id=?').bind(user).first()).n,0);
 assert.equal(await db.prepare('SELECT value FROM system WHERE key=?').bind('training:'+user).first(),null);
 assert.equal((await complete(user,id)).status,200);
});
