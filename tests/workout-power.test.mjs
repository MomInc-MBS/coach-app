import test from 'node:test';
import assert from 'node:assert/strict';
import { createPower, powerRoute, retainedPowerStyle, supportContacts, POWER_STALE_MS } from '../arcade/power/power.mjs';
import { EXERCISES } from '../exercise-library.mjs';
import { REP_CAP, HOLD_BLOCK_SECONDS, HOLD_CAP_SECONDS, repRate } from '../progression-rules.mjs';

function points() {
  const p = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, visibility: 0.95 }));
  for (const [i, x, y] of [[11,.4,.25],[12,.6,.25],[13,.34,.37],[14,.66,.37],[15,.29,.49],[16,.71,.49],
    [23,.43,.53],[24,.57,.53],[25,.42,.67],[26,.58,.67],[27,.41,.86],[28,.59,.86],
    [29,.4,.88],[30,.6,.88],[31,.39,.89],[32,.61,.89]]) p[i] = { x, y, visibility: 0.95 };
  return p;
}
function snapshot(mode, overrides = {}) {
  return { sessionId: 's1', mode, kind: EXERCISES[mode]?.kind, stage: 'working', active: true,
    workingReps: 0, activeSeconds: 0, difficulty: 'easy', ...overrides };
}
function send(engine, mode, now, changes = {}, pose = points()) {
  return engine.pose({ points: pose, now, workout: snapshot(mode, changes) });
}

test('routes real exercise metadata to aura, lightning, floor, or no camera power', () => {
  assert.equal(powerRoute('squat'), 'aura');
  assert.equal(powerRoute('glute-bridge'), 'floor');
  assert.equal(powerRoute('pushup'), 'floor');
  assert.equal(powerRoute('high-plank'), null);
  assert.equal(powerRoute('side-plank-left'), null);
  assert.equal(powerRoute('forearm-plank'), null);
  assert.equal(powerRoute('front-raise'), 'lightning');
  assert.equal(powerRoute('standing-press'), 'lightning');
  assert.equal(powerRoute('high-horse'), 'aura');
  assert.equal(powerRoute('tree'), null);
  assert.equal(powerRoute('wall-sit'), null);
  assert.equal(powerRoute('jogging'), null);
  assert.equal(powerRoute('boxing'), null);
  assert.equal(powerRoute('not-an-exercise'), null);
  assert.equal(retainedPowerStyle('high-plank'), 'blizzard');
  assert.equal(retainedPowerStyle('tree'), 'blizzard');
  assert.equal(retainedPowerStyle('high-horse'), 'aura');
  assert.equal(retainedPowerStyle('mountain'), null);
});

test('repetition progression starts at rep 1, follows repRate bands, and caps at REP_CAP', () => {
  const pulses = [], e = createPower({ onEvent: (type, value) => { if (type === 'pulse') pulses.push(value); } });
  send(e, 'squat', 0, { workingReps: 0 });
  assert.equal(e.state.pulse, 0);
  const boundaries = [8, 12, 16, 21, 26];
  let now = 100;
  for (let rep = 1; rep <= REP_CAP; rep++, now += 100) {
    send(e, 'squat', now, { workingReps: rep });
    assert.equal(e.state.units, rep);
    assert.equal(e.state.intensity, rep / REP_CAP);
    assert.equal(e.state.tier, rep > 0 ? 1 + boundaries.filter(n => rep >= n).length : 0);
    assert.ok(repRate('easy', rep) > 0);
  }
  assert.equal(pulses.length, REP_CAP);
  assert.equal(e.state.maxUnits, REP_CAP);
  send(e, 'squat', now, { workingReps: REP_CAP + 1 });
  assert.equal(e.state.units, REP_CAP);
});

test('count corrections reduce power without a pulse; session and exercise changes reset it', () => {
  const pulses = [], e = createPower({ onEvent: (type, value) => { if (type === 'pulse') pulses.push(value); } });
  send(e, 'squat', 0, { workingReps: 0 });
  send(e, 'squat', 100, { workingReps: 10 });
  const before = pulses.length;
  send(e, 'squat', 200, { workingReps: 5 });
  assert.equal(pulses.length, before);
  assert.equal(e.state.units, 5); assert.equal(e.state.intensity, 5 / REP_CAP);
  send(e, 'front-raise', 300, { workingReps: 12 });
  assert.equal(e.state.route, 'lightning'); assert.equal(e.state.units, 12);
  send(e, 'front-raise', 400, { sessionId: 's2', workingReps: 2 });
  assert.equal(e.state.units, 2); assert.equal(e.state.intensity, 2 / REP_CAP);
  assert.equal(pulses.length, before);
});

