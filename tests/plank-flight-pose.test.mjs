import test from 'node:test';
import assert from 'node:assert/strict';
import {createPlankInput, PLANK_TUNING, freshnessMs} from '../arcade/plank-flight/pose-input.mjs';
import {applyFlightEvidence} from '../arcade/plank-flight/movement.mjs';

// Synthetic geometry tests exercise the contract, not measured phone accuracy.
function frame({y=.38, lean=0, world=true, posture='plank', mirrored=true, now=0, ...rest}={}) {
  const p = Array.from({length:33},()=>({x:.5,y:.5,visibility:.99}));
  const w = Array.from({length:33},()=>({x:0,y:0,z:0}));
  for (const [s,e,hand,hip,knee,sign] of [[11,13,15,23,25,1],[12,14,16,24,26,-1]]) {
    p[s]={x:.5+sign*.12+lean,y,visibility:.99};
    p[e]={x:.5+sign*.17+lean*.4,y:(y+.78)/2,visibility:.99};
    p[hand]={x:.5+sign*.18,y:.78,visibility:.99};
    p[hip]={x:.5+sign*.07+lean*.3,y:y-.10,visibility:.99};
    p[knee]={x:.5+sign*.035,y:y-.18,visibility:.99};
    w[s]={x:sign*.2,y:-.3,z:-.5}; w[e]={x:sign*.24,y:-.15,z:-.52}; w[hand]={x:sign*.27,y:0,z:-.55};
    w[hip]={x:sign*.16,y:-.3,z:0}; w[knee]={x:sign*.13,y:-.3,z:.45};
    if(posture==='standing') {
      p[hip].y=y+.2;p[knee].y=y+.4;
      w[s]={x:sign*.2,y:-.55,z:0};w[hip]={x:sign*.16,y:0,z:0};w[knee]={x:sign*.13,y:.45,z:0};
    }
    if(posture==='tabletop') {
      p[hip].y=y-.02;p[knee].y=y+.2;
      w[knee]={x:sign*.13,y:.12,z:.03};
    }
  }
  return {points:p,world:world?w:null,width:640,height:640,now,mirrored,...rest};
}
const stages = {
  high:{y:.38},low:{y:.60},left:{y:.38,lean:.065},right:{y:.38,lean:-.065},
  mid:{y:.49},'mixed-left':{y:.49,lean:.055},'mixed-right':{y:.49,lean:-.055},bottom:{y:.78},
};
function driver(options={}) {
  const input=createPlankInput(options);let now=0;
  return {input, tick(spec={},gap=100) {now+=gap;return input.update(frame({...spec,now}));},
    time(){return now;},calibrate(overrides={}) {
      for(const [name, pose] of Object.entries(stages)) {
        assert.equal(input.stage,name);
        for(let i=0;i<8;i++) this.tick({...pose,...overrides});
      }
      assert.equal(input.calibrated,true);
    }, settle(spec={},count=7) {let out;for(let i=0;i<count;i++)out=this.tick(spec);return out;},
  };
}

test('automatic guided stages complete without touch and do not award calibration time',()=>{
  const d=driver();
  for(const [name,pose]of Object.entries(stages)) {
    assert.equal(d.input.stage,name);
    for(let i=0;i<8;i++) {
      const out=d.tick(pose);assert.equal(out.controlValid,false);assert.equal(out.exerciseEligible,false);
      assert.equal(out.supportHint,'unknown');assert.ok(out.prompt.length>10);
    }
  }
  const out=d.settle();assert.equal(out.stage,'ready');assert.equal(out.controlValid,true);assert.equal(out.exerciseEligible,true);
  assert.ok(out.height01>.99);assert.equal(out.steer,0);assert.equal(out.calibrationProgress,1);
});

test('unchanged high pose cannot silently calibrate low or sides',()=>{
  const d=driver();d.settle({},10);assert.equal(d.input.stage,'low');
  for(let i=0;i<30;i++)assert.equal(d.tick().exerciseEligible,false);
  assert.equal(d.input.stage,'low');assert.equal(d.input.calibrated,false);
});

