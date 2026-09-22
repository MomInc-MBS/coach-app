import test from 'node:test';
import assert from 'node:assert/strict';
import {indexedDB,IDBKeyRange} from 'fake-indexeddb';
import {openLocalCoach} from '../local-coach/repository.mjs';
import {createImportDrain} from '../local-coach/import-sync.mjs';
const enabled={version:1,uploadsEnabled:true};
function transitions(){let epoch=0;const listeners=new Set();return {capture:()=>({epoch}),isCurrent:ticket=>ticket.epoch===epoch,subscribe:fn=>{listeners.add(fn);return()=>listeners.delete(fn);},invalidate(){epoch++;for(const fn of listeners)fn();}};}
async function setup(count=1){
 const options={name:'drain-'+crypto.randomUUID(),indexedDB,IDBKeyRange,now:()=>1000};let repository=await openLocalCoach(options);const scope=repository.forOwner(repository.guestOwnerId),ids=[];
 for(let i=0;i<count;i++){const id=crypto.randomUUID();ids.push(id);await scope.startWorkout({clientWorkoutId:id,mode:'squat',goal:3,metadata:{private:'never transmit'}});await scope.completeWorkout(id,{value:3,activeSeconds:1,elapsedSeconds:1});}
 const input={decisionId:crypto.randomUUID(),kind:'import',targetAccountId:'alice',targetDataEpoch:1,selections:ids.map(clientWorkoutId=>({clientWorkoutId,claimId:crypto.randomUUID(),itemId:crypto.randomUUID()}))};
 await scope.commitImportDecision(await scope.prepareImportDecision(input));
 return {repository,scope,options,input,clock:{value:1000}};
}
function server(){const rows=new Map(),requests=[];return {rows,requests,async post(request){
 requests.push(request);const data=JSON.parse(request.body),key=request.headers['Idempotency-Key'],target=request.headers['X-Target-Account'];let status=200;
 if(!rows.has(key)){status=201;rows.set(key,{id:'server-'+rows.size,user_id:target,client_workout_id:data.snapshot.clientWorkoutId,source:'guest_import',competitive_status:'not_eligible',mode:data.snapshot.mode,goal:data.snapshot.goal,started_at:data.snapshot.startedAt,completed_at:data.snapshot.completedAt,value:data.snapshot.value,active:data.snapshot.activeSeconds});}
 return {status,body:{workout:{...rows.get(key)},receipt:{targetAccountId:target,targetDataEpoch:data.targetDataEpoch,digestVersion:data.digestVersion,fingerprint:data.fingerprint,idempotencyKey:key}}};
 }};}
function options(fixture,overrides={}){return {repository:fixture.scope,loadAccount:async()=>({user:{id:'alice'},dataEpoch:1}),postImport:async()=>{throw Error('Unexpected POST');},transition:transitions(),manifest:enabled,now:()=>fixture.clock.value,wait:async ms=>{fixture.clock.value+=ms;},random:()=>0,maxInlineDelayMs:0,...overrides};}
const run=drain=>drain.run({targetAccountId:'alice'});
const claim=async fixture=>(await fixture.scope.listImportAssignments()).items[0].claimId;

test('default disabled manifest performs no repository/auth/transport work',async()=>{
 let calls=0;const nope=()=>{calls++;throw Error('disabled');};
 assert.deepEqual(await run(createImportDrain({repository:{listImportAssignments:nope},loadAccount:nope,postImport:nope,transition:{capture:nope}})),{stopped:'disabled',posted:0,imported:0});assert.equal(calls,0);
});

test('each POST has fresh identity and exact private-field-free payload; source/outbox unchanged',async()=>{
 const f=await setup(2),s=server(),sequence=[],before=await f.scope.exportLocalData();
 const drain=createImportDrain(options(f,{loadAccount:async input=>{assert.equal(input.cache,'no-store');sequence.push('get');return {user:{id:'alice'},dataEpoch:1};},postImport:async request=>{sequence.push('post');assert.equal(request.path,'/api/workouts/import');assert.deepEqual(Object.keys(JSON.parse(request.body)).sort(),['digestVersion','fingerprint','snapshot','targetDataEpoch']);assert(!request.body.includes('guest:'));assert(!request.body.includes('private'));return s.post(request);}}));
 const result=await run(drain);assert.equal(result.imported,2);assert.deepEqual(sequence,['get','post','get','post']);
 const after=await f.scope.exportLocalData();for(const key of ['workouts','events','outbox'])assert.deepEqual(after[key],before[key]);f.repository.close();
});