test('preparation and recovery stages stay hidden and silent', () => {
  const pulses = [], e = createPower({ onEvent: type => { if (type === 'pulse') pulses.push(type); } });
  send(e, 'squat', 0, { stage: 'preparation-easy', workingReps: 0 });
  send(e, 'squat', 100, { stage: 'preparation-slow', workingReps: 0 });
  send(e, 'squat', 200, { stage: 'preparation-rest', active: false, workingReps: 0 });
  assert.equal(e.state.active, false); assert.equal(e.state.intensity, 0); assert.deepEqual(pulses, []);
  send(e, 'squat', 300, { stage: 'working', workingReps: 0 });
  send(e, 'squat', 400, { stage: 'working', workingReps: 1 });
  assert.equal(e.state.active, true); assert.equal(pulses.length, 1);
});

test('stance hold aura starts at one valid 15 second block and caps at 1800 seconds', () => {
  const pulses = [], e = createPower({ onEvent: (type, value) => { if (type === 'pulse') pulses.push(value); } });
  send(e, 'high-horse', 0, { kind: 'hold', activeSeconds: 14.9, validHold: true });
  assert.equal(e.state.units, 0); assert.equal(e.state.maxUnits, HOLD_CAP_SECONDS / HOLD_BLOCK_SECONDS);
  send(e, 'high-horse', 100, { kind: 'hold', activeSeconds: 15, validHold: true });
  assert.equal(e.state.units, 1); assert.equal(e.state.pulse, 1); assert.equal(pulses.length, 1);
  send(e, 'high-horse', 200, { kind: 'hold', activeSeconds: HOLD_CAP_SECONDS + 100, validHold: true });
  assert.equal(e.state.units, HOLD_CAP_SECONDS / HOLD_BLOCK_SECONDS);
  assert.equal(e.state.intensity, 1); assert.equal(e.state.maxUnits, HOLD_CAP_SECONDS / HOLD_BLOCK_SECONDS);
  const before = pulses.length;
  send(e, 'high-horse', 300, { kind: 'hold', activeSeconds: 15, validHold: true });
  assert.equal(e.state.units, 1); assert.ok(e.state.intensity < 1); assert.equal(pulses.length, before);
  send(e, 'high-horse', 400, { kind: 'hold', activeSeconds: 30, validHold: false });
  assert.equal(e.state.active, false); assert.equal(e.state.units, 2);
  send(e, 'high-horse', 500, { kind: 'hold', activeSeconds: 30, validHold: true });
  assert.equal(e.state.active, true); assert.equal(e.state.pulse, 0); assert.equal(pulses.length, before);
  const strict = createPower();
  send(strict, 'high-horse', 0, { kind: 'hold', activeSeconds: 15 });
  assert.equal(strict.state.active, false);
  send(strict, 'high-horse', 100, { kind: 'hold', activeSeconds: 30, validHold: true });
  assert.equal(strict.state.active, true); assert.equal(strict.state.pulse, 0);
  const core = createPower(); send(core, 'high-plank', 0, { kind: 'hold', activeSeconds: 15, validHold: true });
  assert.equal(core.state.route, null); assert.equal(core.state.active, false);
});

