import test from 'node:test';
import assert from 'node:assert/strict';
import {coachFetch,coachOnline,resetCoachNet} from '../coach-net.mjs';
const res=(status,body)=>({status,ok:status>=200&&status<300,json:async()=>body,arrayBuffer:async()=>body});
test('success, 4xx, 5xx, offline throw and timeout never throw; recovery probes again',async()=>{
 resetCoachNet();
 assert.deepEqual(await coachFetch('/a',{},{fetchImpl:async()=>res(200,{x:1})}),{ok:true,data:{x:1},fallback:false,status:200});
 const r4=await coachFetch('/a',{},{fallback:'local',fetchImpl:async()=>res(404,{})});
 assert.equal(r4.fallback,true);assert.equal(r4.data,'local');assert.equal(coachOnline(),true,'4xx is not an outage');
 let calls=0;const r5=await coachFetch('/a',{},{fallback:'local',fetchImpl:async()=>{calls++;return res(503,{});}});
 assert.deepEqual([r5.ok,r5.fallback,r5.data,coachOnline()],[false,true,'local',false]);
 await coachFetch('/a',{},{fetchImpl:async()=>{calls++;}});assert.equal(calls,1,'cooldown: no call while down');
 resetCoachNet();
 const off=await coachFetch('/a',{},{fallback:'local',fetchImpl:async()=>{throw new TypeError('offline');}});assert.equal(off.fallback,true);
 resetCoachNet();
 const t0=Date.now(),slow=await coachFetch('/a',{},{timeoutMs:50,fallback:'local',fetchImpl:(u,o)=>new Promise((_,rej)=>o.signal.addEventListener('abort',()=>rej(o.signal.reason)))});
 assert.equal(slow.fallback,true);assert.ok(Date.now()-t0<1000);
 resetCoachNet();
 assert.equal((await coachFetch('/a',{},{fetchImpl:async()=>res(200,{back:1})})).data.back,1,'next call goes online');
});
test('one retry with backoff, no storm',async()=>{
 resetCoachNet();let n=0;
 const r=await coachFetch('/a',{},{retry:1,backoffMs:5,fetchImpl:async()=>++n===1?res(500,{}):res(200,{ok:1})});
 assert.equal(r.ok,true);assert.equal(n,2);
 resetCoachNet();n=0;await coachFetch('/a',{},{retry:1,backoffMs:5,fetchImpl:async()=>{n++;return res(500,{});}});assert.equal(n,2);
 resetCoachNet();
});
test('voice stays captions-only offline and recovers',async()=>{
 const {RobotAudio}=await import('../robot-audio.mjs');resetCoachNet();
 const modes=[],r=new RobotAudio(m=>modes.push(m));r.unlock=()=>true;r.context={state:'running'};
 const f=globalThis.fetch;globalThis.fetch=async()=>{throw new TypeError('offline');};
 try{assert.equal(await r.play('Ready. Begin.'),false);assert.match(modes.at(-1),/captions on/);assert.equal(r.manifest,undefined,'manifest not poisoned');}
 finally{globalThis.fetch=f;resetCoachNet();}
});
