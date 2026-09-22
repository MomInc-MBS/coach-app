// Trusted owner-bound statements; run only inside reconcileRemoteEpoch's batch.
export function remoteAccountDeletionStatements(db,user){
 return [
  db.prepare('DELETE FROM deliveries WHERE endpoint IN (SELECT endpoint FROM subscriptions WHERE user_id=?) OR reminder_id IN (SELECT id FROM reminders WHERE user_id=?)').bind(user,user),
  ...['reminders','subscriptions','release_subscribers','release_deliveries'].map(table=>db.prepare(`DELETE FROM ${table} WHERE user_id=?`).bind(user)),
  ...['test:','training:','coach-plan:','release-email-user:'].map(prefix=>db.prepare('DELETE FROM system WHERE key=?').bind(prefix+user)),
  // Explicit legacy markers are retained to prevent old bootstrap imports.
  db.prepare("DELETE FROM system WHERE substr(key,1,14)='notify-budget:' AND substr(key,-11,1)=':' AND substr(key,15,length(key)-25)=?").bind(user),
 ];
}
