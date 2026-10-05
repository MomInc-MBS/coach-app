import test from 'node:test';
import assert from 'node:assert/strict';
import {BOSSES,bossStates,coachRequirements,shipRequirements,weaponRequirements} from '../achievements-board.mjs';
import {COACHES,COACH_REQUIREMENTS,STARTER_COACH_IDS,SHIP_REQUIREMENTS} from '../performance-catalog.mjs';
import {readPerformanceProgress,recordPerformanceSession} from '../performance-progress.mjs';
const storage=()=>{const data=new Map();return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};};
test('achievements represents every actual coach exactly once, including starters',()=>{
 assert.deepEqual(BOSSES.map(b=>b.id),COACHES.map(c=>c.id));assert.equal(BOSSES.length,67);
 const state=readPerformanceProgress({storage:storage(),account:null}),rows=bossStates(state);
 assert.equal(rows.filter(b=>b.state==='done').length,STARTER_COACH_IDS.length);
 for(const row of rows)assert(row.requirements.unlock.length>0);
 for(const r of COACH_REQUIREMENTS){const requirement=coachRequirements(r.id);assert.equal(requirement.starter,false);if(!r.groups.includes('meditation')){assert.equal(requirement.difficulty,r.difficulty);assert.deepEqual(requirement.groups,r.groups);}}
});
test('performance ownership and gold are reflected independently of defeat counts and XP',()=>{
 const memory=storage(),options={storage:memory,account:null},state=recordPerformanceSession({id:'gold-hold',mode:'knee-plank',kind:'hold',difficulty:'easy',value:600,activeSeconds:600,maxContinuousSeconds:600,xpBase:0,day:'2026-10-05'},options);
 assert(state.goldenCoaches.length>0);const rows=bossStates(state);for(const id of state.goldenCoaches){assert.equal(rows.find(b=>b.id===id).state,'done');assert.equal(rows.find(b=>b.id===id).golden,true);}
 assert(bossStates({coaches:[],goldenCoaches:[],totalXp:999999,sessions:{},days:{}}).every(b=>b.state==='locked'));
 assert.equal(coachRequirements('unknown'),null);
});
test('all weapon groups have matching five-tier blocks and ships use performance requirements',()=>{
 assert.deepEqual(weaponRequirements('legs').blocks.map(b=>[b.first,b.last]),[[1,5],[6,10],[11,15],[16,20]]);
 assert.deepEqual(shipRequirements().map(s=>s.id),SHIP_REQUIREMENTS.map(s=>s.id));
 for(const ship of shipRequirements())assert.match(ship.unlock,/Expert.+(5 uninterrupted minutes|15 reps)/);
});
