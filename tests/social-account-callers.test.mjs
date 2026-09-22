import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {createWarRoomApi} from '../war-room/account-api.mjs';
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
function transitions(){let version=0,controller=new AbortController();const listeners=[];return {capture:()=>({version,signal:controller.signal}),assertCurrent(ticket){if(ticket.version!==version)throw Object.assign(Error('changed'),{code:'auth_transition'});},subscribe(fn){listeners.push(fn);},invalidate(){version++;controller.abort();controller=new AbortController();for(const fn of listeners)fn();}};}
const room=(owner='A',epoch=1)=>Response.json({targetAccountId:owner,dataEpoch:epoch,state:{revision:1}});
test('War Room cannot write without authenticated room proof and binds displayed owner/epoch before await',async()=>{
 const t=transitions(),calls=[],gate=deferred();const client=createWarRoomApi({transitions:t,request:async(path,options)=>{calls.push({path,options});return path==='/api/war-room'?room('A',3):gate.promise;}});
 await assert.rejects(client.api('/api/war-room/loadout',{method:'PUT'}),{code:'account_scope_changed'});assert.equal(calls.length,0);
 await client.api('/api/war-room');const pending=client.api('/api/war-room/loadout',{method:'PUT',body:'old body'});
 assert.equal(calls[1].options.headers.get('X-Target-Account'),'A');assert.equal(calls[1].options.headers.get('X-Expected-Data-Epoch'),'3');
 t.invalidate();gate.resolve(Response.json({state:{revision:2}}));await assert.rejects(pending,{code:'auth_transition'});
 await assert.rejects(client.api('/api/war-room/loadout',{method:'PUT'}),{code:'account_scope_changed'});assert.equal(calls.length,2);
});
test('War Room overlapping reads cannot restore stale generation or acknowledge old write after a newer room read',async()=>{
 const t=transitions(),first=deferred(),write=deferred();let read=0;
 const client=createWarRoomApi({transitions:t,request:async path=>path==='/api/war-room'?(++read===1?first.promise:room('A',2)):write.promise});
 const old=client.api('/api/war-room');await client.api('/api/war-room');first.resolve(room('A',1));await assert.rejects(old,{code:'account_scope_changed'});
 const pending=client.api('/api/war-room/loadout',{method:'PUT'});await client.api('/api/war-room');write.resolve(Response.json({state:{revision:99}}));await assert.rejects(pending,{code:'account_scope_changed'});
});
test('War Room rejects malformed generation proof rather than coercing it',async()=>{
 const client=createWarRoomApi({transitions:transitions(),request:async()=>room('A','2')});await assert.rejects(client.api('/api/war-room'),{code:'account_scope_changed'});await assert.rejects(client.api('/api/war-room/loadout',{method:'PUT'}),{code:'account_scope_changed'});
});
test('actual launch API binds every scoreboard mutation to captured account and preserves explicit headers',async()=>{
 const source=await readFile(new URL('../launch.mjs',import.meta.url),'utf8'),apiSource=source.split('\n').find(line=>line.startsWith('export async function api(')).replace(/^export /,''),calls=[],t=transitions();
 const context={accountTransitions:t,account:{user:{id:'A'},dataEpoch:3},authFetch:async(...args)=>{calls.push(args);return Response.json({});},Response,Error,JSON,Object};const api=vm.runInNewContext(apiSource+';api',context);
 for(const [path,method]of [['/api/scoreboard/invite','POST'],['/api/scoreboard/invite','DELETE'],['/api/scoreboard/join','POST'],['/api/scoreboard/friends/link','DELETE']])await api(path,method,{consent:true});
 for(const [,options]of calls){assert.equal(options.headers['X-Target-Account'],'A');assert.equal(options.headers['X-Expected-Data-Epoch'],'3');}
 await api('/api/scoreboard/invite','DELETE',undefined,{'X-Target-Account':'old','X-Expected-Data-Epoch':'1'});assert.equal(calls.at(-1)[1].headers['X-Target-Account'],'old');assert.equal(calls.at(-1)[1].headers['X-Expected-Data-Epoch'],'1');
 context.account=null;await assert.rejects(api('/api/scoreboard/invite','POST'),/Refresh your account/);
});
