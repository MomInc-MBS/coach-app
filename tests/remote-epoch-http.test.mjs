import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {Miniflare} from 'miniflare';
import remoteService from '../scheduler/service.mjs';
import * as remoteHelpers from '../server/remote-reminders.mjs';
const product=new URL('../',import.meta.url);
let mf,remote,primary,service,helpers;
before(async()=>{
 mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("ok")}}',d1Databases:['REMOTE','PRIMARY']});
 remote={DB:await mf.getD1Database('REMOTE'),REMINDER_SERVICE_TOKEN:'test-token',VAPID_PRIVATE_KEY:'test-private',VAPID_PUBLIC_KEY:'test-public'};
 primary={DB:await mf.getD1Database('PRIMARY'),REMINDER_SERVICE_TOKEN:'test-token',REMINDER_SERVICE_ORIGIN:'https://reminders.test'};
 for(const file of (await readdir(new URL('drizzle/',product))).filter(n=>n.endsWith('.sql')).sort()){
  const parts=(await readFile(new URL('drizzle/'+file,product),'utf8')).split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean);
  for(const env of [primary,remote])await env.DB.batch(parts.map(s=>env.DB.prepare(s)));
 }
 service=remoteService;
 helpers=remoteHelpers;
});
after(()=>mf?.dispose());
const proof=(user,epoch=1)=>({ownerId:user,currentDataEpoch:epoch,deletedThroughEpoch:epoch-1});
const request=(path,user,epoch=1,method='GET',data,env=remote,extra={})=>service.fetch(new Request('https://reminders.test'+path,{method,headers:{Authorization:'Bearer test-token','X-Coach-User':user,'X-Coach-Data-Epoch':String(epoch),'X-Coach-Deleted-Through':String(epoch-1),'Content-Type':'application/json',...extra},body:data===undefined?undefined:JSON.stringify(data)}),env);
const reconcile=(user,epoch,env=remote)=>request('/internal/account-reconcile',user,epoch,'POST',undefined,env);
const reminder=()=>({id:crypto.randomUUID(),kind:'water',time:'09:00',timezone:'UTC',enabled:true,quietStart:'22:00',quietEnd:'07:00'});
const subscription=endpoint=>({endpoint:'https://fcm.googleapis.com/fcm/send/'+endpoint,keys:{p256dh:'a'.repeat(87),auth:'b'.repeat(22)}});
const training=()=>({startedDay:Math.floor(Date.now()/86400000),lastCompletedDay:null});
const row=async(table,user)=>(await remote.DB.prepare(`SELECT * FROM ${table} WHERE user_id=?`).bind(user).all()).results;
function interleaveBeforeBatch(callback){let armed=true;return {...remote,DB:{prepare:sql=>remote.DB.prepare(sql),batch:async statements=>{if(armed){armed=false;await callback();}return remote.DB.batch(statements);}}};}