test('wrong account and epoch mismatch park without POST or inferred deletion',async()=>{
 for(const account of [{user:{id:'bob'},dataEpoch:1,deletionEvidence:{ownerId:'alice',currentDataEpoch:2,deletedThroughEpoch:1}},{user:{id:'alice'},dataEpoch:2}]){
 const f=await setup();const summary=await run(createImportDrain(options(f,{loadAccount:async()=>account})));assert.equal(summary.posted,0);
 const state=await f.scope.listImportAssignments();assert.equal(state.heads[0].status,'active');assert.equal(state.events.at(-1).type,'parked');assert.equal(state.events.some(e=>e.type==='target_deleted'),false);f.repository.close();}
});

test('identity transition during fresh GET prevents begin and POST',async()=>{
 const f=await setup(),transition=transitions();const summary=await run(createImportDrain(options(f,{transition,loadAccount:async()=>{transition.invalidate();return {user:{id:'alice'},dataEpoch:1};}})));
 assert.equal(summary.posted,0);assert.equal((await f.scope.listImportAssignments()).events.length,0);f.repository.close();
});

test('transition after attempt commit prevents POST and parks immutable old item',async()=>{
 const f=await setup(),transition=transitions(),scope={...f.scope,async beginImportAttempt(input){const result=await f.scope.beginImportAttempt(input);transition.invalidate();return result;}};
 const summary=await run(createImportDrain(options(f,{repository:scope,transition})));assert.equal(summary.posted,0);assert.equal((await f.scope.listImportAssignments()).events.at(-1).type,'parked');f.repository.close();
});

test('late successful A reply after transition is not acknowledged and does not start another item',async()=>{
 const f=await setup(2),s=server(),transition=transitions();
 const summary=await run(createImportDrain(options(f,{transition,postImport:async request=>{const reply=await s.post(request);transition.invalidate();return reply;}})));
 assert.equal(summary.posted,1);assert.equal(summary.imported,0);assert.equal(s.rows.size,1);assert.equal((await f.scope.listImportAssignments()).events.some(e=>e.type==='imported'),false);f.repository.close();
});

test('malformed or mismatched success receipts never acknowledge; exhaustion remains parked until explicit resume',async()=>{
 for(const change of [receipt=>({...receipt,fingerprint:'b'.repeat(64)}),()=>null,receipt=>({...receipt,targetDataEpoch:2})]){
 const f=await setup(),s=server(),drain=createImportDrain(options(f,{maxAttemptsPerItem:1,postImport:async request=>{const reply=await s.post(request);reply.body.receipt=change(reply.body.receipt);return reply;}}));
 assert.equal((await run(drain)).imported,0);assert.equal((await f.scope.listImportAssignments()).events.at(-1).category,'retry_exhausted');const before=s.requests.length;await run(drain);assert.equal(s.requests.length,before);
 const successful=createImportDrain(options(f,{postImport:request=>s.post(request)}));await run(successful);assert.equal(s.requests.length,before);
 const resumed=await successful.run({targetAccountId:'alice',resumeParkedClaimIds:[await claim(f)]});assert.equal(resumed.imported,1);f.repository.close();}
});

test('429 Retry-After is persisted and no retry occurs before deadline',async()=>{
 const f=await setup(),s=server();let calls=0;const drain=createImportDrain(options(f,{postImport:async request=>++calls===1?{status:429,body:{code:'rate_limited'},retryAfter:'120'}:s.post(request)}));
 const first=await run(drain);assert.equal(first.retryAt,121000);assert.equal(calls,1);await run(drain);assert.equal(calls,1);f.clock.value=121000;assert.equal((await run(drain)).imported,1);f.repository.close();
});

