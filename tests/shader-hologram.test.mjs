import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, readFileSync, readdirSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {dirname, resolve} from 'node:path';
import {hologramTargets} from '../shader-hologram.mjs';

const makeHost = ({connected = true, hidden = false, dialog = null, pod = false,
  portal = false, movement = false, war = false, hand = false, canvas = false, loading = false} = {}) => ({
  isConnected: connected,
  ownerDocument: {body: {dataset: {screen: pod ? 'pod' : 'portal'}}},
  closest(selector) {
    if (selector === '[hidden], [aria-hidden="true"]') return hidden ? {} : null;
    if (selector === 'dialog') return dialog;
    if (selector === '#portalWorkoutHome') return portal ? {} : null;
    if (selector === '#hologramPanel') return movement ? {} : null;
    if (selector === '.war-room') return war ? {} : null;
    if (selector === '.design-studio') return hand ? {} : null;
    if (selector === '.hand-viewer-wrap') return {querySelector: () => loading ? {} : null};
    return null;
  },
  querySelector: () => canvas ? {} : null,
});

test('only genuine projection surfaces are targeted, using flat SDFs rather than replacement models', () => {
  assert.equal(hologramTargets.length, 4);
  assert.deepEqual(hologramTargets.map(t => t.selector), [
    'body[data-screen="pod"] > .ship-header, #portalWorkoutHome > .ship-header',
    '#hologramPanel #holoStage', '.war-room .gala-bay-stage', '.design-studio .viewport-panel .hand-canvas',
  ]);
  for (const target of hologramTargets) {
    assert.equal(target.name, 'hologram');
    assert.ok(target.opacity > 0 && target.opacity <= .3);
    const [component] = target.components(makeHost());
    assert.equal(component.type, 'Hologram');
    assert.equal(component.props.flicker, 0);
    assert.equal(component.props.distortion, 0);
    const shape = JSON.parse(component.props.shape);
    assert.ok(['roundedRectSDF', 'ellipseSDF'].includes(shape.type));
    assert.ok(shape.radius < .5 && shape.height < .15);
    assert.equal(component.props.shapeSdfUrl, undefined);
    const second = target.components(makeHost());
    assert.notEqual(second[0].props, component.props, 'each mount gets independent props');
  }
});

test('unmounted, hidden and closed-dialog surfaces are inactive', () => {
  for (const target of hologramTargets) {
    const valid = {pod: true, portal: true, movement: true, war: true, hand: true, canvas: true, dialog: {open: true}};
    assert.equal(target.active(makeHost(valid)), true);
    assert.equal(target.active(makeHost({...valid, connected: false})), false);
    assert.equal(target.active(makeHost({...valid, hidden: true})), false);
    assert.equal(target.active(makeHost({...valid, dialog: {open: false}})), false);
  }
});

test('pod, movement, War Room and supplied hand model readiness each gate their own recipe', () => {
  const [pod, movement, war, hand] = hologramTargets;
  assert.equal(pod.active(makeHost({pod: true})), true);
  assert.equal(pod.active(makeHost({portal: true})), true);
  assert.equal(pod.active(makeHost()), false);
  assert.equal(movement.active(makeHost({movement: true, dialog: {open: true}})), true);
  assert.equal(movement.active(makeHost({movement: true})), false);
  assert.equal(war.active(makeHost({war: true})), true);
  assert.equal(war.active(makeHost()), false);
  assert.equal(hand.active(makeHost({hand: true, canvas: true})), true);
  assert.equal(hand.active(makeHost({hand: true, canvas: true, loading: true})), false);
  assert.equal(hand.active(makeHost({hand: true})), false);
  assert.equal(hand.active(makeHost({canvas: true})), false);
});

// Set SHADERS_PACKAGE_ROOT for the same upstream contract check in any checkout.
const require = createRequire(import.meta.url);
let packageRoot = process.env.SHADERS_PACKAGE_ROOT;
if (!packageRoot) {
  try { packageRoot = resolve(dirname(require.resolve('shaders/core')), '../..'); } catch { packageRoot = ''; }
}
const registryPath = `${packageRoot}/dist/registry.js`;
test('all recipe properties obey the installed official Hologram schema and SDF resolver',
  {skip: !existsSync(registryPath)}, async () => {
    const {shaderRegistry} = await import(pathToFileURL(registryPath).href);
    const definition = shaderRegistry.find(s => s.name === 'Hologram').definition;
    for (const target of hologramTargets) {
      const props = target.components(makeHost())[0].props;
      for (const [name, value] of Object.entries(props)) {
        assert.ok(Object.hasOwn(definition.props, name), `unknown Hologram prop ${name}`);
        const {min, max} = definition.props[name].ui || {};
        if (typeof value === 'number') {
          if (min !== undefined) assert.ok(value >= min, `${name} below upstream range`);
          if (max !== undefined) assert.ok(value <= max, `${name} above upstream range`);
        }
      }
    }
    // These are the shipped resolver cases and fields, not guessed Circle/Ring props.
    const packageJson = JSON.parse(readFileSync(`${packageRoot}/package.json`, 'utf8'));
    assert.equal(packageJson.version, '4.0.4');
    const resolverFile = readdirSync(`${packageRoot}/dist/core`).find(name =>
      name.startsWith('std-') && name.endsWith('.js'));
    assert.ok(resolverFile, 'official analytic shape resolver is available');
    const resolver = readFileSync(`${packageRoot}/dist/core/${resolverFile}`, 'utf8');
    for (const type of ['ellipseSDF', 'roundedRectSDF']) assert.ok(resolver.includes(type));
    assert.ok(resolver.includes('cfg.rounding'));
    assert.ok(resolver.includes('cfg.height'));
  });
