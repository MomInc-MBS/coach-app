import test from 'node:test';
import assert from 'node:assert/strict';
import {buildScript,totalBreaths,breathsDone,revealRadius,GUIDED_ROUND_TIMING as G} from '../breathing-modes.mjs';

test('revealRadius: under maxR until the last breath of the real session script, maxR on it',()=>{
 const script=buildScript('wim-hof'),total=totalBreaths(script),maxR=500;
 assert.equal(total,30);
 for(let done=0;done<total;done++)assert.ok(revealRadius(done,total,maxR)<maxR,'done '+done);
 assert.equal(revealRadius(total,total,maxR),maxR);assert.equal(revealRadius(0,total,maxR),0);
 assert.equal(breathsDone(script,0),0);assert.equal(breathsDone(script,G.settleMs+G.breathMs-1),29);assert.equal(breathsDone(script,G.settleMs+G.breathMs),30);
 assert.equal(breathsDone(script,G.durationMs),30,'the counter never resets between phases');
 const tai=buildScript('tai-chi');assert.equal(breathsDone(tai,1e9),totalBreaths(tai));
});
