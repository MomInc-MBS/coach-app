import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {indexedDB, IDBDatabase} from 'fake-indexeddb';
import {MovementSession} from '../movement-engine.mjs';
import {PerformanceWorkout} from '../pod/performance-workout.mjs';
import {openFlightWallet} from '../arcade/plank-flight/economy.mjs';
import {PLANK_TUNING} from '../arcade/plank-flight/pose-input.mjs';

// Only rendering is replaced: lifecycle, sim, wallet and movement/credit modules
// are the actual production code. These tests do not validate cameras or WebGL.
const viewUrl=new URL('../arcade/plank-flight/view.mjs',import.meta.url).href;
const hook=registerHooks({load(url,ctx,next){return url===viewUrl
  ?{format:'module',source:'export function mountFlightView(){return {render(){},stop(){}}}',shortCircuit:true}
  :next(url,ctx);}});
const {mountPlankFlight}=await import('../arcade/plank-flight/flight.mjs');
hook.deregister();

const CALIBRATION=[{y:.38},{y:.60},{y:.38,lean:.065},{y:.38,lean:-.065},{y:.49},{y:.49,lean:.055},{y:.49,lean:-.055},{y:.78}];
function pose({y=.38,lean=0,hips=true}={}){
 const points=Array.from({length:33},()=>({x:.5,y:.5,visibility:.99}));
 const world=Array.from({length:33},()=>({x:0,y:0,z:0}));
 for(const[s,e,w,h,k,sign]of[[11,13,15,23,25,1],[12,14,16,24,26,-1]]){
  points[s]={x:.5+sign*.12+lean,y,visibility:.99};points[e]={x:.5+sign*.17,y:(y+.78)/2,visibility:.99};points[w]={x:.5+sign*.18,y:.78,visibility:.99};
  points[h]={x:.5+sign*.07,y:y-.1,visibility:hips?.99:.1};points[k]={x:.5+sign*.035,y:y-.18,visibility:hips?.99:.1};
  world[s]={x:sign*.2,y:-.3,z:-.5};world[e]={x:sign*.24,y:-.15,z:-.52};world[w]={x:sign*.27,y:0,z:-.55};world[h]={x:sign*.16,y:-.3,z:0};world[k]={x:sign*.13,y:-.3,z:.45};
 }return{points,world};
}
function pipeline(){
 const session=new MovementSession('plank-flight'),workout=new PerformanceWorkout({mode:'plank-flight',kind:'hold',difficulty:'easy'});let time=0;
 return{session,workout,get time(){return time},tick(spec={},allowed=true,gap=100){time+=gap;session.flightAllowed=allowed;const p=spec===null?{points:null,world:null}:pose(spec);const m=session.update(p.points,time,1,p.world);workout.update(m,1700000000000+time);return m;},
  feed(spec={},count=10,allowed=true){let m;for(let i=0;i<count;i++)m=this.tick(spec,allowed);return m;},
  calibrate(){for(const spec of CALIBRATION)this.feed(spec,8,false);assert.equal(session.flightInput.calibrated,true);assert.equal(workout.activeSeconds,0);},
 };
}
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);

test('real MovementSession feeds only accepted active hold time into PerformanceWorkout',()=>{
 const p=pipeline();p.calibrate();p.feed({},200);
 assert.ok(p.workout.activeSeconds>19&&p.workout.activeSeconds<20);
 close(p.workout.activeSeconds,p.session.totalHold);close(p.workout.continuousSeconds,p.session.hold);
 assert.equal(p.session.count,0);assert.ok(p.workout.xpBase>0);
 const saved=p.workout.finish();assert.equal(saved.mode,'plank-flight');close(saved.activeSeconds,p.session.totalHold);
 assert.equal(p.workout.finish(),null,'completion is not repeated');
});