test('pure lateral lean preserves height; pure depth preserves steering',()=>{
  const d=driver();d.calibrate();
  const left=d.settle({lean:.065});assert.ok(left.steer<-.98);assert.ok(left.height01>.99);assert.equal(left.leanSide,'left');
  const right=d.settle({lean:-.065});assert.ok(right.steer>.98);assert.ok(right.height01>.99);assert.equal(right.leanSide,'right');
  const low=d.settle({y:.60});assert.ok(Math.abs(low.height01-(.78-.60)/(.78-.49)*.5)<.01);assert.ok(Math.abs(low.steer)<.01);
  const mid=d.settle({y:.49});assert.ok(Math.abs(mid.height01-.5)<.01);assert.ok(Math.abs(mid.steer)<.01);
});

test('preview reflection never changes raw-landmark steering direction',()=>{
  const a=driver(),b=driver();a.calibrate({mirrored:true});b.calibrate({mirrored:false});
  assert.equal(a.settle({lean:.065,mirrored:true}).steer,b.settle({lean:.065,mirrored:false}).steer);
  assert.equal(a.tick({lean:.065,mirrored:false}).calibrated,true);
});

test('aspect-corrected geometry supports portrait coordinates',()=>{
  const d=driver();d.calibrate({width:480,height:640});
  const out=d.settle({lean:.065,width:480,height:640});assert.ok(out.steer<-.98);assert.ok(out.height01>.99);
});

test('null, missing, low-visibility and out-of-frame joints do not reuse last control',()=>{
  for(const mode of ['null','missing','low','outside','nan','unknown-confidence']) {
    const d=driver();d.calibrate();d.settle({lean:.065});
    const f=frame({now:d.time()+100});
    if(mode==='null')f.points=null;
    else if(mode==='missing')f.points[15]=null;
    else if(mode==='low')f.points[15].visibility=.2;
    else if(mode==='outside')f.points[15].x=1.1;
    else if(mode==='nan')f.points[15].y=NaN;
    else delete f.points[15].visibility;
    const out=d.input.update(f);assert.equal(out.controlValid,false,mode);assert.equal(out.exerciseEligible,false,mode);
    assert.equal(out.steer,0);assert.equal(out.supportHint,'unknown');
  }
});

test('upper-body-only flight is uncredited rehearsal',()=>{
  const d=driver();d.calibrate();d.settle();
  const f=frame({now:d.time()+100});for(const i of [23,24,25,26])f.points[i].visibility=.2;
  const out=d.input.update(f);assert.equal(out.controlValid,true);assert.equal(out.exerciseEligible,false);
  assert.match(out.reason,/rehearsal/i);
});

test('plausible frontal plank has conservative eligibility with world or projected evidence',()=>{
  for(const world of [true,false]) {
    const d=driver();d.calibrate({world});const out=d.settle({world});
    assert.equal(out.exerciseEligible,true,`world=${world}`);assert.equal(out.supportHint,'unknown');
  }
});

test('standing and tabletop poses never receive exercise credit despite valid upper control',()=>{
  for(const posture of ['standing','tabletop'])for(const world of [true,false]) {
    const d=driver();d.calibrate();const out=d.settle({posture,world});
    assert.equal(out.controlValid,true);assert.equal(out.exerciseEligible,false,`${posture},world=${world}`);
  }
});

test('contradictory world geometry does not fall back to a flattering 2D silhouette',()=>{
  const d=driver();d.calibrate();d.settle();const f=frame({now:d.time()+100});
  const standing=frame({posture:'standing'});f.world=standing.world;
  assert.equal(d.input.update(f).exerciseEligible,false);
});

test('posture eligibility needs fresh dwell and immediately drops on occlusion',()=>{
  const d=driver();d.calibrate();assert.equal(d.tick().exerciseEligible,false);
  assert.equal(d.settle().exerciseEligible,true);
  let f=frame({now:d.time()+100});f.points[25].visibility=.1;assert.equal(d.input.update(f).exerciseEligible,false);
  f=frame({now:d.time()+200});assert.equal(d.input.update(f).exerciseEligible,false);
});

