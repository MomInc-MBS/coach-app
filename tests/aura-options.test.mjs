import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { AURA_OPTIONS, AURA_CHOICE_KEY, EFFECT_CHOICES_KEY, EFFECT_GROUPS, ROTATING_AURAS,
  effectGroupForExercise, readAuraChoice, readEffectChoices, resolveAuraChoice, resolveEffectForGroup,
  resolveExerciseEffect, saveAuraChoice, saveEffectChoice } from '../arcade/power/aura-options.mjs';

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
  assert.ok(choices.has('lightning') && choices.has('floor'));
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
  assert.equal(AURA_OPTIONS.length, 41);
  assert.equal(ROTATING_AURAS.length, 40);
  assert.deepEqual(AURA_OPTIONS.filter(item => ['mushroom', 'grass', 'reed'].includes(item.id)).map(({ id, label, ecology }) => [id, label, ecology]), [
    ['mushroom', 'Fungi bloom', { kind: 'plant', variant: 'mushroom' }],
    ['grass', 'Grass growth', { kind: 'plant', variant: 'grass' }],
    ['reed', 'Reed growth', { kind: 'plant', variant: 'reed' }],
  ]);
});

test('38 existing choices are partitioned by exercise with native route defaults', () => {
  const assigned = EFFECT_GROUPS.flatMap(group => group.options.filter(id => !['random', 'lightning', 'floor'].includes(id))).sort();
  const original = AURA_OPTIONS.filter(option => option.id !== 'random' && option.id !== 'lightning' && option.id !== 'floor').map(option => option.id).sort();
  assert.deepEqual(assigned, original);
  assert.deepEqual(EFFECT_GROUPS.map(({ id, label, defaultEffect }) => [id, label, defaultEffect]), [
    ['yoga', 'Yoga & mobility', 'fern'], ['stances', 'Martial stances', 'casting'], ['legs', 'Legs & hips', 'classic'],
    ['shoulders', 'Arms & shoulders', 'lightning'], ['floor', 'Floor exercises', 'floor'], ['core', 'Core & balance', 'blizzard'],
  ]);
  assert.equal(effectGroupForExercise('mountain'), 'yoga');
  assert.equal(effectGroupForExercise('high-horse'), 'stances');
  assert.equal(effectGroupForExercise('squat'), 'legs');
  assert.equal(effectGroupForExercise('front-raise'), 'shoulders');
  assert.equal(effectGroupForExercise('pushup'), 'floor');
  assert.equal(effectGroupForExercise('glute-bridge'), 'floor');
  assert.equal(effectGroupForExercise('high-plank'), 'core');
  assert.equal(effectGroupForExercise('tree'), 'core');
  assert.equal(effectGroupForExercise('boxing'), null);
  assert.equal(effectGroupForExercise('jogging'), null);
});

test('exercise effect choices default random per group, save independently, migrate one compatible legacy value', () => {
  const storage = new MemoryStorage();
  assert.deepEqual(readEffectChoices(storage), { yoga: 'random', stances: 'random', legs: 'random', shoulders: 'random', floor: 'random', core: 'random' });
  assert.equal(saveEffectChoice('legs', 'firespin', { storage, target: null }), true);
  assert.equal(saveEffectChoice('shoulders', 'fern', { storage, target: null }), false);
  assert.deepEqual(readEffectChoices(storage), { yoga: 'random', stances: 'random', legs: 'firespin', shoulders: 'random', floor: 'random', core: 'random' });
  assert.equal(JSON.parse(storage.getItem(EFFECT_CHOICES_KEY)).version, 1);

  const legacy = new MemoryStorage(); legacy.setItem(AURA_CHOICE_KEY, 'bluefire');
  assert.deepEqual(readEffectChoices(legacy), { yoga: 'random', stances: 'random', legs: 'random', shoulders: 'random', floor: 'bluefire', core: 'random' });
  const randomLegacy = new MemoryStorage(); randomLegacy.setItem(AURA_CHOICE_KEY, 'random');
  assert.ok(Object.values(readEffectChoices(randomLegacy)).every(choice => choice === 'random'));
});

test('random resolves only inside its exercise group and specific choices stay specific', () => {
  const choices = { yoga: 'random', stances: 'random', legs: 'random', shoulders: 'random', floor: 'random', core: 'random' };
  assert.equal(resolveEffectForGroup('yoga', choices, () => 0), 'fern');
  assert.equal(resolveEffectForGroup('yoga', choices, () => .999999), 'midnight');
  assert.equal(resolveExerciseEffect('squat', choices, () => 0), 'classic');
  assert.equal(resolveExerciseEffect('front-raise', choices, () => .999999), 'lightning');
  assert.equal(resolveExerciseEffect('pushup', choices, () => 0), 'bluefire');
  assert.equal(resolveExerciseEffect('tree', choices, () => .999999), 'loading');
  choices.legs = 'vortex';
  assert.equal(resolveExerciseEffect('squat', choices, () => .9), 'vortex');
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