test('remote account requests require authenticated complete proof; old unrestricted DELETE is unavailable',async()=>{
 assert.equal((await service.fetch(new Request('https://reminders.test/api/reminders',{headers:{'X-Coach-User':'forged','X-Coach-Data-Epoch':'1','X-Coach-Deleted-Through':'0'}}),remote)).status,401);
 assert.equal((await service.fetch(new Request('https://reminders.test/api/reminders',{headers:{Authorization:'Bearer test-token','X-Coach-User':'missing'}}),remote)).status,428);
 assert.equal((await request('/api/reminders','bad-proof',1,'GET',undefined,remote,{'X-Coach-Deleted-Through':'1'})).status,422);
 assert.equal((await request('/api/account','old-delete',1,'DELETE',{confirm:'DELETE'})).status,404);
 assert.equal((await service.fetch(new Request('https://reminders.test/internal/status',{headers:{Authorization:'Bearer test-token'}}),remote)).status,200);
});
test('CRUD routes work in captured epoch; late mutation after reconcile returns 409 and writes nothing',async()=>{
 const user='crud',r=reminder();assert.equal((await request('/api/reminders',user,1,'POST',r)).status,200);
 assert.equal((await request('/api/reminders/'+r.id,user,1,'PUT',{...r,time:'10:00'})).status,200);
 assert.equal((await request('/api/reminders/'+r.id,user,1,'PATCH',{enabled:false})).status,200);
 const late=reminder(),env=interleaveBeforeBatch(async()=>{assert.equal((await reconcile(user,2)).status,200);});
 assert.equal((await request('/api/reminders',user,1,'POST',late,env)).status,409);assert.equal((await row('reminders',user)).length,0);
 assert.equal((await request('/api/reminders',user,2,'POST',late)).status,200);
 assert.equal((await request('/api/reminders/'+late.id,user,1,'DELETE')).status,409);assert.equal((await row('reminders',user)).length,1);
 assert.equal((await request('/api/reminders/'+late.id,user,2,'DELETE')).status,200);
});
test('plan and training upserts are fenced after their earlier reads',async()=>{
 const plan={count:1,times:['09:00'],timezone:'UTC',enabled:true};
 for(const [path,data,user] of [['/api/reminders/plan',plan,'plan-race'],['/internal/training-status',training(),'training-race']]){
  const env=interleaveBeforeBatch(()=>reconcile(user,2));
  const response=await request(path,user,1,path.includes('plan')?'PUT':'POST',data,env);assert.equal(response.status,409);
  assert.equal((await row('reminders',user)).length,0);assert.equal(await remote.DB.prepare('SELECT * FROM system WHERE key=? OR key=?').bind('training:'+user,'coach-plan:'+user).first(),null);
 }
 assert.equal((await request('/internal/training-status','training-race',2,'POST',training())).status,200);
});
test('legacy import retries cannot recreate old data after deletion; new epoch import is separately marked',async()=>{
 const user='import-race',r=reminder(),data={reminders:[{...r,quiet_start:r.quietStart,quiet_end:r.quietEnd,enabled:1}],subscriptions:[]};
 const env=interleaveBeforeBatch(()=>reconcile(user,2));assert.equal((await request('/internal/import',user,1,'POST',data,env)).status,409);
 assert.equal((await row('reminders',user)).length,0);
 assert.equal((await request('/internal/import',user,2,'POST',data)).status,200);
 await request('/api/reminders/'+r.id,user,2,'DELETE');await request('/internal/import',user,2,'POST',data);assert.equal((await row('reminders',user)).length,0);
});
test('push subscribe and unsubscribe cannot cross deletion; atomic endpoint handoff preserves other current owner',async()=>{
 const user='push-race',s=subscription('push-race');
 const env=interleaveBeforeBatch(()=>reconcile(user,2));assert.equal((await request('/api/push/subscribe',user,1,'POST',s,env)).status,409);assert.equal((await row('subscriptions',user)).length,0);
 assert.equal((await request('/api/push/subscribe',user,2,'POST',s)).status,200);
 assert.equal((await request('/api/push/unsubscribe',user,1,'POST',{endpoint:s.endpoint})).status,409);
 assert.equal((await request('/api/push/subscribe','push-other',1,'POST',s)).status,200);
 assert.equal((await request('/api/push/unsubscribe',user,2,'POST',{endpoint:s.endpoint})).status,200);assert.equal((await row('subscriptions','push-other')).length,1);
});
test('subscriber POST fences its writes and never sends email when deletion wins first guard',async()=>{
 let sends=0;const user='email-race',env=interleaveBeforeBatch(()=>reconcile(user,2));
 Object.assign(env,{EMAIL:{send:async()=>{sends++;}},RELEASE_EMAIL_FROM:'coach@example.com',RELEASE_ORIGIN:'https://coach.test'});
 const response=await request('/api/updates/subscription',user,1,'POST',{email:'person@example.com'},env);assert.equal(response.status,409);assert.equal(sends,0);assert.equal((await row('release_subscribers',user)).length,0);
});
test('old reconcile cannot delete later rows and exact notification owner parsing prevents prefix overlap',async()=>{
 const user='owner';await request('/api/reminders',user,2,'POST',reminder());
 await remote.DB.batch([remote.DB.prepare('INSERT INTO system(key,value) VALUES(?,?)').bind('notify-budget:owner:2026-09-21','[]'),remote.DB.prepare('INSERT INTO system(key,value) VALUES(?,?)').bind('notify-budget:owner:child:2026-09-21','[]')]);
 await reconcile(user,3);await request('/api/reminders',user,3,'POST',reminder());
 assert.equal((await reconcile(user,2)).status,200);assert.equal((await row('reminders',user)).length,1);
 assert.equal(await remote.DB.prepare('SELECT * FROM system WHERE key=?').bind('notify-budget:owner:2026-09-21').first(),null);
 assert(await remote.DB.prepare('SELECT * FROM system WHERE key=?').bind('notify-budget:owner:child:2026-09-21').first());
});
test('primary helper sends captured proof and clears only acknowledged queue marker',async()=>{
 const oldFetch=globalThis.fetch;globalThis.fetch=(url,options)=>service.fetch(new Request(url,options),remote);
 try{
  await primary.DB.prepare('INSERT INTO system(key,value) VALUES(?,?)').bind('remote-deletion:helper',JSON.stringify(proof('helper',3))).run();
  assert.deepEqual(await helpers.attemptReminderReconciliation(primary,'helper',proof('helper',2)),{status:'reconciled'});
  assert(await primary.DB.prepare("SELECT * FROM system WHERE key='remote-deletion:helper'").first());
  assert.deepEqual(await helpers.attemptReminderReconciliation(primary,'helper',proof('helper',3)),{status:'reconciled'});
  assert.equal(await primary.DB.prepare("SELECT * FROM system WHERE key='remote-deletion:helper'").first(),null);
 }finally{globalThis.fetch=oldFetch;}
});