test('duplicate frames reject controls and reverse timestamps reset calibration',()=>{
  const d=driver();d.calibrate();d.settle();
  assert.equal(d.input.update(frame({now:d.time()})).controlValid,false);
  const old=d.input.update(frame({now:d.time()-10}));assert.equal(old.controlValid,false);assert.equal(old.calibrated,false);
  assert.equal(d.input.stage,'high');
  assert.equal(d.input.update(frame({now:d.time()-1})).controlValid,false);
});

test('gaps clear temporal state, long gaps require recalibration',()=>{
  const d=driver();d.calibrate();d.settle({lean:.065});
  const gap=d.tick({},PLANK_TUNING.maxGapMs+1);assert.equal(gap.controlValid,false);assert.equal(gap.calibrated,true);
  const resumed=d.tick();assert.equal(resumed.controlValid,true);assert.equal(resumed.steer,0);assert.equal(resumed.exerciseEligible,false);
  const stale=d.tick({},PLANK_TUNING.resetGapMs+1);assert.equal(stale.controlValid,false);assert.equal(stale.stage,'high');
});

test('camera generation and dimensions reset calibration; reset erases old range',()=>{
  for(const change of [{cameraGeneration:2},{width:640,height:480}]) {
    const d=driver();d.calibrate();d.settle();const out=d.tick(change);assert.equal(out.calibrated,false);assert.equal(out.stage,'high');
  }
  const d=driver();d.calibrate();d.input.reset();assert.equal(d.input.calibrated,false);assert.equal(d.input.stage,'high');
  assert.equal(d.tick().controlValid,false);
});

test('hands/camera shifting invalidates the previously learned range',()=>{
  const d=driver();d.calibrate();d.settle();const f=frame({now:d.time()+100});
  for(const i of [15,16])f.points[i].x+=.07;
  const out=d.input.update(f);assert.equal(out.calibrated,false);assert.equal(out.controlValid,false);assert.match(out.reason,/recalibrate/i);
});

test('noisy high samples cannot complete calibration',()=>{
  const d=driver();for(let i=0;i<40;i++)d.tick({y:.38+(i%2?.02:-.02)});
  assert.equal(d.input.stage,'high');assert.equal(d.input.calibrated,false);
});

test('wrong-side calibration and coupled low position are rejected',()=>{
  const d=driver();d.settle({},8);d.settle({y:.60,lean:.1},12);assert.equal(d.input.stage,'low');
  d.settle({y:.60},8);assert.equal(d.input.stage,'left');d.settle({lean:-.065},12);assert.equal(d.input.stage,'left');
});

test('uncalibrated deep/extreme lean is rejected rather than extrapolated',()=>{
  const d=driver();d.calibrate();const out=d.tick({y:.60,lean:.065});
  assert.equal(out.controlValid,false);assert.equal(out.exerciseEligible,false);assert.match(out.reason,/middle/i);
});

test('moderate calibrated cross-axis drift is separated by the joint mapping',()=>{
  const d=driver();
  const coupled={high:{y:.38,lean:0},low:{y:.60,lean:.018},left:{y:.37,lean:.065},right:{y:.39,lean:-.065},
    mid:{y:.49,lean:.009},'mixed-left':{y:.48154,lean:.064},'mixed-right':{y:.49846,lean:-.046},bottom:{y:.78,lean:.009}};
  for(const [name,spec] of Object.entries(coupled)){assert.equal(d.input.stage,name);d.settle(spec,8);}
  assert.equal(d.input.calibrated,true);
  const low=d.settle(coupled.bottom);assert.ok(low.height01<.01);assert.ok(Math.abs(low.steer)<.01);
  const left=d.settle(coupled.left);assert.ok(left.height01>.99);assert.ok(left.steer<-.98);
});

test('mixed-height checks do not accept lateral lean that also drops a height band',()=>{
  const d=driver();for(const name of ['high','low','left','right','mid'])d.settle(stages[name],8);
  assert.equal(d.input.stage,'mixed-left');d.settle({y:.53,lean:.055},12);
  assert.equal(d.input.stage,'mixed-left');assert.equal(d.input.calibrated,false);
});

