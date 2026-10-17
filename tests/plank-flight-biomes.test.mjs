import test from 'node:test';
import assert from 'node:assert/strict';
import {BIOMES,BIOME_SECONDS,PORTAL_REST_SECONDS,biomeAt} from '../arcade/plank-flight/biomes.mjs';
import {createFlight,advanceFlight,commandFlight} from '../arcade/plank-flight/sim.mjs';
import {paceAt} from '../arcade/plank-flight/pacing.mjs';

const inputFor=run=>{
 const p=paceAt(run.paceSchedule,Math.max(0,run.time-run.paceTimeOrigin-.35));
 return {valid:true,height01:p.target.y,steer:p.target.x/.8,resting:p.isRest&&p.target.y<.09&&Math.abs(p.target.x)<.09};
};
const start=options=>{const run=createFlight({seed:5,paced:true,biomes:true,...options});commandFlight(run,'start');return run;};
const inject=(run,pickup,id=pickup.id)=>run.objects.push({id,type:'biome-pickup',kind:pickup.id,active:true,z:run.distance+.1,x:run.x,y:run.y,w:.14,h:.14});

test('six original biome definitions have three sections and three distinct beneficial pickups each',()=>{
 assert.equal(BIOMES.length,6);assert.equal(new Set(BIOMES.map(b=>b.id)).size,6);
 assert.equal(new Set(BIOMES.flatMap(b=>b.pickups.map(p=>p.id))).size,18);
 for(let index=0;index<6;index++){
  const b=BIOMES[index];assert.equal(b.sections.length,3);assert.equal(b.pickups.length,3);assert.match(b.name,/MYR5|MOM Inc/);
  assert.equal(new Set(b.pickups.map(p=>p.benefit)).size,3);
  for(const pickup of b.pickups)assert.ok(['speed','magnet','shield','coins','lift'].includes(pickup.benefit));
  for(const [elapsed,section]of [[0,0],[29.99,0],[30,1],[59.99,1],[60,2],[90,2]]){
   const state=biomeAt(index,elapsed);assert.equal(state.section,section);assert.equal(state.remaining,90-elapsed);
  }
  assert.equal(biomeAt(index,30).turn.active,true);assert.equal(biomeAt(index,31).turn.active,false);
  assert.equal(biomeAt(index,60).turn.active,true);assert.equal(biomeAt(index,90,{portal:true}).turn.active,false);
 }
 assert.equal(biomeAt(6).id,BIOMES[0].id);assert.equal(biomeAt(6).cycle,1);
});

test('portal boundary is exactly90 flight seconds, allows invalid pose rest, and requires explicit minimum-rest continuation',()=>{
 const run=start();run.time=89.98;run.objects=[];run.gateGroups.clear();run.nextPaceIndex=1000;
 advanceFlight(run,.25,{valid:true,height01:0,steer:0,resting:true});
 assert.equal(run.phase,'portal');assert.equal(run.portalRest,true);assert.ok(Math.abs(run.time-BIOME_SECONDS)<1e-8);
 const snapshot={time:run.time,distance:run.distance,coins:run.coins,tick:run.simTick};
 assert.equal(commandFlight(run,'resume'),false);assert.equal(commandFlight(run,'continue-biome'),false);
 for(let i=0;i<PORTAL_REST_SECONDS;i++)advanceFlight(run,1,{valid:false});
 assert.deepEqual({time:run.time,distance:run.distance,coins:run.coins,tick:run.simTick},snapshot);
 assert.equal(run.biome.restElapsed,3);assert.equal(run.phase,'portal');
 assert.equal(commandFlight(run,'continue-biome'),true);assert.equal(run.phase,'paused');assert.equal(run.biome.id,'castle');
 assert.equal(run.biome.elapsed,0);assert.equal(run.biome.remaining,90);assert.equal(run.pace.kind,'rest');
 assert.equal(commandFlight(run,'continue-biome'),false);
 advanceFlight(run,1,{valid:false});assert.equal(run.time,snapshot.time);
 commandFlight(run,'resume');advanceFlight(run,.1,{valid:false});assert.equal(run.time,snapshot.time);
 advanceFlight(run,.1,inputFor(run));assert.ok(run.time>snapshot.time);
 assert.ok(run.biome.elapsed<.11);assert.equal(run.pace.kind,'rest');
});

