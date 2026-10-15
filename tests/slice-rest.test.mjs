import test from 'node:test';
import assert from 'node:assert/strict';
import {createDodger,throwPlan,createSwipe,REST} from '../arcade/slice/rest-logic.mjs';
import {createSlice,TARGET_SIZE} from '../arcade/slice/core.mjs';
test('tilt moves the dodger and clamps at the walls',()=>{
 const d=createDodger(400);d.tilt(1);for(let i=0;i<200;i++)d.step(1/60);assert.equal(d.x,400-40);
 d.tilt(-1);for(let i=0;i<200;i++)d.step(1/60);assert.equal(d.x,40);
 d.tilt(0);for(let i=0;i<200;i++)d.step(1/60);assert.ok(Math.abs(d.x-200)<1);
});
test('keys and drag are fallbacks',()=>{const d=createDodger(400);d.key(1);for(let i=0;i<30;i++)d.step(1/60);assert.ok(d.x>200);d.key(0);d.drag(60);for(let i=0;i<100;i++)d.step(1/60);assert.equal(d.x,60);});
test('throws speed up per wave and aim at the character',()=>{
 const a=throwPlan(0,200,300,()=>.5),b=throwPlan(8,200,300,()=>.5);assert.ok(b.gap<a.gap&&b.count>a.count&&a.aimX===300);assert.ok(b.gap>=REST.throwEvery[1]);
});
test('rest targets start immediately and share the core 2.5x size multiplier exactly once',()=>{
 assert.equal(REST.firstThrowDelay,0);assert.equal(TARGET_SIZE,2.5);
 const rest=createSlice({mode:'rest',auto:false}).spawn({x:10,y:10,r:12});assert.equal(rest.r,30);
});
test('swipe vs tap',()=>{
 const w=createSwipe();w.down({x:5,y:5});w.move({x:7,y:6});assert.deepEqual(w.up(),{x:5,y:5});
 w.down({x:0,y:0});const seg=w.move({x:40,y:0});assert.equal(seg[1].x,40);assert.equal(w.up(),null);
});
