import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {Miniflare} from 'miniflare';
import worker from '../server/worker.mjs';
import {prepareWorkoutImport} from '../workout-import-codec.mjs';
let mf,db;
before(async()=>{
 mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("ok")}}',d1Databases:['DB']});db=await mf.getD1Database('DB');
 for(const name of (await readdir('drizzle')).filter(n=>n.endsWith('.sql')).sort())await db.batch((await readFile('drizzle/'+name,'utf8')).split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean).map(s=>db.prepare(s)));
});
after(()=>mf?.dispose());
const snapshot=()=>({schemaVersion:1,clientWorkoutId:crypto.randomUUID(),mode:'squat',goal:5,restSeconds:60,startedAt:1000,completedAt:2000,value:0,activeSeconds:0,elapsedSeconds:1});
async function input(owner='http-owner'){
 const p=await prepareWorkoutImport(snapshot(),{targetAccountId:owner,targetDataEpoch:1});
 return {owner,headers:{'X-Target-Account':owner,'Idempotency-Key':p.idempotencyKey},body:{digestVersion:1,targetDataEpoch:1,snapshot:p.snapshot,fingerprint:p.fingerprint}};
}
async function call(data,{env={DB:db,WORKOUT_IMPORTS_ENABLED:'true'},user=data.owner,origin='https://coach.test',headers=data.headers,body=data.body}={}){
 const req=new Request('https://coach.test/api/workouts/import',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin,...(user?{'oai-authenticated-user-id':user}:{}),...headers},body:JSON.stringify(body)});
 const response=await worker.fetch(req,env);return {status:response.status,data:await response.json(),req};
}

test('unset, false and non-string gates return404 before database/auth/body access',async()=>{
 const data=await input();
 for(const value of [undefined,'false',false,true,'TRUE']){
  const env={WORKOUT_IMPORTS_ENABLED:value,get DB(){assert.fail('Disabled route accessed database');}};
  const response=await call(data,{env,user:null,body:{secret:'must stay unread'}});
  assert.equal(response.status,404);assert.equal(response.req.bodyUsed,false);
 }
});

test('enabled import requires same origin and authenticated canonical target',async()=>{
 const data=await input('http-target');
 assert.equal((await call(data,{user:null})).status,401);
 assert.equal((await call(data,{origin:'https://evil.test'})).status,403);
 const mismatch=await call(data,{user:'different-owner'});assert.equal(mismatch.status,409);assert.equal(mismatch.data.code,'target_mismatch');
 assert.equal(mismatch.req.bodyUsed,false);
 assert.equal((await db.prepare('SELECT COUNT(*) n FROM workouts').first()).n,0);
 assert.equal((await db.prepare('SELECT COUNT(*) n FROM account_data_epochs').first()).n,0);
});

test('enabled first import and exact retry return201 then200 and no rewards',async()=>{
 const data=await input('http-success');const first=await call(data),retry=await call(data);
 assert.equal(first.status,201);assert.equal(retry.status,200);assert.deepEqual(retry.data,first.data);
 assert.deepEqual(first.data.receipt,{targetAccountId:data.owner,targetDataEpoch:1,digestVersion:1,fingerprint:data.body.fingerprint,idempotencyKey:data.headers['Idempotency-Key']});
 assert.equal(first.data.workout.competitive_status,'not_eligible');assert.equal(first.data.workout.source,'guest_import');assert.equal(first.data.workout.user_id,'http-success');
 const response=await worker.fetch(new Request('https://coach.test/api/account',{headers:{'oai-authenticated-user-id':'http-success'}}),{DB:db});
 assert.equal((await response.json()).progress.xp,0);
});

test('privacy fields, malformed keys and failed storage do not log request data',async()=>{
 const data=await input('http-secret-owner'),logs=[],old=console.error;console.error=(...args)=>logs.push(args);
 try{
  const privacy=await call(data,{body:{...data.body,sourceOwnerId:'guest:secret'}});assert.equal(privacy.status,422);
  const key=await call(data,{headers:{...data.headers,'Idempotency-Key':'invalid-secret-key'}});assert.equal(key.status,422);assert.equal(key.data.code,'invalid_idempotency_key');
  const failing={prepare:sql=>{if(sql.includes('LEFT JOIN workout_imports'))throw new Error('injected private-key text');return db.prepare(sql);}};
  const failure=await call(data,{env:{DB:failing,WORKOUT_IMPORTS_ENABLED:'true'}});assert.equal(failure.status,503);assert.equal(failure.data.code,'import_unavailable');
  assert.deepEqual(logs,[]);
 }finally{console.error=old;}
});
