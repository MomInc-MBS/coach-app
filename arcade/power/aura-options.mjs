import { EXERCISES } from '../../exercise-library.mjs';

export const AURA_CHOICE_KEY = 'myr5-aura-choice-v1';
export const EFFECT_CHOICES_KEY = 'myr5-exercise-effect-choices-v1';

export const AURA_OPTIONS = Object.freeze([
  { id: 'random', label: 'Random · rotate effects' },
  { id: 'classic', label: 'Classic fire aura' },
  { id: 'bluefire', label: 'Blue flame', asset: '3_bluefire_spritesheet.png', columns: 8, rows: 8 },
  { id: 'magicbubbles', label: 'Magic bubbles', asset: '20_magicbubbles_spritesheet.png', columns: 8, rows: 8 },
  { id: 'protectioncircle', label: 'Protection circle', asset: '8_protectioncircle_spritesheet.png', columns: 8, rows: 8, layout: 'circle' },
  { id: 'vortex', label: 'Vortex', asset: '13_vortex_spritesheet.png', columns: 8, rows: 8, layout: 'orbit' },
  { id: 'firespin', label: 'Fire spin', asset: '7_firespin_spritesheet.png', columns: 8, rows: 8, layout: 'orbit' },
  { id: 'flamelash', label: 'Flame lash', asset: '6_flamelash_spritesheet.png', columns: 7, rows: 7 },
  { id: 'weaponhit', label: 'Weapon hit spark', asset: '10_weaponhit_spritesheet.png', columns: 6, rows: 6 },
  { id: 'casting', label: 'Casting ring', asset: '4_casting_spritesheet.png', columns: 9, rows: 9, layout: 'circle' },
  { id: 'magicspell', label: 'Magic spell burst', asset: '1_magicspell_spritesheet.png', columns: 9, rows: 9 },
  { id: 'magic8', label: 'Magic-eight trail', asset: '2_magic8_spritesheet.png', columns: 8, rows: 8, layout: 'orbit' },
  { id: 'magichit', label: 'Magic hit', asset: '5_magickahit_spritesheet.png', columns: 7, rows: 7 },
  { id: 'nebula', label: 'Nebula', asset: '12_nebula_spritesheet.png', columns: 8, rows: 8, layout: 'orbit' },
  { id: 'phantom', label: 'Phantom', asset: '14_phantom_spritesheet.png', columns: 8, rows: 8, layout: 'orbit' },
  { id: 'sunburn', label: 'Sunburn', asset: '16_sunburn_spritesheet.png', columns: 8, rows: 8, layout: 'orbit' },
  { id: 'felspell', label: 'Felspell', asset: '17_felspell_spritesheet.png', columns: 10, rows: 10, layout: 'orbit' },
  { id: 'midnight', label: 'Midnight', asset: '18_midnight_spritesheet.png', columns: 8, rows: 8, layout: 'orbit' },
  { id: 'loading', label: 'Loading ring', asset: '15_loading_spritesheet.png', columns: 11, rows: 11, layout: 'circle' },
  { id: 'blizzard', label: 'Blizzard ice', asset: '19_freezing_spritesheet.png', columns: 10, rows: 10, layout: 'orbit' },
  { id: 'fern', label: 'Fern growth', ecology: { kind: 'plant', variant: 'fern' } },
  { id: 'vine', label: 'Vine drift', ecology: { kind: 'plant', variant: 'vine' } },
  { id: 'flower', label: 'Flower bloom', ecology: { kind: 'plant', variant: 'flower' } },
  { id: 'mushroom', label: 'Fungi bloom', ecology: { kind: 'plant', variant: 'mushroom' } },
  { id: 'grass', label: 'Grass growth', ecology: { kind: 'plant', variant: 'grass' } },
  { id: 'reed', label: 'Reed growth', ecology: { kind: 'plant', variant: 'reed' } },
  { id: 'rabbit', label: 'Rabbit companion', ecology: { kind: 'animal', variant: 'rabbit' } },
  { id: 'fox', label: 'Fox companion', ecology: { kind: 'animal', variant: 'fox' } },
  { id: 'bear', label: 'Bear companion', ecology: { kind: 'animal', variant: 'bear' } },
  { id: 'deer', label: 'Deer companion', ecology: { kind: 'animal', variant: 'deer' } },
  { id: 'wolf', label: 'Wolf companion', ecology: { kind: 'animal', variant: 'wolf' } },
  { id: 'boar', label: 'Boar companion', ecology: { kind: 'animal', variant: 'boar' } },
  { id: 'rock', label: 'Stone chips', ecology: { kind: 'mineral', variant: 'rock' } },
  { id: 'crystal-blue', label: 'Blue crystal shards', ecology: { kind: 'mineral', variant: 'crystal', palette: 'blue' } },
  { id: 'crystal-ice', label: 'Ice crystal shards', ecology: { kind: 'mineral', variant: 'crystal', palette: 'ice' } },
  { id: 'crystal-red', label: 'Red crystal shards', ecology: { kind: 'mineral', variant: 'crystal', palette: 'red' } },
  { id: 'crystal-green', label: 'Green crystal shards', ecology: { kind: 'mineral', variant: 'crystal', palette: 'green' } },
  { id: 'crystal-gold', label: 'Gold crystal shards', ecology: { kind: 'mineral', variant: 'crystal', palette: 'gold' } },
  { id: 'crystal-purple', label: 'Purple crystal shards', ecology: { kind: 'mineral', variant: 'crystal', palette: 'purple' } },
  { id: 'lightning', label: 'Lightning arcs', route: 'lightning' },
  { id: 'floor', label: 'Floor sparks', route: 'floor' },
]);

