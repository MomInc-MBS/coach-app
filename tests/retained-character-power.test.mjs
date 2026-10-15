import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createRetainedPower, RETAINED_POWER_KEY } from '../arcade/power/retained-power.mjs';
import { avatarLayerOpacity, avatarPowerState, createAvatarPowerSchedule, mountAvatarPower } from '../arcade/power/avatar-power.mjs';
import { projectAvatarPowerAnchors } from '../creature/power-anchors.mjs';
import { powerProgress, retainedPowerStyle, supportContacts } from '../arcade/power/power.mjs';
import { EXERCISES } from '../exercise-library.mjs';

class MemoryStorage {
  values = new Map();
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, value); }
}
function detail(ownerId, mode, units, changes = {}) {
  const exercise = EXERCISES[mode];
  return { now: 1000 + units, workout: { ownerId, sessionId: 'session-1', mode,
    kind: exercise.kind, stage: 'working', active: true, workingReps: units,
    activeSeconds: units, validHold: true, ...changes } };
}

test('retained power is isolated by actual owner and stale account events are rejected', () => {
  const storage = new MemoryStorage(), a = createRetainedPower({ storage, ownerId: 'account:a:3' });
  assert.equal(a.observe(detail('account:a:3', 'squat', 9)), true);
  assert.equal(a.read().equipped, 'aura');
  assert.ok(storage.getItem(`${RETAINED_POWER_KEY}/account%3Aa%3A3`));

  a.setOwner('account:b:1');
  assert.deepEqual(a.read(), { version: 1, equipped: null, styles: {} });
  assert.equal(a.observe(detail('account:a:3', 'front-raise', 20)), false);
  assert.equal(a.observe(detail('account:b:1', 'front-raise', 2)), true);
  assert.equal(a.read().equipped, 'lightning');
  a.setOwner('account:a:3');
  assert.equal(a.read().styles.aura.intensity, 9 / 30);
  a.setOwner('guest:unavailable');
  assert.deepEqual(a.read(), { version: 1, equipped: null, styles: {} });
});

test('saved peaks survive reload and a weaker recent style equips its historical peak', () => {
  const storage = new MemoryStorage(), ownerId = 'guest:local-17';
  const first = createRetainedPower({ storage, ownerId });
  first.observe(detail(ownerId, 'squat', 18));
  first.observe(detail(ownerId, 'front-raise', 12, { sessionId: 'session-2' }));
  assert.equal(first.read().styles.lightning.intensity, 12 / 30);
  first.dispose();

  const next = createRetainedPower({ storage, ownerId });
  assert.equal(next.read().equipped, 'lightning');
  // New mode/session baseline can equip a route at lower current strength,
  // while the displayed record remains that style's saved historical peak.
  assert.equal(next.observe(detail(ownerId, 'front-raise', 3, { sessionId: 'session-3' })), true);
  assert.equal(next.read().equipped, 'lightning');
  assert.equal(next.read().styles.lightning.intensity, 12 / 30);
  assert.equal(next.read().styles.lightning.units, 12);
});

test('preparation, zero, duplicate and downward correction do not equip or raise a peak', () => {
  const storage = new MemoryStorage(), ownerId = 'guest:local-1', power = createRetainedPower({ storage, ownerId });
  assert.equal(power.observe(detail(ownerId, 'squat', 0)), false);
  assert.equal(power.observe(detail(ownerId, 'squat', 7, { stage: 'preparation-rest' })), false);
  assert.equal(power.observe(detail(ownerId, 'squat', 7)), true);
  assert.equal(power.observe(detail(ownerId, 'squat', 7, { now: 2 })), false);
  assert.equal(power.observe(detail(ownerId, 'squat', 3)), false);
  assert.equal(power.read().styles.aura.units, 7);
  assert.equal(power.observe(detail(ownerId, 'front-raise', 9, { paused: true })), false);
  assert.equal(power.read().equipped, 'aura');
});