test('bounded inline retries always recheck account and park once exhausted',async()=>{
 const f=await setup();let gets=0,posts=0;const drain=createImportDrain(options(f,{maxInlineDelayMs:1000,maxAttemptsPerItem:3,loadAccount:async()=>{gets++;return {user:{id:'alice'},dataEpoch:1};},postImport:async()=>{posts++;return {status:503,body:{code:'import_unavailable'}};}}));
 const summary=await run(drain);assert.equal(posts,3);assert.equal(gets,3);assert.equal(summary.parked,1);await run(drain);assert.equal(posts,3);f.repository.close();
});

test('lost reply and cold reopen replay identical immutable key to one server row',async()=>{
 const f=await setup(),s=server();const first=createImportDrain(options(f,{postImport:async request=>{await s.post(request);throw Error('lost response');}}));
 const summary=await run(first);assert.equal(summary.imported,0);f.repository.close();f.repository=await openLocalCoach(f.options);f.scope=f.repository.forOwner(f.repository.guestOwnerId);f.clock.value=summary.retryAt;
 assert.equal((await run(createImportDrain(options(f,{postImport:request=>s.post(request)})))).imported,1);assert.equal(s.rows.size,1);assert.equal(s.requests[0].body,s.requests[1].body);assert.equal(s.requests[0].headers['Idempotency-Key'],s.requests[1].headers['Idempotency-Key']);f.repository.close();
});

test('forced overlapping two-tab submissions converge through server idempotence',async()=>{
 const f=await setup(),s=server(),secondRepository=await openLocalCoach(f.options),secondScope=secondRepository.forOwner(secondRepository.guestOwnerId);let release,entered;
 const gate=new Promise(r=>release=r),ready=new Promise(r=>entered=r);
 const first=createImportDrain(options(f,{requestTimeoutMs:1000,postImport:async request=>{const reply=await s.post(request);entered();await gate;return reply;}}));
 const pending=run(first);await ready;f.clock.value+=30000;
 const second=createImportDrain(options(f,{repository:secondScope,postImport:request=>s.post(request)}));
 try{assert.equal((await run(second)).imported,1);}finally{release();}
 assert.equal((await pending).imported,1);assert.equal(s.requests.length,2);assert.equal(s.rows.size,1);assert.equal((await f.scope.importAttemptState(await claim(f),f.clock.value)).status,'imported');secondRepository.close();f.repository.close();
});

test('keep-local and ordinary guest outbox rows never cause network work',async()=>{
 const f=await setup(),old=(await f.scope.listImportAssignments()).items[0];await f.scope.releaseImportAssignment({claimId:old.claimId,generation:1,ownerId:'alice',deletedThroughEpoch:1,currentDataEpoch:2});
 await f.scope.commitImportDecision(await f.scope.prepareImportDecision({decisionId:crypto.randomUUID(),kind:'keep_local',selections:[{clientWorkoutId:old.clientWorkoutId,claimId:crypto.randomUUID(),itemId:crypto.randomUUID()}]}));
 let gets=0;const result=await run(createImportDrain(options(f,{loadAccount:async()=>{gets++;throw Error('unexpected');}})));assert.equal(result.posted,0);assert.equal(gets,0);assert.equal((await f.scope.listOutbox()).length,1);f.repository.close();
});

test('hung auth and transport have bounded deadlines with no false success',async()=>{
 for(const hung of ['loadAccount','postImport']){const f=await setup(),overrides={requestTimeoutMs:10,maxAttemptsPerItem:1,[hung]:()=>new Promise(()=>{})};
 const result=await run(createImportDrain(options(f,overrides)));assert.equal(result.imported,0);assert.equal((await f.scope.listImportAssignments()).events.at(-1).category,'retry_exhausted');f.repository.close();}
});

