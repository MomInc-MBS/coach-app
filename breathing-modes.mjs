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
export const SEATED_ONLY_NOTICE = 'Seated only. Never while standing, driving, or in or near water.';
export const NO_MEDICAL_CLAIM = 'A breathing practice, not medical treatment or advice. Stop any time, and breathe normally if you feel dizzy or unwell.';

const stances = ids => Object.freeze(ids.filter(id => EXERCISES[id]).map(id => Object.freeze({id, name: EXERCISES[id].name, cue: EXERCISES[id].cue})));

export const BREATHING_MODES = Object.freeze({
 'wim-hof': Object.freeze({
  id: 'wim-hof',
  title: 'Seated intense breathing',
  subtitle: 'Wim Hof-style rounds: deep breaths, then a breath-hold.',
  seatedOnly: true,
  rounds: 3, breathsPerRound: 15, inhaleMs: 1200, exhaleMs: 1200, holdMs: 15000, recoveryHoldMs: 8000,
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
 if (id === 'wim-hof') for (let r = 1; r <= m.rounds; r++) {
  const tag = `Round ${r} of ${m.rounds}`;
  phases.push(
   {key: 'breathe', label: `${tag} · ${m.breathsPerRound} deep breaths`, ms: m.breathsPerRound * (m.inhaleMs + m.exhaleMs), pace},
   {key: 'hold', label: `${tag} · Breathe out and hold`, ms: m.holdMs},
   {key: 'recover', label: `${tag} · Breathe in and hold`, ms: m.recoveryHoldMs},
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
