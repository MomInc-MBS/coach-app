import test from 'node:test';
import assert from 'node:assert/strict';
import * as R from '../arcade/runner/maze-run.mjs';
import {createPoseInput,createSideStep} from '../arcade/runner/pose-input.mjs';
import {MovementSession,MOVEMENTS} from '../movement-engine.mjs';
import {EXERCISES} from '../exercise-library.mjs';
import {PerformanceWorkout} from '../pod/performance-workout.mjs';
import {GENTLE_BLOCK_XP} from '../progression-rules.mjs';

// A perfect player: reacts 0.45 s before jump/slide traps and moves out of the middle lane before a pit.
function bot(run){
  const e=R.upcoming(run),v=Math.max(.1,R.runSpeed(run));if(!e)return;const ahead=e.at-run.distance;
  if(e.type==='pit'&&run.lane===1&&ahead<10)R.input(run,'left');
  if(e.type==='turn'&&ahead<10&&!run.turn)R.input(run,e.direction);
  if(e.type==='grid'&&ahead/v<.45)R.input(run,'slide');
  if(e.type==='platform'&&ahead/v<.45)R.input(run,'jump');
}
const play=(run,seconds,drive=bot)=>{for(let i=0;i<seconds*40;i++){drive(run);R.step(run,1/40);}return run;};

test('courses chain endlessly and stay deterministic',()=>{
  const a=play(Object.assign(R.createRun(7),{jogging:true}),600),b=play(Object.assign(R.createRun(7),{jogging:true}),600);
  assert.ok(a.courses>=8,'600 s of jogging runs through many courses: '+a.courses);
  assert.equal(a.status,'running');assert.equal(a.level,a.courses);
  assert.deepEqual([a.courses,a.cleared,a.total.toFixed(3)],[b.courses,b.cleared,b.total.toFixed(3)]);
  assert.deepEqual(R.courseFor(99,4),R.courseFor(99,4));
});

test('each course is harder: more traps, tighter spacing, faster, combos later',()=>{
  const stats=[0,3,6,10,16].map(level=>{let traps=0,gap=0,n=0,combos=0;for(let s=0;s<30;s++){const c=R.courseFor(s*31,level),t=c.events.filter(e=>e.type!=='turn');traps+=t.length;combos+=t.filter(e=>e.combo).length;
    for(let i=1;i<t.length;i++){gap+=t[i].at-t[i-1].at-(t[i-1].length||0);n++;}}return {level,traps:traps/30,gapS:gap/n/R.courseSpeed(level),speed:R.courseSpeed(level),combos};});
  for(let i=1;i<stats.length;i++){const p=stats[i-1],c=stats[i];
    assert.ok(c.traps>p.traps,'more traps '+JSON.stringify(stats));assert.ok(c.gapS<p.gapS,'tighter '+JSON.stringify(stats));assert.ok(c.speed>p.speed,'faster');}
  assert.equal(stats[0].combos,0,'no combos on the first course');assert.ok(stats.at(-1).combos>0,'mixed combos later');
  const combo=R.courseFor(5,12).events.find(e=>e.combo);assert.ok(combo&&combo.type!=='pit','a combo follows a pit with a grid or platform');
});

test('every trap is solvable at full pace across 40 seeds and 20 minutes',()=>{
  for(let seed=0;seed<40;seed++){const run=play(Object.assign(R.createRun(seed),{jogging:true}),1200);assert.equal(run.hits,0,'seed '+seed);assert.ok(run.level>20);}
});

test('a hit is a stumble: slows, raises pressure, never ends the run; pressure decays as traps clear',()=>{
  const run=Object.assign(R.createRun(3),{jogging:true});let stumbled=null;
  for(let i=0;i<40*60&&!stumbled;i++){R.step(run,1/40);stumbled=run.feed.find(f=>f.type==='stumble');}
  assert.ok(stumbled,'idle player hits a trap');assert.equal(run.status,'running');
  assert.ok(run.stumble>0&&R.runSpeed(run)<R.courseSpeed(run.level)*.5,'brief slow-down');
  const peak=run.pressure;assert.ok(peak>R.STUMBLE.floor);
  play(run,60);assert.ok(run.pressure<peak,'pressure decays once the player clears traps');
  play(run,120,()=>{});assert.equal(run.status,'running','still running after many hits: '+run.hits);
  R.stumble(run,{type:'throw'});assert.equal(run.status,'running','an unhit projectile is a stumble too');assert.equal(run.feed.at(-1).trap,'throw');
});