test('nonfinite clocks and dimensions cannot produce valid controls',()=>{
  const d=driver();d.calibrate();
  assert.equal(d.input.update(frame({now:NaN})).controlValid,false);
  assert.equal(d.input.update(frame({now:d.time()+100,width:0})).controlValid,false);
});

test('CPU cadence with jitter can calibrate and sustain valid controls without synthetic catch-up',()=>{
  assert.equal(PLANK_TUNING.maxGapMs,PLANK_TUNING.freshnessMs);
  assert.equal(freshnessMs,PLANK_TUNING.freshnessMs);
  const d=driver(),cadence=[267,410,220,310,365];let n=0;
  for(const[name,spec]of Object.entries(stages)){
    assert.equal(d.input.stage,name);
    for(let i=0;i<20&&d.input.stage===name;i++)d.tick(spec,cadence[n++%cadence.length]);
    assert.notEqual(d.input.stage,name,`${name} must finish at observed host cadence`);
  }
  for(let i=0;i<20;i++)assert.equal(d.tick({},cadence[n++%cadence.length]).controlValid,true);
  const invalid=d.input.update({...frame({now:d.time()+100}),points:null});
  assert.equal(invalid.controlValid,false,'explicit invalid pose does not wait for freshness timeout');
  const gap=d.tick({},PLANK_TUNING.maxGapMs+101);assert.equal(gap.controlValid,false);
  assert.equal(d.tick().exerciseEligible,false,'no eligibility dwell is carried across a stale gap');
});

test('calibration retains enough samples at the slowest accepted cadence',()=>{
  const d=driver(),cadence=PLANK_TUNING.maxGapMs-10;
  for(const[name,spec]of Object.entries(stages)){
    assert.equal(d.input.stage,name);
    for(let i=0;i<PLANK_TUNING.minSamples+2&&d.input.stage===name;i++)d.tick(spec,cadence);
    assert.notEqual(d.input.stage,name);
  }
  assert.equal(d.input.calibrated,true);
  assert.equal(d.tick({},cadence).controlValid,true);
});

test('full bottom at the hand line maps low and never credits lying down despite flattering world evidence',()=>{
 const d=driver();d.calibrate();d.settle();
 const s={started:null,hold:0,totalHold:0,active:0,bestHold:0};
 for(let i=0;i<8;i++){const p=d.tick();applyFlightEvidence(s,p,p.timestamp,{allowed:true});}
 assert.ok(s.totalHold>0);const earned=s.totalHold;
 for(let i=0;i<60;i++){
  const p=d.tick(stages.bottom);assert.equal(p.controlValid,true);assert.equal(p.resting,true);assert.equal(p.posture,'rest');
  assert.equal(p.exerciseEligible,false);assert.equal(p.supportHint,'unknown');
  applyFlightEvidence(s,p,p.timestamp,{allowed:true});assert.equal(s.totalHold,earned);assert.equal(s.hold,0);
 }
 assert.ok(s.flightPose.height01<.001);assert.match(s.message,/resting.*paused/i);
 const back=d.tick(stages.mid);assert.equal(back.resting,false);assert.equal(back.exerciseEligible,false);
 applyFlightEvidence(s,back,back.timestamp,{allowed:true});assert.equal(s.totalHold,earned);
 for(let i=0;i<8;i++){const p=d.tick(stages.mid);applyFlightEvidence(s,p,p.timestamp,{allowed:true});}
 assert.ok(s.totalHold>earned);assert.ok(s.totalHold-earned<.8,'rest time is never caught up');
});

