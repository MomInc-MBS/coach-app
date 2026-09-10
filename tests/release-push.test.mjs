import test from 'node:test';
import assert from 'node:assert/strict';
import {createECDH,randomBytes} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {Miniflare} from 'miniflare';
import {build} from 'esbuild';
import {runReleasePush} from '../server/release-push.mjs';

test('published releases notify each device once, retry failures, and respect disconnected devices',async()=>{
 const mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("ok")}}',d1Databases:['DB']});
 const originalFetch=globalThis.fetch;
 try {
  const DB=await mf.getD1Database('DB');
  for(const file of (await readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort())await DB.batch((await readFile('drizzle/'+file,'utf8')).split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean).map(s=>DB.prepare(s)));
  const server=createECDH('prime256v1'),client=createECDH('prime256v1');server.generateKeys();client.generateKeys();
  const env={DB,RELEASE_ORIGIN:'https://coach.test',VAPID_PUBLIC_KEY:server.getPublicKey().toString('base64url'),VAPID_PRIVATE_KEY:server.getPrivateKey().toString('base64url'),VAPID_SUBJECT:'https://coach.test'};
  const endpoints=['alice-phone','alice-tablet'].map(id=>'https://fcm.googleapis.com/fcm/send/'+id);
  for(const endpoint of endpoints){const sub={endpoint,keys:{p256dh:client.getPublicKey().toString('base64url'),auth:randomBytes(16).toString('base64url')}};await DB.prepare('INSERT INTO subscriptions(endpoint,user_id,data,created_at) VALUES(?,?,?,?)').bind(endpoint,'alice',JSON.stringify(sub),Date.now()).run();}
  let release={id:'future-build-1',title:'Coach update'},providerStatus=201,releaseStatus=200,sends=[];
  globalThis.fetch=async(url,options)=>{
   assert.equal(options.redirect,'manual');
   if(url==='https://coach.test/api/releases/current'){assert.equal(options.cache,'no-store');return releaseStatus===200?Response.json(release):new Response(null,{status:releaseStatus,headers:{Location:'https://other.test'}});}
   assert(endpoints.includes(url));sends.push(url);const headers=new Headers(options.headers);assert.match(headers.get('authorization'),/^vapid /);assert.equal(headers.get('ttl'),'86400');assert.equal(headers.get('content-encoding'),'aes128gcm');assert(options.body);return new Response(null,{status:providerStatus});
  };
  const now=Date.now();
  const concurrent=await Promise.all([runReleasePush(env,now),runReleasePush(env,now)]);
  assert.equal(concurrent.reduce((sum,r)=>sum+r.sent,0),2);assert.equal(sends.length,2);
  assert.equal((await runReleasePush(env,now+60000)).sent,0);
  release={...release,id:'future-build-2'};assert.equal((await runReleasePush(env,now+120000)).sent,2);
  // Unchanged titles still notify for every new content identity.
  assert.equal(sends.length,4);
  assert.equal((await runReleasePush(env,now+100*86400000)).sent,0);
  release={...release,id:'future-build-3'};providerStatus=503;
  assert.equal((await runReleasePush(env,now+180000)).failed,2);
  assert.equal((await runReleasePush(env,now+240000)).failed,0);
  providerStatus=201;assert.equal((await runReleasePush(env,now+360000)).sent,2);
  await DB.prepare('DELETE FROM subscriptions WHERE endpoint=?').bind(endpoints[1]).run();
  assert.equal((await DB.prepare('SELECT count(*) n FROM release_push_deliveries WHERE endpoint=?').bind(endpoints[1]).first()).n,0);
  release={...release,id:'future-build-4'};assert.equal((await runReleasePush(env,now+420000)).sent,1);
  releaseStatus=302;await assert.rejects(()=>runReleasePush(env),/Could not check/);
  releaseStatus=200;release={id:'',title:'Invalid'};await assert.rejects(()=>runReleasePush(env),/Invalid published/);
  release={id:'future-build-5',title:'Coach update'};providerStatus=410;
  assert.equal((await runReleasePush(env,now+480000)).failed,1);
  assert.equal((await DB.prepare('SELECT count(*) n FROM subscriptions').first()).n,0);
  assert.equal((await DB.prepare('SELECT count(*) n FROM release_push_deliveries').first()).n,0);
  assert.equal((await runReleasePush({...env,VAPID_PRIVATE_KEY:undefined})).configured,false);
 } finally {globalThis.fetch=originalFetch;await mf.dispose();}
});

test('the production Workers runtime can fetch live releases and deliver encrypted update notifications',async()=>{
 const {outputFiles}=await build({stdin:{contents:"import {runReleasePush} from './server/release-push.mjs';export default {async fetch(request,env){return Response.json(await runReleasePush(env));}}",resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'browser',target:'es2022'});
 const server=createECDH('prime256v1'),client=createECDH('prime256v1');server.generateKeys();client.generateKeys();
 const sub={endpoint:'https://fcm.googleapis.com/fcm/send/runtime-update',keys:{p256dh:client.getPublicKey().toString('base64url'),auth:randomBytes(16).toString('base64url')}};
 let sent=0;
 const mf=new Miniflare({modules:true,script:outputFiles[0].text,compatibilityDate:'2026-05-15',d1Databases:['DB'],bindings:{RELEASE_ORIGIN:'https://coach.test',VAPID_PUBLIC_KEY:server.getPublicKey().toString('base64url'),VAPID_PRIVATE_KEY:server.getPrivateKey().toString('base64url'),VAPID_SUBJECT:'https://coach.test'},outboundService:async request=>{
  if(request.url==='https://coach.test/api/releases/current')return Response.json({id:'runtime-live-update',title:'New Coach'});
  assert.equal(request.url,sub.endpoint);assert.equal(request.headers.get('ttl'),'86400');assert.equal(request.headers.get('content-encoding'),'aes128gcm');assert((await request.arrayBuffer()).byteLength>0);sent++;return new Response(null,{status:201});
 }});
 try {
  const DB=await mf.getD1Database('DB');for(const file of (await readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort())await DB.batch((await readFile('drizzle/'+file,'utf8')).split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean).map(s=>DB.prepare(s)));
  await DB.prepare('INSERT INTO subscriptions(endpoint,user_id,data,created_at) VALUES(?,?,?,?)').bind(sub.endpoint,'runtime-user',JSON.stringify(sub),Date.now()).run();
  for(const expected of [1,0]){const response=await mf.dispatchFetch('https://test.local');assert.equal(response.status,200,await response.clone().text());assert.equal((await response.json()).sent,expected);}
  assert.equal(sent,1);
 } finally {await mf.dispose();}
});
