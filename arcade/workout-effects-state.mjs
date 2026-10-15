// Tiny core-safe workout effect snapshot builder. Keep this independent from
// optional Canvas2D renderer modules so first-run offline app boot stays intact.
export function workoutEffectsSnapshot({pose={},motion={},workout=null,sessionId=null,ownerId=null,mode=null,tracking=false,visible=true,canCount=false,workingSet=false}={}){
 const active=!!(tracking&&visible&&motion.tracking===true&&workingSet&&workout&&workout.counting&&!workout.finished);
 return {
  points:pose.points??null,world:pose.world??null,width:pose.width,height:pose.height,mirrored:!!pose.mirrored,now:pose.now,
  validHold:!!(active&&motion.kind==='hold'&&motion.progress===1&&canCount),
  workout:{sessionId:sessionId??null,ownerId:ownerId??null,mode:workout?.mode??mode??null,kind:workout?.kind??motion.kind??null,stage:workout?.stage??null,paused:workout?.paused===true,active,
   workingReps:Number.isFinite(workout?.value)?workout.value:0,activeSeconds:Number.isFinite(workout?.activeSeconds)?workout.activeSeconds:0,difficulty:workout?.difficulty??'easy'}
 };
}

export function isMartialSliceExercise(exercise){
 return !!(exercise&&exercise.kind!=='hold'&&(exercise.group==='stances'||exercise.group==='boxing'));
}

export function holdStyleForExercise(exercise){
 if(!exercise||exercise.kind!=='hold')return null;
 if(exercise.group==='stances')return null;
 if(exercise.group==='core'||exercise.group==='balance')return 'blizzard';
 return 'living';
}

export function latestRetainableWorkoutSnapshot(current,next,ownerId){
 const workout=next?.workout;
 if(!workout||!ownerId||workout.ownerId!==ownerId||workout.stage!=='working'||workout.paused===true
    ||!['reps','hold'].includes(workout.kind)
    ||!(Number(workout.workingReps)>0||(workout.kind==='hold'&&Number(workout.activeSeconds)>0)))return current;
 return next;
}

// Small bounded retry window for optional artwork/storage imports. The caller
// starts attempts only in response to a later activity event, never on a timer.
export function createOptionalRetry({now=()=>Date.now(),maxAttempts=3,baseDelay=1000,maxDelay=8000,cooldown=30000}={}){
 let attempts=0,retryAt=0;
 return {
  canStart(){if(attempts>=maxAttempts&&now()>=retryAt){attempts=0;retryAt=0;}return attempts<maxAttempts&&now()>=retryAt;},
  start(){if(attempts<maxAttempts)attempts++;return attempts;},
  fail(){retryAt=now()+(attempts>=maxAttempts?cooldown:Math.min(maxDelay,baseDelay*2**Math.max(0,attempts-1)));},
  succeed(){attempts=0;retryAt=0;},
  reset(){attempts=0;retryAt=0;},
  get attempts(){return attempts;}
 };
}

const OPTIONAL_IMPORT_NONCE=Symbol.for('myr5.optional-import-nonce');
function nextOptionalImportNonce(){const next=(Number(globalThis[OPTIONAL_IMPORT_NONCE])||0)+1;globalThis[OPTIONAL_IMPORT_NONCE]=next;return next;}
/** Load one optional entry by absolute URL; cache success/in-flight work and
 * query-bust only after a real rejection so a later caller can escape the
 * browser's cached failed module entry without adding timer retries. */
export function createOptionalModuleLoader(entryUrl,{importer=url=>import(url)}={}){
 const base=new URL(entryUrl,globalThis.location?.href??import.meta.url).href;let loaded=null,inflight=null,failed=false;
 return function loadOptionalModule(){
  if(loaded)return Promise.resolve(loaded);
  if(inflight)return inflight;
  let url=base;
  if(failed){const retry=new URL(base);retry.searchParams.set('myr5_retry',String(nextOptionalImportNonce()));url=retry.href;}
  const task=Promise.resolve().then(()=>importer(url)).then(module=>{loaded=module;return module;},error=>{failed=true;throw error;}).finally(()=>{if(inflight===task)inflight=null;});
  inflight=task;return task;
 };
}
