import test from 'node:test';
import assert from 'node:assert/strict';
import { createCharacterPhysics } from '../character-phone-physics.mjs';

const make = (options = {}) => createCharacterPhysics({ width: 390, height: 844, bodyWidth: 80, bodyHeight: 150, ...options });
const finite = state => Object.values(state).every(value => typeof value !== 'number' || Number.isFinite(value));

test('boarding is enabled only when the adapter has a loaded ship',()=>{
 const unavailable=make({ship:true});unavailable.setShipAvailable(false);
 unavailable.sample({gx:1,gy:0,angularSpeed:3},0);for(const dt of [1.06,2,3,2,3])unavailable.step(dt);
 assert.equal(unavailable.state.phase,'gone');
 const available=make({ship:false});available.setShipAvailable(true);
 available.sample({gx:1,gy:0,angularSpeed:3},0);for(const dt of [1.06,2,3,2,3])available.step(dt);
 assert.equal(available.state.phase,'ship');
});

test('starts at its centered rest pose and slowly tilts into a supported slide', () => {
  const physics = make();
  assert.deepEqual(physics.state, { x: 0, y: 0, angle: 0, phase: 'idle', pose: 'idle', active: false, shipProgress: 0 });
  physics.sample({ gx: 0.6, gy: 0.8, angularSpeed: 0.4 }, 0);
  assert.equal(physics.state.phase, 'slide');
  assert.ok(physics.state.angle > 0 && physics.state.angle < Math.PI / 2);
  physics.step(0.5);
  assert.ok(physics.state.x > 0);
  assert.ok(finite(physics.state));
});

test('fast rotation uses the existing air-run pose before look-down and fall', () => {
  const physics = make();
  physics.sample({ gx: 1, gy: 0, angularSpeed: 2.1 }, 0);
  assert.equal(physics.state.phase, 'air-run');
  assert.equal(physics.state.pose, 'wiggle');
  assert.ok(Math.abs(physics.state.angle - Math.PI / 2) < 1e-9);
  physics.step(0.59);
  assert.equal(physics.state.phase, 'air-run');
  physics.step(0.02);
  assert.equal(physics.state.phase, 'look-down');
  assert.equal(physics.state.pose, 'look-down');
  physics.step(0.46);
  assert.equal(physics.state.phase, 'fall');
  assert.equal(physics.state.pose, 'fall');
});

test('shake adds a bounded impulse and resize keeps positions finite and inside the new envelope', () => {
  const physics = make();
  physics.sample({ gx: 0, gy: 1, shake: 13 }, 0.05);
  assert.equal(physics.state.phase, 'idle', 'sub-threshold m/s² readings do not trigger a shake');
  physics.sample({ gx: 0, gy: 1, shake: 40 }, 0.1);
  assert.equal(physics.state.phase, 'fall');
  physics.step(1.5);
  assert.ok(Math.abs(physics.state.x) > 0 || Math.abs(physics.state.y) > 0);
  physics.resize(240, 420, 60, 100);
  physics.step(2);
  const b = { x: 240 / 2 + 96 + 60 / 2, y: 420 / 2 + 96 + 100 / 2 };
  assert.ok(Math.abs(physics.state.x) <= b.x);
  assert.ok(Math.abs(physics.state.y) <= b.y);
  assert.ok(finite(physics.state));
});

test('the character can move fully offscreen before reversing at the invisible wall', () => {
  const physics = make();
  physics.sample({ gx: 0, gy: 1, shake: 40 }, 0.1);
  physics.step(0.8);
  const nearWall = physics.state.x;
  assert.ok(nearWall > 390 / 2, 'the character center passes the viewport edge');
  physics.step(0.2);
  assert.ok(physics.state.x < nearWall, 'wall contact reverses horizontal travel');
  assert.ok(finite(physics.state));
});

