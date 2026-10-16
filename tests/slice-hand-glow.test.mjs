import test from 'node:test';
import assert from 'node:assert/strict';
import {createHandGlow,renderHandGlow,gateStep,ribbonHalfWidth,ribbonAlpha,buildRibbon,ribbonSamples,createImpactDetector,elbowAngle,TRAIL_TUNING as T} from '../arcade/slice/hand-glow.mjs';

// Body: shoulders y .35, hips y .65 (torso .3 => body height ~1.0 screen heights at aspect 1).
function poseAt(x,{y=.5,visibility=.9}={}){
 const points=Array.from({length:33},()=>({x:.5,y:.5,visibility:.9}));
 points[11]={x:.6,y:.35,visibility:.9};points[12]={x:.4,y:.35,visibility:.9};points[23]={x:.58,y:.65,visibility:.9};points[24]={x:.42,y:.65,visibility:.9};
 points[13]={x:.65,y:.45,visibility:.9};points[14]={x:.35,y:.45,visibility:.9};
 for(const i of [15,16])points[i]={x,y,visibility};
 return points;
}
const opts=(now,extra={})=>({now,aspect:1,...extra});
function ctxStub(){const calls=[];let op='source-over';return {calls,save(){},restore(){},beginPath(){},moveTo(){},lineTo(){},closePath(){},arc(){},stroke(){calls.push(['stroke',op]);},fill(){calls.push(['fill',op]);},fillRect(){calls.push(['glow',op]);},translate(){},rotate(){},drawImage(){calls.push(['image',op]);},
 set globalCompositeOperation(v){op=v;},get globalCompositeOperation(){return op;},globalAlpha:1,fillStyle:'',strokeStyle:'',lineWidth:1,lineCap:'butt'};}
// World landmarks: arm along z. ext 0 = guard (elbow bent 90), 1 = straight punch.
function world(ext){const w=Array.from({length:33},()=>({x:0,y:0,z:0}));
 for(const [s,e,wr,sx] of [[11,13,15,.18],[12,14,16,-.18]]){w[s]={x:sx,y:-.45,z:0};const bend=(1-ext)*Math.PI/2;
  w[e]={x:sx,y:-.45+.28*Math.sin(bend),z:-.28*Math.cos(bend)};
  w[wr]={x:sx,y:w[e].y,z:w[e].z-.27};}
 return w;}

test('speed gate has hysteresis: starts above 1.2, keeps going until below 0.7 body-heights/s',()=>{
 assert.equal(gateStep(false,1.1),false);assert.equal(gateStep(false,1.25),true);
 assert.equal(gateStep(true,.9),true,'mid speed keeps an active trail');assert.equal(gateStep(true,.65),false);
 assert.equal(gateStep(false,.9),false,'mid speed does not start a trail');
});

test('ribbon tapers by age and widens with speed; alpha needs speed and emission',()=>{
 assert.ok(ribbonHalfWidth(0,1,500)>ribbonHalfWidth(.5,1,500));assert.ok(ribbonHalfWidth(.5,1,500)>ribbonHalfWidth(.95,1,500));
 assert.equal(ribbonHalfWidth(1,1,500),0);assert.ok(ribbonHalfWidth(0,1,500)>ribbonHalfWidth(0,.1,500));
 assert.ok(ribbonHalfWidth(0,1,500,true)>ribbonHalfWidth(0,1,500),'head is wider');
 assert.ok(ribbonHalfWidth(0,1,800)>ribbonHalfWidth(0,1,400),'width scales with body size');
 assert.equal(ribbonAlpha(.2,.05,1),0,'slow motion has no ribbon alpha');assert.equal(ribbonAlpha(.2,1,0),0);assert.ok(ribbonAlpha(0,1,1)>ribbonAlpha(.6,1,1));
});

