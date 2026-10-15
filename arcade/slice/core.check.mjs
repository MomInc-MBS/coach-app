// node arcade/slice/core.check.mjs — physics, hit, curvature, laser stillness.
import assert from 'node:assert/strict';
import {createSlice,pathKind,pathCurvature,stillness} from './core.mjs';
const line=[...Array(6)].map((_,i)=>({x:i*.05,y:i*.05}));
const arc=[...Array(6)].map((_,i)=>({x:Math.sin(i/5*Math.PI)*.08+i*.02,y:i*.05}));
const loop=[...Array(6)].map((_,i)=>({x:Math.cos(i)*.1,y:Math.sin(i)*.1}));
assert.equal(pathKind(line),'explode');assert.equal(pathKind(arc),'slice');assert.equal(pathKind(loop),'slice');assert.ok(pathCurvature(line)<.05);
assert.ok(stillness([0,.1,.05]));assert.ok(!stillness([1,1.2,.9]));assert.ok(!stillness([]));
// physics: arc rises from the bottom, apex well above, lands below -> strike
const ev=[];const e=createSlice({auto:false,seed:3,onEvent:t=>ev.push(t)});
const o=e.launch();assert.ok(o.vy<0&&o.y>e.h-10);let minY=1e9;for(let i=0;i<900&&e.objects.length;i++){e.step(1/60);for(const q of e.objects)minY=Math.min(minY,q.y);}
assert.ok(minY<e.h*.6,'apex');assert.equal(e.strikes,1);assert.ok(ev.includes('strike'));
// slice makes 2 halves, explode makes particles, bonus gives xp
const e2=createSlice({auto:false,seed:4});const a=e2.launch();a.x=90;a.y=100;a.vx=a.vy=0;
assert.equal(e2.hitSegment({x:60,y:100},{x:120,y:100},{kind:'slice'}),1);assert.equal(e2.halves.length,2);assert.equal(e2.objects.length,0);
const b=e2.launch();b.x=90;b.y=100;b.vx=b.vy=0;e2.hitSegment({x:90,y:100},{x:90,y:100},{kind:'explode'});assert.ok(e2.parts.length>10);assert.equal(e2.halves.length,2);
const bo=e2.dropBonus();bo.x=50;bo.y=50;e2.hitSegment({x:50,y:50},{x:50,y:50});assert.equal(e2.xp,3);
// combo: 3 hits in one swipe
const e3=createSlice({auto:false,seed:5});for(let i=0;i<3;i++){const q=e3.launch();q.x=30+i*30;q.y=100;q.vx=q.vy=0;}
e3.hitSegment({x:0,y:100},{x:180,y:100});assert.equal(e3.combo,3);
// 3 strikes ends the wave, the set keeps going (no game over)
const e4=createSlice({auto:true,seed:6});let ended=false;e4.step(1.5);for(let i=0;i<3000&&!ended;i++){e4.step(1/60);ended=e4.cool>0;}assert.ok(ended&&e4.strikes===0&&!e4.over);
// laser: moving = hit (strike), still = shield
for(const[move,want]of[[1,'hit'],[0,'shield']]){const l=createSlice({auto:false});l.laserStart(90,200);for(let i=0;i<30;i++){l.feedMotion(move);l.step(1/20);}l.step(.1);assert.equal(l.laser.result,want);assert.equal(l.strikes,want==='hit'?1:0);}
console.log('slice core ok');