test('inactive final working rep is retained and progression is capped at authoritative limits', () => {
  const ownerId = 'account:complete', power = createRetainedPower({ storage: new MemoryStorage(), ownerId });
  const finalRep = detail(ownerId, 'front-raise', 31, { active: false, workingReps: 31, sessionId: 'last' });
  assert.equal(power.observe(finalRep), true);
  assert.equal(power.read().styles.lightning.units, 30);
  assert.equal(power.read().styles.lightning.intensity, 1);
  const held = powerProgress({ kind: 'hold', activeSeconds: 5000 });
  assert.equal(held.units, 120);
  assert.equal(held.maxUnits, 120);
});

test('automatic stance/core/balance mapping retains aura or Blizzard while yoga remains Living world', () => {
  assert.equal(retainedPowerStyle('high-horse'), 'aura');
  assert.equal(retainedPowerStyle('tree'), 'blizzard');
  assert.equal(retainedPowerStyle('mountain'), null);
  const ownerId = 'guest:hold-styles', power = createRetainedPower({ storage: new MemoryStorage(), ownerId });
  assert.equal(power.observe(detail(ownerId, 'mountain', 15)), false);
  assert.equal(power.observe(detail(ownerId, 'high-horse', 15)), true);
  assert.equal(power.read().equipped, 'aura');
  const core = detail(ownerId, 'high-plank', 15, { sessionId: 'core', kind: 'hold', activeSeconds: 15, active: false });
  assert.equal(power.observe(core), true);
  assert.equal(power.read().equipped, 'blizzard');
  assert.equal(power.read().styles.blizzard.units, 1);
  const balance = detail(ownerId, 'tree', 30, { sessionId: 'balance', kind: 'hold', activeSeconds: 30 });
  assert.equal(power.observe(balance), true);
  assert.equal(power.read().equipped, 'blizzard');
  assert.equal(power.read().styles.blizzard.units, 2);
});

test('avatar states cover all four retained visuals and Blizzard stays sparse around local feet', () => {
  for (const route of ['aura', 'lightning', 'floor']) {
    const state = avatarPowerState({ equipped: route, styles: { [route]: { intensity: .5, tier: 3, units: 15, maxUnits: 30, kind: 'reps' } } }, 132, 190, 1.2, 1, true);
    assert.equal(state.route, route);
    assert.equal(state.active, true);
  }
  const state = avatarPowerState({ equipped: 'blizzard', styles: { blizzard: { intensity: .8, tier: 5, units: 50, maxUnits: 120, kind: 'hold' } } }, 132, 190, 1.2, 1, true);
  assert.equal(state.blizzard, true);
  assert.ok(state.iceEdges.length <= 20);
  assert.ok(state.snow.length <= 48);
  const still = avatarPowerState({ equipped: 'blizzard', styles: { blizzard: { intensity: .8, tier: 5, units: 50, maxUnits: 120, kind: 'hold' } } }, 132, 190, 1.2, 1, false);
  assert.notEqual(state.iceEdges[0].x1, still.iceEdges[0].x1);
});

