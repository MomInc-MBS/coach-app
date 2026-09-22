import {validateImportSnapshot,canonicalImportKey} from '../workout-import-codec.mjs';
export const IMPORT_ATTEMPT_STALE_MS=30000;
const own=(value,key)=>Object.prototype.hasOwnProperty.call(value,key);
const invalid=()=>{throw Error('Invalid import attempt record.');};
const id=value=>{if(typeof value!=='string'||!value||value.length>512||value.trim()!==value)invalid();};
const integer=(value,min=0)=>{if(!Number.isSafeInteger(value)||value<min)invalid();};
function data(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||![null,Object.prototype].includes(Object.getPrototypeOf(raw)))invalid();
 const descriptors=Object.getOwnPropertyDescriptors(raw),out={};
 if(Reflect.ownKeys(descriptors).some(key=>typeof key!=='string'||!own(descriptors[key],'value')||!descriptors[key].enumerable))invalid();
 for(const [key,descriptor]of Object.entries(descriptors))Object.defineProperty(out,key,{value:descriptor.value,enumerable:true});
 return out;
}
const exact=(record,keys)=>{if(Object.keys(record).length!==keys.length||keys.some(key=>!own(record,key)))invalid();};
const resultTypes=['imported','retryable_failure','parked','conflict','rejected'];
export function isAttemptEvent(event){return ['retry_budget_resumed','submission_started','retryable_failure','parked','conflict','rejected'].includes(event.type)||event.type==='imported'&&own(event,'attemptId');}
function captureBegin(raw){
 const v=data(raw);exact(v,['claimId','generation','attemptId','startedAt']);
 id(v.claimId);id(v.attemptId);integer(v.generation,1);integer(v.startedAt);
 integer(v.startedAt+IMPORT_ATTEMPT_STALE_MS);
 return {type:'submission_started',claimId:v.claimId,generation:v.generation,attemptId:v.attemptId,startedAt:v.startedAt,expiresAt:v.startedAt+IMPORT_ATTEMPT_STALE_MS};
}
function captureResult(raw){
 const v=data(raw);id(v.claimId);id(v.attemptId);integer(v.generation,1);integer(v.at);
 if(!resultTypes.includes(v.type))invalid();
 const keys=['claimId','generation','attemptId','type','at'];
 if(v.type==='imported'){
  keys.push('serverWorkoutId','httpStatus');id(v.serverWorkoutId);if(![200,201].includes(v.httpStatus))invalid();
 }else{
  keys.push('category');
  const categories={retryable_failure:['offline','timeout','rate_limited','server_unavailable','unknown_response'],parked:['signed_out','target_mismatch','feature_disabled','retry_exhausted','epoch_mismatch'],conflict:['fingerprint_conflict'],rejected:['invalid_payload','policy_rejected']};
  if(!categories[v.type].includes(v.category))invalid();
  if(own(v,'httpStatus')){keys.push('httpStatus');integer(v.httpStatus,100);if(v.httpStatus>599)invalid();}
  if(v.type==='retryable_failure'){keys.push('retryAt');integer(v.retryAt,v.at);if(v.retryAt-v.at>86400000)invalid();}
 }
 exact(v,keys);return Object.fromEntries(keys.map(key=>[key,v[key]]));
}
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
// Relational validation makes persisted malformed/orphan results fail closed.
export function validateAttemptEvents(events){
 const starts=new Map(),results=new Set();
 for(const event of events){
  if(!isAttemptEvent(event))continue;
  if(event.type==='retry_budget_resumed'){
   exact(event,['type','claimId','generation','resumeId','at']);id(event.claimId);id(event.resumeId);integer(event.generation,1);integer(event.at);
   const index=events.indexOf(event),next=events[index+1];
   if(!next||next.type!=='submission_started'||next.attemptId!==event.resumeId||next.claimId!==event.claimId||next.generation!==event.generation||next.startedAt!==event.at||projectImportAttempts(events.slice(0,index).filter(e=>e.claimId===event.claimId),event.at).status!=='parked')invalid();
  }else if(event.type==='submission_started'){
   const {type,expiresAt,attemptLimit,...input}=event,normalized=captureBegin(input);
   if(attemptLimit!==undefined){integer(attemptLimit,1);if(attemptLimit>5)invalid();normalized.attemptLimit=attemptLimit;}
   if(!same(event,normalized)||starts.has(event.attemptId))invalid();starts.set(event.attemptId,event);
  }else{
   const normalized=captureResult(event),start=starts.get(event.attemptId);
   // Property order is not semantic for caller/re-hydrated result records.
   if(Object.keys(event).length!==Object.keys(normalized).length||!start||results.has(event.attemptId)||start.claimId!==event.claimId||start.generation!==event.generation||event.at<start.startedAt)invalid();
   results.add(event.attemptId);
  }
 }
}
function projectWithoutBudget(events,now){
 if(events.some(e=>e.type==='imported'))return {status:'imported'};
 const terminal=events.find(e=>e.type==='conflict'||e.type==='rejected');if(terminal)return {status:terminal.type};
 const latest=events.filter(e=>e.type==='submission_started').at(-1);
 if(!latest)return {status:events.some(e=>e.type==='retry')?'retry':'pending'};
 const result=events.find(e=>e.attemptId===latest.attemptId&&e.type!=='submission_started');
 if(!result)return {status:now!==undefined&&now>=latest.expiresAt?'retryable':'in_flight',attemptId:latest.attemptId,retryAt:latest.expiresAt};
 return {status:result.type==='retryable_failure'?'retryable':result.type,attemptId:latest.attemptId,...(result.type==='retryable_failure'?{retryAt:result.retryAt}:{})};
}
export function importRetryBudget(events){
 const boundary=events.findLastIndex(e=>e.type==='retry_budget_resumed');
 const starts=events.slice(boundary+1).filter(e=>e.type==='submission_started');
 return {attemptNumber:starts.length,attemptLimit:starts[0]?.attemptLimit??3};
}
export function projectImportAttempts(events,now){
 const projection=projectWithoutBudget(events,now),budget=importRetryBudget(events);
 if(projection.status==='retryable'&&budget.attemptNumber>=budget.attemptLimit)return {...budget,status:'parked',category:'retry_exhausted'};
 return {...projection,...budget};
}
function preparedItem(state,claimId,ownerId,deviceId){
 const item=state.items.find(i=>i.claimId===claimId);
 if(!ownerId.startsWith('guest:')||!item||item.kind!=='import'||item.sourceOwnerId!==ownerId||item.sourceDeviceId!==deviceId)invalid();
 const header=state.decisions.find(d=>d.decisionId===item.decisionId);
 if(!header||header.preparationVersion!==1||header.kind!=='import'||header.sourceOwnerId!==ownerId||header.sourceDeviceId!==deviceId||!Array.isArray(header.selections)||header.selections.length<1||header.selections.length>100)invalid();
 exact(header,['sourceOwnerId','decisionId','sourceDeviceId','kind','targetAccountId','targetDataEpoch','preparationVersion','selections']);
 const rows=state.items.filter(i=>i.decisionId===header.decisionId),selected=new Set(),identities=new Set();
 if(rows.length!==header.selections.length)invalid();
 for(const s of header.selections){
  exact(s,['clientWorkoutId','claimId','itemId']);id(s.clientWorkoutId);id(s.claimId);id(s.itemId);
  if(selected.has(s.clientWorkoutId)||identities.has(s.claimId)||identities.has(s.itemId)||s.claimId===s.itemId)invalid();
  selected.add(s.clientWorkoutId);identities.add(s.claimId);identities.add(s.itemId);
  const row=rows.find(i=>i.clientWorkoutId===s.clientWorkoutId&&i.claimId===s.claimId&&i.itemId===s.itemId);
  if(!row||row.kind!=='import'||row.sourceOwnerId!==ownerId||row.sourceDeviceId!==deviceId||row.targetAccountId!==header.targetAccountId||row.targetDataEpoch!==header.targetDataEpoch||row.digestVersion!==1||typeof row.idempotencyKey!=='string'||!(/^[a-f0-9]{64}$/).test(row.idempotencyKey))invalid();
  validateImportSnapshot(row.snapshot);if(row.snapshot.clientWorkoutId!==row.clientWorkoutId)invalid();
  canonicalImportKey({digestVersion:row.digestVersion,targetAccountId:row.targetAccountId,targetDataEpoch:row.targetDataEpoch,clientWorkoutId:row.clientWorkoutId,fingerprint:row.fingerprint});
 }
 return item;
}
export function createImportAttempts({db,ownerId,deviceId,tables,read,persist,transact,readOperation,status,invalid:storageInvalid}){
 const guard=fn=>{try{return fn();}catch{storageInvalid('Invalid import attempt or incomplete prepared decision.');}};
 const inspect=(state,item,now)=>{
  const authoritative=status(state,item.claimId);
  if(['target_deleted','keep_local','imported','conflict','rejected'].includes(authoritative))return {status:authoritative};
  return projectImportAttempts(state.events.filter(e=>e.claimId===item.claimId),now);
 };
 return Object.freeze({
  async beginImportAttempt(input,{resumeParked=false,attemptLimit=3}={}){
   guard(()=>{integer(attemptLimit,1);if(attemptLimit>5)invalid();});
   const event=guard(()=>captureBegin(input));
   return transact('Import attempt start',tables,async()=>{
    const state=await read(),item=guard(()=>preparedItem(state,event.claimId,ownerId,deviceId));
    if(item.generation!==event.generation)storageInvalid('Import attempt generation mismatch.');
    // Exact retry may observe a terminal outcome; it never authorizes another POST.
    const prior=state.events.find(e=>e.type==='submission_started'&&e.attemptId===event.attemptId);
    if(prior){const {attemptLimit:_limit,...identity}=prior;if(!same(identity,event))storageInvalid('Attempt identity cannot change.');return {duplicate:true,item,...inspect(state,item,event.startedAt)};}
    const lastTime=state.events.reduce((latest,e)=>e.claimId===item.claimId?Math.max(latest,e.at??e.startedAt??0):latest,0);
    if(event.startedAt<lastTime)storageInvalid('Attempt time cannot precede prior observations.');
    const current=inspect(state,item,event.startedAt),head=state.heads.find(h=>h.claimId===item.claimId&&h.generation===item.generation&&h.clientWorkoutId===item.clientWorkoutId);
    if(!head||head.status!=='active'||current.status==='parked'&&resumeParked!==true||['target_deleted','imported','conflict','rejected','in_flight'].includes(current.status)||current.retryAt>event.startedAt)storageInvalid('Import attempt is not eligible.');
    const events=state.events.filter(e=>e.claimId===item.claimId),budget=importRetryBudget(events);
    const resuming=current.status==='parked'&&resumeParked===true;
    const limit=resuming||budget.attemptNumber===0?attemptLimit:budget.attemptLimit;
    if(!resuming&&budget.attemptNumber>=limit)storageInvalid('Import retry budget is exhausted.');
    const resume=resuming?[{type:'retry_budget_resumed',claimId:item.claimId,generation:item.generation,resumeId:event.attemptId,at:event.startedAt}]:[];
    const after={...state,events:[...state.events,...resume,{...event,attemptLimit:limit}]};guard(()=>validateAttemptEvents(after.events));await persist(state,after);
    return {duplicate:false,item,...inspect(after,item,event.startedAt)};
   });
  },
  async recordImportAttemptResult(input){
   const event=guard(()=>captureResult(input));
   return transact('Import attempt result',tables,async()=>{
    const state=await read(),item=guard(()=>preparedItem(state,event.claimId,ownerId,deviceId));
    if(item.generation!==event.generation)storageInvalid('Import attempt generation mismatch.');
    // Validate existing state even if a duplicate will be returned.
    guard(()=>validateAttemptEvents(state.events));status(state,item.claimId);
    const start=state.events.find(e=>e.type==='submission_started'&&e.attemptId===event.attemptId);
    if(!start||start.claimId!==event.claimId||start.generation!==event.generation||event.at<start.startedAt)storageInvalid('Result must match a committed attempt.');
    const prior=state.events.find(e=>e.attemptId===event.attemptId&&e.type!=='submission_started');
    if(prior){if(!same(captureResult(prior),event))storageInvalid('An attempt result cannot change.');return {duplicate:true,item,...inspect(state,item,event.at)};}
    const after={...state,events:[...state.events,event]};guard(()=>validateAttemptEvents(after.events));await persist(state,after);
    return {duplicate:false,item,...inspect(after,item,event.at)};
   });
  },
  async importAttemptState(claimId,now){
   guard(()=>{id(claimId);integer(now);});
   return readOperation('Import attempt status',()=>db.transaction('r',...tables,async()=>{const state=await read(),item=guard(()=>preparedItem(state,claimId,ownerId,deviceId));return {item,...inspect(state,item,now)};}));
  },
 });
}
