// D12 streak/forgiveness rules (see DECISIONS.md D12, "D12 detailed rules" R1-R7,
// and "D12 letters" table). This is the ONE place that implements those rules —
// combat.mjs's loginStreak() delegates here instead of re-deriving them; do not
// add a second streak calculation anywhere else.
//
// Input: an ordered array of day records `{date, status, timezone?}` where
// `date` is that day's LOCAL calendar date as 'YYYY-MM-DD' (R1: already resolved
// by the caller using the timezone recorded for that day — this module does no
// timezone math of its own, it just groups by calendar date) and `status` is
// 'kept' or 'missed'. `timezone` is accepted and ignored by the date math (it
// exists so callers can carry it through for their own records); a repeated
// `date` (R2, e.g. a day that repeats after crossing back over the date line)
// is folded into a single day, keeping the first entry seen for that date.
//
// Output: one result per unique day, in input order:
//   { date, streak, forgivenWeeksInARow, forgivenessAvailableThisWeek,
//     auraMilestone, lettersFired }
// matching plan/muse/streak-test-vectors.json's expectedAfterEachDay shape.

const FORGIVE_BY_START_COUNT = ['forgive-1', 'forgive-2', 'forgive-3-limit'];

const toUTCDate = ds => { const [y, m, d] = ds.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); };
const isoDate = dt => dt.toISOString().slice(0, 10);
// Monday-start week key for a local calendar date (R2).
const weekOf = ds => { const dt = toUTCDate(ds); dt.setUTCDate(dt.getUTCDate() - (dt.getUTCDay() + 6) % 7); return isoDate(dt); };
const isSunday = ds => toUTCDate(ds).getUTCDay() === 0;

export function evaluateStreakDays(days) {
 let streak = 0, cnt = 0, forgivenThisWeek = false, brokeThisWeek = false, cntStartWeek = 0, curWeek = null;
 const seen = new Set(), out = [];
 for (const day of days) {
  const ds = day.date;
  if (seen.has(ds)) continue;
  seen.add(ds);
  const week = weekOf(ds);
  if (week !== curWeek) { curWeek = week; forgivenThisWeek = false; brokeThisWeek = false; cntStartWeek = cnt; }
  const letters = [];
  let keptOrForgiven = false;
  if (day.status === 'kept') {
   streak += 1; keptOrForgiven = true;
  } else {
   // R4: forgiven only if nothing forgiven yet this week, the 3-week limit
   // hasn't been hit, and the streak hasn't already broken this week (R4c).
   const forgivable = !forgivenThisWeek && cnt < 3 && !brokeThisWeek;
   if (forgivable) {
    streak += 1; forgivenThisWeek = true; keptOrForgiven = true;
    const letter = FORGIVE_BY_START_COUNT[cntStartWeek];
    if (letter) letters.push(letter);
   } else {
    letters.push(cnt === 3 && !forgivenThisWeek && !brokeThisWeek ? 'streak-broken-after-limit' : 'streak-broken');
    streak = 0; cnt = 0; brokeThisWeek = true;
   }
  }
  // R7: aura milestone on a kept-or-forgiven day whose streak is a positive multiple of 5.
  const auraMilestone = (keptOrForgiven && streak > 0 && streak % 5 === 0) ? streak : null;
  if (auraMilestone === 5 || auraMilestone === 10 || auraMilestone === 15) letters.push(`milestone-${auraMilestone}`);
  if (isSunday(ds)) {
   // R5: forgivenWeeksInARow only changes at week end.
   if (brokeThisWeek) cnt = 0;
   else if (forgivenThisWeek) cnt += 1;
   else { const hadCount = cnt > 0; cnt = 0; if (hadCount) letters.push('forgive-restored'); }
   if (cnt === 3) letters.push('forgive-off-warning');
  }
  // R6, reported after every day (its Sunday value already reflects the week-end update above).
  const forgivenessAvailableThisWeek = !forgivenThisWeek && cnt < 3 && !brokeThisWeek;
  out.push({ date: ds, streak, forgivenWeeksInARow: cnt, forgivenessAvailableThisWeek, auraMilestone, lettersFired: letters });
 }
 return out;
}

// Adapter for the account server's login_days rows (integer day numbers, UTC,
// same as combat.mjs dayAt). Returns one result per day from the account's
// first known day through `today` -- the full history, because a letter (e.g.
// a forgiven miss) fires on the day it happens even if nothing calls in again
// until days later. Empty when `today` itself is not a kept day.
// ponytail: login_days has no timezone column yet, so each UTC day number is
// treated as the local date (R1/R2 not yet per-user). Upgrade path: record the
// device timezone with each login and pass real local dates to
// evaluateStreakDays instead of calling this.
export function evaluateStreakHistory(dayNumbers, today) {
 const kept = new Set(dayNumbers.map(Number));
 if (!kept.has(today)) return [];
 const records = [];
 for (let d = Math.min(today, ...kept); d <= today; d++) records.push({ date: isoDate(new Date(d * 86400000)), status: kept.has(d) ? 'kept' : 'missed' });
 return evaluateStreakDays(records);
}
