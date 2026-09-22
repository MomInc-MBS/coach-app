import {readFile,readdir} from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createECDH,randomBytes} from 'node:crypto';
import {Miniflare} from 'miniflare';
import {build} from 'esbuild';

test('Workers connects to reminders and sends encrypted push without unsupported redirects',async()=>{
 const source=`import {reminderService} from './server/remote-reminders.mjs';import {sendPush} from './server/push.mjs';export default {async fetch(request,env){try{const path=new URL(request.url).pathname;const result=path==='/push'?await sendPush(env,JSON.parse(env.TEST_SUB),{title:'Test',body:'Runtime check'},{ownerId:'runtime-check',dataEpoch:1,subscriptionData:env.TEST_SUB,subscriptionCreatedAt:1}):await reminderService(env,'runtime-check',path,'GET',undefined,{ownerId:'runtime-check',currentDataEpoch:1,deletedThroughEpoch:0});return Response.json(result);}catch(e){return Response.json({error:e.message},{status:e.status||502});}}}`;
 const {outputFiles}=await build({stdin:{contents:source,resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'browser',target:'es2022'});
 const server=createECDH('prime256v1'),client=createECDH('prime256v1');server.generateKeys();client.generateKeys();
 const subscription={endpoint:'https://fcm.googleapis.com/fcm/send/runtime-check',keys:{p256dh:client.getPublicKey().toString('base64url'),auth:randomBytes(16).toString('base64url')}};
 const visited=[];
 const outboundService=async request=>{visited.push(request.url);const url=new URL(request.url);
  if(url.origin==='https://reminders.test'){assert.equal(request.headers.get('authorization'),'Bearer test-service-token');if(url.pathname==='/redirect')return new Response(null,{status:302,headers:{Location:'https://untrusted.test/steal'}});return Response.json({configured:true,schedulerActive:true});}
  assert.equal(request.url,subscription.endpoint);assert.equal(request.method,'POST');assert.match(request.headers.get('authorization'),/^vapid /);assert.equal(request.headers.get('content-encoding'),'aes128gcm');assert((await request.arrayBuffer()).byteLength>0);return new Response(null,{status:201});
 };
 const mf=new Miniflare({modules:true,script:outputFiles[0].text,compatibilityDate:'2026-05-15',outboundService,d1Databases:['DB'],bindings:{REMINDER_SERVICE_ORIGIN:'https://reminders.test',REMINDER_SERVICE_TOKEN:'test-service-token',TEST_SUB:JSON.stringify(subscription),VAPID_PUBLIC_KEY:server.getPublicKey().toString('base64url'),VAPID_PRIVATE_KEY:server.getPrivateKey().toString('base64url'),VAPID_SUBJECT:'https://coach.test'}});
 try{
  const database=await mf.getD1Database('DB');
  for(const file of (await readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort())await database.batch((await readFile('drizzle/'+file,'utf8')).split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean).map(s=>database.prepare(s)));
  await database.prepare('INSERT INTO subscriptions(endpoint,user_id,data,created_at) VALUES(?,?,?,1)').bind(subscription.endpoint,'runtime-check',JSON.stringify(subscription)).run();
  let r=await mf.dispatchFetch('https://coach.test/internal/status');assert.equal(r.status,200,await r.clone().text());assert.deepEqual(await r.json(),{configured:true,schedulerActive:true});
  r=await mf.dispatchFetch('https://coach.test/push');assert.equal(r.status,200,await r.clone().text());assert.equal(await r.json(),201);
  r=await mf.dispatchFetch('https://coach.test/redirect');assert.equal(r.status,503);assert.match((await r.json()).error,/unexpected redirect/);
  assert.equal(visited.length,3);assert(!visited.some(url=>url.includes('untrusted.test')));
 }finally{await mf.dispose();}
});
