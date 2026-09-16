import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {Miniflare} from 'miniflare';
import {readFile,readdir} from 'node:fs/promises';
import worker from '../server/worker.mjs';

let mf,env;
before(async()=>{mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("ok")}}',d1Databases:['DB']});env={DB:await mf.getD1Database('DB')};for(const file of(await readdir('drizzle')).filter(file=>file.endsWith('.sql')).sort())await env.DB.batch((await readFile(`drizzle/${file}`,'utf8')).split('--> statement-breakpoint').map(sql=>sql.trim()).filter(Boolean).map(sql=>env.DB.prepare(sql)));});
after(async()=>mf?.dispose());
async function call(path,{method='GET',data,user='alice'}={}){const response=await worker.fetch(new Request('https://coach.test'+path,{method,headers:{...(user?{'oai-authenticated-user-id':user}:{}),...(method==='GET'?{}:{Origin:'https://coach.test','Content-Type':'application/json'})},body:data===undefined?undefined:JSON.stringify(data)}),env);return {status:response.status,data:await response.json()};}
async function unlock(user){await env.DB.prepare("INSERT INTO account_entitlements(user_id,coach_army_status,coach_army_completed_at,coach_army_event_id,updated_at) VALUES(?, 'completed', ?, 'event', ?) ON CONFLICT(user_id) DO NOTHING").bind(user,1,1).run();}

test('War Room rejects locked and anonymous requests without creating an arsenal',async()=>{
 assert.equal((await call('/api/war-room')).status,403);
 assert.equal((await call('/api/war-room',{user:null})).status,401);
 assert.equal((await env.DB.prepare('SELECT COUNT(*) AS n FROM war_room_arsenals').first()).n,0);
});
test('verified account saves and reloads its own validated loadout and recipes',async()=>{
 await unlock('alice');const initial=await call('/api/war-room');assert.equal(initial.status,200);assert.deepEqual(initial.data.state.loadout,{type:'rapier',tier:0});
 const saved=await call('/api/war-room/loadout',{method:'PUT',data:{revision:0,userId:'bob',loadout:{type:'staff',tier:4}}});assert.equal(saved.status,200);assert.deepEqual(saved.data.state.loadout,{type:'staff',tier:4});
 const recipe=await call('/api/war-room/recipes',{method:'POST',data:{revision:1,recipe:{id:'saved-1',name:'Existing design',data:'HB4-01-01-01-01-01-01-01-01-01'}}});assert.equal(recipe.status,200);assert.equal(recipe.data.state.recipes.length,1);
 const reload=await call('/api/war-room');assert.deepEqual(reload.data.state.loadout,{type:'staff',tier:4});assert.equal(reload.data.state.recipes[0].name,'Existing design');
 assert.equal((await call('/api/war-room',{user:'bob'})).status,403);
 assert.equal((await call('/api/war-room/loadout',{method:'PUT',data:{revision:2,loadout:{type:'invented',tier:999}}})).status,400);
});
test('profile import is explicit, validated, and cannot claim another owner',async()=>{
 await unlock('bob');
 await env.DB.prepare('INSERT INTO profiles(user_id,data,revision,updated_at) VALUES(?,?,0,1)').bind('bob',JSON.stringify({'mominc-avatar-v1':JSON.stringify({weapon:{type:'cannon',tier:20}}),'myr5-recipe-v1':'legacy-recipe'})).run();
 const before=await call('/api/war-room',{user:'bob'});const imported=await call('/api/war-room/import/profile',{method:'POST',user:'bob',data:{revision:before.data.state.revision,ownerId:'alice'}});assert.equal(imported.status,200);assert.deepEqual(imported.data.state.loadout,{type:'cannon',tier:20});assert.equal(imported.data.state.recipes[0].id,'legacy-myr5');
 const alice=await call('/api/war-room');assert.deepEqual(alice.data.state.loadout,{type:'staff',tier:4});
});
test('writes cannot be replayed or crossed into another verified account',async()=>{
 await unlock('bob');const own=await call('/api/war-room',{user:'bob'});assert.equal((await call('/api/war-room/loadout',{method:'PUT',user:'bob',data:{revision:own.data.state.revision,loadout:{type:'bow',tier:1}}})).status,200);
 const stale=await call('/api/war-room/loadout',{method:'PUT',user:'bob',data:{revision:own.data.state.revision,loadout:{type:'bow',tier:2}}});assert.equal(stale.status,409);
 const alice=await call('/api/war-room');assert.deepEqual(alice.data.state.loadout,{type:'staff',tier:4});
});
test('malformed persisted rows are safely ignored without resetting revision',async()=>{
 await unlock('malformed');
 await env.DB.prepare('INSERT INTO war_room_arsenals(user_id,loadout,recipes,revision,updated_at) VALUES(?,?,?,?,?)').bind('malformed','not-json',JSON.stringify([{id:'ok',name:'Valid',data:'legacy'},{id:'bad',name:7,data:'x'},{id:'ok',name:'duplicate',data:'x'}]),4,1).run();
 const read=await call('/api/war-room',{user:'malformed'});
 assert.equal(read.status,200);
 assert.deepEqual(read.data.state.loadout,{type:'rapier',tier:0});
 assert.deepEqual(read.data.state.recipes,[{id:'ok',name:'Valid',data:'legacy'}]);
 const saved=await call('/api/war-room/loadout',{method:'PUT',user:'malformed',data:{revision:0,loadout:{type:'cannon',tier:20}}});
 assert.equal(saved.status,409);
});
