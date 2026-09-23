import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {evaluateStreakDays, evaluateStreakHistory} from '../streak-forgiveness.mjs';

// Byte-identical copy of plan/muse/streak-test-vectors.json. Never edit it: a
// disagreement is a bug to report.
const vectorFile = JSON.parse(await readFile(new URL('./fixtures/armie-streak-test-vectors.json', import.meta.url), 'utf8'));
const byId = Object.fromEntries(vectorFile.scenarios.map(s => [s.id, s]));

for (const scenario of vectorFile.scenarios) {
 test(`streak vector: ${scenario.id}`, () => {
  const got = evaluateStreakDays(scenario.days);
  assert.equal(got.length, scenario.expectedAfterEachDay.length, `${scenario.id}: unexpected day count`);
  for (let i = 0; i < got.length; i++) assert.deepEqual(got[i], scenario.expectedAfterEachDay[i], `${scenario.id} day ${scenario.expectedAfterEachDay[i].date}`);
 });
}
test('all 25 Muse streak scenarios are present', () => assert.equal(vectorFile.scenarios.length, 25));

// The brief's named boundary cases, pinned by id so each one is explicit.
const run = id => { assert.ok(byId[id], `missing vector ${id}`); return evaluateStreakDays(byId[id].days); };

test('boundary: Sunday 23:59 and Monday 00:00 misses are different weeks, each forgiven', () => {
 const out = run('s03-sunday-midnight-boundary');
 assert.deepEqual(out.slice(0, 2).map(d => d.lettersFired), [['forgive-1'], ['forgive-2']]);
 assert.equal(out[1].streak, 2);
});

test('boundary: DST weeks (25-hour and 23-hour Sundays) are one local day each', () => {
 for (const id of ['s08-dst-fall-back-week', 's09-dst-spring-forward-week']) {
  const out = run(id);
  assert.equal(out.length, 7, id);
  assert.deepEqual(out, byId[id].expectedAfterEachDay, id);
 }
});

test('boundary: mid-week timezone change keeps each day on its own recorded local date', () => {
 for (const id of ['s10-travel-ny-to-la', 's11-travel-tokyo-to-london', 's12-repeated-date-one-day', 's13-skipped-date-not-missed', 's18-sydney-user'])
  assert.deepEqual(run(id), byId[id].expectedAfterEachDay, id);
});

test('boundary: 3-week forgiveness limit then a miss breaks the streak', () => {
 const breakDay = run('s05-three-weeks-then-miss-breaks').find(r => r.lettersFired.includes('streak-broken-after-limit'));
 assert.ok(breakDay);
 assert.equal(breakDay.streak, 0);
 assert.equal(breakDay.forgivenWeeksInARow, 0);
});

test('boundary: limit, then a clean week, then a forgiven miss', () => {
 const out = run('s06-limit-clean-week-forgiven');
 const restored = out.findIndex(r => r.lettersFired.includes('forgive-restored'));
 assert.ok(restored >= 0);
 assert.ok(out.slice(restored + 1).some(r => r.lettersFired.includes('forgive-1')));
});

test('boundary: two misses in one week always breaks the streak', () => {
 const breakDay = run('s04-two-misses-one-week').find(r => r.lettersFired.includes('streak-broken'));
 assert.ok(breakDay);
 assert.equal(breakDay.streak, 0);
});

test('account-server adapter: day numbers map to UTC dates, gaps become misses, today must be kept', () => {
 const monday = Date.UTC(2026, 9, 5) / 86400000; // 2026-10-05 is a Monday
 const out = evaluateStreakHistory([monday, monday + 2], monday + 2);
 assert.deepEqual(out.map(d => [d.date, d.streak, d.lettersFired]), [['2026-10-05', 1, []], ['2026-10-06', 2, ['forgive-1']], ['2026-10-07', 3, []]]);
 assert.deepEqual(evaluateStreakHistory([monday], monday + 1), []);
});
