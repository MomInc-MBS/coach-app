import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {Miniflare} from 'miniflare';
import {readFile,readdir} from 'node:fs/promises';
import worker from '../server/worker.mjs';
let mf,env;
before(async()=>{mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("ok")}}',d1Databases:['DB']});env={DB:await mf.getD1Database('DB'),COACH_ARMY_COMPLETION_SECRET:'army-secret'};for(const f of(await readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort()){const sql=await readFile(`drizzle/${f}`,'utf8');await env.DB.batch(sql.split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean).map(s=>env.DB.prepare(s)));}});
after(async()=>mf?.dispose());
async function request(path,{method='GET',data,user='alice',secret,origin='https://coach.test'}={}){const headers={...(user?{'oai-authenticated-user-id':user,'X-Target-Account':user,'X-Expected-Data-Epoch':'1'}:{}),...(method!=='GET'?{Origin:origin,'Content-Type':'application/json'}:{}),...(secret?{Authorization:'Bearer '+secret}:{})};const r=await worker.fetch(new Request(`https://coach.test${path}`,{method,headers,body:data?JSON.stringify(data):undefined}),env);return {status:r.status,data:await r.json()};}
test('account entitlement is locked until trusted completion, then durable and replay-idempotent',async()=>{
 assert.equal((await request('/api/account')).data.entitlements.coachArmy,null);
 assert.equal((await request('/api/integrations/coach-army/completion',{method:'POST',secret:'wrong',data:{eventType:'coach_army.completed',eventId:'e1',accountId:'alice',completedAt:100}})).status,401);
 assert.equal((await request('/api/integrations/coach-army/completion',{method:'POST',secret:env.COACH_ARMY_COMPLETION_SECRET,data:{eventType:'intake.completed',eventId:'e0',accountId:'alice',completedAt:100}})).status,400);
 const event={eventType:'coach_army.completed',eventId:'event-1',accountId:'alice',completedAt:1700000000000};
 assert.equal((await request('/api/integrations/coach-army/completion',{method:'POST',secret:env.COACH_ARMY_COMPLETION_SECRET,data:event})).status,200);
 const granted=(await request('/api/account')).data.entitlements.coachArmy;assert.deepEqual(granted,{status:'completed',completedAt:event.completedAt});
 const replay=await request('/api/integrations/coach-army/completion',{method:'POST',secret:env.COACH_ARMY_COMPLETION_SECRET,data:{...event,completedAt:1700000000001}});assert.equal(replay.status,409);assert.deepEqual((await request('/api/account')).data.entitlements.coachArmy,granted);
 assert.equal((await request('/api/account',{user:'bob'})).data.entitlements.coachArmy,null);
});
test('a public game result cannot mint or claim an entitlement',async()=>{
 const gameResult={game:{hallways:3},completed:true,accountId:'charlie',eventId:'forged-browser-result',completedAt:1700000000000};
 assert.equal((await request('/api/integrations/coach-army/completion',{method:'POST',user:'charlie',data:{eventType:'coach_army.completed',...gameResult}})).status,401);
 assert.equal((await request('/api/coach-army/claim',{method:'POST',user:'charlie',data:{bindingId:'forged-browser-binding',claimToken:'not-a-server-token',...gameResult}})).status,403);
 assert.equal((await request('/api/account',{user:'charlie'})).data.entitlements.coachArmy,null);
});
test('account deletion removes the entitlement and its event ledger',async()=>{assert.equal((await request('/api/account',{method:'DELETE',data:{confirm:'DELETE',expectedDataEpoch:1}})).status,200);assert.equal((await request('/api/account')).data.entitlements.coachArmy,null);assert.equal((await env.DB.prepare('SELECT COUNT(*) AS n FROM coach_army_completions WHERE user_id=?').bind('alice').first()).n,0);});