test('rest uses hysteresis on raw geometry, not a lagging filtered flight height',()=>{
 const d=driver();d.calibrate();d.settle();
 const atFraction=f=>({y:stages.bottom.y-(stages.bottom.y-stages.mid.y)*f});
 let p=d.tick(atFraction(.16));assert.equal(p.resting,true);assert.equal(p.exerciseEligible,false);
 for(const f of [.19,.24,.28,.18,.27,.20]){
  p=d.tick(atFraction(f));assert.equal(p.controlValid,true);assert.equal(p.resting,true);assert.equal(p.exerciseEligible,false);
 }
 p=d.tick(atFraction(.32));assert.equal(p.resting,false);assert.equal(p.exerciseEligible,false,'fresh posture dwell required after rest');
 p=d.tick(atFraction(.23));assert.equal(p.resting,false,'entry uses the smaller threshold');
 p=d.tick(atFraction(.16));assert.equal(p.resting,true);assert.equal(p.exerciseEligible,false);
});

test('bottom can equal prior low and still preserves actual held-out middle and high anchors',()=>{
 const d=driver();
 for(const [name,spec]of Object.entries(stages))d.settle(name==='bottom'?stages.low:spec,8);
 assert.equal(d.input.calibrated,true);
 const bottom=d.settle(stages.low);assert.ok(bottom.height01<.01);assert.equal(bottom.resting,true);
 const middle=d.settle(stages.mid);assert.ok(Math.abs(middle.height01-.5)<.01);assert.equal(middle.exerciseEligible,true);
 assert.ok(d.settle(stages.high).height01>.99);
});

test('bottom must be distinct from middle and stable before calibration completes',()=>{
 const d=driver();for(const[name,spec]of Object.entries(stages))if(name!=='bottom')d.settle(spec,8);
 assert.equal(d.input.stage,'bottom');d.settle(stages.mid,20);assert.equal(d.input.calibrated,false);
 for(let i=0;i<30;i++)d.tick({y:.77+(i%2?.02:-.02)});
 assert.equal(d.input.stage,'bottom');assert.equal(d.input.calibrated,false);
 d.settle(stages.bottom,10);assert.equal(d.input.calibrated,true);
});

test('visible upper-body bottom is valid rest with occluded lower joints but never rescues active credit',()=>{
 const d=driver();d.calibrate();
 let now=d.time();
 for(const spec of [stages.bottom,stages.high])for(let i=0;i<8;i++){
  const f=frame({...spec,now:now+=100});for(const id of [23,24,25,26])f.points[id].visibility=.1;
  const p=d.input.update(f);assert.equal(p.controlValid,true);assert.equal(p.exerciseEligible,false);
  assert.equal(p.resting,spec===stages.bottom);
 }
});

test('rest does not reuse occluded upper joints and recovery does not grant fitness credit',()=>{
 for(const joint of [11,12,13,14,15,16]){
  const d=driver();d.calibrate();d.settle(stages.bottom);
  const f=frame({...stages.bottom,now:d.time()+100});f.points[joint].visibility=.1;
  const p=d.input.update(f);assert.equal(p.controlValid,false);assert.equal(p.exerciseEligible,false);assert.equal(p.posture,'unknown');
  const recovered=d.input.update(frame({...stages.bottom,now:d.time()+200}));
  assert.equal(recovered.controlValid,true);assert.equal(recovered.resting,true);assert.equal(recovered.exerciseEligible,false);
 }
});

test('a resting baseline materially below its learned anchor invalidates calibration',()=>{
 const d=driver();d.calibrate();d.settle(stages.bottom);
 const shifted=d.tick({y:.815});assert.equal(shifted.calibrated,false);assert.equal(shifted.controlValid,false);
 assert.equal(shifted.exerciseEligible,false);assert.match(shifted.reason,/baseline.*recalibrate/i);assert.equal(d.input.stage,'high');
});

test('movement evidence independently rejects contradictory resting credit flags',()=>{
 for(const restingFields of [{resting:true},{posture:'rest'}]){
  const s={started:null,hold:0,totalHold:0,active:0,bestHold:0};
  const active={controlValid:true,calibrated:true,exerciseEligible:true};
  applyFlightEvidence(s,active,0,{allowed:true});applyFlightEvidence(s,active,100,{allowed:true});
  applyFlightEvidence(s,{...active,...restingFields},200,{allowed:true});
  applyFlightEvidence(s,{...active,...restingFields},300,{allowed:true});
  assert.equal(s.totalHold,.1);assert.equal(s.active,.1);assert.equal(s.hold,0);assert.equal(s.flightEligible,false);
 }
});

