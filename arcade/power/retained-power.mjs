// Owner-scoped cosmetic carryover. Progress always comes from the same
// progression rules used by camera power; this module never awards workout XP.
import { powerProgress, retainedPowerStyle } from './power.mjs';
import { EXERCISES } from '../../exercise-library.mjs';
import { EFFECT_GROUPS, effectGroupForExercise } from './aura-options.mjs';

export const RETAINED_POWER_KEY = 'myr5-retained-character-power-v1';
const STYLES = new Set(['aura', 'lightning', 'floor', 'blizzard']);
const GROUPS = new Set(EFFECT_GROUPS.map(group => group.id));
const STYLE_GROUPS = { aura: new Set(['legs', 'stances']), lightning: new Set(['shoulders']), floor: new Set(['floor']), blizzard: new Set(['core']) };
const MAX_OWNER_LENGTH = 240;
const empty = () => ({ version: 1, equipped: null, styles: {} });
const finite = value => Number.isFinite(value);
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function validOwner(value) {
  return typeof value === 'string' && value.length > 0 && value.length <= MAX_OWNER_LENGTH
    && (value.startsWith('account:') || (value.startsWith('guest:') && value !== 'guest:unavailable'));
}
function safeRecord(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || value.version !== 1) return empty();
  const result = empty();
  for (const [style, item] of Object.entries(value.styles ?? {})) {
    if (!STYLES.has(style) || !item || typeof item !== 'object' || Array.isArray(item)) continue;
    if (!finite(item.intensity) || !finite(item.tier) || !finite(item.units) || !finite(item.maxUnits)
      || !finite(item.updatedAt) || !['reps', 'hold'].includes(item.kind)
      || (item.kind === 'hold' && !['aura', 'blizzard'].includes(style))) continue;
    const maxUnits = clamp(Math.floor(item.maxUnits), 1, item.kind === 'hold' ? 120 : 30);
    const units = clamp(Math.floor(item.units), 0, maxUnits);
    const intensity = clamp(item.intensity, 0, 1);
    if (!units || !intensity) continue;
    const mode = typeof item.mode === 'string' && EXERCISES[item.mode] && retainedPowerStyle(item.mode) === style ? item.mode : null;
    const inferred = mode ? effectGroupForExercise(mode) : null;
    const fallback = style === 'lightning' ? 'shoulders' : style === 'floor' ? 'floor' : style === 'blizzard' ? 'core' : 'legs';
    const candidate = GROUPS.has(inferred) ? inferred : GROUPS.has(item.group) ? item.group : fallback;
    const group = STYLE_GROUPS[style].has(candidate) ? candidate : fallback;
    result.styles[style] = { intensity, tier: clamp(Math.floor(item.tier), 0, 6), units, maxUnits,
      kind: item.kind, group, ...(mode ? { mode } : {}), updatedAt: clamp(item.updatedAt, 0, 1e15) };
  }
  result.equipped = STYLES.has(value.equipped) && result.styles[value.equipped] ? value.equipped : null;
  return result;
}
function copy(value) { return { version: 1, equipped: value.equipped,
  styles: Object.fromEntries(Object.entries(value.styles).map(([style, item]) => [style, { ...item }])) }; }

export function createRetainedPower({ storage = globalThis.localStorage, ownerId = null } = {}) {
  let owner = validOwner(ownerId) ? ownerId : null;
  let record = load();
  let identity = null, lastUnits = 0;
  let disposed = false;

  function keyFor(id = owner) { return id ? `${RETAINED_POWER_KEY}/${encodeURIComponent(id)}` : null; }
  function load() {
    const key = keyFor();
    if (!key) return empty();
    try { return safeRecord(JSON.parse(storage?.getItem(key) || 'null')); }
    catch { return empty(); }
  }
  function save() {
    const key = keyFor();
    if (!key) return false;
    try { storage?.setItem(key, JSON.stringify(record)); return !!storage; }
    catch { return false; }
  }

  function read() { return copy(record); }
  function setOwner(nextOwner) {
    if (disposed) return read();
    const next = validOwner(nextOwner) ? nextOwner : null;
    if (next === owner) return read();
    owner = next;
    identity = null; lastUnits = 0;
    record = load();
    return read();
  }
  function observe(detail = {}) {
    if (disposed || !owner) return false;
    const workout = detail?.workout;
    if (!workout || workout.ownerId !== owner || workout.stage !== 'working' || workout.paused === true) return false;
    const route = retainedPowerStyle(workout.mode);
    const group = effectGroupForExercise(workout.mode);
    if (!route || (workout.kind === 'hold' && !['aura', 'blizzard'].includes(route))
      || (workout.kind === 'reps' && route === 'blizzard') || !['hold', 'reps'].includes(workout.kind)) return false;
    const progress = powerProgress(workout);
    if (!(progress.units > 0 && progress.maxUnits > 0)) return false;
    const nextIdentity = `${workout.sessionId ?? ''}\u0000${workout.mode ?? ''}\u0000${workout.kind}`;
    const changed = nextIdentity !== identity;
    const previous = lastUnits;
    identity = nextIdentity;
    lastUnits = progress.units;
    // The first positive authoritative snapshot can restore a saved peak without
    // replaying a pulse. Repeated units and downward corrections never re-equip.
    const progressed = changed ? progress.units > 0 : progress.units > previous;
    if (!progressed) return false;

    const current = record.styles[route];
    const now = finite(detail.now) ? Math.max(0, detail.now) : 0;
    if (!current) {
      record.styles[route] = { ...progress, ...(group ? { group } : {}), mode: workout.mode, updatedAt: now };
    } else {
      const better = progress.intensity > current.intensity
        || (progress.intensity === current.intensity && progress.tier > current.tier);
      record.styles[route] = {
        intensity: better ? progress.intensity : current.intensity,
        tier: better ? progress.tier : current.tier,
        units: better ? progress.units : current.units,
        maxUnits: better ? progress.maxUnits : current.maxUnits,
        kind: better ? progress.kind : current.kind,
        group: group ?? current.group,
        mode: workout.mode,
        updatedAt: now,
      };
    }
    record.equipped = route;
    save();
    return true;
  }
  function dispose() { disposed = true; identity = null; lastUnits = 0; }
  return { read, observe, setOwner, dispose };
}