export const ROTATING_AURAS = Object.freeze(AURA_OPTIONS.filter(option => option.id !== 'random').map(option => option.id));
export const EFFECT_OPTION_BY_ID = new Map(AURA_OPTIONS.map(option => [option.id, option]));

const ECOLOGY_IDS = AURA_OPTIONS.filter(option => option.ecology).map(option => option.id);
const GROUPS = [
  { id: 'yoga', label: 'Yoga & mobility', options: [...ECOLOGY_IDS, 'magicbubbles', 'nebula', 'phantom', 'midnight'], defaultEffect: 'fern' },
  { id: 'stances', label: 'Martial stances', options: ['flamelash', 'casting', 'felspell'], defaultEffect: 'casting' },
  { id: 'legs', label: 'Legs & hips', options: ['classic', 'firespin', 'vortex', 'sunburn'], defaultEffect: 'classic' },
  { id: 'shoulders', label: 'Arms & shoulders', options: ['magic8', 'weaponhit', 'magichit', 'lightning'], defaultEffect: 'lightning' },
  { id: 'floor', label: 'Floor exercises', options: ['bluefire', 'magicspell', 'floor'], defaultEffect: 'floor' },
  { id: 'core', label: 'Core & balance', options: ['blizzard', 'protectioncircle', 'loading'], defaultEffect: 'blizzard' },
].map(group => Object.freeze({ ...group, options: Object.freeze(['random', ...group.options]) }));

export const EFFECT_GROUPS = Object.freeze(GROUPS);
const GROUP_BY_ID = new Map(EFFECT_GROUPS.map(group => [group.id, group]));
const HOME_GROUP = new Map(EFFECT_GROUPS.flatMap(group => group.options.filter(id => id !== 'random').map(id => [id, group.id])));
const DEFAULT_CHOICES = Object.freeze(Object.fromEntries(EFFECT_GROUPS.map(group => [group.id, 'random'])));
const VALID = new Set(AURA_OPTIONS.map(option => option.id));

export function effectGroupForExercise(mode) {
  const ex = typeof mode === 'string' ? EXERCISES[mode] : mode;
  if (!ex || typeof ex !== 'object' || ['boxing', 'cardio'].includes(ex.group)) return null;
  if (ex.kind === 'hold') {
    if (ex.group === 'stances') return 'stances';
    if (ex.group === 'core' || ex.group === 'balance') return 'core';
    if (ex.group === 'yoga' || ex.group === 'legs') return 'yoga';
  }
  if (['pushup', 'bridge', 'plank', 'sideplank'].includes(ex.detector)) return 'floor';
  if (ex.group === 'shoulders') return 'shoulders';
  if (ex.group === 'legs' || ex.group === 'hips') return 'legs';
  return null;
}

