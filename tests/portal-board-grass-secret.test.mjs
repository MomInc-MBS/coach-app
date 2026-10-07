import test from 'node:test';
import assert from 'node:assert/strict';
import {grassSecret as G,grassSecretInit,grassSecretClaims,crackPath,secretPoint,SECRET} from '../modules/portal/portal-board-grass.mjs';

const START=[.1,.13],SHIP=[.9,1.4],STEP=.1;
const init=()=>grassSecretInit(START,SHIP,STEP);
// draw a straight line start->(frac of the way to ship) at 0.8 step spacing, ticking the clock as we go; returns [state, now]
function draw(s,now,frac=1,id=1){
 const L=Math.hypot(SHIP[0]-START[0],SHIP[1]-START[1]),n=Math.floor(L*frac/(STEP*1.2));
 for(let i=0;i<=n;i++){const k=frac*i/n,ev={id,x:START[0]+(SHIP[0]-START[0])*k,y:START[1]+(SHIP[1]-START[1])*k};s=G(s,{t:i?'move':'down',...ev},now);now+=30;s=G(s,{t:'tick'},now);}
 return [s,now];
}
const run=(s,now,ms)=>{for(const end=now+ms;now<end;now+=33)s=G(s,{t:'tick'},now);return [s,now];};

test('an ordered line with no gap walks the alien to the ship, then the sequence runs to done',()=>{
 let [s,now]=draw(init(),1000);
 assert.equal(s.phase,'walk');
 [s,now]=run(s,now,3000);
 assert.ok(['board','fly','crack','split','done'].includes(s.phase),s.phase);
 [s,now]=run(s,now,SECRET.boardMs+SECRET.flyMs+SECRET.crackMs+SECRET.splitMs+500);
 assert.equal(s.phase,'done');
});
test('a stroke must start at the alien; elsewhere nothing happens',()=>{
 const s=G(init(),{t:'down',id:1,x:.7,y:.9},0);assert.equal(s.phase,'idle');
});
test('a gap longer than 3 s resets the alien to the start',()=>{
 let [s,now]=draw(init(),1000,.5);
 s=G(s,{t:'up',id:1},now);
 [s,now]=run(s,now,SECRET.gapMs-800);assert.equal(s.phase,'walk');assert.ok(s.pos>0);
 [s,now]=run(s,now,2500);
 assert.equal(s.phase,'idle');assert.equal(s.pos,0);assert.equal(s.path.length,0);assert.equal(s.resets,1);
});
test('lifting the finger early lets the alien walk to the tip and stop; drawing on from the tip continues',()=>{
 let [s,now]=draw(init(),1000,.4);s=G(s,{t:'up',id:1},now);
 [s,now]=run(s,now,2000);assert.ok(Math.abs(s.pos-s.len)<1e-6);assert.equal(s.phase,'walk');
 const tip=s.path[s.path.length-1];
 s=G(s,{t:'down',id:2,x:tip[0]+STEP*.5,y:tip[1]+STEP*.5},now);assert.equal(s.drawing,2);
 s=G(s,{t:'down',id:3,x:.5,y:.2},now);assert.equal(s.drawing,2); // far touch ignored
});
test('a jump longer than 1.5 steps plants nothing (the gap)',()=>{
 let s=G(init(),{t:'down',id:1,x:.1,y:.13},0);const n=s.path.length;
 s=G(s,{t:'move',id:1,x:.1+STEP*2,y:.13},10);assert.equal(s.path.length,n);
 s=G(s,{t:'move',id:1,x:.1+STEP*1.2,y:.13},20);assert.equal(s.path.length,n+1);
});
test('the alien stays two steps behind a finger that is still drawing',()=>{
 let [s,now]=draw(init(),1000,.5);[s,now]=run(s,now,2000);
 assert.ok(s.pos<=s.len-SECRET.lag*STEP+1e-9);
 assert.equal(s.phase,'walk');
});
test('claims: false while idle, true for the stroke once the alien walks, true for every pointer after boarding',()=>{
 let s=init();assert.equal(grassSecretClaims(s,1),false);
 s=G(s,{t:'down',id:1,x:.1,y:.13},0);assert.equal(grassSecretClaims(s,1),false);
 let now=0;[s,now]=draw(init(),1000);assert.equal(grassSecretClaims(s,1),true);assert.equal(grassSecretClaims(s,9),false);
 [s,now]=run(s,now,3000);assert.equal(grassSecretClaims(s,9),true);
});
test('crackPath: exact endpoints, angular (sharp turns), stays near the ship-start line',()=>{
 let seed=7;const rand=()=>(seed=(seed*16807)%2147483647)/2147483647;
 const p=crackPath(SHIP,START,rand);
 assert.deepEqual(p[0],SHIP);assert.deepEqual(p.at(-1),START);assert.ok(p.length>=10);
 const L=Math.hypot(SHIP[0]-START[0],SHIP[1]-START[1]);
 for(const q of p){const d=Math.abs((SHIP[0]-START[0])*(START[1]-q[1])-(START[0]-q[0])*(SHIP[1]-START[1]))/L;assert.ok(d<L*.1,'offset '+d);}
 let sharp=0;for(let i=2;i<p.length;i++){const a=[p[i-1][0]-p[i-2][0],p[i-1][1]-p[i-2][1]],b=[p[i][0]-p[i-1][0],p[i][1]-p[i-1][1]];if((a[0]*b[0]+a[1]*b[1])/(Math.hypot(...a)*Math.hypot(...b))<.97)sharp++;}
 assert.ok(sharp>=5);
});
test('secretPoint walks a polyline by distance',()=>{
 assert.deepEqual(secretPoint([[0,0],[1,0],[1,1]],1.5),[1,.5]);
 assert.deepEqual(secretPoint([[0,0],[1,0]],9),[1,0]);
});
