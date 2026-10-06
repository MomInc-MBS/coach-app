// R21 L4 Pond grimoire: the pure logic (koi steering, the idle show's clock, anchor lilies on every template vertex).
import test from 'node:test';
import assert from 'node:assert/strict';
import {POND,anchorLilies,templateVertices,freePads,idlePhase,bigFishPose,steer,stepFish,stepPads,makeFish,makeTrail,fishTouch,fishRelease,trailPush,trailAt,makeWaves,disturb,stepWaves,rng,pond} from '../modules/portal/portal-board-pond.mjs';
import {fromFrame} from '../modules/portal/portal-shapes.mjs';

const A=POND.aspect;
test('all lily pads move aside at the fingertip and shape anchors return after release',()=>{
 const pad=(x,anchor)=>({x,y:.8,hx:x,hy:.8,vx:0,vy:0,seed:0,rot:0,anchor,hidden:false});
 const pads=[pad(.5,true),pad(.53,false),pad(.95,true),{...pad(.52,true),hidden:true}];
 const state={K:POND,A,pads,pointers:new Map([[1,{x:.5,y:.8}]]),waves:makeWaves(32,56),slope:[0,0]};
 for(let i=0;i<90;i++)stepPads(state,1/60,i/60);
 assert.ok(pads[0].x>.57,'anchor directly under the finger moves aside');
 assert.ok(pads[1].x>.57,'free pad moves aside');
 assert.equal(pads[2].x,.95,'distant anchor stays on its shape');
 assert.equal(pads[3].x,.52,'cut pad stays hidden');
 state.pointers.clear();
 for(let i=0;i<600;i++)stepPads(state,1/60,2+i/60);
 assert.ok(Math.abs(pads[0].x-pads[0].hx)<.001,'shape anchor settles home');
 assert.ok(pads.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)));
});
test('an anchor lily sits on every vertex, base, apex and line end of every template',()=>{
 const anchors=anchorLilies();
 for(const [tx,ty] of templateVertices()){
  const [u,v]=fromFrame(tx,ty,POND.frame),x=u,y=v*A,d=Math.min(...anchors.map(p=>Math.hypot(p.x-x,p.y-y)));
  assert.ok(d<POND.anchorMerge,`template point ${tx},${ty} has a lily (${d.toFixed(3)})`);
 }
 // no two anchors on top of each other, and the lines are lined with them (no gap wider than ~2 spacings)
 for(const a of anchors)for(const b of anchors)if(a!==b)assert.ok(Math.hypot(a.x-b.x,a.y-b.y)>=POND.anchorMerge-1e-9);
 const [ax,ay]=fromFrame(0,0,POND.frame),[bx,by]=fromFrame(1,0,POND.frame); // rect top side
 for(let k=0;k<=20;k++){const x=ax+(bx-ax)*k/20,y=ay*A,d=Math.min(...anchors.map(p=>Math.hypot(p.x-x,p.y-y)));assert.ok(d<POND.anchorSpacing,'rect top edge is lined');}
 assert.ok(anchors.length>=40&&anchors.length<=140,`anchor count ${anchors.length}`);
 const free=freePads(anchors);assert.ok(free.length>=POND.freePads*.6,'free pads fit between the anchors');
});

test('steering arrives at the point and only nearby koi turn toward the finger',()=>{
 const f={x:.2,y:.2,vx:0,vy:0};let d=1;
 for(let i=0;i<600;i++)d=steer(f,.7,1.1,.2,.7,.14,1/60);
 assert.ok(d<.02,'arrived: '+d);
 const S={fish:makeFish(3,A,rng(1)),A,rand:rng(2),touch:null,lastTouch:0,trail:makeTrail(),members:0,phase:'wander'};
 const finger={x:.5,y:.9};fishTouch(S,finger.x,finger.y,0);
 S.fish[0].x=.53;S.fish[0].y=.9;
 S.fish[1].x=.59;S.fish[1].y=.9;
 S.fish[2].x=.1;S.fish[2].y=.1;
 for(let i=0;i<120;i++)stepFish(S,1/60,i*16,POND);
 assert.equal(S.phase,'touch');
 for(const f of S.fish.slice(0,2)){
  const d=Math.hypot(f.x-finger.x,f.y-finger.y);assert.ok(d<.2,'gathered under the finger: '+d.toFixed(3));
  const toward=Math.atan2(finger.y-f.y,finger.x-f.x);let da=Math.abs(f.a-toward)%(2*Math.PI);da=Math.min(da,2*Math.PI-da);
  if(d>.02)assert.ok(da<.6,'face first: '+da.toFixed(2));
 }
 assert.ok(S.members>0&&S.members<=2,'only the nearby fish joined');
 assert.equal(S.fish[2].member,-1,'distant fish keeps wandering');
 assert.ok(Math.hypot(S.fish[2].x-finger.x,S.fish[2].y-finger.y)>.3,'distant fish was not pulled in');
});

