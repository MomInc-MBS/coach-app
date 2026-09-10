# Coach weapon animation review — September 10

User request: escalating 64-bit anime-style animations for every weapon and tier; floating is welcome. Cooler weapons unlock abilities with cooldowns. Prepare a draft for review in the morning.

## Workspace and boundaries

- Draft: this independent checkout, branch `codex/weapon-animation-review`.
- Base: deployed commit `12111a6fc57e147fb5a9aa98c06cfbe35ef9ada6`.
- Live checkout: `C:/Users/ianmy/Documents/Codex/2026-09-09/we/work/coach-app`. Leave it untouched.
- Do not push or deploy this draft. No new website registration.
- Automation: `coach-weapon-animations-overnight`, hourly, eight runs maximum. Pause when complete or by September 10 at 8 AM Pacific.
- Checkpoints and scratch belong here. Final review deliverables go in `C:/Users/ianmy/Documents/Codex/2026-09-09/whe-3/outputs/`.
- Use the Sites workflow. The user wants a local draft; publication is deferred by their review request. No browser UI QA unless they ask for it. Canvas asset rendering and functional tests are useful.
- Node dependencies are a junction to the already installed shared dependencies. Do not update packages unnecessarily.

## Design

Keep the 20 existing family IDs and 21 existing tiers. Existing saved looks and earned requirements must remain valid. Build distinct family choreography; a sword should cut, a railgun should compress and fire, a disc should return, a hive should swarm. Each adjacent tier changes the palette, physical proportions, and effect footprint. Milestone tiers add new geometry and choreography.

Proposed ability milestones: tier 4 signature, 8 amplified, 12 awakened, 16 ultimate, 20 impossible. Preserve basic attacks at all tiers. One special slot with a visible cooldown is enough for the app. Ability names and timings are review proposals, not final game balance.

Use slow floating idle motion, crisp polygon energy, segmented arcs, stepped trails, afterimages, shards, and contained rifts. No full-screen flashing. Keep a reduced-motion rendering path. Stronger tiers must remain recognizable as their original family.

## Completion checklist

- [x] Pure progression catalog for all 20 families and 21 tiers, distinctive ability names and cooldowns.
- [x] Initial shared animation renderer: idle, basic attack, and special; increasing palette, size, silhouette, and intensity at every tier. Refine choreography and bounds during overnight work.
- [x] Initial local weapon review page with family switcher, tier slider/comparison, and playable cooldowns; compact copy. Needs standalone packaging and final verification.
- [ ] Rest arena integration using the same renderer and real earned unlock checks.
- [ ] Cooldowns survive weapon switching and rest re-entry; no XP from tapping or abilities.
- [ ] Meaningful cooldown/unlock/regression tests; all existing tests and production build pass.
- [ ] Self-contained review artifact in outputs, concise review notes, ready to open locally.
- [ ] Pause automation and report completion in the current task.

## Checkpoint

September 9, 11:25 PM Pacific: the independent draft now includes `pod/weapon-evolution.mjs`, `pod/weapon-animator.mjs`, and `pod/weapon-review.html` with companion CSS/JS. All 20 families and 21 tiers have presentation profiles; 100 named milestone abilities share one cooldown. `GalaWeapons.draw` accepts an optional palette while its default behavior is preserved. The review page uses simulated earned progress only within its own scope and never writes account/localStorage. Four initial progression/cooldown tests pass; renderer coverage is being checked before ending the setup turn.

Next: connect these modules to the actual rest arena and SetFlow with an earned special button and persisted shared cooldown. Review/reset bugs carefully: switching weapon or tier may cancel an animation but must not reset the cooldown; page reload and rest re-entry retain remaining cooldown; special taps must not award XP. Handle special actions without basic taps immediately overriding their whole animation. Verify animation bounds on small cards and arena canvas, reduced-motion, and inactive/hidden page behavior. Capture no browser screenshots or app DOM QA unless Ian asks for that. A self-contained review HTML can embed the scripts and existing background for easy morning review without needing a server.

Validation at the end of setup: all six new tests pass, covering every family/tier in idle, basic, special, and reduced-motion rendering; expired actions; earned unlocks; cross-weapon/tier cooldowns; reload; and clock rollback. This is functional canvas coverage, not browser visual QA. Finish the full test suite and production build after integration. Keep final visible app copy brief. The original live site is untouched. The overnight automation is active and has been verified through its saved configuration and app card.

## Useful implementation references

- `pod/gala-weapons.js`: all authored sci-fi pixel weapon bodies and stable catalog.
- `pod/rest-arena.mjs`: avatar/weapon rendering, earned equipment progress.
- `pod/set-flow.mjs`: tracked workout XP, rest taps, level-50 damage gate.
- `pod/pod.mjs`: rest controls and arena wiring.
- `pod/retro-rooms.css`: restored large-coach rest platform and scenery.
- `scripts/build.mjs`: copies `pod/`; optimized voice packaging avoids a 256 MiB hosting limit. Preserve that optimization.
- `npm test`; `npm run build` (build subprocesses may need ordinary approved sandbox escalation).