test('a sustained sideways fall climbs, waves, climbs out, and uses the ship before disappearing', () => {
  const physics = make({ ship: true });
  physics.sample({ gx: 1, gy: 0, angularSpeed: 2.4 }, 0);
  physics.step(1.06); // air-run + look-down
  assert.equal(physics.state.phase, 'fall');
  physics.step(2);
  assert.equal(physics.state.phase, 'climb');
  physics.step(3);
  assert.equal(physics.state.phase, 'wave');
  physics.step(2);
  assert.equal(physics.state.phase, 'climb-out');
  physics.step(3);
  assert.equal(physics.state.phase, 'ship');
  physics.step(1);
  assert.ok(physics.state.shipProgress > 0 && physics.state.shipProgress < 1);
  physics.step(1.1);
  assert.equal(physics.state.phase, 'gone');
  assert.equal(physics.state.active, false);
  assert.ok(finite(physics.state));
});

test('the climb-out ends gone without a ship', () => {
  const physics = make();
  physics.sample({ gx: 1, gy: 0, angularSpeed: 2.4 }, 0);
  physics.step(1.06);
  physics.step(2);
  physics.step(3);
  physics.step(2);
  physics.step(3);
  assert.equal(physics.state.phase, 'gone');
  assert.equal(physics.state.pose, 'gone');
});

test('slow sideways tilt slides for a moment, then falls and can climb after the sustained hold', () => {
  const physics = make();
  physics.sample({ gx: 1, gy: 0, angularSpeed: 0.5 }, 0);
  assert.equal(physics.state.phase, 'slide');
  physics.step(0.8);
  assert.equal(physics.state.phase, 'fall');
  physics.step(2);
  assert.equal(physics.state.phase, 'climb');
  physics.step(3);
  assert.equal(physics.state.phase, 'wave');
});

test('fast rotation while upright still finishes its fall and enters gradual recovery', () => {
  const physics = make();
  physics.sample({ gx: 0, gy: 1, angularSpeed: 2.2 }, 0);
  physics.step(1.06);
  assert.equal(physics.state.phase, 'fall');
  physics.step(0.3);
  assert.equal(physics.state.phase, 'recover');
  const start = { x: physics.state.x, y: physics.state.y };
  physics.step(3.1);
  assert.equal(physics.state.phase, 'idle');
  assert.deepEqual(start, { x: 0, y: 0 });
});

test('restoring upright after a fall slowly walks back from the fall position', () => {
  const physics = make();
  physics.sample({ gx: 1, gy: 0, angularSpeed: 2.4 }, 0);
  physics.step(1.06);
  physics.step(0.5);
  const before = { x: physics.state.x, y: physics.state.y };
  physics.sample({ gx: 0, gy: 1, angularSpeed: 0.1 }, 1.56);
  assert.equal(physics.state.phase, 'recover');
  assert.deepEqual({ x: physics.state.x, y: physics.state.y }, before);
  physics.step(1.5);
  assert.equal(physics.state.phase, 'recover');
  assert.ok(Math.hypot(physics.state.x, physics.state.y) < Math.hypot(before.x, before.y));
  physics.step(1.6);
  assert.equal(physics.state.phase, 'idle');
  assert.deepEqual({ x: physics.state.x, y: physics.state.y }, { x: 0, y: 0 });
});

test('restoring upright after the character exits lets it walk back from the exit position', () => {
  const physics = make();
  physics.sample({ gx: 1, gy: 0, angularSpeed: 2.4 }, 0);
  for (const duration of [1.06, 2, 3, 2, 3]) physics.step(duration);
  assert.equal(physics.state.phase, 'gone');
  const exit = { x: physics.state.x, y: physics.state.y };
  physics.sample({ gx: 0, gy: 1, angularSpeed: 0 }, 11.06);
  assert.equal(physics.state.phase, 'recover');
  assert.deepEqual({ x: physics.state.x, y: physics.state.y }, exit);
  physics.step(3.1);
  assert.equal(physics.state.phase, 'idle');
});

test('reset clears movement and ship progress', () => {
  const physics = make({ ship: true });
  physics.sample({ gx: 1, gy: 0, angularSpeed: 2.4 }, 0);
  physics.step(1.06);
  physics.step(2);
  physics.step(3);
  physics.step(2);
  physics.step(3);
  physics.step(1);
  assert.equal(physics.state.phase, 'ship');
  physics.reset();
  assert.deepEqual(physics.state, { x: 0, y: 0, angle: 0, phase: 'idle', pose: 'idle', active: false, shipProgress: 0 });
});
