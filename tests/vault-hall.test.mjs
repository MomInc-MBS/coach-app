import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {COACH_FILES,coachFile,nearestStatue,residentWindow,stopAt,cardModel,firstUnearned,isEarned,GAP} from '../modules/vault/vault-hall.mjs';
const goals=Array.from({length:12},(_,i)=>({id:'g'+i,clue:'c'+i,title:'T'+i,tier:'rare',test:s=>!!s.earned?.['g'+i],progress:()=>({have:3,need:10})}));
test('manifest picks the smaller GLB of every coach group and the files exist',()=>{
 const dir=new URL('../creature/models/roster/',import.meta.url),all=fs.readdirSync(dir).filter(f=>f.endsWith('.glb'));
 for(const f of COACH_FILES){const g=f.split('--')[0],size=n=>fs.statSync(new URL(n+'.glb',dir)).size;
  assert.ok(all.includes(f+'.glb'),f);assert.equal(size(f),Math.min(...all.filter(x=>x.startsWith(g+'--')).map(x=>size(x.slice(0,-4)))));}
 assert.equal(coachFile(23),coachFile(0));
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