test('typed transport outcomes park or terminate without changing source/head ownership',async()=>{
 const cases=[
  [{status:401,body:{}},'parked','signed_out'],[{status:404,body:{}},'parked','feature_disabled'],
  [{status:409,body:{code:'target_mismatch'}},'parked','target_mismatch'],[{status:409,body:{code:'target_epoch_mismatch'}},'parked','epoch_mismatch'],
  [{status:409,body:{code:'fingerprint_conflict'}},'conflict','fingerprint_conflict'],[{status:422,body:{code:'invalid_snapshot'}},'rejected','invalid_payload'],
  [{status:403,body:{code:'policy_rejected'}},'rejected','policy_rejected'],
 ];
 for(const [reply,type,category]of cases){const f=await setup(),drain=createImportDrain(options(f,{postImport:async()=>reply}));await run(drain);const state=await f.scope.listImportAssignments();assert.equal(state.events.at(-1).type,type);assert.equal(state.events.at(-1).category,category);assert.equal(state.heads[0].status,'active');assert.equal((await f.scope.listOutbox()).length,1);assert.equal((await run(drain)).posted,0);f.repository.close();}
});

test('each item rechecks live account instead of trusting first item success',async()=>{
 const f=await setup(2),s=server();let reads=0;const summary=await run(createImportDrain(options(f,{loadAccount:async()=>({user:{id:++reads===1?'alice':'bob'},dataEpoch:1}),postImport:request=>s.post(request)})));
 assert.equal(reads,2);assert.equal(summary.posted,1);assert.equal(summary.imported,1);assert.equal(summary.stopped,'target_mismatch');f.repository.close();
});

test('cold reopen of unmatched committed attempt waits for expiry then replays unchanged item',async()=>{
 const f=await setup(),item=(await f.scope.listImportAssignments()).items[0];await f.scope.beginImportAttempt({claimId:item.claimId,generation:item.generation,attemptId:'crashed-attempt',startedAt:1000});f.repository.close();
 f.repository=await openLocalCoach(f.options);f.scope=f.repository.forOwner(f.repository.guestOwnerId);const s=server(),drain=createImportDrain(options(f,{postImport:request=>s.post(request)}));
 assert.equal((await run(drain)).posted,0);f.clock.value=31000;assert.equal((await run(drain)).imported,1);assert.equal(s.requests[0].headers['Idempotency-Key'],item.idempotencyKey);assert.deepEqual(JSON.parse(s.requests[0].body).snapshot,item.snapshot);f.repository.close();
});

test('forged workout owner/source cannot satisfy an otherwise matching receipt',async()=>{
 for(const changes of [{user_id:'bob'},{source:'server'},{competitive_status:'accepted'},{value:999}]){const f=await setup(),s=server();const summary=await run(createImportDrain(options(f,{maxAttemptsPerItem:1,postImport:async request=>{const reply=await s.post(request);Object.assign(reply.body.workout,changes);return reply;}})));assert.equal(summary.imported,0);assert.equal((await f.scope.listImportAssignments()).events.at(-1).category,'retry_exhausted');f.repository.close();}
});

test('unsupported manifests and unavailable identity cannot grant upload authority',async()=>{
 for(const manifest of [{version:2,uploadsEnabled:true},{version:1,uploadsEnabled:'true'},null]){assert.equal((await run(createImportDrain({manifest}))).stopped,'disabled');}
 const f=await setup();const summary=await run(createImportDrain(options(f,{transition:{capture(){throw Error('storage unavailable');}}})));assert.equal(summary.posted,0);assert.equal(summary.stopped,'identity_unavailable');f.repository.close();
});

test('a concurrent park during auth preflight cannot be resumed without explicit claim consent',async()=>{
 const f=await setup(),claimId=await claim(f);let gets=0;
 const summary=await run(createImportDrain(options(f,{loadAccount:async()=>{
  gets++;await f.scope.beginImportAttempt({claimId,generation:1,attemptId:'other-tab-attempt',startedAt:1000});
  await f.scope.recordImportAttemptResult({claimId,generation:1,attemptId:'other-tab-attempt',type:'parked',at:1000,category:'retry_exhausted'});
  return {user:{id:'alice'},dataEpoch:1};
 }})));
 assert.equal(gets,1);assert.equal(summary.posted,0);assert.equal((await f.scope.listImportAssignments()).events.length,2);assert.equal((await f.scope.importAttemptState(claimId,1000)).status,'parked');
 const s=server(),manual=createImportDrain(options(f,{postImport:request=>s.post(request)}));
 assert.equal((await manual.run({targetAccountId:'alice',resumeParkedClaimIds:[claimId]})).imported,1);f.repository.close();
});

