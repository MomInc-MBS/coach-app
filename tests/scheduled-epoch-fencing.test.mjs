import test,{before,after,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
const product=new URL('../',import.meta.url),require=createRequire(new URL('package.json',product)),{Miniflare}=require('miniflare');
const {RELEASE}=await import(new URL('release-info.mjs',product));
const cache=new Map();
async function overlayURL(relative){
 if(cache.has(relative))return cache.get(relative);
 const sourceURL=new URL(relative,product);let source=await readFile(sourceURL,'utf8');
 for(const [,specifier] of [...source.matchAll(/from '([^']+)'/g)]){
  let url;
  if(specifier==='@block65/webcrypto-web-push')url='data:text/javascript,export async function buildPushPayload(){return {method:"POST",body:"encrypted-fixture"}}';
  else if(specifier.startsWith('.')){const absolute=new URL(specifier,new URL(relative,product));url=await overlayURL(absolute.pathname.slice(product.pathname.length));}
  else url=pathToFileURL(require.resolve(specifier)).href;
  source=source.replaceAll("from '"+specifier+"'","from '"+url+"'");
 }
 const url='data:text/javascript;base64,'+Buffer.from(source).toString('base64');cache.set(relative,url);return url;
}
let mf,db,push,releasePush,email,epochs,deletion,plans;const oldFetch=globalThis.fetch;
const now=Date.UTC(2026,8,21,9,0),day='2026-09-21';
before(async()=>{
 mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("ok")}}',d1Databases:['DB']});db=await mf.getD1Database('DB');
 for(const file of (await readdir(new URL('drizzle/',product))).filter(n=>n.endsWith('.sql')).sort())await db.batch((await readFile(new URL('drizzle/'+file,product),'utf8')).split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean).map(s=>db.prepare(s)));
 [push,releasePush,email,epochs,deletion,plans]=await Promise.all(['server/push.mjs','server/release-push.mjs','server/release-email.mjs','server/remote-epochs.mjs','server/remote-deletion-data.mjs','server/reminder-plan.mjs'].map(async path=>import(await overlayURL(path))));
});
after(()=>mf?.dispose());afterEach(()=>{globalThis.fetch=oldFetch;});
const env=database=>({DB:database||db,VAPID_PRIVATE_KEY:'fixture',VAPID_PUBLIC_KEY:'fixture',RELEASE_ORIGIN:'https://coach.test',RELEASE_EMAIL_FROM:'coach@example.com'});
const data=endpoint=>JSON.stringify({endpoint,keys:{p256dh:'fixture',auth:'fixture'},expirationTime:null});
async function subscribe(owner,id,created=1){const endpoint='https://fcm.googleapis.com/fcm/send/'+id,payload=data(endpoint);await db.prepare('INSERT INTO subscriptions(endpoint,user_id,data,created_at) VALUES(?,?,?,?) ON CONFLICT(endpoint) DO UPDATE SET user_id=excluded.user_id,data=excluded.data,created_at=excluded.created_at').bind(endpoint,owner,payload,created).run();return {endpoint,data:payload,created_at:created};}
async function reminder(owner,id){await db.prepare("INSERT INTO reminders(id,user_id,kind,time,timezone,enabled,quiet_start,quiet_end) VALUES(?,?,'water','09:00','UTC',1,'22:00','07:00')").bind(id,owner).run();}
async function subscriber(owner,token){await db.prepare('INSERT INTO release_subscribers(user_id,email,enabled,unsubscribe_token,updated_at,confirmed_at,last_release) VALUES(?,?,1,?,?,?,NULL) ON CONFLICT(user_id) DO UPDATE SET unsubscribe_token=excluded.unsubscribe_token,enabled=1,updated_at=excluded.updated_at,confirmed_at=excluded.confirmed_at,last_release=NULL').bind(owner,owner+'@example.com',token,now,now).run();}
const reconcile=(owner,epoch)=>epochs.reconcileRemoteEpoch(db,{ownerId:owner,currentDataEpoch:epoch,deletedThroughEpoch:epoch-1,now,deletions:deletion.remoteAccountDeletionStatements(db,owner)});
const count=async(table,where,args=[])=>(await db.prepare(`SELECT COUNT(*) n FROM ${table} WHERE ${where}`).bind(...args).first()).n;
function afterSelection(fragment,callback){
 let armed=true;
 return {batch:statements=>db.batch(statements),prepare:sql=>{
  if(!sql.includes(fragment))return db.prepare(sql);
  const wrap=statement=>({bind:(...args)=>wrap(statement.bind(...args)),first:(...args)=>statement.first(...args),run:()=>statement.run(),all:async()=>{const result=await statement.all();if(armed&&sql.includes(fragment)){armed=false;await callback();}return result;}});
  return wrap(db.prepare(sql));
 }};
}
function network(onPush=()=>new Response('',{status:201})){
 globalThis.fetch=async(url,options)=>new URL(url).hostname==='coach.test'?Response.json({id:RELEASE.id,title:RELEASE.title}):onPush(url,options);
}

