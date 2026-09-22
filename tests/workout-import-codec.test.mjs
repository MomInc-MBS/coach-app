import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {IMPORT_MODE_LIMITS,IMPORT_SNAPSHOT_KEYS,WorkoutImportCodecError,validateImportSnapshot,snapshotFromCompletedWorkout,canonicalImportSnapshot,fingerprintImportSnapshot,canonicalImportKey,importIdempotencyKey,prepareWorkoutImport} from '../workout-import-codec.mjs';

const uuid='11111111-1111-4111-8111-111111111111';
const sample=()=>({schemaVersion:1,clientWorkoutId:uuid,mode:'squat',goal:5,restSeconds:60,startedAt:1700000000000,completedAt:1700000010000,value:5,activeSeconds:8,elapsedSeconds:10});
const target=()=>({targetAccountId:'alice',targetDataEpoch:1});
const key=()=>({digestVersion:1,...target(),clientWorkoutId:uuid,fingerprint:'0'.repeat(64)});
const invalid=(run,code='invalid_snapshot')=>assert.throws(run,error=>error instanceof WorkoutImportCodecError&&error.code===code);
const hash=text=>createHash('sha256').update(text,'utf8').digest('hex');

test('canonical bytes pin key order, version, UTF-8 hashes and key tuple',async()=>{
 const s=sample(),expected='[1,{"schemaVersion":1,"clientWorkoutId":"11111111-1111-4111-8111-111111111111","mode":"squat","goal":5,"restSeconds":60,"startedAt":1700000000000,"completedAt":1700000010000,"value":5,"activeSeconds":8,"elapsedSeconds":10}]';
 assert.equal(canonicalImportSnapshot(s),expected);
 assert.equal(canonicalImportSnapshot(Object.fromEntries(Object.entries(s).reverse())),expected);
 const result=await prepareWorkoutImport(s,target());
 assert.equal(result.fingerprint,hash(expected));
 assert.equal(result.idempotencyKey,hash(JSON.stringify([1,'alice',1,uuid,result.fingerprint])));
 assert.equal(result.fingerprint,'d2f05059fe6dcd73d59d61874ddeeb4d63b497de98cd9af56b34769831a8928a');
 assert.equal(result.idempotencyKey,'c7810341070ce2dbbb47b68990785a3268362888909673dc1cbede811368efa0');
 assert.ok(Object.isFrozen(result)&&Object.isFrozen(result.snapshot));
 assert.deepEqual(Object.keys(result.snapshot),IMPORT_SNAPSHOT_KEYS);
 const unicode={...key(),targetAccountId:'account-é'};
 assert.equal(await importIdempotencyKey(unicode),hash(canonicalImportKey(unicode)));
});

test('every minimal field is required; unknown, hidden, symbol and accessor fields reject',()=>{
 for(const field of IMPORT_SNAPSHOT_KEYS){const s=sample();delete s[field];invalid(()=>validateImportSnapshot(s));}
 for(const field of ['deviceId','sourceOwnerId','sourceOwnerDigest','intake','metadata','pose','camera','xp','earned','constructor','__proto__']){
   const s=sample();Object.defineProperty(s,field,{value:'private',enumerable:true});invalid(()=>validateImportSnapshot(s));
 }
 let reads=0;const s=sample();Object.defineProperty(s,'mode',{get(){reads++;return 'squat';},enumerable:true});invalid(()=>validateImportSnapshot(s));assert.equal(reads,0);
 for(const extra of [Object.defineProperty(sample(),'hidden',{value:1}),Object.assign(sample(),{[Symbol('secret')]:1}),Object.create(sample()),null,[],new Date()])invalid(()=>validateImportSnapshot(extra));
});

test('UUIDv4, schema version and mode boundaries are exact without coercion',()=>{
 for(const id of [uuid.toUpperCase().replace('11111111','AAAAAAAA'),'11111111-1111-1111-8111-111111111111','11111111-1111-4111-7111-111111111111','legacy-id',` ${uuid}`,null])invalid(()=>validateImportSnapshot({...sample(),clientWorkoutId:id}));
 for(const mode of ['unknown','SQUAT',' squat','__proto__','constructor'])invalid(()=>validateImportSnapshot({...sample(),mode}));
 for(const schemaVersion of [0,2,'1'])invalid(()=>validateImportSnapshot({...sample(),schemaVersion}));
});

test('all numeric fields reject fractions, NaN, unsafe values, negative zero and strings',()=>{
 for(const field of ['goal','restSeconds','startedAt','completedAt','value','activeSeconds','elapsedSeconds']){
  for(const n of [-1,-0,.5,NaN,Infinity,Number.MAX_SAFE_INTEGER+1,'1',null,undefined])invalid(()=>validateImportSnapshot({...sample(),[field]:n}));
 }
 for(const [field,n] of [['goal',0],['goal',100001],['restSeconds',14],['restSeconds',181],['value',100001],['activeSeconds',7201],['elapsedSeconds',7201],['completedAt',1699999999999],['startedAt',8640000000000001]])invalid(()=>validateImportSnapshot({...sample(),[field]:n}));
 invalid(()=>validateImportSnapshot({...sample(),activeSeconds:11}));
 assert.equal(validateImportSnapshot({...sample(),goal:100000,value:100000,restSeconds:180,activeSeconds:7200,elapsedSeconds:7200}).goal,100000);
 for(const mode of ['tree','boxing']){
  assert.equal(validateImportSnapshot({...sample(),mode,goal:7200,value:7200}).goal,7200);
  invalid(()=>validateImportSnapshot({...sample(),mode,goal:7201}));
  invalid(()=>validateImportSnapshot({...sample(),mode,value:7201}));
 }
});

