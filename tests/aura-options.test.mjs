import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { AURA_OPTIONS, AURA_CHOICE_KEY, ROTATING_AURAS, readAuraChoice, resolveAuraChoice, saveAuraChoice } from '../arcade/power/aura-options.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
class MemoryStorage {
  values = new Map();
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, String(value)); }
}

test('War Room aura choices include every shipped effect sheet with its actual frame grid', async () => {
  const choices = new Set(AURA_OPTIONS.map(option => option.id));
  for (const id of ['random', 'classic', 'bluefire', 'magicbubbles', 'protectioncircle', 'vortex', 'firespin',
    'flamelash', 'weaponhit', 'casting', 'magicspell', 'magic8', 'magichit', 'nebula', 'phantom', 'sunburn',
    'felspell', 'midnight', 'loading', 'blizzard', 'fern', 'vine', 'flower', 'mushroom', 'grass', 'reed', 'rabbit', 'fox', 'rock',
    'bear', 'deer', 'wolf', 'boar', 'crystal-blue', 'crystal-ice', 'crystal-red', 'crystal-green', 'crystal-gold', 'crystal-purple']) assert.ok(choices.has(id), `missing ${id}`);
  for (const option of AURA_OPTIONS.filter(item => item.asset)) {
    const assetRoot = option.id === 'blizzard' ? 'arcade/hold/assets' : 'arcade/power/assets';
    const bytes = await readFile(path.join(root, assetRoot, option.asset));
    assert.equal(bytes.toString('ascii', 1, 4), 'PNG', `${option.asset} is a PNG`);
    assert.equal(bytes.readUInt32BE(16), option.columns * 100, `${option.id} columns match source sheet`);
    assert.equal(bytes.readUInt32BE(20), option.rows * 100, `${option.id} rows match source sheet`);
  }
  const ecologyAssets = [
    'arcade/hold/assets/flowers-plants_2.png', 'arcade/hold/assets/rocks-original.png',
    'arcade/hold/assets/rabbit/Rabbit/Rabbit_Idle.png', 'arcade/hold/assets/fox/Fox/Fox_Idle.png',
    'arcade/hold/assets/bear/Bear/Bear_Idle.png', 'arcade/hold/assets/bear/Bear/Bear_Run.png',
    'arcade/hold/assets/boar/Boar/Boar_Idle.png', 'arcade/hold/assets/boar/Boar/Boar_Run.png',
    'arcade/hold/assets/deer/Deer/Deer_Idle.png', 'arcade/hold/assets/deer/Deer/Deer_Run.png',
    'arcade/hold/assets/wolf/Wolf/Wolf_Walk.png', 'arcade/hold/assets/wolf/Wolf/Wolf_Run.png',
    'arcade/hold/assets/crystals/PNG/32x32/crystal-gold.png', 'arcade/hold/assets/crystals/PNG/32x32/crystal-purple.png',
  ];
  for (const relative of ecologyAssets) assert.ok((await readFile(path.join(root, relative))).length > 0, `missing ${relative}`);
  const frames = [
    ['bear/Bear/Bear_Idle.png', 12, 64, 33], ['bear/Bear/Bear_Run.png', 5, 64, 33],
    ['boar/Boar/Boar_Idle.png', 8, 64, 40], ['boar/Boar/Boar_Run.png', 6, 64, 40],
    ['deer/Deer/Deer_Idle.png', 15, 48, 52], ['deer/Deer/Deer_Run.png', 9, 48, 52],
    ['wolf/Wolf/Wolf_Walk.png', 8, 64, 40], ['wolf/Wolf/Wolf_Run.png', 6, 64, 40],
  ];
  for (const [relative, count, frameWidth, frameHeight] of frames) {
    const bytes = await readFile(path.join(root, 'arcade/hold/assets', relative));
    assert.equal(bytes.readUInt32BE(16), count * frameWidth, `${relative} frame count/width`);
    assert.equal(bytes.readUInt32BE(20), frameHeight, `${relative} frame height`);
  }
  assert.equal(ROTATING_AURAS.length, AURA_OPTIONS.length - 1);
  assert.equal(AURA_OPTIONS.length, 39);
  assert.equal(ROTATING_AURAS.length, 38);
  assert.deepEqual(AURA_OPTIONS.filter(item => ['mushroom', 'grass', 'reed'].includes(item.id)).map(({ id, label, ecology }) => [id, label, ecology]), [
    ['mushroom', 'Fungi bloom', { kind: 'plant', variant: 'mushroom' }],
    ['grass', 'Grass growth', { kind: 'plant', variant: 'grass' }],
    ['reed', 'Reed growth', { kind: 'plant', variant: 'reed' }],
  ]);
});

test('aura preference defaults to Random, persists named choices and rotates deterministically', () => {
  const storage = new MemoryStorage();
  assert.equal(readAuraChoice(storage), 'random');
  assert.equal(saveAuraChoice('nebula', { storage, target: null }), true);
  assert.equal(storage.getItem(AURA_CHOICE_KEY), 'nebula');
  assert.equal(readAuraChoice(storage), 'nebula');
  assert.equal(saveAuraChoice('not-an-aura', { storage, target: null }), false);
  assert.equal(resolveAuraChoice('random', () => 0), 'classic');
  assert.equal(resolveAuraChoice('random', () => .999999), ROTATING_AURAS.at(-1));
  assert.equal(resolveAuraChoice('phantom'), 'phantom');
  assert.equal(resolveAuraChoice('invalid'), 'classic');
});