test('fast punch builds a Catmull-Rom ribbon that ends at the predicted head; widths taper toward the tail',()=>{
 const fx=createHandGlow();
 for(let i=0,t=0;i<8;i++,t+=33){fx.pose(poseAt(.3+i*.06),opts(t));fx.step(.033,t);}
 const hand=fx.state.hands[0];assert.ok(hand.gate,'fast motion opens the gate');assert.ok(hand.count>=6);
 fx.step(.016,231+16);assert.ok(hand.hx>hand.x,'prediction pushes the head ahead of the filtered wrist');
 assert.ok((hand.hx-hand.x)<=T.PREDICT_MAX*fx.state.bodyH+1e-6,'prediction lead is capped');
 const m=buildRibbon(hand,247,400,400,fx.state.bodyH*400);
 assert.equal(m,(hand.count)*T.SUBDIV+1,'SUBDIV samples per segment plus the head');
 const {SX,HW,SA}=ribbonSamples;assert.ok(Math.abs(SX[m-1]-hand.hx*400)<1e-3,'ribbon reaches the live head');
 assert.ok(HW[m-1]>HW[Math.floor(m/2)]&&HW[Math.floor(m/2)]>HW[1],'width grows from tail to head');assert.ok(SA[0]>SA[m-1]);
 for(let i=1;i<m;i++)assert.ok(SX[i]>=SX[i-1]-1e-3,'monotone input stays monotone (no Catmull-Rom loops)');
 const ctx=ctxStub();renderHandGlow(ctx,fx.state,{w:400,h:400,now:247});
 assert.ok(ctx.calls.filter(c=>c[0]==='fill').length>m,'three layered ribbon passes');assert.ok(ctx.calls.every(c=>c[1]==='lighter'),'all trail drawing is additive');
});

test('slow arm move: no gate, no ribbon fill, no impact',()=>{
 const hits=[];const fx=createHandGlow({onImpact:d=>hits.push(d)});
 for(let i=0,t=0;i<30;i++,t+=33){fx.pose(poseAt(.3+i*.004),opts(t,{world:world(i/30)}));fx.step(.033,t);}
 assert.equal(fx.state.hands[0].gate,false);assert.equal(hits.length,0);
 const ctx=ctxStub();renderHandGlow(ctx,fx.state,{w:400,h:400,now:990});assert.equal(ctx.calls.filter(c=>c[0]==='fill').length,0);
 assert.ok(ctx.calls.some(c=>c[0]==='glow'||c[0]==='image'),'wrist keeps its soft glow');
});

test('impact detector: straight-arm deceleration fires once, bent arm needs a hard stop, cooldown and slow moves stay quiet',()=>{
 const d=createImpactDetector();
 assert.equal(d.update(.8,170,0),0);assert.equal(d.update(2.4,120,33),0);assert.equal(d.update(3,160,66),0,'peak');
 assert.ok(d.update(1.5,170,99)>=3,'jab/cross: speed < 0.6 peak with a straight elbow');assert.equal(d.update(.4,170,132),0,'once per punch');
 const hook=createImpactDetector();hook.update(3,90,0);assert.equal(hook.update(1.6,90,33),0,'bent elbow, soft drop: not yet');assert.ok(hook.update(1,90,66)>0,'hook: hard stop fires');
 const late=createImpactDetector();late.update(3,170,0);assert.equal(late.update(1,170,200),0,'drop after the window is not an impact');
 const cool=createImpactDetector();cool.update(3,170,0);assert.ok(cool.update(1,170,33));cool.update(3,170,100);assert.equal(cool.update(1,170,133),0,'cooldown');assert.ok(cool.update(3,170,400)===0&&cool.update(1,170,433)>0);
 const slow=createImpactDetector();for(let t=0;t<1000;t+=33)assert.equal(slow.update(.6+.3*Math.sin(t/100),175,t),0);
 assert.ok(Math.abs(elbowAngle({x:0,y:0,z:0},{x:0,y:0,z:-1},{x:0,y:0,z:-2})-180)<1e-6);assert.ok(Math.abs(elbowAngle({x:0,y:0},{x:0,y:1},{x:1,y:1})-90)<1e-6);
});

