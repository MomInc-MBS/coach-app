import test from 'node:test';
import assert from 'node:assert/strict';
import {crackT,crackAlpha,trailReach,trailLife,crackShape,visible,BIG,TRAIL,ice} from '../modules/portal/portal-board-ice.mjs';

const near=(a,b,msg)=>assert.ok(Math.abs(a-b)<1e-9,`${msg??''} ${a} != ${b}`);
const seeded=(s=7)=>()=>(s=(s*16807)%2147483647)/2147483647;

test('big crack: grow 300 ms, hold 600 ms, shrink 400 ms, gone by 1.3 s',()=>{
 assert.equal(crackT(150),.5);assert.equal(crackT(899),1);
 assert.equal(crackT(1100),.5);assert.equal(crackAlpha(1100),.5);
 assert.equal(crackAlpha(1300),0);
});

test('trail reach: shoots out, holds, retracts along the same curve backwards; no fade',()=>{
 const {grow:g,hold:h,retract:r}=TRAIL,held=g+h;
 assert.equal(trailReach(-1),0);assert.equal(trailReach(0),0);
 near(trailReach(g/2),.75,'ease-out growth');assert.equal(trailReach(g),1);
 assert.equal(trailReach(held-1),1); // hold
 near(trailReach(held+r/2),.75,'retract mirrors growth');
 for(let t=0;t<=g;t+=g/8)near(trailReach(held+r*(1-t/g)),trailReach(t),'reverse at '+t);
 assert.equal(trailReach(held+r),0);assert.equal(trailLife(),held+r);assert.ok(trailLife()<=1300);
});

test('reduced motion: whole at once, gone after the hold',()=>{
 assert.equal(crackT(0,true),1);assert.equal(crackAlpha(899,true),1);assert.equal(crackAlpha(900,true),0);
 const held=TRAIL.grow+TRAIL.hold;
 assert.equal(trailReach(0,true),1);assert.equal(trailReach(held-1,true),1);assert.equal(trailReach(held,true),0);
 assert.equal(trailLife(true),held);
});

test('V / Y / Z shapes: rooted at 0,0, pointing outward, arc distances consistent',()=>{
 const rnd=seeded();
 for(let n=0;n<20;n++){
  const V=crackShape('V',rnd),Y=crackShape('Y',rnd),Z=crackShape('Z',rnd);
  for(const b of [...V,...Y,...Z])for(let i=1;i<b.length;i++)
   near(b[i][2],b[i-1][2]+Math.hypot(b[i][0]-b[i-1][0],b[i][1]-b[i-1][1]),'arc distance');
  // V: two prongs from the root, one each side
  assert.equal(V.length,2);for(const b of V){assert.deepEqual(b[0],[0,0,0]);assert.ok(b.at(-1)[0]>.5);}
  assert.ok(V[0].at(-1)[1]*V[1].at(-1)[1]<0);
  // Y: a stem from the root, then two branches forking from its end
  assert.equal(Y.length,3);assert.deepEqual(Y[0][0],[0,0,0]);
  for(const b of Y.slice(1)){assert.deepEqual(b[0],Y[0].at(-1));assert.ok(b.at(-1)[0]>Y[0].at(-1)[0]);}
  // Z: one three-stroke zigzag (4 corners + 2 kinks per stroke), ending further out than it started
  assert.equal(Z.length,1);assert.equal(Z[0].length,10);assert.deepEqual(Z[0][0],[0,0,0]);assert.ok(Z[0].at(-1)[0]>.3);
 }
});

test('visible: clips a branch at arc distance r, on an interpolated tip',()=>{
 const b=[[0,0,0],[3,4,5],[3,14,15]];
 assert.equal(visible(b,0).length,1);
 assert.deepEqual(visible(b,10),[[0,0,0],[3,4,5],[3,9,10]]);
 assert.deepEqual(visible(b,99),b);
});

test('ice: glow only, trail cracks spaced along the drag and capped, wiped once when the last one dies',()=>{
 globalThis.Path2D=class{};globalThis.matchMedia=()=>({matches:false});
 const gc={fills:0,clears:0,outlines:0,save(){},restore(){},setTransform(){},translate(){},rotate(){},beginPath(){},moveTo(){this.outlines++;},lineTo(){},closePath(){},
  fill(){this.fills++;},clearRect(){this.clears++;}};
 const glow={canvas:{width:1024,height:1024},ctx:gc,texture:{}},paint={canvas:{width:1024,height:1024},ctx:{},texture:{}};
 ice.init({paint,glow,toWorld:(u,v)=>[u*1000,-v*1000]}); // a 1000 px wide face on screen
 const t=performance.now();
 ice.press(1,.2,.5);ice.move(1,.23,.5); // 30 screen px -> 1 to 3 cracks at 9..20 px spacing
 assert.equal(ice.step(1/60,t+50),true);assert.equal(gc.fills,2); // big + one fill for the whole trail
 assert.ok(gc.outlines>=2&&gc.outlines<=12);
 ice.move(1,.9,.5);ice.move(1,.1,.5);ice.move(1,.9,.5); // 2300 more px -> ~160 cracks, over the cap
 gc.fills=gc.outlines=0;assert.equal(ice.step(1/60,performance.now()+200),true); // all fully out: 2 (Z) to 4 (Y) outlines each, hairline included
 assert.ok(gc.outlines>=2*TRAIL.max&&gc.outlines<=4*TRAIL.max,'capped at TRAIL.max: '+gc.outlines);
 assert.equal(gc.clears,2);assert.equal(gc.fills,2);assert.equal(paint.texture.needsUpdate,undefined);
 gc.fills=0;ice.step(1/60,t+1200); // big still shrinking, trail still retracting
 assert.equal(gc.fills,2);
 const end=performance.now()+Math.max(trailLife(),BIG.grow+BIG.hold+BIG.shrink); // newest crack's death
 assert.equal(ice.step(1/60,end),false);assert.equal(gc.clears,4);
 glow.texture.needsUpdate=false;
 assert.equal(ice.step(1/60,end+5000),false);assert.equal(gc.clears,4);assert.equal(glow.texture.needsUpdate,false);
 ice.dispose();delete globalThis.Path2D;delete globalThis.matchMedia;
});