// Stop jogging: speed ramps to 0 over 10 s while Coach closes in; 10 s still is caught, resuming before that ramps back.
const jogFor=(run,s)=>{run.jogging=true;return play(run,s);},stillFor=(run,s)=>{run.jogging=false;return play(run,s,()=>{});};
test('stopping ramps the speed down: about half speed at 5 s, with a warning and Coach closing in',()=>{
  const run=jogFor(R.createRun(5),4),full=R.courseSpeed(run.level);assert.equal(R.runSpeed(run),full);
  stillFor(run,5);const ratio=run.gait;
  assert.ok(Math.abs(ratio-.5)<.03,'gait at 5 s still: '+ratio);assert.ok(run.feed.some(f=>f.type==='warn'),'clay warning at 5 s');
  assert.ok(Math.abs(run.chase-.5)<.03,'Coach half way: '+run.chase);assert.equal(run.status,'running');
});
test('caught at exactly 10 s still; not caught at 9.9 s followed by a resume, which ramps back up and Coach falls back',()=>{
  const a=stillFor(jogFor(R.createRun(6),3),9.9);assert.equal(a.status,'running');
  jogFor(a,3);assert.equal(a.status,'running');assert.equal(a.gait,1,'back to full speed');assert.ok(a.chase<.4,'Coach falls back: '+a.chase);
  stillFor(a,9.975);assert.equal(a.status,'running','9.975 s is not 10');stillFor(a,.025);assert.equal(a.status,'caught');assert.ok(a.feed.some(f=>f.type==='caught'));
  const b=R.createRun(1);stillFor(b,30);assert.equal(b.status,'running','the stop clock waits for the first jog step');
});
test('Cool Cardio replaces Jog in place, is the only runner mode, and is endless gentle cardio whose finish awards XP',()=>{
  const names=Object.values(MOVEMENTS).map(m=>m.name),cardio=Object.values(EXERCISES).filter(x=>x.group==='cardio');
  assert.ok(names.includes('Cool Cardio'));assert.ok(!names.includes('Jog in place'));assert.equal(MOVEMENTS.jogging.name,'Cool Cardio');
  assert.deepEqual(Object.values(EXERCISES).filter(x=>x.runner).map(x=>x.id),['jogging']);
  for(const x of cardio.filter(x=>x.id!=='jogging'))assert.ok(!x.runner&&!x.endless&&x.lift!==.08,x.id+' unchanged, no runner');
  assert.equal(MOVEMENTS['high-march'].lift,.4);assert.equal(MOVEMENTS.march.lift,undefined);
  // Sprint style is ignored, the 600 s gentle finish is gone, and finishing (tap stop or caught) pays the gentle rate.
  const w=new PerformanceWorkout({mode:'jogging',kind:'steps',cardio:'sprint'});assert.equal(w.kind,'gentle');
  let t=0,count=0;for(let i=0;i<=700*4;i++){t+=250;if(i%2===0)count++;assert.equal(w.update({kind:'steps',count},t),null,'no auto finish at '+i/4+' s');}
  const r=w.finish();assert.ok(r&&r.activeSeconds>=699,'finishes on demand');assert.equal(r.xpBase,Math.floor(r.activeSeconds/15)*GENTLE_BLOCK_XP);
  const gentle=new PerformanceWorkout({mode:'march',kind:'steps'});t=0;count=0;let done=null;for(let i=0;i<=700*4&&!done;i++){t+=250;if(i%2===0)count++;done=gentle.update({kind:'steps',count},t);}
  assert.ok(done,'Easy march still finishes at 600 s as before');
});

