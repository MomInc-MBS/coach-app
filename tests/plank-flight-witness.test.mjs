import assert from 'node:assert/strict';
import test from 'node:test';
import {VEHICLES,vehicleById} from '../arcade/plank-flight/catalog.mjs';
import {FLIGHT_TUNING,advanceFlight,commandFlight,createFlight} from '../arcade/plank-flight/sim.mjs';

// Mirrors pose-input.mjs's steer bound: the player can always reach full steer
// at a comfortable mid/high plank height; low posture deliberately restricts lean.
function boundedSteer(steer,height01){
  const bound=Math.max(.18,Math.max(0,Math.min(1,height01*2)))+.15;
  return Math.max(-bound,Math.min(bound,steer));
}
function pilot(run){
  let next=run.safeRoute.find(p=>p.z>=run.distance+1.5) || run.safeRoute.at(-1);
  if(!next)return;
  const missile=run.objects.find(o=>o.type==='missile'&&o.active&&o.z-run.distance>-1&&o.z-run.distance<=o.warningLead);
  if(missile){
    const gate=run.safeRoute.find(p=>p.patternId===missile.patternId);
    const away=(gate?.x??missile.x)>=0?-1:1;
    if(missile.state==='locked'||missile.state==='launched') next={x:Math.max(-.92,Math.min(.92,missile.x+away*.72)),y:run.y};
    else if(gate) next={x:Math.max(-.92,Math.min(.92,gate.x+away*.22)),y:gate.y};
  }
  // Use only the stable, comfortable half of the height range; coordinate lean
  // only as needed. This is a delayed target controller, not an omniscient snap.
  const h=Math.max(.34,Math.min(.68,next.y));
  const steer=boundedSteer((next.x-run.x)*2.1-run.vx*1.15,h);
  return {height01:h,steer,valid:true};
}

test('10,000 seeded courses preserve continuous safe-aperture witnesses across all chassis',()=>{
  const failures=[];
  for(let seed=1;seed<=10_000;seed++){
    const vehicle=VEHICLES[(seed-1)%VEHICLES.length];
    const run=createFlight({seed,runId:`witness-${seed}`,vehicle:vehicle.id});
    // Exercise saturated late-run speed without fast-forwarding through hazard cues.
    run.distance=FLIGHT_TUNING.levelDistance*15;
    run.score=Math.floor(run.distance);
    run.nextPatternAt=run.distance+FLIGHT_TUNING.firstGateDistance;
    commandFlight(run,'start');
    const initialDistance=run.distance;
    const firstMissile=run.objects.filter(o=>o.type==='missile').sort((a,b)=>a.z-b.z)[0];
    assert.ok(firstMissile,`seed ${seed} generated a missile in the witness horizon`);
    const targetDistance=firstMissile.z+FLIGHT_TUNING.playerDepth+.5;
    advanceFlight(run,1/60,{height01:.5,steer:0,valid:true});
    assert.equal(run.speed,FLIGHT_TUNING.maxSpeed,'witness starts at saturated late-run speed');
    const coinBranches=new Set(run.objects.filter(o=>o.type==='coin').map(o=>o.pattern));
    for(const branch of ['ribbon','stair','wave','split']) assert.ok(coinBranches.has(branch),`seed ${seed} generated ${branch} coin branch`);
    let ticks=0;
    while(run.phase==='flying'&&run.distance<targetDistance&&ticks<1600){
      const input=pilot(run);
      assert.ok(input,`seed ${seed} missing waypoint`);
      assert.ok(Math.abs(input.steer)<=Math.max(.18,Math.min(1,input.height01*2))+.150001,`seed ${seed}: controller exceeds pose envelope`);
      advanceFlight(run,1/60,input); ticks++;
    }
    const missed=run.safeRoute.filter(g=>g.z<run.distance-FLIGHT_TUNING.playerDepth&&run.gateGroups.get(g.patternId)?.hit);
    const crossedMissile=run.objects.some(o=>o.type==='missile'&&o.z+FLIGHT_TUNING.playerDepth<run.distance);
    if(missed.length||run.phase!=='flying'||run.distance<targetDistance-FLIGHT_TUNING.maxSpeed/60){
      if(failures.length<30) failures.push({seed,vehicle:vehicle.id,missed:missed.map(g=>({id:g.patternId,z:g.z,x:g.x,y:g.y})),hits:run.events.filter(e=>e.type==='hit').map(e=>({id:e.entityId,kind:e.kind,tick:e.simTick,protection:e.protection})),phase:run.phase,distance:run.distance,x:run.x,y:run.y});
    }
    assert.ok(crossedMissile||run.phase!=='flying',`seed ${seed} ended before crossing a missile`);
  }
  assert.deepEqual(failures,[],`first witness failures: ${JSON.stringify(failures)}`);
});

test('high-level missile cues leave enough time for bounded comfortable control',()=>{
  const speed=FLIGHT_TUNING.maxSpeed;
  const warningSeconds=(FLIGHT_TUNING.missileWarning)/speed;
  const lockToCrossSeconds=(FLIGHT_TUNING.missileLock-FLIGHT_TUNING.missileLaunch)/speed;
  assert.ok(warningSeconds>=4.3,`warning lead shrank to ${warningSeconds.toFixed(2)}s`);
  assert.ok(lockToCrossSeconds>=.75,`launch timing shrank to ${lockToCrossSeconds.toFixed(2)}s`);
  for(const vehicle of VEHICLES){
    const xRate=FLIGHT_TUNING.baseLateralSpeed*vehicle.handling.lateral;
    const yRate=FLIGHT_TUNING.baseVerticalSpeed*vehicle.handling.vertical;
    assert.ok(xRate>0.5&&yRate>0.45,`${vehicle.id} control rates leave the comfortable envelope`);
  }
});
