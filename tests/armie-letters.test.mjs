import test from 'node:test';
import assert from 'node:assert/strict';
import {armieLetters, pickArmieLetter} from '../armie-letters.mjs';

const LETTER_IDS = ['forgive-1', 'forgive-2', 'forgive-3-limit', 'forgive-off-warning', 'streak-broken-after-limit', 'streak-broken', 'forgive-restored', 'milestone-5', 'milestone-10', 'milestone-15'];

test('every D12 letter id used by the streak evaluator has copy with 3 variants', () => {
 for (const id of LETTER_IDS) {
  assert.ok(Array.isArray(armieLetters[id]) && armieLetters[id].length === 3, id);
  for (const variant of armieLetters[id]) {
   assert.equal(typeof variant.header, 'string');
   assert.ok(Array.isArray(variant.lines) && variant.lines.length === 3);
  }
 }
});

test('pickArmieLetter is deterministic for the same (letterId, seed) and covers all variants', () => {
 const a = pickArmieLetter('milestone-5', '2026-10-09');
 const b = pickArmieLetter('milestone-5', '2026-10-09');
 assert.deepEqual(a, b);
 assert.equal(a.letterId, 'milestone-5');
 const seen = new Set();
 for (let i = 0; i < 50; i++) seen.add(pickArmieLetter('forgive-1', `seed-${i}`).header);
 assert.ok(seen.size > 1, 'expected more than one variant to show up across seeds');
});

test('pickArmieLetter returns null for an unknown id instead of throwing', () => {
 assert.equal(pickArmieLetter('not-a-real-letter'), null);
});
