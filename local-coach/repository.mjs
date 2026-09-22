import Dexie from 'dexie';
import {z} from 'zod';
import {IMPORT_LEDGER_STORES,importLedgerTables,readImportLedger,deleteImportLedger,createImportLedger} from './import-ledger.mjs';
import {EXERCISES,validateOnboarding} from '../onboarding-domain.mjs';

export const LOCAL_COACH_SCHEMA_VERSION=1;
export const LOCAL_COACH_LAYOUT_VERSION=2;
export const LOCAL_COACH_EXPORT_VERSION=1;
export const DEFAULT_LOCAL_COACH_DB='myr5-local-coach';

const TimestampSchema=z.number().int().nonnegative();
const OwnerIdSchema=z.string().min(1).max(512).regex(/^(guest|account):\S+$/,'Owner must have a non-empty guest or account scope.');
const DeviceIdSchema=z.string().min(1).max(128);
const IdentifierSchema=z.string().min(1).max(128);
const LeaseTokenSchema=z.string().min(1).max(512);
const JsonValueSchema=z.lazy(()=>z.union([z.string(),z.number().finite(),z.boolean(),z.null(),z.array(JsonValueSchema),z.record(z.string(),JsonValueSchema)]));
const JsonObjectSchema=z.record(z.string(),JsonValueSchema).refine(value=>JSON.stringify(value).length<=131072,'JSON object exceeds the 128 KiB local-record limit.');
const IntakeSchema=z.unknown().transform((value,context)=>{
 try{return validateOnboarding(value);}catch(error){context.addIssue({code:'custom',message:error instanceof Error?error.message:'Invalid coach setup.'});return z.NEVER;}
});
const SettingsSchema=JsonObjectSchema;
const StartDaySchema=z.string().regex(/^\d{4}-\d{2}-\d{2}$/,'Start day must be a local calendar date.');
const WorkoutStatusSchema=z.enum(['active','paused','completed','interrupted']);
const ModeSchema=z.string().min(1).max(80);
const WorkoutStartSchema=z.object({
 clientWorkoutId:IdentifierSchema.optional(),
 mode:ModeSchema,
 goal:z.number().int().min(1).max(100000),
 restSeconds:z.number().int().min(15).max(180).default(60),
 progress:JsonObjectSchema.default({}),
 metadata:JsonObjectSchema.default({}),
});
const WorkoutPatchSchema=z.object({
 progress:JsonObjectSchema.optional(),
 metadata:JsonObjectSchema.optional(),
});
const CompletionSchema=z.object({
 value:z.number().finite().min(0).max(100000),
 activeSeconds:z.number().finite().min(0).max(7200).optional(),
 elapsedSeconds:z.number().finite().min(0).max(7200).optional(),
 earned:z.boolean().optional(),
 progress:JsonObjectSchema.optional(),
 metadata:JsonObjectSchema.optional(),
});

