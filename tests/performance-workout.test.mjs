import test from 'node:test';
import assert from 'node:assert/strict';
import {PerformanceWorkout,exerciseDifficulty,preparationVariants} from '../pod/performance-workout.mjs';
import {SetFlow} from '../pod/set-flow.mjs';
const hold=(seconds,continuous=seconds)=>({mode:'high-horse',kind:'hold',totalHold:seconds,hold:continuous});
test('active seconds and continuous attempts stay separate across automatic recovery',()=>{
 const w=new PerformanceWorkout({mode:'high-horse',kind:'hold',difficulty:'easy'});
 w.update(hold(10),10000);assert.equal(w.xpBase,0);
 w.update(hold(10,0),11000);assert.equal(w.paused,true);assert.equal(w.recoveryUntil,26000);
 w.update(hold(10,1),12000);assert.equal(w.paused,false);assert.equal(w.recoveryUntil,0);
 w.update(hold(15,5),17000);assert.equal(w.xpBase,1);assert.equal(w.activeSeconds,15);assert.equal(w.maxContinuousSeconds,10);
});
test('manual break excludes the timer until resumed and carries fractional XP blocks',()=>{
 const w=new PerformanceWorkout({mode:'high-horse',kind:'hold',difficulty:'easy'});
 w.update({...hold(7),manual:true},7000);w.breakHold(7000);
 w.update({...hold(22),manual:true},22000);assert.equal(w.activeSeconds,7);
 w.resumeHold();w.update({...hold(30),manual:true},30000);assert.equal(w.activeSeconds,15);assert.equal(w.xpBase,1);assert.equal(w.maxContinuousSeconds,8);
});
test('gold needs ten continuous minutes; a ten minute active workout alone does not qualify',()=>{
 const w=new PerformanceWorkout({mode:'high-horse',kind:'hold',difficulty:'expert'});
 for(let i=1;i<=600;i++)w.update(hold(i,i<=300?i:i-300),i*1000);
 assert.equal(w.activeSeconds,600);assert.equal(w.maxContinuousSeconds,300);assert.equal(w.xpBase,252);
 const continuous=new PerformanceWorkout({mode:'high-horse',kind:'hold',difficulty:'expert'});
 for(let i=1;i<=600;i++)continuous.update(hold(i),i*1000);
 assert.equal(continuous.maxContinuousSeconds,600);assert.equal(continuous.xpBase,252);
 for(let i=601;i<=615;i++)continuous.update(hold(i),i*1000);
 assert.equal(continuous.xpBase,260.75);
});
test('preparations and their recoveries earn no XP; slow prep rejects quick repetitions',()=>{
 const w=new PerformanceWorkout({mode:'pushup',kind:'reps',difficulty:'easy'}),m=n=>({count:n,kind:'reps'});
 w.update(m(3),1000);assert.equal(w.stage,'preparation-rest');assert.equal(w.finish(),null);assert.equal(w.xpBase,0);
 w.update(m(7),31000);assert.equal(w.stage,'preparation-slow');
 w.update(m(8),32000);assert.equal(w.value,0);
 w.update(m(9),36000);w.update(m(10),41000);w.update(m(11),46000);assert.equal(w.stage,'preparation-rest');
 w.update(m(15),76000);w.update(m(23),77000);assert.equal(w.value,8);assert.equal(w.xpBase,9);
 const result=w.finish();assert.equal(result.value,8);assert.equal(result.preparation,false);assert.equal(result.xpBase,9);
});
test('one tracked workout can finish early or at thirty reps with no preparation history result',()=>{
 const f=new SetFlow();f.start('squat',30,30,{performance:true,kind:'reps'});
 const w=f.workout;w.stage='working';
 assert.equal(f.consume({mode:'squat',kind:'reps',count:8,name:'Squat'},1000),null);
 const result=f.finishWorking({mode:'squat',kind:'reps',count:8,name:'Squat'},1100);
 assert.equal(result.value,8);assert.equal(f.phase,'rest');assert.equal(f.consume({mode:'squat',kind:'reps',count:9},1200),null);
 assert.equal(f.progress.completedSets,0,'only the successful persistence path may increment the count');
});
test('sprint has five active fifteen-second intervals, five recoveries, and no unattended credit',()=>{
 const w=new PerformanceWorkout({mode:'jogging',kind:'steps',cardio:'sprint'});
 for(let t=0;t<10;t++)w.update({kind:'steps',count:0},t*1000);assert.equal(w.activeSeconds,0);
 let raw=0,time=10000,result;
 for(let round=0;round<5;round++){
  while(w.stage==='working'){raw++;w.update({kind:'steps',count:raw},time);time+=1000;}
  assert.equal(w.stage,'sprint-rest');assert.equal(w.xpBase,(round+1)*7);
  time=w.recoveryUntil;result=w.update({kind:'steps',count:raw},time);time+=1000;
 }
 assert.ok(result);assert.equal(result.xpBase,35);assert.equal(w.finished,true);
});
test('variation suggestions keep the target muscle group and difficulty is fixed catalog order',()=>{
 const variants=preparationVariants('pushup');assert.equal(variants.easy.group,'chest');assert.equal(variants.hard.group,'chest');assert.equal(exerciseDifficulty('knee-pushup'),'easy');assert.equal(exerciseDifficulty('decline-pushup'),'expert');
});

