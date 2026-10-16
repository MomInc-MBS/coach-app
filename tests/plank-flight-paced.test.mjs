import test from 'node:test';
import assert from 'node:assert/strict';
import {createFlight,commandFlight,advanceFlight,PACED_FLIGHT_TUNING} from '../arcade/plank-flight/sim.mjs';
import {paceAt} from '../arcade/plank-flight/pacing.mjs';
import {VEHICLES} from '../arcade/plank-flight/catalog.mjs';

function follow(run,seconds,{delay=.25}={}){
 const until=run.time+seconds;
 while(run.phase==='flying'&&run.time<until-1e-7){
  const target=paceAt(run.paceSchedule,Math.max(0,run.time-delay));
  const {height01,steer}=target.controlTarget;
  advanceFlight(run,1/60,{height01,steer,resting:height01<.1&&Math.abs(steer)<.15,valid:true});
 }
}

test('100 seeded fast courses remain traversable through active/rest transitions across all eight chassis',()=>{
 const failures=[];
 for(let seed=1;seed<=100;seed++){
  const run=createFlight({seed,paced:true,vehicle:VEHICLES[(seed-1)%VEHICLES.length].id});commandFlight(run,'start');
  follow(run,64);
  if(run.phase!=='flying'||[...run.gateGroups.values()].some(g=>g.hit)||run.events.some(e=>e.type==='hit'))failures.push({seed,time:run.time,phase:run.phase,x:run.x,y:run.y,pace:run.pace,hits:run.events.filter(e=>['hit','crash'].includes(e.type))});
  assert.equal(run.speed,PACED_FLIGHT_TUNING.speed);
  const restShare=run.observedRestSeconds/run.observedControlSeconds;
  assert.ok(restShare>=.4&&restShare<=.6,`seed${seed}: estimated rest share ${restShare}`);
 }
 assert.deepEqual(failures,[]);
});

test('paced course targets line up with time and coins remain collectible while chest-down',()=>{
 const run=createFlight({seed:17,paced:true});commandFlight(run,'headstart',{distance:24});commandFlight(run,'start');
 for(const group of run.gateGroups.values()){
  const at=(group.z-run.paceOrigin)/run.speed;
  const segment=paceAt(run.paceSchedule,at).segment;
  assert.equal(group.paceIndex,segment.index);assert.ok(Math.abs(group.safePoint.y-segment.target.y)<.05);
 }
 follow(run,3.3);assert.ok(run.coins>0);assert.equal(run.pace.kind,'rest');assert.equal(run.hits,0);
});

test('pause freezes posture countdown and final-blast/revive preserve future course timing',()=>{
 const run=createFlight({seed:8,paced:true});commandFlight(run,'start');follow(run,10);
 commandFlight(run,'pause');const before=structuredClone(run.pace),time=run.time;
 advanceFlight(run,.1,{height01:0,steer:0,resting:true,valid:true});assert.equal(run.time,time);assert.deepEqual(run.pace,before);
 commandFlight(run,'resume');follow(run,.3);
 const origin=run.paceOrigin,objects=new Map(run.objects.map(o=>[o.id,o.z]));run.phase='crashed';commandFlight(run,'final-blast',{distance:30});
 assert.equal(run.paceOrigin,origin+30);for(const o of run.objects)assert.equal(o.z,objects.get(o.id)+30);
 const phase=structuredClone(run.pace);commandFlight(run,'revive');assert.deepEqual(run.pace,phase);follow(run,10);assert.equal(run.phase,'flying');
});

test('rest-safe missiles warn early and never lock onto the floor lane',()=>{
 const run=createFlight({seed:9,paced:true});commandFlight(run,'start');
 const missile=run.objects.find(o=>o.restSafe);assert.ok(missile);assert.ok(missile.warningLead/run.speed>=3);
 run.distance=missile.z-missile.lockDistance+.01;run.y=0;run.x=0;
 advanceFlight(run,1/60,{height01:0,steer:0,resting:true,valid:true});
 assert.ok(missile.targetY>=.5);
});

test('accepted slow frame cadence does not stretch three-to-five-second posture cues',()=>{
 const run=createFlight({seed:11,paced:true});commandFlight(run,'start');
 for(let i=0;i<80;i++){
  const p=paceAt(run.paceSchedule,Math.max(0,run.time-.25));
  advanceFlight(run,.25,{...p.controlTarget,resting:p.modeledRest,valid:true});
  assert.equal(run.phase,'flying');
 }
 assert.ok(Math.abs(run.time-20)<1e-6);assert.ok(Math.abs(run.distance-300)<1e-5);
});
