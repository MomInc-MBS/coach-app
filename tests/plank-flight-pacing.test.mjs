import assert from 'node:assert/strict';
import test from 'node:test';
import {createPaceSchedule,paceAt,segmentAt} from '../arcade/plank-flight/pacing.mjs';

test('10,000 seed schedules keep segment and rest ratios bounded while rotating posture goals',()=>{
  const kinds=new Set();
  for(let seed=1;seed<=10_000;seed++){
    const schedule=createPaceSchedule(seed),same=createPaceSchedule(seed);
    let previousActive=null;
    for(let pair=0;pair<4;pair++){
      const rest=segmentAt(schedule,pair*2),active=segmentAt(schedule,pair*2+1);
      assert.deepEqual(rest,segmentAt(same,pair*2),`seed ${seed} rest determinism`);
      assert.deepEqual(active,segmentAt(same,pair*2+1),`seed ${seed} active determinism`);
      for(const segment of [rest,active])assert.ok(segment.duration>=3&&segment.duration<=5,`seed ${seed}: 3–5s allocation`);
      assert.ok(rest.restShare>=.4-1e-9&&rest.restShare<=.6+1e-9,`seed ${seed}: allocated rest share`);
      assert.ok(rest.modeledRestFraction>=.4-1e-9&&rest.modeledRestFraction<=.6+1e-9,`seed ${seed}: modeled neutral-rest share`);
      assert.equal(rest.kind,'rest');assert.equal(active.kind,'active');
      kinds.add(active.activeKind);
      assert.ok(['top','middle','left','right'].includes(active.activeKind));
      assert.ok(active.transitionSeconds>=.8&&active.transitionSeconds<=1);
      assert.ok(active.duration-active.transitionSeconds>=2,'settled active target has useful hold time');
      assert.equal(active.controlTarget.steer,Math.max(-1,Math.min(1,active.target.x/.8)),'normalized steer maps to the simulation x scale');
      assert.equal(active.steer,active.controlTarget.steer,'steer alias is the control input');
      if(previousActive!==null)assert.notEqual(active.activeKind,previousActive,'no same active posture repeats consecutively');
      previousActive=active.activeKind;
      assert.deepEqual(rest.target,{x:0,y:.04});
    }
  }
  assert.deepEqual([...kinds].sort(),['left','middle','right','top']);
});

test('paceAt reports current target, transition blend, settled rest and a readable next segment',()=>{
  const schedule=createPaceSchedule(15),rest=segmentAt(schedule,0),active=segmentAt(schedule,1);
  const atStart=paceAt(schedule,0);
  assert.equal(atStart.kind,'rest');assert.equal(atStart.isRest,true);assert.equal(atStart.modeledRest,true);
  assert.deepEqual(atStart.target,{x:0,y:.04});assert.equal(atStart.next.index,1);assert.equal(atStart.nextAt,rest.end);
  const transition=paceAt(schedule,active.start);
  assert.equal(transition.kind,'active');assert.equal(transition.transitioning,true);assert.equal(transition.modeledRest,false);
  assert.deepEqual(transition.target,active.fromTarget);
  const halfway=paceAt(schedule,active.start+active.transitionSeconds/2);
  assert.equal(halfway.transitioning,true);
  assert.ok(Math.abs(halfway.target.x-(active.fromTarget.x+active.target.x)/2)<1e-12);
  assert.ok(Math.abs(halfway.target.y-(active.fromTarget.y+active.target.y)/2)<1e-12);
  const settled=paceAt(schedule,active.start+active.transitionSeconds);
  assert.equal(settled.transitioning,false);assert.deepEqual(settled.target,active.target);
  assert.equal(settled.steer,settled.target.x/.8,'control steer inverts the simulation x mapping');
  const nextRest=segmentAt(schedule,2),restTransition=paceAt(schedule,nextRest.start);
  assert.equal(restTransition.isRest,true);assert.equal(restTransition.modeledRest,false);
  assert.ok(restTransition.modeledRestSeconds>=2.1);
  assert.equal(restTransition.next.activeKind,segmentAt(schedule,3).activeKind);
});

test('schedule indexing is stateless across access order and invalid requests fail clearly',()=>{
  const schedule=createPaceSchedule(0),far=segmentAt(schedule,401),near=segmentAt(schedule,1);
  assert.deepEqual(far,segmentAt(createPaceSchedule(1),401));
  assert.deepEqual(near,segmentAt(createPaceSchedule(1),1));
  assert.throws(()=>segmentAt(schedule,-1),RangeError);
  assert.throws(()=>paceAt(schedule,NaN),RangeError);
  assert.throws(()=>paceAt(schedule,-.1),RangeError);
});
