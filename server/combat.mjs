import {epochFencedBatch} from './remote-epochs.mjs';
import {dayAt,DAY_MS,BREATHING_MS} from '../combat.mjs';
import {evaluateStreakHistory} from '../streak-forgiveness.mjs';
import {fail,uuid} from './domain.mjs';

export async function combatProgress(database,user,now=Date.now(),{recordLogin=true,dataEpoch=1}={}){
 const day=dayAt(now);
 if(recordLogin)await epochFencedBatch(database,{ownerId:user,expectedDataEpoch:dataEpoch,now,statements:[database.prepare('INSERT INTO login_days(user_id,day,logged_at) VALUES(?,?,?) ON CONFLICT(user_id,day) DO NOTHING').bind(user,day,now)]});
 // Earlier completed workouts are evidence of a signed-in day. No other
 // historical logins are invented when introducing streak tracking.
 const days=(await database.prepare(`SELECT day FROM login_days WHERE user_id=? AND day<=? UNION SELECT CAST(completed_at/86400000 AS INTEGER) AS day FROM workouts WHERE user_id=? AND source='server' AND completed_at IS NOT NULL AND completed_at<? ORDER BY day DESC`).bind(user,day,user,(day+1)*DAY_MS).all()).results;
 const breathing=await database.prepare('SELECT id FROM breathing_sessions WHERE user_id=? AND completed_at>=? AND completed_at<? LIMIT 1').bind(user,day*DAY_MS,(day+1)*DAY_MS).first();
 // D12 forgiveness detail (forgivenWeeksInARow, milestones, fired Armie letter
 // ids) comes from the same evaluator combat.mjs loginStreak() uses.
 const history=evaluateStreakHistory(days.map(row=>row.day),day);
 const latest=history.at(-1)||{streak:0,forgivenWeeksInARow:0,forgivenessAvailableThisWeek:true,auraMilestone:null,lettersFired:[]};
 // A letter can fire on a day nothing else called in on (e.g. the day of a
 // forgiven miss). pendingLetters carries any fired in the last 35 days so a
 // reopen after a gap still delivers them; the inbox dedupes by (date, letter
 // id), so re-seeing an already-delivered one here is a no-op.
 // ponytail: bounded recompute each call, not a persisted "already sent"
 // cursor -- fine at this data scale, revisit if per-user history gets huge.
 const pendingLetters=history.filter(d=>d.lettersFired.length&&dayAt(Date.parse(d.date))>=day-35).flatMap(d=>d.lettersFired.map(id=>({date:d.date,id})));
 return {day,loginStreak:latest.streak,forgivenWeeksInARow:latest.forgivenWeeksInARow,forgivenessAvailableThisWeek:latest.forgivenessAvailableThisWeek,auraMilestone:latest.auraMilestone,lettersFired:latest.lettersFired,pendingLetters,breathingCompleted:!!breathing};
}
export async function startBreathing(database,user,now=Date.now(),{dataEpoch=1}={}){
 const recent=await database.prepare('SELECT id,started_at FROM breathing_sessions WHERE user_id=? AND completed_at IS NULL AND started_at>? ORDER BY started_at DESC LIMIT 1').bind(user,now-5000).first();
 if(recent){await epochFencedBatch(database,{ownerId:user,expectedDataEpoch:dataEpoch,now,statements:[]});return {id:recent.id,startedAt:recent.started_at,durationMs:BREATHING_MS};}
 const id=crypto.randomUUID();
 await epochFencedBatch(database,{ownerId:user,expectedDataEpoch:dataEpoch,now,statements:[database.prepare('INSERT INTO breathing_sessions(id,user_id,started_at) VALUES(?,?,?)').bind(id,user,now)]});
 return {id,startedAt:now,durationMs:BREATHING_MS};
}
export async function completeBreathing(database,user,value,now=Date.now(),{dataEpoch=1}={}){
 const id=uuid(value.id),session=await database.prepare('SELECT * FROM breathing_sessions WHERE id=? AND user_id=?').bind(id,user).first();
 if(!session)fail('Breathing session not found.',404);
 if(session.completed_at==null){
  const elapsed=now-session.started_at;
  if(elapsed<BREATHING_MS||elapsed>2*60*60*1000||!Number.isFinite(value.activeMs)||value.activeMs<BREATHING_MS||value.activeMs>elapsed+1000)fail('Finish the full three-minute breathing session first.');

 }
 await epochFencedBatch(database,{ownerId:user,expectedDataEpoch:dataEpoch,now,statements:[
  database.prepare('UPDATE breathing_sessions SET completed_at=? WHERE id=? AND user_id=? AND completed_at IS NULL').bind(now,id,user),
  database.prepare('INSERT INTO login_days(user_id,day,logged_at) VALUES(?,?,?) ON CONFLICT(user_id,day) DO NOTHING').bind(user,dayAt(now),now),
 ]});
 return combatProgress(database,user,now,{recordLogin:false});
}
