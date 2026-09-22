// Per-variant eye metadata, keyed by stable model id (roster.ts `id`, or 'myr5').
// Source: plan/reports/audit-shapes.md + plan/reports/roster-sheet.md (handoff §5), numbering
// resolved to roster.ts (app) numbering per coordinator decision during Rank 3 (D6-numbering).
//
// eyeScale/eyeOffset are intentionally left UNSET here: the owner reviews the before/after renders
// in plan/reports/eyes/ and supplies per-model numbers; a follow-up worker fills them in. Only flipX
// is filled in this pass, because that list is unambiguous data (handoff §5 "Facing direction").
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
};