test('drawing keeps only close trail followers; release fans them out quickly',()=>{
 const S={fish:makeFish(3,A,rng(3)),A,rand:rng(4),touch:null,lastTouch:0,trail:makeTrail(),members:0,phase:'wander'};
 S.fish[0].x=.5;S.fish[0].y=.8;S.fish[1].x=.75;S.fish[1].y=.8;S.fish[2].x=.1;S.fish[2].y=.1;
 let t=0;fishTouch(S,.5,.8,t);stepFish(S,1/60,t,POND);
 assert.equal(S.members,1,'only the fish under the finger joined');
 for(let i=0;i<90;i++){t+=16;fishTouch(S,.5+i*.001,.8,t);stepFish(S,1/60,t,POND);}
 assert.equal(S.fish[2].member,-1,'distant fish ignores the stroke');
 fishTouch(S,.92,1.25,t+=16);stepFish(S,1/60,t,POND);
 assert.equal(S.fish[0].member,-1,'a fish left far behind drops from the trail');
 const T=makeTrail();trailPush(T,0,0);trailPush(T,.1,0);trailPush(T,.2,0);const o={x:0,y:0};trailAt(T,.15,o);
 assert.ok(Math.abs(o.x-.05)<1e-6&&o.y===0,'trailAt walks back along the trail');
 const close=S.fish[0];close.x=.90;close.y=1.25;close.vx=0;close.vy=0;
 fishRelease(S,t);assert.equal(S.touch,null);assert.ok(S.fish.every(f=>f.member===-1));
 assert.equal(S.fish[2].release,false,'a distant koi is not swept into the release motion');
 for(let i=1;i<=35;i++)stepFish(S,1/60,t+i*16,POND);
 assert.equal(S.phase,'release');
 assert.ok(Math.hypot(close.x-.92,close.y-1.25)>.08,'released fish swims away within half a second');
 stepFish(S,1/60,t+POND.releaseMs+1,POND);assert.equal(S.phase,'wander','the 15-second idle clock continues');
});

test('8 s total wait: the fish scatter off the pond, then the huge koi crosses, then they come back',()=>{
 assert.equal(POND.idleMs+POND.scatterMs,8000);assert.equal(idlePhase(0).phase,'wander');assert.equal(idlePhase(POND.idleMs-1).phase,'wander');
 assert.equal(idlePhase(POND.idleMs).phase,'scatter');assert.equal(idlePhase(POND.idleMs+POND.scatterMs).phase,'big');
 const P=POND.idleMs+POND.scatterMs+POND.bigMs;assert.deepEqual(idlePhase(P+5),{phase:'wander',t:5,cycle:1});
 const S={fish:makeFish(10,A,rng(5)),A,rand:rng(6),touch:null,lastTouch:0,trail:makeTrail(),members:0,phase:'wander'};
 for(let now=0;now<POND.idleMs+POND.scatterMs+2000;now+=16)stepFish(S,.016,now,POND);
 assert.equal(S.phase,'big');
  for(const f of S.fish)assert.ok(f.x<-.03||f.x>1.03||f.y<-.03||f.y>A+.03,`fish off the pond: ${f.x.toFixed(2)},${f.y.toFixed(2)}`);
  const distanceFromPond=()=>S.fish.reduce((sum,f)=>sum+Math.hypot(f.x-.5,f.y-A/2),0)/S.fish.length;
  const scatteredDistance=distanceFromPond();
 const a=bigFishPose(9,0),b=bigFishPose(9,1),off=p=>p.x<-.3||p.x>1.3||p.y<-.3||p.y>A+.3;
 assert.ok(off(a)&&off(b),'the huge koi starts and ends off the pond');
 assert.notDeepEqual(bigFishPose(1,0),bigFishPose(2,0),'a new direction each show');
  for(let now=P;now<P+POND.idleMs;now+=16)stepFish(S,.016,now,POND);
  assert.equal(S.phase,'wander');
  assert.ok(distanceFromPond()<scatteredDistance,'the fish swim back toward the pond before the next show');
});

test('ripples spread and die away; the board is registered as a procedural grimoire',()=>{
 const W=makeWaves(32,56);disturb(W,.5,.5,1);let e=1;for(let i=0;i<20;i++)e=stepWaves(W,POND.wave.damping);
 assert.ok(e>0,'ripple travels');for(let i=0;i<4000;i++)e=stepWaves(W,POND.wave.damping);assert.ok(e<1e-3,'and dies');
 assert.equal(pond.id,'pond');assert.equal(typeof pond.build,'function');assert.equal(pond.asset,undefined);
 for(const k of ['init','step','press','move','release','cut','heal','dispose','setTint'])assert.equal(typeof pond[k],'function',k);
});
