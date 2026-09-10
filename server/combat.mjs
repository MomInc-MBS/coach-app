import {dayAt,DAY_MS,BREATHING_MS,loginStreak} from '../combat.mjs';
import {fail,uuid} from './domain.mjs';

export async function combatProgress(database,user,now=Date.now()){
 const day=dayAt(now);
 await database.prepare('INSERT INTO login_days(user_id,day,logged_at) VALUES(?,?,?) ON CONFLICT(user_id,day) DO NOTHING').bind(user,day,now).run();
 // Earlier completed workouts are evidence of a signed-in day. No other
 // historical logins are invented when introducing streak tracking.
 const days=(await database.prepare('SELECT day FROM login_days WHERE user_id=? AND day<=? UNION SELECT CAST(completed_at/86400000 AS INTEGER) AS day FROM workouts WHERE user_id=? AND completed_at IS NOT NULL AND completed_at<? ORDER BY day DESC').bind(user,day,user,(day+1)*DAY_MS).all()).results;
 const breathing=await database.prepare('SELECT id FROM breathing_sessions WHERE user_id=? AND completed_at>=? AND completed_at<? LIMIT 1').bind(user,day*DAY_MS,(day+1)*DAY_MS).first();
 return {day,loginStreak:loginStreak(days.map(row=>row.day),day),breathingCompleted:!!breathing};
}
export async function startBreathing(database,user,now=Date.now()){
 const recent=await database.prepare('SELECT id,started_at FROM breathing_sessions WHERE user_id=? AND completed_at IS NULL AND started_at>? ORDER BY started_at DESC LIMIT 1').bind(user,now-5000).first();
 if(recent)return {id:recent.id,startedAt:recent.started_at,durationMs:BREATHING_MS};
 const id=crypto.randomUUID();
 await database.prepare('INSERT INTO breathing_sessions(id,user_id,started_at) VALUES(?,?,?)').bind(id,user,now).run();
 return {id,startedAt:now,durationMs:BREATHING_MS};
}
export async function completeBreathing(database,user,value,now=Date.now()){
 const id=uuid(value.id),session=await database.prepare('SELECT * FROM breathing_sessions WHERE id=? AND user_id=?').bind(id,user).first();
 if(!session)fail('Breathing session not found.',404);
 if(session.completed_at==null){
  const elapsed=now-session.started_at;
  if(elapsed<BREATHING_MS||elapsed>2*60*60*1000||!Number.isFinite(value.activeMs)||value.activeMs<BREATHING_MS||value.activeMs>elapsed+1000)fail('Finish the full three-minute breathing session first.');
  await database.prepare('UPDATE breathing_sessions SET completed_at=? WHERE id=? AND user_id=? AND completed_at IS NULL').bind(now,id,user).run();
 }
 return combatProgress(database,user,now);
}
