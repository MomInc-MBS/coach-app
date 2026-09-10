import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {Miniflare} from 'miniflare';
import {readFile,readdir} from 'node:fs/promises';
import {emailSubscription,emailLinkAction,runReleaseEmails} from '../server/release-email.mjs';
import coach from '../server/worker.mjs';
import {RELEASE} from '../release-info.mjs';
let mf,env,messages=[],originalFetch;
before(async()=>{
 mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("ok")}}',d1Databases:['DB']});
 env={DB:await mf.getD1Database('DB'),RELEASE_ORIGIN:'https://coach.test',RELEASE_EMAIL_FROM:'updates@example.com',EMAIL:{send:async m=>{messages.push(m);return {messageId:crypto.randomUUID()};}}};
 for(const f of (await readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort())await env.DB.batch((await readFile(`drizzle/${f}`,'utf8')).split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean).map(s=>env.DB.prepare(s)));
 originalFetch=globalThis.fetch;globalThis.fetch=async()=>Response.json(RELEASE);
});
after(async()=>{globalThis.fetch=originalFetch;await mf?.dispose();});
const row=user=>env.DB.prepare('SELECT * FROM release_subscribers WHERE user_id=?').bind(user).first();
const confirmToken=()=>new URL(messages.at(-1).text.match(/https:\/\/coach.test\/api\/updates\/confirm\?token=[a-f0-9]+/)[0]).searchParams.get('token');
async function subscribe(user){await emailSubscription(env,user,'POST',{email:user+'@example.com'});const t=confirmToken();await emailLinkAction(env,'confirm',t);return row(user);}
test('subscription validates addresses, waits for confirmed ownership and prevents link replay',async()=>{
 await assert.rejects(emailSubscription(env,'invalid','POST',{email:'x@example.com\r\nBcc: someone@example.com'}));
 const r=await emailSubscription(env,'alice','POST',{email:'Alice@Example.com'});assert.equal(r.enabled,false);assert.equal((await row('alice')).enabled,0);
 const t=confirmToken();assert(!(await row('alice')).confirm_hash.includes(t));
 const landing=await coach.fetch(new Request('https://coach.test/api/updates/confirm?token='+t),env);assert.equal(landing.status,200);assert.equal((await row('alice')).enabled,0,'GET from an email scanner cannot subscribe');
 await emailLinkAction(env,'confirm',t);assert.equal((await row('alice')).enabled,1);
 await assert.rejects(emailLinkAction(env,'confirm',t),e=>e.status===410);
});
test('confirm expiry, address limits and account isolation are enforced',async()=>{
 await emailSubscription(env,'expiry','POST',{email:'expiry@example.com'});const t=confirmToken();
 await assert.rejects(emailLinkAction(env,'confirm',t,Date.now()+86400001),e=>e.status===410);
 await assert.rejects(emailSubscription(env,'second-user','POST',{email:'expiry@example.com'}),e=>e.status===429);
 assert.equal((await emailSubscription(env,'bob','GET')).email,null);
 await emailSubscription(env,'bob','DELETE');assert((await row('alice')).enabled);
});
test('a release sends only after publication, only to confirmed accounts and at most once',async()=>{
 await subscribe('release');await env.DB.prepare("UPDATE release_subscribers SET last_release='previous' WHERE user_id='release'").run();
 messages=[];globalThis.fetch=async()=>Response.json({id:'previous'});assert.equal((await runReleaseEmails(env)).waitingForPublication,true);assert.equal(messages.length,0);
 globalThis.fetch=async()=>Response.json(RELEASE);
 const results=await Promise.all([runReleaseEmails(env),runReleaseEmails(env)]);assert.equal(results.reduce((n,r)=>n+r.sent,0),1);assert.equal(messages.length,1);assert.equal(messages[0].to,'release@example.com');assert(messages[0].headers['List-Unsubscribe']);
 assert.equal((await runReleaseEmails(env)).sent,0);
});
test('uncertain delivery failures never produce retries or block the next batch',async()=>{
 await subscribe('failed');await env.DB.prepare("UPDATE release_subscribers SET last_release='old' WHERE user_id='failed'").run();
 const send=env.EMAIL.send;env.EMAIL.send=async()=>{throw new Error('provider connection lost');};
 assert.equal((await runReleaseEmails(env)).failed,1);env.EMAIL.send=send;
 assert.equal((await runReleaseEmails(env)).sent,0);
 await subscribe('next');await env.DB.prepare("UPDATE release_subscribers SET last_release='old' WHERE user_id='next'").run();
 assert.equal((await runReleaseEmails(env)).sent,1);
});
test('unsubscribe works without signing in and immediately excludes the address',async()=>{
 const r=await subscribe('stop');const url='https://coach.test/api/updates/unsubscribe?token='+r.unsubscribe_token;
 assert.equal((await coach.fetch(new Request(url),env)).status,200);assert(await row('stop'),'GET only offers confirmation');
 assert.equal((await coach.fetch(new Request(url,{method:'POST',body:'List-Unsubscribe=One-Click'}),env)).status,200);
 assert.equal(await row('stop'),null);
});
test('confirmation send failure and missing provider cannot report a subscription',async()=>{
 const send=env.EMAIL.send;env.EMAIL.send=async()=>{throw new Error('not connected');};
 await assert.rejects(emailSubscription(env,'send-error','POST',{email:'send-error@example.com'}),e=>e.status===503);assert.equal(await row('send-error'),null);env.EMAIL.send=send;
 const disconnected={...env,EMAIL:undefined};assert.equal((await emailSubscription(disconnected,'nobody','GET')).configured,false);
 await assert.rejects(emailSubscription(disconnected,'nobody','POST',{email:'nobody@example.com'}),e=>e.status===503);
});
test('public release info needs no login; subscription writes require the signed-in account and origin',async()=>{
 const current=await coach.fetch(new Request('https://coach.test/api/releases/current'),env);assert.equal(current.status,200);assert.equal((await current.json()).id,RELEASE.id);
 const anonymous=await coach.fetch(new Request('https://coach.test/api/updates/subscription'),env);assert.equal(anonymous.status,401);
 const forged=await coach.fetch(new Request('https://coach.test/api/updates/subscription',{method:'POST',headers:{Origin:'https://evil.test','Content-Type':'application/json','oai-authenticated-user-id':'alice'},body:JSON.stringify({email:'attacker@example.com'})}),env);assert.equal(forged.status,403);
});
test('MOM Dispatch uses the verified sender and Resend receives a stable idempotency key',async()=>{
 const requests=[];globalThis.fetch=async(url,options)=>{requests.push({url,options});return Response.json({id:'accepted-message'});};
 try{
  await emailSubscription({...env,EMAIL:undefined,RESEND_API_KEY:'test-key',RELEASE_EMAIL_FROM:'dispatch@mominc.online'},'resend','POST',{email:'resend@example.com'});
  assert.equal(requests.length,1);assert.equal(requests[0].url,'https://api.resend.com/emails');
  const m=JSON.parse(requests[0].options.body);assert.equal(m.from,'MOM Dispatch <dispatch@mominc.online>');assert(m.subject.startsWith('MOM Dispatch'));assert(m.text.includes('MOM here.'));assert.match(requests[0].options.headers['Idempotency-Key'],/^coach-[a-f0-9]{64}$/);
 }finally{globalThis.fetch=async()=>Response.json(RELEASE);}
});
