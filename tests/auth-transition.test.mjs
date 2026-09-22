import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {createAuthTransition,AUTH_TRANSITION_KEY} from '../auth-transition.mjs';
import {createAccountWorkoutSync,accountPendingKey,validateAccountDeletionReceipt} from '../account-workout-sync.mjs';
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
function fixture(){
 const data=new Map(),channels=[];const storage={getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,String(value)),removeItem:key=>data.delete(key)};
 const make=()=>createAuthTransition({storage,events:new EventTarget(),randomUUID:()=>crypto.randomUUID(),channelFactory:()=>{const channel=new EventTarget();channel.postMessage=data=>{for(const peer of channels)if(peer!==channel){const event=new Event('message');Object.defineProperty(event,'data',{value:data});peer.dispatchEvent(event);}};channel.close=()=>{};channels.push(channel);return channel;}});
 return {data,storage,make};
}
test('random persisted transitions cancel other tabs and never resurrect old tickets',()=>{
 const f=fixture(),a=f.make(),b=f.make(),ticket=a.capture(),other=b.capture(),first=f.data.get(AUTH_TRANSITION_KEY);a.invalidate();
 assert.notEqual(f.data.get(AUTH_TRANSITION_KEY),first);assert.equal(a.isCurrent(ticket),false);assert.equal(b.isCurrent(other),false);assert.equal(ticket.signal.aborted,true);assert.equal(other.signal.aborted,true);assert(b.isCurrent(b.capture()));
});
test('refresh generations reject older same-token results and same-provider session changes invalidate',()=>{
 const f=fixture(),a=f.make(),first=a.beginRefresh(),second=a.beginRefresh();assert.equal(a.isCurrent(first),false);assert(a.isCurrent(second));
 a.observeIdentity('clerk','session-a','user-a');const ticket=a.capture();a.observeIdentity('clerk','session-b','user-b');assert.equal(a.isCurrent(ticket),false);
});
test('storage read/write, missing channel and postMessage failures fail closed',()=>{
 for(const operation of ['read','write','channel','post']){
  const f=fixture(),events=new EventTarget(),channel=new EventTarget();channel.postMessage=()=>{if(operation==='post')throw Error();};
  const storage={getItem:key=>{if(operation==='read')throw Error();return f.storage.getItem(key);},setItem:(key,value)=>{if(operation==='write')throw Error();return f.storage.setItem(key,value);}};
  const a=createAuthTransition({storage,events,randomUUID:()=>crypto.randomUUID(),channelFactory:()=>operation==='channel'?null:channel});
  if(operation==='post'){const ticket=a.capture();assert.throws(()=>a.invalidate());assert.equal(a.isCurrent(ticket),false);}
  assert.throws(()=>a.capture(),{code:'auth_unavailable'});
 }
});
const launch=await readFile(new URL('../launch.mjs',import.meta.url),'utf8');
const refreshSource=launch.split('\n').find(line=>line.startsWith('async function refresh('));
function refreshHarness(transitions,api){
 const applied=[],context={account:null,revision:0,accountTransitionBusy:false,accountTransitions:transitions,optionalReadiness:{refresh:async()=>false},api,applyCoachAccount:v=>applied.push(v.user.id),$:()=>({replaceChildren(){}}),set(){},publishProgress(){},syncDeviceSwitch:async()=>{},flushSets:async()=>{},window:{},navigator:{onLine:true},scoreboard:{clear(){}},clearCoachAccount(){},liveReminders:{update(){},render(){}}};
 vm.createContext(context);vm.runInContext(refreshSource+';this.refresh=refresh;',context);return {context,applied};
}
const account=id=>({user:{id,provider:'chatgpt',email:id},dataEpoch:1,revision:0,push:{},progress:{}});
test('late A success and stale401 cannot overwrite newer B refresh',async()=>{
 for(const rejected of [false,true]){const f=fixture(),a=f.make(),old=deferred(),fresh=deferred();let count=0;const h=refreshHarness(a,()=>++count===1?old.promise:fresh.promise);
  const one=h.context.refresh(),two=h.context.refresh();fresh.resolve(account('B'));await two;
  if(rejected)old.reject(Object.assign(Error('old unauthorized'),{status:401}));else old.resolve(account('A'));
  await one;assert.equal(h.context.account.user.id,'B');assert.deepEqual(h.applied,['B']);
 }
});
test('transition during refresh blocks success and network failure preserves stale identity',async()=>{
 const f=fixture(),a=f.make(),pending=deferred(),h=refreshHarness(a,()=>pending.promise),request=h.context.refresh();a.invalidate();pending.resolve(account('A'));await request;assert.equal(h.context.account,null);assert.deepEqual(h.applied,[]);
 const stale=refreshHarness(a,async()=>{throw Error('offline');});stale.context.account=account('A');await stale.context.refresh();assert.equal(stale.context.account.user.id,'A');assert.equal(stale.context.account.stale,true);
});
test('cold startup dispatches account refresh without awaiting auth/network',async()=>{
 const line=launch.split('\n').find(value=>value.includes('await applyLocalCoach();void refresh();')),hang=deferred(),events=[];
 const prefix=line.slice(0,line.indexOf('const panel='));await vm.runInNewContext('(async()=>{'+prefix+'this.ready=true;})()',{applyLocalCoach:async()=>events.push('local'),refresh:()=>{events.push('refresh');return hang.promise;}});assert.deepEqual(events,['local','refresh']);
});

