import test from 'node:test';
import assert from 'node:assert/strict';
import {revealRadius} from '../breathing.mjs';

test('revealRadius returns maxR at final breath (30 breaths, 380px max)',()=>{
 assert.strictEqual(revealRadius(30,30,380),'380px');
});

test('revealRadius returns 0px at start',()=>{
 assert.strictEqual(revealRadius(0,30,380),'0px');
});

test('revealRadius calculates midpoint correctly',()=>{
 assert.strictEqual(revealRadius(15,30,380),'190px');
});

test('revealRadius clamps negative values to 0px',()=>{
 assert.strictEqual(revealRadius(-5,30,380),'0px');
});

test('revealRadius clamps values over total to maxR',()=>{
 assert.strictEqual(revealRadius(35,30,380),'380px');
});

test('revealRadius is linear across the range',()=>{
 const total=30,maxR=380;
 for(let i=0;i<=total;i++){
  const result=parseInt(revealRadius(i,total,maxR));
  const expected=Math.round((i/total)*maxR);
  assert.strictEqual(result,expected,`at breath ${i}/${total}`);
 }
});
