import test from 'node:test';
import assert from 'node:assert/strict';
import {COACH_REQUIREMENTS} from '../performance-catalog.mjs';
import {statueCoaches,GOALS,VAULT_GOALS,COUNTER_MODES,newlyEarned} from '../modules/vault/vault-goals.mjs';

test('table: unique ids, valid tiers, cryptic clues, tunables present',()=>{
 assert.equal(new Set(GOALS.map(g=>g.id)).size,GOALS.length);
 for(const g of GOALS){assert.ok(['rare','legendary'].includes(g.tier),g.id);assert.ok(typeof g.clue==='string'&&g.clue.length>0&&!g.clue.startsWith('clue:'),`${g.id} needs real clue`);assert.ok(g.title);}
 assert.ok(VAULT_GOALS.grimMinutes.length===3&&COUNTER_MODES['armie-ignored']==='keyed');
 assert.equal(GOALS.at(-1).id,'unlocked-everything');
});
test('every test() and progress() is total on empty / garbage state',()=>{
 for(const v of [undefined,null,{},{counters:null,snap:5},{snap:{catsHave:null}}])for(const g of GOALS){assert.equal(g.test(v),false,g.id);if(g.progress){const p=g.progress(v);assert.deepEqual(p,{have:0,need:p.need});assert.ok(p.need>=1);}}
});
test('counter goals report have/need and unlock at the threshold',()=>{
 const g=GOALS.find(x=>x.id==='library-10');
 assert.deepEqual(g.progress({counters:{'library-open':3}}),{have:3,need:10});
 assert.equal(g.test({counters:{'library-open':9}}),false);assert.equal(g.test({counters:{'library-open':10}}),true);
 assert.equal(GOALS.find(x=>x.id==='grim-time-1').test({time:{'grim-time':5*60000}}),true);
});
test('secrets, all-six and collection goals',()=>{
 const six={pond:1,wood:1,ice:1,quilt:1,grass:1,jelly:1};
 assert.equal(GOALS.find(x=>x.id==='still-pond').test({secrets:{pond:1}}),true);
 assert.equal(GOALS.find(x=>x.id==='all-six').test({secrets:{...six,jelly:0}}),false);
 assert.equal(GOALS.find(x=>x.id==='all-six').test({secrets:six}),true);
 assert.equal(GOALS.find(x=>x.id==='coach-yoga').test({snap:{catsHave:{yoga:1}}}),true);
 const snap={coachesHave:63,coachesNeed:63,texturedCoaches:63,coloursHave:156,coloursNeed:156,texturesHave:58,texturesNeed:58};
 assert.deepEqual(newlyEarned({snap}).filter(id=>['all-coaches','all-colours','texture-every-coach','unlocked-everything'].includes(id)).sort(),['all-coaches','all-colours','texture-every-coach','unlocked-everything']);
 assert.equal(newlyEarned({snap},{'unlocked-everything':1}).includes('unlocked-everything'),false);
 assert.equal(GOALS.find(x=>x.id==='unlocked-everything').test({snap:{...snap,texturesHave:57}}),false);
});
test('statueCoaches: one distinct coach per goal, hardest goal gets the highest-level coach',()=>{
 const s=statueCoaches(),rank={easy:0,medium:1,hard:2,expert:3},by=Object.fromEntries(COACH_REQUIREMENTS.map(c=>[c.id,c]));
 assert.equal(s.length,GOALS.length);assert.equal(new Set(s.map(x=>x.coachId)).size,GOALS.length);
 assert.deepEqual(s.map(x=>x.goalId),GOALS.map(g=>g.id));
 const r=s.map(x=>rank[by[x.coachId].difficulty]);assert.deepEqual(r,[...r].sort((a,b)=>a-b),'non-decreasing difficulty down the hall');
 assert.equal(r.at(-1),Math.max(...COACH_REQUIREMENTS.map(c=>rank[c.difficulty])));
 assert.equal(GOALS.at(-1).id,'unlocked-everything');
});
