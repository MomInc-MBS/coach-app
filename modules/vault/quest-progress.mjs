// Narrow progress bridge for skill-based Vault quests. Game/workout events carry
// the owner captured when the run began; account changes invalidate late callbacks.
import { EXERCISES } from '../../exercise-library.mjs';
import { performanceOwner } from '../../performance-progress.mjs';
import { HOLD_CAP_SECONDS, REP_CAP } from '../../progression-rules.mjs';
import { powerProgress, retainedPowerStyle } from '../../arcade/power/power.mjs';
import { holdStyleForExercise } from '../../arcade/workout-effects-state.mjs';
import { bump, read as readVaultState } from './vault-store.mjs';

const LIMITS = Object.freeze({
  'pyramid-level': [1, 20, true], 'pyramid-complete': [1, 1, true],
  'fruit-streak': [3, 64, true], 'aura-tier': [1, 6, true],
  'blizzard-tier': [1, 6, true], 'fire-tier': [1, 6, true],
  'lightning-tier': [1, 6, true], 'yoga-hold-seconds': [1, 60, false],
});

function validValue(counter, value) {
  const rule = LIMITS[counter];
  return !!rule && Number.isFinite(value) && value >= rule[0] && value <= rule[1]
    && (!rule[2] || Number.isSafeInteger(value));
}
let cacheOwner = null, highWater = new Map();

/** Record a bounded max metric only for the owner captured at run start. */
export function recordQuestProgress({ ownerId, counter, value } = {}) {
  try {
    if (typeof ownerId !== 'string' || !ownerId || ownerId !== performanceOwner()
        || !validValue(counter, value)) return false;
    if (cacheOwner !== ownerId) { cacheOwner = ownerId; highWater = new Map(); }
    const previous = highWater.has(counter) ? highWater.get(counter)
      : Number(readVaultState()?.counters?.[counter]) || 0;
    if (value <= previous) { highWater.set(counter, previous); return false; }
    bump(counter, value);
    const persisted=Number(readVaultState()?.counters?.[counter])||0;
    if(persisted>previous)highWater.set(counter,persisted);
    return persisted>=value;
  } catch { return false; }
}

/** Whether the current owner's persisted max already covers a queued event. */
export function questProgressStored(ownerId,counter,value){
  try{return ownerId===performanceOwner()&&validValue(counter,value)&&(Number(readVaultState()?.counters?.[counter])||0)>=value;}catch{return false;}
}

/** Consume an authoritative workout-effects snapshot without changing workout flow. */
export function recordWorkoutQuestProgress(detail = {}) {
  const workout = detail?.workout;
  if (!workout || workout.stage !== 'working' || workout.paused === true
      || typeof workout.ownerId !== 'string' || workout.ownerId !== performanceOwner()) return false;
  const exercise = EXERCISES[workout.mode];
  if (!exercise || workout.kind !== exercise.kind) return false;
  if (workout.kind === 'reps' && (!Number.isFinite(workout.workingReps)
      || workout.workingReps < 0 || workout.workingReps > REP_CAP)) return false;
  if (workout.kind === 'hold' && (!Number.isFinite(workout.activeSeconds)
      || workout.activeSeconds < 0 || workout.activeSeconds > HOLD_CAP_SECONDS)) return false;

  if (workout.kind === 'hold' && exercise.group === 'yoga'
      && holdStyleForExercise(exercise) === 'living') {
    return recordQuestProgress({ ownerId: workout.ownerId, counter: 'yoga-hold-seconds',
      value: Math.min(60, Math.floor(Number(workout.activeSeconds) || 0)) });
  }

  if (workout.kind === 'hold' && ['core', 'balance'].includes(exercise.group)
      && retainedPowerStyle(exercise) === 'blizzard') {
    const progress = powerProgress(workout);
    return recordQuestProgress({ ownerId: workout.ownerId, counter: 'blizzard-tier', value: progress.tier });
  }

  if (workout.kind !== 'reps') return false;
  const style = retainedPowerStyle(exercise), progress = powerProgress(workout);
  const counter = style === 'aura' ? 'aura-tier' : style === 'floor' ? 'fire-tier'
    : style === 'lightning' ? 'lightning-tier' : null;
  if (!counter || progress.kind !== 'reps') return false;
  return recordQuestProgress({ ownerId: workout.ownerId, counter, value: progress.tier });
}
