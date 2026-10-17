import test from 'node:test';
import assert from 'node:assert/strict';
import {createFlight,commandFlight,advanceFlight,PACED_FLIGHT_TUNING} from '../arcade/plank-flight/sim.mjs';
import {paceAt,segmentAt} from '../arcade/plank-flight/pacing.mjs';
import {VEHICLES} from '../arcade/plank-flight/catalog.mjs';

// Synthetic delayed schedule follower: modeled controls, not physical validation.
const controlAt=(run,delay=.35)=>{
 const p=paceAt(run.paceSchedule,Math.max(0,run.time-delay));
 return {valid:true,height01:p.target.y,steer:p.target.x/.8,
  resting:p.isRest&&p.target.y<=.09&&Math.abs(p.target.x)<.09};
};

test('bounded delayed paced pilot clears gates and rest-safe missiles across every chassis',()=>{
 for(const vehicle of [null,...VEHICLES.map(v=>v.id)])for(let seed=1;seed<=8;seed++){
  const run=createFlight({seed,vehicle,paced:true,runId:`paced-review-${vehicle}-${seed}`});
  commandFlight(run,'start');
  for(let tick=0;tick<60*60;tick++){
   const input=controlAt(run);
   assert.ok(Math.abs(input.steer)<=1);
   advanceFlight(run,1/60,input);
   assert.equal(run.hits,0,`${vehicle}/${seed}: hit at ${run.time.toFixed(3)}s, ${run.pace.kind}, x=${run.x},y=${run.y}`);
   assert.equal(run.phase,'flying');
  }
 }
});

test('paced utility distance jumps preserve gate-time origin and all already generated spatial references',()=>{
 const run=createFlight({seed:7,paced:true,runId:'paced-review-utilities'});
 commandFlight(run,'headstart',{distance:24});commandFlight(run,'start');
 const first=run.gateGroups.values().next().value;
 assert.ok(Math.abs(first.z-(24+(segmentAt(run.paceSchedule,0).end-PACED_FLIGHT_TUNING.gateLeadSeconds)*PACED_FLIGHT_TUNING.speed))<1e-8);
 for(let i=0;i<60;i++)advanceFlight(run,1/60,controlAt(run));
 const objects=run.objects.map(o=>[o.id,o.z]),groups=[...run.gateGroups].map(([id,g])=>[id,g.z]);
 const points=run.safeRoute.map(p=>[p.patternId,p.z]),time=run.time,origin=run.paceOrigin,distance=run.distance;
 run.phase='crashed';commandFlight(run,'final-blast',{distance:30});
 assert.equal(run.time,time);assert.equal(run.distance,distance+30);assert.equal(run.paceOrigin,origin+30);
 for(const[id,z]of objects)assert.equal(run.objects.find(o=>o.id===id).z,z+30);
 for(const[id,z]of groups)assert.equal(run.gateGroups.get(id).z,z+30);
 for(const[id,z]of points)assert.equal(run.safeRoute.find(p=>p.patternId===id).z,z+30);
 commandFlight(run,'revive');assert.equal(run.time,time);
 for(let i=0;i<60*12;i++)advanceFlight(run,1/60,controlAt(run));
 assert.equal(run.hits,0);assert.equal(run.phase,'flying');
});

test('each authored active interval ends within five simulation seconds and is followed by rest',()=>{
 for(let seed=1;seed<=32;seed++){
  const run=createFlight({seed,paced:true});
  for(let index=1;index<32;index+=2){
   const active=segmentAt(run.paceSchedule,index),rest=segmentAt(run.paceSchedule,index+1);
   assert.ok(active.duration<=5);assert.equal(rest.kind,'rest');assert.equal(rest.start,active.end);
   assert.equal(paceAt(run.paceSchedule,active.end+1e-8).isRest,true);
  }
 }
});
