// D12/D23 catch-up sender: pushes any fired Armie letter to users who have a
// push subscription but haven't opened the app (so nothing called
// combatProgress for them today). Mirrors the shape of runReminders()
// (server/push.mjs).
//
// Runs from server/worker.mjs scheduled() through runArmieLetterPushes (R8),
// which dedups on drizzle/0021 armie_letter_deliveries(user_id, day, letter_id).
// `alreadySent`/`markSent`/`send` stay injectable for tests/armie-scheduler.test.mjs.
import {dayAt} from '../combat.mjs';
import {evaluateStreakHistory} from '../streak-forgiveness.mjs';
import {sendArmieLetterPush} from './armie-push.mjs';
import {db} from './db.mjs';

const staleError = error => ['stale_delivery', 'target_epoch_mismatch'].includes(error?.code);

export async function runArmieLetterScheduler(env, database, {now = Date.now(), alreadySent, markSent, send = sendArmieLetterPush} = {}) {
 const day = dayAt(now);
 // evaluateStreakHistory fires nothing unless today is kept, so only today's users matter (this runs every minute).
 const users = (await database.prepare('SELECT DISTINCT user_id FROM login_days WHERE day=?').bind(day).all()).results;
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

// Claims (user, day, letter) before sending, so each letter pushes at most once per user, even across
// overlapping cron runs. ponytail: a failed push is not retried; the in-app inbox still has the letter (D23).
export async function runArmieLetterPushes(env, {now = Date.now(), send} = {}) {
 if (!env.VAPID_PRIVATE_KEY) return {sent: 0, failed: 0, configured: false};
 const database = db(env);
 const claimedBefore = async (user, day, letterId) => !(await database.prepare('INSERT INTO armie_letter_deliveries(user_id,day,letter_id,sent_at) VALUES(?,?,?,?) ON CONFLICT DO NOTHING').bind(user, day, letterId, now).run()).meta.changes;
 return runArmieLetterScheduler(env, database, {now, alreadySent: claimedBefore, markSent: async () => {}, ...(send ? {send} : {})});
}