test('manual pause, crash and countdown permission boundaries preserve earned credit without accrual',()=>{
 const p=pipeline();p.calibrate();p.feed({},200);const earned=p.workout.activeSeconds,continuous=p.workout.maxContinuousSeconds;
 for(const reason of ['manual pause','crash','countdown']){
  p.feed({},30,false);close(p.workout.activeSeconds,earned);assert.equal(p.session.hold,0,reason);
 }
 assert.equal(p.workout.paused,true);p.feed({},20,true);
 assert.ok(p.workout.activeSeconds>earned+1.8);assert.ok(p.workout.continuousSeconds<2.1);
 close(p.workout.maxContinuousSeconds,continuous);
});

test('dropout and long frame gap add no catch-up seconds to the actual workout',()=>{
 const p=pipeline();p.calibrate();p.feed({},70);let earned=p.workout.activeSeconds;
 p.feed(null,15);close(p.workout.activeSeconds,earned);assert.equal(p.session.tracking,false);
 p.feed({},10);assert.ok(p.workout.activeSeconds>earned);earned=p.workout.activeSeconds;
 p.tick({},true,1200);close(p.workout.activeSeconds,earned);assert.equal(p.session.hold,0);
 p.tick();close(p.workout.activeSeconds,earned);
 p.tick({},true,3000);assert.equal(p.session.flightInput.calibrated,false);close(p.workout.activeSeconds,earned);
});

test('control rehearsal with hidden torso never earns fitness time',()=>{
 const p=pipeline();p.calibrate();const m=p.feed({hips:false},220);
 assert.equal(m.flightPose.controlValid,true);assert.equal(m.flightPose.exerciseEligible,false);
 assert.equal(p.workout.activeSeconds,0);assert.equal(p.workout.xpBase,0);assert.equal(p.workout.finish(),null);
});

test('new session reset erases calibration and prevents old movement evidence becoming new credit',()=>{
 const p=pipeline();p.calibrate();p.feed({},100);const old=p.session.flightInput;
 p.session.reset('plank-flight');assert.notEqual(p.session.flightInput,old);assert.equal(p.session.flightAllowed,false);
 const n=pose();const first=p.session.update(n.points,p.time+100,1,n.world);
 assert.equal(first.totalHold,0);assert.equal(first.flightPose.calibrated,false);assert.equal(first.tracking,false);
});

test('nonfinite timestamps never escape through MovementSession into workout counters',()=>{
 const p=pipeline();p.calibrate();p.feed({},10);const n=pose(),earned=p.workout.activeSeconds;
 for(const time of [NaN,Infinity]){
  const m=p.session.update(n.points,time,1,n.world);
  for(const key of ['elapsed','hold','totalHold','active'])assert.ok(Number.isFinite(m[key]),`${key} must stay finite`);
  p.workout.update(m,1700000010000);close(p.workout.activeSeconds,earned);assert.equal(m.tracking,false);
 }
});

test('existing side-on push-ups retain ordinary calibration and repetition counting',()=>{
 const session=new MovementSession('pushup',{samples:null});let now=0;
 const side=down=>{const p=pose().points;for(const[s,e,w,h,k,d]of[[11,13,15,23,25,0],[12,14,16,24,26,.025]]){
  p[s]={x:down?.15:.25,y:(down?.60:.45)+d,visibility:1};p[e]={x:down?.27:.25,y:(down?.65:.59)+d,visibility:1};p[w]={x:.25,y:.78+d,visibility:1};p[h]={x:.53,y:(down?.56:.5)+d,visibility:1};p[k]={x:.67,y:.52+d,visibility:1};}return p;};
 const feed=(shape,count)=>{for(let i=0;i<count;i++){now+=50;session.update(shape,now,1);}};
 feed(side(false),28);assert.ok(session.base);for(let i=0;i<3;i++){feed(side(true),12);feed(side(false),12);}
 assert.equal(session.count,3);assert.equal(session.flightInput,null);assert.equal('flightPose' in session.snapshot(),false);
});

