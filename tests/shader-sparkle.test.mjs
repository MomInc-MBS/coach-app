import test from 'node:test';
import assert from 'node:assert/strict';
import {sparkleTargets} from '../shader-sparkle.mjs';

const bySelector = selector => sparkleTargets.find(target => target.selector === selector);
const unlocked = {querySelectorAll: () => [{textContent: 'Acid Forge unlocked!'}]};
const complete = {querySelectorAll: () => [{textContent: 'Collection complete'}]};

test('Sparkle has actual bright child artwork, bounded cost and disposable decorations', () => {
  for (const target of sparkleTargets) {
    const tree = target.components({closest: () => null});
    assert.equal(tree.length, 1);
    assert.equal(tree[0].type, 'Sparkle');
    assert.equal(tree[0].props.expand, 0, 'expansion adds 32 child samples');
    assert.ok(tree[0].props.size >= 10 && tree[0].props.size <= 200);
    assert.ok(tree[0].props.intensity > 0 && tree[0].props.intensity < 10);
    assert.ok(tree[0].props.threshold >= 0 && tree[0].props.threshold <= 1);
    assert.ok(tree[0].props.speed > 0 && tree[0].props.speed <= 5);
    assert.equal(tree[0].children[0].type, 'Star', 'empty Sparkle has no pixels to filter');
    assert.match(tree[0].children[0].props.color, /^#[0-9a-f]{6}$/i);
    assert.ok(tree[0].children[0].props.radius > 0 && tree[0].children[0].props.radius <= 1);
    assert.ok(tree[0].children[0].props.sides >= 3 && tree[0].children[0].props.sides <= 12);
    assert.ok(tree[0].children[0].props.innerRatio >= .1 && tree[0].children[0].props.innerRatio <= .9);
    assert.equal(target.style.pointerEvents, 'none');
    assert.equal(target.durationMs, 2200);
    assert.ok(parseInt(target.style.width) <= 80 && parseInt(target.style.height) <= 80);
    assert.equal(target.name, 'sparkle');
  }
});

test('drop reveal activates only for a saved unlock in the open reveal phase', () => {
  const target = bySelector('.drop-pod[data-phase="reveal"] .drop-pod-card');
  const dialog = {open: true, dataset: {phase: 'reveal', tier: 'secret'}};
  const host = {...unlocked, closest: () => dialog};
  assert.equal(target.active(host), true);
  assert.equal(target.components(host)[0].children[0].props.color, '#b388ff');
  dialog.dataset.phase = 'landed';
  assert.equal(target.active(host), false, 'unopened and failed-save phases do not celebrate');
  dialog.dataset.phase = 'reveal';
  dialog.open = false;
  assert.equal(target.active(host), false);
  dialog.open = true;
  assert.equal(target.active({...host, ...complete}), false, 'exhausted collection is not a new reward');
});

test('plain reward card requires a real result and yields while the drop pod is open', () => {
  const target = bySelector('.reward-pack-dialog.opened .reward-pack-card');
  const dialog = {open: true, dataset: {tier: 'legendary'}};
  let result = unlocked, pod = null;
  const host = {closest: () => dialog, querySelector: () => result,
    ownerDocument: {querySelector: () => pod}};
  assert.equal(target.active(host), true);
  assert.equal(target.components(host)[0].children[0].props.color, '#ff9c36');
  pod = {};
  assert.equal(target.active(host), false, 'do not duplicate the foreground pod celebration');
  pod = null;
  result = complete;
  assert.equal(target.active(host), false);
  result = unlocked;
  dialog.open = false;
  assert.equal(target.active(host), false);
  assert.ok(!/tile/.test(target.selector), 'mount outside the existing canvas');
});

test('creature and DJ targets require their real content; restored LCD nodes are excluded', () => {
  const creature = bySelector('.creature-skin-reward'), dj = bySelector('.dj .logobar');
  assert.equal(creature.active({querySelector: selector => selector === 'li' ? {} : null}), true);
  assert.equal(creature.active({querySelector: () => null}), false);
  assert.equal(dj.active({querySelector: selector => selector === 'img' ? {} : null}), true);
  assert.equal(dj.active({querySelector: () => null}), false);
  assert.ok(sparkleTargets.every(target => !target.selector.includes('lcd-card')));
});
