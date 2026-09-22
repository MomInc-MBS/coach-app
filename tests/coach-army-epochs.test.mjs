import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {Miniflare} from 'miniflare';
import {readFile,readdir} from 'node:fs/promises';
import worker from '../server/worker.mjs';
import {recordCoachArmyCompletion,createCoachArmyBinding,claimCoachArmyBinding} from '../server/entitlements.mjs';
import {startCoachArmyRun,recordVerifiedCoachArmyEvent,startDjscratchChallenge,recordDjscratchControl,deliverCoachArmyOutbox,COACH_ARMY_STAGES} from '../server/coach-army-runs.mjs';
let mf,db,env;
before(async()=>{mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("ok")}}',d1Databases:['DB']});db=await mf.getD1Database('DB');env={DB:db,COACH_ARMY_COMPLETION_SECRET:'test-secret'};for(const f of(await readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort())await db.batch((await readFile(`drizzle/${f}`,'utf8')).split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean).map(s=>db.prepare(s)));});
after(()=>mf.dispose());
test('additive migration preserves legacy producer rows and fixes their generation at 1',async()=>{
 const legacy=new Miniflare({modules:true,script:'export default {fetch(){return new Response("ok")}}',d1Databases:['DB']});
 try{const old=await legacy.getD1Database('DB');for(const f of(await readdir('drizzle')).filter(f=>f.endsWith('.sql')&&!f.startsWith('0020')).sort())await old.batch((await readFile(`drizzle/${f}`,'utf8')).split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean).map(s=>old.prepare(s)));
 await old.batch([
  old.prepare("INSERT INTO coach_army_runs(id,account_id,started_at,updated_at) VALUES('legacy-run','legacy',10,20)"),
  old.prepare("INSERT INTO coach_army_run_events(event_id,run_id,account_id,sequence,stage,source,received_at) VALUES('legacy-event','legacy-run','legacy',1,'djscratch','verifier',20)"),
  old.prepare("INSERT INTO coach_army_completion_outbox(event_id,run_id,account_id,completed_at,updated_at) VALUES('legacy-outbox','legacy-run','legacy',30,30)"),
  old.prepare("INSERT INTO coach_army_djscratch_challenges(id,run_id,account_id,expires_at,created_at,updated_at) VALUES('legacy-challenge','legacy-run','legacy',100,10,20)"),
  old.prepare("INSERT INTO coach_army_bindings(binding_id,run_id,account_id,event_id,claim_hash,completed_at,expires_at,created_at) VALUES('legacy-binding','gala-run','legacy','legacy-binding-event','legacy-hash',30,100,30)"),
  old.prepare("INSERT INTO coach_army_completions(event_id,user_id,completed_at,received_at) VALUES('legacy-completion','legacy',30,30)"),
  old.prepare("INSERT INTO account_entitlements(user_id,updated_at) VALUES('legacy',30)")
 ]);
 const tables=['coach_army_runs','coach_army_run_events','coach_army_completion_outbox','coach_army_djscratch_challenges','coach_army_bindings','coach_army_completions','account_entitlements'],beforeRows=await Promise.all(tables.map(t=>old.prepare(`SELECT * FROM ${t}`).first()));
 await old.batch((await readFile('drizzle/0020_coach_army_data_epochs.sql','utf8')).split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean).map(s=>old.prepare(s)));
 for(const [i,t] of tables.entries())assert.deepEqual(await old.prepare(`SELECT * FROM ${t}`).first(),{...beforeRows[i],data_epoch:1});
 }finally{await legacy.dispose();}
});
async function http(path,owner,epoch,data,method='POST',extra={}){const response=await worker.fetch(new Request('https://coach.test'+path,{method,headers:{Origin:'https://coach.test','Content-Type':'application/json','oai-authenticated-user-id':owner,'X-Target-Account':owner,'X-Expected-Data-Epoch':String(epoch),...extra},body:JSON.stringify(data)}),env);return {status:response.status,data:await response.json()};}
const remove=(owner,epoch=1)=>http('/api/account',owner,epoch,{confirm:'DELETE',expectedDataEpoch:epoch},'DELETE');
const event=(owner,id,epoch=1)=>({eventType:'coach_army.completed',accountId:owner,eventId:id,completedAt:1000,dataEpoch:epoch});
function beforeBatch(action){let used=false;return {prepare:db.prepare.bind(db),batch:async statements=>{if(!used){used=true;await action();}return db.batch(statements);}};}
async function empty(owner){for(const [table,column] of [['coach_army_runs','account_id'],['coach_army_run_events','account_id'],['coach_army_completion_outbox','account_id'],['coach_army_djscratch_challenges','account_id'],['coach_army_bindings','account_id'],['coach_army_completions','user_id'],['account_entitlements','user_id']])assert.equal((await db.prepare(`SELECT count(*) n FROM ${table} WHERE ${column}=?`).bind(owner).first()).n,0,table);}
async function gala(id){await db.prepare('INSERT INTO gala_runs(id,token_hash,creator,started_at,completed_at) VALUES(?,?,?,?,?)').bind(id,'hash-'+id,'creator',1,100).run();}
test('HTTP producer assertions required; old completion rejected after deletion; explicit epoch 2 creates new history',async()=>{
 const owner='http-owner';assert.equal((await http('/api/coach-army/runs',owner,1,{},'POST',{'X-Target-Account':'wrong'})).status,409);
 const old=event(owner,'http-event');assert.equal((await http('/api/integrations/coach-army/completion',owner,1,old,'POST',{Authorization:'Bearer test-secret'})).status,200);
 assert.equal((await remove(owner)).status,200);
 assert.equal((await http('/api/integrations/coach-army/completion',owner,1,old,'POST',{Authorization:'Bearer test-secret'})).status,409);
 const legacy={...old};delete legacy.dataEpoch;await assert.rejects(recordCoachArmyCompletion(db,legacy),e=>e.code==='target_epoch_mismatch');
 assert.equal((await http('/api/coach-army/runs',owner,2,{})).data.run.dataEpoch,2);
 assert.equal((await recordCoachArmyCompletion(db,{...old,dataEpoch:2})).dataEpoch,2);
 await remove(owner,1);assert.equal((await db.prepare('SELECT data_epoch FROM account_entitlements WHERE user_id=?').bind(owner).first()).data_epoch,2);
});
test('completion read/delete/batch race cannot restore ledger or entitlement',async()=>{
 const owner='completion-race';await assert.rejects(recordCoachArmyCompletion(beforeBatch(()=>remove(owner)),event(owner,'completion-race')),e=>e.code==='target_epoch_mismatch');await empty(owner);
});
test('exact retry is immutable; cross-owner event collision cannot grant second owner',async()=>{
 const original=event('collision-a','collision-event');const granted=await recordCoachArmyCompletion(db,original);assert.deepEqual(await recordCoachArmyCompletion(db,original),granted);
 await assert.rejects(recordCoachArmyCompletion(db,{...original,completedAt:1001}),e=>e.status===409);
 await assert.rejects(recordCoachArmyCompletion(db,{...original,accountId:'collision-b'}),e=>e.status===409);await empty('collision-b');
});
test('concurrent event identity conflict cannot split event ledger and grant',async()=>{
 const a=event('concurrent-a','concurrent-id'),b=event('concurrent-b','concurrent-id');const results=await Promise.allSettled([recordCoachArmyCompletion(db,a),recordCoachArmyCompletion(db,b)]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);const ledger=await db.prepare('SELECT user_id FROM coach_army_completions WHERE event_id=?').bind(a.eventId).first();const rows=(await db.prepare("SELECT user_id FROM account_entitlements WHERE user_id IN ('concurrent-a','concurrent-b')").all()).results;assert.deepEqual(rows,[ledger]);
});
test('binding capture/delete/batch race rejected; Gala anonymous token record remains outside account deletion',async()=>{
 const owner='binding-race',runId='gala-binding-race';await gala(runId);
 await assert.rejects(createCoachArmyBinding(beforeBatch(()=>remove(owner)),{runId,accountId:owner,eventId:'binding-race',completedAt:1000,dataEpoch:1}),e=>e.code==='target_epoch_mismatch');await empty(owner);
 assert.ok(await db.prepare('SELECT id FROM gala_runs WHERE id=?').bind(runId).first());
});
test('claim delete race creates no grant; database failure rolls claim and grant back together',async()=>{
 const owner='claim-race',runId='gala-claim-race';await gala(runId);const binding=await createCoachArmyBinding(db,{runId,accountId:owner,eventId:'claim-race',completedAt:1000},1000);
 await assert.rejects(claimCoachArmyBinding(beforeBatch(()=>remove(owner)),{...binding,accountId:owner},1001),e=>e.code==='target_epoch_mismatch');await empty(owner);
 const rollbackOwner='claim-rollback';const other=await createCoachArmyBinding(db,{runId,accountId:rollbackOwner,eventId:'claim-rollback',completedAt:1000},1000);
 const broken={prepare:db.prepare.bind(db),batch:statements=>db.batch([...statements,db.prepare('INSERT INTO account_data_epochs(owner_id,epoch,updated_at) VALUES(NULL,1,1)')])};
 await assert.rejects(claimCoachArmyBinding(broken,{...other,accountId:rollbackOwner},1001));
 assert.equal((await db.prepare('SELECT claimed_at FROM coach_army_bindings WHERE binding_id=?').bind(other.bindingId).first()).claimed_at,null);
 assert.equal((await db.prepare('SELECT count(*) n FROM coach_army_completions WHERE user_id=?').bind(rollbackOwner).first()).n,0);
 assert.equal((await claimCoachArmyBinding(db,{...other,accountId:rollbackOwner},1002)).status,'completed');
});
test('old verifier cannot label epoch-2 run; stage/delete/batch race rolls event and outbox back',async()=>{
 const owner='run-race';const run=await startCoachArmyRun(db,owner,1000);
 await assert.rejects(recordVerifiedCoachArmyEvent(beforeBatch(()=>remove(owner)),{runId:run.id,accountId:owner,eventId:'run-race-event',sequence:1,stage:'djscratch',dataEpoch:1},1001),e=>e.code==='target_epoch_mismatch');await empty(owner);
 const newer=await startCoachArmyRun(db,owner,1002,{dataEpoch:2});await assert.rejects(recordVerifiedCoachArmyEvent(db,{runId:newer.id,accountId:owner,eventId:'legacy-new-run',sequence:1,stage:'djscratch'},1003),e=>e.status===409);
});
test('final DJ control and verifier event roll back together on storage failure',async()=>{
 const owner='dj-rollback',run=await startCoachArmyRun(db,owner,1000),c=await startDjscratchChallenge(db,run.id,owner,1001);
 for(const [key,value] of [['bass',8],['treble',3],['volume',7]])await recordDjscratchControl(db,{runId:run.id,challengeId:c.id,key,value},owner,1002);
 let batches=0;const broken={prepare:db.prepare.bind(db),batch:statements=>db.batch(++batches===2?[...statements,db.prepare('INSERT INTO account_data_epochs(owner_id,epoch,updated_at) VALUES(NULL,1,1)')]:statements)};
 await assert.rejects(recordDjscratchControl(broken,{runId:run.id,challengeId:c.id,key:'tempo',value:9},owner,1003));assert.equal((await db.prepare('SELECT next_step FROM coach_army_djscratch_challenges WHERE id=?').bind(c.id).first()).next_step,3);assert.equal((await db.prepare('SELECT count(*) n FROM coach_army_run_events WHERE run_id=?').bind(run.id).first()).n,0);
 assert.equal((await recordDjscratchControl(db,{runId:run.id,challengeId:c.id,key:'tempo',value:9},owner,1004)).complete,true);
});
test('outbox keeps producer epoch while delivery overlaps actual account DELETE',async()=>{
 const owner='outbox-race',run=await startCoachArmyRun(db,owner,1000);for(const [index,stage] of COACH_ARMY_STAGES.entries())await recordVerifiedCoachArmyEvent(db,{runId:run.id,accountId:owner,eventId:`outbox-${index}`,sequence:index+1,stage,dataEpoch:1},1001+index);
 const original=globalThis.fetch;let sent;
 globalThis.fetch=async(url,options)=>{sent=JSON.parse(options.body);await remove(owner);await assert.rejects(recordCoachArmyCompletion(db,sent,2000),e=>e.code==='target_epoch_mismatch');return new Response('{}',{status:409});};
 try{assert.equal((await deliverCoachArmyOutbox(db,{COACH_ARMY_ENTITLEMENT_URL:'https://test.invalid/complete',COACH_ARMY_ENTITLEMENT_TOKEN:'test'},2000)).delivered,0);}finally{globalThis.fetch=original;}
 assert.equal(sent.dataEpoch,1);await empty(owner);
});