test('support contacts use only visible tracked joints, including forearm, knee, side, and bridge rules', () => {
  const e = createPower();
  send(e, 'pushup', 0, { workingReps: 1 });
  assert.deepEqual(e.state.contacts.map(c => c.index), [15, 16, 29, 30]);
  const noHands = points(); noHands[15].visibility = noHands[16].visibility = 0.1;
  send(e, 'pushup', 100, { workingReps: 2 }, noHands);
  assert.deepEqual(e.state.contacts.map(c => c.index), [29, 30]);
  const noFloor = points(); for (const i of [15,16,27,28,29,30,31,32]) noFloor[i].visibility = 0.1;
  send(e, 'pushup', 200, { workingReps: 3 }, noFloor);
  assert.deepEqual(e.state.contacts, []);
  const bent = points();
  assert.deepEqual(supportContacts('forearm-plank', bent).map(c => c.index), [13, 14, 29, 30]);
  assert.deepEqual(supportContacts('side-knee-left', bent).map(c => c.index), [13, 25]);
  send(e, 'glute-bridge', 500, { workingReps: 1 });
  assert.deepEqual(e.state.contacts.map(c => c.index), [29, 30, 11, 12]);
});

test('balance Blizzard anchors use only the lowest visible foot without inventing hidden support',()=>{
 const pose=points();pose[29].y=.9;pose[31].y=.91;pose[30].y=.6;pose[32].y=.61;
 assert.deepEqual(supportContacts('tree',pose).map(c=>c.index),[29],'a raised right foot is not ground contact');
 const mirrored=points();mirrored[29].y=.62;mirrored[31].y=.63;mirrored[30].y=.94;mirrored[32].y=.95;
 assert.deepEqual(supportContacts('knee-balance',mirrored).map(c=>c.index),[30],'either leg can be the support leg');
 const missing=points();missing[30].visibility=missing[32].visibility=.1;
 assert.deepEqual(supportContacts('tree',missing).map(c=>c.index),[29],'a missing foot does not create a second anchor');
 assert.deepEqual(supportContacts('high-horse',points()).map(c=>c.index),[29,30],'stances retain both feet');
 assert.deepEqual(supportContacts('mountain',points()).map(c=>c.index),[29,30],'yoga retains both feet');
});

test('stale poses and invalidate hide effects while preserving progress and suppressing historical pulses on resume', () => {
  const pulses = [], e = createPower({ onEvent: type => { if (type === 'pulse') pulses.push(type); } });
  send(e, 'squat', 0, { workingReps: 3 });
  assert.equal(e.state.pulse, 0); assert.equal(pulses.length, 0);
  e.step(POWER_STALE_MS / 1000 + 0.01);
  assert.equal(e.state.active, false); assert.equal(e.state.units, 3);
  send(e, 'squat', 1200, { workingReps: 4 });
  assert.equal(e.state.active, true); assert.equal(e.state.units, 4); assert.equal(e.state.pulse, 0);
  e.invalidate(); assert.equal(e.state.active, false); assert.equal(e.state.units, 4);
  send(e, 'squat', 1300, { workingReps: 5 });
  assert.equal(e.state.pulse, 0); assert.equal(pulses.length, 0);
  send(e, 'squat', 1400, { workingReps: 6 });
  assert.equal(e.state.pulse, 1); assert.equal(pulses.length, 1);
});

test('duplicate/backward timestamps do not replay progress and absent geometry produces no support', () => {
  const pulses = [], e = createPower({ onEvent: type => { if (type === 'pulse') pulses.push(type); } });
  send(e, 'pushup', 100, { workingReps: 0 });
  send(e, 'pushup', 100, { workingReps: 1 });
  send(e, 'pushup', 90, { workingReps: 1 });
  assert.equal(e.state.units, 0); assert.equal(pulses.length, 0);
  send(e, 'pushup', 200, { workingReps: 1 }, []);
  assert.equal(e.state.active, false); assert.deepEqual(e.state.contacts, []);
});

test('missing working stage or missing floor support suppresses visible pulses', () => {
  const pulses = [], e = createPower({ onEvent: type => { if (type === 'pulse') pulses.push(type); } });
  const noStage = snapshot('squat', { workingReps: 1 }); delete noStage.stage;
  e.pose({ points: points(), now: 0, workout: noStage });
  assert.equal(e.state.active, false); assert.deepEqual(pulses, []);
  const absent = points(); for (const i of [15, 16, 27, 28, 29, 30, 31, 32]) absent[i].visibility = 0.1;
  send(e, 'pushup', 100, { workingReps: 0 }, absent);
  send(e, 'pushup', 200, { workingReps: 1 }, absent);
  assert.equal(e.state.active, true); assert.deepEqual(e.state.contacts, []); assert.deepEqual(pulses, []);
});
