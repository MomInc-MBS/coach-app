import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
const product=new URL('../',import.meta.url);
const require=createRequire(new URL('package.json',product));
const {Miniflare}=require('miniflare');
const {deleteAccountDataAtEpoch,readAccountDataEpoch}=await import(new URL('server/account-data-epochs.mjs',product));
let mf,db,statements,workerModule,routeModule,combatModule,scoreboardModule;
const modules=new Map();
async function patchedURL(name){
 if(modules.has(name))return modules.get(name);
 let src=await readFile(new URL('server/'+name,product),'utf8');
 for(const [,specifier] of [...src.matchAll(/from '([^']+)'/g)]){
  const sibling=specifier.startsWith('./')?specifier.slice(2):null;
  const url=['workout-route.mjs','combat.mjs','scoreboard.mjs'].includes(sibling)?await patchedURL(sibling):new URL(specifier,new URL('server/'+name,product)).href;
  src=src.replaceAll("from '"+specifier+"'","from '"+url+"'");
 }
 if(name==='worker.mjs')src+='\nexport {workoutProgress};'; // Harness-only visibility, not proposed product export.
 const url='data:text/javascript;base64,'+Buffer.from(src).toString('base64');modules.set(name,url);return url;
}
before(async()=>{
 mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("ok")}}',d1Databases:['DB']});db=await mf.getD1Database('DB');
 for(const name of (await readdir(new URL('drizzle/',product))).filter(n=>n.endsWith('.sql')&&n<'0019').sort()){
  const sql=(await readFile(new URL('drizzle/'+name,product),'utf8')).split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean);
  await db.batch(sql.map(s=>db.prepare(s)));
 }
 await db.batch([db.prepare("INSERT INTO workouts(id,user_id,mode,goal,started_at,completed_at,value) VALUES('legacy-done','legacy','squat',5,1000,10000,5)"),db.prepare("INSERT INTO workouts(id,user_id,mode,goal,started_at) VALUES('legacy-open','legacy','squat',5,1000)")]);
 await db.prepare("INSERT INTO workouts(id,user_id,mode,goal,started_at,completed_at,value) VALUES('legacy-fraction','legacy','squat',5,1000,10000.5,5)").run();
 statements=(await readFile(new URL('drizzle/0019_workout_import_trust.sql',product),'utf8')).split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean);
 await db.batch(statements.map(s=>db.prepare(s)));
 [workerModule,routeModule,combatModule,scoreboardModule]=await Promise.all(['worker.mjs','workout-route.mjs','combat.mjs','scoreboard.mjs'].map(async name=>import(await patchedURL(name))));
});
after(()=>mf?.dispose());
const row=async id=>db.prepare('SELECT * FROM workouts WHERE id=?').bind(id).first();
const decisions=async id=>(await db.prepare('SELECT * FROM competitive_decisions WHERE workout_id=? ORDER BY seq').bind(id).all()).results;
const server=(id,owner,completed=10000,value=5)=>db.prepare('INSERT INTO workouts(id,user_id,mode,goal,started_at,completed_at,value) VALUES(?,?,?,5,1000,?,?)').bind(id,owner,'squat',completed,value);
const decision=(id,seq,status)=>db.prepare('INSERT INTO competitive_decisions(workout_id,seq,status,reason,created_at) VALUES(?,?,?,\'fixture\',10000)').bind(id,seq,status);
const guest=(id,owner,client=id,completed=10000,value=999)=>db.prepare("INSERT INTO workouts(id,user_id,mode,goal,started_at,completed_at,value,source,client_workout_id) VALUES(?,?,?,5,1000,?,?,'guest_import',?)").bind(id,owner,'squat',completed,value,client);
const metadata=(id,fingerprint='a'.repeat(64))=>db.prepare('INSERT INTO workout_imports(workout_id,idempotency_key,fingerprint,digest_version,account_data_epoch,created_at) VALUES(?,?,?,1,1,10000)').bind(id,'b'.repeat(64),fingerprint);
const importBatch=(id,owner,client=id)=>[guest(id,owner,client),metadata(id)];

