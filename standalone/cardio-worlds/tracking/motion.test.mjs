import test from 'node:test';
import assert from 'node:assert/strict';
import {createMotionDriver} from './motion.mjs';
import {createWorldRun,advance,act} from '../worlds.mjs';

// Upper body only, as on a treadmill: no visible legs. Same landmark geometry as app treadmill test.
function pose(t,{bob=0,lean=0,up=false,crouch=0}={}){
  const p=Array.from({length:33},()=>({x:.5,y:.5,visibility:0})),b=bob*Math.sin(t*2.6*2*Math.PI)+crouch,lx=-.06*lean,shrug=up?.04:0;
  const set=(i,x,y)=>p[i]={x,y,visibility:1};set(0,.5+lx*1.2,.22+b);
  for(const [side,s,e,w,h] of [[1,11,13,15,23],[-1,12,14,16,24]]){const sy=.36+b-shrug-side*.045*lean;set(s,.5+lx+side*.12,sy);set(e,.5+lx+side*.16,up?sy-.12:sy+.14);set(w,.5+lx+side*.15,up?sy-.26:sy+.1);set(h,.5+side*.07,.62+b*.5);}return p;
}
test('camera landmarks drive treadmill jog, lean, jump, crouch and stop',()=>{
  const driver=createMotionDriver(),run=createWorldRun();let now=0,state,events=[];
  function feed(seconds,options){for(let i=0;i<seconds*20;i++){now+=50;state=driver.update(pose(now/1000,options),now,4/3);events.push(...state.actions);for(const a of state.actions)act(run,a);advance(run,.05,{moving:state.jogging});}return state;}
  feed(2,{});assert.ok(state.calibrated);assert.equal(state.jogging,false);
  assert.equal(run.distance,0);
  feed(2,{bob:.025});assert.equal(state.jogging,true);assert.ok(run.distance>0);
  events=[];feed(.6,{bob:.025,lean:1});assert.ok(events.includes('right'));assert.equal(run.lane,1);
  feed(1,{bob:.025});events=[];feed(.6,{bob:.025,lean:-1});assert.ok(events.includes('left'));
  feed(1,{bob:.025});events=[];feed(.6,{bob:.025,up:true});assert.ok(events.includes('jump'));assert.ok(run.jump>0);
  feed(1.5,{bob:.025});events=[];feed(.6,{bob:.025,crouch:.2});assert.ok(events.includes('slide'));assert.ok(run.slide>0);
  feed(3,{});assert.equal(state.jogging,false);
  const stoppedAt=run.distance;feed(1,{});assert.equal(run.distance,stoppedAt);
  state=driver.update(null,now+50);assert.equal(state.visible,false);assert.equal(state.jogging,false);assert.equal(driver.fresh(now+1000),false);
});
test('jogging in place counts alternating visible knees with a steady head',()=>{
  const driver=createMotionDriver();let state;
  for(let i=0;i<100;i++){
    const now=i*50,p=pose(now/1000),lift=i>35?.06*Math.sin(now/1000*Math.PI*4):0;
    p[25]={x:.57,y:.85+lift,visibility:1};p[26]={x:.43,y:.85-lift,visibility:1};
    state=driver.update(p,now,4/3);
  }
  assert.ok(state.calibrated);assert.equal(state.jogging,true);
});
