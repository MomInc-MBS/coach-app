import {db} from './db.mjs';
import {fail} from './domain.mjs';

export const remoteReminders = env => !!env.REMINDER_SERVICE_ORIGIN;

export async function reminderService(env, user, path, method = 'GET', data) {
  if (!env.REMINDER_SERVICE_TOKEN) fail('The reminder service is not connected.', 503);
  const origin = new URL(env.REMINDER_SERVICE_ORIGIN);
  if (origin.protocol !== 'https:' || origin.pathname !== '/' || origin.username || origin.password) fail('Invalid reminder service configuration.', 503);
  let response;
  try {
    response = await fetch(new URL(path, origin), {
      method,
      headers: {'Authorization': `Bearer ${env.REMINDER_SERVICE_TOKEN}`, 'X-Coach-User': user, 'Content-Type': 'application/json'},
      body: data === undefined ? undefined : JSON.stringify(data),
      redirect: 'error', signal: AbortSignal.timeout(25000)
    });
  } catch(error) { console.error('Reminder connection failed',String(error?.message||'Network error'));fail('The reminder service is temporarily unavailable. Please try again.', 503); }
  if (!response.headers.get('content-type')?.includes('application/json')) {console.error('Reminder connection returned a non-JSON response',response.status,response.headers.get('content-type'));fail('The reminder service is temporarily unavailable.', 503);}
  const result = await response.json();
  if (!response.ok) fail(result.error || 'Could not save your reminder. Please try again.', response.status);
  return result;
}

// Preserve reminders saved before the independent sender was connected. Both
// sides record completion, so retries cannot bring back subsequently deleted data.
export async function ensureReminderMigration(env, user) {
  const database = db(env), key = `reminders_remote:${user}`;
  if (await database.prepare('SELECT value FROM system WHERE key=?').bind(key).first()) return;
  const reminders = (await database.prepare('SELECT * FROM reminders WHERE user_id=?').bind(user).all()).results;
  const subscriptions = (await database.prepare('SELECT data FROM subscriptions WHERE user_id=?').bind(user).all()).results.map(s => JSON.parse(s.data));
  await reminderService(env, user, '/internal/import', 'POST', {reminders, subscriptions});
  await database.prepare('INSERT INTO system(key,value) VALUES(?,?) ON CONFLICT(key) DO NOTHING').bind(key, String(Date.now())).run();
}