test('early arcade finish saves device coins while fitness stays below its original save threshold',async()=>{
 const p=pipeline();p.calibrate();p.feed({},50);assert.equal(p.workout.finish(),null);
 const wallet=await openFlightWallet({owner:'guest:early',indexedDB,name:'audit-'+crypto.randomUUID()});
 try{await wallet.record('early',[{id:'one',type:'coin',amount:3}]);await wallet.finish('early',4);
  assert.equal((await wallet.read()).balance,3);assert.equal(p.workout.activeSeconds,p.session.totalHold);
 }finally{wallet.close();}
});

async function runtimeHarness(body){
 const keys=['performance','document','requestAnimationFrame','cancelAnimationFrame','indexedDB'];
 const before=new Map(keys.map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));let clock=0,id=0;
 const frames=new Map();
 const replacements={performance:{now:()=>clock},document:{hidden:false},indexedDB,
  requestAnimationFrame:fn=>{frames.set(++id,fn);return id;},cancelAnimationFrame:rid=>frames.delete(rid)};
 for(const key of keys)Object.defineProperty(globalThis,key,{value:replacements[key],configurable:true,writable:true});
 let selected='guest:audit-'+crypto.randomUUID(),exits=0;const original=selected;
 const runtime=mountPlankFlight({host:{},ownerId:original,owner:()=>selected,onExit:()=>{exits++;}});
 const step=ms=>{clock+=ms;const callbacks=[...frames.values()];frames.clear();for(const fn of callbacks)fn(clock);};
 const flush=async()=>{await runtime.settled;await new Promise(resolve=>setImmediate(resolve));};
 try{await body({runtime,step,flush,original,switchOwner:()=>{selected='guest:other-'+crypto.randomUUID();},get exits(){return exits;},get clock(){return clock;}});}
 finally{runtime.stop();await flush();for(const key of keys){const descriptor=before.get(key);if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}}
}
const accepted={height01:.5,steer:0,controlValid:true,exerciseEligible:true,calibrated:true,prompt:'ready'};

test('a stale exit save cannot finish another workout or owner session',async()=>{
 await runtimeHarness(async h=>{h.runtime.action('exit');h.runtime.stop();await h.flush();assert.equal(h.exits,0);});
 await runtimeHarness(async h=>{h.runtime.action('exit');h.switchOwner();await h.flush();assert.equal(h.exits,0);});
 await runtimeHarness(async h=>{h.runtime.action('exit');await h.flush();assert.equal(h.exits,1);});
});

test('calibrated chest-down recovery preserves earned workout time without adding hold credit',()=>{
 const p=pipeline();p.calibrate();p.feed({y:.49},30);const earned=p.workout.activeSeconds;
 const rest=p.feed({y:.78},45);assert.equal(rest.flightPose.resting,true);assert.equal(rest.flightPose.controlValid,true);
 assert.equal(rest.flightPose.exerciseEligible,false);close(p.workout.activeSeconds,earned);assert.equal(p.session.hold,0);
 p.feed({y:.49},20);assert.ok(p.workout.activeSeconds>earned+1);
});

test('runtime freshness, hidden tab and manual pause independently prohibit workout credit',async()=>{
 await runtimeHarness(async({runtime,step})=>{
  const fresh=()=>runtime.pose({flightPose:accepted});fresh();step(1);
  for(let i=0;i<31;i++){fresh();step(100);}assert.equal(runtime.run.phase,'flying');assert.equal(runtime.creditAllowed,true);
  globalThis.document.hidden=true;assert.equal(runtime.creditAllowed,false);step(1);assert.equal(runtime.run.phase,'paused');
  globalThis.document.hidden=false;fresh();step(1);assert.equal(runtime.creditAllowed,false,'recovery countdown');
  runtime.action('pause');for(let i=0;i<40;i++){fresh();step(100);}assert.equal(runtime.creditAllowed,false);assert.equal(runtime.run.phase,'paused');
  runtime.action('resume');for(let i=0;i<31;i++){fresh();step(100);}assert.equal(runtime.creditAllowed,true);
  step(PLANK_TUNING.freshnessMs+1);assert.equal(runtime.creditAllowed,false);assert.equal(runtime.run.phase,'paused');
 });
});

