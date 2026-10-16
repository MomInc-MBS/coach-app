import test from 'node:test';import assert from 'node:assert/strict';
import {unlockStatus} from '../performance-progress.mjs';
test('unlock needs a workout, a meditation and a food log',()=>{
 const mk=(w,m,f)=>({sessions:w?{a:{}}:{},days:{'2026-10-16':{workout:false,meditation:m,food:f}}});
 assert.equal(unlockStatus(mk(0,0,0)).done,false);
 assert.equal(unlockStatus(mk(1,0,0)).done,false);
 assert.equal(unlockStatus(mk(1,1,0)).done,false);
 const all=unlockStatus(mk(1,1,1));assert.deepEqual([all.workout,all.meditation,all.food,all.done],[true,true,true,true]);
 assert.equal(unlockStatus({sessions:{},days:{x:{workout:true,meditation:true,food:true}}}).done,true);
});
