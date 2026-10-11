import test from 'node:test';
import assert from 'node:assert/strict';
import { auroraTargets } from '../shader-aurora.mjs';

const room = auroraTargets.find(target => target.selector.includes('meditation-far'));
const portrait = auroraTargets.find(target => target.selector.includes('.portrait'));

function meditationHost({ open = true, art = false, wonder = '', hidden = false, paused = false, transitioning = false, connected = true } = {}) {
  const classes = new Set([...(art ? ['has-wonder-art'] : []), ...(paused ? ['breathing-paused'] : []), ...(transitioning ? ['snorting'] : [])]);
  const dialog = { open, dataset: { wonder }, classList: { contains: name => classes.has(name) } };
  return {
    isConnected: connected,
    closest: selector => selector === '.meditation-panel' ? dialog : selector === '[data-meditation-scene]' ? { hidden } : null,
  };
}

test('Aurora supplies bounded sky light across the released waterfall scene', () => {
  assert.equal(room.active(meditationHost()), true);
  assert.equal(room.active(meditationHost({ art: true, wonder: 'northern-lights' })), true);
  assert.equal(room.active(meditationHost({ art: true, wonder: 'mount-fuji-a' })), true);
  assert.equal(room.active(meditationHost({ art: true, wonder: '' })), true);
});

test('Aurora is inactive after close, pause, removal or Tub Flight handoff', () => {
  for (const state of [{ open: false }, { hidden: true }, { paused: true }, { transitioning: true }, { connected: false }]) {
    assert.equal(room.active(meditationHost(state)), false);
  }
  assert.equal(room.active(null), false);
});

test('Gala targets the avatar portrait and leaves hidden or unrelated portraits alone', () => {
  const host = { isConnected: true, querySelector: () => ({}), closest: () => null };
  assert.equal(portrait.active(host), true);
  assert.equal(portrait.active({ ...host, querySelector: () => null }), false);
  assert.equal(portrait.active({ ...host, closest: () => ({ hidden: true }) }), false);
  assert.equal(portrait.active({ ...host, isConnected: false }), false);
  assert.equal(portrait.active(null), false);
});

test('recipes stay bounded, decorative and use supported low-detail Aurora props', () => {
  for (const target of auroraTargets) {
    assert.equal(target.name, 'aurora');
    assert.equal(target.priority, 10);
    assert.ok(target.opacity > 0 && target.opacity <= .35);
    assert.equal(target.style.pointerEvents, 'none');
    assert.equal(target.style.position, 'absolute');
    assert.ok(parseFloat(target.style.height) <= 78);
    const components = target.components(meditationHost());
    assert.equal(components.length, 1);
    assert.equal(components[0].type, 'Aurora');
    const props = components[0].props;
    assert.equal(props.curtainCount, 2);
    assert.ok(props.speed > 0 && props.speed <= 1.2);
    assert.ok(props.intensity >= 0 && props.intensity <= 100);
    assert.ok(props.height >= 10 && props.height <= 200);
    assert.ok(props.rayDensity >= 0 && props.rayDensity <= 100);
    assert.ok(props.center.x >= 0 && props.center.x <= 1);
    assert.ok(props.center.y >= 0 && props.center.y <= 1);
    // Consumers may change their copy without changing subsequent mounts.
    props.center.x = 0;
    assert.equal(target.components()[0].props.center.x, .5);
  }
});
