import test from 'node:test';
import assert from 'node:assert/strict';
import {SetFlow,COACH_HEALTH} from '../pod/set-flow.mjs';

test('rest waits for its full timer and then three idle seconds',()=>{
 const flow=new SetFlow();flow.previewRest(0,30);
 assert.equal(flow.shouldEndRest(29999),false);assert.equal(flow.shouldEndRest(30000),false);
 assert.equal(flow.shouldEndRest(32999),false);assert.equal(flow.shouldEndRest(33000),true);
});
test('tapping can keep an expired rest open indefinitely without earning XP',()=>{
 const flow=new SetFlow();flow.previewRest(0,30);
 for(let now=32000;now<=2000000;now+=2000){flow.tap(now);assert.equal(flow.shouldEndRest(now+2999),false);}
 assert.equal(flow.shouldEndRest(flow.lastRestInteraction+3000),true);assert.equal(flow.xp,0);
});
test('touches count as activity without bypassing attack cooldown or manual rest extensions',()=>{
 const flow=new SetFlow();flow.previewRest(0,30);flow.tap(32000);assert.equal(flow.tap(32050),null);
 assert.equal(flow.shouldEndRest(35000),false);assert.equal(flow.shouldEndRest(35050),true);
 flow.extend(30,34000);assert.equal(flow.shouldEndRest(66999),false);assert.equal(flow.shouldEndRest(67000),true);
 flow.leave();assert.equal(flow.shouldEndRest(999999),false);flow.previewRest(0,30);assert.equal(flow.shouldEndRest(33000),true);
});
test('a completed set starts the same rest grace period',()=>{
 const flow=new SetFlow();flow.start('squat',3,30);flow.consume({mode:'squat',name:'Squats',kind:'reps',count:3},1000);
 assert.equal(flow.shouldEndRest(33999),false);assert.equal(flow.shouldEndRest(34000),true);
});
test('Coach has one billion HP and both damage accumulation and overkill display correctly',()=>{
 const flow=new SetFlow();flow.previewRest(0);assert.equal(flow.coachHealth,1_000_000_000);
 const hit=flow.tap(200);assert.equal(hit.damage,10);assert.equal(flow.coachHealth,COACH_HEALTH-10);
 flow.damage=COACH_HEALTH+100;assert.equal(flow.coachHealth,0);flow.previewRest(1000);assert.equal(flow.coachHealth,COACH_HEALTH);
});
