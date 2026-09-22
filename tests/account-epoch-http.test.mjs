import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {Miniflare} from 'miniflare';
import worker from '../server/worker.mjs';
import {prepareWorkoutImport} from '../workout-import-codec.mjs';
let mf,env;
before(async()=>{
 mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("ok")}}',d1Databases:['DB']});env={DB:await mf.getD1Database('DB'),WORKOUT_IMPORTS_ENABLED:'true'};
 for(const f of (await readdir('drizzle')).filter(name=>name.endsWith('.sql')).sort())await env.DB.batch((await readFile('drizzle/'+f,'utf8')).split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean).map(s=>env.DB.prepare(s)));
});
after(()=>mf?.dispose());
async function request(path,{user='epoch-http',method='GET',data,headers={},environment=env,ctx}={}){
 const result=await worker.fetch(new Request('https://coach.test'+path,{method,headers:{'oai-authenticated-user-id':user,'oai-authenticated-user-email':user+'@example.test',...(method!=='GET'?{Origin:'https://coach.test','Content-Type':'application/json'}:{}),...headers},body:data===undefined?undefined:JSON.stringify(data)}),environment,ctx);
 return {status:result.status,data:await result.json()};
}
const deletion=(user,epoch=1,extra={})=>request('/api/account',{user,method:'DELETE',headers:{'X-Target-Account':user},data:{confirm:'DELETE',expectedDataEpoch:epoch},...extra});
const count=async(table,user)=>(await env.DB.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE user_id=?`).bind(user).first()).n;

test('core account GET returns implicit epoch proof without creating login or training data',async()=>{
 const user='readonly',result=await request('/api/account?core=1',{user});assert.equal(result.status,200);assert.equal(result.data.dataEpoch,1);
 assert.deepEqual(result.data.deletionEvidence,{ownerId:user,currentDataEpoch:1,deletedThroughEpoch:0});
 assert.equal(await count('login_days',user),0);assert.equal(await env.DB.prepare('SELECT * FROM system WHERE key=?').bind('training:'+user).first(),null);
 assert.equal(await env.DB.prepare('SELECT * FROM account_data_epochs WHERE owner_id=?').bind(user).first(),null);
});

test('account DELETE requires target and exact positive epoch before deletion',async()=>{
 const user='strict';await env.DB.prepare('INSERT INTO profiles(user_id,data,revision,updated_at) VALUES(?,?,1,1)').bind(user,'{"keep":true}').run();
 assert.equal((await request('/api/account',{user,method:'DELETE',data:{confirm:'DELETE',expectedDataEpoch:1}})).status,428);
 assert.equal((await request('/api/account',{user,method:'DELETE',headers:{'X-Target-Account':'other'},data:{confirm:'DELETE',expectedDataEpoch:1}})).status,409);
 assert.equal((await request('/api/account',{user,method:'DELETE',headers:{'X-Target-Account':user},data:{confirm:'DELETE'}})).status,428);
 for(const expectedDataEpoch of [0,-1,1.2,'1',Number.MAX_SAFE_INTEGER])assert.equal((await deletion(user,expectedDataEpoch)).status,422);
 assert.equal((await deletion(user,2)).status,409);assert.equal(await count('profiles',user),1);
 const malformed=await worker.fetch(new Request('https://coach.test/api/account',{method:'DELETE',headers:{'oai-authenticated-user-id':user,Origin:'https://coach.test','Content-Type':'application/json','X-Target-Account':'other'},body:'{'}),env);
 assert.equal(malformed.status,409);assert.equal((await malformed.json()).code,'target_mismatch');
});

test('deletion removes pack/challenge data, retains other owners, and lost-response retry preserves new data',async()=>{
 const user='full-delete',other='full-delete:other';
 for(const owner of [user,other]){
  await env.DB.prepare('INSERT INTO system(key,value) VALUES(?,?)').bind(`notify-budget:${owner}:2026-09-21`,'1').run();
  await env.DB.prepare('INSERT INTO account_pack_entitlements(user_id,pack_id,status,granted_at) VALUES(?,?,?,1)').bind(owner,'pack','granted').run();
  await env.DB.prepare('INSERT INTO coach_army_djscratch_challenges(id,run_id,account_id,expires_at,created_at,updated_at) VALUES(?,?,?,99999,1,1)').bind('challenge-'+owner,'run-'+owner,owner).run();
 }
 const result=await deletion(user);assert.equal(result.status,200);assert.equal(result.data.dataEpoch,2);assert.equal(result.data.deletedThroughEpoch,1);assert.equal(result.data.deleted,true);assert.equal(result.data.deletedEpoch,1);assert.equal(result.data.remote.status,'not_configured');
 assert.equal(await env.DB.prepare('SELECT * FROM system WHERE key=?').bind(`notify-budget:${user}:2026-09-21`).first(),null);assert.notEqual(await env.DB.prepare('SELECT * FROM system WHERE key=?').bind(`notify-budget:${other}:2026-09-21`).first(),null);
 assert.equal(await count('account_pack_entitlements',user),0);assert.equal(await count('account_pack_entitlements',other),1);
 assert.equal((await env.DB.prepare('SELECT COUNT(*) AS n FROM coach_army_djscratch_challenges WHERE account_id=?').bind(user).first()).n,0);
 await env.DB.prepare('INSERT INTO profiles(user_id,data,revision,updated_at) VALUES(?,?,1,1)').bind(user,'{"new":true}').run();
 const replay=await deletion(user);assert.equal(replay.status,200);assert.equal(replay.data.alreadyDeleted,true);assert.equal(replay.data.deleted,false);assert.equal(replay.data.deletedEpoch,1);assert.equal(await count('profiles',user),1);
 const read=await request('/api/account?core=1',{user});assert.equal(read.data.dataEpoch,2);assert.equal(read.data.deletionEvidence.deletedThroughEpoch,1);assert.equal(read.data.profile.new,true);
});

test('old HTTP import after account deletion cannot resurrect its guest copy',async()=>{
 const user='import-delete',snapshot={schemaVersion:1,clientWorkoutId:crypto.randomUUID(),mode:'squat',goal:3,restSeconds:60,startedAt:1000,completedAt:2000,value:0,activeSeconds:0,elapsedSeconds:1};
 const p=await prepareWorkoutImport(snapshot,{targetAccountId:user,targetDataEpoch:1}),input={digestVersion:1,targetDataEpoch:1,snapshot:p.snapshot,fingerprint:p.fingerprint};
 const upload=()=>request('/api/workouts/import',{user,method:'POST',headers:{'X-Target-Account':user,'Idempotency-Key':p.idempotencyKey},data:input});
 assert.equal((await upload()).status,201);assert.equal((await deletion(user)).status,200);
 const stale=await upload();assert.equal(stale.status,409);assert.equal(stale.data.code,'target_epoch_mismatch');assert.equal(await count('workouts',user),0);
 const newer=await prepareWorkoutImport(snapshot,{targetAccountId:user,targetDataEpoch:2});
 const newImport=await request('/api/workouts/import',{user,method:'POST',headers:{'X-Target-Account':user,'Idempotency-Key':newer.idempotencyKey},data:{digestVersion:1,targetDataEpoch:2,snapshot:newer.snapshot,fingerprint:newer.fingerprint}});
 assert.equal(newImport.status,201);assert.equal(await count('workouts',user),1);
 const oldDelete=await deletion(user,1);assert.equal(oldDelete.status,200);assert.equal(oldDelete.data.alreadyDeleted,true);assert.equal(oldDelete.data.currentDataEpoch,2);assert.equal(await count('workouts',user),1);
 assert.equal((await upload()).status,409);
});

test('core GET never awaits remote status and remote outage leaves committed primary deletion queued',async()=>{
 const original=globalThis.fetch,remote={...env,REMINDER_SERVICE_ORIGIN:'https://reminders.test',REMINDER_SERVICE_TOKEN:'test-token'};let calls=0;
 globalThis.fetch=async()=>{calls++;throw new Error('offline');};
 try{
  const core=await request('/api/account?core=1',{user:'remote-read',environment:remote});assert.equal(core.status,200);assert.equal(core.data.push.status,'pending');assert.equal(calls,0);
  const deleted=await deletion('remote-delete',1,{environment:remote});assert.equal(deleted.status,200);assert.equal(deleted.data.remote.status,'pending');assert.equal(deleted.data.dataEpoch,2);
  const marker=await env.DB.prepare('SELECT value FROM system WHERE key=?').bind('remote-deletion:remote-delete').first();assert.equal(JSON.parse(marker.value).currentDataEpoch,2);assert.equal(calls,1);
 }finally{globalThis.fetch=original;}
});

test('primary deletion and queued remote marker roll back together on runtime failure',async()=>{
 const user='rollback-http';await env.DB.prepare('INSERT INTO profiles(user_id,data,revision,updated_at) VALUES(?,?,1,1)').bind(user,'{}').run();
 await env.DB.prepare(`CREATE TRIGGER account_http_fail BEFORE DELETE ON profiles WHEN OLD.user_id='rollback-http' BEGIN SELECT RAISE(ABORT,'injected_delete_failure'); END`).run();
 try{
  const result=await deletion(user,1,{environment:{...env,REMINDER_SERVICE_ORIGIN:'https://reminders.test',REMINDER_SERVICE_TOKEN:'token'}});assert.equal(result.status,500);assert.equal(await count('profiles',user),1);
  assert.equal(await env.DB.prepare('SELECT * FROM account_data_epochs WHERE owner_id=?').bind(user).first(),null);
  assert.equal(await env.DB.prepare('SELECT * FROM system WHERE key=?').bind('remote-deletion:'+user).first(),null);
 }finally{await env.DB.prepare('DROP TRIGGER account_http_fail').run();}
});


test('account GET rejects an epoch change during its primary reads',async()=>{
 const user='read-race';await env.DB.prepare('INSERT INTO profiles(user_id,data,revision,updated_at) VALUES(?,?,1,1)').bind(user,'{"old":true}').run();let fired=false;
 const wrapped={prepare:sql=>{const statement=env.DB.prepare(sql);if(sql!=='SELECT * FROM profiles WHERE user_id=?')return statement;return {bind:(...args)=>{const bound=statement.bind(...args);return {first:async()=>{const result=await bound.first();if(!fired){fired=true;assert.equal((await deletion(user)).status,200);}return result;}};}};},batch:statements=>env.DB.batch(statements)};
 const result=await request('/api/account?core=1',{user,environment:{...env,DB:wrapped}});assert.equal(result.status,409);assert.equal(result.data.code,'account_epoch_changed');assert.equal(await count('profiles',user),0);assert.equal(await count('login_days',user),0);
});

test('historical deletion receipt reports no new deletion while newer epoch data survives',async()=>{
 const user='multi-delete';await deletion(user,1);await deletion(user,2);
 await env.DB.prepare('INSERT INTO profiles(user_id,data,revision,updated_at) VALUES(?,?,1,1)').bind(user,'{"live":true}').run();
 const old=await deletion(user,1);assert.equal(old.status,200);assert.equal(old.data.deleted,false);assert.equal(old.data.alreadyDeleted,true);assert.equal(old.data.deletedEpoch,1);assert.equal(old.data.currentDataEpoch,3);assert.equal(await count('profiles',user),1);
});

 test('export includes owned entitlements and bindings without claim credentials',async()=>{
 const user='export-owner',other='export-other';
 for(const owner of [user,other]){
 await env.DB.prepare('INSERT INTO account_pack_entitlements(user_id,pack_id,status,granted_at) VALUES(?,?,?,1)').bind(owner,'owned-pack','granted').run();
 await env.DB.prepare('INSERT INTO coach_army_bindings(binding_id,run_id,account_id,event_id,claim_hash,completed_at,expires_at,created_at) VALUES(?,?,?,?,?,1,99,1)').bind('binding-'+owner,'run-'+owner,owner,'event-'+owner,'secret-'+owner).run();
 }
 const result=await request('/api/export',{user});assert.equal(result.status,200);
 assert.deepEqual(result.data.account_pack_entitlements.map(row=>row.user_id),[user]);
 assert.deepEqual(result.data.coach_army_bindings.map(row=>row.account_id),[user]);
 assert.equal('claim_hash' in result.data.coach_army_bindings[0],false);
 assert.equal(JSON.stringify(result.data).includes('secret-'),false);
 });
