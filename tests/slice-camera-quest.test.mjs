import test from 'node:test';
import assert from 'node:assert/strict';
import {createFruitStreakReporter} from '../arcade/slice/camera-slice.mjs';

test('Fruit Ninja combo reports bounded max streak under its captured workout owner',async()=>{
 globalThis.myr5AuthenticatedAccount={user:{id:'run-start'}};
 const writes=[],report=createFruitStreakReporter('account:run-start',async()=>({recordQuestProgress:detail=>writes.push(detail),questProgressStored:()=>false}));
 assert.equal(report(2),false);assert.equal(report(5),true);assert.equal(report(8),true);await new Promise(resolve=>setImmediate(resolve));
 assert.deepEqual(writes,[{ownerId:'account:run-start',counter:'fruit-streak',value:8}], 'pending streaks coalesce to their highest bounded value');
});

test('Fruit Ninja never loads or writes quest progress without a captured owner',()=>{
 let loads=0;const report=createFruitStreakReporter(null,async()=>{loads++;return {recordQuestProgress(){}};});
 assert.equal(report(5),false);assert.equal(loads,0);
});
