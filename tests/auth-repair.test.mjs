import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
const checkout=fileURLToPath(new URL('..',import.meta.url));
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return {promise,resolve,reject}};
const response=enabled=>new Response(JSON.stringify({enabled,frontend:'https://clerk.test',publishableKey:'fixture'}));
function harness(fetchImpl,extras={}){
 const source=fs.readFileSync(checkout+'/auth-client.mjs','utf8').replace(/^import .*;\s*$/mg,'').replace(/\bexport /g,'');
 const controller=new AbortController();
 const transitions={capture:()=>({signal:controller.signal}),assertCurrent:t=>{if(t.signal.aborted)throw Object.assign(Error('transition'),{code:'auth_transition'})},observeIdentity(){},invalidate(){controller.abort()}};
 const values=new Map();
 const context={authTransitions:()=>transitions,safeReturn:x=>x,localStorage:{getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,String(v)),removeItem:k=>values.delete(k)},Headers,AbortSignal,Response,URL,Event,CustomEvent,fetch:fetchImpl,window:new EventTarget(),document:{createElement:()=>({dataset:{}}),head:{append:tag=>queueMicrotask(()=>tag.onload())}},queueMicrotask,setTimeout,clearTimeout,location:{assign(){}},...extras};
 return {...vm.runInNewContext(source+';({authSettings,authFetch,loadLogin});',context),values,transitions};
}
test('disabled configuration is not retained across a later enabled response',async()=>{
 let calls=0;const h=harness(async()=>response(++calls>1));
 assert.equal((await h.authSettings()).enabled,false);
 assert.equal((await h.authSettings()).enabled,true);
 assert.equal(calls,2);
});
test('forced request bypasses memo and old completion cannot replace newer config',async()=>{
 const old=deferred(),fresh=deferred();let calls=0;const paths=[];
 const h=harness((path,options)=>{paths.push({path,cache:options.cache});return ++calls===1?old.promise:fresh.promise});
 const first=h.authSettings(),second=h.authSettings({force:true});
 fresh.resolve(response(true));assert.equal((await second).enabled,true);
 old.resolve(response(false));assert.equal((await first).enabled,false);
 assert.equal((await h.authSettings()).enabled,true);assert.equal(calls,2);
 assert(paths.every(x=>x.cache==='no-store'&&new URL(x.path,'https://fixture.test').search.length>0));
});
test('older failed configuration cannot clear newer successful memo',async()=>{
 const old=deferred();let calls=0;const h=harness(()=>++calls===1?old.promise:Promise.resolve(response(true)));
 const first=h.authSettings();await h.authSettings({force:true});old.reject(Error('old failure'));await assert.rejects(first);
 assert.equal((await h.authSettings()).enabled,true);assert.equal(calls,2);
});
test('abandoned configuration wait never sends a late mutation',async()=>{
 const pending=deferred();let writes=0;
 const h=harness(path=>new URL(path,'https://fixture.test').pathname==='/api/auth/config'?pending.promise:(writes++,response(true)),{setTimeout:fn=>setTimeout(fn,5)});
 await assert.rejects(h.authFetch('/api/profile',{method:'PUT'}),e=>e.code==='account_timeout');
 pending.resolve(response(true));await new Promise(r=>setTimeout(r,0));assert.equal(writes,0);
});
test('configuration completion after account transition cannot send mutation',async()=>{
 const pending=deferred();let writes=0;const h=harness(path=>path.startsWith('/api/auth/config')?pending.promise:(writes++,response(true)));
 const request=h.authFetch('/api/profile',{method:'PUT'});h.transitions.invalidate();await assert.rejects(request,e=>e.code==='auth_transition');
 pending.resolve(response(true));await new Promise(r=>setTimeout(r,0));assert.equal(writes,0);
});
test('disabled login initialization does not poison later enabled retry',async()=>{
 let calls=0;const clerk={load:async()=>{},addListener(){}};
 const h=harness(async()=>response(++calls>1),{window:Object.assign(new EventTarget(),{Clerk:clerk})});
 assert.equal(await h.loadLogin(),null);
 assert.equal((await h.authSettings({force:true})).enabled,true);
 assert.equal(await h.loadLogin(),clerk);
});
function signinHarness(configs){
 const nodes=new Map();const node=id=>{if(!nodes.has(id))nodes.set(id,{hidden:false,textContent:'',disabled:false,replaceChildren(){}});return nodes.get(id)};
 const listeners=new Set();let mounts=0,unmounts=0,reloads=0;const forced=[];
 const clerk={user:null,mountSignIn(){mounts++},unmountSignIn(){unmounts++},addListener(fn){listeners.add(fn);return()=>listeners.delete(fn)}};
 const context={document:{getElementById:node},location:{search:'',reload(){reloads++},assign(){},replace(){}},URLSearchParams,setTimeout,clearTimeout,authSettings:async options=>{forced.push(options?.force);return configs.shift()??{enabled:true,frontend:'https://clerk.test',publishableKey:'fixture'}},loadLogin:async()=>clerk,authTransitions:()=>({invalidate(){}}),localStorage:{removeItem(){}},safeReturn:x=>x??'/pose.html'};
 const source=fs.readFileSync(checkout+'/signin.mjs','utf8').replace(/^import .*;\s*$/mg,'');
 vm.runInNewContext(source,context);
 return {node,listeners,forced,state:()=>({mounts,unmounts,reloads})};
}
const settle=()=>new Promise(r=>setTimeout(r,0));
test('disabled signin can retry fresh without navigating or erasing storage',async()=>{
 const h=signinHarness([{enabled:false},{enabled:true,frontend:'https://clerk.test',publishableKey:'fixture'}]);await settle();
 assert.equal(h.node('retry').hidden,false);await h.node('retry').onclick();await settle();
 assert.equal(h.state().reloads,0);assert.equal(h.state().mounts,1);assert.deepEqual(h.forced,[true,true]);
});
test('repeated signin retry disposes real Clerk listener and mounted component',async()=>{
 const h=signinHarness([]);await settle();await h.node('retry').onclick();await settle();
 assert.equal(h.listeners.size,1);assert.equal(h.state().unmounts,1);
});
async function seedGuest(initial){
 const values=new Map(Object.entries(initial)),writes=[];const plate={};let closed=false;
 const source=fs.readFileSync(checkout+'/coach-profile.mjs','utf8');
 const begin=source.indexOf('export async function applyLocalCoach()'),end=source.indexOf('export function applyCoachAccount',begin);
 const context={localPlan:null,window:{dispatchEvent(){}},localStorage:{getItem:k=>values.get(k)??null,setItem:(k,v)=>{values.set(k,v);writes.push(k)}},openLocalCoach:async()=>({guestOwnerId:'guest',forOwner:()=>({getIntake:async()=>({profile:{},appearance:{'myr5-recipe-v1':{coach:'guest'},'mominc-avatar-v1':{shape:'guest'}}}),getSettings:async()=>({startDay:'2026-09-30'}),listWorkouts:async()=>[]}),close(){closed=true}}),dailyTargets:()=>({}),document:{documentElement:{dataset:{}},getElementById:()=>plate},StorageEvent:class{},Event:class{},gate:{close(){},style:{}},renderPersonalTracker(){},EXERCISES:[]};
 await vm.runInNewContext(source.slice(begin,end).replace('export ','')+';applyLocalCoach()',context);
 return {values,writes,closed};
}
test('guest startup preserves edited key and seeds only missing appearance',async()=>{
 const h=await seedGuest({'myr5-recipe-v1':'edited'});
 assert.equal(h.values.get('myr5-recipe-v1'),'edited');assert.equal(h.values.get('mominc-avatar-v1'),'{"shape":"guest"}');assert.deepEqual(h.writes,['mominc-avatar-v1']);assert.equal(h.closed,true);
});
test('known account owner never receives guest appearance at startup',async()=>{
 const h=await seedGuest({'myr5-coach-owner':'A'});assert.equal(h.values.has('myr5-recipe-v1'),false);assert.deepEqual(h.writes,[]);assert.equal(h.closed,true);
});
const appearanceKeys=['myr5-recipe-v1','myr5-motion-v1','mominc-avatar-v1','myr5-pod-power-v1','handborne-recipe-v4','mbs-dj-identity-v1'];
function appearanceHandler(id,initial,options={}){
 const store=new Map([['myr5-coach-owner','A'],...Object.entries(initial)]),node={};const launch=fs.readFileSync(checkout+'/launch.mjs','utf8');
 const match=new RegExp("\\$\\(['\"]"+id+"['\"]\\)\\.onclick\\s*=").exec(launch);assert(match,'Appearance handler must exist');
 const start=match.index,end=launch.indexOf("\n$('",start+1);const source=launch.slice(start,end);
 let generation=0;const transitions={capture:()=>({generation}),isCurrent:t=>t.generation===generation,assertCurrent:t=>{if(t.generation!==generation)throw Error('transition')},invalidate(){generation++}};
 const context={account:{user:{id:'A'},dataEpoch:1},revision:3,keys:appearanceKeys,accountTransitions:transitions,localStorage:{getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)},$:()=>node,window:{dispatchEvent(){}},StorageEvent:class{},Event:class{},set(){},api:async()=>({revision:4}),refresh:async()=>context.account,...options};
 vm.runInNewContext(source,context);return {store,context,click:()=>node.onclick(),transitions};
}
test('successful profile save records submitted keyed snapshot using real account shape',async()=>{
 const h=appearanceHandler('saveProfile',{'myr5-recipe-v1':'saved-value'});await h.click();
 assert.equal(h.store.get('myr5-coach-owner'),'A');assert.deepEqual(JSON.parse(h.store.get('myr5-synced-appearance')),{'myr5-recipe-v1':'saved-value'});assert.equal(h.context.revision,4);
});
test('edits made during profile save stay dirty relative to submitted snapshot',async()=>{
 const held=deferred();const h=appearanceHandler('saveProfile',{'myr5-recipe-v1':'submitted'},{api:()=>held.promise});
 const request=h.click();h.store.set('myr5-recipe-v1','later-edit');held.resolve({revision:4});await request;
 assert.equal(h.store.get('myr5-recipe-v1'),'later-edit');assert.deepEqual(JSON.parse(h.store.get('myr5-synced-appearance')),{'myr5-recipe-v1':'submitted'});
});
test('restore takes fresh server profile over old local baseline and removes absent keys',async()=>{
 const h=appearanceHandler('restoreProfile',{'myr5-recipe-v1':'edited','mominc-avatar-v1':'leftover','myr5-synced-appearance':'{"myr5-recipe-v1":"old-baseline"}'},{refresh:async()=>({user:{id:'A'},dataEpoch:1,profile:{'myr5-recipe-v1':'new-server'}})});
 await h.click();assert.equal(h.store.get('myr5-recipe-v1'),'new-server');assert.equal(h.store.has('mominc-avatar-v1'),false);assert.deepEqual(JSON.parse(h.store.get('myr5-synced-appearance')),{'myr5-recipe-v1':'new-server'});
});
function onboardingAckSource(){
 const source=fs.readFileSync(checkout+'/onboarding.mjs','utf8');
 const saved=source.indexOf('const saved=await accountActions.saveOnboarding');
 const start=source.indexOf('try',saved),end=source.indexOf('clearIncomingCoach();',start);
 assert(saved>=0&&start>=0&&end>start,'Onboarding acknowledgement must exist');return source.slice(start,end);
}
test('onboarding baseline uses keyed raw-storage representation like account hydration',()=>{
 const store=new Map();const source=onboardingAckSource();
 const saved={ownerId:'A',result:{appearance:{'myr5-recipe-v1':{coach:'calm'}}}};
 const context={saved,restore:map=>{for(const[k,v]of Object.entries(map))store.set(k,typeof v==='string'?v:JSON.stringify(v))},localStorage:{getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v))}};
 vm.runInNewContext(source,context);assert.deepEqual(JSON.parse(store.get('myr5-synced-appearance')),{'myr5-recipe-v1':'{"coach":"calm"}'});
});
test('onboarding save does not mark unrelated unsaved cosmetics as synced',()=>{
 const previous={'myr5-recipe-v1':'old-recipe','handborne-recipe-v4':'synced-hand'};
 const store=new Map([['myr5-coach-owner','A'],['myr5-recipe-v1','old-recipe'],['handborne-recipe-v4','edited-hand'],['myr5-synced-appearance',JSON.stringify(previous)]]);
 const source=onboardingAckSource();
 const saved={ownerId:'A',result:{appearance:{'myr5-recipe-v1':'saved-recipe'}}};
 const context={saved,restore:map=>{for(const[k,v]of Object.entries(map))store.set(k,typeof v==='string'?v:JSON.stringify(v))},localStorage:{getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v))}};
 vm.runInNewContext(source,context);assert.equal(store.get('handborne-recipe-v4'),'edited-hand');
 assert.deepEqual(JSON.parse(store.get('myr5-synced-appearance')),{'myr5-recipe-v1':'saved-recipe','handborne-recipe-v4':'synced-hand'});
});
test('save rejected by server leaves previous baseline unchanged',async()=>{
 const prior='{"myr5-recipe-v1":"synced"}';const h=appearanceHandler('saveProfile',{'myr5-recipe-v1':'edited','myr5-synced-appearance':prior},{api:async()=>{throw Object.assign(Error('conflict'),{status:409})}});
 await h.click();assert.equal(h.store.get('myr5-synced-appearance'),prior);
});
test('onboarding never inherits another owner baseline or unknown appearance keys',()=>{
 const store=new Map([['myr5-coach-owner','B'],['myr5-synced-appearance',JSON.stringify({'handborne-recipe-v4':'B-hand',unknown:'untrusted'})]]);
 const saved={ownerId:'A',result:{appearance:{'myr5-recipe-v1':{coach:'A'},'handborne-recipe-v4':'not-confirmed',unknown:'untrusted'}}};
 vm.runInNewContext(onboardingAckSource(),{saved,restore(){},localStorage:{getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v))}});
 assert.deepEqual(JSON.parse(store.get('myr5-synced-appearance')),{'myr5-recipe-v1':'{"coach":"A"}'});
 assert.equal(store.get('myr5-coach-owner'),'A');
});
test('onboarding preserves only trusted same-owner cosmetic baseline in canonical order',()=>{
 const prior={'mbs-dj-identity-v1':'dj','handborne-recipe-v4':'hand','myr5-pod-power-v1':'power',unknown:'bad','mominc-avatar-v1':'avatar','myr5-motion-v1':'motion','myr5-recipe-v1':'old'};
 const store=new Map([['myr5-coach-owner','A'],['myr5-synced-appearance',JSON.stringify(prior)]]);
 const saved={ownerId:'A',result:{appearance:{'myr5-recipe-v1':'new'}}};
 vm.runInNewContext(onboardingAckSource(),{saved,restore(){},localStorage:{getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v))}});
 const baseline=JSON.parse(store.get('myr5-synced-appearance'));
 assert.deepEqual(Object.keys(baseline),appearanceKeys);
 assert.equal(baseline['myr5-recipe-v1'],'new');assert.equal(baseline['handborne-recipe-v4'],'hand');
});
test('account switch during save cannot assign previous owner snapshot to new session',async()=>{
 const held=deferred();const h=appearanceHandler('saveProfile',{'myr5-recipe-v1':'A-edit'},{api:()=>held.promise});const request=h.click();
 h.transitions.invalidate();h.context.account={user:{id:'B'},dataEpoch:1};h.store.set('myr5-coach-owner','B');h.store.set('myr5-synced-appearance','{"myr5-recipe-v1":"B"}');held.resolve({revision:4});await request;
 assert.equal(h.store.get('myr5-coach-owner'),'B');assert.equal(h.store.get('myr5-synced-appearance'),'{"myr5-recipe-v1":"B"}');
});
test('account switch during restore cannot overwrite newer owner appearance',async()=>{
 const held=deferred();const h=appearanceHandler('restoreProfile',{'myr5-recipe-v1':'A'},{refresh:()=>held.promise});const request=h.click();
 h.transitions.invalidate();h.context.account={user:{id:'B'},dataEpoch:1};h.store.set('myr5-recipe-v1','B-edit');h.store.set('myr5-coach-owner','B');held.resolve({user:{id:'A'},dataEpoch:1,profile:{'myr5-recipe-v1':'A-server'}});
 try{await request}catch{}
 assert.equal(h.store.get('myr5-recipe-v1'),'B-edit');assert.equal(h.store.get('myr5-coach-owner'),'B');
});
test('shared login initialization emits readiness once without replaying a write',async()=>{
 const window=Object.assign(new EventTarget(),{Clerk:{load:async()=>{},addListener(){}}});let ready=0,writes=0;
 window.addEventListener('myr5:login-ready',()=>ready++);
 const h=harness(path=>path.startsWith('/api/auth/config')?Promise.resolve(response(true)):(writes++,Promise.resolve(response(true))),{window});
 const pending=h.loadLogin();assert.equal(h.loadLogin(),pending,'concurrent callers share the exact initialization promise');
 const [first,second]=await Promise.all([pending,h.loadLogin()]);assert.equal(first,second);assert.equal(ready,1);assert.equal(writes,0);
});
test('login readiness schedules a fresh refresh only while account remains absent and stable',async()=>{
 const source=fs.readFileSync(checkout+'/launch.mjs','utf8');
 const start=source.indexOf("window.addEventListener('myr5:login-ready'");
 assert(start>=0,'launch must handle login readiness');
 const end=source.indexOf('\n',start);
 let reads=0;const window=new EventTarget(),context={window,account:null,accountTransitionBusy:false,queueMicrotask,refresh:async()=>{reads++;}};
 vm.runInNewContext(source.slice(start,end<0?undefined:end),context);
 window.dispatchEvent(new Event('myr5:login-ready'));assert.equal(reads,0);await settle();assert.equal(reads,1);
 context.account={user:{id:'A'}};window.dispatchEvent(new Event('myr5:login-ready'));await settle();assert.equal(reads,1);
 context.account=null;context.accountTransitionBusy=true;window.dispatchEvent(new Event('myr5:login-ready'));await settle();assert.equal(reads,1);
 context.accountTransitionBusy=false;window.dispatchEvent(new Event('myr5:login-ready'));context.account={user:{id:'B'}};await settle();assert.equal(reads,1);
});
test('a stalled script initialization is bounded and a later attempt can succeed',async()=>{
 let stalled=true;const clerk={load:async()=>{},addListener(){}};
 const window=Object.assign(new EventTarget(),{Clerk:clerk});
 const h=harness(async()=>response(true),{window,setTimeout:(fn,delay)=>setTimeout(fn,delay>=20000?5:delay),document:{createElement:()=>({dataset:{},remove(){}}),head:{append:tag=>{if(!stalled)queueMicrotask(()=>tag.onload())}}}});
 const first=h.loadLogin();const outcome=await Promise.race([first.then(()=> 'resolved',()=> 'rejected'),new Promise(resolve=>setTimeout(()=>resolve('unbounded'),50))]);
 assert.equal(outcome,'rejected');stalled=false;assert.equal(await h.loadLogin(),clerk);
});
test('a stalled Clerk.load is bounded independently of script download',async()=>{
 const window=Object.assign(new EventTarget(),{Clerk:{load:()=>new Promise(()=>{}),addListener(){}}});
 const h=harness(async()=>response(true),{window,setTimeout:(fn,delay)=>setTimeout(fn,delay>=20000?5:delay)});
 const outcome=await Promise.race([h.loadLogin().then(()=> 'resolved',()=> 'rejected'),new Promise(resolve=>setTimeout(()=>resolve('unbounded'),50))]);
 assert.equal(outcome,'rejected');
});
test('timed-out initialization cannot replace listener after newer retry succeeds',async()=>{
 const held=deferred();let registrations=0;
 const window=Object.assign(new EventTarget(),{Clerk:{load:()=>held.promise,addListener(){registrations++;return()=>{}}}});
 const h=harness(async()=>response(true),{window,setTimeout:(fn,delay)=>setTimeout(fn,delay>=20000?5:delay)});
 const outcome=await Promise.race([h.loadLogin().then(()=> 'resolved',()=> 'rejected'),new Promise(resolve=>setTimeout(()=>resolve('unbounded'),50))]);
 assert.equal(outcome,'rejected');
 const fresh={load:async()=>{},addListener(){registrations++;return()=>{}}};window.Clerk=fresh;
 assert.equal(await h.loadLogin(),fresh);assert.equal(registrations,1);
 held.resolve();await settle();assert.equal(registrations,1);
});
