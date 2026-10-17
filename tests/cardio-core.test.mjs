import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorldRun,advance,act,punchCourse,resolveThrowMiss,hit} from '../arcade/runner/worlds/worlds.mjs';
import {courseHazards,coursePickups,courseCoins,courseBuses,surfaceAt} from '../arcade/runner/worlds/course.mjs';
const tick=(r,t)=>{for(let n=0;n<Math.round(t/.05);n++)advance(r,.05);};
const portal=r=>{r.distance=600;r.phase='portal';r.jump=0;act(r,'jump');tick(r,1.8);};
test('two600m legs precede each next biome and unlock; portal arrival cues each pass',()=>{
 const r=createWorldRun();for(let world=0;world<3;world++){
  assert.equal(r.world,world);assert.equal(r.leg,0);portal(r);assert.equal(r.world,world);assert.equal(r.leg,1);assert.equal(r.mirrored,true);assert.equal(r.unlocked,world);const serial=r.arrivalSerial;portal(r);assert.equal(r.world,(world+1)%3);assert.equal(r.leg,0);assert.equal(r.mirrored,false);assert.equal(r.arrivalSerial,serial+1);
 }assert.equal(r.loop,1);
});
test('opening leg is full50s at12m/s and headstart is on return pass only',()=>{
 const r=createWorldRun();assert.equal(coursePickups(0,0).some(p=>p.kind==='headstart'),false);assert.equal(coursePickups(0,1).some(p=>p.kind==='headstart'),true);tick(r,49);assert.ok(Math.abs(r.distance-588)<1e-7);assert.equal(r.phase,'run');tick(r,1);assert.equal(r.phase,'portal');assert.equal(r.totalDistance,600);portal(r);r.lane=0;tick(r,1);assert.ok(r.distance>=150);assert.equal(r.headstartUsed,true);
});
test('mirrored leg maps all collidable routes and pickups onto exactly matching lane signs',()=>{
 for(let world=0;world<3;world++){
  for(const h of courseHazards(world,0)){const m=courseHazards(world,0,1).find(o=>o.id===h.id);assert.equal(m.lane,-h.lane);const r=createWorldRun();r.world=world;r.leg=1;r.lane=m.lane;r.distance=m.distance-.1;advance(r,.25);assert.equal(r.stumbles,1);assert.equal(r.lastEvent.type,'hit');assert.equal(r.destroyed[m.id],true);}
  for(const p of coursePickups(world)){const m=coursePickups(world,1).find(o=>o.id===p.id);assert.equal(m.lane,-p.lane);}
  for(const c of courseCoins(world)){assert.equal(courseCoins(world,1).find(o=>o.id===c.id).lane,-c.lane);}
 }
 for(const b of courseBuses(2,1))assert.equal(surfaceAt(2,b.rampEnd,b.lane,1).height,b.height);
});
test('successful lane dodge emits green event without impact serial, destruction, or protection cost',()=>{
 const r=createWorldRun(),h=courseHazards(0)[0];r.distance=h.distance-.1;r.lane=h.lane===0?1:0;r.powers.shield=5;advance(r,.25);assert.equal(r.stumbles,0);assert.equal(r.hazardSerial,0);assert.equal(r.lastEvent.type,'dodge');assert.equal(r.destroyed[h.id],undefined);assert.ok(r.powers.shield>4);
});
test('reachable obstacle punch destroys it once and cannot produce a later ghost impact',()=>{
 const r=createWorldRun(),h=courseHazards(0)[0];r.distance=h.distance-5;r.lane=h.lane;assert.equal(punchCourse(r,h.id),true);assert.equal(punchCourse(r,h.id),false);assert.equal(r.lastEvent.type,'punch');assert.equal(r.destroyed[h.id],true);const score=r.score;tick(r,1);assert.equal(r.stumbles,0);assert.equal(r.hazardSerial,0);assert.ok(r.score>=score);r.distance=h.distance-15;assert.equal(punchCourse(r,h.id),false);
});
test('thrown ball only impacts overlapping lane and body capsule; dodge, duck and jump stay clean',()=>{
 for(const dodge of ['lane','duck','jump']){const r=createWorldRun(),o={id:1,x:0,y:1.4,r:.35,d:0};if(dodge==='lane')r.lane=-1;if(dodge==='duck')r.slide=.8;if(dodge==='jump'){r.jumpDuration=1.4;r.jump=.7;r.jumpPeak=2;}assert.equal(resolveThrowMiss(r,o),'dodge');assert.equal(r.stumbles,0);assert.equal(r.hazardSerial,0);assert.equal(r.lastEvent.type,'dodge');}
 const r=createWorldRun();assert.equal(resolveThrowMiss(r,{id:2,x:0,y:1.4,r:.35,d:0}),'stumble');assert.equal(r.stumbles,1);assert.equal(r.lastEvent.type,'hit');
});
test('event ring has stable serials and bounded memory',()=>{const r=createWorldRun();for(let i=0;i<100;i++)hit(r);assert.equal(r.events.length,32);assert.equal(r.lastEvent.serial,100);assert.equal(r.events[0].serial,69);});
