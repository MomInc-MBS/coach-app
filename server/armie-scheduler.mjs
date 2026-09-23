// D12/D23 catch-up sender: pushes any fired Armie letter to users who have a
// push subscription but haven't opened the app (so nothing called
// combatProgress for them today). Mirrors the shape of runReminders()
// (server/push.mjs).
//
// NOT DEPLOYED. This module is not registered in wrangler's cron triggers or
// called from server/worker.mjs's fetch handler -- it is code only, per the
// brief ("implement the code only; do not deploy the scheduler/Worker").
// Running it for real also needs a small persistence table (e.g.
// `armie_letter_deliveries(user_id, date, letter_id)`, mirroring the existing
// `deliveries` table for reminders) to make `alreadySent`/`markSent`
// idempotent across runs; that migration was deliberately not added here to
// avoid touching drizzle/ (shared, auto-applied by the D1 test harness) for a
// job nothing schedules yet. `alreadySent`/`markSent`/`send` are injected so
// the day-by-day letter logic can be exercised without that table -- see
// tests/armie-scheduler.test.mjs.
import {dayAt} from '../combat.mjs';
import {evaluateStreakHistory} from '../streak-forgiveness.mjs';
import {sendArmieLetterPush} from './armie-push.mjs';

const staleError = error => ['stale_delivery', 'target_epoch_mismatch'].includes(error?.code);

export async function runArmieLetterScheduler(env, database, {now = Date.now(), alreadySent, markSent, send = sendArmieLetterPush} = {}) {
 const day = dayAt(now);
 const users = (await database.prepare('SELECT DISTINCT user_id FROM login_days WHERE day<=?').bind(day).all()).results;
 let sent = 0, failed = 0;
 for (const {user_id: user} of users) {
  const subs = (await database.prepare('SELECT * FROM subscriptions WHERE user_id=?').bind(user).all()).results;
  if (!subs.length) continue;
  const epochRow = await database.prepare('SELECT epoch FROM account_data_epochs WHERE owner_id=?').bind(user).first();
  const dataEpoch = epochRow?.epoch ?? 1;
  const days = (await database.prepare('SELECT day FROM login_days WHERE user_id=? AND day<=?').bind(user, day).all()).results;
  const history = evaluateStreakHistory(days.map(row => row.day), day);
  for (const dayResult of history) {
   for (const letterId of dayResult.lettersFired) {
    if (await alreadySent(user, dayResult.date, letterId)) continue;
    let delivered = false;
    for (const s of subs) {
     try {
      await send(env, JSON.parse(s.data), dayResult.date, letterId, {ownerId: user, dataEpoch, subscriptionData: s.data, subscriptionCreatedAt: s.created_at});
      delivered = true; sent++;
     } catch (error) { if (!staleError(error)) failed++; }
    }
    if (delivered) await markSent(user, dayResult.date, letterId);
   }
  }
 }
 return {sent, failed};
}
