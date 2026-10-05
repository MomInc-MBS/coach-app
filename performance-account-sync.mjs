import {snapshotFromCompletedWorkout,prepareWorkoutImport} from './workout-import-codec.mjs';
import {performanceOwner} from './performance-progress.mjs';
const CACHE='myr5-performance-account-receipts-v2';
const identity=a=>typeof a?.user?.id==='string'&&a.user.id&&Number.isSafeInteger(a.dataEpoch)&&a.dataEpoch>0&&!a.stale?{id:a.user.id,epoch:a.dataEpoch}:null;
const same=(a,b)=>a&&b&&a.id===b.id&&a.epoch===b.epoch;

/** Automatic upload applies only to workouts started for a captured account.
 * Guest history keeps its separate explicit import/keep-local consent flow. */
export function createPerformanceAccountSync({getAccount,getRows,api,transitions,onAccount,storage=globalThis.localStorage,maxUploads=20}={}){
 if(typeof getAccount!=='function'||typeof getRows!=='function'||typeof api!=='function'||!Number.isSafeInteger(maxUploads)||maxUploads<1||maxUploads>500)throw TypeError('Account workout sync requires scoped readers and API access.');
 let running=null,rerun=false;const memoryReceipts=new Map(),needsRefresh=new Set();
 async function once(attempted){
  const account=getAccount(),actor=identity(account),result={synced:0,skipped:0,failed:[],aborted:false};if(!actor)return result;
  const owner=performanceOwner(null,account),cacheKey=`${CACHE}/${owner}`;let receipts={};try{const value=JSON.parse(storage?.getItem(cacheKey)||'{}');if(value&&typeof value==='object'&&!Array.isArray(value))receipts=value;}catch{}receipts={...receipts,...(memoryReceipts.get(owner)??{})};memoryReceipts.set(owner,receipts);
  const ticket=transitions?.capture?.(),current=()=>{if(!same(actor,identity(getAccount())))throw Object.assign(Error('Account changed during workout sync.'),{code:'account_scope_changed'});transitions?.assertCurrent?.(ticket);};
  let rows;try{current();rows=await getRows();current();}catch(error){result.aborted=true;result.failed.push({id:null,error:error.message});return result;}
  const eligible=(rows??[]).filter(row=>row?.status==='completed'&&row.progress?.performance?.performanceOwner===owner&&!row.progress.performance.preparation&&row.progress.performance.earned!==false&&!attempted.has(JSON.stringify([owner,row.id]))).sort((a,b)=>(a.completedAt??0)-(b.completedAt??0)||String(a.id).localeCompare(String(b.id)));
  let uploads=0;
  for(const row of eligible){
   if(uploads>=maxUploads){rerun=true;break;}
   attempted.add(JSON.stringify([owner,row.id]));
   try{
    current();const snapshot=snapshotFromCompletedWorkout(row);if(!snapshot.performance)throw Error('This workout lacks the performance evidence needed for account rewards.');
    const prepared=await prepareWorkoutImport(snapshot,{targetAccountId:actor.id,targetDataEpoch:actor.epoch});current();
    if(receipts[snapshot.clientWorkoutId]===prepared.fingerprint){result.skipped++;continue;}
    uploads++;
    const value=await api('/api/workouts/import','POST',{digestVersion:prepared.digestVersion,targetDataEpoch:actor.epoch,snapshot:prepared.snapshot,fingerprint:prepared.fingerprint},{'X-Target-Account':actor.id,'X-Expected-Data-Epoch':String(actor.epoch),'Idempotency-Key':prepared.idempotencyKey});current();
    const receipt=value?.receipt,w=value?.workout;
    if(receipt?.targetAccountId!==actor.id||receipt.targetDataEpoch!==actor.epoch||receipt.digestVersion!==prepared.digestVersion||receipt.fingerprint!==prepared.fingerprint||receipt.idempotencyKey!==prepared.idempotencyKey||w?.user_id!==actor.id||w.client_workout_id!==snapshot.clientWorkoutId||w.source!=='guest_import'||w.competitive_status!=='not_eligible')throw Error('Workout sync returned an unmatched receipt.');
    receipts[snapshot.clientWorkoutId]=prepared.fingerprint;needsRefresh.add(owner);try{storage?.setItem(cacheKey,JSON.stringify(receipts));}catch{/* In-memory receipts and server idempotence keep retry behavior bounded. */}result.synced++;
   }catch(error){if(!same(actor,identity(getAccount()))||['auth_transition','account_scope_changed'].includes(error.code)){result.aborted=true;break;}result.failed.push({id:row.id,error:error.message});}
  }
  if(needsRefresh.has(owner)){try{current();const value=await api('/api/account?core=1');current();if(!same(actor,identity(value)))throw Error('Account progress returned an unmatched identity.');await onAccount?.(value);current();needsRefresh.delete(owner);}catch(error){result.failed.push({id:null,error:error.message});if(!same(actor,identity(getAccount())))result.aborted=true;}}
  return result;
 }
 async function drain(){const total={synced:0,skipped:0,failed:[],aborted:false},attempted=new Set();do{rerun=false;const result=await once(attempted);total.synced+=result.synced;total.skipped+=result.skipped;total.failed.push(...result.failed);total.aborted||=result.aborted;}while(rerun&&identity(getAccount()));return total;}
 return {flush(){if(running){rerun=true;return running;}running=drain().finally(()=>{running=null;});return running;},get running(){return !!running;}};
}
