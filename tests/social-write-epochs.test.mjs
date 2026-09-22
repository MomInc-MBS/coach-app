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



async function unlock(user){await db.prepare("INSERT INTO account_entitlements(user_id,coach_army_status,coach_army_completed_at,coach_army_event_id,updated_at) VALUES(?,'completed',1,'event',1) ON CONFLICT(user_id) DO NOTHING").bind(user).run();}
const room=(user,options={})=>call(user,'/api/war-room/loadout',{method:'PUT',data:{revision:0,loadout:{type:'staff',tier:4}},...options});
const invite=(user,options={})=>call(user,'/api/scoreboard/invite',{data:{consent:true},...options});
const join=(user,code,options={})=>call(user,'/api/scoreboard/join',{data:{consent:true,code},...options});
for(const [name,make,prefix,table,column] of [
 ['War Room',room,'INSERT INTO war_room_arsenals','war_room_arsenals','user_id'],
 ['scoreboard invite',invite,'INSERT INTO scoreboard_invites','scoreboard_invites','owner_id'],
])test(`paused ${name} cannot resurrect deleted state`,async()=>{
 const user=owner();await unlock(user);const held=holdBatch(r=>r.sql.startsWith(prefix));const pending=make(user,{database:held.database});await wait(held.ready);
 try{assert.equal((await remove(user)).status,200);}finally{held.release();}
 const result=await pending;assert.equal(result.status,409,JSON.stringify(result));assert.equal(result.data.code,'target_epoch_mismatch');assert.equal((await db.prepare(`SELECT count(*) n FROM ${table} WHERE ${column}=?`).bind(user).first()).n,0);
});
test('old War Room revision cannot overwrite fresh generation with matching revision',async()=>{
 const user=owner();await unlock(user);const held=holdBatch(r=>r.sql.startsWith('INSERT INTO war_room_arsenals'));const pending=room(user,{database:held.database});await wait(held.ready);
 try{await remove(user);await unlock(user);assert.equal((await room(user,{epoch:2,data:{revision:0,loadout:{type:'bow',tier:2}}})).status,200);}finally{held.release();}
 assert.equal((await pending).status,409);const state=await call(user,'/api/war-room',{method:'GET'});assert.equal(state.data.dataEpoch,2);assert.equal(state.data.targetAccountId,user);assert.deepEqual(state.data.state.loadout,{type:'bow',tier:2});
 assert.equal((await room(user,{epoch:2})).status,409); // original revision CAS retained
});
test('old invite revoke cannot remove fresh generation invitation',async()=>{
 const user=owner();await invite(user);const held=holdBatch(r=>r.sql.startsWith('DELETE FROM scoreboard_invites WHERE owner_id'));
 const pending=call(user,'/api/scoreboard/invite',{method:'DELETE',database:held.database});await wait(held.ready);
 try{await remove(user);assert.equal((await invite(user,{epoch:2})).status,200);}finally{held.release();}
 assert.equal((await pending).status,409);assert(await db.prepare('SELECT owner_id FROM scoreboard_invites WHERE owner_id=?').bind(user).first());
});
for(const prefix of ['INSERT INTO system(key,value)','INSERT INTO scoreboard_links'])test(`join is fenced when paused at ${prefix}`,async()=>{
 const actor=owner(),friend=owner(),invitation=await invite(friend),held=holdBatch(r=>r.sql.startsWith(prefix));assert.equal(invitation.status,200);
 const pending=join(actor,invitation.data.code,{database:held.database});await wait(held.ready);
 try{await remove(actor);}finally{held.release();}
 const result=await pending;assert.equal(result.status,409,JSON.stringify(result));assert.equal(result.data.code,'target_epoch_mismatch');
 assert.equal((await db.prepare('SELECT count(*) n FROM scoreboard_links WHERE user_a=? OR user_b=?').bind(actor,actor).first()).n,0);
 assert.equal(await db.prepare('SELECT value FROM system WHERE key=?').bind('scoreboard-join:'+actor).first(),null);assert(await db.prepare('SELECT owner_id FROM scoreboard_invites WHERE owner_id=?').bind(friend).first());
});
test('invited account deletion preserves existing token predicate and prevents link recreation',async()=>{
 const actor=owner(),friend=owner(),invitation=await invite(friend),held=holdBatch(r=>r.sql.startsWith('INSERT INTO scoreboard_links'));
 const pending=join(actor,invitation.data.code,{database:held.database});await wait(held.ready);
 try{await remove(friend);}finally{held.release();}
 assert.equal((await pending).status,409);assert.equal((await db.prepare('SELECT count(*) n FROM scoreboard_links WHERE user_a=? OR user_b=?').bind(friend,friend).first()).n,0);
});
test('old unlink cannot remove same id recreated for new generation',async()=>{
 const actor=owner(),friend=owner(),invitation=await invite(friend);assert.equal((await join(actor,invitation.data.code)).status,200);
 const link=await db.prepare('SELECT * FROM scoreboard_links WHERE user_a=? OR user_b=?').bind(actor,actor).first(),held=holdBatch(r=>r.sql.startsWith('DELETE FROM scoreboard_links WHERE id'));
 const pending=call(actor,'/api/scoreboard/friends/'+link.id,{method:'DELETE',database:held.database});await wait(held.ready);
 try{await remove(actor);await db.prepare('INSERT INTO scoreboard_links(id,user_a,user_b,created_at) VALUES(?,?,?,?)').bind(link.id,link.user_a,link.user_b,Date.now()).run();}finally{held.release();}
 assert.equal((await pending).status,409);assert(await db.prepare('SELECT id FROM scoreboard_links WHERE id=?').bind(link.id).first());
});
test('strict assertions protect every War Room and scoreboard mutation before body parsing',async()=>{
 const user=owner();await unlock(user);
 for(const [path,method] of [['/api/war-room/loadout','PUT'],['/api/war-room/recipes','POST'],['/api/war-room/recipes/test','DELETE'],['/api/war-room/import/profile','POST'],['/api/scoreboard/invite','POST'],['/api/scoreboard/invite','DELETE'],['/api/scoreboard/join','POST'],['/api/scoreboard/friends/test','DELETE']]){
  assert.equal((await call(user,path,{method,target:null})).status,428,path);assert.equal((await call(user,path,{method,target:'wrong'})).status,409,path);assert.equal((await call(user,path,{method,epoch:2})).status,409,path);
 }
});
test('fresh epoch supports recipe CRUD and profile import; scoreboard token and capacity checks retained',async()=>{
 const user=owner();await remove(user);await unlock(user);
 await db.prepare('INSERT INTO profiles(user_id,data,revision,updated_at) VALUES(?,?,0,1)').bind(user,JSON.stringify({'myr5-recipe-v1':'old-appearance'})).run();
 const imported=await call(user,'/api/war-room/import/profile',{epoch:2,data:{revision:0}});assert.equal(imported.status,200);assert.equal(imported.data.imported,true);
 const recipe=await call(user,'/api/war-room/recipes',{epoch:2,data:{revision:1,recipe:{id:'test',name:'Test',data:'recipe'}}});assert.equal(recipe.status,200);
 assert.equal((await call(user,'/api/war-room/recipes/test',{method:'DELETE',epoch:2,data:{revision:2}})).status,200);
 for(let i=0;i<2;i++){const friend=owner(),invitation=await invite(friend);assert.equal((await join(user,invitation.data.code,{epoch:2})).status,200);assert.equal((await join(user,invitation.data.code,{epoch:2})).status,404);}
 assert.equal((await invite(user,{epoch:2})).status,409);
 const third=await invite(owner());assert.equal((await join(user,third.data.code,{epoch:2})).status,409);
});
