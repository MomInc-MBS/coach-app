// Copy for the D12 patch-note-style letters (DECISIONS.md D12 letter table).
// Content transcribed from plan/muse/armie-letters.json (Muse package,
// reviewed 22 Sept 2026 -- see plan/muse/REVIEW-NOTES.md).
//
// NAMING: "Armie"/"armie" already exists in shipped code as the last stage of
// the Coach Army onboarding run (server/coach-army-runs.mjs COACH_ARMY_STAGES,
// onboarding-domain.mjs v.armieCompleted, war-room/war-room.mjs). That is an
// unrelated onboarding checkpoint -- do not touch it. Everything here is its
// own, separately namespaced feature: `armieLetters`, `pickArmieLetter`,
// DB name `myr5-armie-letters-v1`, inbox ids `letter:<date>:<letterId>`.

export const armieLetters = {
 'forgive-1': [
  {header: 'Armie v1.0.1', lines: ['Miss logged. Armie patched it.', 'Streak intact. That is week one.', 'Three weeks in a row. Then Armie stops.']},
  {header: 'Patch 1.0.1', lines: ['You missed. Armie covered.', 'One week patched. Two remain.', 'Three in a row is all.']},
  {header: 'Armie v1.0.2', lines: ['Armie saw the gap. Armie closed it.', 'Count: one week of fixing.', 'Three is the limit. Armie counts.']},
 ],
 'forgive-2': [
  {header: 'Armie v1.0.2', lines: ['Second miss. Second patch.', 'Two weeks fixed in a row.', 'One week left. Then misses break it.']},
  {header: 'Patch 1.0.3', lines: ['Armie fixed it again.', 'That is two. Armie remembers.', 'One more. That is all.']},
  {header: 'Armie v1.1.0', lines: ['Miss found. Patch applied.', 'Two in a row. Armie is watching.', 'One more week. Then Armie stops.']},
 ],
 'forgive-3-limit': [
  {header: 'Armie v1.0.3', lines: ['Third patch applied. Last one.', 'Three weeks of fixing. Done.', 'Next miss breaks the streak. Armie will not stop it.']},
  {header: 'Patch 1.0.4', lines: ['Armie fixed the third week.', 'Three weeks in a row. That was three.', 'Miss again and the count ends.']},
  {header: 'Armie v1.1.1', lines: ['Final patch installed.', 'Three in a row. Armie stops here.', 'One more miss breaks everything.']},
 ],
 'forgive-off-warning': [
  {header: 'Armie v1.1.0', lines: ['Three weeks patched. Limit reached.', 'Forgiveness is now OFF.', 'One clean week turns it back on.']},
  {header: 'Patch 1.1.0', lines: ['Armie has fixed three weeks.', 'No more patches until a full clean week.', 'Miss now and the streak breaks.']},
  {header: 'Armie v1.1.2', lines: ['Week three patched. Armie rests.', 'Fixing paused. A clean week resumes it.', 'Until then, every day counts.']},
 ],
 'streak-broken-after-limit': [
  {header: 'Armie v1.2.0', lines: ['The streak broke.', 'Armie had fixed three weeks. The limit.', 'Armie could not patch this one.']},
  {header: 'Patch 1.2.0', lines: ['Miss logged. Streak reset.', 'Three weeks was the deal.', 'Armie kept its side. The streak starts over.']},
  {header: 'Armie v1.2.1', lines: ['Break detected. Count is zero.', 'The three-week cover is spent.', 'The next kept day is day one.']},
 ],
 'streak-broken': [
  {header: 'Armie v1.2.0', lines: ['Two misses in one week.', 'Armie patches one. Not two.', 'Streak reset. Armie is not sorry.']},
  {header: 'Patch 1.2.1', lines: ['The streak broke.', 'One miss a week is the rule.', 'This week had more. Count is zero.']},
  {header: 'Armie v1.3.0', lines: ['Break logged.', 'Armie fixes one miss per week.', 'The second one stands. Streak over.']},
 ],
 'forgive-restored': [
  {header: 'Armie v1.3.0', lines: ['A full week. No patches needed.', 'Forgiveness restored.', 'Armie is ready again. Try not to need it.']},
  {header: 'Patch 1.3.0', lines: ['Seven clean days.', 'The counter is back to zero.', 'One miss a week, three weeks running. As before.']},
  {header: 'Armie v1.3.1', lines: ['Clean week confirmed.', 'Armie reset the forgiveness.', 'Three weeks of cover, reloaded.']},
 ],
 'milestone-5': [
  {header: 'Armie v2.0.0', lines: ['Five days. Still here.', 'Armie noticed. Armie approves.', 'Keep going. Armie is watching.']},
  {header: 'Patch 2.0.0', lines: ['Streak: five.', 'Small number. Real work.', 'Armie logged it in permanent ink.']},
  {header: 'Armie v2.0.1', lines: ['Five in a row.', 'Armie did the math twice.', 'It checks out. Nice.']},
 ],
 'milestone-10': [
  {header: 'Armie v2.1.0', lines: ['Ten days straight.', 'Double digits. Armie nods.', 'The streak has legs now.']},
  {header: 'Patch 2.1.0', lines: ['Streak: ten.', 'Armie ran out of small words.', 'Big ones: keep going.']},
  {header: 'Armie v2.1.1', lines: ['Ten days. The streak holds.', 'Armie checked. Twice.', 'Still standing. Good.']},
 ],
 'milestone-15': [
  {header: 'Armie v2.2.0', lines: ['Fifteen.', 'Armie is impressed. Armie hides it.', 'The streak is a habit now.']},
  {header: 'Patch 2.2.0', lines: ['Streak: fifteen.', 'Three fives. Armie counted.', 'Do not stop. Armie means it.']},
  {header: 'Armie v2.2.1', lines: ['Fifteen days straight.', 'Armie updated the plaque.', 'Your name is on it. Keep it there.']},
 ],
};

// Deterministic so the same (date, letterId) always resolves to the same
// copy -- callers may see the same fired letter more than once (a reopen
// catch-up, a retried push) and must render identical content each time.
function seedIndex(seed, length) {
 let hash = 0;
 for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
 return hash % length;
}

// Picks one variant's copy for a fired D12 letter id. Returns null for an
// unknown id instead of throwing, since letter ids ultimately come from the
// streak evaluator and a caller should never crash the inbox over one.
export function pickArmieLetter(letterId, seed = letterId) {
 const variants = armieLetters[letterId];
 if (!variants || !variants.length) return null;
 const variant = variants[seedIndex(String(seed), variants.length)];
 return {letterId, header: variant.header, lines: variant.lines};
}
