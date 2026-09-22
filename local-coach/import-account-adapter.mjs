import {createImportDrain} from './import-sync.mjs';
import {assignmentStatus} from './import-assignment.mjs';
import {IMPORT_UPLOAD_MANIFEST} from './import-upload-manifest.mjs';

const fail=code=>{throw Object.assign(Error('Refresh the selected account before continuing.'),{code});};
const target=account=>{
 if(typeof account?.user?.id!=='string'||!account.user.id||!Number.isSafeInteger(account.dataEpoch)||account.dataEpoch<1)fail('account_scope_unavailable');
 return {owner:account.user.id,epoch:account.dataEpoch};
};
// This is the sole browser adapter that turns an authenticated core response
// into local deletion evidence. It accepts no caller-supplied deletion proof.
export function createImportAccountAdapter({repository,request,transitions,getAccount,manifest=IMPORT_UPLOAD_MANIFEST,now=()=>Date.now(),randomUUID=()=>crypto.randomUUID()}){
 async function loadAccount({signal}={}){
  const response=await request('/api/account?core=1',{method:'GET',signal,cache:'no-store',credentials:'same-origin'});
  if(response.redirected||!response.headers.get('content-type')?.includes('application/json'))fail('invalid_account_response');
  const value=await response.json();
  if(!response.ok)throw Object.assign(Error('Account could not be checked.'),{status:response.status});
  target(value);return value;
 }
 const current=(ticket,expected)=>{
  transitions.assertCurrent(ticket);const selected=target(getAccount());
  if(selected.owner!==expected.owner||selected.epoch!==expected.epoch)fail('account_scope_changed');
 };
 async function fresh(ticket,expected){
  current(ticket,expected);const value=await loadAccount({signal:ticket.signal});current(ticket,expected);
  const live=target(value);if(live.owner!==expected.owner||live.epoch!==expected.epoch)fail('account_scope_changed');return value;
 }
 const drain=createImportDrain({repository,transition:transitions,manifest,now,loadAccount,postImport:async input=>{
  const response=await request(input.path,{method:'POST',headers:input.headers,body:input.body,signal:input.signal,cache:'no-store',credentials:'same-origin'});
  let body=null;if(!response.redirected&&response.headers.get('content-type')?.includes('application/json'))try{body=await response.json();}catch{}
  return {status:response.status,body,retryAfter:response.headers.get('Retry-After')};
 }});
 return Object.freeze({
  stop:()=>drain.stop(),
  async history(){
   const [workouts,state]=await Promise.all([repository.listWorkouts(),repository.listImportAssignments()]);
   const observedAt=now();
   return workouts.filter(row=>row.status==='completed').map(workout=>{
    const head=state.heads.find(row=>row.clientWorkoutId===workout.clientWorkoutId),item=head&&state.items.find(row=>row.claimId===head.claimId);
    return {workout,selectable:!head||head.status==='released',item,status:item?assignmentStatus(state,item.claimId,observedAt):'unassigned'};
   });
  },
  async choose(kind,clientWorkoutIds,displayedAccount){
   if(!['import','keep_local'].includes(kind)||!Array.isArray(clientWorkoutIds)||clientWorkoutIds.length<1||clientWorkoutIds.length>100||new Set(clientWorkoutIds).size!==clientWorkoutIds.length)fail('invalid_choice');
   const selectedIds=[...clientWorkoutIds],expected=kind==='import'?target(displayedAccount):null,ticket=expected?transitions.capture():null;
   if(expected)await fresh(ticket,expected);
   const input={decisionId:randomUUID(),kind,selections:selectedIds.map(clientWorkoutId=>({clientWorkoutId,claimId:randomUUID(),itemId:randomUUID()})),...(expected?{targetAccountId:expected.owner,targetDataEpoch:expected.epoch}:{})};
   const prepared=await repository.prepareImportDecision(input);if(expected)current(ticket,expected);
   const result=await repository.commitImportDecision(prepared);if(expected)current(ticket,expected);
   return result;
  },
  async reconcileDeletedTarget(displayedAccount){
   const expected=target(displayedAccount),ticket=transitions.capture(),account=await fresh(ticket,expected),proof=account.deletionEvidence;
   if(!proof||proof.ownerId!==expected.owner||proof.currentDataEpoch!==expected.epoch||!Number.isSafeInteger(proof.deletedThroughEpoch)||proof.deletedThroughEpoch!==expected.epoch-1)fail('invalid_deletion_evidence');
   if(proof.deletedThroughEpoch===0)return 0;
   const state=await repository.listImportAssignments();current(ticket,expected);let count=0;
   for(const item of state.items){
    if(item.kind!=='import'||item.targetAccountId!==expected.owner||item.targetDataEpoch>proof.deletedThroughEpoch)continue;
    current(ticket,expected);
    const result=await repository.releaseImportAssignment({claimId:item.claimId,generation:item.generation,ownerId:proof.ownerId,currentDataEpoch:proof.currentDataEpoch,deletedThroughEpoch:proof.deletedThroughEpoch});
    if(!result.duplicate)count++;
   }
   current(ticket,expected);return count;
  },
  async upload(displayedAccount,{resumeParkedClaimIds=[]}={}){
   // Fail closed before auth, IndexedDB or transport when the build is disabled.
   if(manifest.uploadsEnabled!==true)return {stopped:'disabled',posted:0,imported:0};
   const expected=target(displayedAccount),ticket=transitions.capture();await fresh(ticket,expected);
   const result=await drain.run({targetAccountId:expected.owner,resumeParkedClaimIds});current(ticket,expected);return result;
  },
 });
}
