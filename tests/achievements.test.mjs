import test from 'node:test';
import assert from 'node:assert/strict';
import {achievementBoards} from '../achievements.mjs';
import {clockDigits,countDigits} from '../flip-display.mjs';
test('records rank only within their tracking unit and preserve tied ranks',()=>{
 const boards=achievementBoards([{mode:'squat',sets:2,best:10,total:20},{mode:'pushup',sets:1,best:10,total:10},{mode:'tree',sets:1,best:30,total:30},{mode:'jogging',sets:1,best:100,total:100}]);
 assert.deepEqual(boards.map(b=>b.kind),['reps','hold','steps','jumps','pace']);
 assert.equal(boards[0].total,30);assert.deepEqual(boards[0].rows.filter(r=>r.sets).map(r=>r.rank),[1,1]);
 assert.equal(boards[1].total,30);assert.equal(boards[1].rows[0].mode,'tree');assert.equal(boards[1].rows[1].rank,null);
 assert.equal(boards[2].total,100);assert.equal(boards[3].total,0);assert(boards[3].rows.every(r=>!r.sets));
});
test('clock and count faces carry digits correctly without rounding up early',()=>{
 assert.equal(countDigits(9),'09');assert.equal(countDigits(100),'100');assert.equal(countDigits(0),'00');
 assert.equal(clockDigits(59.99),'00:59');assert.equal(clockDigits(60),'01:00');assert.equal(clockDigits(3600),'60:00');assert.equal(clockDigits(-1),'00:00');
});
