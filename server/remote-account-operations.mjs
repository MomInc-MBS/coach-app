import {reminderInput,uuid,cleanText,fail} from './domain.mjs';
import {readCoachPlan,saveCoachPlan} from './reminder-plan.mjs';
import {subscriptionInput,sendPush} from './push.mjs';
import {epochFencedBatch} from './remote-epochs.mjs';

// Explicit request write sets. Scheduler authenticates and reconciles proof first.
export async function remoteAccountOperation(request,env,user,dataEpoch,now=Date.now()){
 const database=env.DB,path=new URL(request.url).pathname,method=request.method;
 const commit=statements=>epochFencedBatch(database,{ownerId:user,expectedDataEpoch:dataEpoch,now,statements});
 const first=async statement=>(await commit([statement]))[0].results?.[0]??null;
 const body=async()=>{const text=await request.text();if(text.length>60000)fail('Too much reminder data.',413);try{return JSON.parse(text);}catch{fail('Invalid reminder data.');}};
 if(path==='/api/reminders/plan'&&method==='GET')return readCoachPlan(database,user);
 if(path==='/api/reminders/plan'&&method==='PUT')return saveCoachPlan(database,user,await body(),{dataEpoch});
 if(path==='/api/reminders'&&method==='GET')return {items:(await database.prepare('SELECT * FROM reminders WHERE user_id=? ORDER BY time').bind(user).all()).results};
 if(path==='/api/reminders'&&method==='POST'){
  const v=reminderInput(await body());
  const n=await database.prepare('SELECT count(*) AS n FROM reminders WHERE user_id=?').bind(user).first();if(n.n>=16)fail('Keep up to 16 reminders. Remove one before adding another.');
  await commit([database.prepare('INSERT INTO reminders(id,user_id,kind,time,timezone,enabled,quiet_start,quiet_end,tone,days_per_week) VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING').bind(v.id,user,v.kind,v.time,v.timezone,v.enabled,v.quietStart,v.quietEnd,v.tone,v.daysPerWeek)]);return {saved:true};
 }
 if(/^\/api\/reminders\/[a-f0-9-]{36}$/.test(path)){
  const id=uuid(path.split('/').at(-1));
  if(method==='DELETE'){await commit([database.prepare('DELETE FROM reminders WHERE id=? AND user_id=?').bind(id,user)]);return {deleted:true};}
  if(method==='PUT'){
   const v=reminderInput({...await body(),id});
   const saved=await first(database.prepare('UPDATE reminders SET kind=?,time=?,timezone=?,enabled=?,quiet_start=?,quiet_end=?,tone=?,days_per_week=? WHERE id=? AND user_id=? RETURNING id').bind(v.kind,v.time,v.timezone,v.enabled,v.quietStart,v.quietEnd,v.tone,v.daysPerWeek,id,user));
   if(!saved)fail('Reminder not found.',404);return {saved:true};
  }
  if(method==='PATCH'){
   const v=await body();if(typeof v.enabled!=='boolean')fail('Choose on or off.');
   const saved=await first(database.prepare('UPDATE reminders SET enabled=? WHERE id=? AND user_id=? RETURNING id').bind(v.enabled?1:0,id,user));
   if(!saved)fail('Reminder not found.',404);return {enabled:v.enabled};
  }
 }
 if(path==='/api/push/subscribe'&&method==='POST'){
  if(!env.VAPID_PRIVATE_KEY)fail('Notification sending is not connected yet.',503);
  const s=subscriptionInput(await body()),data=JSON.stringify(s);
  const prior=await database.prepare('SELECT user_id,data FROM subscriptions WHERE endpoint=?').bind(s.endpoint).first();
  // Atomic compare-and-set preserves prior endpoint reassignment semantics without
  // letting a delayed read overwrite a different intervening subscription.
  const saved=await first(database.prepare('INSERT INTO subscriptions(endpoint,user_id,data,created_at) VALUES(?,?,?,?) ON CONFLICT(endpoint) DO UPDATE SET user_id=excluded.user_id,data=excluded.data,created_at=excluded.created_at WHERE subscriptions.user_id=? AND subscriptions.data=? RETURNING endpoint').bind(s.endpoint,user,data,now,prior?.user_id??'',prior?.data??''));
  if(!saved)throw Object.assign(Error('Subscription changed. Try again.'),{status:409,code:'subscription_changed'});return {subscribed:true};
 }
 if(path==='/api/push/unsubscribe'&&method==='POST'){
  const v=await body();await commit([database.prepare('DELETE FROM subscriptions WHERE endpoint=? AND user_id=?').bind(cleanText(v.endpoint,2048),user)]);return {unsubscribed:true};
 }
 if(path==='/api/push/test'&&method==='POST'){
  const v=await body(),s=await database.prepare('SELECT data,created_at FROM subscriptions WHERE endpoint=? AND user_id=?').bind(cleanText(v.endpoint,2048),user).first();
  if(!s)fail('Enable notifications on this device first.');const key='test:'+user;
  const claimed=await first(database.prepare('INSERT INTO system(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value WHERE CAST(system.value AS INTEGER)<=? RETURNING key').bind(key,String(now),now-30000));
  if(!claimed)fail('Wait 30 seconds between test reminders.',429);
  await sendPush(env,JSON.parse(s.data),{title:'MYR5 Coach',body:'Your phone is connected to Coach reminders.',url:'/pose.html?panel=reminders',tag:'myr5-test'},{ownerId:user,dataEpoch,subscriptionData:s.data,subscriptionCreatedAt:s.created_at});return {accepted:true};
 }
 if(path==='/api/export'&&method==='GET'){
  const data={};for(const table of ['reminders','subscriptions'])data[table]=(await database.prepare(`SELECT * FROM ${table} WHERE user_id=?`).bind(user).all()).results;return data;
 }
 fail('Not found.',404);
}
