import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {createAccountSessionActions} from '../account-session-actions.mjs';
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
function coordinator(){let revision=0;const listeners=new Set();return {capture:()=>({revision}),isCurrent:ticket=>ticket?.revision===revision,assertCurrent(ticket){if(ticket?.revision!==revision)throw Object.assign(Error('transition'),{code:'auth_transition'});},subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},invalidate(){revision++;for(const fn of listeners)fn();}};}
const account=(owner='A',epoch=2)=>({user:{id:owner},dataEpoch:epoch,onboarding:{revision:4}});
const startReply=(owner='A',epoch=2)=>({id:'breathing-ticket',startedAt:1000,durationMs:180000,targetAccountId:owner,dataEpoch:epoch});

test('onboarding snapshots displayed choice before fresh auth read and sends exact captured assertions',async()=>{
 const transitions=coordinator(),fresh=deferred(),selected=account(),value={profile:{name:'original'}},calls=[];
 const actions=createAccountSessionActions({transitions,api:async(...args)=>{calls.push(args);return args[0].startsWith('/api/account')?fresh.promise:{appearance:{}};}});
 const saving=actions.saveOnboarding(selected,value);value.profile.name='changed-after-click';selected.onboarding.revision=9;fresh.resolve(account());const result=await saving;
 assert.equal(calls[0][0],'/api/account?core=1');assert.deepEqual(calls[1],['/api/onboarding','PUT',{data:{profile:{name:'original'}},revision:4},{'X-Target-Account':'A','X-Expected-Data-Epoch':'2'}]);assert.equal(result.ownerId,'A');
});
test('onboarding rejects changed owner/epoch and missing scope without guessing a destination',async()=>{
 for(const fresh of [account('B',2),account('A',3)]){let writes=0;const actions=createAccountSessionActions({transitions:coordinator(),api:async path=>{if(path.startsWith('/api/account'))return fresh;writes++;}});await assert.rejects(actions.saveOnboarding(account(),{}),{code:'account_scope_changed'});assert.equal(writes,0);}
 const actions=createAccountSessionActions({transitions:coordinator(),api:()=>assert.fail()});await assert.rejects(actions.saveOnboarding({user:{id:'A'}},{}),{code:'account_scope_unavailable'});
});
test('breathing completion keeps start ticket owner and epoch through a fresh comparison',async()=>{
 const transitions=coordinator(),calls=[];const actions=createAccountSessionActions({transitions,api:async(...args)=>{calls.push(args);return args[0].startsWith('/api/account')?account():args[0].endsWith('/start')?startReply():{combat:{},targetAccountId:'A',dataEpoch:2};}});
 const binding=await actions.startBreathing(account());await actions.completeBreathing(binding,180000);
 assert.deepEqual(calls.filter(call=>call[1]==='POST').map(call=>call[3]),[{'X-Target-Account':'A','X-Expected-Data-Epoch':'2'},{'X-Target-Account':'A','X-Expected-Data-Epoch':'2'}]);assert.equal(calls.filter(call=>call[0].startsWith('/api/account')).length,2);
});
test('breathing does not relabel old ticket after same-owner deletion or account switch',async()=>{
 for(const fresh of [account('A',3),account('B',2)]){let live=account(),posts=0;const transitions=coordinator(),actions=createAccountSessionActions({transitions,api:async path=>{if(path.startsWith('/api/account'))return live;posts++;return startReply();}});const binding=await actions.startBreathing(account());live=fresh;await assert.rejects(actions.completeBreathing(binding,180000),{code:'account_scope_changed'});assert.equal(posts,1);}
});
test('breathing rejects mismatched start and completion receipts',async()=>{
 const transitions=coordinator(),badStart=createAccountSessionActions({transitions,api:async path=>path.startsWith('/api/account')?account():startReply('B')});await assert.rejects(badStart.startBreathing(account()),{code:'invalid_breathing_receipt'});
 const actions=createAccountSessionActions({transitions,api:async path=>path.startsWith('/api/account')?account():path.endsWith('/start')?startReply():{combat:{},targetAccountId:'A',dataEpoch:3}});const binding=await actions.startBreathing(account());await assert.rejects(actions.completeBreathing(binding,180000),{code:'invalid_breathing_receipt'});
});