test('exact 0018 fixture migrates with pending backfill, no incomplete decisions, idempotent rerun',async()=>{
 assert.equal((await row('legacy-done')).source,'server');assert.equal((await row('legacy-done')).competitive_status,'pending');
 assert.deepEqual((await decisions('legacy-done')).map(d=>[d.seq,d.status,d.reason]),[[1,'pending','legacy_server_completion']]);
 assert.equal((await row('legacy-fraction')).completed_at,10000.5);assert.equal((await row('legacy-fraction')).competitive_status,'pending');assert.equal((await decisions('legacy-fraction'))[0].created_at,0);
 assert.equal((await row('legacy-open')).competitive_status,null);assert.equal((await decisions('legacy-open')).length,0);
 await db.prepare(statements.at(-1)).run();assert.equal((await decisions('legacy-done')).length,1);
});
test('cache insertion/update forgery, authority retarget and parent replacement abort',async()=>{
 await assert.rejects(db.prepare("INSERT INTO workouts(id,user_id,mode,goal,started_at,completed_at,competitive_status) VALUES('forged','a','squat',5,1,10,'accepted')").run());
 await server('immutable','a').run();
 for(const sql of ["UPDATE workouts SET competitive_status='accepted' WHERE id='immutable'","UPDATE workouts SET competitive_status=NULL WHERE id='immutable'","UPDATE workouts SET source='guest_import' WHERE id='immutable'","UPDATE workouts SET client_workout_id='new' WHERE id='immutable'","UPDATE workouts SET user_id='b' WHERE id='immutable'","UPDATE workouts SET completed_at=NULL WHERE id='immutable'","UPDATE workouts SET value=999 WHERE id='immutable'","INSERT OR REPLACE INTO workouts(id,user_id,mode,goal,started_at,completed_at) VALUES('immutable','b','squat',5,1,10)"])await assert.rejects(db.prepare(sql).run());
 await decision('immutable',2,'accepted').run();assert.equal((await row('immutable')).competitive_status,'accepted');
});
test('decision log exact sequence, completed parent, terminal guest state and no direct mutation',async()=>{
 await server('open','guards',null).run();await assert.rejects(decision('open',1,'pending').run());
 await db.batch(importBatch('guest-guards','guards'));
 for(const d of [decision('guest-guards',1,'not_eligible'),decision('guest-guards',3,'not_eligible'),decision('guest-guards',2,'accepted'),decision('guest-guards',2,'not_eligible')])await assert.rejects(d.run());
 await guest('guest-no-decision','guards').run();assert.equal((await row('guest-no-decision')).competitive_status,'not_eligible');await assert.rejects(decision('guest-no-decision',1,'accepted').run());
 await assert.rejects(db.prepare("UPDATE competitive_decisions SET reason='new' WHERE workout_id='guest-guards'").run());
 await assert.rejects(db.prepare("DELETE FROM competitive_decisions WHERE workout_id='guest-guards'").run());
 await assert.rejects(db.prepare("INSERT OR REPLACE INTO competitive_decisions(workout_id,seq,status,reason,created_at) VALUES('guest-guards',1,'not_eligible','replace',10000)").run());
});
test('import metadata cannot change or disappear independently; parent cascade removes both children',async()=>{
 await db.batch(importBatch('cascade','cascade-owner'));
 await assert.rejects(db.prepare("UPDATE workout_imports SET fingerprint=? WHERE workout_id='cascade'").bind('c'.repeat(64)).run());
 await assert.rejects(db.prepare("DELETE FROM workout_imports WHERE workout_id='cascade'").run());
 await assert.rejects(metadata('cascade').run());
 await assert.rejects(db.prepare("INSERT OR REPLACE INTO workout_imports(workout_id,idempotency_key,fingerprint,digest_version,account_data_epoch,created_at) VALUES('cascade',?,?,1,1,10000)").bind('c'.repeat(64),'d'.repeat(64)).run());
 await db.prepare("DELETE FROM workouts WHERE id='cascade'").run();
 assert.equal((await decisions('cascade')).length,0);assert.equal(await db.prepare("SELECT * FROM workout_imports WHERE workout_id='cascade'").first(),null);
});
test('server completion triggers are atomic and twenty duplicate completions create one pending decision',async()=>{
 await server('complete-race','race',null).run();
 await Promise.all(Array.from({length:20},()=>db.prepare("UPDATE workouts SET completed_at=10000,value=5 WHERE id='complete-race' AND completed_at IS NULL").run()));
 assert.deepEqual((await decisions('complete-race')).map(d=>d.status),['pending']);
 await server('complete-fail','race',null).run();
 await db.prepare("CREATE TRIGGER fail_one_decision BEFORE INSERT ON competitive_decisions WHEN NEW.workout_id='complete-fail' BEGIN SELECT RAISE(ABORT,'injected'); END;").run();
 await assert.rejects(db.prepare("UPDATE workouts SET completed_at=10000,value=5 WHERE id='complete-fail'").run());
 assert.equal((await row('complete-fail')).completed_at,null);assert.equal((await decisions('complete-fail')).length,0);
});
test('failure at every import batch stage leaves zero parent, metadata or decisions',async()=>{
 for(let at=0;at<3;at++){
  const id='fail-'+at,batch=importBatch(id,'rollback');
  if(at===0)batch[0]=db.prepare("INSERT INTO workouts(id,user_id,mode,goal,started_at,source) VALUES(?,'rollback','squat',5,1,'bad')").bind(id);
  if(at===1)batch[1]=metadata(id,'invalid');
  if(at===2)await db.prepare("CREATE TRIGGER fail_guest_decision BEFORE INSERT ON competitive_decisions WHEN NEW.workout_id='fail-2' BEGIN SELECT RAISE(ABORT,'injected_guest_failure'); END;").run();
  await assert.rejects(db.batch(batch));assert.equal(await row(id),null);assert.equal((await decisions(id)).length,0);assert.equal(await db.prepare('SELECT * FROM workout_imports WHERE workout_id=?').bind(id).first(),null);
 }
});
test('unique source client scope is account-local, and malformed sources/import metadata fail',async()=>{
 await db.batch(importBatch('unique-a','a','same'));await db.batch(importBatch('unique-b','b','same'));
 await assert.rejects(db.batch(importBatch('unique-a2','a','same')));
 await assert.rejects(guest('incomplete-import','a','x',null).run());
 await server('not-import','a').run();await assert.rejects(metadata('not-import').run());
});
test('epoch deletion cascades import children and retains generation/receipts',async()=>{
 await readAccountDataEpoch(db,'deleted',1);await db.batch(importBatch('delete-import','deleted'));
 const proof=await deleteAccountDataAtEpoch(db,{ownerId:'deleted',expectedDataEpoch:1,now:10001,deletions:[db.prepare('DELETE FROM workouts WHERE user_id=?').bind('deleted')]});
 assert.equal(proof.currentDataEpoch,2);assert.equal(await row('delete-import'),null);assert.equal((await decisions('delete-import')).length,0);assert.equal(await db.prepare("SELECT * FROM workout_imports WHERE workout_id='delete-import'").first(),null);
});
// SQL shape proof only, not an authenticated endpoint or production route helper.
async function guardedImport(id,owner,client,epoch=1,fingerprint='a'.repeat(64)){
 await db.batch([
  db.prepare("INSERT INTO workouts(id,user_id,mode,goal,started_at,completed_at,value,source,client_workout_id) SELECT ?,?,'squat',5,1000,10000,5,'guest_import',? FROM account_data_epochs WHERE owner_id=? AND epoch=? ON CONFLICT(user_id,client_workout_id) WHERE client_workout_id IS NOT NULL DO NOTHING").bind(id,owner,client,owner,epoch),
  db.prepare('INSERT INTO workout_imports(workout_id,idempotency_key,fingerprint,digest_version,account_data_epoch,created_at) SELECT id,?,?,1,?,10000 FROM workouts WHERE id=?').bind('b'.repeat(64),fingerprint,epoch,id),
 ]);
 const saved=await db.prepare('SELECT w.id,i.fingerprint FROM workouts w JOIN workout_imports i ON i.workout_id=w.id WHERE w.user_id=? AND w.client_workout_id=?').bind(owner,client).first();
 return !saved?409:saved.fingerprint!==fingerprint?409:saved.id===id?201:200;
}
test('partial-index conflict target supports twenty concurrent imports and mixed fingerprint conflicts',async()=>{
 await readAccountDataEpoch(db,'import-race',1);
 const results=await Promise.all(Array.from({length:20},(_,n)=>guardedImport('ir-'+n,'import-race','race-client')));
 assert.equal(results.filter(n=>n===201).length,1);assert.equal(results.filter(n=>n===200).length,19);
 const saved=await db.prepare("SELECT id FROM workouts WHERE user_id='import-race'").first();assert.equal((await decisions(saved.id)).length,1);
 assert.equal(await guardedImport('ir-conflict','import-race','race-client',1,'c'.repeat(64)),409);
 assert.equal(await guardedImport('ir-lost-response','import-race','race-client'),200);
});
test('guarded import and deletion in both serial orders cannot resurrect stale-epoch rows',async()=>{
 for(const importFirst of [true,false]){
  const owner='order-'+importFirst;await readAccountDataEpoch(db,owner,1);
  if(importFirst)assert.equal(await guardedImport(owner+'-before',owner,'client'),201);
  await deleteAccountDataAtEpoch(db,{ownerId:owner,expectedDataEpoch:1,now:10001,deletions:[db.prepare('DELETE FROM workouts WHERE user_id=?').bind(owner)]});
  assert.equal(await guardedImport(owner+'-late',owner,'client'),409);
  assert.equal((await db.prepare('SELECT COUNT(*) n FROM workouts WHERE user_id=?').bind(owner).first()).n,0);
  assert.equal(await guardedImport(owner+'-fresh',owner,'client',2),201);
 }
});
test('patched authority consumers exclude import while personal records keep all rows',async()=>{
 const owner='matrix',now=1700000000000;
 await server('matrix-pending',owner,now-20000,5).run();await server('matrix-accepted',owner,now-10000,6).run();await decision('matrix-accepted',2,'accepted').run();
 await db.batch([guest('matrix-import',owner,'c',now-5000,999),metadata('matrix-import')]);
 const progress=await workerModule.workoutProgress(db,owner,now,false);assert.equal(progress.completedSets,2);assert.equal(progress.xp,50);
 assert.equal(await routeModule.maximumRoundGoal(db,owner,'squat'),600);
 const route=await routeModule.readExerciseRoute(db,owner,null,now);assert.equal(route.groups.legs.today,2);
 const board=await scoreboardModule.scoreboardApi(db,owner,'/api/scoreboard','GET',{},now);assert.deepEqual(board.members[0].items,[{mode:'squat',sets:1,best:6}]);
 const personal=await db.prepare('SELECT COUNT(*) AS sets,MAX(value) AS best FROM workouts WHERE user_id=? AND completed_at IS NOT NULL').bind(owner).first();assert.deepEqual(personal,{sets:3,best:999});
});
test('patched daily-limit completion ignores five imports and combat ignores imported earlier day',async()=>{
 const owner='limits',now=1700000000000;
 for(let n=0;n<5;n++)await db.batch([guest('limit-g'+n,owner,'c'+n,now-5000),metadata('limit-g'+n)]);
 await routeModule.assertRoundAvailable(db,owner,'squat','UTC',now);
 await server('limit-server',owner,null).run();await routeModule.completeRound(db,owner,{...(await row('limit-server')),started_at:now-10000},{value:5},'UTC',now);
 assert.equal((await row('limit-server')).competitive_status,'pending');
 const yesterday=now-86400000;await db.batch([guest('combat-guest','combat-user','cg',yesterday),metadata('combat-guest')]);
 assert.equal((await combatModule.combatProgress(db,'combat-user',now)).loginStreak,1);
});

test('metadata epoch mismatch aborts the parent and automatic decision in the same batch',async()=>{
 const owner='metadata-epoch';await readAccountDataEpoch(db,owner,1);
 await deleteAccountDataAtEpoch(db,{ownerId:owner,expectedDataEpoch:1,now:10001,deletions:[db.prepare('DELETE FROM workouts WHERE user_id=?').bind(owner)]});
 await assert.rejects(db.batch(importBatch('metadata-stale',owner)));
 assert.equal(await row('metadata-stale'),null);assert.equal((await decisions('metadata-stale')).length,0);
});
