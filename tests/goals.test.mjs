import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {Miniflare} from 'miniflare';
import {readFile,readdir} from 'node:fs/promises';
import worker from '../server/worker.mjs';

let mf,env;
before(async()=>{
 mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("ok")}}',d1Databases:['DB']});
 env={DB:await mf.getD1Database('DB')};
 for(const file of (await readdir('drizzle')).filter(file=>file.endsWith('.sql')).sort()){
  const statements=(await readFile(`drizzle/${file}`,'utf8')).split('--> statement-breakpoint').map(sql=>sql.trim()).filter(Boolean);
  await env.DB.batch(statements.map(sql=>env.DB.prepare(sql)));
 }
});
after(async()=>mf?.dispose());

async function request(path,{method='GET',data,user='goal-alice',origin='https://coach.test'}={}){
 const headers={};
 if(user) Object.assign(headers,{'oai-authenticated-user-id':user,'oai-authenticated-user-email':`${user}@test.example`});
 if(!['GET','HEAD'].includes(method)) Object.assign(headers,{Origin:origin,'Content-Type':'application/json'});
 const response=await worker.fetch(new Request(`https://coach.test${path}`,{method,headers,body:data===undefined?undefined:JSON.stringify(data)}),env);
 return {status:response.status,data:await response.json()};
}

test('goals migration creates an account-scoped persistence table',async()=>{
 const table=await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='goals'").first();
 const index=await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='index' AND name='goals_user_updated'").first();
 assert.equal(table.name,'goals');assert.equal(index.name,'goals_user_updated');
});

test('goals reject anonymous and cross-origin writes',async()=>{
 assert.equal((await request('/api/goals',{user:null})).status,401);
 assert.equal((await request('/api/goals',{method:'POST',origin:'https://evil.test',data:{title:'Nope'}})).status,403);
});

test('goals create, reload, update, and clear an optional note',async()=>{
 const created=await request('/api/goals',{method:'POST',data:{title:'Walk after lunch',note:''}});
 assert.equal(created.status,200);assert.match(created.data.id,/^[a-f0-9-]{36}$/);
 let listed=await request('/api/goals');assert.equal(listed.data.items.length,1);assert.deepEqual(Object.keys(listed.data.items[0]).sort(),['created_at','id','note','status','title','updated_at']);
 assert.deepEqual({title:listed.data.items[0].title,note:listed.data.items[0].note,status:listed.data.items[0].status},{title:'Walk after lunch',note:'',status:'active'});
 assert.equal((await request(`/api/goals/${created.data.id}`,{method:'PATCH',data:{title:'Walk after lunch',note:'Outside',status:'completed'}})).status,200);
 assert.equal((await request(`/api/goals/${created.data.id}`,{method:'PATCH',data:{note:'',status:'archived'}})).status,200);
 listed=await request('/api/goals');assert.deepEqual({title:listed.data.items[0].title,note:listed.data.items[0].note,status:listed.data.items[0].status},{title:'Walk after lunch',note:'',status:'archived'});
});

test('goals keep account ownership server-side despite forged ids and account fields',async()=>{
 const id=crypto.randomUUID();
 assert.equal((await request('/api/goals',{method:'POST',user:'goal-account-a',data:{id,title:'Account A',note:'private',user_id:'goal-account-b',accountId:'goal-account-b'}})).status,200);
 assert.equal((await request('/api/goals',{user:'goal-account-b'})).data.items.length,0);
 for(const data of [{status:'completed'},{title:'Stolen'},{note:'Stolen'}])assert.equal((await request(`/api/goals/${id}`,{method:'PATCH',user:'goal-account-b',data:{...data,user_id:'goal-account-b',accountId:'goal-account-b'}})).status,404);
 const owner=await request('/api/goals',{user:'goal-account-a'});assert.equal(owner.data.items.length,1);assert.deepEqual({title:owner.data.items[0].title,note:owner.data.items[0].note,status:owner.data.items[0].status},{title:'Account A',note:'private',status:'active'});
});

test('goals validate title, note, status, and request shape',async()=>{
 for(const data of [{title:''},{title:'x'.repeat(161)},{title:'okay',note:7},{title:'okay',note:'x'.repeat(1001)}])assert.equal((await request('/api/goals',{method:'POST',data})).status,400);
 const id=crypto.randomUUID();await request('/api/goals',{method:'POST',data:{id,title:'Valid'}});
 for(const data of [{},{status:'rewarded'},{title:''},{note:7},{note:'x'.repeat(1001)}])assert.equal((await request(`/api/goals/${id}`,{method:'PATCH',data})).status,400);
});

test('goals are included in export and account deletion',async()=>{
 const id=crypto.randomUUID();assert.equal((await request('/api/goals',{method:'POST',user:'goal-cleanup',data:{id,title:'Clear me'}})).status,200);
 const exportData=(await request('/api/export',{user:'goal-cleanup'})).data;assert.equal(exportData.goals.length,1);assert.equal(exportData.goals[0].id,id);
 assert.equal((await request('/api/account',{method:'DELETE',user:'goal-cleanup',data:{confirm:'DELETE'}})).status,200);
 assert.equal((await request('/api/goals',{user:'goal-cleanup'})).data.items.length,0);
});
