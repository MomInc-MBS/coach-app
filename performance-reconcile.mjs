import {localDay,recordPerformanceSession,readPerformanceProgress} from './performance-progress.mjs';

/** Only replay durable new-format completions for the requested progression owner.
 * The repository guest owner and account progression owner are separate: the
 * completion's captured performanceOwner is required and is never inferred. */
export function savedPerformanceRecords(rows,{owner}={}){
 if(typeof owner!=='string'||!owner)throw RangeError('A captured progression owner is required.');
 const seen=new Set(),records=[];
 for(const row of [...(rows??[])].sort((a,b)=>(a?.completedAt??0)-(b?.completedAt??0)||String(a?.id).localeCompare(String(b?.id)))){
  const p=row?.progress?.performance;
  if(row?.status!=='completed'||!Number.isSafeInteger(row.completedAt)||row.completedAt<0||typeof row.id!=='string'||!row.id||seen.has(row.id)||!p||typeof p!=='object'||Array.isArray(p))continue;
  if(p.performanceOwner!==owner||row.progress.performanceOwner!=null&&row.progress.performanceOwner!==owner||p.id!=null&&p.id!==row.id||p.mode!==row.mode||p.preparation||p.earned===false||row.completion?.earned===false)continue;
  if(!['hold','reps','sprint','gentle','pace'].includes(p.kind)||!Number.isFinite(p.xpBase)||p.xpBase<0)continue;
  seen.add(row.id);records.push({...p,id:row.id,completedAt:row.completedAt,day:p.day??localDay(row.completedAt)});
 }
 return records;
}

/** Retry-safe local repair after IndexedDB committed but the reward cache failed.
 * Call again on startup/history refresh. Failed writes remain retryable because
 * the durable completion is retained and only the reward ledger stores credit. */
export function reconcilePerformanceWorkouts(rows,options={}){
 const records=savedPerformanceRecords(rows,options),failed=[];let replayed=0,progress=readPerformanceProgress(options);
 for(const record of records){
  if(Object.hasOwn(progress.sessions,record.id))continue;
  try{progress=recordPerformanceSession(record,options);if(Object.hasOwn(progress.sessions,record.id))replayed++;}
  catch(error){failed.push({id:record.id,error:error instanceof Error?error.message:String(error)});}
 }
 return {progress,replayed,failed};
}