test('retained floor effects follow projected animated soles and omit hidden or offscreen feet', () => {
  const camera = new THREE.PerspectiveCamera(42, 1.6, .1, 30);
  camera.position.set(0, 0, 7); camera.lookAt(0, 0, 0); camera.updateMatrixWorld(true);
  const root = new THREE.Group(), left = new THREE.Group(), right = new THREE.Group();
  root.add(left, right); left.position.x = -.2; right.position.x = .2; root.updateMatrixWorld(true);
  const soles = [
    { index: 27, node: left, local: new THREE.Vector3(0, -.8, 0) },
    { index: 28, node: right, local: new THREE.Vector3(0, -.8, 0) },
  ];
  const world = new THREE.Vector3(), ndc = new THREE.Vector3();
  const projected = () => projectAvatarPowerAnchors(soles, camera, root.visible, world, ndc);
  const baseline = projected();
  assert.equal(baseline.every(anchor => anchor.visible), true);
  const record = { equipped: 'floor', styles: { floor: { intensity: .8, tier: 4, units: 24, maxUnits: 30 } } };
  const baselineState = avatarPowerState(record, 325, 200, 0, 1, true, baseline);
  assert.deepEqual(baselineState.contacts.map(({index}) => index), [27, 28]);
  assert.equal(baselineState.contacts[0].x, baseline[0].x * 325);
  assert.ok(baselineState.contacts[0].x < baselineState.contacts[1].x);

  right.position.x += .7; root.rotation.y = .35; root.updateMatrixWorld(true);
  const moved = projected();
  assert.notEqual(moved[1].x, baseline[1].x);
  const movedState = avatarPowerState(record, 325, 200, 4, 1, true, moved);
  assert.equal(movedState.contacts[1].x, moved[1].x * 325);
  assert.notEqual(movedState.contacts[1].x, baselineState.contacts[1].x);

  const hidden = projectAvatarPowerAnchors(soles, camera, false, world, ndc);
  assert.deepEqual(avatarPowerState(record, 325, 200, 0, 1, true, hidden).contacts, []);
  right.position.x = 100; root.rotation.y = 0; root.updateMatrixWorld(true);
  const clipped = projected();
  assert.equal(clipped[1].visible, false);
  assert.deepEqual(avatarPowerState(record, 325, 200, 0, 1, true, clipped).contacts.map(({index}) => index), [27]);
  assert.deepEqual(avatarPowerState(record, 325, 200, 0, 1, true).contacts, []);
});

test('corrupt storage is ignored and malformed styles are bounded', () => {
  const storage = new MemoryStorage(), ownerId = 'guest:bad';
  storage.setItem(`${RETAINED_POWER_KEY}/${encodeURIComponent(ownerId)}`, '{broken');
  const power = createRetainedPower({ storage, ownerId });
  assert.deepEqual(power.read(), { version: 1, equipped: null, styles: {} });
  storage.setItem(`${RETAINED_POWER_KEY}/${encodeURIComponent(ownerId)}`, JSON.stringify({ version: 1, equipped: 'aura', styles: {
    aura: { intensity: 999, tier: 900, units: 99999, maxUnits: 90000, kind: 'reps', updatedAt: -4 },
    lightning: { intensity: 1, tier: 3, units: 5, maxUnits: 20, kind: 'nonsense', updatedAt: 4 },
  } }));
  power.setOwner('guest:other'); power.setOwner(ownerId);
  assert.deepEqual(power.read().styles.aura, { intensity: 1, tier: 6, units: 30, maxUnits: 30, kind: 'reps', updatedAt: 0 });
  assert.equal(power.read().styles.lightning, undefined);
});

test('support contact helper follows exercise metadata and never fabricates hidden joints', () => {
  const pose = Array.from({ length: 33 }, () => null);
  pose[15] = { x: .4, y: .7, visibility: .9 }; pose[16] = { x: .6, y: .7, visibility: .9 };
  pose[29] = { x: .42, y: .9, visibility: .9 };
  assert.deepEqual(supportContacts('forearm-plank', pose, 360, 640).map(p => p.index), [29]);
  assert.deepEqual(supportContacts('high-plank', pose, 360, 640).map(p => p.index), [15, 16, 29]);
  assert.deepEqual(supportContacts('jogging', pose, 360, 640), []);
});