const MetaRecordSchema=z.object({key:z.string(),ownerId:OwnerIdSchema.optional(),value:JsonValueSchema,updatedAt:TimestampSchema,schemaVersion:z.literal(LOCAL_COACH_SCHEMA_VERSION)});
const IntakeRecordSchema=z.object({ownerId:OwnerIdSchema,deviceId:DeviceIdSchema,value:IntakeSchema,updatedAt:TimestampSchema,schemaVersion:z.literal(LOCAL_COACH_SCHEMA_VERSION)});
const SettingsRecordSchema=z.object({ownerId:OwnerIdSchema,deviceId:DeviceIdSchema,value:SettingsSchema,updatedAt:TimestampSchema,schemaVersion:z.literal(LOCAL_COACH_SCHEMA_VERSION)});
const WorkoutRecordSchema=z.object({
 id:IdentifierSchema,
 clientWorkoutId:IdentifierSchema,
 ownerId:OwnerIdSchema,
 deviceId:DeviceIdSchema,
 mode:ModeSchema,
 goal:z.number().int().min(1).max(100000),
 restSeconds:z.number().int().min(15).max(180),
 status:WorkoutStatusSchema,
 progress:JsonObjectSchema,
 metadata:JsonObjectSchema,
 completion:CompletionSchema.optional(),
 startedAt:TimestampSchema,
 updatedAt:TimestampSchema,
 completedAt:TimestampSchema.optional(),
 interruptedAt:TimestampSchema.optional(),
 schemaVersion:z.literal(LOCAL_COACH_SCHEMA_VERSION),
});
const EventRecordSchema=z.object({id:IdentifierSchema,workoutId:IdentifierSchema,ownerId:OwnerIdSchema,deviceId:DeviceIdSchema,sequence:z.number().int().positive(),type:z.enum(['started','updated','paused','resumed','completed','interrupted']),payload:JsonObjectSchema,createdAt:TimestampSchema,schemaVersion:z.literal(LOCAL_COACH_SCHEMA_VERSION)});
const OutboxRecordSchema=z.object({id:IdentifierSchema,workoutId:IdentifierSchema,clientWorkoutId:IdentifierSchema,ownerId:OwnerIdSchema,deviceId:DeviceIdSchema,type:z.literal('workout.completed'),state:z.enum(['pending','sent','rejected']),payload:JsonObjectSchema,createdAt:TimestampSchema,updatedAt:TimestampSchema,schemaVersion:z.literal(LOCAL_COACH_SCHEMA_VERSION)});
const LegacyPendingSetSchema=z.object({id:z.union([z.string(),z.number()]),value:z.number().finite().min(0).max(100000),active:z.number().finite().min(0).max(7200).optional()}).passthrough();
const LegacyMigrationSchema=z.object({sourceKey:z.string().min(1).max(512),intake:z.unknown().optional(),settings:SettingsSchema.optional(),pendingSets:z.array(LegacyPendingSetSchema).max(10000).optional()});

const parse=(schema,value,label)=>{
 const result=schema.safeParse(value);
 if(result.success)return result.data;
 throw new LocalCoachStorageError('invalid-record',`${label} failed validation.`,{cause:result.error,recoverable:true});
};

export class LocalCoachStorageError extends Error{
 constructor(code,message,{cause,recoverable=false}={}){super(message,{cause});this.name='LocalCoachStorageError';this.code=code;this.recoverable=recoverable;}
}

export function classifyLocalCoachError(error,operation='Local coach storage'){
 if(error instanceof LocalCoachStorageError)return error;
 const name=String(error?.name??'');
 if(name==='QuotaExceededError')return new LocalCoachStorageError('quota',`${operation} could not be saved because device storage is full.`,{cause:error,recoverable:true});
 if(name==='VersionError'||name==='UpgradeError')return new LocalCoachStorageError('migration',`${operation} could not open the local coach database.`,{cause:error,recoverable:true});
 if(name==='AbortError'||name==='TransactionInactiveError')return new LocalCoachStorageError('interrupted-write',`${operation} was interrupted and was not committed.`,{cause:error,recoverable:true});
 return new LocalCoachStorageError('storage',`${operation} failed.`,{cause:error,recoverable:true});
}

function createId(cryptoObject){
 if(typeof cryptoObject?.randomUUID==='function')return cryptoObject.randomUUID();
 throw new LocalCoachStorageError('missing-randomness','Secure local identifiers are unavailable.',{recoverable:false});
}

