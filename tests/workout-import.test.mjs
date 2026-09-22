import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {Miniflare} from 'miniflare';
import {prepareWorkoutImport} from '../workout-import-codec.mjs';
import {importWorkout,WorkoutImportError} from '../server/workout-import.mjs';
import {deleteAccountDataAtEpoch,inspectAccountDataEpoch} from '../server/account-data-epochs.mjs';
let mf,db;
before(async()=>{
 mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("ok")}}',d1Databases:['DB']});
 db=await mf.getD1Database('DB');
 for(const name of (await readdir('drizzle')).filter(name=>name.endsWith('.sql')).sort()){
  const statements=(await readFile('drizzle/'+name,'utf8')).split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean);
  await db.batch(statements.map(s=>db.prepare(s)));
 }
 await db.prepare('CREATE TABLE import_failure_probe(value TEXT NOT NULL)').run();
});
after(()=>mf?.dispose());
const snapshot=(overrides={})=>({schemaVersion:1,clientWorkoutId:crypto.randomUUID(),mode:'squat',goal:3,restSeconds:60,startedAt:1000000,completedAt:1030000,value:3,activeSeconds:10,elapsedSeconds:30,...overrides});
async function request(ownerId,s=snapshot(),targetDataEpoch=1){
 const prepared=await prepareWorkoutImport(s,{targetAccountId:ownerId,targetDataEpoch});
 return {ownerId,targetAccountId:ownerId,idempotencyKey:prepared.idempotencyKey,body:{digestVersion:prepared.digestVersion,targetDataEpoch,snapshot:prepared.snapshot,fingerprint:prepared.fingerprint},now:2000000};
}
const code=expected=>error=>error instanceof WorkoutImportError&&error.code===expected;
const rows=ownerId=>db.prepare('SELECT * FROM workouts WHERE user_id=?').bind(ownerId).all().then(result=>result.results);
const count=async(table,workoutId)=>(await db.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE workout_id=?`).bind(workoutId).first()).n;
const remove=(ownerId,expectedDataEpoch=1)=>deleteAccountDataAtEpoch(db,{ownerId,expectedDataEpoch,now:3000000,deletions:[db.prepare('DELETE FROM workouts WHERE user_id=?').bind(ownerId)]});

test('new partial personal history uses one import and terminal not_eligible decision',async()=>{
 const req=await request('partial',snapshot({value:0}));const result=await importWorkout(db,req);
 assert.equal(result.status,201);assert.equal(result.workout.value,0);assert.equal(result.workout.source,'guest_import');assert.equal(result.workout.competitive_status,'not_eligible');
 assert.equal(await count('workout_imports',result.workout.id),1);assert.equal(await count('competitive_decisions',result.workout.id),1);
 assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM workouts WHERE user_id=? AND source='server'").bind(req.ownerId).first()).n,0);
 assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM workouts WHERE user_id=? AND competitive_status='accepted'").bind(req.ownerId).first()).n,0);
});

test('exact lost-response replay returns original resource without new writes or freshness checks',async()=>{
 const req=await request('replay'),first=await importWorkout(db,req);
 const readOnly={prepare:sql=>{assert(sql.trimStart().startsWith('SELECT'));return db.prepare(sql);},batch:()=>assert.fail('Replay must not write')};
 const replay=await importWorkout(readOnly,{...req,now:0});assert.equal(replay.status,200);assert.deepEqual(replay.workout,first.workout);
 assert.equal(await count('workout_imports',first.workout.id),1);assert.equal(await count('competitive_decisions',first.workout.id),1);
});

test('twenty concurrent exact requests converge to one workout metadata and decision',async()=>{
 const req=await request('race'),results=await Promise.all(Array.from({length:20},()=>importWorkout(db,req)));
 assert.equal(results.filter(result=>result.status===201).length,1);assert.equal(results.filter(result=>result.status===200).length,19);
 assert.equal(new Set(results.map(result=>result.workout.id)).size,1);assert.equal((await rows('race')).length,1);
 assert.equal(await count('workout_imports',results[0].workout.id),1);assert.equal(await count('competitive_decisions',results[0].workout.id),1);
});

test('different immutable input for same owner/client conflicts and never overwrites',async()=>{
 const firstRequest=await request('conflict'),secondRequest=await request('conflict',{...firstRequest.body.snapshot,value:2});
 const first=await importWorkout(db,firstRequest);await assert.rejects(importWorkout(db,secondRequest),code('fingerprint_conflict'));
 assert.deepEqual((await importWorkout(db,firstRequest)).workout,first.workout);
 const raceSnapshot=snapshot(),a=await request('different-race',raceSnapshot),b=await request('different-race',{...raceSnapshot,value:1});
 const settled=await Promise.allSettled([importWorkout(db,a),importWorkout(db,b)]);
 assert.equal(settled.filter(result=>result.status==='fulfilled').length,1);assert.equal(settled.find(result=>result.status==='rejected').reason.code,'fingerprint_conflict');
 assert.equal((await rows('different-race')).length,1);
});

test('same client id under two authenticated accounts produces separate owned rows',async()=>{
 const source=snapshot(),a=await importWorkout(db,await request('account-a',source)),b=await importWorkout(db,await request('account-b',source));
 assert.notEqual(a.workout.id,b.workout.id);assert.equal(a.workout.client_workout_id,b.workout.client_workout_id);
 assert.equal(a.workout.user_id,'account-a');assert.equal(b.workout.user_id,'account-b');
});

test('target mismatch and forbidden body fields reject before any database access',async()=>{
 const req=await request('target');const untouched={prepare:()=>assert.fail('No database access allowed'),batch:()=>assert.fail('No database access allowed')};
 await assert.rejects(importWorkout(untouched,{...req,targetAccountId:'other'}),code('target_account_mismatch'));
 for(const [field,value] of [['ownerId','other'],['deviceId','device'],['xp',100],['source','server'],['competitive_status','accepted']])await assert.rejects(importWorkout(untouched,{...req,body:{...req.body,[field]:value}}),code('invalid_workout_import'));
 let hits=0;const body={...req.body};Object.defineProperty(body,'fingerprint',{enumerable:true,get(){hits++;return req.body.fingerprint;}});
 await assert.rejects(importWorkout(untouched,{...req,body}),code('invalid_workout_import'));assert.equal(hits,0);
});

test('fingerprint and idempotency header are recomputed before database access',async()=>{
 const req=await request('bad-hash'),untouched={prepare:()=>assert.fail('No DB access expected')};
 await assert.rejects(importWorkout(untouched,{...req,body:{...req.body,fingerprint:'0'.repeat(64)}}),code('invalid_fingerprint'));
 await assert.rejects(importWorkout(untouched,{...req,idempotencyKey:'0'.repeat(64)}),code('invalid_idempotency_key'));
 await assert.rejects(importWorkout(untouched,{...req,body:{...req.body,snapshot:{...req.body.snapshot,privateNotes:'forbidden'}}}),code('invalid_snapshot'));
});

test('deletion removes imported children and old epoch cannot resurrect; explicit newer epoch can import',async()=>{
 const req=await request('deleted'),first=await importWorkout(db,req);await remove(req.ownerId);
 assert.equal(await count('workout_imports',first.workout.id),0);assert.equal(await count('competitive_decisions',first.workout.id),0);
 await assert.rejects(importWorkout(db,req),code('target_epoch_mismatch'));assert.equal((await rows(req.ownerId)).length,0);
 const newer=await importWorkout(db,await request(req.ownerId,req.body.snapshot,2));assert.equal(newer.status,201);assert.notEqual(newer.workout.id,first.workout.id);
 await assert.rejects(importWorkout(db,req),code('target_epoch_mismatch'));assert.equal((await rows(req.ownerId)).length,1);
});

test('deletion immediately before guarded batch defeats stale provision/read',async()=>{
 const req=await request('delete-race');let fired=false;
 const wrapper={prepare:sql=>db.prepare(sql),batch:async statements=>{if(!fired){fired=true;await remove(req.ownerId);}return db.batch(statements);}};
 await assert.rejects(importWorkout(wrapper,req),code('target_epoch_mismatch'));
 assert.equal((await rows(req.ownerId)).length,0);assert.equal((await inspectAccountDataEpoch(db,req.ownerId)).currentDataEpoch,2);
});

test('late constraint failure rolls back workout, metadata, decision and cached status',async()=>{
 const req=await request('rollback');const wrapper={prepare:sql=>db.prepare(sql),batch:statements=>db.batch([...statements,db.prepare('INSERT INTO import_failure_probe(value) VALUES(NULL)')])};
 await assert.rejects(importWorkout(wrapper,req));assert.equal((await rows(req.ownerId)).length,0);
 const success=await importWorkout(db,req);assert.equal(success.status,201);assert.equal(await count('workout_imports',success.workout.id),1);assert.equal(await count('competitive_decisions',success.workout.id),1);
});

test('valid implicit-epoch1 imported fixture replays without provisioning or mutation',async()=>{
 const req=await request('implicit-import'),id=crypto.randomUUID(),s=req.body.snapshot;
 await db.batch([
  db.prepare("INSERT INTO workouts(id,user_id,mode,goal,started_at,completed_at,value,active,source,client_workout_id) VALUES(?,?,?,?,?,?,?,?,'guest_import',?)").bind(id,req.ownerId,s.mode,s.goal,s.startedAt,s.completedAt,s.value,s.activeSeconds,s.clientWorkoutId),
  db.prepare('INSERT INTO workout_imports(workout_id,idempotency_key,fingerprint,digest_version,account_data_epoch,created_at) VALUES(?,?,?,1,1,?)').bind(id,req.idempotencyKey,req.body.fingerprint,req.now),
 ]);
 assert.equal(await db.prepare('SELECT * FROM account_data_epochs WHERE owner_id=?').bind(req.ownerId).first(),null);
 const result=await importWorkout(db,req);assert.equal(result.status,200);assert.equal(result.workout.id,id);
 assert.equal(await db.prepare('SELECT * FROM account_data_epochs WHERE owner_id=?').bind(req.ownerId).first(),null);
});