test('normal runtime uses paced flight and keeps flying during real recovery evidence without workout permission',async()=>{
 await runtimeHarness(async({runtime,step})=>{
  assert.equal(runtime.run.paced,true);const rest={...accepted,height01:0,resting:true,posture:'rest',exerciseEligible:false};
  for(let i=0;i<33;i++){runtime.pose({flightPose:rest});step(100);}
  assert.equal(runtime.run.phase,'flying');const distance=runtime.run.distance;
  for(let i=0;i<10;i++){runtime.pose({flightPose:rest});step(100);}
  assert.equal(runtime.run.phase,'flying');assert.ok(runtime.run.distance>distance+14);assert.equal(runtime.creditAllowed,false);
 });
});

test('runtime stop drains accepted reward events before closing its database',async()=>{
 await runtimeHarness(async({runtime,step,flush,original})=>{
  runtime.run.events.push({type:'coin',id:'accepted-before-stop',amount:7});step(1);runtime.stop();await flush();
  const reopened=await openFlightWallet({owner:original,indexedDB});try{const state=await reopened.read();assert.equal(state.balance,7);assert.equal(state.runs[runtime.run.runId].finalized,true);}finally{reopened.close();}
 });
});

test('owner switch preserves already accepted rewards in their captured owner wallet',async()=>{
 await runtimeHarness(async({runtime,step,flush,original,switchOwner})=>{
  runtime.run.events.push({type:'coin',id:'before-account-change',amount:7});step(1);switchOwner();runtime.stop();await flush();
  const reopened=await openFlightWallet({owner:original,indexedDB});try{assert.equal((await reopened.read()).balance,7);}finally{reopened.close();}
 });
});

test('queued post-run token reward remains bound to that run across an immediate restart',async()=>{
 await runtimeHarness(async({runtime,step,flush,original})=>{
  runtime.run.events.push({type:'token',id:'token-before-restart',amount:1});step(1);runtime.action('finish');await flush();const completedId=runtime.run.runId;
  runtime.action('spin');runtime.action('restart');await flush();
  const reopened=await openFlightWallet({owner:original,indexedDB});try{const state=await reopened.read();assert.equal(state.runs[completedId].spun,true);assert.equal(state.balance,25);}finally{reopened.close();}
 });
});

test('a failed reward write is retried before run finalization and never counted twice',async t=>{
 await runtimeHarness(async({runtime,step,flush,original})=>{
  // Await actual wallet initialization before injecting a record-write failure.
  runtime.action('finish');await flush();runtime.action('restart');const rid=runtime.run.runId;
  const transaction=IDBDatabase.prototype.transaction;let rejectNext=true;
  const patched=t.mock.method(IDBDatabase.prototype,'transaction',function(...args){
   if(rejectNext){rejectNext=false;throw Error('Injected transient storage interruption.');}
   return transaction.apply(this,args);
  });
  try{
   runtime.run.events.push({type:'coin',id:'retry-this-reward',amount:9});step(1);await flush();
   const before=await openFlightWallet({owner:original,indexedDB});try{assert.equal((await before.read()).balance,0);}finally{before.close();}
   runtime.action('finish');await flush();runtime.action('retry-save');await flush();
   const after=await openFlightWallet({owner:original,indexedDB});try{
    const state=await after.read();assert.equal(state.balance,9);assert.equal(state.runs[rid].finalized,true);
    assert.equal(Object.keys(state.runs[rid].events).length,1);
   }finally{after.close();}
  }finally{patched.mock.restore();}
 });
});
