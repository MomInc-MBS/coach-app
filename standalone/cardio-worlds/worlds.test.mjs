import test from 'node:test';import assert from 'node:assert/strict';import {createWorldRun,advance,act,enterPortal,collectPower,collectCoin,hit} from './worlds.mjs';
const tick=(r,t)=>{for(let n=0;n<Math.ceil(t/.05);n++)advance(r,.05);};
test('gate requires a jump; unlock only after wormhole arrival; final area loops',()=>{const r=createWorldRun();tick(r,50);assert.equal(r.phase,'portal');assert.equal(enterPortal(r),false);assert.equal(r.unlocked,0);act(r,'jump');assert.equal(r.phase,'wormhole');assert.equal(r.unlocked,0);tick(r,1.8);assert.equal(r.world,1);assert.equal(r.unlocked,1);r.world=2;r.phase='portal';r.jump=0;act(r,'jump');tick(r,1.8);assert.equal(r.world,0);assert.equal(r.loop,1);});
test('constant speed, timed powers and one-hit protection',()=>{const a=createWorldRun(),b=createWorldRun();collectPower(b,'boost');tick(a,2);tick(b,2);assert.equal(a.distance,b.distance);const before=a.stumbles;collectPower(a,'shield');hit(a);hit(a);assert.equal(a.stumbles,before+1);tick(b,5);assert.equal(b.powers.boost,undefined);});
test('score and coin modifiers remain separate; opening boost is opt-in and once',()=>{const r=createWorldRun();assert.equal(r.distance,0);collectPower(r,'headstart');assert.equal(r.distance,150);assert.equal(collectPower(r,'headstart'),false);collectPower(r,'doubleCoins');collectPower(r,'scoreBoost');collectCoin(r,3);assert.equal(r.coins,6);assert.equal(r.score,60);assert.equal(r.xp,undefined);});
test('invalid values do not corrupt state; steering clamps and jump shoes float',()=>{const r=createWorldRun({unlocked:Infinity});advance(r,NaN);collectCoin(r,Infinity);assert.equal(r.distance,0);assert.equal(r.unlocked,0);for(let i=0;i<10;i++)act(r,'left');assert.equal(r.lane,-1);collectPower(r,'superJump');act(r,'jump');assert.equal(r.jump,2.2);});
test('phase bypass, pogo launch, coin tiers and recovery are functional',()=>{const r=createWorldRun();collectPower(r,'phase');hit(r);assert.equal(r.stumbles,0);tick(r,8.1);collectPower(r,'recovery');hit(r);hit(r);assert.equal(r.stumbles,1);const before=r.coins;collectPower(r,'pogo');assert.equal(r.jump,2.2);assert.equal(r.coins,before+5);collectPower(r,'coinTier');collectCoin(r);assert.equal(r.coins,before+8);});


test('gait scales distance only; power and wormhole timers use wall time',()=>{
  const r=createWorldRun();r.lane=1;collectPower(r,'shield');advance(r,.25,{pace:.5});assert.ok(Math.abs(r.distance-1.5)<1e-8);assert.ok(Math.abs(r.powers.shield-9.75)<1e-8);advance(r,.25,{pace:0});assert.ok(Math.abs(r.distance-1.5)<1e-8);r.phase='portal';act(r,'jump');for(let i=0;i<8;i++)advance(r,.25,{pace:0});assert.equal(r.world,1);
});
test('headstart cannot cross a world portal or run twice',()=>{
  const r=createWorldRun();r.distance=599;assert.equal(collectPower(r,'headstart'),false);advance(r,.25);assert.equal(r.phase,'portal');assert.equal(collectPower(r,'headstart'),false);assert.equal(r.world,0);
});
