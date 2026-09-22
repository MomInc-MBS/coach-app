import {WorkoutImportCodecError,snapshotFromCompletedWorkout,prepareWorkoutImport} from '../workout-import-codec.mjs';
import {claimAssignment,assignmentStatus} from './import-assignment.mjs';

// No network and no asynchronous crypto within an IndexedDB transaction.
// Tokens are process-local capabilities, not serialized caller-supplied claims.
export function createImportPreparation({db,ownerId,deviceId,tables,source,persist,transact,read,policy,invalid,readOperation,StorageError}) {
 const tokens=new WeakMap(),same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 const own=(v,k)=>Object.prototype.hasOwnProperty.call(v,k);
 const record=(raw,keys)=>{
  if(!raw||typeof raw!=='object'||Array.isArray(raw)||![null,Object.prototype].includes(Object.getPrototypeOf(raw)))invalid('Expected own data fields.');
  const descriptors=Object.getOwnPropertyDescriptors(raw);
  if(Reflect.ownKeys(descriptors).length!==keys.length||keys.some(key=>!own(descriptors,key)||!own(descriptors[key],'value')||!descriptors[key].enumerable))invalid('Unexpected or accessor choice field.');
  return Object.fromEntries(keys.map(key=>[key,descriptors[key].value]));
 };
 const id=value=>{if(typeof value!=='string'||!value||value.length>512||value.trim()!==value)invalid('Invalid choice identifier.');return value;};
 const captureUnsafe=raw=>{
  // Inspect kind as data before selecting the exact supported input shape.
  const d=raw&&Object.getOwnPropertyDescriptor(raw,'kind');
  if(!d||!own(d,'value')||!['import','keep_local'].includes(d.value))invalid('Choose import or keep_local.');
  const input=record(raw,['decisionId','kind','selections',...(d.value==='import'?['targetAccountId','targetDataEpoch']:[])]);
  id(input.decisionId);
  if(!Array.isArray(input.selections)||Object.getPrototypeOf(input.selections)!==Array.prototype||input.selections.length<1||input.selections.length>100)invalid('Select between one and 100 workouts.');
  const descriptors=Object.getOwnPropertyDescriptors(input.selections),length=input.selections.length;
  if(Reflect.ownKeys(descriptors).length!==length+1)invalid('Selections must be dense data.');
  const selections=[];
  for(let i=0;i<length;i++){
   const descriptor=descriptors[i];if(!descriptor||!own(descriptor,'value'))invalid('Selections must be dense data.');
   const entry=record(descriptor.value,['clientWorkoutId','claimId','itemId']);
   for(const key of Object.keys(entry))id(entry[key]);
   selections.push(entry);
  }
  selections.sort((a,b)=>a.clientWorkoutId<b.clientWorkoutId?-1:a.clientWorkoutId>b.clientWorkoutId?1:0);
  if(new Set(selections.map(s=>s.clientWorkoutId)).size!==length||new Set(selections.flatMap(s=>[s.claimId,s.itemId])).size!==length*2)invalid('Choice selections and identities must be unique.');
  if(input.kind==='import'){
   id(input.targetAccountId);
   if(!Number.isSafeInteger(input.targetDataEpoch)||input.targetDataEpoch<1)invalid('Invalid target epoch.');
  }
  return {sourceOwnerId:ownerId,decisionId:input.decisionId,sourceDeviceId:deviceId,kind:input.kind,
   ...(input.kind==='import'?{targetAccountId:input.targetAccountId,targetDataEpoch:input.targetDataEpoch}:{}),preparationVersion:1,selections};
 };
 const capture=raw=>{try{return captureUnsafe(raw);}catch{invalid('Invalid explicit import choice.');}};
 const matching=(before,header)=>{
  const existing=before.decisions.find(row=>row.decisionId===header.decisionId);
  if(!existing)return null;
  if(!same(existing,header))invalid('Decision identity cannot change its selection, target or choice.');
  const items=before.items.filter(row=>row.decisionId===header.decisionId);
  if(items.length!==header.selections.length||header.selections.some(s=>!items.some(item=>item.clientWorkoutId===s.clientWorkoutId&&item.claimId===s.claimId&&item.itemId===s.itemId&&item.kind===header.kind)))invalid('Stored decision is incomplete.');
  return items;
 };
 const output=(state,items,duplicate)=>({items:items.map(item=>({item,status:assignmentStatus(state,item.claimId)})),duplicate});
 return Object.freeze({
  async prepareImportDecision(input){
   return readOperation('Import decision preparation',async()=>{
   try{
   const header=capture(input);
   if(!ownerId.startsWith('guest:'))invalid('Only guest history can be selected.');
   const prepared=await db.transaction('r',db.workouts,...tables,async()=>{
    const before=await read(),prior=matching(before,header);
    if(prior)return {header,retry:true};
    const rows=[];
    for(const selection of header.selections){
     const workout=await source(selection.clientWorkoutId);
     const head=before.heads.find(h=>h.clientWorkoutId===selection.clientWorkoutId)??null;
     if(head&&head.status!=='released')invalid('Selected workout is already covered.');
     rows.push({selection,workout,sourceRevision:JSON.stringify(workout),headRevision:JSON.stringify(head)});
    }
    return {header,rows};
   });
   if(!prepared.retry){
    prepared.claims=[];
    for(const row of prepared.rows){
     const {selections,preparationVersion,...choice}=header;
     const derived=header.kind==='import'?await prepareWorkoutImport(snapshotFromCompletedWorkout(row.workout),{targetAccountId:header.targetAccountId,targetDataEpoch:header.targetDataEpoch}):{};
     prepared.claims.push({...choice,...row.selection,completed:true,...derived});
    }
   }
   const token=Object.freeze({decisionId:header.decisionId,count:header.selections.length,kind:header.kind});
   tokens.set(token,prepared);return token;
   }catch(error){
    if(error instanceof WorkoutImportCodecError)throw new StorageError(error.code,error.message,{cause:error,recoverable:true});
    throw error;
   }
   });
  },
  async commitImportDecision(token){
   const prepared=tokens.get(token);if(!prepared)invalid('Use a preparation token from this owner scope.');
   return transact('Import decision',[db.workouts,...tables],async()=>{
    const before=await read(),prior=matching(before,prepared.header);
    if(prior)return output(before,prior,true);
    if(prepared.retry)invalid('The prepared historical decision no longer exists.');
    let state=before;const items=[];
    for(let i=0;i<prepared.rows.length;i++){
     const row=prepared.rows[i],workout=await source(row.selection.clientWorkoutId);
     const head=before.heads.find(h=>h.clientWorkoutId===row.selection.clientWorkoutId)??null;
     if(JSON.stringify(workout)!==row.sourceRevision||JSON.stringify(head)!==row.headRevision)invalid('Source or assignment changed after preparation.');
     const result=policy(()=>claimAssignment(state,prepared.claims[i]));
     if(result.duplicate)invalid('Decision has incomplete historical claims.');
     state=result.state;items.push(result.item);
    }
    await db.guestHistoryDecisions.add({...prepared.header,schemaVersion:1});
    await persist(before,state);
    return output(state,items,false);
   });
  },
 });
}
