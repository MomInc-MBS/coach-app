import test from 'node:test';
import assert from 'node:assert/strict';
import {revealRadius} from '../breathing.mjs';

test('revealRadius returns 100% at final breath',()=>{
 assert.strictEqual(revealRadius(30,30,50),'100%');
});

test('revealRadius returns 0% at start',()=>{
 assert.strictEqual(revealRadius(0,30,50),'0%');
});

test('revealRadius calculates midpoint correctly',()=>{
 assert.strictEqual(revealRadius(15,30,50),'50%');
});

test('revealRadius clamps negative values to 0%',()=>{
 assert.strictEqual(revealRadius(-5,30,50),'0%');
});

test('revealRadius clamps values over 100 to 100%',()=>{
 assert.strictEqual(revealRadius(35,30,50),'100%');
});
