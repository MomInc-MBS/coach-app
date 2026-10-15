import test from 'node:test';
import assert from 'node:assert/strict';
import {createHandGlow,renderHandGlow} from '../arcade/slice/hand-glow.mjs';

function poseAt(x,visibility=.9){
 const points=Array.from({length:23},()=>({x:.5,y:.5,visibility:.9}));
 for(const i of [15,16])points[i]={x,y:.5,visibility};
 return points;
}
function canvasStub(){const calls=[];let operation='source-over';return {calls,save(){},restore(){},beginPath(){},moveTo(){},lineTo(){},stroke(){calls.push(['stroke',operation]);},fillRect(){calls.push(['glow',operation]);},set globalCompositeOperation(value){operation=value;},get globalCompositeOperation(){return operation;}};}

test('confident wrists glow while hands are lowered or blocking; missing hand details fall back to wrists',()=>{
 const fx=createHandGlow();fx.pose(poseAt(.25),{now:0});fx.step(1/60,16);const ctx=canvasStub();renderHandGlow(ctx,fx.state);
 assert.equal(fx.state.hands.size,2);assert.equal(ctx.calls.filter(x=>x[0]==='glow').length,4);assert.ok(ctx.calls.every(x=>x[1]==='source-over'));
});

test('render smoothing interpolates toward tracked targets without changing source points',()=>{
 const fx=createHandGlow(),points=poseAt(.2);fx.pose(points,{now:0});fx.step(.05,50);const start=fx.state.hands.get('left').x;
 points[15]={x:.8,y:.5,visibility:.9};fx.pose(points,{now:33});assert.equal(points[15].x,.8);
 fx.step(.02,70);const moved=fx.state.hands.get('left').x;assert.ok(moved>start&&moved<.8);fx.step(.05,120);assert.ok(fx.state.hands.get('left').x>moved);
});

test('high pose rate creates a short bounded trail while low pose rate keeps only baseline glow',()=>{
 const fx=createHandGlow();let points=poseAt(.2);
 for(let t=0;t<1400;t+=33){points=poseAt(.2+(t%300)/3000);fx.pose(points,{now:t});fx.step(.033,t);}
 assert.equal(fx.state.poseHz>=4,true);assert.ok(fx.state.hands.get('left').trail.length<=16);assert.ok(fx.state.hands.get('left').trail.length>1);
 const low=createHandGlow();low.pose(poseAt(.3),{now:0});low.pose(poseAt(.4),{now:300});low.pose(poseAt(.5),{now:600});low.step(.033,633);const ctx=canvasStub();renderHandGlow(ctx,low.state);
 assert.equal(low.state.poseHz<4,true);assert.equal(ctx.calls.length,0,'slow pose cadence cuts both glow and trails');
});

test('repeated 1.5 Hz poses establish low cadence despite stale gaps',()=>{
 const fx=createHandGlow(),ctx=canvasStub();
 for(const now of [0,667,1334]){fx.pose(poseAt(.3),{now});fx.step(.033,now);}
 assert.ok(fx.state.poseSamples>=2);assert.ok(fx.state.poseHz<4);renderHandGlow(ctx,fx.state);assert.equal(ctx.calls.length,0);
});

test('confidence loss, missing pose, stale pose and explicit cleanup clear both hands',()=>{
 const fx=createHandGlow(),oneHand=poseAt(.3);fx.pose(oneHand,{now:0});const lost=poseAt(.4);lost[15].visibility=.49;fx.pose(lost,{now:33});assert.equal(fx.state.hands.size,1);
 fx.pose(null,{now:40});assert.equal(fx.state.hands.size,0);
 fx.pose(poseAt(.3),{now:100});fx.step(.05,501);assert.equal(fx.state.hands.size,0);
 fx.pose(poseAt(.4),{now:520});fx.clear();assert.equal(fx.state.hands.size,0);
});

test('measured sustained render cost disables effects and low-cost recovery is hysteretic',()=>{
 const fx=createHandGlow();for(let i=0;i<8;i++)fx.measure(2.1,i*33);assert.equal(fx.state.enabled,false);
 for(let i=0;i<46;i++)fx.measure(.8,1000+i*34);assert.equal(fx.state.enabled,true);
 fx.measure(2.2,3000);assert.equal(fx.state.enabled,true,'one slow frame is not enough to disable');
});

test('movement-derived heat brightens the aura within its bounded alpha range',()=>{
 const fx=createHandGlow(),points=poseAt(.2),mapPoint=p=>({x:p.x*180,y:p.y*320});fx.pose(points,{now:0,mapPoint});fx.pose(poseAt(.8),{now:33,mapPoint});
 const hand=fx.state.hands.get('left');assert.ok(hand.heat>0&&hand.heat<=1);
 const ctx=canvasStub();renderHandGlow(ctx,fx.state);assert.ok(hand.heat>.25);
});