// ---- body controls on synthetic MediaPipe landmarks (portrait 480x640) ----
const W=480,H=640,A=W/H;
function body({hip=0,lift=null,out=null,shift=0,drop=0,rise=0,wide=0,small=false}={}){
  const p=Array.from({length:33},()=>({x:.5,y:.2,z:0,visibility:1})),cx=.5+shift,y=v=>v-rise+drop;
  const set=(i,x,yy)=>{p[i]={x,y:yy,z:0,visibility:1};};
  // index: left side = +x in the image (player faces the camera), right side = -x.
  for(const [side,s,h,k,a] of [[1,11,23,25,27],[-1,12,24,26,28]]){
    set(s,.5+shift*.5+side*.12,y(.30+hip));set(h,cx+side*.06,y(.50+hip));
    const up=lift===side,o=out===side;
    set(k,o?cx+side*.2:cx+side*(.075+wide),up?(small?.67:.58)-rise:o?.67:.69-rise);
    set(a,o?cx+side*.36:cx+side*(.07+wide),up?(small?.84:.76)-rise:o?.84:.88-rise);
  }
  return p;
}
function feed(input,frames){const acts=[];for(const [t,points] of frames){const r=input.update({points,width:W,height:H,now:t*1000});acts.push(...r.actions);}return acts;}
const stand=(from,to,fps=30)=>Array.from({length:Math.round((to-from)*fps)},(_,i)=>[from+i/fps,body()]);
const jog=(from,to,fps=30)=>Array.from({length:Math.round((to-from)*fps)},(_,i)=>{const t=from+i/fps,ph=Math.floor(t*5)%4;return [t,body({lift:ph===0?1:ph===2?-1:null,hip:ph%2?0:-.006})];});

test('jogging in place keeps you running and never fires left/right, jump or slide',()=>{
  const input=createPoseInput({Session:MovementSession});
  assert.deepEqual(feed(input,stand(0,1.5)),[]);assert.ok(input.calibrated,'short standing calibration');
  const acts=feed(input,jog(1.5,9.5));
  assert.deepEqual(acts,[],'jogging knee lifts fire nothing');assert.ok(input.jogging);
  feed(input,stand(9.5,13));assert.ok(!input.jogging,'standing still stops');
});
test('a gentle jog (small knee lift, a bit above walking pace) holds full speed continuously',()=>{
  const input=createPoseInput({Session:MovementSession}),run=R.createRun(2);feed(input,stand(0,1.5));
  // ~1.6 steps/s alternating, knee lift only 0.1 torso (below the .13 the other marches need).
  const gentle=Array.from({length:30*12},(_,i)=>{const t=1.5+i/30,ph=Math.floor(t*1.6)%2,up=(t*1.6)%1<.35;return [t,body({lift:up?(ph?1:-1):null,small:true})];});
  let minGait=1;for(const [t,points] of gentle){run.jogging=input.update({points,width:W,height:H,now:t*1000}).jogging;R.step(run,1/30);if(t>4)minGait=Math.min(minGait,run.gait);}
  assert.equal(minGait,1,'full speed the whole time');assert.equal(run.still,0);
});

test('one-leg side step fires once per step, in the player\'s direction, at 30/s and at phone rates',()=>{
  for(const fps of [30,2]){
    const input=createPoseInput({Session:MovementSession});feed(input,stand(0,1.5,fps));
    // Player's right leg out (image-left); hips shift over the planted left foot.
    const right=Array.from({length:Math.max(2,fps/2)},(_,i)=>[1.5+i/fps,body({out:-1,shift:.04})]);
    assert.deepEqual(feed(input,right),['right'],fps+'/s right');
    assert.deepEqual(feed(input,stand(2.5,3.5,fps)),[]);
    const left=Array.from({length:Math.max(2,fps/2)},(_,i)=>[3.5+i/fps,body({out:1,shift:-.04})]);
    assert.deepEqual(feed(input,left),['left'],fps+'/s left');
  }
});

test('side step needs a planted foot: a wide two-foot stance does not steer',()=>{
  const side=createSideStep();let fired=0;
  for(let i=0;i<60;i++)if(side.update(body({wide:.3}),i/30,A))fired++;
  assert.equal(fired,0);
});

test('jump and crouch reuse the jump and squat detectors',()=>{
  const input=createPoseInput({Session:MovementSession});feed(input,stand(0,1.5));
  const up=feed(input,Array.from({length:12},(_,i)=>[1.5+i/30,body({rise:.06})]));
  assert.ok(up.includes('jump'),'jump: '+up);feed(input,stand(1.9,3));
  const down=feed(input,Array.from({length:12},(_,i)=>[3+i/30,body({drop:.07})]));
  assert.ok(down.includes('slide'),'crouch: '+down);
});
