import test from 'node:test';
import assert from 'node:assert/strict';
import {createThrows,createStriker,THROW} from '../arcade/runner/throws.mjs';

// Straight-on screen model for the test: an object at distance d draws at the centre, radius grows as it nears.
const screen=o=>({x:.5*375/812+o.x*.05,y:.5,r:o.r/Math.max(.5,o.d)*.6});

test('the coach throws on a cadence and junk flies straight at the runner, then past',()=>{
  const ev=[],T=createThrows({seed:4,onEvent:(t)=>ev.push(t)});
  for(let i=0;i<40*12;i++)T.step(1/40,4);
  assert.ok(ev.filter(t=>t==='throw').length>=3,'throws');assert.ok(ev.includes('miss'),'unhit junk passes the camera');
  const o=T.spawn();const d0=o.d;T.step(.1,4,false);assert.ok(o.d<d0,'comes toward the camera');
});

test('a fast punch explodes, a looping swing slices; each hit is a small bonus; slow or far limbs do nothing',()=>{
  const xp=[],T=createThrows({seed:2,onEvent:(t,d)=>{if(t==='bonus')xp.push(d.xp);}});
  const o=T.spawn();o.x=0;
  const a={x:.1,y:.5},b={x:.4,y:.5};
  assert.equal(T.strike(a,b,'explode',screen),0,'too far down the hall to reach');
  o.d=3;assert.equal(T.strike(a,b,'explode',screen),1);assert.deepEqual(xp,[THROW.xp]);assert.equal(T.objects.length,0);
  // The striker turns pose frames into segments with the camera-slice speed gate and pathKind.
  const strike=createStriker(),view={width:375,height:812},pts=(x,y)=>Array.from({length:33},(_,i)=>i===16?{x,y,visibility:1}:{x:.5,y:.5,visibility:0});
  const send=(x,y,t)=>strike({points:pts(x,y),now:t,width:480,height:640,mirrored:true},view);
  assert.deepEqual(send(.3,.5,0),[]);assert.deepEqual(send(.31,.5,500),[],'slow drift is not a strike');
  const fast=send(.6,.5,600);assert.equal(fast.length,1);assert.equal(fast[0].kind,'explode','straight punch');
  const s2=createStriker();let segs=[];[[.3,.5],[.4,.35],[.55,.3],[.65,.42],[.6,.58],[.45,.62]].forEach(([x,y],i)=>{segs=s2({points:pts(x,y),now:i*50,width:480,height:640,mirrored:true},view);});
  assert.equal(segs.at(-1)?.kind,'slice','looping swing');
});

test('Cool Cardio throws spawn and ramp with course level; an unhit one becomes a stumble',async()=>{
  const {EXERCISES}=await import('../exercise-library.mjs'),R=await import('../arcade/runner/maze-run.mjs'),{throwEvery,throwSpeed}=await import('../arcade/runner/throws.mjs');
  assert.ok(EXERCISES.jogging.runner,'the runner (and its throws) mount for Cool Cardio');
  const count=level=>{const T=createThrows({seed:9});for(let i=0;i<40*60;i++)T.step(1/40,0,true,level);return T.thrown;};
  assert.ok(count(0)>=15,'throws keep coming: '+count(0));assert.ok(count(12)>count(0)*1.5,'faster cadence later: '+count(0)+' vs '+count(12));
  assert.ok(throwEvery(12)<throwEvery(0)&&throwSpeed(12)>throwSpeed(0));
  const run=Object.assign(R.createRun(1),{jogging:true}),T=createThrows({seed:3,onEvent:t=>{if(t==='miss')R.stumble(run,{type:'throw'});}});
  T.spawn();for(let i=0;i<40*8;i++)T.step(1/40,R.runSpeed(run),false,0);
  assert.equal(run.hits,1);assert.equal(run.status,'running');
});