test('late selected reminder cannot recreate budgets or delivery rows after account fence',async()=>{
 const owner='reminder-stale',id='reminder-stale';await reminder(owner,id);await subscribe(owner,owner);let sends=0;network(()=>{sends++;return new Response('',{status:201});});
 const wrapped=afterSelection('FROM reminders r',()=>reconcile(owner,2));
 const result=await push.runReminders(env(wrapped),now);assert.equal(sends,0);assert.equal(result.sent,0);
 assert.equal(await count('deliveries','reminder_id=?',[id]),0);assert.equal(await count('system','key=?',['notify-budget:'+owner+':'+day]),0);
});
test('late selected release push cannot claim a replacement subscription in a new epoch',async()=>{
 const owner='release-stale';await subscribe(owner,owner);let sends=0;network(()=>{sends++;return new Response('',{status:201});});
 const wrapped=afterSelection('FROM subscriptions s LEFT JOIN account_data_epochs',async()=>{await reconcile(owner,2);await subscribe(owner,owner,2);});
 await releasePush.runReleasePush(env(wrapped),now);assert.equal(sends,0);assert.equal(await count('release_push_deliveries','endpoint=?',['https://fcm.googleapis.com/fcm/send/'+owner]),0);
 assert.equal((await db.prepare('SELECT created_at FROM subscriptions WHERE user_id=?').bind(owner).first()).created_at,2);
});
test('late selected release email cannot recreate delivery claim or update replacement token',async()=>{
 const owner='email-stale';await subscriber(owner,'old-token');let sends=0;network();
 const wrapped=afterSelection('FROM release_subscribers s LEFT JOIN account_data_epochs',async()=>{await reconcile(owner,2);await subscriber(owner,'new-token');});
 const result=await email.runReleaseEmails({...env(wrapped),EMAIL:{send:async()=>{sends++;}}},now);assert.equal(sends,0);assert.equal(result.sent,0);assert.equal(await count('release_deliveries','user_id=?',[owner]),0);
});
test('late 410 cleanup preserves same-owner same-key resubscription with later created_at',async()=>{
 const owner='cleanup',s=await subscribe(owner,owner,1);
 network(async()=>{await subscribe(owner,owner,2);return new Response('',{status:410});});
 await assert.rejects(push.sendPush(env(),JSON.parse(s.data),{title:'test'},{ownerId:owner,dataEpoch:1,subscriptionData:s.data,subscriptionCreatedAt:s.created_at}),/did not accept/);
 assert.equal((await db.prepare('SELECT created_at FROM subscriptions WHERE user_id=?').bind(owner).first()).created_at,2);
});
test('late 410 after account deletion cannot delete the new epoch subscription',async()=>{
 const owner='cleanup-epoch',s=await subscribe(owner,owner,1);
 network(async()=>{await reconcile(owner,2);await subscribe(owner,owner,2);return new Response('',{status:410});});
 await assert.rejects(push.sendPush(env(),JSON.parse(s.data),{title:'test'},{ownerId:owner,dataEpoch:1,subscriptionData:s.data,subscriptionCreatedAt:s.created_at}),/did not accept/);
 assert.equal(await count('subscriptions','user_id=?',[owner]),1);
});
test('old send callback cannot overwrite a new release delivery after reconciliation',async()=>{
 const owner='callback',s=await subscribe(owner,owner);let triggered=false;
 network(async(url)=>{
  if(new URL(url).href===s.endpoint&&!triggered){triggered=true;await reconcile(owner,2);await subscribe(owner,owner,2);await db.prepare("INSERT INTO release_push_deliveries(endpoint,release_id,status,updated_at) VALUES(?,?,'sending',?)").bind(s.endpoint,RELEASE.id,now+1000).run();}
  return new Response('',{status:201});
 });
 await releasePush.runReleasePush(env(),now);
 assert.deepEqual(await db.prepare('SELECT status,updated_at FROM release_push_deliveries WHERE endpoint=? AND release_id=?').bind(s.endpoint,RELEASE.id).first(),{status:'sending',updated_at:now+1000});
});
test('normal reminder and release senders still claim and record successful delivery',async()=>{
 const owner='normal-reminder';await reminder(owner,owner);await subscribe(owner,owner);network();
 await push.runReminders(env(),now);assert.equal((await db.prepare('SELECT status FROM deliveries WHERE reminder_id=?').bind(owner).first()).status,'sent');
 await releasePush.runReleasePush(env(),now);assert.equal((await db.prepare('SELECT status FROM release_push_deliveries WHERE endpoint=? AND release_id=?').bind('https://fcm.googleapis.com/fcm/send/'+owner,RELEASE.id).first()).status,'sent');
 const emailOwner='normal-email';await subscriber(emailOwner,'normal-token');await email.runReleaseEmails({...env(),EMAIL:{send:async()=>({id:'sent'})}},now);assert.equal((await db.prepare('SELECT status FROM release_deliveries WHERE user_id=?').bind(emailOwner).first()).status,'sent');
});
test('sendPush has no identity-free fallback and daily notification cap still applies',async()=>{
 let sends=0;network(()=>{sends++;return new Response('',{status:201});});await assert.rejects(push.sendPush(env(),{endpoint:'https://fcm.googleapis.com/x'},{title:'x'}),{code:'stale_delivery'});assert.equal(sends,0);
 const claims=await Promise.all(Array.from({length:8},(_,n)=>plans.claimNotificationSlot(db,'budget',day,'r'+n,{dataEpoch:1,now})));assert.equal(claims.filter(Boolean).length,3);
 await reconcile('budget',2);await assert.rejects(plans.claimNotificationSlot(db,'budget',day,'old',{dataEpoch:1,now}),{code:'target_epoch_mismatch'});
});