function validChoice(group, choice) { return GROUP_BY_ID.get(group)?.options.includes(choice) ?? false; }
function choiceRecord(storage) {
  try {
    const raw = (storage ?? globalThis.localStorage)?.getItem(EFFECT_CHOICES_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (data?.version === 1 && data.choices && typeof data.choices === 'object') {
        return Object.fromEntries(EFFECT_GROUPS.map(group => [group.id,
          validChoice(group.id, data.choices[group.id]) ? data.choices[group.id] : group.defaultEffect]));
      }
    }
  } catch { /* fall through to safe defaults or one-group migration */ }
  const choices = { ...DEFAULT_CHOICES };
  try {
    const legacy = (storage ?? globalThis.localStorage)?.getItem(AURA_CHOICE_KEY);
    const group = HOME_GROUP.get(legacy);
    if (group && validChoice(group, legacy)) choices[group] = legacy;
  } catch { /* inaccessible storage uses defaults */ }
  return choices;
}

export function readEffectChoices(storage) { return choiceRecord(storage); }

export function saveEffectChoice(group, choice, { storage, target } = {}) {
  if (!validChoice(group, choice)) return false;
  try {
    const store = storage ?? globalThis.localStorage;
    if (!store?.setItem) return false;
    const choices = choiceRecord(storage);
    choices[group] = choice;
    store.setItem(EFFECT_CHOICES_KEY, JSON.stringify({ version: 1, choices }));
  } catch { return false; }
  try { (target ?? globalThis.window)?.dispatchEvent?.(new CustomEvent('myr5:exercise-effect-choice-change', { detail: { group, choice } })); }
  catch { /* Storage events synchronize other tabs. */ }
  return true;
}

export function resolveEffectForGroup(group, choices = {}, random = Math.random) {
  const definition = GROUP_BY_ID.get(group);
  if (!definition) return null;
  const choice = choices[group] ?? definition.defaultEffect;
  if (choice !== 'random') return validChoice(group, choice) ? choice : definition.defaultEffect;
  const variants = definition.options.filter(id => id !== 'random');
  const value = Number(random());
  const index = Math.min(variants.length - 1, Math.max(0, Math.floor((Number.isFinite(value) ? value : 0) * variants.length)));
  return variants[index];
}

export function resolveExerciseEffect(mode, choices = {}, random = Math.random) {
  return resolveEffectForGroup(effectGroupForExercise(mode), choices, random);
}

// Legacy global helpers stay for old clients; the new runtime reads only the
// versioned per-exercise-group record above.
export function readAuraChoice(storage) {
  try {
    const choice = (storage ?? globalThis.localStorage)?.getItem(AURA_CHOICE_KEY);
    return VALID.has(choice) ? choice : 'random';
  } catch { return 'random'; }
}

export function resolveAuraChoice(choice = 'random', random = Math.random) {
  if (choice === 'random') {
    const value = Number(random());
    const index = Math.min(ROTATING_AURAS.length - 1, Math.max(0, Math.floor((Number.isFinite(value) ? value : 0) * ROTATING_AURAS.length)));
    return ROTATING_AURAS[index];
  }
  return VALID.has(choice) ? choice : 'classic';
}

export function saveAuraChoice(choice, { storage, target } = {}) {
  if (!VALID.has(choice)) return false;
  try { (storage ?? globalThis.localStorage)?.setItem(AURA_CHOICE_KEY, choice); }
  catch { return false; }
  try { (target ?? globalThis.window)?.dispatchEvent?.(new CustomEvent('myr5:aura-choice-change', { detail: { choice } })); }
  catch { /* Storage changes in another tab still arrive through the storage event. */ }
  return true;
}
