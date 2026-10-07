// Achievement Vault L1: the pond secret reducer (hold the big koi to raise it; lift early and it gets bored).
import test from 'node:test';
import assert from 'node:assert/strict';
import {POND,SECRET,pondSecret,pond} from '../modules/portal/portal-board-pond.mjs';

const big={x:.5,y:.9},down=(o={})=>({type:'down',id:1,x:.5,y:.9,phase:'big',big,...o});
const hold=(t0=0)=>pondSecret(null,down(),t0);

test('hold on the big koi for the full rise => done',()=>{
 let s=hold(1000);assert.equal(s.st,'hold');assert.equal(s.id,1);
 assert.equal(pondSecret(s,{type:'tick'},1000+SECRET.riseMs-1).st,'hold');
 assert.equal(pondSecret(s,{type:'tick'},1000+SECRET.riseMs).st,'done');
 assert.equal(pondSecret(s,{type:'up',id:1},1000+SECRET.riseMs+50).st,'done');
});
test('release at 1 s => bored; pointer id cleared',()=>{
 const s=pondSecret(hold(0),{type:'up',id:1},1000);assert.equal(s.st,'bored');assert.equal(s.id,null);
});
test('nothing unless phase is big and the touch is on the fish',()=>{
 for(const ev of [down({phase:'wander'}),down({phase:'scatter'}),down({phase:'touch'}),down({x:.5+POND.bigLen*SECRET.hit+.01})])assert.equal(pondSecret(null,ev,0).st,'idle');
 assert.equal(pondSecret(null,down({x:.5+POND.bigLen*SECRET.hit-.01}),0).st,'hold');
});
test('drift past the limit bores the fish, but the pointer stays claimed until it lifts',()=>{
 const s=hold(0);
 assert.equal(pondSecret(s,{type:'move',id:1,x:.5+SECRET.drift*.9,y:.9},500).st,'hold');
 const b=pondSecret(s,{type:'move',id:1,x:.5+SECRET.drift*1.1,y:.9},500);assert.equal(b.st,'bored');assert.equal(b.id,1);
 assert.equal(pondSecret(b,{type:'up',id:1},900).id,null);
});
test('other fingers are ignored; reset returns to idle',()=>{
 const s=hold(0);
 assert.equal(pondSecret(s,{type:'up',id:2},500).st,'hold');
 assert.equal(pondSecret(s,down({id:2}),500),s);
 assert.deepEqual(pondSecret(pondSecret(s,{type:'up',id:1},500),{type:'reset'},600),{st:'idle',id:null});
});
test('effect exposes claims and forceBig',()=>{assert.equal(typeof pond.claims,'function');assert.equal(typeof pond.forceBig,'function');assert.equal(pond.claims(1),false);});
