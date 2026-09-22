import test from 'node:test';
import assert from 'node:assert/strict';
import {COACH,userAnchor,project,CoachMotion} from '../coach-hit.mjs';

// 33 normalised screen points (x right, y down) for a person standing at userX.
function person(userX=.3,{scale=1,wrist=null,knee=null,ankle=null,hide=[]}={}){
 const p=Array.from({length:33},()=>({x:userX,y:.5,visibility:.9}));
 const set=(i,x,y)=>{p[i]={x,y,visibility:hide.includes(i)?.1:.9};};
 set(11,userX-.08*scale,.3);set(12,userX+.08*scale,.3);set(23,userX-.05*scale,.3+.2*scale);set(24,userX+.05*scale,.3+.2*scale);
 set(25,userX-.05*scale,.3+.4*scale);set(26,userX+.05*scale,.3+.4*scale);
 set(27,userX-.05*scale,.3+.6*scale);set(28,userX+.05*scale,.3+.6*scale);
 set(15,userX-.12,.45);set(16,userX+.12,.45);
 if(wrist)set(16,...wrist);if(knee)set(26,...knee);if(ankle)set(28,...ankle);
 return p;
}
const seeded=(s=7)=>()=>(s=(s*16807)%2147483647)/2147483647;
const center=b=>[(b.left+b.right)/2,(b.top+b.bottom)/2];
const run=(m,frames,t,make)=>{let s;const all=[];for(let i=0;i<frames;i++){t+=33;s=m.update(make(i),t);all.push(s);}return {s,t,all};};
// Begun, walked in and standing at its first spot.
function standing(userX=.3){
 const m=new CoachMotion({aspect:.46,now:0,random:seeded()});m.update(person(userX),33);m.begin();
 let s,t=33;do{s=m.update(person(userX),t+=33);}while(s.phase!=='pausing'&&t<20000);
 return {m,s,t};
}

test('tuning knobs are exported',()=>{for(const k of ['hitSpeed','spinMs','awayMs','stride','roomDepth','heightPerTorso','gap','turnRate'])assert.ok(Number.isFinite(COACH[k])&&COACH[k]>0,k);});

test('the floor sits on the knee line, the horizon at the hips, and farther means smaller and higher',()=>{
 const a=userAnchor(person(.3),.46);
 assert.ok(Math.abs(a.floorY-.7)<1e-6&&Math.abs(a.horizonY-.5)<1e-6&&Math.abs(a.x-.3)<1e-6);
 const big=userAnchor(person(.3,{scale:1.5}),.46);assert.ok(Math.abs(big.height/a.height-1.5)<.02,'height follows torso length');
 assert.equal(userAnchor(person(.3,{hide:[11,12]}),.46),null,'no shoulders → no user');assert.equal(userAnchor(null,.46),null);
 const noKnees=userAnchor(person(.3,{hide:[25,26]}),.46);assert.ok(noKnees.floorY>.5&&noKnees.floorY<=1,'hidden knees fall back below the hips');
 const level=project(a,.7,1,.46),behind=project(a,.7,1.4,.46);
 assert.ok(Math.abs(level.feetY-.7)<1e-6&&Math.abs(level.height-a.height)<1e-6,'level with the user = same floor line and size');
 assert.ok(behind.feetY<level.feetY&&behind.height<level.height&&behind.x<level.x,'behind = higher, smaller, toward the centre');
});

test('does not mutate the landmarks it reads',()=>{const p=person(.3),copy=JSON.stringify(p);const m=new CoachMotion({aspect:.46,now:0});m.begin();m.update(p,33);m.update(p,66);userAnchor(p,.46);assert.equal(JSON.stringify(p),copy);});

test('stays off frame until reps count, then walks in from the roomier edge',()=>{
 const m=new CoachMotion({aspect:.46,now:0,random:seeded()});
 let {s,t}=run(m,60,0,()=>person(.3));assert.equal(s.phase,'offstage','no reps yet → no coach');
 m.begin();s=m.update(person(.3),t+=33);
 assert.equal(s.phase,'walking');assert.ok(s.box.left>=1,'starts fully off the right edge (the user stands left)');
 const first=s.x;({s,t}=run(m,5,t,()=>person(.3)));
 assert.ok(s.x<first,'walks inward');assert.ok(s.yaw<-1,'faces left, the way it walks');
 while(s.phase==='walking'&&t<20000)s=m.update(person(.3),t+=33);
 assert.equal(s.phase,'pausing');assert.ok(s.box.left>.38&&s.box.right<=1+1e-9,'arrives on screen beside the user');
});

test('wanders between depths and never stands behind the user where it would need cutting out',()=>{
 let {m,t}=standing(.3);const {all}=run(m,1800,t,()=>person(.3)); // one minute
 const depths=new Set(all.filter(s=>s.phase==='pausing').map(s=>s.z));
 assert.ok(depths.size>=3,`visits several depths (${[...depths]})`);
 assert.ok(all.some(s=>s.phase==='walking')&&all.some(s=>s.phase==='pausing'),'walks and pauses');
 const userRight=.38;for(const s of all)if(s.z>1)assert.ok(s.box.left>=userRight-1e-9,'behind the user = clear of their shoulders');
 for(const s of all)assert.ok(s.box.left>=-1e-9&&s.box.right<=1+1e-9,'stays on screen');
 const near=all.find(s=>s.z<1),far=all.find(s=>s.z>1.3);assert.ok(near.height>far.height&&near.feetY>far.feetY,'closer looks bigger and lower');
});

