import test from 'node:test';
import assert from 'node:assert/strict';
import {createWeaponWallController,GALA_WEAPONS} from '../creature/source/weapon-wall.mjs';

const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
function transitions(){
 let version=0,controller=new AbortController();const listeners=new Set();
 return {capture:()=>({version,signal:controller.signal}),
  assertCurrent(ticket){if(ticket.version!==version)throw Object.assign(Error('Account changed'),{code:'auth_transition'});},
  subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},
  invalidate(){version++;controller.abort();controller=new AbortController();for(const fn of listeners)fn();},
  count:()=>listeners.size};
}
const room=(owner='A',revision=1,type='rapier',tier=0)=>Response.json({
 targetAccountId:owner,dataEpoch:2,state:{revision,loadout:{type,tier}}
});
test('weapon wall requires an account and successful gated room read before writing',async()=>{
 const t=transitions(),calls=[];let account=null;
 const wall=createWeaponWallController({transitions:t,getAccount:()=>account,
  request:async(path,options)=>{calls.push({path,options});return path==='/api/war-room'?Response.json({error:'Coach Army required'},{status:403}):Response.json({});}});
 await wall.refresh();assert.equal(calls.length,0);assert.equal(await wall.save('rapier',1),false);
 account={user:{id:'A'}};await wall.refresh();
 assert.equal(wall.getState().mode,'gated');assert.equal(await wall.save('rapier',1),false);
 assert.equal(calls.length,1);wall.dispose();assert.equal(t.count(),0);
});
test('weapon wall sends only Gala type, tier, and revision with account fence',async()=>{
 const t=transitions(),calls=[],account={user:{id:'A'}};
 const wall=createWeaponWallController({transitions:t,getAccount:()=>account,request:async(path,options)=>{
  calls.push({path,options});return path==='/api/war-room'?room():Response.json({state:{revision:2,loadout:{type:'sabre',tier:7}}});
 }});
 await wall.refresh();assert.equal(wall.getState().mode,'ready');
 assert.equal(await wall.save('battle-pass-1',4),false);assert.equal(calls.length,1);
 assert.equal(await wall.save('sabre',7),true);
 assert.deepEqual(JSON.parse(calls[1].options.body),{revision:1,loadout:{type:'sabre',tier:7}});
 assert.equal(calls[1].options.headers.get('X-Target-Account'),'A');
 assert.equal(calls[1].options.headers.get('X-Expected-Data-Epoch'),'2');
 assert.equal(wall.getState().revision,2);assert.equal(GALA_WEAPONS.length,20);wall.dispose();
});
test('409 refreshes owner loadout without replaying pending edit',async()=>{
 const t=transitions(),calls=[];
 const wall=createWeaponWallController({transitions:t,getAccount:()=>({user:{id:'A'}}),request:async(path)=>{
  calls.push(path);return path==='/api/war-room'?room('A',calls.length===1?1:5,'axe',3):Response.json({error:'Conflict'},{status:409});
 }});
 await wall.refresh();assert.equal(await wall.save('sabre',7),false);
 assert.deepEqual(calls,['/api/war-room','/api/war-room/loadout','/api/war-room']);
 assert.deepEqual(wall.getState().loadout,{type:'axe',tier:3});
 assert.match(wall.getState().message,/Review the refreshed/);wall.dispose();
});
test('concurrent account change clears stale read and write, then cleanup detaches listeners',async()=>{
 const t=transitions(),first=deferred(),write=deferred();let account={user:{id:'A'}},calls=0;
 const wall=createWeaponWallController({transitions:t,getAccount:()=>account,request:async(path)=>{
  calls++;if(path==='/api/war-room')return calls===1?first.promise:room('B');
  return write.promise;
 }});
 const loading=wall.refresh();account={user:{id:'B'}};t.invalidate();first.resolve(room('A'));await loading;
 assert.equal(wall.getState().mode,'locked');
 await wall.refresh();assert.equal(wall.getState().mode,'ready');
 const saving=wall.save('sabre',3);account={user:{id:'C'}};t.invalidate();
 write.resolve(Response.json({state:{revision:2,loadout:{type:'sabre',tier:3}}}));
 assert.equal(await saving,false);assert.equal(wall.getState().mode,'locked');
 wall.dispose();assert.equal(t.count(),0);assert.equal(await wall.save('rapier',0),false);
});
