import test from 'node:test';
import assert from 'node:assert/strict';
import {jellySecret,held,HOLD,jelly} from '../modules/portal/portal-board-jelly.mjs';

const run=(evs)=>evs.reduce((s,[ev,t])=>jellySecret(s,ev,t),undefined);
const down={type:'down',id:1,x:100,y:100};

test('a 7 s hold completes; 6.9 s does not',()=>{
 let s=run([[down,0]]);
 assert.equal(jellySecret(s,{type:'tick'},6900).done,false);
 assert.equal(jellySecret(s,{type:'tick'},7000).done,true);
});
test('drift over 24 px cancels, 24 px does not',()=>{
 const s=run([[down,0]]);
 assert.equal(jellySecret(s,{type:'move',id:1,x:124,y:100},500).up,null);
 const c=jellySecret(s,{type:'move',id:1,x:125,y:100},500);
 assert.equal(c.up,500);assert.equal(c.drift,true);
 assert.equal(jellySecret(c,{type:'tick'},7500).done,false);
});
test('early lift subsides over 1 s then is zero; re-press starts fresh',()=>{
 const s=run([[down,0],[{type:'up',id:1},4000]]);
 assert.equal(held(s,4000),4000);assert.equal(held(s,4500),2000);assert.equal(held(s,5000),0);assert.equal(held(s,9000),0);
 assert.equal(jellySecret(s,{type:'tick'},9000).done,false);
 const n=jellySecret(s,down,5000);assert.equal(held(n,6000),1000);
});
test('a second finger is ignored; only the first holds',()=>{
 const s=run([[down,0],[{type:'down',id:2,x:5,y:5},10],[{type:'up',id:2},20],[{type:'move',id:2,x:900,y:900},30]]);
 assert.equal(s.id,1);assert.equal(s.up,null);assert.equal(jellySecret(s,{type:'tick'},7000).done,true);
});
test('debug skip fast-forwards, done is final',()=>{
 let s=run([[down,0],[{type:'skip',ms:HOLD.ms},10]]);
 s=jellySecret(s,{type:'tick'},20);assert.equal(s.done,true);
 assert.equal(jellySecret(s,{type:'up',id:1},30),s);assert.equal(held(s,1e6),HOLD.ms);
});
test('claims: the holding finger, from press, not a drifted or foreign one',async()=>{
 globalThis.matchMedia??=()=>({matches:false});
 const THREE={Vector4:class{set(){}},Vector2:class{},Box3:class{max={z:1};union(){return this;}},DirectionalLight:class{position={set(){}};}},uniforms=Object.fromEntries(Object.entries(jelly.uniforms).map(([k,v])=>[k,{...v}]));
 uniforms.uTime={value:0};
 await jelly.init({THREE,scene:{add(){}},mesh:{isMesh:true,geometry:{computeBoundingBox(){},boundingBox:{}}},material:{},uniforms,paint:{},glow:{canvas:{width:1,height:1},ctx:{},texture:{}},face:{w:1,h:1},toWorld:(u,v)=>[u*300,-v*300]});
 assert.equal(jelly.claims(1),false);
 jelly.press(1,.5,.5);assert.equal(jelly.claims(1),true);assert.equal(jelly.claims(2),false);
 jelly.move(1,.9,.5,.5,.5);assert.equal(jelly.claims(1),false);
 jelly.dispose();assert.equal(jelly.claims(1),false);
});
