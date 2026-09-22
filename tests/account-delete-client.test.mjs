import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {validateAccountDeletionReceipt} from '../account-workout-sync.mjs';
const receipt=(ownerId,deletedEpoch)=>({ownerId,deletedEpoch,deleted:true,alreadyDeleted:false,currentDataEpoch:deletedEpoch+1,deletedThroughEpoch:deletedEpoch});
const source=await readFile(new URL('../launch.mjs',import.meta.url),'utf8');
const handlerSource=source.split('\n').find(line=>line.startsWith("$('deleteAccount').onclick="));
function handler({account,api}){
 const elements={deleteAccount:{},deleteConfirm:{value:'DELETE'}},removed=[],errors=[],cleanup=[];
 vm.runInNewContext(handlerSource,{$:id=>elements[id],account,api,accountTransitions:{invalidate(){}},packGrantCache:{remove(){}},accountWorkoutSync:{forgetDeletedAccount:(...args)=>cleanup.push(args)},validateAccountDeletionReceipt,accountTransitionBusy:false,localStorage:{removeItem:key=>removed.push(key)},pendingKey:user=>'pending:'+user,keys:[],clearCoachAccount(){},location:{reload(){}},set:(key,message)=>errors.push(message),Number});
 return {run:elements.deleteAccount.onclick,removed,errors,cleanup};
}
test('launch delete submits captured account epoch and exact target through api headers',async()=>{
 const calls=[],h=handler({account:{user:{id:'alice'},dataEpoch:7},api:async(...args)=>{calls.push(args);return receipt('alice',7);}});
 await h.run();assert.deepEqual(JSON.parse(JSON.stringify(calls)),[['/api/account','DELETE',{confirm:'DELETE',expectedDataEpoch:7},{'X-Target-Account':'alice'}]]);assert.deepEqual(h.cleanup,[['alice',7]]);assert(!h.removed.includes('pending:alice'));
});
test('legacy account snapshot refreshes core details once before deletion',async()=>{
 const calls=[],h=handler({account:{user:{id:'alice'}},api:async(...args)=>{calls.push(args);return args[1]==='DELETE'?receipt('alice',3):{user:{id:'alice'},dataEpoch:3};}});
 await h.run();assert.equal(calls[0][0],'/api/account?core=1');assert.equal(calls[1][2].expectedDataEpoch,3);assert.equal(calls[1][3]['X-Target-Account'],'alice');
});
test('delete conflict does not refresh epoch, resubmit, or clear pending source queue',async()=>{
 const calls=[],h=handler({account:{user:{id:'alice'},dataEpoch:1},api:async(...args)=>{calls.push(args);throw Object.assign(Error('epoch changed'),{status:409});}});
 await h.run();assert.equal(calls.length,1);assert.deepEqual(h.removed,[]);assert.deepEqual(h.errors,['epoch changed']);
});
test('launch api preserves authenticated fetch and sends assertion header with JSON body',async()=>{
 const apiSource=source.split('\n').find(line=>line.startsWith('export async function api(')).replace(/^export /,''),calls=[];
 const api=vm.runInNewContext(apiSource+';api',{accountTransitions:{capture:()=>({}),assertCurrent(){}},account:null,authFetch:async(...args)=>{calls.push(args);return new Response('{}',{headers:{'Content-Type':'application/json'}});},Response,Error,JSON,Object});
 await api('/api/account','DELETE',{confirm:'DELETE',expectedDataEpoch:2},{'X-Target-Account':'alice'});
 assert.equal(calls[0][1].credentials,'same-origin');assert.equal(calls[0][1].headers['X-Target-Account'],'alice');assert.equal(calls[0][1].headers['Content-Type'],'application/json');assert.equal(JSON.parse(calls[0][1].body).expectedDataEpoch,2);
});
