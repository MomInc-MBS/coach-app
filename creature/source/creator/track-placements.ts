// Rank 7b track-placement registry: the approved 50-model / 51-placement creature roster,
// keyed by stable model id (roster.ts `id`). DATA ONLY -- no renderer/UI code reads this yet.
//
// Source of truth: plan/PLAN.md §2b rank 7b; plan/DECISIONS.md D6 (incl. its 22 Sept revision),
// D21, D25; plan/reports/roster-sheet.md; and mom-program-control/outputs/visual-boards/
// ART-AND-CHOICE-IMPLEMENTATION-HANDOFF.md §2 (roster table), §4 (pet/mount/boss rules), §8
// (stable-data contract: displayName/stableId/track/sourceAsset/license/unlockRule/renderRecipe
// separated; petEligible/mountEligible stored explicitly; one model may hold several placements
// without duplicating its asset).
//
// Label -> stable id: matched directly off roster.ts's own `label` field (only cosmetic
// difference from the handoff is "·" vs "/" as the group/number separator), cross-checked
// against the authoritative GROUPS/BOSSES tables in mom-program-control/tools/
// generate_creature_reference_board.py and generate_creature_expansion_boards.py.
//
// D6 22 Sept revision: Pearl · Orb 3, Pearl · Orb 5 and Shellcap · Manyarm 3 are approved and
// kept (see design.ts REJECTED_BODY_IDS comment). The 4 hidden rejects (Seed · Pearo 3 & 4,
// Monolith · Tanka 4, Four-legged 8) are not in this roster at all -- see design.ts
// REJECTED_BODY_IDS, reused below as the "no rejected id present" guard.
//
// unlockRule/renderRecipe are placeholders: D26 leaves exact unlock thresholds unauthorized and
// the production pixel-art recipe is a later rank (handoff §9 step 2). Nothing here invents a
// number or a recipe.
import {REJECTED_BODY_IDS} from './design';
export {REJECTED_BODY_IDS};

export const TRACK_IDS = ['chest', 'quads', 'glutes', 'arms-shoulders', 'yoga', 'martial-arts', 'cardio', 'meditation'] as const;
export type TrackId = typeof TRACK_IDS[number];

export type TrackPlacement = {
 stableId: string;
 displayName: string; // roster.ts label
 tracks: readonly TrackId[]; // >1 entry only for the intentional Spade · Arch 1 dual
 petEligible: boolean;
 mountEligible: boolean;
 bossOf?: TrackId; // starting-boss assignment per 06-workout-bosses-and-meditation-pets.png, if any
 sourceAsset: string; // GLB path, relative to the repo root
 license: string;
 unlockRule: 'tbd'; // placeholder -- D26 has not authorized thresholds yet
 renderRecipe: 'tbd'; // placeholder -- production sprite recipe not authorized yet
};

const LICENSE = 'Original artwork -- MYR5 alien pipeline (Tripo Studio capture by Ian, low-poly re-export, Claude eval); no third-party license asserted (see creature/NOTICE.md).';
const glb = (stableId: string) => `creature/models/${stableId}.glb`;

type Row = [stableId: string, displayName: string, tracks: TrackId[], petEligible: boolean, mountEligible: boolean, bossOf?: TrackId];

