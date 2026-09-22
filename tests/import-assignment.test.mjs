import test from 'node:test';
import assert from 'node:assert/strict';
import {ImportAssignmentError, emptyImportAssignmentState, claimAssignment, recordImported,
  recordImportOutcome, releaseAssignment, assignmentStatus} from '../local-coach/import-assignment.mjs';

const sha = 'a'.repeat(64);
const claim = (overrides = {}) => ({
  sourceOwnerId: 'guest:alice', sourceDeviceId: 'device/alice', clientWorkoutId: 'workout/1',
  decisionId: 'decision/1', claimId: 'claim/1', itemId: 'item/1', completed: true, kind: 'import',
  targetAccountId: 'alice', targetDataEpoch: 1, fingerprint: sha, snapshot: {sets: [3]}, ...overrides,
});
const proof = (overrides = {}) => ({claimId:'claim/1',generation:1,ownerId:'alice',deletedThroughEpoch:1,currentDataEpoch:2,...overrides});
const nextClaim = (overrides = {}) => claim({decisionId:'decision/2',claimId:'claim/2',itemId:'item/2',targetAccountId:'bob',...overrides});
const mustFail = (fn, code) => assert.throws(fn, error => error instanceof ImportAssignmentError && error.code === code);
const started = () => claimAssignment(emptyImportAssignmentState(),claim()).state;

test('A imported, deleted, then B deliberately claims: one new head and immutable old item', () => {
  let state = started();
  const before = state, oldItem = state.items[0];
  state = recordImported(state,{...claim(),generation:1}).state;
  state = releaseAssignment(state,proof()).state;
  const result = claimAssignment(state,nextClaim()); state=result.state;
  assert.equal(result.item.generation,2);
  assert.equal(state.heads.length,1);
  assert.equal(state.heads[0].claimId,'claim/2');
  assert.equal(state.items[0],oldItem);
  assert.equal(before.heads[0].status,'active');
  assert.equal(before.events.length,0);
  assert.equal(assignmentStatus(state,'claim/1'),'target_deleted');
});

test('deletion through 3 rejects stale account epochs and permits 4', () => {
  const state = releaseAssignment(started(),proof({deletedThroughEpoch:3,currentDataEpoch:4})).state;
  for(const targetDataEpoch of [1,2,3]) mustFail(()=>claimAssignment(state,nextClaim({targetAccountId:'alice',targetDataEpoch})),'deleted-target-epoch');
  assert.equal(claimAssignment(state,nextClaim({targetAccountId:'alice',targetDataEpoch:4})).item.generation,2);
});

test('authentic newer deletion evidence advances watermark without adding a second tombstone', () => {
  let state=releaseAssignment(started(),proof()).state;
  state=releaseAssignment(state,proof({deletedThroughEpoch:3,currentDataEpoch:4})).state;
  assert.equal(state.events.filter(e=>e.type==='target_deleted').length,1);
  assert.equal(state.events.filter(e=>e.type==='deletion_evidence').length,1);
  assert.equal(releaseAssignment(state,proof()).state,state);
  mustFail(()=>claimAssignment(state,nextClaim({targetAccountId:'alice',targetDataEpoch:2})),'deleted-target-epoch');
});

test('late A success/retry/deletion replay cannot alter the current B claim', () => {
  let state=releaseAssignment(started(),proof()).state;
  state=claimAssignment(state,nextClaim()).state;
  assert.equal(recordImported(state,{...claim(),generation:1}).state,state);
  assert.equal(recordImportOutcome(state,{...claim(),generation:1,type:'retry'}).state,state);
  assert.equal(releaseAssignment(state,proof()).state,state);
  const newer=releaseAssignment(state,proof({deletedThroughEpoch:3,currentDataEpoch:4})).state;
  assert.deepEqual(newer.heads,state.heads);
  assert.equal(assignmentStatus(newer,'claim/2'),'pending');
});

test('exact choice retry survives release; changed source, target, IDs, kind or snapshot conflicts', () => {
  const first=claimAssignment(emptyImportAssignmentState(),claim());
  const state=releaseAssignment(first.state,proof()).state;
  const retry=claimAssignment(state,claim());
  assert.equal(retry.state,state); assert.equal(retry.item,first.item); assert.equal(retry.duplicate,true);
  for(const change of [{targetAccountId:'bob'},{targetDataEpoch:2},{sourceDeviceId:'other'},
    {snapshot:{sets:[4]}},{claimId:'other'},{fingerprint:'b'.repeat(64)}])
    mustFail(()=>claimAssignment(state,claim(change)),'decision-conflict');
});

