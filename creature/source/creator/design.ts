import {EYE_LAYOUTS,type EyeLayout} from './eye-layouts';
import {COACHES,type CoachId} from './coaching';
import {PUPILS,type PupilShape} from './pupils';
import {STYLES as HAND_STYLES} from './catalog';
import {ROSTER} from './roster';
export const REGIONS=['head','eye','collar','body','arms','feet'] as const;
export type Region=typeof REGIONS[number];
export const LABELS:Record<Region,string>={head:'Crown & scales',eye:'Eyes & pupils',collar:'Shaggy collar',body:'Body',arms:'Arms & hands',feet:'Legs & feet'};
export const STYLES=[{...HAND_STYLES[0],name:'Original MYR5',primary:'#7946aa',secondary:'#351344',accent:'#b373d4',roughness:.62},...HAND_STYLES.slice(1)];
export const PICKER_STYLES=STYLES.filter(style=>![8,11,22].includes(style.id));
// Every creature model shipped with the app. Roster ids are generated from the Blender pipeline (creator/roster.ts).
export const BODIES:readonly {id:string;label:string;group:string}[]=[{id:'myr5',label:'Original MYR5',group:'MYR5'},...ROSTER];
// The review rejects (D6: original 63/7 review wins). Kept in BODIES/roster.ts and fully
// loadable/renderable (a saved recipe pointing at one still works) — just excluded from user-facing
// pickers below. Numbering resolved to roster.ts (app) numbering per coordinator decision (D6-numbering).
// Owner correction during Rank 3: Pearl · Orb 3 & 5 and Shellcap · Manyarm 3 are kept as approved
// models (per the approved roster board, outputs/visual-boards/01-approved-model-roster.png) — only
// these 4 are actually hidden.
export const REJECTED_BODY_IDS=new Set<string>([
 'roster/01-seed-pearo--white_3d_character_model', // Seed · Pearo 3
 'roster/01-seed-pearo--blank_humanoid_figure_3d_model', // Seed · Pearo 4
 'roster/09-monolith-tanka--robot_3d_model2', // Monolith · Tanka 4
 'roster/18-quad-all--stylized_quadruped_3d_model', // Four-legged 8
]);
// What user-facing pickers (body/head/arms/feet selects) should offer. Do not filter BODIES itself —
// `known()` below (and any saved recipe) must keep accepting rejected ids.
export const PICKER_BODIES=BODIES.filter(b=>!REJECTED_BODY_IDS.has(b.id));
export type BodyId=string;
// Mix-and-match: each limb region may come from a different creature; unset means "same as body".
export const PART_SOURCES=['headFrom','armsFrom','feetFrom'] as const;
export type PartSource=typeof PART_SOURCES[number];
const known=(id:unknown)=>typeof id==='string'&&BODIES.some(b=>b.id===id);
// A region can carry a decoupled texture+colour choice instead of (or on top of) the
// legacy single `styles` index. Absent = keep using the legacy numeric style for that region.
export type MaterialChoice={textureId:string;colorId:string;sparkle:number;metallic:number};
const validChoice=(v:unknown):v is MaterialChoice=>!!v&&typeof v==='object'&&typeof (v as any).textureId==='string'&&typeof (v as any).colorId==='string'&&Number.isFinite((v as any).sparkle)&&(v as any).sparkle>=0&&(v as any).sparkle<=1&&Number.isFinite((v as any).metallic)&&(v as any).metallic>=0&&(v as any).metallic<=1;
const validMaterials=(m:unknown):boolean=>m===undefined||(!!m&&typeof m==='object'&&!Array.isArray(m)&&Object.entries(m as object).every(([r,v])=>REGIONS.includes(r as Region)&&validChoice(v)));
export type Design={version:1;styles:Record<Region,number>;eye:'open'|'sleepy'|'wide';fur:number;iris:number;pupil:PupilShape;pupilSize:number;detail:number;coach:CoachId;fingers:number;toes:number;eyeLayout:EyeLayout;body:BodyId;headFrom:BodyId;armsFrom:BodyId;feetFrom:BodyId;materials?:Partial<Record<Region,MaterialChoice>>};
export const fresh=():Design=>({version:1,styles:{head:0,eye:0,collar:0,body:0,arms:0,feet:0},eye:'open',fur:1,iris:1,pupil:'round',pupilSize:1,detail:1,coach:'supportive',fingers:4,toes:3,eyeLayout:'single',body:'myr5',headFrom:'myr5',armsFrom:'myr5',feetFrom:'myr5'});
export function parseRecipe(raw:string):Design{const d=JSON.parse(raw);d.pupil??='round';d.pupilSize??=1;d.detail??=1;d.coach??='supportive';d.fingers??=4;d.toes??=3;d.eyeLayout??='single';if(!known(d.body))d.body='myr5';for(const k of PART_SOURCES)if(!known(d[k]))d[k]=d.body;if(!Number.isInteger(d.fingers)||d.fingers<2||d.fingers>6||!Number.isInteger(d.toes)||d.toes<1||d.toes>6||!Object.hasOwn(EYE_LAYOUTS,d.eyeLayout)||d.version!==1||!d.styles||!REGIONS.every(r=>Number.isInteger(d.styles[r])&&d.styles[r]>=0&&d.styles[r]<STYLES.length)||!['open','sleepy','wide'].includes(d.eye)||!Number.isFinite(d.fur)||d.fur<.65||d.fur>1.4||!Number.isFinite(d.iris)||d.iris<.7||d.iris>1.25||!PUPILS.some(p=>p[0]===d.pupil)||!Number.isFinite(d.pupilSize)||d.pupilSize<.6||d.pupilSize>1.15||!Number.isFinite(d.detail)||d.detail<.5||d.detail>1.5||!COACHES.some(c=>c.id===d.coach)||!validMaterials(d.materials))throw Error('Choose a valid MYR5 recipe.');return {version:1,styles:Object.fromEntries(REGIONS.map(r=>[r,d.styles[r]])) as Design['styles'],eye:d.eye,fur:d.fur,iris:d.iris,pupil:d.pupil,pupilSize:d.pupilSize,detail:d.detail,coach:d.coach,fingers:d.fingers,toes:d.toes,eyeLayout:d.eyeLayout,body:d.body,headFrom:d.headFrom,armsFrom:d.armsFrom,feetFrom:d.feetFrom,materials:d.materials};}
