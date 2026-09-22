import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {Miniflare} from 'miniflare';
import {readFile,readdir} from 'node:fs/promises';
import worker from '../server/worker.mjs';
import {deliverCoachArmyOutbox} from '../server/coach-army-runs.mjs';
let mf,env;
before(async()=>{mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("ok")}}',d1Databases:['DB']});env={DB:await mf.getD1Database('DB'),COACH_ARMY_COMPLETION_SECRET:'trusted-verifier'};for(const f of(await readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort())await env.DB.batch((await readFile(`drizzle/${f}`,'utf8')).split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean).map(s=>env.DB.prepare(s)));});
after(async()=>mf?.dispose());
async function call(path,{method='GET',data,user='alice',secret}={}){const r=await worker.fetch(new Request('https://coach.test'+path,{method,headers:{...(user?{'oai-authenticated-user-id':user,'X-Target-Account':user,'X-Expected-Data-Epoch':'1'}:{}),...(method!=='GET'?{Origin:'https://coach.test','Content-Type':'application/json'}:{}),...(secret?{Authorization:`Bearer ${secret}`}:{})},body:data?JSON.stringify(data):undefined}),env);return {status:r.status,data:await r.json()};}
test('authenticated browser ledger rejects forgery, skips, order changes, and cross-account access',async()=>{
 const started=await call('/api/coach-army/runs',{method:'POST'});assert.equal(started.status,201);const id=started.data.run.id;
 assert.equal((await call(`/api/coach-army/runs/${id}/events`,{method:'POST',data:{eventId:'skip',sequence:2,stage:'goon'}})).status,409);
 assert.equal((await call(`/api/coach-army/runs/${id}/events`,{method:'POST',data:{eventId:'wrong',sequence:1,stage:'armie'}})).status,409);
 assert.equal((await call(`/api/coach-army/runs/${id}`,{user:'bob'})).status,404);
 for(const [sequence,stage] of ['djscratch','goon','lilboyfriend','corgi','hand','armie'].entries()){const result=await call(`/api/coach-army/runs/${id}/events`,{method:'POST',data:{eventId:`browser-${sequence}`,sequence:sequence+1,stage}});assert.equal(result.status,200);assert.equal(result.data.run.completed,false);assert.equal(result.data.evidence,'pending_verifier');}
 assert.equal((await env.DB.prepare('SELECT COUNT(*) AS n FROM coach_army_completion_outbox WHERE run_id=?').bind(id).first()).n,0);
});
test('trusted evidence is sequential, idempotent, and retries a durable outbox without hardcoded credentials',async()=>{
 const id=(await call('/api/coach-army/runs',{method:'POST',user:'verifier-owner'})).data.run.id;
 for(const [sequence,stage] of ['djscratch','goon','lilboyfriend','corgi','hand','armie'].entries()){const input={runId:id,accountId:'verifier-owner',eventId:`verified-${id}-${sequence}`,sequence:sequence+1,stage};const r=await call('/api/integrations/coach-army/run-events',{method:'POST',secret:env.COACH_ARMY_COMPLETION_SECRET,data:input,user:null});assert.equal(r.status,200);if(sequence===5)assert.equal(r.data.run.completed,true);}
 const replay=await call('/api/integrations/coach-army/run-events',{method:'POST',secret:env.COACH_ARMY_COMPLETION_SECRET,data:{runId:id,accountId:'verifier-owner',eventId:`verified-${id}-5`,sequence:6,stage:'armie'},user:null});assert.equal(replay.status,200);
 assert.deepEqual(await deliverCoachArmyOutbox(env.DB,{},100),{attempted:0,delivered:0,configured:false});
 let attempts=0,original=globalThis.fetch;globalThis.fetch=async()=>{attempts++;return new Response(attempts===1?'no':'ok',{status:attempts===1?503:200});};try{const configured={...env,COACH_ARMY_ENTITLEMENT_URL:'https://entitlement.test/complete',COACH_ARMY_ENTITLEMENT_TOKEN:'configured-only'};assert.equal((await deliverCoachArmyOutbox(env.DB,configured,200)).delivered,0);assert.equal((await deliverCoachArmyOutbox(env.DB,configured,300)).delivered,1);}finally{globalThis.fetch=original;}
 const outbox=await env.DB.prepare('SELECT status,attempts FROM coach_army_completion_outbox WHERE run_id=?').bind(id).first();assert.deepEqual(outbox,{status:'delivered',attempts:2});
});
test('DJ Scratch server challenge verifies the real rack order and rejects forged, cross-account, expired, and replayed controls',async()=>{
 const id=(await call('/api/coach-army/runs',{method:'POST',user:'dj-owner'})).data.run.id;
 const created=await call(`/api/coach-army/runs/${id}/djscratch`,{method:'POST',user:'dj-owner'});assert.equal(created.status,200);const challenge=created.data.challenge;
 assert.deepEqual(challenge.steps,[{key:'bass',value:8},{key:'treble',value:3},{key:'volume',value:7},{key:'tempo',value:9}]);
 assert.equal((await call(`/api/coach-army/runs/${id}/djscratch/controls`,{method:'POST',user:'dj-owner',data:{challengeId:challenge.id,key:'tempo',value:9}})).data.accepted,false);
 assert.equal((await call(`/api/coach-army/runs/${id}/djscratch/controls`,{method:'POST',user:'dj-intruder',data:{challengeId:challenge.id,key:'bass',value:8}})).status,404);
 for(const {key,value} of challenge.steps)assert.equal((await call(`/api/coach-army/runs/${id}/djscratch/controls`,{method:'POST',user:'dj-owner',data:{challengeId:challenge.id,key,value}})).status,200);
 const replay=await call(`/api/coach-army/runs/${id}/djscratch/controls`,{method:'POST',user:'dj-owner',data:{challengeId:challenge.id,key:'tempo',value:9}});assert.equal(replay.data.replay,true);
 const event=await env.DB.prepare('SELECT sequence,stage,source FROM coach_army_run_events WHERE run_id=?').bind(id).first();assert.deepEqual(event,{sequence:1,stage:'djscratch',source:'verifier'});
 const expired=(await call(`/api/coach-army/runs/${id}/djscratch`,{method:'POST',user:'dj-owner'})).data.challenge;await env.DB.prepare('UPDATE coach_army_djscratch_challenges SET expires_at=0 WHERE id=?').bind(expired.id).run();assert.equal((await call(`/api/coach-army/runs/${id}/djscratch/controls`,{method:'POST',user:'dj-owner',data:{challengeId:expired.id,key:'bass',value:8}})).status,409);
});
