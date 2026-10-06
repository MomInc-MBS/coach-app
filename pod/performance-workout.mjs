import {EXERCISES} from '../exercise-library.mjs';
import {holdXp,repXp,HOLD_TARGET_SECONDS,HOLD_CAP_SECONDS,HOLD_RECOVERY_SECONDS,WORKOUT_REST_SECONDS,REP_CAP,PREPARATION_REPS,SECOND_PREPARATION_TEMPO_SECONDS,SPRINT_ROUNDS,SPRINT_SECONDS,SPRINT_REST_SECONDS,HOLD_BLOCK_SECONDS} from '../progression-rules.mjs';

export function exerciseDifficulty(mode){
 const exercise=EXERCISES[mode];if(!exercise)return 'easy';
 const rows=Object.values(EXERCISES).filter(row=>row.group===exercise.group&&row.kind===exercise.kind);
 const index=rows.findIndex(row=>row.id===mode);
 return ['easy','medium','hard','expert'][Math.min(3,Math.floor(Math.max(0,index)*4/Math.max(1,rows.length)))];
}
export function preparationVariants(mode){
 const chosen=EXERCISES[mode],rows=Object.values(EXERCISES).filter(row=>row.group===chosen?.group&&row.kind==='reps');
 const index=rows.findIndex(row=>row.id===mode);
 return {easy:rows[Math.max(0,index-1)]??chosen,hard:rows[Math.min(rows.length-1,index+1)]??chosen};
}
const number=value=>Math.max(0,Number(value)||0);
/** One persisted workout contains preparations and one working set. Only the
 * working result is eligible for history/XP. Raw tracker counts are monotonic;
 * baselines exclude everything performed during a preparation or recovery. */