const onboarding=await readFile(new URL('../onboarding.mjs',import.meta.url),'utf8');
test('actual onboarding save cannot restore appearance or redirect after a late response across transition',async()=>{
 const transitions=coordinator(),post=deferred(),sent=deferred(),effects=[];
 const actions=createAccountSessionActions({transitions,api:async path=>{if(path.startsWith('/api/account'))return account();sent.resolve();return post.promise;}});
 const a=onboarding.indexOf(' async function save(value){'),b=onboarding.indexOf('\n if(autoSave',a),saveSource=onboarding.slice(a,b);
 const save=vm.runInNewContext(saveSource+';save;',{displayedAccount:account(),accountActions:actions,transitions,restore:()=>effects.push('restore'),localStorage:{setItem:()=>effects.push('owner')},clearIncomingCoach:()=>effects.push('draft'),removeDraft:()=>effects.push('draft'),KEY:'key',OFFICE_KEY:'office',location:{replace:()=>effects.push('redirect')}});
 const saving=save({});await sent.promise;transitions.invalidate();post.resolve({appearance:{}});await assert.rejects(saving,{code:'auth_transition'});assert.deepEqual(effects,[]);
});
test('actual independent onboarding api preserves assertion headers and guards body parsing',async()=>{
 const transitions=coordinator(),calls=[],line=onboarding.split('\n').find(line=>line.startsWith('async function api('));
 const api=vm.runInNewContext(line+';api;',{transitions,authFetch:async(...args)=>{calls.push(args);return new Response('{}',{headers:{'Content-Type':'application/json'}});},Error,JSON,Object});
 await api('/api/onboarding','PUT',{data:{}},{'X-Target-Account':'A','X-Expected-Data-Epoch':'2'});assert.equal(calls[0][1].headers['X-Target-Account'],'A');assert.equal(calls[0][1].headers['X-Expected-Data-Epoch'],'2');
});

const breathing=await readFile(new URL('../breathing.mjs',import.meta.url),'utf8');
function breathingHarness(transitions,api){
 const button={},bar={},status={},pause={},controls={querySelector:key=>key==='button'?button:key==='progress'?bar:status},dialog={open:true,classList:{remove(){},contains(){return false;}},addEventListener(){}},scene={hidden:false,append(){}};let tick,completeNext=false,callbacks=0;
 class Clock{constructor(){this.elapsed=0;}sample(){if(completeNext)this.elapsed=180000;}get complete(){return this.elapsed>=180000;}}
 const context={createAccountSessionActions,authTransitions:()=>transitions,BreathingSession:Clock,BREATHING_MS:180000,document:{createElement:()=>controls,hidden:false},window:{addEventListener(){}},setInterval:fn=>{tick=fn;return 1;},clearInterval(){},performance:{now:()=>1}};
 const mount=vm.runInNewContext(breathing.replace(/^import .*;\s*$/mg,'').replace('export function','function')+';mountBreathing;',context);
 mount({dialog,scene,pause,api,getAccount:()=>account(),transitions,onComplete:()=>callbacks++});return {button,status,start:()=>button.onclick(),finish(){completeNext=true;tick();},callbacks:()=>callbacks};
}
test('actual breathing caller resets on transition and suppresses late completion UI/callback',async()=>{
 const transitions=coordinator(),post=deferred(),sent=deferred();
 const h=breathingHarness(transitions,async path=>{if(path.startsWith('/api/account'))return account();if(path.endsWith('/start'))return startReply();sent.resolve();return post.promise;});
 await h.start();h.finish();await sent.promise;transitions.invalidate();post.resolve({combat:{},targetAccountId:'A',dataEpoch:2});await new Promise(resolve=>setImmediate(resolve));assert.equal(h.callbacks(),0);assert.equal(h.button.textContent,'Start 3-minute breathing');assert(!h.status.textContent.includes('complete ·'));
});
