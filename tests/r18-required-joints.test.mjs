import test from 'node:test';
import assert from 'node:assert/strict';
import { RULES } from '../movement-rules.mjs';
import { EXERCISES } from '../exercise-library.mjs';

// Joint category lists (by exercise ID from exercise-library.mjs)
const UPPER_BODY = ['pushup', 'high-incline-pushup', 'low-incline-pushup', 'wide-pushup', 'slow-pushup', 'diamond-pushup', 'decline-pushup', 'knee-pushup', 'front-raise', 'lateral-raise', 'overhead-reach', 'standing-press', 'slow-press'];
const LOWER_BODY = ['shallow-squat', 'squat', 'wide-squat', 'pause-squat', 'slow-squat', 'split-left', 'split-right', 'small-hinge', 'hip-hinge', 'good-morning', 'glute-bridge', 'pause-bridge'];
const CORE = ['knee-plank', 'high-plank', 'forearm-plank', 'side-knee-left', 'side-knee-right', 'side-plank-left', 'side-plank-right'];

test('RULES object is populated', () => {
  assert.ok(Object.keys(RULES).length > 0, 'RULES should contain exercise definitions');
});

test('upper-body exercises never require knees or ankles', () => {
  for (const id of UPPER_BODY) {
    const detector = EXERCISES[id]?.detector;
    if (!detector) continue;
    const rule = RULES[id] || RULES[detector];
    if (!rule || !rule.need) continue;
    const needs = rule.need.split(' ');
    assert.ok(!needs.includes('k'), `${id} should not require knee (k), got need:'${rule.need}'`);
    // ankles (a, 27/28) are never abbreviated in need fields
  }
});

test('lower-body exercises never require wrists or elbows', () => {
  for (const id of LOWER_BODY) {
    const detector = EXERCISES[id]?.detector;
    if (!detector) continue;
    const rule = RULES[id] || RULES[detector];
    if (!rule || !rule.need) continue;
    const needs = rule.need.split(' ');
    assert.ok(!needs.includes('w'), `${id} should not require wrist (w), got need:'${rule.need}'`);
    assert.ok(!needs.includes('e'), `${id} should not require elbow (e), got need:'${rule.need}'`);
  }
});

test('core/plank exercises require s,e,h,k but not wrist', () => {
  // Map core exercises to their detector rules
  const coreRules = {
    'knee-plank': 'plank',
    'high-plank': 'plank',
    'forearm-plank': 'plank',
    'side-knee-left': 'sideplank',
    'side-knee-right': 'sideplank',
    'side-plank-left': 'sideplank',
    'side-plank-right': 'sideplank',
  };

  for (const [id, detector] of Object.entries(coreRules)) {
    const rule = RULES[detector];
    if (!rule || !rule.need) continue;
    const needs = rule.need.split(' ');
    assert.ok(!needs.includes('w'), `${id} (${detector}) should not require wrist, got need:'${rule.need}'`);
    assert.ok(needs.includes('s') || needs.includes('e') || needs.includes('h') || needs.includes('k'),
      `${id} (${detector}) must require at least one core joint, got need:'${rule.need}'`);
  }
});

test('plank requires exactly s,e,h,k (no wrist)', () => {
  const rule = RULES['plank'];
  assert.ok(rule, 'plank rule must exist');
  assert.equal(rule.need, 's e h k', `plank need should be 's e h k', got '${rule.need}'`);
});

test('sideplank requires exactly s,e,h,k (no wrist)', () => {
  const rule = RULES['sideplank'];
  assert.ok(rule, 'sideplank rule must exist');
  assert.equal(rule.need, 's e h k', `sideplank need should be 's e h k', got '${rule.need}'`);
});