test('paced rest-to-lean and lean-to-rest diagonals stay inside the measured joint envelope',()=>{
 // The browser fixture inverts the new piecewise height map and absolute steer
 // map. This path formerly stopped around height .3, freezing the pace target.
 const fromTarget=({x,y})=>({y:y>=.5?.49-(y-.5)*.22:.78-y*.58,lean:-x/.8*.065});
 for(const x of [-.55,.55]){
  const d=driver();d.calibrate();d.settle(stages.bottom);
  const s={started:null,hold:0,totalHold:0,active:0,bestHold:0};
  for(const backwards of [false,true]){
   for(let i=0;i<=30;i++){
    const f=backwards?1-i/30:i/30,target={x:x*f,y:.04+(.6-.04)*f};
    const p=d.tick(fromTarget(target),50);
    assert.equal(p.controlValid,true,`x=${x},return=${backwards},fraction=${f}: ${p.reason}`);
    applyFlightEvidence(s,p,p.timestamp,{allowed:true});
   }
   if(!backwards)for(let i=0;i<10;i++){
    const p=d.tick(fromTarget({x,y:.6}));assert.equal(p.controlValid,true);applyFlightEvidence(s,p,p.timestamp,{allowed:true});
   }
  }
  assert.ok(s.totalHold>.5,'the valid active portion can earn hold credit');
  assert.equal(s.flightPose.resting,true);assert.equal(s.flightPose.exerciseEligible,false);
 }
});

test('the joint envelope keeps bottom extreme leans invalid and uses each measured side separately',()=>{
 const d=driver();
 for(const[name,spec]of Object.entries(stages))d.settle(name==='mixed-left'?{...spec,lean:.04}:spec,8);
 const allowed=d.settle({y:.49,lean:.04});assert.equal(allowed.controlValid,true);
 const tooFar=d.tick({y:.49,lean:.06});assert.equal(tooFar.controlValid,false);assert.match(tooFar.reason,/middle/);
 const right=d.settle({y:.49,lean:-.055});assert.equal(right.controlValid,true);
 const deep=d.tick({y:.78,lean:-.065});assert.equal(deep.controlValid,false);assert.equal(deep.exerciseEligible,false);
});

test('interpolating observed bottom, mixed and high-side poses stays valid in both directions',()=>{
 for(const sign of [-1,1]){
  const d=driver();d.calibrate();
  const knots=[{y:.78,lean:0},{y:.49,lean:.055*sign},{y:.38,lean:.065*sign},
   {y:.49,lean:.055*sign},{y:.78,lean:0}];
  for(let segment=1;segment<knots.length;segment++)for(let i=0;i<=20;i++){
   const a=knots[segment-1],b=knots[segment],f=i/20;
   const p=d.tick({y:a.y+(b.y-a.y)*f,lean:a.lean+(b.lean-a.lean)*f},50);
   assert.equal(p.controlValid,true,`side=${sign},segment=${segment},fraction=${f}: ${p.reason}`);
  }
 }
});

test('explicit portal shake-out preserves anchors but returns no controls or exercise credit',()=>{
 const d=driver();d.calibrate();d.settle(stages.mid);
 let now=d.time();
 for(let i=0;i<80;i++){
  const p=d.input.update({now:now+=100,width:640,height:640,portalRest:true});
  assert.equal(p.calibrated,true);assert.equal(p.controlValid,false);assert.equal(p.exerciseEligible,false);
 }
 const back=d.input.update(frame({...stages.mid,now:now+=100}));
 assert.equal(back.calibrated,true);assert.equal(back.controlValid,true);assert.equal(back.exerciseEligible,false,'fresh posture dwell required');
 const moved=frame({...stages.mid,now:now+=100});for(const i of [15,16])moved.points[i].x+=.1;
 assert.equal(d.input.update(moved).calibrated,false,'return still validates original hand baseline');
});