test('ticket binding persists exact server owner/epoch and guarded completion acknowledges only matching scope',async()=>{
 const f=fixture(),transitions=f.make(),selected={user:{id:'A'},dataEpoch:4},calls=[],published=[];
 const api=async(path,method,data,headers)=>{calls.push({path,method,data,headers});if(path.startsWith('/api/account'))return selected;if(path.endsWith('/start'))return {id:'ticket',startedAt:1,targetAccountId:'A',dataEpoch:4};return {targetAccountId:'A',dataEpoch:4,progress:{xp:25,completedSets:1}};};
 const sync=createAccountWorkoutSync({storage:f.storage,transitions,api,getAccount:()=>selected,publishProgress:value=>published.push(value)});
 await sync.start('squat',3);await sync.complete({id:'ticket',value:3,active:10});
 const post=calls.find(call=>call.path.endsWith('/complete'));assert.deepEqual(post.headers,{'X-Target-Account':'A','X-Expected-Data-Epoch':'4'});assert.deepEqual(post.data,{id:'ticket',value:3,active:10});assert.equal(sync.pending('A').length,0);assert.equal(published.length,1);
});
test('untagged legacy queue remains intact and never receives a guessed epoch',async()=>{
 const f=fixture(),transitions=f.make(),original=[{id:'legacy',value:3}];f.storage.setItem(accountPendingKey('A'),JSON.stringify(original));let calls=0;
 const sync=createAccountWorkoutSync({storage:f.storage,transitions,api:async()=>{calls++;},getAccount:()=>({user:{id:'A'},dataEpoch:9}),publishProgress(){}});
 await assert.rejects(sync.flush(),{code:'account_queue_unbound'});assert.equal(calls,0);assert.deepEqual(sync.pending('A'),original);
});
test('transition while completion POST is pending preserves queue and prevents progress publication',async()=>{
 const f=fixture(),transitions=f.make(),selected={user:{id:'A'},dataEpoch:1},wait=deferred(),sent=deferred();f.storage.setItem(accountPendingKey('A'),JSON.stringify([{id:'a',value:3,targetAccountId:'A',targetDataEpoch:1}]));let published=0;
 const sync=createAccountWorkoutSync({storage:f.storage,transitions,getAccount:()=>selected,publishProgress:()=>published++,api:async path=>{if(path.startsWith('/api/account'))return selected;sent.resolve();return wait.promise;}});
 const drain=sync.flush();await sent.promise;transitions.invalidate();wait.resolve({progress:{xp:25}});await assert.rejects(drain);assert.equal(sync.pending('A').length,1);assert.equal(published,0);
});
test('fresh account mismatch stops before POST; unknown completion is quarantined without assigning B',async()=>{
 const f=fixture(),transitions=f.make(),selected={user:{id:'A'},dataEpoch:1};f.storage.setItem(accountPendingKey('A'),JSON.stringify([{id:'a',value:3,targetAccountId:'A',targetDataEpoch:1}]));let posts=0;
 const sync=createAccountWorkoutSync({storage:f.storage,transitions,getAccount:()=>selected,publishProgress(){},api:async(path)=>{if(path.startsWith('/api/account'))return {user:{id:'B'},dataEpoch:1};posts++;}});
 await assert.rejects(sync.flush(),{code:'account_scope_changed'});assert.equal(posts,0);assert.equal(sync.pending('A').length,1);
 await assert.rejects(sync.complete({id:'unknown',value:1}),{code:'account_queue_unbound'});assert.equal(sync.pending('A').length,1);assert.deepEqual(JSON.parse(f.storage.getItem('myr5-unbound-server-completions-v1')),[{id:'unknown',value:1}]);
});