test('one decision may cover multiple workouts and canonical JSON ignores object key order', () => {
  let state=claimAssignment(emptyImportAssignmentState(),claim({snapshot:{b:2,a:1}})).state;
  assert.equal(claimAssignment(state,claim({snapshot:{a:1,b:2}})).state,state);
  state=claimAssignment(state,claim({clientWorkoutId:'workout/2',claimId:'claim/2',itemId:'item/2'})).state;
  assert.equal(state.items.length,2); assert.equal(state.heads.length,2);
});

test('keep-local is terminal with no target, snapshot, hash or events', () => {
  const input=claim({kind:'keep_local'});
  for(const key of ['targetAccountId','targetDataEpoch','fingerprint','snapshot']) delete input[key];
  const result=claimAssignment(emptyImportAssignmentState(),input);
  for(const key of ['targetAccountId','targetDataEpoch','fingerprint','snapshot']) assert.equal(Object.hasOwn(result.item,key),false);
  assert.equal(result.state.events.length,0);
  assert.equal(claimAssignment(result.state,input).state,result.state);
  mustFail(()=>claimAssignment(result.state,nextClaim()),'covered');
  mustFail(()=>releaseAssignment(result.state,proof()),'invalid-deletion-proof');
  mustFail(()=>claimAssignment(emptyImportAssignmentState(),{...input,targetAccountId:'alice'}),'invalid-record');
});

test('head is replaced rather than appended across repeated deletion/import cycles', () => {
  let state=emptyImportAssignmentState();
  for(let generation=1;generation<=4;generation++){
    const input=claim({decisionId:'d'+generation,claimId:'c'+generation,itemId:'i'+generation,targetDataEpoch:generation});
    const result=claimAssignment(state,input);state=result.state;
    assert.equal(result.item.generation,generation);
    state=releaseAssignment(state,proof({claimId:input.claimId,generation,deletedThroughEpoch:generation,currentDataEpoch:generation+1})).state;
    assert.equal(state.heads.length,1);
  }
});

test('snapshot is detached and deeply frozen, retaining an own __proto__ property', () => {
  const source=JSON.parse('{"nested":{"count":1},"__proto__":{"safe":true}}'),input=claim({snapshot:source});
  const before=JSON.stringify(input),state=emptyImportAssignmentState();
  const result=claimAssignment(state,input);
  assert.equal(JSON.stringify(input),before); assert.equal(Object.isFrozen(input),false);
  source.nested.count=9;
  assert.equal(result.item.snapshot.nested.count,1);
  assert.equal(Object.hasOwn(result.item.snapshot,'__proto__'),true);
  assert.equal(Object.getPrototypeOf(result.item.snapshot),Object.prototype);
  assert.throws(()=>{result.item.snapshot.nested.count=10;},TypeError);
  assert.equal(state.items.length,0);
});

test('scope keys cannot collide through embedded separators', () => {
  let state=claimAssignment(emptyImportAssignmentState(),claim({sourceOwnerId:'guest:a',clientWorkoutId:'b\u0000c'})).state;
  state=claimAssignment(state,nextClaim({sourceOwnerId:'guest:a\u0000b',clientWorkoutId:'c'})).state;
  assert.equal(state.heads.length,2);
});

test('malformed proofs and wrong-source callbacks leave input unchanged', () => {
  const state=started(),before=JSON.stringify(state);
  for(const change of [{ownerId:'bob'},{generation:2},{claimId:'missing'},{currentDataEpoch:1}])
    mustFail(()=>releaseAssignment(state,proof(change)),'invalid-deletion-proof');
  for(const change of [{currentDataEpoch:1.5},{deletedThroughEpoch:0},{currentDataEpoch:Infinity}])
    mustFail(()=>releaseAssignment(state,proof(change)),'invalid-record');
  mustFail(()=>recordImported(state,{...claim(),generation:1,sourceDeviceId:'other'}),'not-found');
  assert.equal(JSON.stringify(state),before);
});

test('JSON validation rejects cycles, getters, sparse arrays, nonfinite values and unknown claim fields', () => {
  const cycle={};cycle.self=cycle;
  const getter={get value(){throw Error('must not execute');}};
  for(const snapshot of [cycle,getter,{a:undefined},[,,],{a:NaN},new Date()])
    mustFail(()=>claimAssignment(emptyImportAssignmentState(),claim({snapshot})),'invalid-record');
  for(const change of [{completed:false},{sourceOwnerId:'account:alice'},{targetDataEpoch:0},{fingerprint:'x'},{extra:true}])
    mustFail(()=>claimAssignment(emptyImportAssignmentState(),claim(change)),'invalid-record');
});

test('IDs are globally unique and safe generation overflow is rejected', () => {
  const state=started();
  mustFail(()=>claimAssignment(state,nextClaim({clientWorkoutId:'other',claimId:'item/1'})),'id-conflict');
  const overflow=structuredClone(releaseAssignment(state,proof()).state);
  overflow.items[0].generation=Number.MAX_SAFE_INTEGER;
  overflow.heads[0].generation=Number.MAX_SAFE_INTEGER;
  overflow.events[0].generation=Number.MAX_SAFE_INTEGER;
  mustFail(()=>claimAssignment(overflow,nextClaim()),'invalid-record');
});

