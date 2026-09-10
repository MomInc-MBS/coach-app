import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {WEAPON_FAMILIES, evolution, abilityFor, AbilityCooldown} from '../pod/weapon-evolution.mjs';
import {SetFlow} from '../pod/set-flow.mjs';

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

test('special damage keeps the workout level gate and never awards XP',()=>{
  for(const sets of [0,192,196,220]){
    const flow=new SetFlow({version:1,completedSets:sets},{now:0});
    const options={now:1000,progress:earned,catalog};
    assert.equal(flow.special(weapon,options).reason,'not-rest');
    flow.previewRest(0);
    const hit=flow.special(weapon,options);
    assert.equal(hit.ok,true);
    assert.equal(hit.damage,flow.attackDamage*hit.ability.damageMultiplier);
    assert.equal(hit.blocked,sets<196);
    assert.equal(flow.xp,sets*25);
    assert.equal(flow.progress.completedSets,sets);
    assert.equal(flow.special(weapon,options).reason,'cooldown');
    flow.leave();flow.previewRest(2000);
    assert.equal(flow.special(weapon,{...options,now:2000}).reason,'cooldown');
    assert.equal(flow.tap(2200,true).hits,1,'special does not consume the hand combo');
  }
});

test('serialized cooldown and another tab retain the longest active timer',()=>{
  const first=new AbilityCooldown(null,0),second=new AbilityCooldown(null,0);
  first.activate({type:'cannon',tier:20},{now:1000,progress:earned,catalog,inRest:true});
  const saved=JSON.stringify(first.snapshot());
  second.merge(saved,2000);
  assert.equal(second.readyAt,first.readyAt);
  second.merge('{"version":1,"readyAt":0}',2500);
  assert.equal(second.readyAt,first.readyAt);
  const flow=new SetFlow(null,{cooldown:saved,now:3000});flow.previewRest(3000);
  assert.equal(flow.special(weapon,{now:3000,progress:earned,catalog}).reason,'cooldown');
});
