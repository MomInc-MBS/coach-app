// D25: meditation offers two breathing modes inside the existing meditation flow. Pure data +
// pure functions only (no DOM, no timers) so breathing.mjs, the unit tests and the browser test
// all read the same script. A mode never adds a second clock: "session complete" stays exactly
// combat.mjs's BreathingSession/BREATHING_MS (3 minutes of active time, re-checked server-side in
// server/combat.mjs completeBreathing). A mode only decides which phase to show for a given
// elapsed-ms value on that one clock.
//
// ponytail: PENDING WELLNESS REVIEW. Every hold length, round count and breath pace below is a
// conservative placeholder, not a production value (ART-AND-CHOICE handoff §7: breath timing,
// contraindications, copy and escape behaviour need wellness/safety review before values are
// locked). Tune them only after that review, then flip PENDING_WELLNESS_REVIEW.
import {EXERCISES} from './exercise-library.mjs';
import {BREATHING_MS} from './combat.mjs';

export const PENDING_WELLNESS_REVIEW = true;
const guidedCore = {durationMs:210000,settleMs:20500,breaths:30,breathMs:110000,inhaleMs:8500/3,exhaleMs:2500/3,transitionMs:2500,optionalPauseMs:30000,recoveryInhaleMs:3000,recoveryPauseMs:15000,closingBreathingMs:29000};
export const GUIDED_ROUND_TIMING = Object.freeze(guidedCore);
export const GUIDED_ROUND_MS = GUIDED_ROUND_TIMING.durationMs;
export const GENTLE_DIALOGUE = Object.freeze([
 'Get comfortable.',
 'Breathe in gently.',
 'Breathe out softly.',
 'Keep the breath easy.',
 'Feel your support.',
 'Inhale when ready.',
 'Return to normal.',
 'Stop or skip anytime.'
]);
export const SEATED_ONLY_NOTICE = 'Practice seated or lying down. The standing character pose is visual only, not a standing practice. Never while driving or in or near water.';
export const NO_MEDICAL_CLAIM = 'A breathing practice, not medical treatment or advice. Stop any time, and breathe normally if you feel dizzy or unwell.';

const stances = ids => Object.freeze(ids.filter(id => EXERCISES[id]).map(id => Object.freeze({id, name: EXERCISES[id].name, cue: EXERCISES[id].cue})));

export const BREATHING_MODES = Object.freeze({
 'wim-hof': Object.freeze({
  id: 'wim-hof',
  title: 'One guided breathing round',
  subtitle: '3:30 · 30 easy breaths with an optional pause.',
  seatedOnly: true,
  rounds: 1, breathsPerRound: GUIDED_ROUND_TIMING.breaths, inhaleMs: GUIDED_ROUND_TIMING.inhaleMs, exhaleMs: GUIDED_ROUND_TIMING.exhaleMs, holdMs: GUIDED_ROUND_TIMING.optionalPauseMs, recoveryHoldMs: GUIDED_ROUND_TIMING.recoveryPauseMs, recoveryInhaleMs:GUIDED_ROUND_TIMING.recoveryInhaleMs,transitionMs:GUIDED_ROUND_TIMING.transitionMs,breathMs:GUIDED_ROUND_TIMING.breathMs,settleMs: GUIDED_ROUND_TIMING.settleMs,
 }),
 'tai-chi': Object.freeze({
  id: 'tai-chi',
  title: 'Tai chi stance breathing',
  subtitle: 'Slow breaths while you hold a balance or core stance.',
  seatedOnly: false,
  // D25: the existing core/balance exercises (easiest variants first, as the conservative default).
  stances: stances(['low-tree', 'knee-balance', 'knee-plank', 'side-knee-left', 'side-knee-right']),
  stanceHoldMs: 20000, restMs: 10000, inhaleMs: 4000, exhaleMs: 5000,
 }),
});
export const MODE_IDS = Object.freeze(Object.keys(BREATHING_MODES));

export function buildScript(id) {
 const m = BREATHING_MODES[id];
 if (!m) throw Error('Unknown breathing mode: ' + id);
 const pace = {inhaleMs: m.inhaleMs, exhaleMs: m.exhaleMs}, phases = [];
 if (id === 'wim-hof') {
  phases.push(
   {key:'settle',label:'Settle comfortably',ms:m.settleMs,dialogue:GENTLE_DIALOGUE[0]},
   {key:'breathe',label:'One round · 30 easy breaths',ms:m.breathMs,pace,dialogue:GENTLE_DIALOGUE[1]},
   {key:'transition',label:'Let the last exhale soften',ms:m.transitionMs,dialogue:'Easy exhale. Stay comfortable.'},
   {key:'optional-hold',label:'Optional pause · skip whenever you like',ms:m.holdMs,dialogue:'Never force it. Breathe normally.'},
   {key:'recovery',label:'Return to easy breathing',ms:m.recoveryInhaleMs,dialogue:GENTLE_DIALOGUE[7]},
   {key:'recovery-hold',label:'Optional recovery pause · skip anytime',ms:m.recoveryHoldMs,dialogue:'Never force it. Breathe normally.'},
   {key:'rest',label:'Let your breathing return to its natural rhythm',ms:GUIDED_ROUND_TIMING.closingBreathingMs,dialogue:GENTLE_DIALOGUE[7]},
  );
 } else for (const s of m.stances) phases.push(
  {key: 'hold', label: `Hold: ${s.name}`, ms: m.stanceHoldMs, pace, stanceId: s.id, cue: s.cue},
  {key: 'rest', label: 'Release the stance · breathe normally', ms: m.restMs},
 );
 return Object.freeze(phases);
}

// Each script should fit inside the shared clock so no round is cut short (asserted in tests).
export const scriptMs = script => script.reduce((sum, p) => sum + p.ms, 0);
export const SESSION_MS = BREATHING_MS;

// Phase showing at `elapsedMs` of active time. Once the script is used up, it rests until the
// shared 3-minute clock ends -- this never decides when the session ends.
export function phaseAt(script, elapsedMs) {
 let into = Math.max(0, Number(elapsedMs) || 0);
 for (const p of script) {
  if (into < p.ms) {
   const cycle = p.pace && p.pace.inhaleMs + p.pace.exhaleMs;
   return {...p, remainingMs: p.ms - into, breath: cycle ? (into % cycle < p.pace.inhaleMs ? 'in' : 'out') : null};
  }
  into -= p.ms;
 }
 return {key: 'rest', label: 'Breathe normally until the timer ends', ms: 0, remainingMs: 0, breath: null};
}