test('retry never releases a claim and cannot regress imported success', () => {
  let state=started();
  state=recordImportOutcome(state,{...claim(),generation:1,type:'retry'}).state;
  assert.equal(assignmentStatus(state,'claim/1'),'retry');
  assert.equal(state.heads[0].status,'active');
  mustFail(()=>claimAssignment(state,nextClaim()),'covered');
  state=recordImported(state,{...claim(),generation:1}).state;
  assert.equal(recordImportOutcome(state,{...claim(),generation:1,type:'retry'}).state,state);
  assert.equal(assignmentStatus(state,'claim/1'),'imported');
});


test('decision retries are scoped to the guest as well as workout', () => {
  let state=started();
  const other=claim({sourceOwnerId:'guest:bob',claimId:'claim/b',itemId:'item/b'});
  const result=claimAssignment(state,other);
  assert.equal(result.item.generation,1);
  assert.equal(result.state.heads.length,2);
  assert.equal(claimAssignment(result.state,other).duplicate,true);
});

test('rehydrated caller state stays mutable and detached on new and duplicate paths', () => {
  const cases = [
    [started(), s=>claimAssignment(s,nextClaim({clientWorkoutId:'other'}))],
    [started(), s=>claimAssignment(s,claim())],
    [started(), s=>recordImported(s,{...claim(),generation:1})],
    [recordImported(started(),{...claim(),generation:1}).state,s=>recordImported(s,{...claim(),generation:1})],
    [started(),s=>releaseAssignment(s,proof())],
    [releaseAssignment(started(),proof()).state,s=>releaseAssignment(s,proof())],
  ];
  for (const [original,run] of cases) {
    const input=structuredClone(original), before=JSON.stringify(input);
    const result=run(input), output=JSON.stringify(result);
    assert.equal(JSON.stringify(input),before);
    input.items[0].snapshot.sets.push(9);
    input.heads[0].status='changed';
    input.events.push({});
    assert.equal(JSON.stringify(result),output);
    assert.equal(Object.isFrozen(result.state.items[0].snapshot.sets),true);
  }
});

test('shared snapshot expansion is bounded and exotic arrays reject without caller code', () => {
  let snapshot=0;
  for(let i=0;i<40;i++) snapshot=[snapshot,snapshot];
  mustFail(()=>claimAssignment(emptyImportAssignmentState(),claim({snapshot})),'invalid-record');
  class CustomArray extends Array { map() { throw Error('must not execute'); } }
  for(const snapshot of [Object.setPrototypeOf([1],null),new CustomArray(1,2)])
    mustFail(()=>claimAssignment(emptyImportAssignmentState(),claim({snapshot})),'invalid-record');
});

test('claim, callback and proof accessors reject before they can change validated fields', () => {
  let reads=0;
  const input=claim();
  Object.defineProperty(input,'kind',{enumerable:true,get(){reads++;return reads===1?'keep_local':'import';}});
  mustFail(()=>claimAssignment(emptyImportAssignmentState(),input),'invalid-record');
  const callback={...claim(),generation:1};
  Object.defineProperty(callback,'type',{enumerable:true,get(){reads++;return reads===1?'imported':'target_deleted';}});
  mustFail(()=>recordImportOutcome(started(),callback),'invalid-record');
  mustFail(()=>recordImported(started(),callback),'invalid-record');
  const evidence=proof();
  Object.defineProperty(evidence,'ownerId',{enumerable:true,get(){reads++;return 'alice';}});
  mustFail(()=>releaseAssignment(started(),evidence),'invalid-record');
  assert.equal(reads,0);
  const inherited=Object.create(claim());
  mustFail(()=>claimAssignment(emptyImportAssignmentState(),inherited),'invalid-record');
});

test('state cloning precedes validation and clone errors use the domain error', () => {
  const input=structuredClone(started());
  let reads=0;
  Object.defineProperty(input.events,'0',{enumerable:true, configurable:true,get(){
    reads++;
    return {type:'target_deleted',claimId:'claim/1',generation:1};
  }});
  mustFail(()=>assignmentStatus(input,'claim/1'),'invalid-state');
  assert.equal(reads,1);
  for (const input of [{...started(),extra:()=>{}},new Proxy(started(),{}),null])
    mustFail(()=>assignmentStatus(input,'claim/1'),'invalid-state');
});

