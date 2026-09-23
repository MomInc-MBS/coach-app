// Per-variant eye metadata, keyed by stable model id (roster.ts `id`, or 'myr5').
// Source: plan/reports/audit-shapes.md + plan/reports/roster-sheet.md (handoff §5), numbering
// resolved to roster.ts (app) numbering per coordinator decision during Rank 3 (D6-numbering).
//
// flipX: handoff §5 "Facing direction" (Rank 3). eyeScale/eyeOffset: Rank 3b priority list only
// (handoff §5 "Eye anchoring"), pending owner review of plan/reports/eyes-review.png. eyeScale is
// absolute: it replaces the head-width scale x 0.65 global multiplier (assemble.ts), not a factor on it.
export type EyeOverride={eyeScale?:number;eyeOffset?:[number,number,number];flipX?:boolean};

export const EYE_OVERRIDES:Record<string,EyeOverride>={
 'roster/01-seed-pearo--blank_toy_figure_3d_model':{flipX:true}, // Seed · Pearo 5
 'roster/03-pearl-orb-ring--abstract_humanoid_3d_model':{flipX:true}, // Pearl · Orb 1
 'roster/05-slope-bobble--clay_humanoid_figure_3d_model':{flipX:true}, // Slope · Bobble 1
 'roster/08-shard-asym--geometric_robot_3d_model':{flipX:true}, // Shard · Asym 1
 'roster/08-shard-asym--robot_3d_model4':{flipX:true}, // Shard · Asym 2
 'roster/08-shard-asym--fantasy_creature_3d_model2':{flipX:true}, // Shard · Asym 3
 'roster/09-monolith-tanka--3d_robot_model':{flipX:true}, // Monolith · Tanka 1
 'roster/09-monolith-tanka--robot_3d_model3':{flipX:true}, // Monolith · Tanka 5
 'roster/10-petal-wisp--stylized_creature_3d_model':{flipX:true}, // Petal · Wisp 1
 'roster/12-seedpod-snailslug--stylized_worm_3d_model':{flipX:true}, // Seedpod · Snailslug 2
 'roster/13-fan-split--stylized_3d_character2':{flipX:true}, // Fan · Split 1
 'roster/17-shellcap-manyarm--3d_character_figurine':{flipX:true}, // Shellcap · Manyarm 1
 'roster/18-quad-all--quadruped_robot_3d_model1':{flipX:true}, // Four-legged 5
 'roster/20-lume--robotic_figure_3d_model':{flipX:true}, // Lume 1 ("Loom 1" in the handoff)
 'roster/23-blob-texture-bodies--patchwork_plush_figure_3d_model':{flipX:true}, // Blob 4

 // Rank 3b: priority eye-anchoring corrections (handoff §5 "Eye anchoring"), numbers tuned against
 // plan/reports/eyes-review.png (front + 3/4 + mid-animation renders). eyeOffset.z is intentionally
 // never used here: for front-facing eyes (yaw 0) `eyePosition()` in creator/anatomy.ts derives z from
 // the head's own eye_anchor surface point, not from the offset — only x/y and eyeScale reach the render.
 'roster/18-quad-all--wooden_four-legged_robot_3d_model':{eyeScale:0.42}, // Four-legged 9 — floating: eye scale was clamped to 1.2x (this head is very wide), 0.65x of that still dwarfed the head; shrinking it seats it on the face instead of bulging off it.
 'roster/18-quad-all--wooden_robot_3d_model':{eyeOffset:[0,0.46,0],eyeScale:0.4}, // Four-legged 10 — floating: eye_anchor sits mid-torso, well below the actual head ball; nudged up onto the head and shrunk slightly.
 'roster/18-quad-all--dragon_creature_3d_model':{eyeOffset:[0,0.16,0],eyeScale:0.42}, // Four-legged 1 — incorrect placement/excessive size: raised onto the head and shrunk off the muzzle.
 'roster/18-quad-all--fantasy_creature_3d_model1':{eyeOffset:[0,0.35,0],eyeScale:0.34}, // Four-legged 2 — incorrect placement/excessive size: raised into the wedge head and shrunk.
 'roster/23-blob-texture-bodies--cute_blob_creature_3d_model':{eyeOffset:[0.222,0,0]}, // Blob 2 — head sub-mesh is off-centre (-0.22 on x) relative to the body; cancels that so the eye centers on the creature.
 'roster/10-petal-wisp--ghost_character_3d_model':{eyeOffset:[0,-0.18,0],eyeScale:0.22}, // Petal · Wisp 2 (ghost_character) — smaller and lower per handoff.
 'roster/10-petal-wisp--fantasy_creature_3d_model4':{eyeOffset:[0,-0.18,0],eyeScale:0.22}, // Petal · Wisp 3 (fantasy_creature_3d_model4) — smaller and lower per handoff.
 'roster/22-curve--stylized_alien_3d_model':{eyeOffset:[0,-0.18,0]}, // Curve 1 — lower only per handoff; size unchanged.
};