const ROWS: readonly Row[] = [
 // --- Meditation pet family (10; handoff §2/§4) ---
 ['roster/23-blob-texture-bodies--blob_creature_3d_model', 'Blob 1', ['meditation'], true, false],
 ['roster/18-quad-all--dragon_creature_3d_model', 'Four-legged 1', ['meditation'], true, false],
 ['roster/18-quad-all--fantasy_creature_3d_model1', 'Four-legged 2', ['meditation'], true, false],
 ['roster/18-quad-all--fantasy_creature_3d_model3', 'Four-legged 3', ['meditation'], true, false],
 ['roster/18-quad-all--four-legged_robot_3d_model', 'Four-legged 4', ['meditation'], true, false],
 ['roster/18-quad-all--quadruped_robot_3d_model1', 'Four-legged 5', ['meditation'], true, false],
 ['roster/18-quad-all--quadruped_robot_3d_model', 'Four-legged 6', ['meditation'], true, false],
 ['roster/18-quad-all--robotic_dog_3d_model', 'Four-legged 7', ['meditation'], true, true, 'meditation'], // starting boss + mount candidate
 ['roster/12-seedpod-snailslug--stylized_slug_3d_model', 'Seedpod · Snailslug 1', ['meditation'], true, false],
 ['roster/12-seedpod-snailslug--stylized_worm_3d_model', 'Seedpod · Snailslug 2', ['meditation'], true, false],
 // Meditation boss-only -- explicitly NOT pet/mount (handoff §2 classification correction).
 ['roster/14-chisel-spire--low_poly_robot_3d_model', 'Chisel · Spire 2', ['meditation'], false, false],

 // --- Cardio ---
 ['roster/07-bulb-sphereling--humanoid_robot_3d_model', 'Bulb · Sphereling 2', ['cardio'], false, false],
 ['roster/03-pearl-orb-ring--ringed_humanoid_3d_model', 'Pearl · Orb 3', ['cardio'], false, false], // D6 22 Sept revision: approved, kept
 ['roster/06-ridge-triad--robot_3d_model1', 'Ridge · Triad 2', ['cardio'], false, false],
 ['roster/03-pearl-orb-ring--robot_3d_model', 'Pearl · Orb 4', ['cardio'], false, false],
 ['roster/20-lume--robotic_figure_3d_model', 'Lume 1', ['cardio'], false, false, 'cardio'],

 // --- Arms + Shoulders ---
 ['roster/02-taper-tallstalk--humanoid_robot_3d_model1', 'Taper · Tallstalk 2', ['arms-shoulders'], false, false],
 ['roster/19-genie-multi--multi-armed_humanoid_3d_model1', 'Genie · Multi 2', ['arms-shoulders'], false, false],
 ['roster/19-genie-multi--multi-armed_humanoid_3d_model', 'Genie · Multi 3', ['arms-shoulders'], false, false],
 ['roster/17-shellcap-manyarm--mushroom_creature_3d_model', 'Shellcap · Manyarm 2', ['arms-shoulders'], false, false],
 ['roster/17-shellcap-manyarm--mushroom_robot_3d_model', 'Shellcap · Manyarm 3', ['arms-shoulders'], false, false], // D6 22 Sept revision: approved, kept
 ['roster/23-blob-texture-bodies--patchwork_plush_figure_3d_model', 'Blob 4', ['arms-shoulders'], false, false],
 ['roster/08-shard-asym--robot_3d_model4', 'Shard · Asym 2', ['arms-shoulders'], false, false, 'arms-shoulders'],

 // --- Chest (Spade · Arch 1 is the intentional dual; its martial-arts placement lives here too) ---
 ['roster/06-ridge-triad--geometric_robot_3d_model1', 'Ridge · Triad 1', ['chest'], false, false],
 ['roster/08-shard-asym--geometric_robot_3d_model', 'Shard · Asym 1', ['chest'], false, false],
 ['roster/16-spade-arch--pyramid_head_figure_3d_model', 'Spade · Arch 1', ['chest', 'martial-arts'], false, false],
 ['roster/04-crest-wedge--robot_creature_3d_model', 'Crest · Wedge 1', ['chest'], false, false],
 ['roster/16-spade-arch--stylized_humanoid_3d_model', 'Spade · Arch 2', ['chest'], false, false, 'chest'],

 // --- Glutes ---
 ['roster/23-blob-texture-bodies--honeycomb_humanoid_3d_model', 'Blob 3', ['glutes'], false, false],
 ['roster/23-blob-texture-bodies--sand_creature_3d_model', 'Blob 5', ['glutes'], false, false],
 ['roster/03-pearl-orb-ring--stylized_3d_character1', 'Pearl · Orb 5', ['glutes'], false, false], // D6 22 Sept revision: approved, kept
 ['roster/03-pearl-orb-ring--stylized_humanoid_figure_3d_model', 'Pearl · Orb 6', ['glutes'], false, false, 'glutes'],

 // --- Quads ---
 ['roster/15-orbital-coili--robot_character_3d_model', 'Orbital · Coili 1', ['quads'], false, false],
 ['roster/13-fan-split--stylized_3d_character2', 'Fan · Split 1', ['quads'], false, false],
 ['roster/22-curve--stylized_cartoon_figure_3d_model', 'Curve 2', ['quads'], false, false, 'quads'],

 // --- Yoga ---
 ['roster/10-petal-wisp--fantasy_creature_3d_model4', 'Petal · Wisp 3', ['yoga'], false, false],
 ['roster/19-genie-multi--fantasy_creature_3d_model', 'Genie · Multi 1', ['yoga'], false, false],
 ['roster/10-petal-wisp--ghost_character_3d_model', 'Petal · Wisp 2', ['yoga'], false, false],
 ['roster/08-shard-asym--stylized_action_figure_3d_model', 'Shard · Asym 4', ['yoga'], false, false],
 ['roster/22-curve--stylized_alien_3d_model', 'Curve 1', ['yoga'], false, false],
 ['roster/10-petal-wisp--stylized_creature_3d_model', 'Petal · Wisp 1', ['yoga'], false, false],
 ['roster/19-genie-multi--stylized_octopus_3d_model', 'Genie · Multi 4', ['yoga'], false, false, 'yoga'],

 // --- Martial Arts (Spade · Arch 1 dual is listed under Chest above, not repeated here) ---
 ['roster/09-monolith-tanka--boxy_humanoid_3d_model', 'Monolith · Tanka 2', ['martial-arts'], false, false],
 ['roster/11-anvil-cask--clay-style_robot_3d_model', 'Anvil · Cask 1', ['martial-arts'], false, false],
 ['roster/05-slope-bobble--clay_humanoid_figure_3d_model', 'Slope · Bobble 1', ['martial-arts'], false, false],
 ['roster/14-chisel-spire--cone_head_3d_model', 'Chisel · Spire 1', ['martial-arts'], false, false],
 ['roster/08-shard-asym--fantasy_creature_3d_model2', 'Shard · Asym 3', ['martial-arts'], false, false],
 ['roster/09-monolith-tanka--mini_robot_3d_model', 'Monolith · Tanka 3', ['martial-arts'], false, false],
 ['roster/09-monolith-tanka--robot_3d_model3', 'Monolith · Tanka 5', ['martial-arts'], false, false],
 ['roster/13-fan-split--stylized_toy_3d_model', 'Fan · Split 2', ['martial-arts'], false, false, 'martial-arts'],
];

export const TRACK_PLACEMENTS: readonly TrackPlacement[] = ROWS.map(
 ([stableId, displayName, tracks, petEligible, mountEligible, bossOf]) => ({
  stableId, displayName, tracks, petEligible, mountEligible, bossOf,
  sourceAsset: glb(stableId), license: LICENSE, unlockRule: 'tbd', renderRecipe: 'tbd',
 }),
);