test('actual speed pickup increases travelled distance but preserves every authored gate arrival second through expiry',()=>{
 const run=start();const gate=[...run.gateGroups.values()][0],arrival=gate.arrivalTime;
 // Isolate speed expiry from subsequent pickups; keep the real generated hazards.
 const strip=()=>{run.objects=run.objects.filter(o=>['zapper','laser','missile'].includes(o.type));};strip();
 inject(run,BIOMES[0].pickups[0]);advanceFlight(run,1/60,inputFor(run));
 const started=run.time,base=run.distance,until=run.biomeEffects.speedUntil;
 assert.ok(until>started);assert.equal(run.lastBiomePickup.benefit,'speed');
 for(let tick=0;tick<600&&run.time<until+.2;tick++){
  strip();advanceFlight(run,1/60,inputFor(run));
  assert.equal(run.phase,'flying',`speed witness stopped at ${run.time}`);
  if(run.time<until-1e-8)assert.equal(run.speed,20);
  if(arrival>run.time){
   const predicted=run.distance+15*(arrival-run.time)+5*Math.max(0,Math.min(arrival,until)-run.time);
   assert.ok(Math.abs(gate.z-predicted)<1e-7);assert.equal(gate.arrivalTime,arrival);
  }
 }
 assert.ok(run.time>=until+.2);
 assert.ok(Math.abs(run.distance-base-15*(run.time-started)-20)<1e-6,'four boosted seconds add20 real distance units');
 assert.equal(run.speed,15);assert.equal(run.hits,0);
});

test('all biome benefits collect once, grant no attack projectile, and never force avatar altitude',()=>{
 for(const b of BIOMES)for(const pickup of b.pickups){
  const run=start();run.objects=[];run.nextPaceIndex=1000;run.y=.4;const before=run.coins;
  inject(run,pickup);advanceFlight(run,1/60,{valid:true,height01:.4,steer:0});
  assert.ok(run.collectedIds.has(pickup.id));assert.equal(run.lastBiomePickup.id,pickup.id);
  if(pickup.benefit==='shield')assert.equal(run.shield,1);
  if(pickup.benefit==='magnet')assert.ok(run.biomeEffects.magnetUntil>run.time);
  if(pickup.benefit==='speed')assert.ok(run.biomeEffects.speedUntil>run.time);
  if(pickup.benefit==='coins')assert.equal(run.coins-before,12);
  if(pickup.benefit==='lift'){assert.equal(run.coins-before,6);assert.ok(run.biomeEffects.liftUntil>run.time);assert.equal(run.y,.4);}
  const coins=run.coins;inject(run,pickup);advanceFlight(run,1/60,{valid:true,height01:.4,steer:0});assert.equal(run.coins,coins);
  assert.ok(!run.objects.some(o=>o.type==='projectile'));
 }
});

test('biome magnet pickup attracts an otherwise missed coin and boost preserves missile cue seconds',()=>{
 const run=start();run.objects=[];run.nextPaceIndex=1000;run.y=.4;
 inject(run,BIOMES[0].pickups[2]);
 run.objects.push({id:'off-center-coin',type:'coin',active:true,x:.5,y:.4,z:.2,w:.05,h:.05,value:1});
 advanceFlight(run,1/60,{valid:true,height01:.4,steer:0});assert.ok(run.collectedIds.has('off-center-coin'));
 const boosted=start();boosted.objects=[];boosted.nextPaceIndex=1000;boosted.biomeEffects.speedUntil=10;
 const missile={id:'timed-missile',type:'missile',active:true,x:0,y:.8,w:.2,h:.18,z:60,arrivalTime:3,
  state:'approach',targetX:null,targetY:null,restSafe:true,warningLead:51,lockDistance:37.5,launchDistance:13.5};
 boosted.objects.push(missile);
 advanceFlight(boosted,1/60,inputFor(boosted));assert.equal(missile.state,'warning');
 while(boosted.time<.52)advanceFlight(boosted,1/60,inputFor(boosted));
 assert.equal(missile.state,'locked');assert.ok(missile.targetY>=.5);
 while(boosted.time<2.12)advanceFlight(boosted,1/60,inputFor(boosted));
 assert.equal(missile.state,'launched');assert.equal(boosted.hits,0);
});

test('bounded delayed pilot traverses all six90-second biomes with explicit portals and unique course identities',()=>{
 const run=start(),ids=new Set();
 for(let index=0;index<6;index++){
  assert.equal(run.biome.id,BIOMES[index].id);
  for(let tick=0;tick<5500&&run.phase==='flying';tick++)advanceFlight(run,1/60,inputFor(run));
  assert.equal(run.hits,0,`biome ${index}: time ${run.time}`);assert.equal(run.phase,'portal');
  assert.ok(Math.abs(run.time-(index+1)*90)<1e-7);
  const keys=[...run.collectedIds];for(const id of keys)if(id.includes(`:biome:${index}:`))assert.ok(!ids.has(id));
  keys.forEach(id=>ids.add(id));
  if(index<5){advanceFlight(run,1,{valid:false});advanceFlight(run,1,{});advanceFlight(run,1,{});
   assert.equal(commandFlight(run,'continue-biome'),true);commandFlight(run,'resume');}
 }
 assert.equal(run.biome.id,'asteroid');assert.equal(run.biome.nextId,'tropical');
});
