import test from 'node:test';
import assert from 'node:assert/strict';
import {readdirSync,readFileSync,existsSync} from 'node:fs';
import {MovementSession,MOVEMENTS,features} from '../movement-engine.mjs';
import {RULES,evaluateMovement} from '../movement-rules.mjs';
import {EXERCISES} from '../exercise-library.mjs';
import POSE_SAMPLES from '../pose-samples.mjs';
import {convert,replay} from '../scripts/pose-samples.mjs';
import {REP_CYCLES,ENGINE,LIBRARY,random,syntheticRecording} from './pose-fixtures.mjs';

const LEGACY=['squat','pushup','tree','warrior','horse'];
test('every camera exercise that counts on the rules has a data row',()=>{
 for(const m of Object.values(EXERCISES)){
  if(LEGACY.includes(m.id)||['boxing','march'].includes(m.detector))continue;
  assert.ok(RULES[m.id]??RULES[m.detector],m.id);
 }
});
test('adding a row is enough to count a new joint-triplet movement',()=>{
 RULES['test-curl']={need:'s e w h',up:['s-e-w > 150'],down:['s-e-w < 70'],metric:'s-e-w 150 -80'};
 const curl={id:'test-curl',detector:'curl',hint:''},p=LIBRARY.standing(),bent=LIBRARY.standing();
 for(const [e,w] of [[13,15],[14,16]])Object.assign(bent[w],{x:bent[e].x+.08,y:bent[e].y-.06});
 assert.deepEqual([evaluateMovement(features(p),curl).up,evaluateMovement(features(bent),curl).down],[true,true]);
 delete RULES['test-curl'];
});

// Realistic reps: smooth cosine between the start and end fixtures with no pause at either end, each rep's length
// varied ±10%, sampled at phone tracker rates (1.4–2.5/s measured on Ian's phone) and at 30/s.
function reps(mode,top,bottom,{fps,period,n=5,depth=1,jitter=.003,drop=0,seed=1}){
 const rnd=random(seed),session=new MovementSession(mode,{samples:null}),T=top(),B=bottom();
 const starts=[3];for(let i=0;i<n;i++)starts.push(starts[i]+period*(.9+.2*rnd()));const end=starts[n];
 const at=t=>{if(t<3||t>=end)return 0;const i=starts.findIndex(s=>s>t)-1;return depth*(1-Math.cos(2*Math.PI*(t-starts[i])/(starts[i+1]-starts[i])))/2;};
 for(let t=rnd()/fps;t<end+2;t+=1/fps){if(rnd()<drop)continue;const k=at(t);
  session.update(T.map((v,i)=>({...v,x:v.x+(B[i].x-v.x)*k+(rnd()-.5)*2*jitter,y:v.y+(B[i].y-v.y)*k+(rnd()-.5)*2*jitter})),t*1000);}
 return session.count;
}
for(const [mode,top,bottom] of REP_CYCLES){
 test(`${mode}: 5 reps at 2 s and 3 s per rep count at 1.5, 2, 4 and 30 updates/s`,()=>{
  for(const period of [2,3])for(const fps of [1.5,2,4,30])for(const seed of [1,2,3]){
   const count=reps(mode,top,bottom,{fps,period,seed}),label=`${mode} ${period} s/rep at ${fps}/s seed ${seed}`;
   // 2 s reps at 1.5/s give 3 samples per rep: one may fall between the zones. Never more than performed.
   if(period===2&&fps===1.5)assert.ok(count>=4&&count<=5,`${label}: ${count}`);else assert.equal(count,5,label);
  }
  for(const seed of [1,2,3])assert.equal(reps(mode,top,bottom,{fps:30,period:2,drop:.3,seed}),5,`${mode} 30% dropped frames seed ${seed}`);
 });
 test(`${mode}: stillness with jitter and shallow bobbing never count`,()=>{
  for(const fps of [1.5,30])for(const seed of [1,2,3]){
   assert.equal(reps(mode,top,bottom,{fps,period:2,n:8,depth:0,jitter:.006,seed}),0,`${mode} still at ${fps}/s`);
   assert.equal(reps(mode,top,bottom,{fps,period:1,n:12,depth:.2,jitter:.004,seed}),0,`${mode} bobbing at ${fps}/s`);
  }
 });
}

const example=syntheticRecording();

test('continuous one-second squats count across every sampling phase at 4, 8 and 10 Hz',()=>{
 for(const fps of [4,8,10])for(let offset=0;offset<40;offset++){
  const session=new MovementSession('squat',{samples:null}),top=ENGINE.standing(),bottom=ENGINE.squat();
  for(let t=offset/40/fps;t<15;t+=1/fps){const k=t<3||t>=13?0:(1-Math.cos(2*Math.PI*(t-3)))/2;
   session.update(top.map((v,i)=>({...v,x:v.x+(bottom[i].x-v.x)*k,y:v.y+(bottom[i].y-v.y)*k})),t*1000);
  }
  assert.equal(session.count,10,`${fps} Hz, offset ${offset}/40`);
 }
});

