import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {LEVEL_XP,XP_KNOBS,levelFor,xpFromHistory,playerLevel,BASELINE_KEY} from '../player-level.mjs';

const session=(sets=15)=>XP_KNOBS.dayXp+sets*XP_KNOBS.setXp;
const perDay=session()*XP_KNOBS.sessionsPerWeek/7;
const store=(init={})=>{const m={...init};return {getItem:k=>m[k]??null,setItem:(k,v)=>{m[k]=v;}};};
const server=(activeDays,completedSets)=>({trainingVersion:1,activeDays,completedSets});

test('curve has 21 levels, strictly increasing, and slows down late',()=>{
 assert.equal(LEVEL_XP.length,21);assert.equal(LEVEL_XP[0],0);
 const gaps=LEVEL_XP.slice(1).map((x,i)=>x-LEVEL_XP[i]);
 gaps.forEach(g=>assert.ok(g>0));
 for(let i=1;i<gaps.length;i++)assert.ok(gaps[i]>=gaps[i-1],'gaps never shrink');
 assert.ok(gaps[19]>gaps[0]*5);
});
test('level 2 within the first two typical sessions',()=>{
 assert.equal(levelFor(xpFromHistory({activeDays:1,completedSets:15})).level,2);
 assert.equal(levelFor(xpFromHistory({activeDays:2,completedSets:10})).level,2);
 assert.equal(levelFor(0).level,1);
});
test('level 21 arrives after about a year of 4 sessions/week x 15 sets',()=>{
 const days=LEVEL_XP[20]/perDay;assert.ok(days>=330&&days<=400,String(days));
 const xp=xpFromHistory({activeDays:Math.round(52*4),completedSets:52*4*15});
 assert.equal(levelFor(xp).level,21);assert.equal(levelFor(xp-3000).level<21,true);
 assert.equal(levelFor(1e9).level,21);assert.equal(levelFor(1e9).max,true);
});
test('levelFor reports progress toward the next level',()=>{
 const l=levelFor(LEVEL_XP[1]+10);assert.deepEqual([l.level,l.into,l.need,l.next],[2,10,LEVEL_XP[2]-LEVEL_XP[1],LEVEL_XP[2]]);
});
test('reset: only history after the stored baseline counts; unknown totals are level 1',()=>{
 const s=store();
 assert.equal(playerLevel(server(300,4000),s).level,1,'veteran starts at level 1');
 assert.ok(s.getItem(BASELINE_KEY));
 assert.equal(playerLevel(server(300,4000),s).xp,0);
 const after=playerLevel(server(301,4015),s);assert.equal(after.xp,session());assert.equal(after.level,2);
 assert.equal(playerLevel({activeDays:999,completedSets:99999},store()).level,1,'no server totals');
 assert.equal(playerLevel(server(10,10),store({[BASELINE_KEY]:JSON.stringify({activeDays:50,completedSets:50})})).xp,0,'never negative');
});
test('weapon tier N is gated by level N+1 for every weapon',()=>{
 const ctx={window:{}};ctx.localStorage=store({[BASELINE_KEY]:JSON.stringify({activeDays:0,completedSets:0})});
 vm.runInNewContext(readFileSync(new URL('../workout-tracks.js',import.meta.url),'utf8'),ctx);
 vm.runInNewContext(readFileSync(new URL('../pod/gala-weapons.js',import.meta.url),'utf8'),ctx);
 const W=ctx.window.GalaWeapons,at=lv=>server(0,LEVEL_XP[lv-1]/XP_KNOBS.setXp);
 for(const {id} of W.types){
  assert.equal(W.unlocked({type:id,tier:0},{}),true);
  assert.equal(W.unlocked({type:id,tier:1},at(1)),false);assert.equal(W.unlocked({type:id,tier:1},at(2)),true);
  assert.equal(W.unlocked({type:id,tier:20},at(20)),false);assert.equal(W.unlocked({type:id,tier:20},at(21)),true);
 }
 assert.equal(W.requirements({type:'bow',tier:1}).label,'Level 2');
 assert.equal(W.unlocked({type:'bow',tier:3},at(4)),true,'special tier 4 = level 5 follows level');
 assert.equal(W.unlocked({type:'bow',tier:4},at(4)),false);
});
