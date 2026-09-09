import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {Miniflare} from 'miniflare';
import {readFile,readdir} from 'node:fs/promises';
import coach from '../server/worker.mjs';
import service from '../scheduler/service.mjs';

let mf,local,remote,originalFetch;
before(async()=>{
  mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("ok")}}',d1Databases:['LOCAL','REMOTE']});
  local={DB:await mf.getD1Database('LOCAL'),REMINDER_SERVICE_ORIGIN:'https://reminders.test',REMINDER_SERVICE_TOKEN:'test-service-token'};
  remote={DB:await mf.getD1Database('REMOTE'),REMINDER_SERVICE_TOKEN:'test-service-token',VAPID_PUBLIC_KEY:'public-key'};
  for(const env of [local,remote])for(const f of (await readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort())await env.DB.batch((await readFile(`drizzle/${f}`,'utf8')).split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean).map(s=>env.DB.prepare(s)));
  originalFetch=globalThis.fetch;
  globalThis.fetch=(url,options)=>{assert.equal(new URL(url).origin,'https://reminders.test');return service.fetch(new Request(url,options),remote);};
});
after(async()=>{globalThis.fetch=originalFetch;await mf?.dispose();});
async function request(path,{method='GET',user='alice',data,origin='https://coach.test'}={}){
  const response=await coach.fetch(new Request(`https://coach.test${path}`,{method,headers:{...(user?{'oai-authenticated-user-id':user}:{}),'Origin':origin,'Content-Type':'application/json'},body:data?JSON.stringify(data):undefined}),local);
  return {status:response.status,data:await response.json()};
}
const reminder=(kind='water')=>({id:crypto.randomUUID(),kind,time:'09:00',timezone:'America/Los_Angeles',enabled:true,quietStart:'22:00',quietEnd:'07:00'});
test('public reminder service refuses forged account headers and unrelated API routes',async()=>{
  for(const headers of [{'oai-authenticated-user-id':'alice'},{'Authorization':'Bearer wrong','X-Coach-User':'alice'}])assert.equal((await service.fetch(new Request('https://reminders.test/api/reminders',{headers}),remote)).status,401);
  assert.equal((await service.fetch(new Request('https://reminders.test/api/meals',{headers:{Authorization:'Bearer test-service-token','X-Coach-User':'alice'}}),remote)).status,404);
  assert.equal((await request('/api/reminders',{user:null})).status,401);
  assert.equal((await request('/api/reminders',{method:'POST',data:reminder(),origin:'https://evil.test'})).status,403);
});
test('saved reminders migrate once and remain deleted across migration retries',async()=>{
  const r=reminder();await local.DB.prepare('INSERT INTO reminders(id,user_id,kind,time,timezone,enabled,quiet_start,quiet_end) VALUES(?,?,?,?,?,?,?,?)').bind(r.id,'alice',r.kind,r.time,r.timezone,1,r.quietStart,r.quietEnd).run();
  const migrated=await request('/api/reminders');assert.equal(migrated.status,200);assert.equal(migrated.data.items.length,1);
  await request(`/api/reminders/${r.id}`,{method:'DELETE'});
  await local.DB.prepare('DELETE FROM system WHERE key=?').bind('reminders_remote:alice').run();
  assert.equal((await request('/api/reminders')).data.items.length,0);
});
test('reminder switches persist, validate booleans, and refuse another account',async()=>{
 const r=reminder();await request('/api/reminders',{method:'POST',data:r});
 assert.equal((await request('/api/reminders/'+r.id,{method:'PATCH',user:'bob',data:{enabled:false}})).status,404);
 assert.equal((await request('/api/reminders/'+r.id,{method:'PATCH',data:{enabled:'false'}})).status,400);
 assert.equal((await request('/api/reminders/'+r.id,{method:'PATCH',data:{enabled:false}})).status,200);
 assert.equal((await request('/api/reminders')).data.items.find(x=>x.id===r.id).enabled,0);
 await request('/api/reminders/'+r.id,{method:'PATCH',data:{enabled:true}});
 assert.equal((await request('/api/reminders')).data.items.find(x=>x.id===r.id).enabled,1);
 await request('/api/reminders/'+r.id,{method:'DELETE'});
});
test('remote reminder changes and export remain isolated by the signed-in account',async()=>{
  const r=reminder();assert.equal((await request('/api/reminders',{method:'POST',data:r})).status,200);
  await request('/api/reminders',{method:'POST',data:r});
  assert.equal((await request('/api/reminders')).data.items.length,1);
  assert.equal((await request('/api/reminders',{user:'bob'})).data.items.length,0);
  await request(`/api/reminders/${r.id}`,{method:'DELETE',user:'bob'});
  assert.equal((await request('/api/export')).data.reminders[0].id,r.id);
  assert.equal((await local.DB.prepare('SELECT count(*) AS n FROM reminders WHERE id=?').bind(r.id).first()).n,0);
});
test('scheduler runs independently and account reports a real recent heartbeat',async()=>{
  assert.equal((await request('/api/account')).data.push.schedulerActive,false);
  let scheduled;await service.scheduled({},remote,{waitUntil:p=>{scheduled=p;}});await scheduled;
  assert.equal((await request('/api/account')).data.push.schedulerActive,true);
  await remote.DB.prepare("UPDATE system SET value=? WHERE key='scheduler_tick'").bind(String(Date.now()-600000)).run();
  assert.equal((await request('/api/account')).data.push.schedulerActive,false);
});
test('reminder outage preserves the rest of the account and never reports a successful save',async()=>{
  const token=local.REMINDER_SERVICE_TOKEN;local.REMINDER_SERVICE_TOKEN='wrong';
  try{assert.equal((await request('/api/account')).status,200);assert.equal((await request('/api/account')).data.push.schedulerActive,false);assert.equal((await request('/api/reminders',{method:'POST',data:reminder()})).status,401);}finally{local.REMINDER_SERVICE_TOKEN=token;}
});
test('deleting account removes remote reminders and retries cannot restore them',async()=>{
  assert.equal((await request('/api/account',{method:'DELETE',data:{confirm:'DELETE'}})).status,200);
  assert.equal((await request('/api/reminders')).data.items.length,0);
  await local.DB.prepare('DELETE FROM system WHERE key=?').bind('reminders_remote:alice').run();
  assert.equal((await request('/api/reminders')).data.items.length,0);
});
