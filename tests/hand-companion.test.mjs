import test from 'node:test';
import assert from 'node:assert/strict';
import {SetFlow} from '../pod/set-flow.mjs';
test('every third hand-assisted strike keeps the exact damage formula without granting XP',()=>{
 const flow=new SetFlow({version:1,completedSets:196});flow.combat={day:0,loginStreak:2,breathingCompleted:false};flow.weapon={type:'gauntlets',tier:0};flow.previewRest(0);
 const before=flow.xp,results=[200,400,600,800,1000,1200].map(t=>flow.tap(t,true));
 assert.deepEqual(results.map(x=>x.damage),[20,20,20,20,20,20]);assert.deepEqual(results.map(x=>x.assisted),[false,false,true,false,false,true]);assert.equal(flow.damage,120);assert.equal(flow.xp,before);assert.equal(flow.remaining(1200),59);
});
test('the hand keeps base damage, tap cooldown, rest exit and encounter reset',()=>{
 const flow=new SetFlow();flow.previewRest(0);flow.tap(200,true);assert.equal(flow.tap(210,true),null);flow.tap(400,true);const third=flow.tap(600,true);assert.equal(third.assisted,true);assert.equal(third.damage,10);assert.equal(third.blocked,false);assert.equal(third.charge,0);assert.equal(flow.xp,0);flow.leave();assert.equal(flow.tap(800,true),null);flow.previewRest(1000);assert.equal(flow.tap(1200,true).hits,1);
});