test('stubbed jab emits one impact at the wrist with direction-led sparks',()=>{
 const hits=[];const fx=createHandGlow({onImpact:d=>hits.push(d),random:()=>.5});
 const xs=[.30,.30,.36,.46,.56,.60,.605,.605,.605],ext=[0,0,.3,.7,1,1,1,1,1];let t=0;
 for(let i=0;i<xs.length;i++,t+=33){fx.pose(poseAt(xs[i]),opts(t,{world:world(ext[i])}));fx.step(.033,t);}
 assert.equal(hits.length,2,'one impact per wrist (both wrists punched in the stub)');
 const left=hits.find(h=>h.hand==='left');assert.ok(left.x>.55&&left.x<.62&&Math.abs(left.y-.5)<.02);assert.ok(left.strength>0&&left.strength<=1);
 const sparks=fx.state.sparks;let live=0;for(let i=0;i<sparks.length;i+=6)if(sparks[i+4]>0){live++;}
 assert.ok(live>=16&&live<=28,'8-14 sparks per impact');
 const ctx=ctxStub();renderHandGlow(ctx,fx.state,{w:400,h:400,now:t});assert.ok(ctx.calls.some(c=>c[0]==='stroke'),'ring and sparks draw');
});

test('confidence loss and stale pose fade the hand out instead of deleting it; clear() resets',()=>{
 const fx=createHandGlow();fx.pose(poseAt(.3),opts(0));fx.step(.05,10);fx.step(.05,60);fx.step(.05,110);fx.step(.05,160);fx.step(.05,210);
 const hand=fx.state.hands[0];assert.equal(hand.alpha,1);
 fx.pose(poseAt(.3,{visibility:.5}),opts(233));assert.equal(hand.visible,true,'visibility .5 is inside the hysteresis band');
 fx.pose(poseAt(.3,{visibility:.3}),opts(266));assert.equal(hand.visible,false);fx.step(.05,300);assert.ok(hand.alpha>0&&hand.alpha<1,'fading, not gone');
 for(let t=316;t<600;t+=16)fx.step(.016,t);assert.equal(hand.alpha,0);
 fx.pose(poseAt(.4),opts(700));fx.step(.05,750);assert.equal(hand.visible,true);fx.step(.05,1200);assert.equal(hand.visible,false,'stale after 400 ms');
 fx.clear();assert.equal(hand.count,0);assert.equal(hand.alpha,0);
});

test('slow tracker cadence draws nothing; render cost steps quality down then recovers',()=>{
 const fx=createHandGlow();for(const now of [0,300,600]){fx.pose(poseAt(.3+now/3000),opts(now));fx.step(.05,now);}
 assert.ok(fx.state.poseHz<4);const ctx=ctxStub();renderHandGlow(ctx,fx.state,{w:400,h:400,now:600});assert.equal(ctx.calls.filter(c=>c[1]==='lighter'&&c[0]!=='stroke').length,0);
 const q=createHandGlow();for(let i=0;i<8;i++)q.measure(3.5,i*33);assert.equal(q.state.tier,2,'8 slow frames drop one layer');
 for(let i=0;i<24;i++)q.measure(3.5,300+i*33);assert.equal(q.state.tier,0);assert.equal(q.state.enabled,false);
 for(let i=0;i<120;i++)q.measure(.8,2000+i*34);assert.ok(q.state.tier>=2&&q.state.enabled);
});

test('aura level picks the palette',()=>{const fx=createHandGlow();fx.setLevel(3);assert.equal(fx.state.level,3);fx.setLevel(9);assert.equal(fx.state.level,3);fx.setLevel('x');assert.equal(fx.state.level,0);});