test('controller snapshots persist as finite JSON and database success survives acknowledgement-cache failure',async()=>{
 const {WorkoutSessionOwner}=await import('../pod/workout-session-owner.mjs');
 const w=new PerformanceWorkout({mode:'pushup',kind:'reps'});
 const snapshot=w.snapshot();assert.ok(!Object.values(snapshot).some(v=>typeof v==='number'&&!Number.isFinite(v)));
 const owner=new WorkoutSessionOwner({storage:{getItem:()=>null,setItem(){throw Error('full');}},saveProgress:async()=>({local:true})});
 owner.start();const result=await owner.complete({id:'saved'});assert.equal(result.saved,true);assert.equal(result.acknowledged,false);assert.equal(owner.canStart(),true);
});

test('warming up increases rest-strike damage and preparation taps never award XP',()=>{
 const f=new SetFlow(null,{now:0});f.start('squat',30,30,{performance:true,kind:'reps'});f.workout.stage='preparation-rest';f.workout.nextStage='preparation-slow';
 assert.equal(f.preparationTap(1000).damage,2);f.workout.nextStage='working';assert.equal(f.preparationTap(2000).damage,4);assert.equal(f.xp,0);
 f.workout.stage='working';assert.equal(f.preparationTap(3000),null);f.workout.value=8;f.workout.xpBase=9;f.finishWorking({count:8,mode:'squat',kind:'reps'},3100);assert.equal(f.tap(4000).damage,6);
});

test('switching hold difficulty keeps active XP time but never transfers continuous achievements',()=>{
 for(const manual of [true,false]){
  const w=new PerformanceWorkout({mode:'high-horse',kind:'hold',difficulty:'easy'});
  for(let seconds=1;seconds<=595;seconds++)w.update({...hold(seconds),manual},seconds*1000);
  const xpBefore=w.xpBase;w.switchDifficulty('expert');assert.equal(w.activeSeconds,595);assert.equal(w.continuousSeconds,0);assert.equal(w.maxContinuousSeconds,0);
  for(let seconds=596;seconds<=600;seconds++)w.update({...hold(seconds),manual},seconds*1000);
  assert.equal(w.activeSeconds,600);assert.equal(w.continuousSeconds,5);assert.equal(w.maxContinuousSeconds,5);assert.ok(w.xpBase>xpBefore);
  const result=w.finish();assert.deepEqual(result.perDifficultyContinuous,{easy:595,expert:5});
 }
});
test('earned earlier variation milestones survive switching and pausing',()=>{
 const w=new PerformanceWorkout({mode:'high-horse',kind:'hold',difficulty:'easy'});
 for(let seconds=1;seconds<=600;seconds++)w.update({...hold(seconds),manual:true},seconds*1000);
 w.switchDifficulty('expert');w.update({...hold(605),manual:true},605000);w.breakHold(605000);
 const restored=new PerformanceWorkout({mode:'high-horse',kind:'hold',snapshot:JSON.parse(JSON.stringify(w.snapshot()))});
 assert.deepEqual(restored.perDifficultyContinuous,{easy:600,expert:5});assert.equal(restored.continuousSeconds,0);
 restored.resumeHold();restored.update({...hold(610),manual:true},610000);assert.equal(restored.maxContinuousSeconds,5);
});

test('paid hold blocks replay exact XP through breaks, switches, pauses and the active cap',async()=>{
 const {holdRate,extendedHoldMultiplier}=await import('../progression-rules.mjs');
 const w=new PerformanceWorkout({mode:'high-horse',kind:'hold',difficulty:'easy'});
 for(let seconds=1;seconds<=67;seconds++)w.update({...hold(seconds),manual:true},seconds*1000);
 w.breakHold(67000);w.update({...hold(82),manual:true},82000);w.resumeHold();w.switchDifficulty('expert');
 for(let seconds=83;seconds<=700;seconds++)w.update({...hold(seconds),manual:true},seconds*1000);
 const restored=new PerformanceWorkout({mode:'high-horse',kind:'hold',snapshot:JSON.parse(JSON.stringify(w.snapshot()))});
 for(let seconds=701;seconds<=1900;seconds++)restored.update({...hold(seconds),manual:true},seconds*1000);
 assert.equal(restored.holdBlocks.length,120);
 assert.deepEqual(restored.holdBlocks.map(b=>b.activeStart),Array.from({length:120},(_,i)=>i*15));
 assert.equal(restored.holdBlocks[0].difficulty,'easy');assert.equal(restored.holdBlocks[4].difficulty,'expert');
 const replay=restored.holdBlocks.reduce((xp,b)=>xp+holdRate(b.difficulty,b.activeStart)/4*extendedHoldMultiplier(b.continuousStart),0);
 assert.equal(replay,restored.xpBase);assert.equal(restored.activeSeconds,1800);assert.equal(restored.finished,true);
});
test('legacy blockless paused XP is explicitly distinguished from complete paid-block evidence',()=>{
 const w=new PerformanceWorkout({mode:'high-horse',kind:'hold',snapshot:{mode:'high-horse',kind:'hold',activeSeconds:30,raw:30,value:30,xpBase:2}});
 w.update({...hold(45),manual:true},45000);const result=w.finish();assert.equal(result.xpBase,3);assert.equal('holdBlocks' in result,false);
});
