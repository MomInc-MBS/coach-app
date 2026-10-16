import test from 'node:test';import assert from 'node:assert/strict';
import {METRO_BUSES,surfaceAt,POWER_KITS,coursePickups,courseCoins} from './course.mjs';
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