const authSource=await readFile(new URL('../auth-client.mjs',import.meta.url),'utf8');
function authHarness(f,coordinator,clerk,fetchImpl,extras={}){
 const context={authTransitions:()=>coordinator,safeReturn:path=>path,localStorage:f.storage,Headers,AbortSignal,Response,URL,fetch:fetchImpl,window:{Clerk:clerk},document:{createElement:()=>({dataset:{}}),head:{append:tag=>queueMicrotask(()=>tag.onload())}},location:{assign(){}},queueMicrotask,setTimeout,clearTimeout,...extras};
 return vm.runInNewContext(authSource.replace(/^import .*;\s*$/mg,'').replace(/\bexport /g,'')+';({authFetch,loadLogin,signOut});',context);
}
test('actual authFetch rejects a same-provider Clerk session change while acquiring credentials',async()=>{
 const f=fixture(),transitions=f.make(),token=deferred(),acquiring=deferred(),listeners=[];f.storage.setItem('myr5-login-provider','clerk');let writes=0;
 const clerk={session:{id:'sessionA',getToken:()=>{acquiring.resolve();return token.promise;}},user:{id:'userA'},load:async()=>{},addListener:fn=>listeners.push(fn)};
 const auth=authHarness(f,transitions,clerk,async path=>{if(path==='/api/auth/config')return new Response(JSON.stringify({enabled:true,frontend:'https://clerk.test',publishableKey:'key'}));writes++;return new Response('{}');});
 const request=auth.authFetch('/api/workouts/complete',{method:'POST'});await acquiring.promise;clerk.session={id:'sessionB'};clerk.user={id:'userB'};listeners.forEach(fn=>fn());token.resolve('old-A-token');await assert.rejects(request,{code:'auth_transition'});assert.equal(writes,0);
});
test('actual authFetch rejects a late response after another tab transitions',async()=>{
 const f=fixture(),transitions=f.make(),other=f.make(),pending=deferred(),sent=deferred();
 const auth=authHarness(f,transitions,null,async path=>{if(path==='/api/auth/config')return new Response(JSON.stringify({enabled:false}));sent.resolve();return pending.promise;});
 const request=auth.authFetch('/api/account');await sent.promise;other.invalidate();pending.resolve(new Response('{}',{status:401}));await assert.rejects(request,{code:'auth_transition'});
});
test('signout invalidates before awaiting Clerk work',async()=>{
 const f=fixture(),transitions=f.make(),load=deferred(),ticket=transitions.capture();f.storage.setItem('myr5-login-provider','clerk');
 const auth=authHarness(f,transitions,{load:()=>load.promise,addListener(){},signOut:async()=>{}},async()=>new Response(JSON.stringify({enabled:true,frontend:'https://clerk.test',publishableKey:'key'})));
 const signingOut=auth.signOut();assert.equal(transitions.isCurrent(ticket),false);load.resolve();await signingOut;
});
test('launch reminder facade captures epoch assertions and never replaces explicit ones',async()=>{
 const f=fixture(),transitions=f.make(),calls=[],apiSource=launch.split('\n').find(line=>line.startsWith('export async function api(')).replace(/^export /,'');
 const context={accountTransitions:transitions,account:{user:{id:'A'},dataEpoch:3},authFetch:async(...args)=>{calls.push(args);return new Response('{}',{headers:{'Content-Type':'application/json'}});},Response,Error,JSON,Object};
 const api=vm.runInNewContext(apiSource+';api;',context);
 await api('/api/reminders','POST',{});assert.equal(calls[0][1].headers['X-Target-Account'],'A');assert.equal(calls[0][1].headers['X-Expected-Data-Epoch'],'3');
 await api('/api/push/unsubscribe','POST',{}, {'X-Target-Account':'B','X-Expected-Data-Epoch':'8'});assert.equal(calls[1][1].headers['X-Target-Account'],'B');assert.equal(calls[1][1].headers['X-Expected-Data-Epoch'],'8');
 context.account=null;await assert.rejects(api('/api/updates/subscription','POST',{}));assert.equal(calls.length,2);
});