test('old email tokens cannot enable or remove a subscription after atomic epoch reconciliation',async()=>{
 const owner='old-link',oldToken='a'.repeat(64),newToken='b'.repeat(64);
 const hash=async token=>Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token))).toString('hex');
 await subscriber(owner,oldToken);await db.prepare('UPDATE release_subscribers SET enabled=0,confirm_hash=?,expires_at=? WHERE user_id=?').bind(await hash(oldToken),now+10000,owner).run();
 await reconcile(owner,2);assert.equal(await count('release_subscribers','user_id=?',[owner]),0);
 await subscriber(owner,newToken);await db.prepare('UPDATE release_subscribers SET enabled=0,confirm_hash=?,expires_at=? WHERE user_id=?').bind(await hash(newToken),now+10000,owner).run();
 await assert.rejects(email.emailLinkAction(env(),'confirm',oldToken,now));
 await email.emailLinkAction(env(),'unsubscribe',oldToken,now);
 const row=await db.prepare('SELECT enabled,unsubscribe_token FROM release_subscribers WHERE user_id=?').bind(owner).first();assert.deepEqual(row,{enabled:0,unsubscribe_token:newToken});
 await email.emailLinkAction(env(),'confirm',newToken,now);assert.equal((await db.prepare('SELECT enabled FROM release_subscribers WHERE user_id=?').bind(owner).first()).enabled,1);
});
