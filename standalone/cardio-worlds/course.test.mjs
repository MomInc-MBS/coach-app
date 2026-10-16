import test from 'node:test';import assert from 'node:assert/strict';
import {METRO_BUSES,surfaceAt,POWER_KITS,coursePickups,courseCoins,courseHazards} from './course.mjs';
import {createWorldRun,advance,act,collectPower,hit} from './worlds.mjs';
const tick=(r,seconds,moving=true)=>{for(let i=0;i<Math.round(seconds/.05);i++)advance(r,.05,{moving});};
test('bus route is a continuous ramp, roof and descent in its own lane',()=>{
  for(const b of METRO_BUSES){assert.equal(surfaceAt(2,b.start,b.lane).height,0);assert.equal(surfaceAt(2,b.rampEnd,b.lane).height,3.2);assert.equal(surfaceAt(2,b.roofEnd,b.lane).type,'roof');assert.equal(surfaceAt(2,b.end,b.lane).height,0);assert.equal(surfaceAt(2,b.rampEnd,b.lane===0?1:0).height,0);assert.ok(courseCoins(2).some(c=>c.lane===b.lane&&c.distance>b.rampEnd&&c.distance<b.roofEnd&&c.height>4));}
});
test('run physically climbs a bus, stays on roof and comes down at constant pace',()=>{
  const r=createWorldRun();r.world=2;r.distance=69;r.lane=0;
  tick(r,2);assert.ok(r.distance>92&&r.distance<94);assert.equal(r.elevation,3.2);
  tick(r,3);assert.ok(r.distance>128);assert.ok(r.elevation<.001);assert.ok(r.coins>0);
});
test('bus side cannot teleport a grounded runner onto its roof; jump shoes permit a high landing',()=>{
  const r=createWorldRun();r.world=2;r.distance=98;r.lane=-1;act(r,'right');assert.equal(r.lane,-1);assert.equal(r.stumbles,1);
  collectPower(r,'superJump');act(r,'jump');tick(r,1.1,false);act(r,'right');assert.equal(r.lane,0);advance(r,.05);assert.equal(r.elevation,3.2);
});
test('every world-specific power is actually collectible on its authored route',()=>{
  for(let world=0;world<3;world++)for(const kind of POWER_KITS[world]){
    const p=coursePickups(world).find(p=>p.kind===kind),r=createWorldRun();r.world=world;r.lane=p.lane;r.distance=p.distance-.1;r.elevation=surfaceAt(world,r.distance,r.lane).height;
    advance(r,.05);assert.equal(r.lastPickup,kind);assert.equal(r.collected[p.id],true);
    if(kind==='headstart')assert.ok(r.distance>=150);else if(kind==='pogo')assert.ok(r.jump>0);else assert.ok(r.powers[kind]>0);
  }
});
test('powerup effects work in course simulation and are never awarded twice',()=>{
  const r=createWorldRun();r.world=1;const p=coursePickups(1).find(p=>p.kind==='phase');r.distance=p.distance-.1;r.lane=p.lane;advance(r,.05);hit(r);assert.equal(r.stumbles,0);
  const serial=r.pickupSerial;r.distance=p.distance-.1;advance(r,.05);assert.equal(r.pickupSerial,serial);
});

test('hazards are readable, preserve an escape lane, and leave pickups, buses and exit clear',()=>{
  for(let world=0;world<3;world++)for(const loop of [0,1,3]){
    const hazards=courseHazards(world,loop),stations=[...new Set(hazards.map(h=>h.distance))];
    assert.ok(hazards.length>0);assert.ok(stations.every((d,i)=>i===0||d-stations[i-1]>=24));
    for(const h of hazards){assert.ok(h.distance+h.length<=555);assert.ok(coursePickups(world).every(p=>p.lane!==h.lane||Math.abs(p.distance-h.distance)>=16));if(world===2)assert.ok(METRO_BUSES.every(b=>b.lane!==h.lane||h.distance+h.length<b.start-12||h.distance>b.end+12));assert.ok(hazards.filter(o=>o.distance===h.distance).length<=2);}
    if(loop)assert.ok(hazards.length>courseHazards(world,0).length);
  }
  assert.notDeepEqual(courseHazards(0),courseHazards(1));
});
const atHazard=type=>{const r=createWorldRun();r.world=1;const h=courseHazards(1).find(h=>h.type===type);r.distance=h.distance-.1;r.lane=h.lane;return {r,h};};
test('crossed-distance hazards hit at low FPS once and never stop the run',()=>{
  const {r,h}=atHazard('jump');advance(r,.25);assert.equal(r.stumbles,1);assert.equal(r.lastHazard.id,h.id);advance(r,.25);assert.equal(r.stumbles,1);assert.equal(r.phase,'run');assert.ok(r.distance>h.distance+2.4);
});
test('jump clearance uses height at crossing rather than jump activation or timer presence',()=>{
  const start=atHazard('jump');act(start.r,'jump');advance(start.r,.25);assert.equal(start.r.stumbles,1);
  const apex=atHazard('jump');act(apex.r,'jump');tick(apex.r,.5,false);advance(apex.r,.25);assert.equal(apex.r.stumbles,0);
  const ending=atHazard('jump');act(ending.r,'jump');tick(ending.r,1.3,false);advance(ending.r,.25);assert.equal(ending.r.stumbles,1);
});
test('slide must last through overhead obstacle and expired duck is an impact',()=>{
  const duck=atHazard('slide');act(duck.r,'slide');advance(duck.r,.25);assert.equal(duck.r.stumbles,0);
  const expired=atHazard('slide');act(expired.r,'slide');tick(expired.r,.75,false);advance(expired.r,.25);assert.equal(expired.r.stumbles,1);
});
test('protected course impacts report absorption and bypass without repeat awards',()=>{
  for(const power of ['shield','board','recovery','phase','jetpack','boost']){const {r}=atHazard('jump');collectPower(r,power);advance(r,.25);assert.equal(r.stumbles,0);assert.equal(r.hazardSerial,1);assert.equal(r.lastHazard.result,['shield','board','recovery'].includes(power)?'absorbed':'bypass');advance(r,.25);assert.equal(r.hazardSerial,1);}
});
test('flight expiry beside a bus falls back safely without a roof snap',()=>{
  const r=createWorldRun();r.world=2;r.distance=98;r.lane=-1;collectPower(r,'jetpack');r.powers.jetpack=.1;act(r,'right');assert.equal(r.lane,0);advance(r,.05);assert.equal(r.elevation,0);advance(r,.1);assert.equal(r.elevation,0);assert.notEqual(r.lane,0);assert.equal(r.lastHazard.type,'bus-side');assert.equal(r.stumbles,1);
});
test('magnet attracts coins but cannot take gadgets from another lane or a bus roof',()=>{
  const r=createWorldRun();r.world=2;const p=coursePickups(2).find(p=>p.id==='roof-power-0');r.distance=p.distance-.1;r.lane=-1;collectPower(r,'magnet');advance(r,.05);assert.equal(r.collected[p.id],undefined);assert.equal(r.powers.jetpack,undefined);
});

