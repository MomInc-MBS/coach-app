import test from 'node:test';
import assert from 'node:assert/strict';
import {woodSecret,woodSecretInit,woodClaims,revNow,SECRET} from '../modules/portal/portal-board-wood.mjs';

const F={w:300,h:360};
const ev=(t,x,y,id=1,extra={})=>({t,id,x,y,...F,...extra});
// Scrub x back and forth `legs` times (legs-1 reversals + the first leg) with 30 px legs, 100 ms apart, around (cx,cy).
function scrub(s,legs,{cx=60,cy=60,t0=0,dt=100,id=1}={}){
 s=woodSecret(s,ev('down',cx,cy,id),t0);let t=t0;
 for(let i=0;i<legs;i++){t+=dt;s=woodSecret(s,ev('move',cx+(i%2?0:30),cy,id),t);}
 return {s,t};
}

test('8 reversals in one quadrant within 3 s -> fire',()=>{
 const {s}=scrub(null,10); // 1 first leg + 9 turns
 assert.equal(s.phase,'fire');
 assert.ok(s.at);
});
test('7 reversals -> not yet',()=>{assert.equal(scrub(null,8).s.phase,'idle');});
test('8 reversals spread over two quadrants -> no fire',()=>{
 let {s,t}=scrub(null,6,{cx:100,cy:60}); // 5 turns, left quadrant (x<150)
 for(let i=0;i<6;i++){t+=100;s=woodSecret(s,ev('move',i%2?190:220,60),t);} // jump to the right quadrant: tracking restarts
 assert.equal(s.phase,'idle');
});
test('slow scrub (reversals older than 3 s) -> no fire',()=>{assert.equal(scrub(null,12,{dt:600}).s.phase,'idle');});
test('legs shorter than 18 px do not count',()=>{
 let s=woodSecret(null,ev('down',50,50),0);
 for(let i=1;i<=40;i++)s=woodSecret(s,ev('move',50+(i%2?10:0),50),i*20);
 assert.equal(revNow(s,800),0);
});
test('y-axis scrubbing counts too',()=>{
 let s=woodSecret(null,ev('down',60,60),0);
 for(let i=1;i<=10;i++)s=woodSecret(s,ev('move',60,i%2?90:60),i*100);
 assert.equal(s.phase,'fire');
});
test('tap after fire -> ash; ash is terminal',()=>{
 let {s}=scrub(null,10);
 s=woodSecret(s,ev('move',70,70),2000);assert.equal(s.phase,'fire'); // scrubbing on does nothing
 s=woodSecret(s,ev('down',250,300,2),2500);assert.equal(s.phase,'ash');
 assert.equal(woodSecret(s,ev('down',10,10,3),2600).phase,'ash');
});
test('claims only after >= 4 reversals (and everything once burning)',()=>{
 let s=woodSecret(null,ev('down',60,60),0),t=0,flags=[];
 for(let i=1;i<=9;i++){t+=100;s=woodSecret(s,ev('move',60+(i%2?30:0),60),t);flags.push([revNow(s,t),woodClaims(s,1)]);}
 for(const [r,c] of flags)assert.equal(c,r>=SECRET.claimRevs||false,`rev ${r}`);
 assert.ok(flags.some(([,c])=>c));
 assert.equal(woodClaims(woodSecret(null,ev('down',60,60),0),1),false);
 assert.equal(woodClaims(scrub(null,10).s,99),true); // burning: every pointer is claimed
});
test('claim survives the lift of the scrubbing finger, only for that pointer',()=>{
 let {s,t}=scrub(null,7);assert.equal(s.phase,'idle');
 s=woodSecret(s,ev('up',0,0),t+50);
 assert.equal(woodClaims(s,1),true);assert.equal(woodClaims(s,2),false);
 s=woodSecret(s,ev('down',60,60,2),t+300);assert.equal(woodClaims(s,1),false); // next stroke starts clean
});
test('a first touch at the screen edge is ignored',()=>{
 const s=woodSecret(null,ev('down',5,60,1,{edge:true}),0);assert.equal(s.id,null);
 let t=0;for(let i=1;i<=12;i++){t+=100;woodSecret(s,ev('move',i%2?35:5,60),t);}
 assert.equal(woodSecret(s,ev('move',35,60),100).phase,'idle');
});
test('a second finger does not disturb the tracked scrub',()=>{
 let {s,t}=scrub(null,5);const before=revNow(s,t);
 s=woodSecret(s,ev('down',250,300,2),t+10);s=woodSecret(s,ev('move',200,200,2),t+20);
 assert.equal(revNow(s,t+30),before);assert.equal(s.id,1);
});
test('init is the idle state',()=>assert.equal(woodSecretInit().phase,'idle'));
