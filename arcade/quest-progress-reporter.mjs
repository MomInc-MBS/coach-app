// Small owner-scoped retry queue for optional, online-only Vault quest writes.
// Game pages remain loadable offline; bounded maxima survive until Vault can drain them.
import { performanceOwner } from '../performance-progress.mjs';
import { EXERCISES } from '../exercise-library.mjs';
import { HOLD_CAP_SECONDS, REP_CAP } from '../progression-rules.mjs';
import { powerProgress, retainedPowerStyle } from './power/power.mjs';
import { holdStyleForExercise } from './workout-effects-state.mjs';

const RULES = Object.freeze({
 'pyramid-level':[1,20,true], 'pyramid-complete':[1,1,true], 'fruit-streak':[3,64,true],
 'aura-tier':[1,6,true], 'blizzard-tier':[1,6,true], 'fire-tier':[1,6,true],
 'lightning-tier':[1,6,true], 'yoga-hold-seconds':[1,60,false],
});
const valid=(counter,value)=>{const r=RULES[counter];return !!r&&Number.isFinite(value)&&value>=r[0]&&value<=r[1]&&(!r[2]||Number.isSafeInteger(value));};
const key=owner=>`myr5-quest-pending-v1/${encodeURIComponent(owner)}`;
const IMPORT_NONCE_KEY=Symbol.for('myr5.quest-progress-import-nonce');
function nextImportNonce(){
 try{const n=(Number(globalThis[IMPORT_NONCE_KEY])||0)+1;globalThis[IMPORT_NONCE_KEY]=n;return n;}
 catch{return `${Date.now()}-${Math.random().toString(36).slice(2)}`;}
}

export function createQuestProgressReporter(ownerId,{storage=globalThis.localStorage,currentOwner=performanceOwner,load=null,importer=url=>import(url),now=()=>Date.now(),baseDelay=1000,maxDelay=30000}={}){
 const memoryValues={};
 const confirmed={};
 let drainPromise=null,retryAt=0,retryDelay=baseDelay,loadedModule=null,loadPromise=null,importFailures=0;
 const loadVault=()=>{
  if(loadedModule)return Promise.resolve(loadedModule);
  if(loadPromise)return loadPromise;
  const url=importFailures===0?'/modules/vault/quest-progress.mjs':`/modules/vault/quest-progress.mjs?quest-retry=${nextImportNonce()}`;
  const pending=Promise.resolve().then(()=>load?load():importer(url)).then(module=>{loadedModule=module;return module;}).catch(error=>{importFailures++;throw error;}).finally(()=>{loadPromise=null;});
  loadPromise=pending;return pending;
 };
 const pendingNow=()=>{
  let values={...memoryValues};
  if(storage)try{const row=JSON.parse(storage.getItem(key(ownerId))||'{}');if(row?.ownerId===ownerId&&row.values&&typeof row.values==='object')for(const [counter,value] of Object.entries(row.values).slice(0,8))if(valid(counter,value))values[counter]=Math.max(values[counter]||0,value);}catch{}
  return {ownerId,values};
 };
 const persist=values=>{
  for(const k of Object.keys(memoryValues))delete memoryValues[k];
  for(const [counter,value] of Object.entries(values).slice(0,8))if(valid(counter,value))memoryValues[counter]=value;
  if(storage)try{if(Object.keys(memoryValues).length)storage.setItem(key(ownerId),JSON.stringify({ownerId,values:{...memoryValues}}));else storage.removeItem(key(ownerId));}catch{}
 };
 const doDrain=async()=>{
  if(typeof ownerId!=='string'||!ownerId||currentOwner()!==ownerId)return false;
  try{
   const module=await loadVault();if(currentOwner()!==ownerId)return false;
   const pending=pendingNow();
   for(const [counter,value] of Object.entries(pending.values)){
    module.recordQuestProgress({ownerId,counter,value});
    if(currentOwner()!==ownerId)return false;
    if(module.questProgressStored?.(ownerId,counter,value)){
     confirmed[counter]=Math.max(confirmed[counter]||0,value);
     const latest=pendingNow();if((latest.values[counter]||0)<=value)delete latest.values[counter];
     persist(latest.values);
    }
   }
   return Object.keys(pendingNow().values).length===0;
  }catch{return false;}
 };
 const drain=()=>{
  if(drainPromise)return drainPromise;
  if(now()<retryAt)return Promise.resolve(false);
  drainPromise=doDrain().then(ok=>{if(ok){retryAt=0;retryDelay=baseDelay;}else{retryAt=now()+retryDelay;retryDelay=Math.min(maxDelay,retryDelay*2);}return ok;}).catch(()=>{retryAt=now()+retryDelay;retryDelay=Math.min(maxDelay,retryDelay*2);return false;}).finally(()=>{drainPromise=null;});return drainPromise;
 };
 const record=(counter,value)=>{
  if(typeof ownerId!=='string'||!ownerId||currentOwner()!==ownerId||!valid(counter,value))return false;
  if(value<=(confirmed[counter]||0))return false;
  const pending=pendingNow();if((pending.values[counter]||0)<value){pending.values[counter]=value;persist(pending.values);}
  void drain();return true;
 };
 const recordWorkout=detail=>{
  const workout=detail?.workout;
  if(!workout||workout.ownerId!==ownerId||currentOwner()!==ownerId||workout.stage!=='working'||workout.paused===true)return false;
  const exercise=EXERCISES[workout.mode];if(!exercise||workout.kind!==exercise.kind)return false;
  if(workout.kind==='reps'&&(!Number.isFinite(workout.workingReps)||workout.workingReps<0||workout.workingReps>REP_CAP))return false;
  if(workout.kind==='hold'&&(!Number.isFinite(workout.activeSeconds)||workout.activeSeconds<0||workout.activeSeconds>HOLD_CAP_SECONDS))return false;
  if(workout.kind==='hold'&&exercise.group==='yoga'&&holdStyleForExercise(exercise)==='living')return record('yoga-hold-seconds',Math.min(60,Math.floor(workout.activeSeconds)));
  if(workout.kind==='hold'&&['core','balance'].includes(exercise.group)&&retainedPowerStyle(exercise)==='blizzard')return record('blizzard-tier',powerProgress(workout).tier);
  if(workout.kind!=='reps')return false;
  const style=retainedPowerStyle(exercise),tier=powerProgress(workout).tier;
  const counter=style==='aura'?'aura-tier':style==='floor'?'fire-tier':style==='lightning'?'lightning-tier':null;
  return counter?record(counter,tier):false;
 };
 return Object.freeze({record,recordWorkout,drain});
}

/** Vault startup hook: try to drain any same-owner game milestones saved offline. */
export function drainQueuedQuestProgress(options={}){
 const ownerId=options.ownerId??performanceOwner();
 return createQuestProgressReporter(ownerId,options).drain();
}
