import test from 'node:test';
import assert from 'node:assert/strict';
import {notificationBinding} from '../device-notifications.mjs';
test('notification subscriptions reconnect to the current account and errors never report ready',async()=>{
 let calls=0,fail=false;const binding=notificationBinding(async(path,method,data)=>{calls++;assert.equal(path,'/api/push/subscribe');assert.equal(method,'POST');assert.equal(data.endpoint,'https://push.example');if(fail)throw Error('offline');});
 const sub={endpoint:'https://push.example',toJSON(){return {endpoint:this.endpoint};}},account={user:{id:'alice'},onboarding:{}};
 assert(!binding.ready('alice'));await binding.verify(account,sub);assert(binding.ready('alice'));await binding.verify(account,sub);assert.equal(calls,1);assert(!binding.ready('bob'));
 await binding.verify({...account,user:{id:'bob'}},sub);assert.equal(calls,2);assert(binding.ready('bob'));assert(!binding.ready('alice'));
 fail=true;await assert.rejects(()=>binding.verify(account,sub));assert(!binding.ready('alice'));assert(!binding.ready('bob'));
 assert.equal(await binding.verify(null,sub),false);
});