test('avatar bursts use visible time, stop cleanly when hidden, and shorten without motion', () => {
  assert.equal(avatarLayerOpacity(false), 0.55);
  assert.equal(avatarLayerOpacity(true), 0.08);
  assert.ok(1 - (1 - .3) * (1 - .3) * (1 - avatarLayerOpacity(true)) <= .55);
  const schedule = createAvatarPowerSchedule({ seed: 8 });
  const interval = schedule.remaining;
  for (let i = 0; i < 100; i++) schedule.step(.25, false);
  assert.equal(schedule.remaining, interval);
  let active = 0;
  for (let i = 0; i < 100 && !active; i++) active = schedule.step(.25, true);
  assert.equal(active, 1);
  assert.equal(schedule.active, true);
  schedule.step(.1, false);
  assert.equal(schedule.active, false);
  const afterHide = schedule.remaining;
  assert.ok(afterHide >= 12 && afterHide <= 24);

  const reduced = createAvatarPowerSchedule({ seed: 8, minInterval: 1, maxInterval: 1 });
  for (let i = 0; i < 4; i++) reduced.step(.25, true, true);
  assert.equal(reduced.active, true);
  reduced.step(.25, true, true); reduced.step(.25, true, true);
  assert.equal(reduced.active, false);
  schedule.dispose();
  reduced.dispose();
  assert.equal(schedule.step(20, true), 0);
});

test('avatar mount renders inside its card, dims during camera tracking, and never commandeers gestures', t => {
  const saved = new Map(['document','requestAnimationFrame','cancelAnimationFrame','ResizeObserver','matchMedia','getComputedStyle','myr5Creature']
    .map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  t.after(() => { for (const [key, descriptor] of saved) descriptor ? Object.defineProperty(globalThis, key, descriptor) : delete globalThis[key]; });
  let draws = 0, frameId = 0, frameQueue = new Map(), plays = 0, walks = 0;
  const context = { setTransform(){}, clearRect(){}, save(){}, restore(){}, drawImage(){ draws++; }, translate(){}, rotate(){} };
  const stage = { isConnected:true, hidden:false, parentElement:null, appendChild(node){node.parentElement=this;this.child=node;},
    getBoundingClientRect(){return {width:132,height:190};}, matches(){return false;} };
  const card = { isConnected:true, hidden:false, dataset:{coachCap:'visible'}, parentElement:null, querySelector(){return stage;} };
  const makeCanvas = () => {
    const style = { setProperty(key,value){this[key]=value;} };
    const canvas = { style, width:0,height:0,setAttribute(){},getContext(){context.canvas=canvas;return context;},remove(){this.removed=true;} };
    return canvas;
  };
  const document = { hidden:false, body:{dataset:{tracking:'true'}}, documentElement:{parentElement:null},
    createElement(){return makeCanvas();}, addEventListener(){}, removeEventListener(){} };
  class Observer { observe(){} disconnect(){} }
  Object.assign(globalThis, { document, ResizeObserver:Observer, matchMedia:()=>({matches:false}),
    getComputedStyle:()=>({display:'block',visibility:'visible',opacity:'1'}),
    requestAnimationFrame(callback){const id=++frameId;frameQueue.set(id,callback);return id;},
    cancelAnimationFrame(id){frameQueue.delete(id);},
    myr5Creature:{stats:()=>({visible:true,paused:false,gesture:'walk'}),play(){plays++;},walk(){walks++;}} });
  const retained = { read:()=>({version:1,equipped:'aura',styles:{aura:{intensity:.8,tier:5,units:24,maxUnits:30,kind:'reps',updatedAt:1}}}) };
  const mounted = mountAvatarPower({card,retained,seed:8}), canvas = stage.child;
  const runFrames = (count,start) => {
    let now=start;
    for(let i=0;i<count;i++,now+=34){const callback=[...frameQueue.values()][0];frameQueue.clear();callback?.(now);}
    return now;
  };
  let now=runFrames(800,34);
  const cameraDrew = draws>0 && canvas.style.opacity==='0.08';
  document.body.dataset.tracking='false';
  now=runFrames(800,now);
  assert.ok(cameraDrew);
  assert.ok(draws>0);
  assert.equal(canvas.style.opacity,'0.55');
  assert.equal(plays,0); assert.equal(walks,0);
  mounted.stop();
  assert.equal(canvas.removed,true);
  assert.equal(frameQueue.size,0);
});
