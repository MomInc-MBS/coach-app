// node arcade/slice/core.check.mjs — physics, hit, curvature, laser stillness, gun cadence, wobble fairness, boom.
import assert from 'node:assert/strict';
import {createSlice,pathKind,pathCurvature,stillness,GUN,TYPES} from './core.mjs';
import {XP_SCALE} from '../../progression-rules.mjs';
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
const bo=e2.dropBonus();bo.x=50;bo.y=50;e2.hitSegment({x:50,y:50},{x:50,y:50});assert.equal(e2.xp,3*XP_SCALE);
// combo: 3 hits in one swipe
const e3=createSlice({auto:false,seed:5});for(let i=0;i<3;i++){const q=e3.launch();q.x=30+i*30;q.y=100;q.vx=q.vy=0;}
e3.hitSegment({x:0,y:100},{x:180,y:100});assert.equal(e3.combo,3);
// volleys: 1-3 barrels each, never two volleys in the air, next one only volleyGap after the last is resolved
{const f=createSlice({auto:true,seed:31,strikes:false});let gone=-1,sizes=new Set(),prevWave=0;f.step(1.2);sizes.add(f.objects.filter(o=>!o.bonus).length);prevWave=f.wave;
 for(let i=0;i<60*120;i++){const before=f.objects.filter(o=>!o.bonus).length;f.step(1/60);const live=f.objects.filter(o=>!o.bonus);
  if(f.wave!==prevWave){assert.equal(before,0,'new volley only when none is in flight');if(gone>=0)assert.ok(f.t-gone>=GUN.volleyGap[3]-.05,'gap after resolve '+(f.t-gone));sizes.add(live.length);prevWave=f.wave;}
  if(live.length===0&&before>0)gone=f.t;}
 assert.ok(f.wave>5);assert.ok([...sizes].every(n=>n>=1&&n<=3),'volley sizes '+[...sizes]);assert.ok(sizes.size>=2,'volleys vary');}
// 3 strikes ends the wave, the set keeps going (no game over)
const e4=createSlice({auto:true,seed:6});let ended=false;e4.step(1.5);for(let i=0;i<3000&&!ended;i++){e4.step(1/60);ended=e4.cool>0;}assert.ok(ended&&e4.strikes===0&&!e4.over);
// laser: moving = hit (strike), still = shield
for(const[move,want]of[[1,'hit'],[0,'shield']]){const l=createSlice({auto:false});l.laserStart(90,200);for(let i=0;i<30;i++){l.feedMotion(move);l.step(1/20);}l.step(.1);assert.equal(l.laser.result,want);assert.equal(l.strikes,want==='hit'?1:0);}
// speed ramp: later waves keep the same apex but come down faster
const fly=sp=>{const f=createSlice({auto:false,seed:9});f.speed=sp;const q=f.launch();let top=1e9,t=0;while(f.objects.length&&t<10){f.step(1/120);t+=1/120;top=Math.min(top,q.y);}return {top,t};};
const s1=fly(1),s15=fly(1.5);assert.ok(Math.abs(s1.top-s15.top)<3,'same apex');assert.ok(s15.t<s1.t*.75,'faster at 1.5x');
// bonus drops: holds every 5-7s, martial every 2-3s (each reset of bonusIn is a new gap)
for(const[mode,lo,hi]of[['hold',...GUN.bonusEvery.hold],['martial',...GUN.bonusEvery.martial]]){const f=createSlice({auto:true,mode,seed:11,strikes:false});let prev=f.bonusIn,gaps=[];for(let k=0;k<60*60;k++){f.step(1/60);if(f.bonusIn>prev)gaps.push(f.bonusIn);prev=f.bonusIn;}
 assert.ok(gaps.length>3&&gaps.every(g=>g>=lo-.02&&g<=hi),mode+' gaps '+gaps.map(g=>g.toFixed(2)));}