test('rehydrated malformed deletion evidence fails closed instead of poisoning the watermark', () => {
  const original=releaseAssignment(started(),proof()).state;
  for (const change of [{deletedThroughEpoch:undefined},{deletedThroughEpoch:NaN},{deletedThroughEpoch:0},
    {currentDataEpoch:1},{currentDataEpoch:Infinity},{targetAccountId:'bob'},{targetAccountId:null},
    {type:'deletion_evidence',deletedThroughEpoch:undefined}]) {
    const input=structuredClone(original);
    Object.assign(input.events[0],change);
    mustFail(()=>claimAssignment(input,nextClaim({targetAccountId:'alice',targetDataEpoch:2})),'invalid-state');
    mustFail(()=>assignmentStatus(input,'claim/1'),'invalid-state');
  }
});

test('account deletion watermark dominates newer-claim callbacks but releases only the matching head', () => {
  let state=releaseAssignment(started(),proof({deletedThroughEpoch:5,currentDataEpoch:6})).state;
  state=claimAssignment(state,nextClaim({targetAccountId:'alice',targetDataEpoch:6})).state;
  state=recordImported(state,{...nextClaim({targetAccountId:'alice',targetDataEpoch:6}),generation:2}).state;
  const head=state.heads[0];
  state=releaseAssignment(state,proof({deletedThroughEpoch:7,currentDataEpoch:8})).state;
  assert.equal(state.heads[0],head);
  assert.equal(head.status,'active');
  assert.equal(assignmentStatus(state,'claim/2'),'target_deleted');
  for (const type of ['imported','retry']) {
    const result=recordImportOutcome(state,{...nextClaim(),generation:2,type});
    assert.equal(result.state,state);
    assert.equal(result.duplicate,true);
  }
  mustFail(()=>claimAssignment(state,nextClaim({decisionId:'d3',claimId:'c3',itemId:'i3',targetDataEpoch:8,targetAccountId:'alice'})),'covered');
  state=releaseAssignment(state,proof({claimId:'claim/2',generation:2,deletedThroughEpoch:7,currentDataEpoch:8})).state;
  assert.equal(state.heads[0].status,'released');
  assert.equal(claimAssignment(state,nextClaim({decisionId:'d3',claimId:'c3',itemId:'i3',targetDataEpoch:8,targetAccountId:'alice'})).item.generation,3);
});

test('snapshot proxies cannot invoke value getters or array species and errors stay typed', () => {
  const revoked=Proxy.revocable({},{});revoked.revoke();
  mustFail(()=>claimAssignment(emptyImportAssignmentState(),claim({snapshot:revoked.proxy})),'invalid-record');
  const throwing=new Proxy({}, {ownKeys(){throw new TypeError('trap');}});
  mustFail(()=>claimAssignment(emptyImportAssignmentState(),claim({snapshot:throwing})),'invalid-record');
  let reads=0;
  const snapshot=new Proxy([1,2],{get(){reads++;throw new Error('must not read live values');}});
  const result=claimAssignment(emptyImportAssignmentState(),claim({snapshot}));
  assert.deepEqual(result.item.snapshot,[1,2]);
  assert.equal(reads,0);
});

test('arbitrary thrown proxy errors and symbol descriptor traps fail closed', () => {
  const revoked=Proxy.revocable({},{});revoked.revoke();
  for(const thrown of [revoked.proxy,new ImportAssignmentError('forged')]) {
    const snapshot=new Proxy({}, {ownKeys(){throw thrown;}});
    mustFail(()=>claimAssignment(emptyImportAssignmentState(),claim({snapshot})),'invalid-record');
    mustFail(()=>claimAssignment(emptyImportAssignmentState(),snapshot),'invalid-record');
  }
  const symbol=Symbol('hidden');
  const snapshot=new Proxy({[symbol]:1},{ownKeys(){return [symbol];}});
  mustFail(()=>claimAssignment(emptyImportAssignmentState(),claim({snapshot})),'invalid-record');
});

test('prepared metadata is paired, versioned, import-only and immutable across retry',()=>{
 const input=claim({digestVersion:1,idempotencyKey:'b'.repeat(64)}),first=claimAssignment(emptyImportAssignmentState(),input);
 assert.equal(first.item.digestVersion,1);assert.equal(first.item.idempotencyKey,'b'.repeat(64));
 assert.equal(claimAssignment(first.state,input).duplicate,true);
 mustFail(()=>claimAssignment(first.state,{...input,idempotencyKey:'c'.repeat(64)}),'decision-conflict');
 for(const changes of [{digestVersion:2},{digestVersion:undefined},{idempotencyKey:undefined}])mustFail(()=>claimAssignment(emptyImportAssignmentState(),{...input,...changes}),'invalid-record');
 const keep=claim({kind:'keep_local',digestVersion:1,idempotencyKey:'b'.repeat(64)});
 for(const key of ['targetAccountId','targetDataEpoch','fingerprint','snapshot'])delete keep[key];
 mustFail(()=>claimAssignment(emptyImportAssignmentState(),keep),'invalid-record');
});
