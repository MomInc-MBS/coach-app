import test from 'node:test';
import assert from 'node:assert/strict';
import {stepTrain,applyTorque,triangleInGear,GEARS,COGS,PITCH,ADDENDUM,ASPECT,teethFor,meshPhase} from '../portal-board-cogs.mjs';

// Three-gear train: big wheel (root) -> small gear (meshed under it) -> knob (meshed under that).
const makeTrain=()=>([
 {r:.24,drives:null,angle:0,omega:0},
 {r:.10,drives:0,angle:0,omega:0},
 {r:.06,drives:1,angle:0,omega:0},
]);

test('applyTorque on the root spins it, and stepTrain derives the counter-rotation ratio',()=>{
 const g=makeTrain();
 applyTorque(g,0,5);
 stepTrain(g,1/60);
 assert.ok(g[0].omega>0,'root keeps the sign of the applied torque');
 // meshed gear spins opposite the root, rim speed equal: omega1 = -omega0*r0/r1
 assert.ok(Math.abs(g[1].omega-(-g[0].omega*g[0].r/g[1].r))<1e-9);
});

test('torque propagates through the whole chain (double negation = same sign two links down)',()=>{
 const g=makeTrain();
 applyTorque(g,0,5);
 stepTrain(g,1/60);
 assert.ok(g[0].omega>0);
 assert.ok(g[1].omega<0,'small gear opposes the wheel');
 assert.ok(g[2].omega>0,'knob opposes the small gear, so it matches the wheel\'s sign again');
 assert.ok(Math.abs(g[2].omega-(g[0].omega*g[0].r/g[2].r))<1e-9);
});

test('applyTorque on a non-root gear still drives the whole train (rigid mesh)',()=>{
 const g=makeTrain();
 applyTorque(g,1,-2); // push directly on the small gear
 assert.ok(g[0].omega!==0,'the root absorbed the equivalent torque');
 stepTrain(g,1/60);
 assert.ok(Math.abs(g[1].omega-(-g[0].omega*g[0].r/g[1].r))<1e-9,'ratio still holds after stepping');
});

test('friction decays the whole train to rest, and stepTrain reports it',()=>{
 const g=makeTrain();
 applyTorque(g,0,5);
 let moving=true,iterations=0;
 while(moving&&iterations<10000){moving=stepTrain(g,1/60);iterations++;}
 assert.ok(!moving,'train comes to rest');
 assert.ok(g.every(x=>Math.abs(x.omega)<=.02),'every gear settled under the rest threshold');
 assert.ok(iterations>1&&iterations<10000,'took a nonzero, bounded number of steps to decay');
});

test('stepTrain returns false immediately for an already-still train',()=>{
 assert.equal(stepTrain(makeTrain(),1/60),false);
});

test('triangleInGear: all three vertices inside the disc and above zMin, else it stays with the door',()=>{
 const c={x:0,y:0};
 assert.equal(triangleInGear(.1,0,1, 0,.1,1, -.1,-.1,1, c,.5,.5),true,'all inside');
 assert.equal(triangleInGear(.1,0,1, 0,.1,1, .6,0,1, c,.5,.5),false,'one vertex outside the disc');
 assert.equal(triangleInGear(.1,0,1, 0,.1,1, -.1,-.1,.2, c,.5,.5),false,'one vertex below the slab');
});

// --- The door's own parts + the extra cogs, as one train ---------------------------------------
const TAU=Math.PI*2;
const combined=()=>[...GEARS,...COGS].map(g=>({...g,angle:0,omega:0}));
// depth below the root (wheel) — each mesh flips the spin
const depthOf=(t,i)=>{let d=0;while(t[i].drives!=null){i=t[i].drives;d++;}return d;};

test('combined train: torque on a 3-deep cog reaches the root and every gear shares its rim speed',()=>{
 const t=combined(),deep=t.findIndex((_,i)=>depthOf(t,i)>=3);
 assert.ok(deep>0,'layout has a chain at least 3 meshes deep');
 applyTorque(t,deep,3);stepTrain(t,1/60);
 assert.ok(t[0].omega!==0,'root spun');
 for(let i=0;i<t.length;i++){
  const want=t[0].omega*t[0].r/t[i].r*(depthOf(t,i)%2?-1:1);
  assert.ok(Math.abs(t[i].omega-want)<1e-9,`gear ${t[i].id??i}: omega*r matches the root, sign alternates per mesh`);
 }
});

test('teethFor: every cog uses the shared pitch, so meshing cog pairs match exactly',()=>{
 for(const c of COGS)assert.equal(c.teeth,teethFor(c.r,PITCH),c.id);
 const t=combined();
 for(let i=GEARS.length;i<t.length;i++){
  if(t[i].drives<GEARS.length)continue; // the door's own parts are spoked, not toothed
  const p=t[t[i].drives];
  assert.ok(Math.abs(TAU*p.r/p.teeth-TAU*t[i].r/t[i].teeth)<1e-12,`${p.id} / ${t[i].id}`);
 }
});

test('layout self-check: meshing cogs touch at r1+r2, nothing else overlaps (tips included)',()=>{
 const t=combined(),isCog=i=>i>=GEARS.length,dist=(a,b)=>Math.hypot(a.u-b.u,(a.v-b.v)*ASPECT);
 t.forEach((g,i)=>{if(isCog(i))assert.ok(g.drives<i,`${g.id} drives an earlier gear (stepTrain order)`);});
 for(let i=0;i<t.length;i++)for(let j=i+1;j<t.length;j++){
  if(!isCog(i)&&!isCog(j))continue; // the door's own parts are fixed by its geometry
  const a=t[i],b=t[j],d=dist(a,b),meshed=a.drives===j||b.drives===i;
  if(meshed)assert.ok(Math.abs(d-(a.r+b.r))<.003,`${a.id??i}-${b.id}: ${d} vs ${a.r+b.r}`);
  else assert.ok(d>a.r+b.r+2*ADDENDUM,`${a.id??i}-${b.id} overlap: ${d}`);
 }
 for(const c of COGS)assert.ok(c.u-c.r>0&&c.u+c.r<1&&c.v-c.r*.6>0&&c.v+c.r*.6<1,`${c.id} on the face`);
});

test('meshPhase: cog teeth start interleaved and stay interleaved while the train turns',()=>{
 const t=combined();
 for(let i=GEARS.length;i<t.length;i++)t[i].angle=meshPhase(t[t[i].drives],t[i],ASPECT);
 // tooth fraction of gear g at direction th (tooth centres sit at angle + k*TAU/teeth)
 const frac=(g,th)=>(((th-g.angle)*g.teeth/TAU)%1+1)%1;
 const check=()=>{for(let i=GEARS.length;i<t.length;i++){
  const c=t[i],p=t[c.drives];if(c.drives<GEARS.length)continue;
  const th=Math.atan2((p.v-c.v)*ASPECT,c.u-p.u),s=(frac(p,th)+frac(c,th+Math.PI))%1;
  assert.ok(Math.abs(s-.5)<1e-6,`${p.id}/${c.id} teeth interleave (${s})`);
 }};
 check();applyTorque(t,0,7);for(let k=0;k<200;k++)stepTrain(t,1/60);check();
});
