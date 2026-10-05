import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {Miniflare} from 'miniflare';
import {readFile,readdir} from 'node:fs/promises';
import worker from '../server/worker.mjs';
import {prepareWorkoutImport} from '../workout-import-codec.mjs';
let mf,db;
before(async()=>{mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("ok")}}',d1Databases:['DB']});db=await mf.getD1Database('DB');for(const name of(await readdir('drizzle')).filter(n=>n.endsWith('.sql')).sort())await db.batch((await readFile(`drizzle/${name}`,'utf8')).split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean).map(s=>db.prepare(s)));});
after(()=>mf?.dispose());
async function progress(owner){const response=await worker.fetch(new Request('https://coach.test/api/account',{headers:{'oai-authenticated-user-id':owner}}),{DB:db});assert.equal(response.status,200);return (await response.json()).progress;}
async function add(owner,index,{version=2,source='guest_import'}={}){
 const completedAt=Date.parse('2025-01-01T12:00:00Z')+index*2*86400000,id=crypto.randomUUID();
 const snapshot={schemaVersion:1,clientWorkoutId:id,mode:'knee-pushup',goal:8,restSeconds:30,startedAt:completedAt-30000,completedAt,value:8,activeSeconds:30,elapsedSeconds:30,...(version===2?{performance:{version:2,kind:'reps',difficulty:'easy',maxContinuousSeconds:0,perDifficultyContinuous:{},holdBlocks:[],coachId:'myr5',rounds:0}}:{})};
 const canonical=(await prepareWorkoutImport(snapshot,{targetAccountId:owner,targetDataEpoch:1})).snapshot;
 return db.prepare('INSERT INTO workouts(id,user_id,mode,goal,started_at,completed_at,value,active,source,competitive_status,client_workout_id,performance_snapshot) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').bind(id,owner,snapshot.mode,8,snapshot.startedAt,completedAt,8,30,source,null,source==='server'?null:id,version===2?JSON.stringify(canonical):null);
}
test('verified v2 performance sessions unlock the existing power thresholds without adding legacy XP or completed sets',async()=>{
 const owner='v2-power-owner';let inserted=0;
 for(const count of [3,4,15,16,35,36,195,196]){
  const statements=[];for(;inserted<count;inserted++)statements.push(await add(owner,inserted));if(statements.length)await db.batch(statements);
  const p=await progress(owner);assert.equal(Object.keys(p.performance.sessions).length,count);assert.equal(p.completedSets,0);assert.equal(p.xp,0);assert.equal(p.level,1);
  assert.deepEqual(p.unlocks,{shieldBreak:count>=196,ember:count>=4,arc:count>=16,frost:count>=36});
 }
 const other=await progress('other-power-owner');assert.equal(other.unlocks.ember,false);
});
test('legacy guest imports cannot authorize powers, while old server completions retain their existing gate',async()=>{
 const legacy='legacy-power-owner',server='server-power-owner';const statements=[];
 for(let i=0;i<4;i++){statements.push(await add(legacy,i,{version:1}));statements.push(await add(server,i,{version:1,source:'server'}));}await db.batch(statements);
 const imported=await progress(legacy);assert.equal(imported.completedSets,0);assert.deepEqual(imported.unlocks,{shieldBreak:false,ember:false,arc:false,frost:false});
 const old=await progress(server);assert.equal(old.completedSets,4);assert.equal(old.xp,100);assert.equal(old.unlocks.ember,true);assert.equal(old.unlocks.arc,false);
});