// barrels only (no space junk); the first barrel of a wave flies straight
assert.ok(Object.keys(TYPES).filter(k=>!k.startsWith('xp-')).every(k=>k.startsWith('barrel-')));
// wobble: |x - straight line| <= amp the whole flight, back on the straight line at landing, y stays a pure parabola
{const f=createSlice({auto:false,seed:21});f.wave=8;const q=f.launch(),x0=q.x,vx=q.vx,y0=q.y,vy=q.vy,g=q.g;q.hold=false;let n=0,worst=0,end=0,yerr=0;
 while(q.alive&&f.objects.includes(q)&&n++<2000){f.step(1/120);const t=q.flight;worst=Math.max(worst,Math.abs(q.x-(x0+vx*t)));if(q.y<f.h+q.r)yerr=Math.max(yerr,Math.abs(q.y-(y0+vy*t+g*t*t/2)));end=Math.abs(q.x-(x0+vx*q.flight));}
 assert.ok(worst>1,'barrels sway');assert.ok(worst<=Math.max(...GUN.wobbleAmp)+1e-6,'sway '+worst);assert.ok(end<.5,'lands on the straight line '+end);assert.ok(yerr<3,'vertical stays a parabola '+yerr);}
// wave 1: no wobble at all; later waves: the first barrel of a wave is the straight one
{const f=createSlice({auto:false,seed:22});f.wave=1;assert.equal(f.launch().wA,0);f.wave=5;let swayed=false;for(let i=0;i<20;i++){f.objects=[];f.spawnWave();assert.equal(f.objects[0].wA,0);swayed||=f.objects.slice(1).some(o=>o.wA>0);}assert.ok(swayed);}
// gun: one shot per launched barrel, aim cue about GUN.aim before the first, cadence under the shots/s cap, spin capped
{const ev=[],f=createSlice({auto:false,seed:23,onEvent:(t,d)=>ev.push([t,f.t])});f.wave=4;f.speed=1.1;f.spawnWave();const n=f.objects.length;assert.ok(f.objects.every(o=>Math.abs(o.vr)<=GUN.spinMax));
 for(let i=0;i<60*8;i++)f.step(1/60);
 const shots=ev.filter(x=>x[0]==='shot'),aims=ev.filter(x=>x[0]==='gun-aim');assert.equal(shots.length,n,'one shot per barrel');assert.equal(f.shots,n);
 assert.ok(aims.length>=1&&Math.abs(shots[0][1]-aims[0][1]-GUN.aim)<.03,'aim leads the first shot by ~aim: '+(shots[0][1]-aims[0][1]));
 for(let i=1;i<shots.length;i++)assert.ok(shots[i][1]-shots[i-1][1]>=1/GUN.shotsPerSec[1]-.03,'shots/s cap');}
// hit-pause: freeze skips steps without advancing time; explode sets it, slice does not
{const f=createSlice({auto:false,seed:24});const a=f.spawn({type:'barrel-wood',x:60,y:100,r:12});f.hitSegment({x:40,y:100},{x:80,y:100},{kind:'slice'});assert.equal(f.freeze,0);
 const b=f.spawn({type:'barrel-wood',x:60,y:100,r:12});f.hitSegment({x:60,y:100},{x:60,y:100},{kind:'explode'});assert.ok(f.freeze>0&&f.shake>0&&f.fx.length>5,'boom layers');
 const t0=f.t;f.step(1/60);assert.equal(f.t,t0,'frozen step');f.freeze=0;f.step(1/60);assert.ok(f.t>t0);}
// fuel chain: a neighbour in range explodes once, 80 ms later; the chained one does not chain on
{const ev=[],f=createSlice({auto:false,seed:25,onEvent:t=>ev.push(t)});const a=f.spawn({type:'barrel-fuel',x:60,y:100,r:12}),b=f.spawn({type:'barrel-wood',x:100,y:100,r:12}),c=f.spawn({type:'barrel-fuel',x:150,y:100,r:12});
 a.g=b.g=c.g=0;f.hitSegment({x:60,y:100},{x:60,y:100},{kind:'explode'});assert.equal(f.hits,1);
 for(let i=0;i<30;i++)f.step(1/60);assert.equal(ev.filter(t=>t==='chain').length,1,'one chained barrel');assert.ok(!b.alive);assert.ok(c.alive,"out of range survives");}
// HARD HIT: speed over the gate scores +5
{const f=createSlice({auto:false,seed:26});f.spawn({type:'barrel-wood',x:60,y:100,r:12});f.hitSegment({x:60,y:100},{x:60,y:100},{kind:'explode',speed:GUN.hardHit+.1});assert.equal(f.score,15);}
console.log('slice core ok');
