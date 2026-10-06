import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {saveWorkoutPaths} from '../server/workout-paths.mjs';
import {deriveAccountPerformance,readAccountPerformance} from '../server/performance-progress.mjs';
import {STARTER_COACH_IDS,pathIntroCoachIds} from '../performance-catalog.mjs';

function database(){const sqlite=new DatabaseSync(':memory:');sqlite.exec(`CREATE TABLE account_data_epochs(owner_id TEXT PRIMARY KEY,epoch INTEGER NOT NULL,updated_at INTEGER NOT NULL);
 CREATE TABLE account_data_deletions(owner_id TEXT,deleted_epoch INTEGER,deleted_at INTEGER);
 CREATE TABLE workout_path_choices(user_id TEXT PRIMARY KEY,data_epoch INTEGER NOT NULL,paths TEXT NOT NULL,created_at INTEGER NOT NULL);
 CREATE TABLE workouts(id TEXT,mode TEXT,source TEXT,client_workout_id TEXT,value INTEGER,active INTEGER,completed_at INTEGER,performance_snapshot TEXT,user_id TEXT);
 CREATE TABLE breathing_sessions(id TEXT,completed_at INTEGER,user_id TEXT);
 CREATE TABLE meals(id TEXT,eaten_at TEXT,user_id TEXT);`);
 const stmt=(sql,args=[])=>({bind(...values){return stmt(sql,values);},first(){return sqlite.prepare(sql).get(...args)||null;},all(){return {results:sqlite.prepare(sql).all(...args)};},run(){return sqlite.prepare(sql).run(...args);}});
 return {sqlite,prepare:sql=>stmt(sql),async batch(statements){sqlite.exec('BEGIN');try{const result=statements.map(s=>s.run());sqlite.exec('COMMIT');return result;}catch(error){sqlite.exec('ROLLBACK');throw error;}}};}
const req=(paths,epoch=1,origin='https://coach.example')=>new Request('https://coach.example/api/performance/paths',{method:'POST',headers:{Origin:origin,'X-Target-Account':'owner-a','X-Expected-Data-Epoch':String(epoch)},body:JSON.stringify({paths})});
const parse=async request=>request.json();

test('account choice grants only canonical introductions and is stable across reads',async()=>{const db=database(),paths=['chest','arms-shoulders'];
 try{assert.deepEqual(await saveWorkoutPaths(req(paths),db,'owner-a',parse),{paths});assert.deepEqual(await saveWorkoutPaths(req([...paths].reverse()),db,'owner-a',parse),{paths});
  await assert.rejects(saveWorkoutPaths(req(['quads','cardio']),db,'owner-a',parse),{code:'paths_already_chosen'});
  const progress=await readAccountPerformance(db,'owner-a','UTC');assert.deepEqual(progress.paths,paths);assert.deepEqual(new Set(progress.coaches),new Set([...STARTER_COACH_IDS,...pathIntroCoachIds(paths)]));
  assert.equal(db.sqlite.prepare('SELECT count(*) AS n FROM workout_path_choices').get().n,1);
 }finally{db.sqlite.close();}});
test('malformed choices, other origins and stale account epochs cannot write',async()=>{const db=database();try{
 await assert.rejects(saveWorkoutPaths(req(['arms','quads']),db,'owner-a',parse),{code:'invalid_paths'});
 await assert.rejects(saveWorkoutPaths(req(['chest','chest']),db,'owner-a',parse),{code:'invalid_paths'});
 await assert.rejects(saveWorkoutPaths(req(['chest','cardio'],1,'https://other.example'),db,'owner-a',parse),{code:'origin_mismatch'});
 await assert.rejects(saveWorkoutPaths(req(['chest','cardio']),db,'owner-b',parse),{code:'target_mismatch'});
 db.sqlite.prepare('INSERT INTO account_data_epochs(owner_id,epoch,updated_at) VALUES(?,?,?)').run('owner-a',2,Date.now());
 db.sqlite.prepare('INSERT INTO account_data_deletions(owner_id,deleted_epoch,deleted_at) VALUES(?,?,?)').run('owner-a',1,Date.now());
 await assert.rejects(saveWorkoutPaths(req(['chest','cardio']),db,'owner-a',parse),{code:'target_epoch_mismatch'});
 assert.equal(db.sqlite.prepare('SELECT count(*) AS n FROM workout_path_choices').get().n,0);
 }finally{db.sqlite.close();}});
test('derivation never accepts client coach claims',()=>{const p=deriveAccountPerformance({paths:['yoga','martial-arts']});assert.deepEqual(new Set(p.coaches),new Set([...STARTER_COACH_IDS,...pathIntroCoachIds(p.paths)]));assert.deepEqual(p.weapons,{});assert.equal(p.totalXp,0);});
test('epoch changing between validation and write aborts the entire path choice',async()=>{const db=database(),batch=db.batch;db.batch=async statements=>{db.sqlite.prepare('INSERT INTO account_data_epochs(owner_id,epoch,updated_at) VALUES(?,?,?)').run('owner-a',2,Date.now());db.sqlite.prepare('INSERT INTO account_data_deletions(owner_id,deleted_epoch,deleted_at) VALUES(?,?,?)').run('owner-a',1,Date.now());return batch(statements);};try{
 await assert.rejects(saveWorkoutPaths(req(['chest','cardio']),db,'owner-a',parse),{code:'target_epoch_mismatch'});
 assert.equal(db.sqlite.prepare('SELECT count(*) AS n FROM workout_path_choices').get().n,0);
 }finally{db.sqlite.close();}});
test('a client cannot claim extra coaches in path choice body',async()=>{const db=database(),request=new Request('https://coach.example/api/performance/paths',{method:'POST',headers:{Origin:'https://coach.example','X-Target-Account':'owner-a','X-Expected-Data-Epoch':'1'},body:JSON.stringify({paths:['yoga','cardio'],coaches:['all'],totalXp:999999})});try{assert.deepEqual((await saveWorkoutPaths(request,db,'owner-a',parse)).paths,['yoga','cardio']);const p=await readAccountPerformance(db,'owner-a','UTC');assert.deepEqual(new Set(p.coaches),new Set([...STARTER_COACH_IDS,...pathIntroCoachIds(p.paths)]));assert.equal(p.totalXp,0);}finally{db.sqlite.close();}});