export class PerformanceWorkout {
 constructor({mode,kind,difficulty=exerciseDifficulty(mode),cardio='gentle',snapshot=null}={}){
  this.mode=mode;this.kind=kind==='hold'?'hold':kind==='reps'?'reps':cardio==='sprint'?'sprint':'gentle';this.difficulty=difficulty;
  this.stage=this.kind==='reps'?'preparation-easy':'working';this.raw=0;this.baseline=0;this.value=0;this.activeSeconds=0;this.continuousSeconds=0;this.maxContinuousSeconds=0;this.xpBase=0;this.recoveryUntil=0;this.paused=false;this.finished=false;this.round=1;this.sprintSeconds=0;this.lastNow=null;this.lastMovementNow=-Infinity;this.lastPreparationRepAt=null;this.slowAccepted=0;this.perDifficultyContinuous={};this.lastCameraHold=0;this.continuousRawOffset=0;this.holdBlocks=[];
  if(snapshot&&snapshot.mode===mode)Object.assign(this,snapshot,{finished:false,continuousSeconds:0,lastNow:null,lastCameraHold:0,continuousRawOffset:0});
  if(snapshot?.activeSeconds>=HOLD_BLOCK_SECONDS&&!Array.isArray(snapshot.holdBlocks))this.holdBlocks=null;
  if(!Object.keys(this.perDifficultyContinuous).length&&this.maxContinuousSeconds>0)this.perDifficultyContinuous[this.difficulty]=this.maxContinuousSeconds;
 }
 snapshot(){return Object.fromEntries(Object.entries(this).filter(([key])=>!['lastNow','lastMovementNow'].includes(key)));}
 get counting(){return !this.finished&&!this.paused&&this.stage!=='preparation-rest'&&this.stage!=='sprint-rest';}
 get instruction(){
  const variants=preparationVariants(this.mode);
  if(this.paused)return 'Shake out and recover. Resume whenever ready; recovery adds no XP.';
  if(this.stage==='preparation-easy')return `Warm up: ${PREPARATION_REPS} ${variants.easy?.name??this.mode}, full comfortable range. Good job, superstar. No XP for preparation.`;
  if(this.stage==='preparation-slow')return `Slow preparation: ${PREPARATION_REPS} ${variants.hard?.name??this.mode}. Take ${SECOND_PREPARATION_TEMPO_SECONDS} seconds for each full movement. No XP for preparation.`;
  if(this.stage==='preparation-rest')return 'Recover for 30 seconds. Preparation does not count toward training history.';
  if(this.stage==='sprint-rest')return `Round ${this.round}/${SPRINT_ROUNDS}: recover for 45 seconds.`;
  if(this.kind==='sprint')return `Round ${this.round}/${SPRINT_ROUNDS}: sprint for 15 seconds. Warm up first.`;
  if(this.kind==='reps')return this.value>=REP_CAP?'Please stop. Thirty reps is the counting limit.':'Working set: aim for 8–12 controlled reps. Finish when you choose.';
  return this.activeSeconds>=HOLD_CAP_SECONDS?'Please stop. Thirty active minutes is the XP limit.':this.kind==='hold'?'Hold: active time counts up. Break whenever needed. Ten uninterrupted minutes earns gold.':'Gentle cardio: active movement earns XP; rest does not.';
 }
 breakHold(now=Date.now()){if(this.kind!=='hold'||this.finished)return;this.paused=true;this.continuousSeconds=0;this.recoveryUntil=now+HOLD_RECOVERY_SECONDS*1000;}
 resumeHold(){this.paused=false;this.continuousSeconds=0;this.recoveryUntil=0;}
 extendRecovery(seconds=15,now=Date.now()){this.recoveryUntil=Math.max(now,this.recoveryUntil)+seconds*1000;}
 advancePreparationRecovery(now=Date.now()){
  if(this.stage!=='preparation-rest'||now<this.recoveryUntil)return false;
  this.stage=this.nextStage;this.value=0;this.baseline=this.raw;this.lastPreparationRepAt=now;this.lastNow=null;return true;
 }
 rebaseTracking(){this.raw=0;this.baseline=0;this.value=0;this.lastNow=null;this.lastMovementNow=-Infinity;}
 switchDifficulty(difficulty){if(!['easy','medium','hard','expert'].includes(difficulty))throw Error('Unknown exercise difficulty.');if(difficulty===this.difficulty)return;if(this.kind!=='hold')throw Error('Choose repetition difficulty before the working set.');this.perDifficultyContinuous[this.difficulty]=Math.max(this.perDifficultyContinuous[this.difficulty]||0,this.maxContinuousSeconds);this.difficulty=difficulty;this.continuousSeconds=0;this.maxContinuousSeconds=0;this.continuousRawOffset=this.lastCameraHold;}
 update(m,now=Date.now()){
  if(this.finished)return null;
  const raw=number(this.kind==='hold'?m.totalHold:this.kind==='reps'?m.count:m.manual?m.elapsed:['steps','jumps','reps'].includes(m.kind)?m.count:m.active);
  const delta=Math.max(0,raw-this.raw),elapsed=this.lastNow===null?0:Math.max(0,Math.min(1,(now-this.lastNow)/1000));this.raw=raw;this.lastNow=now;if(delta>0)this.lastMovementNow=now;const moving=m.manual?!this.paused:now-this.lastMovementNow<=1250;
  if(this.stage==='preparation-rest'){
   this.baseline=raw;this.advancePreparationRecovery(now);return null;
  }
  if(this.kind==='reps'){
   this.value=Math.min(REP_CAP,Math.max(0,raw-this.baseline));
   if(this.stage.startsWith('preparation-')){
    if(this.stage==='preparation-slow'){if(raw>this.baseline){if(now-(this.lastPreparationRepAt??now)>=SECOND_PREPARATION_TEMPO_SECONDS*1000){this.slowAccepted++;this.lastPreparationRepAt=now;}this.baseline=raw;}this.value=this.slowAccepted;}
    if(this.value>=PREPARATION_REPS){this.nextStage=this.stage==='preparation-easy'?'preparation-slow':'working';this.stage='preparation-rest';this.recoveryUntil=now+WORKOUT_REST_SECONDS*1000;this.value=0;this.baseline=raw;}
    return null;
   }
   this.xpBase=repXp({difficulty:this.difficulty,to:Math.floor(this.value)});
   if(this.value>=REP_CAP)return this.finish();return null;
  }
  if(this.kind==='hold'){
   const wasHolding=this.continuousSeconds>0,cameraHold=number(m.hold);if(!m.manual&&cameraHold<this.lastCameraHold){this.continuousRawOffset=0;this.continuousSeconds=0;}this.lastCameraHold=cameraHold;const cameraContinuous=m.manual?null:Math.max(0,cameraHold-this.continuousRawOffset);
   if(!m.manual&&cameraContinuous===0&&wasHolding)this.breakHold(now);
   if(!m.manual&&this.paused&&cameraContinuous>0)this.resumeHold();
   if(this.paused)return null;
   const before=this.activeSeconds,continuousBefore=this.continuousSeconds;
   this.activeSeconds=Math.min(HOLD_CAP_SECONDS,before+delta);
   this.continuousSeconds=m.manual?continuousBefore+delta:cameraContinuous;
   this.maxContinuousSeconds=Math.max(this.maxContinuousSeconds,this.continuousSeconds);
   this.perDifficultyContinuous[this.difficulty]=Math.max(this.perDifficultyContinuous[this.difficulty]||0,this.continuousSeconds);
   if(Array.isArray(this.holdBlocks))for(let block=Math.floor(before/HOLD_BLOCK_SECONDS);block<Math.floor(this.activeSeconds/HOLD_BLOCK_SECONDS);block++){const activeStart=block*HOLD_BLOCK_SECONDS;this.holdBlocks.push({difficulty:this.difficulty,activeStart,continuousStart:Math.max(0,continuousBefore+activeStart-before)});}
   this.xpBase+=holdXp({difficulty:this.difficulty,from:before,to:this.activeSeconds,continuousAtFrom:continuousBefore});this.value=this.activeSeconds;
   if(this.activeSeconds>=HOLD_CAP_SECONDS)return this.finish();return null;
  }
  if(this.kind==='sprint'){
   if(this.stage==='sprint-rest'){
    if(now>=this.recoveryUntil){if(this.round>=SPRINT_ROUNDS)return this.finish();this.round++;this.sprintSeconds=0;this.stage='working';}return null;
   }
   // Movement must be observed. An unattended wall-clock cannot award a sprint.
   this.sprintSeconds+=moving?elapsed:0;this.activeSeconds+=moving?elapsed:0;this.value=this.activeSeconds;
   if(this.sprintSeconds>=SPRINT_SECONDS){this.stage='sprint-rest';this.recoveryUntil=now+SPRINT_REST_SECONDS*1000;this.xpBase+=28*SPRINT_SECONDS/60;}
   return null;
  }
  this.activeSeconds+=moving?elapsed:0;this.value=this.activeSeconds;this.xpBase=Math.floor(this.activeSeconds/15);if(this.activeSeconds>=HOLD_TARGET_SECONDS)return this.finish();return null;
 }
 finish(){
  if(this.finished||this.stage.startsWith('preparation-')||this.xpBase<=0||this.kind==='reps'&&this.value<1||this.kind!=='reps'&&this.activeSeconds<15)return null;
  this.finished=true;return {mode:this.mode,kind:this.kind,difficulty:this.difficulty,value:this.value,activeSeconds:this.activeSeconds,maxContinuousSeconds:this.maxContinuousSeconds,perDifficultyContinuous:{...this.perDifficultyContinuous},...(this.kind==='hold'&&Array.isArray(this.holdBlocks)?{holdBlocks:this.holdBlocks.map(block=>({...block}))}:{}),xpBase:this.xpBase,earned:this.xpBase>0,preparation:false,working:true,rounds:this.kind==='sprint'?Math.min(SPRINT_ROUNDS,this.round):0};
 }
}
