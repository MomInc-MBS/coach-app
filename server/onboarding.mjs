import {validateOnboarding,dailyTargets,calendarDay} from '../onboarding-domain.mjs';
export async function readOnboarding(database,user,now=Date.now()){
 const row=await database.prepare('SELECT data,start_day,completed_at,revision FROM onboarding WHERE user_id=?').bind(user).first();
 if(!row)return null;const data=JSON.parse(row.data);return {data,startDay:row.start_day,completedAt:row.completed_at,revision:row.revision,targets:dailyTargets(data.profile,row.start_day,now)};
}
export async function saveOnboarding(database,user,input,now=Date.now()){
 if(!Number.isSafeInteger(input.revision)||input.revision<0)throw Object.assign(Error('Refresh your coach settings before saving.'),{status:400});
 const data=validateOnboarding(input.data),appearance=Object.fromEntries(Object.entries(data.appearance).map(([k,v])=>[k,JSON.stringify(v)])),token=crypto.randomUUID();
 const writes=await database.batch([
  database.prepare('INSERT INTO onboarding(user_id,data,start_day,completed_at,updated_at,revision,write_token) SELECT ?,?,?,?,?,1,? WHERE ?=0 OR EXISTS(SELECT 1 FROM onboarding WHERE user_id=?) ON CONFLICT(user_id) DO UPDATE SET data=excluded.data,updated_at=excluded.updated_at,revision=onboarding.revision+1,write_token=excluded.write_token WHERE onboarding.revision=? RETURNING revision').bind(user,JSON.stringify(data),calendarDay(now,data.profile.timezone),now,now,token,input.revision,user,input.revision),
  database.prepare("INSERT INTO profiles(user_id,data,revision,updated_at) SELECT ?,?,1,? WHERE EXISTS(SELECT 1 FROM onboarding WHERE user_id=? AND write_token=?) ON CONFLICT(user_id) DO UPDATE SET data=json_patch(profiles.data,excluded.data),revision=profiles.revision+1,updated_at=excluded.updated_at").bind(user,JSON.stringify(appearance),now,user,token)
 ]);
 // A stale request writes neither the onboarding row nor its appearance snapshot.
 if(!writes[0].results?.length)throw Object.assign(Error('Coach settings changed on another device. Refresh before saving again.'),{status:409});
 return {onboarding:await readOnboarding(database,user,now),appearance};
}