test('crosses to the roomier side only in front of the user',()=>{
 let {m,t}=standing(.3);
 // The user drifts right slowly (no hits), leaving the left side roomier.
 const at=i=>person(Math.min(.72,.3+i*.004));const {all}=run(m,1500,t,at);
 const end=all.at(-1);assert.ok(end.x<.72-.08,'ends up on the left side');
 // ponytail: a user walking into the coach can overlap it from behind for a moment while it re-plans.
 const behind=all.filter((s,i)=>{const ux=Math.min(.72,.3+i*.004);return s.z>1+1e-9&&s.box.right>ux-.08&&s.box.left<ux+.08;});
 assert.ok(behind.every(s=>s.phase==='walking'),'never stops behind the user');assert.ok(behind.length<=15,`overlaps from behind for at most half a second (${behind.length} frames)`);
});

test('a kick (fast ankle or knee) inside the coach box knocks it away; slow, outside, arms or unseen do not',()=>{
 {const {m,s,t}=standing(),[cx,cy]=center(s.box),hidden=person(.3,{ankle:[cx-.008,cy]});hidden[28].visibility=.1;m.update(hidden,t+33);m.update(person(.3,{ankle:[cx-.004,cy]}),t+66);assert.equal(m.update(person(.3,{ankle:[cx,cy]}),t+99).phase,'pausing','slow foot in box');}
 {const {m,t}=standing();m.update(person(.3,{ankle:[.05,.8]}),t+33);assert.equal(m.update(person(.3,{ankle:[.05,.95]}),t+66).phase,'pausing','fast foot outside box');}
 {const {m,s,t}=standing(),[cx,cy]=center(s.box);m.update(person(.3,{ankle:[.38,.9]}),t+33);assert.equal(m.update(person(.3,{ankle:[cx,cy]}),t+66).phase,'spun','kick into the box');}
 {const {m,s,t}=standing(),[cx,cy]=center(s.box);m.update(person(.3,{knee:[cx,cy+.12]}),t+33);assert.equal(m.update(person(.3,{knee:[cx,cy]}),t+66).phase,'spun','fast knee in box');}
 {const {m,s,t}=standing(),[cx,cy]=center(s.box);m.update(person(.3,{wrist:[cx-.2,cy]}),t+33);assert.equal(m.update(person(.3,{wrist:[cx,cy]}),t+66).phase,'pausing','arm swings leave it alone');}
 {const {m,s,t}=standing(),[cx,cy]=center(s.box),hidden=person(.3,{ankle:[cx,cy]});hidden[28].visibility=.1;m.update(person(.3,{ankle:[.38,.9]}),t+33);assert.equal(m.update(hidden,t+66).phase,'pausing','unseen foot ignored');}
 {const {m,s,t}=standing();const b=s.box;m.update(person(.3,{ankle:[.35,.9]}),t+33);assert.equal(m.update(person(.3,{ankle:[b.left+.02,.9]}),t+66).phase,'pausing','feet sliding out along the floor stay under the box');}
});

test('spins off screen, waits about two seconds, then walks back in',()=>{
 let {m,s,t}=standing();const [cx,cy]=center(s.box);
 m.update(person(.3,{ankle:[s.box.right+.03,cy]}),t+=33);s=m.update(person(.3,{ankle:[cx,cy]}),t+=33);assert.equal(s.phase,'spun');
 const hit=t,spun=[];while(s.phase==='spun'){s=m.update(person(.3),t+=33);spun.push(s);}
 assert.ok(t-hit<=COACH.spinMs+100,'spin ends on time');assert.ok(spun.some(x=>Math.abs(x.rotation)>1),'it spins');
 assert.equal(s.phase,'away');assert.ok(s.box.right<=1e-9,'kicked leftward → flew off the left edge');
 const awayStart=t;while(s.phase==='away')s=m.update(person(.3,{ankle:[Math.random(),Math.random()]}),t+=33);
 assert.ok(Math.abs(t-awayStart-COACH.awayMs)<=120,'pauses for awayMs');
 assert.equal(s.phase,'walking');assert.equal(s.rotation,0,'upright again');
 while(s.phase==='walking'&&t<awayStart+20000)s=m.update(person(.3),t+=33);
 assert.equal(s.phase,'pausing');assert.ok(s.box.left>.38,'back beside the user');
});

test('keeps its last spot when the user leaves the frame',()=>{
 const {m,s,t}=standing();const lost=m.update(null,t+33);
 assert.equal(lost.phase,'pausing');assert.ok(Math.abs(lost.x-s.x)<.01&&Math.abs(lost.feetY-s.feetY)<.01);
});