test('a single noisy terminal sample at 30 Hz does not satisfy dwell',()=>{
 const session=new MovementSession('squat',{samples:null});session.phase='top';session.dt=1/30;
 session.repetition(true,false,1,.18);assert.equal(session.phase,'top');
 session.repetition(false,true,1+1/30,.18);assert.equal(session.count,0);
});
test('the samples script turns a recording into a samples file under 50 KB and a replay fixture',()=>{
 const {samples,fixture}=convert(example,{reps:6});
 assert.ok(JSON.stringify(samples).length<50*1024);
 assert.deepEqual(new Set(samples.samples.map(([label])=>label)),new Set(['up','down']));
 assert.deepEqual([fixture.rules,fixture.knn],[6,6]);
 // The shipped example is exactly this output (rebuild: node scripts/pose-samples.mjs --example).
 assert.deepEqual(JSON.parse(readFileSync('tests/fixtures/pose-replay/squat-synthetic.samples.json','utf8')),samples);
 assert.deepEqual(JSON.parse(readFileSync('tests/fixtures/pose-replay/squat-synthetic.replay.json','utf8')),fixture);
});
test('world landmarks recorded with the frames stay in the replay and reach the engine',()=>{
 const {fixture}=convert({...example,frames:example.frames.map(([t,p])=>[t,p,p.map(([x,y])=>[x,y,0])])},{reps:6});
 assert.ok(fixture.frames.every(frame=>frame[2]?.length===10));
 const update=MovementSession.prototype.update;let seen=0;
 MovementSession.prototype.update=function(p,t,aspect,world){if(Number.isFinite(world?.[11]?.z))seen++;return update.call(this,p,t,aspect,world);};
 try{assert.equal(replay(fixture,{samples:null}),6);}finally{MovementSession.prototype.update=update;}
 assert.equal(seen,fixture.frames.length);
});
test('k-NN counts fresh squats with jitter, dropped frames, at 1.6 updates/s and mirrored; stillness counts nothing',()=>{
 const {samples}=convert(example);
 const run=(recording,{drop=0,mirror=false}={})=>{const rnd=random(9),session=new MovementSession('squat',{samples});
  recording.frames.forEach(([t,p])=>{if(rnd()<drop)return;session.update(p.map(([x,y,visibility])=>({x:mirror?1-x:x,y,visibility})),t);});return session.count;};
 assert.equal(run(syntheticRecording({seed:21})),6);
 assert.equal(run(syntheticRecording({seed:22}),{drop:.3}),6);
 assert.equal(run(syntheticRecording({seed:23,fps:1.6,hold:1.5})),6);
 assert.equal(run(syntheticRecording({seed:24}),{mirror:true}),6);
 const still=new MovementSession('squat',{samples});for(let t=0;t<8000;t+=66)still.update(ENGINE.standing(),t);
 assert.equal(still.count,0);assert.equal(still.snapshot().calibrated,true);
});
test('only exercises with a samples file count with the k-NN',()=>{
 for(const mode of Object.keys(MOVEMENTS))assert.equal(!!new MovementSession(mode).knn,!!POSE_SAMPLES[mode]&&MOVEMENTS[mode].kind==='reps',mode);
});
// Every recording converted by scripts/pose-samples.mjs locks what the rules and the k-NN counted.
const dir='tests/fixtures/pose-replay/';
for(const name of readdirSync(dir).filter(n=>n.endsWith('.replay.json'))){
 test(`replay ${name} keeps its rule and k-NN counts`,()=>{
  const fixture=JSON.parse(readFileSync(dir+name,'utf8')),sibling=dir+name.replace('.replay.json','.samples.json');
  assert.equal(replay(fixture,{samples:null}),fixture.rules,'rules');
  const samples=existsSync(sibling)?JSON.parse(readFileSync(sibling,'utf8')):POSE_SAMPLES[fixture.exercise];
  if(samples)assert.equal(replay(fixture,{samples}),fixture.knn,'k-NN');
 });
}

test('per-frame cost of the rules and the k-NN at 1.6 and 30 updates/s',t=>{
 const {samples}=convert(example),top=LIBRARY.jack(false),bottom=LIBRARY.jack(true),standing=ENGINE.standing(),squat=ENGINE.squat();
 const cost=(mode,a,b,fps,options)=>{const session=new MovementSession(mode,options),n=3000,step=1000/fps;
  for(let i=0;i<200;i++)session.update(i%20<10?a:b,i*step);
  const start=performance.now();for(let i=200;i<200+n;i++)session.update(i%20<10?a:b,i*step);return (performance.now()-start)/n;};
 const rows=[['rules (jumping-jack)','jumping-jack',top,bottom],['legacy squat','squat',standing,squat],['k-NN squat','squat',standing,squat,{samples}]];
 for(const [label,mode,a,b,options={samples:null}] of rows)for(const fps of [1.6,30]){
  const ms=cost(mode,a,b,fps,options);t.diagnostic(`${label} at ${fps}/s: ${(ms*1000).toFixed(1)} µs per frame`);
  // A 30/s tracker has 33 ms per frame and MediaPipe's CPU inference takes far longer than this.
  assert.ok(ms<2,`${label} ${ms} ms`);
 }
});
