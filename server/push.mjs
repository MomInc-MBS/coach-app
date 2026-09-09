import {buildPushPayload} from '@block65/webcrypto-web-push';
import {db} from './db.mjs';
import {isDue,KINDS,fail} from './domain.mjs';
export function subscriptionInput(v){let url;try{url=new URL(v.endpoint);}catch{fail('Invalid notification subscription.');}const host=url.hostname;if(url.protocol!=='https:'||url.port||url.username||url.password||!(host==='fcm.googleapis.com'||host==='updates.push.services.mozilla.com'||host.endsWith('.push.services.mozilla.com')||host==='web.push.apple.com'||host.endsWith('.notify.windows.com')))fail('This notification provider is not supported.');for(const [k,size] of [['p256dh',87],['auth',22]])if(typeof v.keys?.[k]!=='string'||!new RegExp(`^[A-Za-z0-9_-]{${size}}={0,2}$`).test(v.keys[k]))fail('Invalid notification keys.');return {endpoint:url.href,keys:v.keys,expirationTime:null};}
export async function sendPush(env,sub,message){const payload=await buildPushPayload({data:JSON.stringify(message),options:{ttl:600}},sub,{subject:env.VAPID_SUBJECT,publicKey:env.VAPID_PUBLIC_KEY,privateKey:env.VAPID_PRIVATE_KEY});const result=await fetch(sub.endpoint,{...payload,redirect:'error',signal:AbortSignal.timeout(15000)});if(result.status===404||result.status===410)await db(env).prepare('DELETE FROM subscriptions WHERE endpoint=?').bind(sub.endpoint).run();if(!result.ok)throw new Error('Notification service did not accept delivery.');return result.status;}
export async function runReminders(env,now=Date.now()){
 const database=db(env);await database.prepare("INSERT INTO system(key,value) VALUES('scheduler_tick',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(String(now)).run();
 if(!env.VAPID_PRIVATE_KEY)return {sent:0,configured:false};
 const rows=(await database.prepare('SELECT * FROM reminders WHERE enabled=1').all()).results;let sent=0,failed=0;
 for(const r of rows){const day=isDue(r,now);if(!day)continue;const subs=(await database.prepare('SELECT * FROM subscriptions WHERE user_id=?').bind(r.user_id).all()).results;
  for(const s of subs){const claim=await database.prepare("INSERT INTO deliveries(reminder_id,day,endpoint,status,updated_at) VALUES(?,?,?,'sending',?) ON CONFLICT(reminder_id,day,endpoint) DO UPDATE SET status='sending',updated_at=excluded.updated_at WHERE deliveries.status!='sent' AND deliveries.updated_at<? RETURNING reminder_id").bind(r.id,day,s.endpoint,now,now-120000).first();if(!claim)continue;
   try{await sendPush(env,JSON.parse(s.data),{title:'MYR5 Coach',body:KINDS[r.kind],tag:`${r.id}-${day}`,url:`/pose.html?panel=${r.kind==='meal'?'meals':'reminders'}`});await database.prepare("UPDATE deliveries SET status='sent',updated_at=? WHERE reminder_id=? AND day=? AND endpoint=?").bind(now,r.id,day,s.endpoint).run();sent++;}
   catch{failed++;await database.prepare("UPDATE deliveries SET status='failed' WHERE reminder_id=? AND day=? AND endpoint=?").bind(r.id,day,s.endpoint).run();}
  }
 }
 await database.prepare('DELETE FROM deliveries WHERE updated_at<?').bind(now-35*86400000).run();return {sent,failed,configured:true};
}
