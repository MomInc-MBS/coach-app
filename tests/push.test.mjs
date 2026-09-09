import test from 'node:test';
import assert from 'node:assert/strict';
import {createECDH,randomBytes} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {Miniflare} from 'miniflare';
import {runReminders} from '../server/push.mjs';
test('scheduled notifications encrypt real push payloads and send only once without a browser',async()=>{
 const mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("ok")}}',d1Databases:['DB']});const originalFetch=globalThis.fetch;
 try{const DB=await mf.getD1Database('DB');for(const f of (await readdir('drizzle')).filter(x=>x.endsWith('.sql'))){await DB.batch((await readFile(`drizzle/${f}`,'utf8')).split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean).map(s=>DB.prepare(s)));}
 const server=createECDH('prime256v1'),client=createECDH('prime256v1');server.generateKeys();client.generateKeys();const env={DB,VAPID_PUBLIC_KEY:server.getPublicKey().toString('base64url'),VAPID_PRIVATE_KEY:server.getPrivateKey().toString('base64url'),VAPID_SUBJECT:'https://coach.test'};
 const sub={endpoint:'https://fcm.googleapis.com/fcm/send/test-only',keys:{p256dh:client.getPublicKey().toString('base64url'),auth:randomBytes(16).toString('base64url')},expirationTime:null};
 await DB.prepare('INSERT INTO reminders(id,user_id,kind,time,timezone,enabled,quiet_start,quiet_end) VALUES(?,?,?,?,?,?,?,?)').bind('reminder','alice','water','09:00','America/Los_Angeles',1,'22:00','07:00').run();
 await DB.prepare('INSERT INTO subscriptions(endpoint,user_id,data,created_at) VALUES(?,?,?,?)').bind(sub.endpoint,'alice',JSON.stringify(sub),Date.now()).run();let sent=0;
 globalThis.fetch=async(url,options)=>{if(url===sub.endpoint){sent++;assert.equal(options.redirect,'error');const h=new Headers(options.headers);assert.match(h.get('authorization'),/^vapid /);assert.equal(h.get('content-encoding'),'aes128gcm');assert(options.body);return new Response(null,{status:201});}return originalFetch(url,options);};
 const now=Date.parse('2026-09-09T16:01:00Z');const first=await runReminders(env,now);assert.equal(first.sent,1);assert.equal(first.failed,0);await runReminders(env,now+60000);assert.equal(sent,1);const next=await runReminders(env,now+86400000);assert.equal(next.sent,1);assert.equal(sent,2);
 }finally{globalThis.fetch=originalFetch;await mf.dispose();}
});
