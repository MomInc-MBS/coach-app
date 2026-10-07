import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {COACH_REQUIREMENTS} from '../performance-catalog.mjs';
import {pickCoaches,coachPath,nearestStatue,residentWindow,stopAt,cardModel,firstUnearned,isEarned,GAP} from '../modules/vault/vault-hall.mjs';
const goals=Array.from({length:12},(_,i)=>({id:'g'+i,clue:'c'+i,title:'T'+i,tier:'rare',test:s=>!!s.earned?.['g'+i],progress:()=>({have:3,need:10})}));
test('statues use the highest unlock-level coaches working down, no repeats, last = highest',()=>{
 const R={easy:0,medium:1,hard:2,expert:3},n=40,ids=pickCoaches(n,COACH_REQUIREMENTS);
 assert.equal(ids.length,n);assert.equal(new Set(ids).size,n);
 const lv=ids.map(id=>R[COACH_REQUIREMENTS.find(c=>c.id===id).difficulty]);
 assert.deepEqual(lv,[...lv].sort((a,b)=>a-b));assert.equal(lv.at(-1),3);
 const dropped=COACH_REQUIREMENTS.filter(c=>!ids.includes(c.id)).map(c=>R[c.difficulty]);assert.ok(Math.max(...dropped)<=lv[0]);
 for(const id of ids)assert.ok(fs.existsSync(new URL('..'+coachPath(id),import.meta.url)),id);
});
test('at most 5 statues resident at any position',()=>{
 for(let c=0;c<40;c++){const w=residentWindow(c,40);assert.ok(w.length<=5&&w.includes(c));assert.ok(w.every(i=>i>=c-1&&i<=c+3));}
 assert.deepEqual(residentWindow(0,3),[0,1,2]);
});
test('walking to statue k selects card k',()=>{
 for(let k=0;k<12;k++){assert.equal(nearestStatue(stopAt(k),12),k);}
 assert.equal(nearestStatue(stopAt(2)+GAP/2,12),-1);
});
test('earned vs locked card, progress, next',()=>{
 const st={earned:{g0:{at:Date.parse('2026-10-06')}}};
 assert.equal(firstUnearned(goals,st),1);assert.equal(isEarned(goals[0],st),true);
 const e=cardModel(goals[0],st,['reward-pack:rare:vault-g0']),l=cardModel(goals[1],st);
 assert.ok(e.earned&&e.title==='T0'&&e.date&&e.pack);assert.ok(!l.earned&&l.title==='???'&&l.clue==='c1'&&l.progress.have===3&&l.progress.need===10);
 assert.equal(cardModel(goals[1],{}).pack,null);
 assert.equal(firstUnearned(goals,{}),0);
});
