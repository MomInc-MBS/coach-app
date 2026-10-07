import test from 'node:test';
import assert from 'node:assert/strict';
import {knobStep,flyTurn,wrapIndex,wrapText,crtView,blocked} from '../modules/vault/vault-door.mjs';

const TAU=Math.PI*2,D=Math.PI/6;
const turn=(fn,st,from,to,n)=>{let r=st,steps=0;for(let i=0;i<=n;i++){r=fn(r,from+(to-from)*i/n);}return r;};

test('knob: each 30 degrees is one step, clockwise positive, wrapping the atan2 seam',()=>{
 let st={last:null,acc:0,total:0},steps=0,a=0;
 for(let i=0;i<=36;i++){const r=knobStep(st,Math.atan2(Math.sin(a),Math.cos(a)));st=r.st;steps+=r.steps;a+=Math.PI/36*1.01;} // ~182 degrees
 assert.equal(steps,6);
 st={last:null,acc:0,total:0};steps=0;a=0;
 for(let i=0;i<=36;i++){const r=knobStep(st,Math.atan2(Math.sin(a),Math.cos(a)));st=r.st;steps+=r.steps;a-=Math.PI/36*1.01;}
 assert.equal(steps,-6);
});
test('knob: a small wobble inside one detent steps nothing',()=>{
 let st={last:null,acc:0,total:0},steps=0;
 for(const a of [0,.1,.2,.1,0,-.1,-.2,0]){const r=knobStep(st,a);st=r.st;steps+=r.steps;}
 assert.equal(steps,0);
});
test('wrapIndex wraps both ways and survives an empty list',()=>{
 assert.equal(wrapIndex(5,5),0);assert.equal(wrapIndex(-1,5),4);assert.equal(wrapIndex(7,5),2);assert.equal(wrapIndex(3,0),0);
});
test('flywheel: one full turn is progress 1, half is .5, reversing unwinds, extra turns clamp',()=>{
 let st={last:null,total:0};
 for(let i=0;i<=18;i++)st=flyTurn(st,Math.atan2(Math.sin(Math.PI*i/18),Math.cos(Math.PI*i/18)));
 assert.ok(Math.abs(st.progress-.5)<1e-9);
 for(let i=18;i>=9;i--)st=flyTurn(st,Math.PI*i/18);
 assert.ok(Math.abs(st.progress-.25)<1e-9);
 st={last:null,total:0};
 for(let i=0;i<=80;i++){const a=TAU*i/60;st=flyTurn(st,Math.atan2(Math.sin(a),Math.cos(a)));}
 assert.equal(st.progress,1);assert.ok(Math.abs(st.total)<=TAU);
});
test('wrapText wraps on words and never loses text',()=>{
 const l=wrapText('The koi that fills the pond is not afraid of you.',20);
 assert.ok(l.every(x=>x.length<=20));assert.equal(l.join(' '),'The koi that fills the pond is not afraid of you.');
 assert.deepEqual(wrapText('',10),[]);
});
test('CRT view steps through the goal list in order, wraps, and shows earned / have-need',()=>{
 const goals=[{id:'a',tier:'rare',title:'Aaa',clue:'one',test:s=>!!s.a},{id:'b',tier:'legendary',title:'Bbb',clue:'two',test:()=>false,progress:()=>({have:3,need:5})},{id:'c',tier:'rare',title:'Ccc',clue:'three',test:()=>{throw Error('x');}}];
 const st={a:true};
 assert.equal(crtView(goals,0,st).head,'GOAL 01/03 · RARE');
 assert.equal(crtView(goals,0,st).foot,'✓ Aaa');
 assert.equal(crtView(goals,1,st).foot,'3 / 5');assert.equal(crtView(goals,1,st).head,'GOAL 02/03 · LEGENDARY');
 assert.equal(crtView(goals,2,st).earned,false); // a throwing test is not a crash
 assert.equal(crtView(goals,3,st).id,'a');assert.equal(crtView(goals,-1,st).id,'c');
 assert.equal(crtView([],0,{}).head,'NO SIGNAL');
});
test('kit parts are kept off the CRT, dial, flywheel and logo',()=>{
 assert.ok(blocked(.5,.2));assert.ok(blocked(.5,.03));assert.ok(blocked(.5,.455));assert.ok(blocked(.5,.72));
 assert.ok(!blocked(.2,.85)&&!blocked(.7,.9));
});
