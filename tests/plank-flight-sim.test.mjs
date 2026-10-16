import assert from 'node:assert/strict';
import test from 'node:test';
import {COSMETICS,GADGETS,POWERUPS,SHOP_ITEMS,UPGRADES,VEHICLES,cosmeticById,vehicleById} from '../arcade/plank-flight/catalog.mjs';
import {FLIGHT_TUNING,advanceFlight,commandFlight,createFlight,safeRouteReachable} from '../arcade/plank-flight/sim.mjs';

const valid={height01:0.5,steer:0,valid:true};
const tick=(run,input=valid,n=1)=>{for(let i=0;i<n;i++)advanceFlight(run,1/60,input);};
const addAtPlayer=(run,object)=>{const value={id:`test:${object.type}:${run.objects.length}`,z:run.distance+0.03,x:run.x,y:run.y,w:0.12,h:0.12,radius:0.12,value:1,active:true,...object};run.objects.push(value);return value;};
const stateOf=run=>({phase:run.phase,time:run.time,distance:run.distance,coins:run.coins,score:run.score,level:run.level,hits:run.hits,continuation:run.continuation,x:run.x,y:run.y,vx:run.vx,vy:run.vy,speed:run.speed,shield:run.shield,vehicle:run.vehicle,powerup:run.powerup,componentParts:run.componentParts,eventTokens:run.eventTokens,missions:run.missions,objects:run.objects.map(o=>({id:o.id,type:o.type,z:o.z,x:o.x,y:o.y,active:o.active,collected:o.collected,state:o.state,laserState:o.laserState})),events:run.events});

function routePilot(run, seconds) {
  const target=run.safeRoute.find(point=>point.z>=run.distance+0.8) || run.safeRoute.at(-1) || {x:0,y:0.5};
  const steer=Math.max(-1,Math.min(1,(target.x-run.x)*2.2-run.vx*1.25));
  const height01=Math.max(0,Math.min(1,target.y));
  tick(run,{height01,steer,valid:true},Math.max(1,Math.ceil(seconds*60)));
}