test('projection copies only allowed fields and never edits source or reads nested privacy data',()=>{
 const s=sample(),row={...s,status:'completed',ownerId:'guest:secret',deviceId:'secret',completion:{value:5,activeSeconds:8,elapsedSeconds:10,earned:true},metadata:{secret:'private'},progress:{secret:true}};
 Object.defineProperty(row.metadata,'health',{get(){throw Error('must not read metadata');},enumerable:true});
 const result=snapshotFromCompletedWorkout(row);
 assert.deepEqual(result,s);assert.equal(row.completion.earned,true);assert.equal(row.ownerId,'guest:secret');
 assert.equal(JSON.stringify(result).includes('secret'),false);
 for(const completion of [{value:5,elapsedSeconds:10},{value:5,activeSeconds:1.5,elapsedSeconds:10},{value:5,activeSeconds:8}])invalid(()=>snapshotFromCompletedWorkout({...row,completion}),'snapshot_unavailable');
 invalid(()=>snapshotFromCompletedWorkout({...row,status:'active'}),'snapshot_unavailable');
 invalid(()=>snapshotFromCompletedWorkout({...row,clientWorkoutId:'legacy-id'}),'snapshot_unavailable');
});

test('snapshot is detached and all inputs are captured before hashing yields',async()=>{
 const input=sample(),destination=target(),pending=prepareWorkoutImport(input,destination);
 input.value=6;destination.targetAccountId='bob';destination.targetDataEpoch=2;
 const result=await pending,expected=await prepareWorkoutImport(sample(),target());
 assert.deepEqual(result,expected);
});

test('fingerprints cover each payload field and keys cover target, epoch, id and fingerprint',async()=>{
 const base=sample(),baseline=await fingerprintImportSnapshot(base);
 const changes={clientWorkoutId:'22222222-2222-4222-8222-222222222222',mode:'pushup',goal:6,restSeconds:61,startedAt:1699999999999,completedAt:1700000010001,value:6,activeSeconds:7,elapsedSeconds:11};
 for(const [field,value] of Object.entries(changes))assert.notEqual(await fingerprintImportSnapshot({...base,[field]:value}),baseline);
 const initial=await importIdempotencyKey(key());
 for(const change of [{targetAccountId:'bob'},{targetDataEpoch:2},{clientWorkoutId:changes.clientWorkoutId},{fingerprint:'1'.repeat(64)}])assert.notEqual(await importIdempotencyKey({...key(),...change}),initial);
 invalid(()=>canonicalImportSnapshot(base,2),'unsupported_digest_version');
 invalid(()=>canonicalImportKey({...key(),digestVersion:2}),'unsupported_digest_version');
});

test('key scope validates exact inputs and rejects accessors without evaluating them',()=>{
 for(const targetAccountId of ['', ' alice','alice\n','a\u0000b','a'.repeat(513),1])invalid(()=>canonicalImportKey({...key(),targetAccountId}),'invalid_key_input');
 for(const targetDataEpoch of [0,-0,1.1,'1',Number.MAX_SAFE_INTEGER+1])invalid(()=>canonicalImportKey({...key(),targetDataEpoch}),'invalid_key_input');
 for(const fingerprint of ['0'.repeat(63),'A'.repeat(64),'x'.repeat(64)])invalid(()=>canonicalImportKey({...key(),fingerprint}),'invalid_key_input');
 invalid(()=>canonicalImportKey({...key(),deviceId:'secret'}),'invalid_key_input');
 let reads=0;const k=key();Object.defineProperty(k,'targetAccountId',{get(){reads++;return 'alice';},enumerable:true});invalid(()=>canonicalImportKey(k),'invalid_key_input');assert.equal(reads,0);
});

test('versioned mode set matches current server domain, including legacy jumping',async()=>{
 const {MODES}=await import('../server/domain.mjs');
 assert.deepEqual(Object.keys(IMPORT_MODE_LIMITS).sort(),Object.keys(MODES).sort());
});

test('proxy reflection failures are typed without inspecting thrown values',()=>{
 const revoked=Proxy.revocable({},{});revoked.revoke();
 const snapshot=new Proxy({}, {ownKeys(){throw revoked.proxy;}});
 invalid(()=>validateImportSnapshot(snapshot));
 invalid(()=>snapshotFromCompletedWorkout(snapshot),'snapshot_unavailable');
 const symbol=Symbol('hidden');
 invalid(()=>validateImportSnapshot(new Proxy({...sample(),[symbol]:1},{})));
});
