import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {Miniflare} from 'miniflare';
import {readFile,readdir} from 'node:fs/promises';
import worker from '../server/worker.mjs';
let mf,env;
before(async()=>{mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("ok")}}',d1Databases:['DB']});env={DB:await mf.getD1Database('DB')};for(const f of(await readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort()){const sql=await readFile(`drizzle/${f}`,'utf8');await env.DB.batch(sql.split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean).map(s=>env.DB.prepare(s)));}});
after(async()=>mf?.dispose());
async function call(path,method='GET',data,token,origin='https://mominc.online'){const r=await worker.fetch(new Request('https://coach.test/api/gala'+path,{method,headers:{Origin:origin,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:data?JSON.stringify(data):undefined}),env);return {status:r.status,data:r.status===204?null:await r.json(),headers:r.headers};}
test('ranked run requires Gala, DJ, remaining route, and installed app; optional Fuel cannot satisfy a gate',async()=>{
 const {data:run}=await call('/runs','POST',{}),base='/runs/'+run.id;
 assert.equal((await call(base+'/join','POST',{confirm:true},run.token)).status,409);
 assert.equal((await call(base+'/checkpoint','POST',{stage:'fuel'},run.token)).status,400);
 assert.equal((await call(base+'/checkpoint','POST',{stage:'armie'},run.token)).status,409);
 assert.equal((await call(base+'/checkpoint','POST',{stage:'djscratch',base:'DJ ECHO 3000',moniker:'X'},run.token)).status,400);
 await call(base+'/checkpoint','POST',{stage:'djscratch',base:'DJ ECHO 3000',moniker:'ABC'},run.token);
 for(const stage of ['lilboyfriend','corgi','hand','armie'])assert.equal((await call(base+'/checkpoint','POST',{stage},run.token)).status,200);
 assert.equal((await call(base,'GET',null,run.token)).data.completedAt,null);
 const final=await call(base+'/checkpoint','POST',{stage:'goon'},run.token);assert(final.data.completedAt);assert.equal(final.data.completed.includes('fuel'),false);
 assert.equal((await call(base+'/join','POST',{confirm:true},run.token)).status,409);
 assert.equal((await call(base+'/install','POST',{installed:true},run.token)).status,403);
 assert.equal((await call(base+'/install','POST',{installed:true},run.token,'https://coach.test')).status,200);
 const joined=await call(base+'/join','POST',{confirm:true},run.token);assert.equal(joined.status,200);
 assert.equal(joined.data.durationMs,final.data.durationMs);
 const again=await call(base+'/checkpoint','POST',{stage:'armie'},run.token);assert.equal(again.data.durationMs,final.data.durationMs);
 assert.equal((await call(base+'/join','POST',{confirm:true},run.token)).data.joinedAt,joined.data.joinedAt);
 const board=(await call('/leaderboard')).data.items;assert.equal(board.length,1);assert.equal(board[0].djName,'DJ ECHO 3000 · ABC');assert(!('token' in board[0]));assert(!('id' in board[0]));
});
test('run tokens isolate private progress and CORS remains confined to the website and app',async()=>{
 const {data:run}=await call('/runs','POST',{}),base='/runs/'+run.id;
 assert.equal((await call(base,'GET')).status,401);
 assert.equal((await call(base,'GET',null,'f'.repeat(64))).status,404);
 assert.equal((await call('/runs','POST',{},null,'https://evil.test')).status,403);
 const preflight=await call('/runs','OPTIONS');assert.equal(preflight.status,204);assert.equal(preflight.headers.get('Access-Control-Allow-Origin'),'https://mominc.online');
 assert.equal((await call('/runs','OPTIONS',null,null,'https://evil.test')).status,403);
 const privateRun=await call(base,'GET',null,run.token);assert(!('token_hash' in privateRun.data));assert(!('creator' in privateRun.data));
});