test('bounded item budget does not starve later pending items behind imported history',async()=>{
 const f=await setup(2),s=server(),drain=createImportDrain(options(f,{maxItems:1,postImport:request=>s.post(request)}));
 assert.equal((await run(drain)).imported,1);assert.equal((await run(drain)).imported,1);assert.equal(s.rows.size,2);f.repository.close();
});

test('long 429 budget persists across cold reopens and resets only on explicit resume',async()=>{
 const f=await setup(),claimId=await claim(f);let posts=0;
 const postImport=async()=>{posts++;return {status:429,body:{},retryAfter:'120'};};
 const reopen=async()=>{f.repository.close();f.repository=await openLocalCoach(f.options);f.scope=f.repository.forOwner(f.repository.guestOwnerId);};
 for(let i=0;i<8;i++){await reopen();await run(createImportDrain(options(f,{postImport})));f.clock.value+=120000;}
 assert.equal(posts,3);assert.equal((await f.scope.importAttemptState(claimId,f.clock.value)).status,'parked');
 await createImportDrain(options(f,{postImport})).run({targetAccountId:'alice',resumeParkedClaimIds:[claimId]});
 for(let i=0;i<5;i++){f.clock.value+=120000;await reopen();await run(createImportDrain(options(f,{postImport})));}
 assert.equal(posts,6);const state=await f.scope.listImportAssignments();
 assert.equal(state.events.filter(e=>e.type==='retry_budget_resumed').length,1);
 assert.equal(state.events.filter(e=>e.type==='submission_started').length,6);
 assert.equal((await f.scope.importAttemptState(claimId,f.clock.value)).status,'parked');f.repository.close();
});

test('concurrent and duplicate explicit resume append only one budget boundary',async()=>{
 const f=await setup(),claimId=await claim(f),other=await openLocalCoach(f.options),scope2=other.forOwner(other.guestOwnerId);
 await f.scope.beginImportAttempt({claimId,generation:1,attemptId:'first',startedAt:1000},{attemptLimit:1});
 await f.scope.recordImportAttemptResult({claimId,generation:1,attemptId:'first',type:'parked',at:1000,category:'retry_exhausted'});
 const next={claimId,generation:1,attemptId:'resume',startedAt:1000};
 const results=await Promise.allSettled([f.scope.beginImportAttempt(next,{resumeParked:true,attemptLimit:2}),scope2.beginImportAttempt({...next,attemptId:'other-resume'},{resumeParked:true,attemptLimit:5})]);
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
 const events=(await f.scope.listImportAssignments()).events,start=events.filter(e=>e.type==='submission_started').at(-1);
 const retry=await scope2.beginImportAttempt({claimId,generation:1,attemptId:start.attemptId,startedAt:start.startedAt},{resumeParked:true,attemptLimit:5});
 assert.equal(retry.duplicate,true);assert.equal(retry.attemptNumber,1);assert.equal(retry.attemptLimit,start.attemptLimit);
 assert.equal((await f.scope.listImportAssignments()).events.length,events.length);
 assert.equal(events.filter(e=>e.type==='retry_budget_resumed').length,1);other.close();f.repository.close();
});

test('crashed final start expires into exhausted park across reopen',async()=>{
 const f=await setup(),claimId=await claim(f);
 await f.scope.beginImportAttempt({claimId,generation:1,attemptId:'crashed-last',startedAt:1000},{attemptLimit:1});
 f.repository.close();f.repository=await openLocalCoach(f.options);f.scope=f.repository.forOwner(f.repository.guestOwnerId);f.clock.value=31000;
 const state=await f.scope.importAttemptState(claimId,31000);assert.equal(state.status,'parked');assert.equal(state.category,'retry_exhausted');
 await assert.rejects(f.scope.beginImportAttempt({claimId,generation:1,attemptId:'automatic',startedAt:31000},{attemptLimit:5}));
 const resumed=await f.scope.beginImportAttempt({claimId,generation:1,attemptId:'manual',startedAt:31000},{resumeParked:true,attemptLimit:2});
 assert.equal(resumed.attemptNumber,1);assert.equal(resumed.attemptLimit,2);f.repository.close();
});
