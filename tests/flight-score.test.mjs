import assert from 'node:assert/strict';
import test from 'node:test';
import {createFlightScore} from '../flight-score.mjs';
test('consecutive hits earn increasing points until a missed asteroid resets the multiplier',()=>{
 const run=createFlightScore();
 assert.deepEqual(run.read(),{hits:0,score:0,multiplier:1});
 assert.deepEqual(run.hit(),{hits:1,score:1,multiplier:2});
 assert.deepEqual(run.hit(),{hits:2,score:3,multiplier:3});
 assert.deepEqual(run.hit(),{hits:3,score:6,multiplier:4});
 assert.deepEqual(run.miss(),{hits:3,score:6,multiplier:1});
 assert.deepEqual(run.hit(),{hits:4,score:7,multiplier:2});
 assert.deepEqual(run.reset(),{hits:0,score:0,multiplier:1});
});
