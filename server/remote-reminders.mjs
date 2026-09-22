import {db} from './db.mjs';
import {fail} from './domain.mjs';
import {epochFencedBatch} from './remote-epochs.mjs';
export const remoteReminders=env=>!!env.REMINDER_SERVICE_ORIGIN;
export function validatedReminderProof(user,proof){
 if(!proof||proof.ownerId!==user||typeof user!=='string'||!user||user.length>512||user.trim()!==user||/[\r\n]/.test(user)||!Number.isSafeInteger(proof.currentDataEpoch)||proof.currentDataEpoch<1||proof.deletedThroughEpoch!==proof.currentDataEpoch-1)fail('Invalid account generation.',422);
 return {ownerId:user,currentDataEpoch:proof.currentDataEpoch,deletedThroughEpoch:proof.deletedThroughEpoch};
}
export async function reminderService(env,user,path,method='GET',data,proof){
 if(!env.REMINDER_SERVICE_TOKEN)fail('The reminder service is not connected.',503);
 const origin=new URL(env.REMINDER_SERVICE_ORIGIN);
 if(origin.protocol!=='https:'||origin.pathname!=='/'||origin.username||origin.password)fail('Invalid reminder service configuration.',503);
 // Global status and unique-token actions do not carry an account proof.
 const unscoped=path==='/internal/status'||path.startsWith('/internal/release-email/');
 const captured=unscoped?null:validatedReminderProof(user,proof);
 const headers={'Authorization':`Bearer ${env.REMINDER_SERVICE_TOKEN}`,'X-Coach-User':user,'Content-Type':'application/json',...(captured?{'X-Coach-Data-Epoch':String(captured.currentDataEpoch),'X-Coach-Deleted-Through':String(captured.deletedThroughEpoch)}:{})};
 let response;
 try{response=await fetch(new URL(path,origin),{method,headers,body:data===undefined?undefined:JSON.stringify(data),redirect:'manual',signal:AbortSignal.timeout(5000)});}
 catch{fail('The reminder service is temporarily unavailable. Please try again.',503);}
 if(response.status>=300&&response.status<400)fail('The reminder service returned an unexpected redirect.',503);
 if(!response.headers.get('content-type')?.includes('application/json'))fail('The reminder service is temporarily unavailable.',503);
 let result;try{result=await response.json();}catch{fail('The reminder service is temporarily unavailable.',503);}
 if(!response.ok)throw Object.assign(Error(result.error||'Could not save your reminder. Please try again.'),{status:response.status,...(typeof result.code==='string'?{code:result.code}:{})});
 return result;
}
export async function reconcileReminderAccount(env,user,proof){
 const captured=validatedReminderProof(user,proof);
 const result=await reminderService(env,user,'/internal/account-reconcile','POST',undefined,captured);
 const acknowledged=validatedReminderProof(user,result);
 if(acknowledged.currentDataEpoch<captured.currentDataEpoch)fail('Reminder deletion is still pending.',503);
 return acknowledged;
}
export function queueReminderReconciliation(database,user,currentDataEpoch,now){
 const proof=validatedReminderProof(user,{ownerId:user,currentDataEpoch,deletedThroughEpoch:currentDataEpoch-1});
 return database.prepare('INSERT INTO system(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind('remote-deletion:'+user,JSON.stringify(proof));
}
export async function attemptReminderReconciliation(env,user,proof){
 if(!remoteReminders(env))return {status:'not_configured'};
 try{
  const ack=await reconcileReminderAccount(env,user,proof);
  await db(env).prepare("DELETE FROM system WHERE key=? AND json_extract(value,'$.currentDataEpoch')<=?").bind('remote-deletion:'+user,ack.currentDataEpoch).run();
  return {status:'reconciled'};
 }catch{return {status:'pending'};}
}
export async function ensureReminderMigration(env,user,proof){
 const captured=validatedReminderProof(user,proof),database=db(env),key='reminders_remote:'+JSON.stringify([user,captured.currentDataEpoch]);
 if(await database.prepare('SELECT value FROM system WHERE key=?').bind(key).first())return;
 const reminders=(await database.prepare('SELECT * FROM reminders WHERE user_id=?').bind(user).all()).results;
 const subscriptions=(await database.prepare('SELECT data FROM subscriptions WHERE user_id=?').bind(user).all()).results.map(s=>JSON.parse(s.data));
 await reminderService(env,user,'/internal/import','POST',{reminders,subscriptions},captured);
 await epochFencedBatch(database,{ownerId:user,expectedDataEpoch:captured.currentDataEpoch,now:Date.now(),statements:[database.prepare('INSERT INTO system(key,value) VALUES(?,?) ON CONFLICT(key) DO NOTHING').bind(key,String(Date.now()))]});
}
