import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {drawAnimatedWeapon} from '../pod/weapon-animator.mjs';

const sandbox = {window: {}};
vm.runInNewContext(readFileSync(new URL('../pod/gala-weapons.js', import.meta.url), 'utf8'), sandbox);
const weapons = sandbox.window.GalaWeapons;

function context() {
  let depth = 0, operations = 0;
  const ctx = {globalAlpha: 1, imageSmoothingEnabled: false,
    save() { depth++; }, restore() { depth--; assert.ok(depth >= 0); },
    finish() { assert.equal(depth, 0); return operations; },
  };
  for (const name of ['translate','scale','rotate','fillRect','beginPath','moveTo','lineTo','closePath','fill','stroke','ellipse']) {
    ctx[name] = (...args) => {
      operations++;
      for(const value of args) if(typeof value === 'number') assert.ok(Number.isFinite(value), `${name} received a non-finite coordinate`);
    };
  }
  return ctx;
}

test('every weapon and tier draws idle, attack, special, and reduced motion with balanced canvas state', () => {
  for (const {id} of weapons.types) {
    for (let tier = 0; tier <= 20; tier++) {
      const value = {type: id, tier};
      for (const action of [null, {startedAt: 0, special: false}, {startedAt: 0, special: true}]) {
        const ctx = context();
        drawAnimatedWeapon(ctx, value, {weapons, now: 400, action});
        assert.ok(ctx.finish() > 20, `${id} tier ${tier} rendered no body`);
      }
      const ctx = context();
      drawAnimatedWeapon(ctx, value, {weapons, now: 400, action: {startedAt: 0, special: true}, reducedMotion: true});
      ctx.finish();
    }
  }
});

test('expired and future actions do not keep an effect active', () => {
  for (const startedAt of [-10000, 10000]) {
    const ctx = context();
    const result = drawAnimatedWeapon(ctx, {type: 'cannon', tier: 20}, {weapons, now: 5000, action: {startedAt, special: true}});
    assert.equal(result.active, false);
    ctx.finish();
  }
});
