import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {Miniflare} from 'miniflare';
import {DAY_MS} from '../combat.mjs';
import {combatProgress} from '../server/combat.mjs';

// Fake-clock replay of the Muse vectors through the REAL consumer
// (server/combat.mjs on a persisted D1 database). Every kept day is one
// "reopen": a fresh combatProgress call at a faked `now` that only sees what
// earlier days persisted. Sundays are opened at 23:59:59.999 and Mondays at
// 00:00:00.000 so the week boundary is crossed on the tightest possible clock.
// The consumer keys days by UTC (login_days has no timezone yet), so vectors
// that record per-day timezones are covered only by streak-forgiveness.test.mjs.
const vectors = JSON.parse(await readFile(new URL('./fixtures/armie-streak-test-vectors.json', import.meta.url), 'utf8')).scenarios;
const dayNumber = date => Date.parse(date + 'T00:00:00Z') / DAY_MS;
const replayable = s => s.days[0].status === 'kept' && !s.days.some(d => d.timezone) && s.days.every((d, i) => !i || dayNumber(d.date) === dayNumber(s.days[i - 1].date) + 1);

let mf,database;
before(async () => {
 mf = new Miniflare({modules: true, script: 'export default {fetch(){return new Response("ok")}}', d1Databases: ['DB']});
 database = await mf.getD1Database('DB');
 for (const file of (await readdir('drizzle')).filter(f => f.endsWith('.sql')).sort())
  for (const sql of (await readFile('drizzle/' + file, 'utf8')).split('--> statement-breakpoint').filter(s => s.trim()))
   await database.prepare(sql).run();
});
after(async () => mf?.dispose());

// Opening the app is what keeps a day, so a missed day is simply a day with no
// call. Sunday opens at 23:59:59.999, Monday at 00:00:00.000, others at noon.
const openAt = date => { const weekday = new Date(date + 'T00:00:00Z').getUTCDay(); return dayNumber(date) * DAY_MS + (weekday === 0 ? DAY_MS - 1 : weekday === 1 ? 0 : DAY_MS / 2); };
async function live(user, firstMonday, weeks) {
 const out = {}; let d = dayNumber(firstMonday);
 for (const week of weeks) for (const mark of week) { const date = new Date(d++ * DAY_MS).toISOString().slice(0, 10); if (mark === 'K') out[date] = await combatProgress(database, user, openAt(date)); }
 return out;
}
const pending = (got, date, id) => got.pendingLetters.some(p => p.date === date && p.id === id);
const MISS_TUE = 'KMKKKKK', CLEAN = 'KKKKKKK';

// Vectors s04-s06 begin with a missed Monday, which a real account cannot have
// (its history starts at its first login), so these run the same rules live.
test('live: 3-week forgiveness limit, then a miss breaks the streak', async () => {
 const got = await live('fc-limit-break', '2026-10-05', [MISS_TUE, MISS_TUE, MISS_TUE, MISS_TUE]);
 assert.equal(got['2026-10-11'].forgivenWeeksInARow, 1);
 assert.equal(got['2026-10-18'].forgivenWeeksInARow, 2);
 assert.ok(pending(got['2026-10-21'], '2026-10-20', 'forgive-3-limit'));
 assert.equal(got['2026-10-25'].forgivenWeeksInARow, 3);
 assert.ok(got['2026-10-25'].lettersFired.includes('forgive-off-warning'));
 assert.equal(got['2026-10-25'].loginStreak, 21);
 assert.equal(got['2026-10-26'].forgivenessAvailableThisWeek, false);
 assert.equal(got['2026-10-28'].loginStreak, 1);
 assert.ok(pending(got['2026-10-28'], '2026-10-27', 'streak-broken-after-limit'));
});

test('live: limit, then a clean week restores forgiveness, then a miss is forgiven', async () => {
 const got = await live('fc-limit-clean', '2026-10-05', [MISS_TUE, MISS_TUE, MISS_TUE, CLEAN, MISS_TUE]);
 assert.ok(got['2026-11-01'].lettersFired.includes('forgive-restored'));
 assert.equal(got['2026-11-01'].forgivenWeeksInARow, 0);
 assert.ok(pending(got['2026-11-04'], '2026-11-03', 'forgive-1'));
 assert.equal(got['2026-11-04'].loginStreak, 31);
});

test('live: two misses in one week break the streak', async () => {
 const got = await live('fc-two-misses', '2026-10-05', ['KMKMKKK']);
 assert.ok(pending(got['2026-10-07'], '2026-10-06', 'forgive-1'));
 assert.equal(got['2026-10-09'].loginStreak, 1);
 assert.ok(pending(got['2026-10-09'], '2026-10-08', 'streak-broken'));
 assert.equal(got['2026-10-11'].forgivenWeeksInARow, 0);
});

test('live: an open at Sunday 23:59:59.999 counts for Sunday, not the next week', async () => {
 // Sat missed (forgiven), Sun opened at 23:59:59.999, Mon missed. If the Sunday
 // open leaked into Monday, Sunday would be a second miss and break the streak.
 const got = await live('fc-midnight', '2026-10-05', ['KKKKKMK', 'MKKKKKK']);
 assert.equal(got['2026-10-11'].loginStreak, 7);
 assert.equal(got['2026-10-11'].forgivenWeeksInARow, 1);
 assert.equal(got['2026-10-13'].loginStreak, 9);
 assert.ok(pending(got['2026-10-13'], '2026-10-12', 'forgive-2'));
});

for (const scenario of vectors.filter(replayable)) {
 test(`fake-clock replay through combatProgress: ${scenario.id}`, async () => {
  const user = 'fc-' + scenario.id;
  let missedLetters = [];
  scenario.days.forEach((day, i) => { day.expected = scenario.expectedAfterEachDay[i]; });
  for (const day of scenario.days) {
   if (day.status === 'missed') { missedLetters.push(...day.expected.lettersFired.map(id => ({date: day.date, id}))); continue; }
   const weekday = new Date(day.date + 'T00:00:00Z').getUTCDay();
   const now = dayNumber(day.date) * DAY_MS + (weekday === 0 ? DAY_MS - 1 : weekday === 1 ? 0 : DAY_MS / 2);
   const got = await combatProgress(database, user, now);
   const e = day.expected;
   assert.deepEqual({streak: got.loginStreak, forgivenWeeksInARow: got.forgivenWeeksInARow, forgivenessAvailableThisWeek: got.forgivenessAvailableThisWeek, auraMilestone: got.auraMilestone, lettersFired: got.lettersFired},
    {streak: e.streak, forgivenWeeksInARow: e.forgivenWeeksInARow, forgivenessAvailableThisWeek: e.forgivenessAvailableThisWeek, auraMilestone: e.auraMilestone, lettersFired: e.lettersFired}, `${scenario.id} ${day.date}`);
   // Letters fired on missed days (nobody opened the app) arrive on this reopen.
   for (const letter of missedLetters) assert.ok(got.pendingLetters.some(p => p.date === letter.date && p.id === letter.id), `${scenario.id}: ${letter.id} from ${letter.date} not delivered on ${day.date}`);
   missedLetters = [];
  }
 });
}