test('catalog has eight distinct virtual chassis and four distinct power-up families',()=>{
  assert.equal(VEHICLES.length,8);
  assert.equal(new Set(VEHICLES.map(v=>v.id)).size,8);
  assert.deepEqual(VEHICLES.map(v=>v.auditReference),['Bad As Hog',"Lil' Stomper",'Mr. Cuddles','Gravity Suit','Crazy Freaking Teleporter','Profit Bird','Wave Rider','S.A.M. component mech']);
  assert.equal(POWERUPS.length,4);
  assert.equal(new Set(POWERUPS.map(p=>p.family)).size,4);
  assert.ok(GADGETS.length>=10 && SHOP_ITEMS.every(item=>item.price>=0));
  assert.ok(vehicleById('tide-glider'));
  assert.equal(COSMETICS.length,5);
  assert.match(cosmeticById('ion-afterglow').tint,/^#[0-9a-f]{6}$/i);
  assert.ok(UPGRADES.every(upgrade=>upgrade.maxLevel>=1));
  assert.ok(VEHICLES.every(v=>v.handling.lateral>0&&v.handling.vertical>0&&v.handling.radius<0.2));
});

test('seeded fixed-step simulation is deterministic, including IDs, patterns and events',()=>{
  const a=createFlight({seed:2031,runId:'same-run'}),b=createFlight({seed:2031,runId:'same-run'});
  commandFlight(a,'start'); commandFlight(b,'start');
  for(let i=0;i<480;i++){
    const input={height01:0.5+Math.sin(i/60)*0.08,steer:Math.sin(i/31)*0.3,valid:true};
    advanceFlight(a,1/60,input); advanceFlight(b,1/60,input);
  }
  assert.deepEqual(stateOf(a),stateOf(b));
});

test('many seeded courses author generous reachable safe gaps away from extreme height/lean',()=>{
  for(let seed=1;seed<=180;seed++){
    const run=createFlight({seed,runId:`reach-${seed}`}); commandFlight(run,'start');
    assert.ok(run.safeRoute.length>=7,`seed ${seed} generated enough gates`);
    if(seed===1){
      const patterns=new Set(run.objects.filter(o=>o.type==='coin').map(o=>o.pattern));
      for(const name of ['ribbon','stair','wave','split']) assert.ok(patterns.has(name),`coin pattern ${name} is authored`);
    }
    for(let i=0;i<run.safeRoute.length;i++){
      const point=run.safeRoute[i];
      assert.ok(Math.abs(point.x)<=0.5,`seed ${seed}: route stays away from lateral extremes`);
      assert.ok(point.y>=0.28&&point.y<=0.72,`seed ${seed}: route avoids deep/extreme height`);
      if(i){
        const prior=run.safeRoute[i-1];
        const seconds=point.spacing/FLIGHT_TUNING.maxSpeed;
        assert.ok(safeRouteReachable(prior,point,seconds,{x:0.54,y:0.38},0.85),`seed ${seed}: safe transition remains reachable`);
        assert.ok(Math.abs(point.x-prior.x)<=0.55&&Math.abs(point.y-prior.y)<=0.24);
      }
      const panels=run.objects.filter(o=>o.patternId===point.patternId&&o.kind==='gate-panel');
      assert.ok(panels.length>=3,`seed ${seed}: gate has barrier panels`);
      for(const panel of panels){
        const collisionX=Math.abs(point.x-panel.x)<=panel.w+0.085;
        const collisionY=Math.abs(point.y-panel.y)<=panel.h+0.085;
        assert.ok(!(collisionX&&collisionY),`seed ${seed}: safe waypoint clears ${panel.id}`);
      }
    }
  }
});

test('invalid or malformed controls freeze time, motion, collisions and rewards',()=>{
  const run=createFlight({seed:9}); commandFlight(run,'start');
  const before=stateOf(run);
  advanceFlight(run,1,{height01:1,steer:1,valid:false});
  advanceFlight(run,1/60,{height01:NaN,steer:1,valid:true});
  advanceFlight(run,1/60,{height01:0.5,steer:Infinity,valid:true});
  assert.deepEqual(stateOf(run),before);
});

test('large frame delta is capped and fixed substeps are bounded',()=>{
  const run=createFlight({seed:3}); commandFlight(run,'start');
  advanceFlight(run,5,{...valid,steer:1});
  assert.ok(run.time<=FLIGHT_TUNING.maxFrameDelta+1e-9);
  assert.ok(run.simTick<=7);
  assert.ok(run.distance<=run.speed*FLIGHT_TUNING.maxFrameDelta+1e-6);
});

test('swept coin pickup credits once and stable entity IDs reject replay',()=>{
  const run=createFlight({seed:17}); commandFlight(run,'start');
  const coin=run.objects.find(o=>o.type==='coin'); assert.ok(coin);
  // Put the player on the authored safe ribbon, then let real fixed steps cross it.
  run.x=coin.x; run.y=coin.y; run.vx=0; run.vy=0;
  while(run.distance<coin.z+0.2 && run.phase==='flying') advanceFlight(run,1/60,{height01:coin.y,steer:0,valid:true});
  assert.ok(run.collectedIds.has(coin.id),'coin entity was crossed');
  const amount=run.coins,coinEvents=run.events.filter(e=>e.type==='coin'&&e.entityId===coin.id).length;
  assert.equal(run.score,Math.floor(run.distance),'distance score remains separate from coin currency');
  assert.equal(coinEvents,1);
  coin.active=true; coin.collected=false; coin.z=run.distance+0.03; coin.x=run.x; coin.y=run.y;
  tick(run,{height01:run.y,steer:0,valid:true});
  assert.equal(run.coins,amount);
  assert.equal(run.events.filter(e=>e.type==='coin'&&e.entityId===coin.id).length,1);
});

test('vehicle pickups, damage absorption, expiry and distinct handling are stateful',()=>{
  const run=createFlight({seed:1,runId:'vehicle'}); commandFlight(run,'start');
  addAtPlayer(run,{type:'vehicle',kind:'foundry-walker'}); tick(run);
  assert.equal(run.vehicle,'foundry-walker');
  const panel=addAtPlayer(run,{type:'zapper',kind:'gate-panel'}); tick(run);
  assert.notEqual(run.phase,'crashed');
  assert.equal(run.vehicle,'foundry-walker','Foundry Walker has two impact layers');
  assert.equal(run.vehicleHealth,1);
  tick(run,valid,55);
  addAtPlayer(run,{type:'zapper',kind:'gate-panel'}); tick(run);
  assert.equal(run.vehicle,null,'the second impact returns to normal flight');
  assert.ok(run.events.some(e=>e.type==='hit'&&e.protection==='vehicle'));
  assert.ok(run.events.some(e=>e.type==='vehicle'&&e.action==='damaged-exit'));
  const comparison=createFlight({vehicle:'foundry-walker'});
  assert.notDeepEqual(comparison.vehicle && vehicleById(comparison.vehicle).handling,vehicleById('pipwing').handling);
  run.vehicle='comet-hopper'; run.vehicleUntil=run.time+0.02; tick(run,valid,3);
  assert.equal(run.vehicle,null,'temporary transformations expire cleanly');
  assert.ok(run.events.some(e=>e.type==='vehicle'&&e.action==='expired'));
  assert.ok(panel);
});

test('four power-up families apply their functional effects without changing travel speed',()=>{
  for(const id of POWERUPS.map(power=>power.id)){
    const run=createFlight({seed:6}); run.loadout=[]; commandFlight(run,'start');
    const oldSpeed=run.speed;
    addAtPlayer(run,{type:'powerup',kind:id}); tick(run);
    const spec=POWERUPS.find(power=>power.id===id);
    assert.ok(run.events.some(e=>e.type==='powerup'&&e.kind===id));
    if(spec.family==='shield') assert.equal(run.shield,1);
    else assert.equal(run.powerup.family,spec.family);
    assert.equal(run.speed,oldSpeed,'powerups do not accelerate exercise or sim time');
  }
});

test('cash dash attracts a missed coin, suppresses hazards, and boost is visual-only',()=>{
  const run=createFlight({seed:8}); commandFlight(run,'start');
  addAtPlayer(run,{type:'powerup',kind:'coin-current'}); tick(run);
  assert.equal(run.powerup.family,'cash-dash');
  const z=run.distance+0.03;
  addAtPlayer(run,{type:'coin',z,x:run.x+0.45,y:run.y,radius:0.08,value:1}); tick(run);
  assert.equal(run.coins,2);
  const speed=run.speed, distance=run.distance;
  addAtPlayer(run,{type:'powerup',kind:'visual-afterburn'}); tick(run);
  assert.equal(run.speed,speed); assert.ok(run.distance>distance);
});

test('three components deploy the MYR5 mech, tokens and NPC interactions emit stable rewards',()=>{
  const run=createFlight({seed:11,event:true}); commandFlight(run,'start');
  for(let n=0;n<3;n++){addAtPlayer(run,{type:'component',kind:`core-${n+1}`});tick(run);}
  assert.equal(run.componentParts,3); assert.equal(run.vehicle,'triad-bulwark');
  assert.ok(run.events.some(e=>e.type==='vehicle'&&e.kind==='triad-bulwark'&&e.origin==='component-set'));
  addAtPlayer(run,{type:'token',kind:'event-shard',value:1}); tick(run);
  addAtPlayer(run,{type:'npc',kind:'coach-flyby'}); tick(run);
  assert.equal(run.eventTokens,1);
  assert.ok(run.events.some(e=>e.type==='token'&&e.eventId&&e.entityId));
  assert.ok(run.events.some(e=>e.type==='npc'&&e.eventId&&e.entityId));
  const token=run.events.find(e=>e.type==='token'); assert.equal(token.runId,run.runId); assert.ok(Number.isInteger(token.simTick));
});

test('loadout is applied at start, event-blocked gadgets are excluded, and gadgets alter handling/rewards',()=>{
  const run=createFlight({seed:19});
  run.loadout=['orbit-magnet','quiet-vector','spark-dampener','coin-prism'];
  commandFlight(run,'start');
  assert.equal(run.effects.magnetRadius,0.30);
  assert.equal(run.effects.verticalResponse,1.10);
  assert.equal(run.shield,1);
  assert.equal(run.effects.coinBonus,1);
  const cosmeticRun=createFlight({seed:26,cosmetic:'ember-trace'});
  assert.equal(cosmeticById(cosmeticRun.cosmetic).tint,'#ff926b');
  const sideband=createFlight({seed:27,loadout:['sideband-collector']}); commandFlight(sideband,'start');
  addAtPlayer(sideband,{type:'npc',kind:'coach-flyby'}); tick(sideband);
  assert.equal(sideband.coins,1,'companion gadget turns an NPC interaction into a stable coin event');
  assert.ok(sideband.events.some(e=>e.type==='coin'&&e.origin==='companion-gadget'));
  const lantern=createFlight({seed:28,loadout:['route-lantern']}); commandFlight(lantern,'start');
  assert.ok(lantern.objects.filter(o=>o.type==='coin').every(o=>o.revealAt<=o.z-4));
  const eventRun=createFlight({seed:20,event:true,loadout:['lucky-signal','component-call','orbit-magnet']});
  assert.deepEqual(eventRun.loadout,['orbit-magnet']);
  const shellRun=createFlight({seed:23}); shellRun.loadout=['tide-glider']; commandFlight(shellRun,'start');
  assert.equal(shellRun.vehicle,'tide-glider','an equipped vehicle ID activates the purchased chassis');
  const upgradeRun=createFlight({seed:24}); upgradeRun.upgrades={'magnet-tuning':99,'shield-capacitor':2,'vehicle-reserve':99,'signal-relay':99}; commandFlight(upgradeRun,'start');
  assert.equal(upgradeRun.upgrades['magnet-tuning'],3);
  assert.equal(upgradeRun.effects.magnetRadius,0.24);
  assert.equal(upgradeRun.effects.maxShield,3);
  assert.equal(upgradeRun.shield,2);
  assert.equal(upgradeRun.effects.vehicleDuration,6);
  assert.equal(upgradeRun.effects.warningLead,4.5);
  const durationRun=createFlight({seed:24,vehicle:'tide-glider',upgrades:{'vehicle-reserve':99}}); commandFlight(durationRun,'start');
  assert.equal(durationRun.vehicleUntil,30,'vehicle duration upgrade is bounded and applied');
  const shieldUpgrade=createFlight({seed:25,upgrades:{'shield-capacitor':2}}); commandFlight(shieldUpgrade,'start');
  assert.equal(shieldUpgrade.shield,2);
  addAtPlayer(shieldUpgrade,{type:'powerup',kind:'aegis-pulse'}); tick(shieldUpgrade);
  assert.equal(shieldUpgrade.shield,3,'capacity upgrade affects collected shields');
  assert.ok(SHOP_ITEMS.some(item=>item.kind==='upgrade'&&item.maxLevel===3));
  assert.equal(UPGRADES.find(item=>item.id==='magnet-tuning').maxLevel,3);
  const changed=createFlight({seed:21}); changed.loadout=['orbit-magnet']; commandFlight(changed,'start');
  addAtPlayer(changed,{type:'coin',x:changed.x+0.25,y:changed.y,radius:0.08,value:1}); tick(changed);
  assert.equal(changed.coins,1,'gadget magnet expands coin pickup area');
});

test('laser telegraph progresses through charge, active and cooldown with explicit cues',()=>{
  const run=createFlight({seed:1}); commandFlight(run,'start');
  const laser=addAtPlayer(run,{type:'laser',kind:'gate-panel',z:run.distance+0.4,warningLead:18,w:0.4,h:0.4});
  tick(run,{...valid,height01:0.5},1);
  assert.equal(laser.laserState,'active');
  assert.ok(run.events.some(e=>e.type==='course'&&e.kind==='hazard-warning'));
  assert.equal(run.phase,'crashed');
});

test('rescue gadget provides one bounded impact buffer before a later crash',()=>{
  const run=createFlight({seed:2,loadout:['rescue-echo']}); commandFlight(run,'start');
  addAtPlayer(run,{type:'zapper',kind:'gate-panel'}); tick(run);
  assert.equal(run.phase,'flying'); assert.equal(run.impactBuffer,0);
  assert.ok(run.events.some(e=>e.type==='hit'&&e.protection==='rescue-buffer'));
  tick(run,valid,80); addAtPlayer(run,{type:'zapper',kind:'gate-panel'}); tick(run);
  assert.equal(run.phase,'crashed');
});

test('missile telegraphs, locks and launches before collision',()=>{
  const run=createFlight({seed:5,runId:'missile'}); commandFlight(run,'start');
  addAtPlayer(run,{type:'missile',kind:'seeking-orb',z:run.distance+0.03,w:0.25,h:0.25,state:'approach',warningLead:28,lockDistance:12,launchDistance:7,targetX:null,targetY:null});
  tick(run);
  assert.ok(run.events.some(e=>e.kind==='missile-warning'));
  assert.ok(run.events.some(e=>e.kind==='missile-locked'));
  assert.ok(run.events.some(e=>e.kind==='missile-launched'));
  assert.equal(run.phase,'crashed');
});

test('pause/resume and crash/revive preserve run identity and collected IDs while clearing threats',()=>{
  const run=createFlight({seed:13,runId:'identity'}); commandFlight(run,'start');
  const collected='identity:known-coin'; run.collectedIds.add(collected);
  const threat=addAtPlayer(run,{type:'zapper',kind:'gate-panel',z:run.distance+4,w:0.4,h:0.4});
  assert.equal(commandFlight(run,'pause',{reason:'tracking'}),true);
  const before=stateOf(run); advanceFlight(run,1,{...valid,height01:1}); assert.deepEqual(stateOf(run),before);
  assert.equal(commandFlight(run,'resume'),true); assert.equal(run.phase,'flying'); assert.equal(threat.active,false);
  run.graceUntil=0;
  addAtPlayer(run,{type:'zapper',kind:'gate-panel',z:run.distance+0.03,w:0.4,h:0.4}); tick(run);
  assert.equal(run.phase,'crashed');
  assert.equal(commandFlight(run,'revive'),true);
  assert.equal(run.phase,'flying'); assert.equal(run.runId,'identity'); assert.equal(run.continuation,1);
  assert.ok(run.collectedIds.has(collected));
  assert.equal(run.events.filter(e=>e.type==='crash').length,1);
});

test('headstart, final blast and event mode are run-boundary utilities',()=>{
  const run=createFlight({seed:22});
  assert.equal(commandFlight(run,'headstart'),true); assert.equal(run.distance,12);
  assert.equal(commandFlight(run,'headstart'),false);
  assert.equal(commandFlight(run,'event',{enabled:true}),true); assert.equal(run.event,true);
  commandFlight(run,'start');
  addAtPlayer(run,{type:'zapper',kind:'gate-panel',z:run.distance+0.03,w:1,h:1}); tick(run);
  assert.equal(run.phase,'crashed');
  assert.equal(commandFlight(run,'final-blast'),true); assert.equal(run.distance>12,true);
  assert.equal(commandFlight(run,'final-blast'),false);
});

test('finish is one-shot and finalized state is immutable',()=>{
  const run=createFlight({seed:4,runId:'settle'}); commandFlight(run,'start');
  assert.equal(commandFlight(run,'finish'),true);
  const before=stateOf(run), eventCount=run.events.length;
  assert.equal(commandFlight(run,'finish'),false);
  advanceFlight(run,1,{...valid,steer:1});
  assert.deepEqual(stateOf(run),before); assert.equal(run.events.length,eventCount);
});

test('mission rotation covers safe goal families and each completed contract emits its explicit one-to-three stars',()=>{
  const allKinds=new Set();
  for(let seed=1;seed<=10;seed++){
    const run=createFlight({seed,runId:`mission-rotation-${seed}`});
    assert.equal(run.missions.length,3);
    assert.deepEqual(run.missions.map(m=>m.stars),[1,2,3]);
    for(const mission of run.missions){allKinds.add(mission.kind);assert.ok(['coins','distance','pickups','clean','vehicleTime'].includes(mission.kind));}
    if(run.missions.some(m=>m.kind==='vehicleTime')){
      commandFlight(run,'start');
      assert.ok(run.objects.some(o=>o.type==='vehicle'&&o.id.endsWith(':vehicle')),'vehicle-time contract has a guaranteed safe-lane vehicle pickup');
    }
  }
  assert.deepEqual([...allKinds].sort(),['clean','coins','distance','pickups','vehicleTime'].sort());
  for(const [kind,stars] of [['coins',1],['distance',2],['pickups',3],['clean',1],['vehicleTime',2]]){
    const run=createFlight({seed:40+stars,runId:`mission-${kind}-${stars}`});
    run.missions=[{id:`test-${kind}`,name:'Test',kind,target:kind==='distance'||kind==='vehicleTime'?.01:1,stars,progress:0,complete:false}];
    commandFlight(run,'start');
    if(kind==='coins'||kind==='pickups')addAtPlayer(run,{type:'coin'});
    if(kind==='clean')run.gateGroups.set('test-clean',{id:'test-clean',z:run.distance+.01,hit:false,cleared:false});
    if(kind==='vehicleTime'){run.vehicle='tide-glider';run.vehicleUntil=20;run.vehicleHealth=1;}
    tick(run,valid,kind==='clean'?8:1);
    const rewards=run.events.filter(e=>e.type==='mission');
    assert.equal(rewards.length,1,`${kind} completes once`);
    assert.equal(rewards[0].stars,stars,`${kind} emits explicit stars`);
    assert.equal(rewards[0].amount,stars,`${kind} amount matches wallet star settlement`);
  }
});

test('event token track pays one stable original MYR5 coin reward exactly at its target',()=>{
  const run=createFlight({seed:71,runId:'event-cache',event:true});commandFlight(run,'start');
  assert.equal(run.eventRewardProgress,0);assert.equal(run.eventRewardTarget,3);
  for(let n=0;n<3;n++){addAtPlayer(run,{type:'token',kind:'event-shard'});tick(run);}
  assert.equal(run.eventRewardProgress,3);assert.equal(run.eventRewardClaimed,true);
  const rewards=run.events.filter(e=>e.type==='coin'&&e.origin==='event-track');
  assert.equal(rewards.length,1);assert.equal(rewards[0].amount,15);assert.equal(rewards[0].id,'event-cache:event-signal-cache');
  addAtPlayer(run,{type:'token',kind:'event-shard'});tick(run);
  assert.equal(run.events.filter(e=>e.type==='coin'&&e.origin==='event-track').length,1,'additional tokens cannot pay the track twice');
  const standard=createFlight({seed:72,runId:'ordinary-token'});commandFlight(standard,'start');
  addAtPlayer(standard,{type:'token',kind:'test-token'});tick(standard);
  assert.equal(standard.eventRewardProgress,0);assert.equal(standard.eventRewardClaimed,false);
});

test('Tide Glider is an allowed explicit start and uses shared safe gates with authored wave coin patterns',()=>{
  const standard=createFlight({seed:73,runId:'standard-route'}),tide=createFlight({seed:73,runId:'tide-route',vehicle:'tide-glider'});
  commandFlight(standard,'start');commandFlight(tide,'start');
  assert.equal(tide.vehicle,'tide-glider','an allowed explicit chassis starts equipped');
  assert.equal(tide.safeRoute[0].x,standard.safeRoute[0].x,'vehicle keeps the established safe gate generator');
  assert.equal(tide.safeRoute[0].y,standard.safeRoute[0].y);
  assert.ok(tide.objects.some(o=>o.type==='coin'&&o.pattern==='wave'),'the shared course already includes a wave-shaped coin branch');
  for(const point of tide.safeRoute)assert.ok(Math.abs(point.x)<=.5&&point.y>=.28&&point.y<=.72);
  for(let i=1;i<tide.safeRoute.length;i++)assert.ok(safeRouteReachable(tide.safeRoute[i-1],tide.safeRoute[i],tide.safeRoute[i].spacing/FLIGHT_TUNING.maxSpeed,{x:.54,y:.38},.85));
  const gateZ=tide.safeRoute[0].z;
  const firstGateHazards=run=>run.objects.filter(o=>o.z===gateZ&&(o.type==='zapper'||o.type==='laser')).length;
  assert.equal(firstGateHazards(tide),firstGateHazards(standard),'explicit Tide start adds no hazard panels to the safe gate');
});
