import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {WEAPON_FAMILIES, evolution, abilityFor, AbilityCooldown} from '../pod/weapon-evolution.mjs';

const context = {window: {}};
vm.runInNewContext(readFileSync(new URL('../pod/gala-weapons.js', import.meta.url), 'utf8'), context);
const catalog = context.window.GalaWeapons;
const earned = {activeDays: 365, totalXp: 36500, strength: 75};
const weapon = {type: 'rapier', tier: 4};

test('all saved families and tiers have increasing presentation profiles', () => {
  assert.deepEqual(Object.keys(WEAPON_FAMILIES), Array.from(catalog.types, type => type.id));
  const names = new Set();
  for (const {id} of catalog.types) {
    let last;
    for (let tier = 0; tier <= 20; tier++) {
      const profile = evolution({type: id, tier});
      if (last) {
        for (const field of ['width', 'length', 'reach', 'particleCount', 'finLength']) assert.ok(profile[field] > last[field], `${id} tier ${tier} ${field}`);
        assert.notEqual(profile.energy, last.energy);
      }
      const ability = profile.ability;
      if (tier < 4) assert.equal(ability, null);
      else {
        assert.equal(ability.rank, Math.floor(tier / 4));
        assert.ok(ability.cooldownMs >= ability.animationMs);
        assert.ok(ability.cooldownMs <= 40000);
        if (tier % 4 === 0) { assert.ok(!names.has(ability.name)); names.add(ability.name); }
      }
      last = profile;
    }
  }
  assert.equal(names.size, 100);
});

test('special attacks need an earned tier and a rest session', () => {
  const clock = new AbilityCooldown(null, 1000);
  assert.equal(clock.activate(weapon, {now: 1000, progress: earned, catalog}).reason, 'not-rest');
  assert.equal(clock.activate({...weapon, tier: 0}, {now: 1000, inRest: true, progress: earned, catalog}).reason, 'tier');
  const noDays = {...earned, activeDays: 0};
  assert.equal(clock.activate(weapon, {now: 1000, inRest: true, progress: noDays, catalog}).reason, 'locked');
  assert.equal(clock.activate(weapon, {now: 1000, inRest: true, progress: earned, catalog}).ok, true);
  assert.deepEqual(earned, {activeDays: 365, totalXp: 36500, strength: 75});
});

test('cooldown cannot be bypassed by switching family, tier, or rest phase', () => {
  const clock = new AbilityCooldown(null, 1000);
  const options = {now: 1000, progress: earned, catalog, inRest: true};
  const fired = clock.activate(weapon, options);
  assert.equal(fired.ok, true);
  for (const next of [weapon, {...weapon, tier: 20}, {type: 'cannon', tier: 20}]) {
    assert.equal(clock.activate(next, options).reason, 'cooldown');
  }
  assert.equal(clock.activate(weapon, {...options, inRest: false}).reason, 'not-rest');
  assert.equal(clock.activate(weapon, {...options, now: fired.readyAt - 1}).reason, 'cooldown');
  assert.equal(clock.activate(weapon, {...options, now: fired.readyAt}).ok, true);
});

test('cooldown restores across reload and never shortens on a clock rollback', () => {
  const clock = new AbilityCooldown(null, 1000);
  const fired = clock.activate(weapon, {now: 1000, progress: earned, catalog, inRest: true});
  const restored = new AbilityCooldown(clock.snapshot(), 2000);
  assert.equal(restored.remaining(3000), fired.readyAt - 3000);
  assert.equal(restored.remaining(1500), fired.readyAt - 3000);
  assert.equal(restored.remaining(fired.readyAt), 0);
  assert.throws(() => restored.remaining(NaN));
  assert.throws(() => abilityFor({type: 'unknown', tier: 20}));
  assert.throws(() => evolution({...weapon, tier: 21}));
});