test('signout still revokes Clerk and redirects when coordinator and storage fail',async()=>{
 const f=fixture(),redirects=[];let clerkSignouts=0;
 const auth=authHarness(f,{invalidate(){throw Error('blocked');}},{signOut:async()=>clerkSignouts++},async()=>assert.fail('No fetch needed'),{localStorage:{getItem(){throw Error();},removeItem(){throw Error();}},location:{assign:url=>redirects.push(url)}});
 await auth.signOut();assert.equal(clerkSignouts,1);assert.equal(redirects.length,1);assert(redirects[0].startsWith('/signout-with-chatgpt?'));
});
test('launch signout is not held by remote unsubscribe or local cleanup failures',async()=>{
 const line=launch.split('\n').find(value=>value.startsWith("$('signOut').onclick=")),elements={signOut:{}};let signedOut=0,remoteAttempts=0;
 const context={$:id=>elements[id],account:{user:{id:'A'},dataEpoch:1},accountTransitionBusy:false,accountTransitions:{invalidate(){throw Error();}},registration:{pushManager:{getSubscription:async()=>({endpoint:'endpoint',unsubscribe:async()=>{}})}},api:async()=>{remoteAttempts++;throw Error('offline');},keys:['appearance'],localStorage:{removeItem(){throw Error();}},clearCoachAccount(){throw Error();},signOut:async()=>signedOut++,set(){}};
 vm.runInNewContext(line,context);await elements.signOut.onclick({preventDefault(){}});await new Promise(resolve=>setImmediate(resolve));assert.equal(signedOut,1);assert.equal(remoteAttempts,1);
});
test('historical deletion receipt cleans only bound epochs it proves deleted',()=>{
 const f=fixture(),transitions=f.make(),rows=[{id:'old',targetAccountId:'A',targetDataEpoch:1},{id:'also-old',targetAccountId:'A',targetDataEpoch:2},{id:'new',targetAccountId:'A',targetDataEpoch:3},{id:'unbound'},{id:'other',targetAccountId:'B',targetDataEpoch:1}];
 f.storage.setItem(accountPendingKey('A'),JSON.stringify(rows));f.storage.setItem('myr5-server-workout-tickets-v1',JSON.stringify(Object.fromEntries(rows.map(row=>[row.id,row]))));f.storage.setItem('myr5-unbound-server-completions-v1','[{"id":"unknown"}]');
 const sync=createAccountWorkoutSync({storage:f.storage,transitions,api:()=>assert.fail(),getAccount:()=>null,publishProgress(){}});
 const through=validateAccountDeletionReceipt({ownerId:'A',deletedEpoch:1,deleted:false,alreadyDeleted:true,currentDataEpoch:3,deletedThroughEpoch:2},'A',1);sync.forgetDeletedAccount('A',through);
 assert.deepEqual(sync.pending('A').map(row=>row.id),['new','unbound','other']);assert.deepEqual(Object.keys(JSON.parse(f.storage.getItem('myr5-server-workout-tickets-v1'))),['new','unbound','other']);assert.equal(f.storage.getItem('myr5-unbound-server-completions-v1'),'[{"id":"unknown"}]');
 assert.throws(()=>validateAccountDeletionReceipt({ownerId:'B',deletedEpoch:1,deleted:true,alreadyDeleted:false,currentDataEpoch:2,deletedThroughEpoch:1},'A',1));
 assert.throws(()=>validateAccountDeletionReceipt({ownerId:'A',deletedEpoch:1,deleted:true,alreadyDeleted:true,currentDataEpoch:2,deletedThroughEpoch:1},'A',1));
});
test('completion receipt mismatch preserves queue and suppresses progress',async()=>{
 for(const result of [{targetAccountId:'B',dataEpoch:1},{targetAccountId:'A',dataEpoch:2},{}]){
  const f=fixture(),transitions=f.make(),selected={user:{id:'A'},dataEpoch:1};f.storage.setItem(accountPendingKey('A'),JSON.stringify([{id:'a',value:3,targetAccountId:'A',targetDataEpoch:1}]));let published=0;
  const sync=createAccountWorkoutSync({storage:f.storage,transitions,getAccount:()=>selected,publishProgress:()=>published++,api:async path=>path.startsWith('/api/account')?selected:{...result,progress:{xp:25,completedSets:1}}});
  await assert.rejects(sync.flush(),{code:'invalid_completion_receipt'});assert.equal(sync.pending('A').length,1);assert.equal(published,0);
 }
});


test('auth configuration and token waits time out without sending a late account request',async()=>{
 for(const phase of ['configuration','token']){
  const f=fixture(),transitions=f.make(),held=deferred();let writes=0;
  f.storage.setItem('myr5-login-provider','clerk');
  const clerk={session:{id:'A',getToken:()=>held.promise},user:{id:'A'},load:async()=>{},addListener(){}};
  const auth=authHarness(f,transitions,clerk,async path=>{if(path==='/api/auth/config')return phase==='configuration'?held.promise:new Response(JSON.stringify({enabled:true,frontend:'https://clerk.test',publishableKey:'key'}));writes++;return new Response('{}');},{setTimeout:fn=>setTimeout(fn,15)});
  await assert.rejects(auth.authFetch('/api/profile',{method:'PUT'}),error=>error.code==='account_timeout');
  held.resolve(phase==='configuration'?new Response(JSON.stringify({enabled:false})):'late-token');await new Promise(resolve=>setTimeout(resolve,0));assert.equal(writes,0);
 }
});
