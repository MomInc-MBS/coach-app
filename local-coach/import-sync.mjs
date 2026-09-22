import {IMPORT_UPLOAD_MANIFEST} from './import-upload-manifest.mjs';
const terminal=new Set(['imported','target_deleted','conflict','rejected','keep_local']);
const own=(v,k)=>Object.prototype.hasOwnProperty.call(v,k);
const safeRecord=value=>{
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid response');
 const descriptors=Object.getOwnPropertyDescriptors(value),out={};
 for(const key of Reflect.ownKeys(descriptors)){const d=descriptors[key];if(typeof key!=='string'||!own(d,'value')||!d.enumerable)throw Error('Invalid response');Object.defineProperty(out,key,{value:d.value,enumerable:true});}
 return out;
};
function success(reply,item){
 try{
  if(![200,201].includes(reply.status))return false;
  const body=safeRecord(reply.body),receipt=safeRecord(body.receipt),workout=safeRecord(body.workout);
  const keys=['targetAccountId','targetDataEpoch','digestVersion','fingerprint','idempotencyKey'];
  if(Object.keys(receipt).length!==keys.length||keys.some(key=>receipt[key]!==item[key]))return false;
  if(typeof workout.id!=='string'||!workout.id||workout.id.length>512||workout.user_id!==item.targetAccountId||workout.client_workout_id!==item.clientWorkoutId||workout.source!=='guest_import'||workout.competitive_status!=='not_eligible')return false;
  const fields={mode:'mode',goal:'goal',started_at:'startedAt',completed_at:'completedAt',value:'value',active:'activeSeconds'};
  return Object.entries(fields).every(([key,source])=>workout[key]===item.snapshot[source])?workout.id:null;
 }catch{return false;}
}
const abortError=()=>Object.assign(Error('Import run interrupted.'),{code:'interrupted'});
const sleep=(ms,signal)=>new Promise((resolve,reject)=>{
 if(signal.aborted){reject(abortError());return;}
 const end=()=>{clearTimeout(timer);signal.removeEventListener('abort',abort);resolve();};
 const abort=()=>{clearTimeout(timer);signal.removeEventListener('abort',abort);reject(abortError());};
 const timer=setTimeout(end,ms);signal.addEventListener('abort',abort,{once:true});
});
// loadAccount must authenticate and bypass caches; postImport is an injected
// transport, not global fetch. Both must honor signal, but a deadline also races
// their full promise so hung auth acquisition cannot hold this run indefinitely.
export function createImportDrain({repository,loadAccount,postImport,transition,
 manifest=IMPORT_UPLOAD_MANIFEST,now=()=>Date.now(),randomUUID=()=>crypto.randomUUID(),
 wait=sleep,random=Math.random,requestTimeoutMs=8000,maxAttemptsPerItem=3,maxItems=100,maxInlineDelayMs=1000}={}){
 if(!Number.isSafeInteger(requestTimeoutMs)||requestTimeoutMs<1||requestTimeoutMs>10000||!Number.isSafeInteger(maxAttemptsPerItem)||maxAttemptsPerItem<1||maxAttemptsPerItem>5||!Number.isSafeInteger(maxItems)||maxItems<1||maxItems>100||!Number.isSafeInteger(maxInlineDelayMs)||maxInlineDelayMs<0||maxInlineDelayMs>5000)throw Error('Invalid import run limits.');
 let running=false,active=null;
 const enabled=()=>manifest?.version===1&&manifest?.uploadsEnabled===true;
 async function bounded(fn,signal){
  const controller=new AbortController();let timer,onAbort;
  const stopped=new Promise((_,reject)=>{
   onAbort=()=>{controller.abort();reject(abortError());};
   if(signal.aborted){onAbort();return;}
   signal.addEventListener('abort',onAbort,{once:true});
   timer=setTimeout(()=>{controller.abort();reject(Object.assign(Error('Import request timed out.'),{code:'timeout'}));},requestTimeoutMs);
  });
  try{return await Promise.race([Promise.resolve().then(()=>{if(signal.aborted)throw abortError();return fn(controller.signal);}),stopped]);}
  finally{clearTimeout(timer);signal.removeEventListener('abort',onAbort);}
 }
 const retryDelay=(reply,attempt)=>{
  let seconds;try{const raw=reply?.retryAfter;if(typeof raw==='string'){if(/^\d+(?:\.\d+)?$/.test(raw))seconds=Number(raw);else{const deadline=Date.parse(raw);if(Number.isFinite(deadline))seconds=Math.max(0,(deadline-now())/1000);}}}catch{}
  if(Number.isFinite(seconds))return Math.min(86400000,Math.max(0,Math.ceil(seconds*1000)));
  return Math.min(30000,Math.ceil(250*2**attempt*(1+Math.min(1,Math.max(0,random())))));
 };
 return Object.freeze({
  stop(){active?.abort();},
  async run({targetAccountId,resumeParkedClaimIds=[]}={}){
   if(!enabled())return {stopped:'disabled',posted:0,imported:0};
   if(running)return {stopped:'busy',posted:0,imported:0};
   if(typeof targetAccountId!=='string'||!targetAccountId||!Array.isArray(resumeParkedClaimIds)||resumeParkedClaimIds.some(id=>typeof id!=='string'))throw Error('Choose an immutable target and explicit resume claims.');
   running=true;const controller=new AbortController();active=controller;
   const summary={posted:0,imported:0,parked:0,retryAt:null,stopped:'complete'};
   let unsubscribe=()=>{},runTicket;
   const current=ticket=>!controller.signal.aborted&&enabled()&&transition.isCurrent(runTicket)&&transition.isCurrent(ticket);
   try{
    try{runTicket=transition.capture();unsubscribe=transition.subscribe(()=>controller.abort());if(!transition.isCurrent(runTicket))throw abortError();}catch{summary.stopped='identity_unavailable';return summary;}
    const ledger=await repository.listImportAssignments();
    const candidates=ledger.items.filter(item=>item.kind==='import'&&item.targetAccountId===targetAccountId&&item.digestVersion===1&&typeof item.idempotencyKey==='string');
    const resume=new Set(resumeParkedClaimIds);let processedItems=0;
    for(const selected of candidates){
     if(!current(runTicket)){summary.stopped='identity_changed';break;}
     let projection=await repository.importAttemptState(selected.claimId,now());
     if(terminal.has(projection.status)||projection.status==='in_flight'||projection.retryAt>now()||projection.status==='parked'&&!resume.has(selected.claimId))continue;
     if(processedItems++>=maxItems)break;
     for(let count=0;count<maxAttemptsPerItem;count++){
      if(!current(runTicket)){summary.stopped='identity_changed';return summary;}
      projection=await repository.importAttemptState(selected.claimId,now());
      if(terminal.has(projection.status)||projection.status==='in_flight'||projection.retryAt>now()||projection.status==='parked'&&(count>0||!resume.has(selected.claimId)))break;
      let ticket;try{ticket=transition.capture();}catch{summary.stopped='identity_unavailable';return summary;}
      let account,preflightCategory,preflightFailure;
      try{account=await bounded(signal=>loadAccount({signal,cache:'no-store'}),controller.signal);}
      catch(error){if(!current(ticket)){summary.stopped='identity_changed';return summary;}if(error?.status===401)preflightCategory='signed_out';else preflightFailure=error?.code==='timeout'?'timeout':'offline';}
      if(!current(ticket)){summary.stopped='identity_changed';return summary;}
      if(!preflightCategory&&!preflightFailure){
       try{const value=safeRecord(account),user=safeRecord(value.user);if(user.id!==selected.targetAccountId)preflightCategory='target_mismatch';else if(!Number.isSafeInteger(value.dataEpoch)||value.dataEpoch<1)preflightFailure='unknown_response';else if(value.dataEpoch!==selected.targetDataEpoch)preflightCategory='epoch_mismatch';}
       catch{preflightFailure='unknown_response';}
      }
      const startedAt=now(),attemptId=randomUUID();let attempt;
      try{attempt=await repository.beginImportAttempt({claimId:selected.claimId,generation:selected.generation,attemptId,startedAt},{resumeParked:count===0&&resume.has(selected.claimId),attemptLimit:maxAttemptsPerItem});}
      catch{summary.stopped='storage_or_contention';return summary;}
      if(attempt.duplicate||attempt.status!=='in_flight')break;
      const item=attempt.item;
      const observe=details=>repository.recordImportAttemptResult({claimId:item.claimId,generation:item.generation,attemptId,at:Math.max(startedAt,now()),...details});
      if(!current(ticket)){await observe({type:'parked',category:'target_mismatch'});summary.parked++;summary.stopped='identity_changed';return summary;}
      if(preflightCategory){await observe({type:'parked',category:preflightCategory});summary.parked++;summary.stopped=preflightCategory;return summary;}
      let reply,errorCategory=preflightFailure;
      if(!preflightFailure){
       // Nothing after this equality check can choose a different target/body.
       const request=Object.freeze({path:'/api/workouts/import',method:'POST',cache:'no-store',headers:Object.freeze({'Content-Type':'application/json','X-Target-Account':item.targetAccountId,'Idempotency-Key':item.idempotencyKey}),body:JSON.stringify({digestVersion:item.digestVersion,targetDataEpoch:item.targetDataEpoch,snapshot:item.snapshot,fingerprint:item.fingerprint})});
       try{summary.posted++;reply=safeRecord(await bounded(signal=>postImport({...request,signal}),controller.signal));}
       catch(error){errorCategory=error?.code==='timeout'?'timeout':'offline';}
      }
      if(!current(ticket)){await observe({type:'parked',category:'target_mismatch'});summary.parked++;summary.stopped='identity_changed';return summary;}
      const serverWorkoutId=success(reply??{},item);
      if(serverWorkoutId){await observe({type:'imported',httpStatus:reply.status,serverWorkoutId});summary.imported++;break;}
      let status=reply?.status,code;try{code=safeRecord(reply.body).code;}catch{}
      if(!Number.isInteger(status)||status<100||status>599)status=undefined;
      const withStatus=status===undefined?{}:{httpStatus:status};
      const park=status===401?'signed_out':status===404?'feature_disabled':status===409&&['target_mismatch','target_account_mismatch'].includes(code)?'target_mismatch':status===409&&code==='target_epoch_mismatch'?'epoch_mismatch':null;
      if(park){await observe({type:'parked',category:park,...withStatus});summary.parked++;summary.stopped=park;return summary;}
      if(status===409&&code==='fingerprint_conflict'){await observe({type:'conflict',category:'fingerprint_conflict',...withStatus});break;}
      const rejectionCodes=['invalid_workout_import','invalid_snapshot','invalid_key_input','invalid_idempotency_key','invalid_fingerprint','unsupported_digest_version'];
      if([403,422].includes(status)&&code==='policy_rejected'){await observe({type:'rejected',category:'policy_rejected',...withStatus});break;}
      if([400,422].includes(status)&&rejectionCodes.includes(code)){await observe({type:'rejected',category:'invalid_payload',...withStatus});break;}
      if(attempt.attemptNumber>=attempt.attemptLimit){await observe({type:'parked',category:'retry_exhausted',...withStatus});summary.parked++;break;}
      const delay=retryDelay(reply,attempt.attemptNumber-1),retryAt=Math.max(startedAt,now())+delay;
      await observe({type:'retryable_failure',category:errorCategory??(status===429?'rate_limited':status>=500?'server_unavailable':'unknown_response'),retryAt,...withStatus});
      summary.retryAt=summary.retryAt===null?retryAt:Math.min(summary.retryAt,retryAt);
      if(delay>maxInlineDelayMs)break;
      try{await wait(delay,controller.signal);}catch{summary.stopped='identity_changed';return summary;}
     }
    }
    return summary;
   }finally{unsubscribe();if(active===controller)active=null;running=false;}
  },
 });
}
