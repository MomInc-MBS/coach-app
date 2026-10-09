import test from 'node:test';
import assert from 'node:assert/strict';
import { createCharacterPhysics } from '../character-phone-physics.mjs';

const make = (options = {}) => createCharacterPhysics({ width: 390, height: 844, bodyWidth: 80, bodyHeight: 150, ...options });
const finite = state => Object.values(state).every(value => typeof value !== 'number' || Number.isFinite(value));

test('standing feet keep their rest anchor through hidden and visible layout sizing',()=>{
 const p=make({contain:true});
 p.setRestCenter(160,20);p.resize(320,136,120,240);
 assert.equal(p.state.y,0);
 p.setRestCenter(160,80);p.resize(320,136,48,50);
 assert.equal(p.state.y,0);assert.equal(p.state.x,0);
});

test('boarding is enabled only when the adapter has a loaded ship',()=>{
 const unavailable=make({ship:true});unavailable.setShipAvailable(false);
 unavailable.sample({gx:1,gy:0,angularSpeed:3},0);for(const dt of [1.06,2,3,2,3])unavailable.step(dt);
 assert.equal(unavailable.state.phase,'gone');
 const available=make({ship:false});available.setShipAvailable(true);
 available.sample({gx:1,gy:0,angularSpeed:3},0);for(const dt of [1.06,2,3,2,3])available.step(dt);
 assert.equal(available.state.phase,'ship');
});
test('the same fast righting sample cannot interrupt a cautious upright recovery',()=>{
 const p=make();p.sample({gx:1,gy:0,angularSpeed:3},0);p.step(1.5);
 p.sample({gx:0,gy:1,angularSpeed:3},2);assert.equal(p.state.phase,'recover');
 p.sample({gx:0,gy:1,angularSpeed:3},2);assert.equal(p.state.phase,'recover');
 p.step(3.1);assert.equal(p.state.phase,'idle');
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

test('quick movement inside the safe tilt range leaves the character planted', () => {
  const physics = make();
  physics.sample({ gx: 0, gy: 1, angularSpeed: 2.2 }, 0);
  physics.step(1.06);
  assert.equal(physics.state.phase, 'idle');
  physics.step(0.3);
  assert.equal(physics.state.phase, 'idle');
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
  assert.equal(physics.state.x, before.x);
  assert.equal(physics.state.y, 0, 'the return starts on the platform');
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
  assert.equal(physics.state.x, exit.x);
  assert.equal(physics.state.y, 0);
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

test('22.5 degrees either side is a neutral range, including quick rotation noise',()=>{
 const p=make();
 for(const degrees of [-22.5,-15,0,15,22.5]){const a=degrees*Math.PI/180;p.sample({gx:Math.sin(a),gy:Math.cos(a),angularSpeed:8,shake:20},degrees+30);p.step(.2);assert.equal(p.state.phase,'idle');assert.equal(p.state.x,0);assert.equal(p.state.y,0);}
 const a=23*Math.PI/180;p.sample({gx:Math.sin(a),gy:Math.cos(a),angularSpeed:0});p.step(4);assert.equal(p.state.phase,'slide');assert.ok(Math.abs(p.state.x)<=390*.15);p.sample({gx:1,gy:0,angularSpeed:0});p.step(.9);assert.equal(p.state.phase,'fall');
});

test('pixel mode never climbs and its rotated body bounces inside the visible window',()=>{
 const p=make({width:390,height:300,bodyWidth:80,bodyHeight:150,contain:true,buffer:0,climb:false});p.setRestCenter(195,190);
 p.sample({gx:1,gy:0,angularSpeed:3,shake:40});
 for(let n=0;n<1200;n++){p.step(1/60);assert.ok(['air-run','look-down','fall','bounce'].includes(p.state.phase));assert.ok(p.state.x>=-120-1e-6&&p.state.x<=120+1e-6);assert.ok(p.state.y>=-150-1e-6&&p.state.y<=70+1e-6);}
 p.sample({gx:0,gy:1});assert.equal(p.state.phase,'recover');
 for(let n=0;n<190;n++){p.step(1/60);assert.equal(p.state.y,0);assert.equal(p.state.angle,0);}assert.equal(p.state.phase,'idle');
});

test('a deliberate upright shake settles onto the platform and walks home',()=>{
 const p=make({contain:true,buffer:0,climb:false,tiltExit:true});p.sample({gx:0,gy:1,angularSpeed:5,shake:40});
 for(let n=0;n<900;n++){p.step(1/60);assert.ok(Math.abs(p.state.x)<=155+1e-6);assert.ok(Math.abs(p.state.y)<=347+1e-6);}
 assert.equal(p.state.phase,'idle');assert.equal(p.state.x,0);assert.equal(p.state.y,0);
});

test('orientation-driven max-zoom falls pass fully beyond the projected viewport before held tilt climbs',()=>{
 const assertExitsRight=(p)=>{
  const c=Math.abs(Math.cos(p.state.angle)),s=Math.abs(Math.sin(p.state.angle));
  const halfWidth=(2200*c+3000*s)/2;
  const centerX=184+p.state.x;
  assert.ok(centerX-halfWidth>320,`whole body should leave right edge: ${centerX-halfWidth} > 320`);
 };
 for(const angularSpeed of [3,.5]){
  const p=make({width:320,height:480,bodyWidth:2200,bodyHeight:3000,contain:true,buffer:0,tiltExit:true});p.setRestCenter(184,230);
  p.sample({gx:1,gy:0,angularSpeed},0);
  if(angularSpeed<2){assert.equal(p.state.phase,'slide');p.step(.8);}
  else p.step(1.06);
  assert.equal(p.state.phase,'fall');
  p.step(1.16);
  assert.equal(p.state.phase,'fall');
  assertExitsRight(p);
  p.step(.84);assert.equal(p.state.phase,'climb');
 }
});


test('tilts short of sideways only lean and slide, even when turned quickly',()=>{
 for(const degrees of [-88,-60,30,60,88]){const p=make({contain:true,climb:false});const a=degrees*Math.PI/180;p.sample({gx:Math.sin(a),gy:Math.cos(a),angularSpeed:10,shake:20});p.step(5);assert.equal(p.state.phase,'slide');assert.ok(Math.abs(p.state.angle)<=.35+1e-9);assert.ok(Math.abs(p.state.x)<=390*.15);p.sample({gx:0,gy:1});assert.equal(p.state.phase,'recover');assert.equal(p.state.y,0);}
});
