import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {Miniflare} from 'miniflare';
import {readFile,readdir} from 'node:fs/promises';
import worker from '../server/worker.mjs';
import {createCoachArmyBinding} from '../server/entitlements.mjs';
let mf,env;
before(async()=>{mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("ok")}}',d1Databases:['DB']});env={DB:await mf.getD1Database('DB'),COACH_ARMY_COMPLETION_SECRET:'army-secret'};for(const f of(await readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort()){const sql=await readFile(`drizzle/${f}`,'utf8');await env.DB.batch(sql.split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean).map(s=>env.DB.prepare(s)));}await env.DB.prepare('INSERT INTO gala_runs(id,token_hash,creator,started_at,completed_at) VALUES(?,?,?,?,?)').bind('00000000-0000-4000-8000-000000000001','hash','ip',100,1000).run();});
after(async()=>mf?.dispose());
async function call(path,{method='GET',data,user='alice',secret}={}){const headers={...(user?{'oai-authenticated-user-id':user}:{}),...(method!=='GET'?{Origin:'https://coach.test','Content-Type':'application/json'}:{}),...(secret?{Authorization:`Bearer ${secret}`}:{})};const r=await worker.fetch(new Request(`https://coach.test${path}`,{method,headers,body:data?JSON.stringify(data):undefined}),env);return {status:r.status,data:await r.json()};}
test('trusted completed run binding is account-bound, short-lived, and single-use',async()=>{
 const made=await call('/api/integrations/coach-army/binding',{method:'POST',secret:env.COACH_ARMY_COMPLETION_SECRET,data:{runId:'00000000-0000-4000-8000-000000000001',accountId:'alice',eventId:'binding-event-1',completedAt:1000}});assert.equal(made.status,200);const b=made.data.binding;assert(b.claimToken);
 assert.equal((await call('/api/coach-army/claim',{method:'POST',user:'bob',data:{bindingId:b.bindingId,claimToken:b.claimToken}})).status,403);
 assert.equal((await call('/api/coach-army/claim',{method:'POST',user:'alice',data:{bindingId:b.bindingId,claimToken:b.claimToken}})).status,200);
 assert.equal((await call('/api/coach-army/claim',{method:'POST',user:'alice',data:{bindingId:b.bindingId,claimToken:b.claimToken}})).status,409);
 assert.equal((await call('/api/integrations/coach-army/binding',{method:'POST',secret:'wrong',data:{runId:b.bindingId,accountId:'alice',eventId:'bad',completedAt:1000}})).status,401);
});
test('uncompleted run cannot mint binding and expired binding cannot claim',async()=>{
 await env.DB.prepare('INSERT INTO gala_runs(id,token_hash,creator,started_at) VALUES(?,?,?,?)').bind('00000000-0000-4000-8000-000000000002','hash2','ip',100).run();
 assert.equal((await call('/api/integrations/coach-army/binding',{method:'POST',secret:env.COACH_ARMY_COMPLETION_SECRET,data:{runId:'00000000-0000-4000-8000-000000000002',accountId:'alice',eventId:'binding-event-2',completedAt:1000}})).status,409);
 const b=await createCoachArmyBinding(env.DB,{runId:'00000000-0000-4000-8000-000000000001',accountId:'alice',eventId:'binding-event-expired',completedAt:1000},2000);
 const expired=await call('/api/coach-army/claim',{method:'POST',user:'alice',data:{bindingId:b.bindingId,claimToken:b.claimToken}});
 assert.equal(expired.status,410);
});