export async function openLocalCoach({
 name=DEFAULT_LOCAL_COACH_DB,
 openTimeoutMs=3000,
 indexedDB=globalThis.indexedDB,
 IDBKeyRange=globalThis.IDBKeyRange,
 cryptoObject=globalThis.crypto,
 now=()=>Date.now(),
 exerciseKeys=Object.keys(EXERCISES),
}={}){
 if(!Number.isSafeInteger(openTimeoutMs)||openTimeoutMs<1||openTimeoutMs>60000)throw new LocalCoachStorageError('invalid-record','Local storage open timeout must be between 1 and 60000 milliseconds.',{recoverable:true});
 if(!indexedDB||!IDBKeyRange)throw new LocalCoachStorageError('unavailable','Durable local storage is unavailable in this browser.',{recoverable:true});
 const modes=new Set(exerciseKeys);
 const db=new Dexie(name,{indexedDB,IDBKeyRange});
 db.version(1).stores({
  meta:'&key,ownerId,updatedAt',
  intake:'&ownerId,deviceId,updatedAt',
  settings:'&ownerId,deviceId,updatedAt',
  workouts:'&id,&clientWorkoutId,ownerId,[ownerId+status],[ownerId+startedAt],status,updatedAt',
  workoutEvents:'&id,workoutId,[ownerId+workoutId],[workoutId+sequence],ownerId,createdAt',
  outbox:'&id,&workoutId,ownerId,[ownerId+state],state,updatedAt',
 });
 db.version(LOCAL_COACH_LAYOUT_VERSION).stores(IMPORT_LEDGER_STORES);
 let openExpired=false,openTimer;
 const openDeadlineError=new LocalCoachStorageError('migration','Local storage is taking longer than expected. Retry; close other app tabs if upgrade is blocked.',{recoverable:true});
 try{
  await Promise.race([
   db.open().then(()=>{if(openExpired){db.close({disableAutoOpen:true});throw openDeadlineError;}}),
   new Promise((resolve,reject)=>{openTimer=setTimeout(()=>{openExpired=true;reject(openDeadlineError);db.close({disableAutoOpen:true});},openTimeoutMs);}),
  ]);
 }catch(error){db.close({disableAutoOpen:true});throw classifyLocalCoachError(error,'Local coach database');}
 finally{clearTimeout(openTimer);}

 const readMeta=async key=>{
  const row=await db.meta.get(key);
  return row?parse(MetaRecordSchema,row,'Local metadata'):null;
 };
 const ensureIdentity=async()=>{
  try{return await db.transaction('rw',db.meta,async()=>{
   const existingDevice=await readMeta('device-id');
   const existingGuest=await readMeta('guest-owner-id');
   const timestamp=now();
   const deviceId=existingDevice?.value??createId(cryptoObject);
   const guestOwnerId=existingGuest?.value??`guest:${createId(cryptoObject)}`;
   parse(DeviceIdSchema,deviceId,'Device identifier');parse(OwnerIdSchema,guestOwnerId,'Guest owner identifier');
   if(!existingDevice)await db.meta.add(parse(MetaRecordSchema,{key:'device-id',value:deviceId,updatedAt:timestamp,schemaVersion:LOCAL_COACH_SCHEMA_VERSION},'Device metadata'));
   if(!existingGuest)await db.meta.add(parse(MetaRecordSchema,{key:'guest-owner-id',ownerId:guestOwnerId,value:guestOwnerId,updatedAt:timestamp,schemaVersion:LOCAL_COACH_SCHEMA_VERSION},'Guest metadata'));
   return {deviceId,guestOwnerId};
  });}catch(error){throw classifyLocalCoachError(error,'Local coach identity');}
 };
 const identity=await ensureIdentity();

 const appendEvent=async(workout,type,payload={})=>{
  const sequence=await db.workoutEvents.where('workoutId').equals(workout.id).count()+1;
  const event=parse(EventRecordSchema,{id:createId(cryptoObject),workoutId:workout.id,ownerId:workout.ownerId,deviceId:workout.deviceId,sequence,type,payload,createdAt:now(),schemaVersion:LOCAL_COACH_SCHEMA_VERSION},'Workout event');
  await db.workoutEvents.add(event);return event;
 };

 const forOwner=ownerValue=>{
  const ownerId=parse(OwnerIdSchema,ownerValue,'Owner identifier');
  const leaseKey=`workout-lease:${JSON.stringify([ownerId,identity.deviceId])}`;
  const getWorkout=async id=>{
   const row=await db.workouts.get(parse(IdentifierSchema,id,'Workout identifier'));
   if(!row||row.ownerId!==ownerId)return null;
   return parse(WorkoutRecordSchema,row,'Workout');
  };
  const transact=async(operation,tables,fn)=>{
   try{return await db.transaction('rw',...tables,fn);}catch(error){throw classifyLocalCoachError(error,operation);}
  };
  const assertWorkoutLease=async token=>{if(token===undefined)return;const expected=parse(LeaseTokenSchema,token,'Workout lease token'),row=await db.meta.get(leaseKey),lease=row?parse(MetaRecordSchema,row,'Workout lease record').value:null;if(!lease||lease.token!==expected)throw new LocalCoachStorageError('lease','This workout is active in another tab.',{recoverable:true});};
  return Object.freeze({
   ...createImportLedger({db,ownerId,deviceId:identity.deviceId,getWorkout,transact,StorageError:LocalCoachStorageError,classifyError:classifyLocalCoachError}),
   ownerId,
   deviceId:identity.deviceId,
   async claimWorkoutLease(token){const value={token:parse(LeaseTokenSchema,token,'Workout lease token')};return transact('Workout lease claim',[db.meta],async()=>{const row=parse(MetaRecordSchema,{key:leaseKey,ownerId,value,updatedAt:now(),schemaVersion:LOCAL_COACH_SCHEMA_VERSION},'Workout lease record');await db.meta.put(row);return value;});},
   async saveIntake(value){
    const intake=parse(IntakeSchema,value,'Coach intake'),timestamp=now();
    const row=parse(IntakeRecordSchema,{ownerId,deviceId:identity.deviceId,value:intake,updatedAt:timestamp,schemaVersion:LOCAL_COACH_SCHEMA_VERSION},'Coach intake record');
    try{await db.intake.put(row);return row.value;}catch(error){throw classifyLocalCoachError(error,'Coach intake');}
   },
   async getIntake(){try{const row=await db.intake.get(ownerId);return row?parse(IntakeRecordSchema,row,'Coach intake record').value:null;}catch(error){throw classifyLocalCoachError(error,'Coach intake');}},
   async saveSettings(value){
    const settings=parse(SettingsSchema,value,'Coach settings'),timestamp=now();
    const row=parse(SettingsRecordSchema,{ownerId,deviceId:identity.deviceId,value:settings,updatedAt:timestamp,schemaVersion:LOCAL_COACH_SCHEMA_VERSION},'Coach settings record');
    try{await db.settings.put(row);return row.value;}catch(error){throw classifyLocalCoachError(error,'Coach settings');}
   },
    async getSettings(){try{const row=await db.settings.get(ownerId);return row?parse(SettingsRecordSchema,row,'Coach settings record').value:null;}catch(error){throw classifyLocalCoachError(error,'Coach settings');}},
    async saveSetup(value,{startDay}={}){
     const intake=parse(IntakeSchema,value,'Coach intake'),requestedDay=parse(StartDaySchema,startDay,'Coach start day');
     return transact('Coach setup',[db.intake,db.settings],async()=>{
      const timestamp=now(),existing=await db.settings.get(ownerId),prior=existing?parse(SettingsRecordSchema,existing,'Coach settings record').value:{};
      const settings=parse(SettingsSchema,{...prior,startDay:prior.startDay??requestedDay},'Coach settings');
      const intakeRow=parse(IntakeRecordSchema,{ownerId,deviceId:identity.deviceId,value:intake,updatedAt:timestamp,schemaVersion:LOCAL_COACH_SCHEMA_VERSION},'Coach intake record');
      const settingsRow=parse(SettingsRecordSchema,{ownerId,deviceId:identity.deviceId,value:settings,updatedAt:timestamp,schemaVersion:LOCAL_COACH_SCHEMA_VERSION},'Coach settings record');
      await db.intake.put(intakeRow);await db.settings.put(settingsRow);return {intake:intakeRow.value,settings:settingsRow.value};
     });
    },
   async startWorkout(input,{leaseToken}={}){
    const parsed=parse(WorkoutStartSchema,input,'Workout start');
    if(!modes.has(parsed.mode))throw new LocalCoachStorageError('invalid-record','Workout mode is not supported.',{recoverable:true});
    // The client identifier is the durable local primary key by design. The
    // server receives this same immutable value for idempotent reconciliation.
    const timestamp=now(),id=parsed.clientWorkoutId??createId(cryptoObject);
    const row=parse(WorkoutRecordSchema,{id,clientWorkoutId:id,ownerId,deviceId:identity.deviceId,mode:parsed.mode,goal:parsed.goal,restSeconds:parsed.restSeconds,status:'active',progress:parsed.progress,metadata:parsed.metadata,startedAt:timestamp,updatedAt:timestamp,schemaVersion:LOCAL_COACH_SCHEMA_VERSION},'Workout');
    return transact('Workout start',[db.meta,db.workouts,db.workoutEvents],async()=>{await assertWorkoutLease(leaseToken);await db.workouts.add(row);await appendEvent(row,'started',{mode:row.mode,goal:row.goal,restSeconds:row.restSeconds});return row;});
   },
   async updateWorkout(id,patch,{leaseToken}={}){
    const parsed=parse(WorkoutPatchSchema,patch,'Workout update');
    return transact('Workout update',[db.meta,db.workouts,db.workoutEvents],async()=>{
     await assertWorkoutLease(leaseToken);
     const current=await getWorkout(id);if(!current)throw new LocalCoachStorageError('not-found','Workout was not found for this owner.',{recoverable:true});
     if(current.status==='completed')throw new LocalCoachStorageError('already-completed','Completed workouts cannot be changed.',{recoverable:true});
     const updated=parse(WorkoutRecordSchema,{...current,...parsed,updatedAt:now()},'Workout');
     await db.workouts.put(updated);await appendEvent(updated,'updated',parsed);return updated;
    });
   },
   async pauseWorkout(id,{leaseToken}={}){return transact('Workout pause',[db.meta,db.workouts,db.workoutEvents],async()=>{await assertWorkoutLease(leaseToken);const current=await getWorkout(id);if(!current)throw new LocalCoachStorageError('not-found','Workout was not found for this owner.',{recoverable:true});if(current.status!=='active')return current;const updated=parse(WorkoutRecordSchema,{...current,status:'paused',updatedAt:now()},'Workout');await db.workouts.put(updated);await appendEvent(updated,'paused');return updated;});},
   async resumeWorkout(id,{leaseToken}={}){return transact('Workout resume',[db.meta,db.workouts,db.workoutEvents],async()=>{await assertWorkoutLease(leaseToken);const current=await getWorkout(id);if(!current)throw new LocalCoachStorageError('not-found','Workout was not found for this owner.',{recoverable:true});if(!['paused','interrupted'].includes(current.status))return current;const {interruptedAt:_interruptedAt,...resumable}=current;const updated=parse(WorkoutRecordSchema,{...resumable,status:'active',updatedAt:now()},'Workout');await db.workouts.put(updated);await appendEvent(updated,'resumed');return updated;});},
   async completeWorkout(id,completion,{queueForSync=true,leaseToken}={}){
    const parsed=parse(CompletionSchema,completion,'Workout completion');
    return transact('Workout completion',[db.meta,db.workouts,db.workoutEvents,db.outbox],async()=>{
     await assertWorkoutLease(leaseToken);
     const current=await getWorkout(id);if(!current)throw new LocalCoachStorageError('not-found','Workout was not found for this owner.',{recoverable:true});
     if(current.status==='completed'){const existing=await db.outbox.where('workoutId').equals(current.id).first();return {workout:current,outbox:existing?parse(OutboxRecordSchema,existing,'Sync outbox record'):null,duplicate:true};}
     const timestamp=now();
     const updated=parse(WorkoutRecordSchema,{...current,status:'completed',completion:parsed,progress:parsed.progress??current.progress,metadata:parsed.metadata??current.metadata,completedAt:timestamp,updatedAt:timestamp},'Workout');
     await db.workouts.put(updated);await appendEvent(updated,'completed',{value:parsed.value,activeSeconds:parsed.activeSeconds??null,elapsedSeconds:parsed.elapsedSeconds??null,earned:parsed.earned??null});
     let outbox=null;
     if(queueForSync){outbox=parse(OutboxRecordSchema,{id:createId(cryptoObject),workoutId:updated.id,clientWorkoutId:updated.clientWorkoutId,ownerId,deviceId:identity.deviceId,type:'workout.completed',state:'pending',payload:{workout:updated},createdAt:timestamp,updatedAt:timestamp,schemaVersion:LOCAL_COACH_SCHEMA_VERSION},'Sync outbox record');await db.outbox.add(outbox);}
     return {workout:updated,outbox,duplicate:false};
    });
   },
    async recoverInterruptedWorkouts({leaseToken}={}){return transact('Workout recovery',[db.meta,db.workouts,db.workoutEvents],async()=>{await assertWorkoutLease(leaseToken);const rows=await db.workouts.where('[ownerId+status]').anyOf([[ownerId,'active'],[ownerId,'paused']]).toArray();const recovered=[];for(const raw of rows){const current=parse(WorkoutRecordSchema,raw,'Workout'),timestamp=now(),updated=parse(WorkoutRecordSchema,{...current,status:'interrupted',interruptedAt:timestamp,updatedAt:timestamp},'Workout');await db.workouts.put(updated);await appendEvent(updated,'interrupted',{previousStatus:current.status});recovered.push(updated);}return recovered;});},
    async interruptActiveWorkouts({leaseToken}={}){return transact('Active workout recovery',[db.meta,db.workouts,db.workoutEvents],async()=>{await assertWorkoutLease(leaseToken);const rows=await db.workouts.where('[ownerId+status]').equals([ownerId,'active']).toArray(),recovered=[];for(const raw of rows){const current=parse(WorkoutRecordSchema,raw,'Workout'),timestamp=now(),updated=parse(WorkoutRecordSchema,{...current,status:'interrupted',interruptedAt:timestamp,updatedAt:timestamp},'Workout');await db.workouts.put(updated);await appendEvent(updated,'interrupted',{previousStatus:current.status});recovered.push(updated);}return recovered;});},
    async interruptWorkout(id,{leaseToken}={}){return transact('Workout interruption',[db.meta,db.workouts,db.workoutEvents],async()=>{await assertWorkoutLease(leaseToken);const current=await getWorkout(id);if(!current)throw new LocalCoachStorageError('not-found','Workout was not found for this owner.',{recoverable:true});if(current.status!=='active')return current;const timestamp=now(),updated=parse(WorkoutRecordSchema,{...current,status:'interrupted',interruptedAt:timestamp,updatedAt:timestamp},'Workout');await db.workouts.put(updated);await appendEvent(updated,'interrupted',{previousStatus:current.status});return updated;});},
   async getWorkout(id){try{return await getWorkout(id);}catch(error){throw classifyLocalCoachError(error,'Workout read');}},
   async listWorkouts(){try{return (await db.workouts.where('ownerId').equals(ownerId).sortBy('startedAt')).map(row=>parse(WorkoutRecordSchema,row,'Workout'));}catch(error){throw classifyLocalCoachError(error,'Workout history');}},
   async listEvents(workoutId){try{return (await db.workoutEvents.where('[ownerId+workoutId]').equals([ownerId,workoutId]).sortBy('sequence')).map(row=>parse(EventRecordSchema,row,'Workout event'));}catch(error){throw classifyLocalCoachError(error,'Workout events');}},
   async listOutbox({state}={}){try{const rows=state?await db.outbox.where('[ownerId+state]').equals([ownerId,state]).toArray():await db.outbox.where('ownerId').equals(ownerId).toArray();return rows.map(row=>parse(OutboxRecordSchema,row,'Sync outbox record')).sort((a,b)=>a.createdAt-b.createdAt||a.id.localeCompare(b.id));}catch(error){throw classifyLocalCoachError(error,'Sync outbox');}},
   async markOutbox(id,state){
    const next=parse(z.enum(['sent','rejected']),state,'Outbox state');
    return transact('Sync outbox update',[db.outbox],async()=>{const row=await db.outbox.get(id);if(!row||row.ownerId!==ownerId)throw new LocalCoachStorageError('not-found','Sync record was not found for this owner.',{recoverable:true});const updated=parse(OutboxRecordSchema,{...row,state:next,updatedAt:now()},'Sync outbox record');await db.outbox.put(updated);return updated;});
   },
   async exportLocalData(){
    try{return await db.transaction('r',db.intake,db.settings,db.workouts,db.workoutEvents,db.outbox,...importLedgerTables(db),async()=>{
     const intake=await db.intake.get(ownerId),settings=await db.settings.get(ownerId),workouts=await db.workouts.where('ownerId').equals(ownerId).toArray(),events=await db.workoutEvents.where('ownerId').equals(ownerId).toArray(),outbox=await db.outbox.where('ownerId').equals(ownerId).toArray();
     return {importAssignments:await readImportLedger(db,ownerId,LocalCoachStorageError),exportVersion:LOCAL_COACH_EXPORT_VERSION,schemaVersion:LOCAL_COACH_SCHEMA_VERSION,ownerId,deviceId:identity.deviceId,exportedAt:now(),intake:intake?parse(IntakeRecordSchema,intake,'Coach intake record'):null,settings:settings?parse(SettingsRecordSchema,settings,'Coach settings record'):null,workouts:workouts.map(row=>parse(WorkoutRecordSchema,row,'Workout')).sort((a,b)=>a.startedAt-b.startedAt||a.id.localeCompare(b.id)),events:events.map(row=>parse(EventRecordSchema,row,'Workout event')).sort((a,b)=>a.createdAt-b.createdAt||a.id.localeCompare(b.id)),outbox:outbox.map(row=>parse(OutboxRecordSchema,row,'Sync outbox record')).sort((a,b)=>a.createdAt-b.createdAt||a.id.localeCompare(b.id))};
    });}catch(error){throw classifyLocalCoachError(error,'Local coach export');}
   },
   async deleteLocalData(){return transact('Local coach deletion',[db.meta,db.intake,db.settings,db.workouts,db.workoutEvents,db.outbox,...importLedgerTables(db)],async()=>{const metadataKeys=(await db.meta.where('ownerId').equals(ownerId).primaryKeys()).filter(key=>key!=='guest-owner-id');const counts={importAssignments:await deleteImportLedger(db,ownerId),intake:await db.intake.where('ownerId').equals(ownerId).delete(),settings:await db.settings.where('ownerId').equals(ownerId).delete(),workouts:await db.workouts.where('ownerId').equals(ownerId).delete(),events:await db.workoutEvents.where('ownerId').equals(ownerId).delete(),outbox:await db.outbox.where('ownerId').equals(ownerId).delete(),metadata:metadataKeys.length};if(metadataKeys.length)await db.meta.bulkDelete(metadataKeys);return counts;});},
   async importLegacyLocalState(input){
    const legacy=parse(LegacyMigrationSchema,input,'Legacy local state'),markerKey=`legacy:${JSON.stringify([ownerId,legacy.sourceKey])}`;
    return transact('Legacy local migration',[db.meta,db.intake,db.settings,db.outbox],async()=>{
     if(await db.meta.get(markerKey))return {imported:false,reason:'already-imported'};
     const timestamp=now();
     if(legacy.intake!==undefined){const value=parse(IntakeSchema,legacy.intake,'Legacy coach intake');await db.intake.put(parse(IntakeRecordSchema,{ownerId,deviceId:identity.deviceId,value,updatedAt:timestamp,schemaVersion:LOCAL_COACH_SCHEMA_VERSION},'Coach intake record'));}
     if(legacy.settings!==undefined)await db.settings.put(parse(SettingsRecordSchema,{ownerId,deviceId:identity.deviceId,value:legacy.settings,updatedAt:timestamp,schemaVersion:LOCAL_COACH_SCHEMA_VERSION},'Coach settings record'));
     let pending=0;
     for(const item of legacy.pendingSets??[]){const workoutId=createId(cryptoObject),id=createId(cryptoObject);const row=parse(OutboxRecordSchema,{id,workoutId,clientWorkoutId:workoutId,ownerId,deviceId:identity.deviceId,type:'workout.completed',state:'pending',payload:{legacy:true,legacyId:String(item.id),value:item.value,activeSeconds:item.active??null},createdAt:timestamp,updatedAt:timestamp,schemaVersion:LOCAL_COACH_SCHEMA_VERSION},'Legacy sync outbox record');await db.outbox.put(row);pending++;}
     await db.meta.put(parse(MetaRecordSchema,{key:markerKey,ownerId,value:{sourceKey:legacy.sourceKey,importedAt:timestamp,pending},updatedAt:timestamp,schemaVersion:LOCAL_COACH_SCHEMA_VERSION},'Migration metadata'));
     return {imported:true,pending};
    });
   },
  });
 };

 return Object.freeze({
  schemaVersion:LOCAL_COACH_SCHEMA_VERSION,
  layoutVersion:LOCAL_COACH_LAYOUT_VERSION,
  deviceId:identity.deviceId,
  guestOwnerId:identity.guestOwnerId,
  forOwner,
  close(){db.close({disableAutoOpen:true});},
 });
}
