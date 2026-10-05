// Rank 4 runtime material registry: textures, colours and palettes.
// Adding a texture/colour/palette is a new entry (+ files for battle-pass packs) here —
// no other code changes. See plan/PLAN.md "Rank 4" and plan/reports/audit-materials.md.
import {STYLES as LEGACY_STYLES, COLOUR_SOURCE, type MaterialChoice, type Region} from './design';
import {isGranted, grantUnlock, type UnlockKind,migrateSavedCosmetics} from './unlock-store';
import {isGranted as ledgerGranted} from '../../../unlock-ledger.mjs';
import {currentCosmeticCoach,cosmeticId} from './unlock-store';
import PALETTE_DATA from './palettes.json';
import {TEXTURE_SWAP,FREE_TEXTURE_IDS,FREE_COLOURS} from '../../../battle-pass-rewards.mjs';
import {RECIPE_KEY} from '../profile';
import {builtinSurfaceProfile} from './material-patterns';
export {grantUnlock,FREE_COLOURS};

export type UnlockRule = 'default' | 'battle-pass' | 'aura-milestone';
export type Track = 'chest' | 'quads' | 'glutes' | 'arms' | 'yoga' | 'martial-arts' | 'cardio' | 'meditation';

export type TextureDef = {
 id: string; displayName: string; unlockRule: UnlockRule;
 track?: Track; passLevel?: 1 | 3 | 5; packId?: string; legacy?: boolean;
 familyId: number;        // feeds surfaceSample()'s procedural pattern switch in material-language.ts
 defaultColorId: string;  // colour used until the player chooses another
};
export type ColorDef = { id: string; displayName: string; unlockRule: UnlockRule; primary: string; secondary: string; accent: string; packId?: string };
// D32: a palette is a primary/secondary/accent triad (the same roles the tint uses). Aura
// palettes carry unlockAtDay; battle-pass palettes carry `reward` = the slot that grants them
// ('<bossId>:L<n>' or 'food:L<n>', read by battle-pass-rewards.mjs).
export type PaletteDef = { id: string; displayName: string; tagline: string; unlockRule: 'aura-milestone' | 'battle-pass'; unlockAtDay?: number; reward?: string; colors: [string, string, string] };

const isUnlocked = (kind: UnlockKind, item: { id: string; unlockRule: UnlockRule },coachId?:string) => item.unlockRule === 'default' || isGranted(kind, item.id,typeof coachId==='string'?coachId:undefined);
// R18 G2: a single-colour def is free exactly when its primary is one of the 15 free hexes (battle-pass-rewards.mjs FREE_COLOURS).
const colourRule = (c: { primary: string }): UnlockRule => FREE_COLOURS.includes(c.primary.toLowerCase()) ? 'default' : 'battle-pass';
export const hasCoach64BitSkin = (coachId=currentCosmeticCoach()) => ledgerGranted('boss-skin',cosmeticId(typeof coachId==='string'?coachId:currentCosmeticCoach(),`${typeof coachId==='string'?coachId:currentCosmeticCoach()}-skin`));
export const isTextureUnlocked = (t: TextureDef,coachId?:string) => t.id==='coach-64-bit'?hasCoach64BitSkin(coachId):isUnlocked('texture', t,coachId);
export const isColorUnlocked = (c: ColorDef,coachId?:string) => isUnlocked('color', c,coachId);
export const isPaletteUnlocked = (p: PaletteDef,coachId?:string) => isUnlocked('palette', p,coachId);

// --- Flat + Clay: always unlocked, procedural, never downloaded (PLAN §6.1). ---
// familyId 30/31 have matching cases added to surfaceSample() in material-language.ts.
const FLAT_BASE = { id: 30, name: 'Flat', realm: '', primary: '#c7c3ce', secondary: '#6d6a75', accent: '#ffffff', emissive: '#000000', roughness: .55, metalness: 0, detail: 'flat' } as const;
const CLAY_BASE = { id: 31, name: 'Clay', realm: '', primary: '#b7a68e', secondary: '#7a6b57', accent: '#ddcdb3', emissive: '#000000', roughness: .92, metalness: 0, detail: 'clay' } as const;
export const FLAT_TEXTURE: TextureDef = { id: 'flat', displayName: 'Flat', unlockRule: 'default', familyId: FLAT_BASE.id, defaultColorId: '#7f7d78' };
const CLAY_TEXTURE: TextureDef = { id: 'clay', displayName: 'Clay', unlockRule: 'default', familyId: CLAY_BASE.id, defaultColorId: '#c4a77d' };

// --- The 22 (well, 23: 0-22) existing procedural surface families keep working exactly as
// before for legacy `styles` recipes, and are also exposed as ordinary registry textures +
// their historical colour, `legacy:true`, unlockRule 'default' -- except the 7 that #140 moved
// into the battle pass (LEGACY_TEXTURES, below the battle-pass table they take slots from). ---
const LEGACY_COLORS: ColorDef[] = LEGACY_STYLES.map(s => ({ id: 'legacy-color-' + s.id, displayName: s.name + ' (original)', unlockRule: colourRule(s), primary: s.primary, secondary: s.secondary, accent: s.accent }));

// --- Simple default colours: "basic colours auto" (audit M7). Any of these tints any texture. ---
const SIMPLE_COLORS: ColorDef[] = ([
 { id: 'default-slate', displayName: 'Slate', unlockRule: 'default', primary: '#8b8f9a', secondary: '#4a4d55', accent: '#e7e9ee' },
 { id: 'default-clay', displayName: 'Warm Clay', unlockRule: 'default', primary: '#b7a68e', secondary: '#7a6b57', accent: '#ddcdb3' },
 { id: 'default-ruby', displayName: 'Ruby', unlockRule: 'default', primary: '#a23b4a', secondary: '#4f1620', accent: '#f2a3ae' },
 { id: 'default-sapphire', displayName: 'Sapphire', unlockRule: 'default', primary: '#2d5aa0', secondary: '#122a4d', accent: '#a9c9f5' },
 { id: 'default-moss', displayName: 'Moss', unlockRule: 'default', primary: '#4c7a3f', secondary: '#20351a', accent: '#c3e6a8' },
 { id: 'default-gold', displayName: 'Gold', unlockRule: 'default', primary: '#c9a13a', secondary: '#5f4a15', accent: '#ffe9a8' },
 { id: 'default-charcoal', displayName: 'Charcoal', unlockRule: 'default', primary: '#333238', secondary: '#131318', accent: '#8d8d96' },
 { id: 'default-blush', displayName: 'Blush', unlockRule: 'default', primary: '#d98fa0', secondary: '#7a3d49', accent: '#ffdbe4' },
] as ColorDef[]).map(c => ({ ...c, unlockRule: colourRule(c) }));

// --- Battle-pass textures: PLAN §6.2 / plan/muse/item-catalog.json (D14: 3 per style, D16: L1/L3/L5).
// Every catalogue option below has a stable built-in procedural pattern and PBR profile.
// Built-in surfaces render locally; unlock policy remains independent from pattern availability. ---
const SLOT_LEVEL: Record<string, 1 | 3 | 5> = { 'texture-1': 1, 'texture-2': 3, 'texture-3': 5 };
const BATTLE_PASS_SOURCE: { id: string; name: string; slot: string; track: string; familyId:number }[] = [
 { id: 'chest-plate-steel', name: 'Plate Steel', slot: 'texture-1', track: 'chest',familyId:32 },
 { id: 'chest-rubber-grip', name: 'Rubber Grip', slot: 'texture-2', track: 'chest',familyId:33 },
 { id: 'chest-chain-mail', name: 'Chain Mail', slot: 'texture-3', track: 'chest',familyId:34 },
 { id: 'quads-track-rubber', name: 'Track Rubber', slot: 'texture-1', track: 'quads',familyId:35 },
 { id: 'quads-denim', name: 'Denim', slot: 'texture-2', track: 'quads',familyId:36 },
 { id: 'quads-hex-tread', name: 'Hex Tread', slot: 'texture-3', track: 'quads',familyId:37 },
 { id: 'glutes-sweatshirt-fleece', name: 'Sweatshirt Fleece', slot: 'texture-1', track: 'glutes',familyId:38 },
 { id: 'glutes-quilted', name: 'Quilted', slot: 'texture-2', track: 'glutes',familyId:39 },
 { id: 'glutes-peach', name: 'Speckled', slot: 'texture-3', track: 'glutes',familyId:40 },
 { id: 'arms-hammered-bronze', name: 'Hammered Bronze', slot: 'texture-1', track: 'arms',familyId:41 },
 { id: 'arms-rope', name: 'Fine Stripe', slot: 'texture-2', track: 'arms',familyId:42 },
 { id: 'arms-leather', name: 'Snake Skin', slot: 'texture-3', track: 'arms',familyId:43 },
 { id: 'yoga-cork', name: 'Holey', slot: 'texture-1', track: 'yoga',familyId:44 },
 { id: 'yoga-woven-mat', name: 'Woven Mat', slot: 'texture-2', track: 'yoga',familyId:45 },
 { id: 'yoga-petal', name: 'Petal', slot: 'texture-3', track: 'yoga',familyId:46 },
 { id: 'martial-arts-canvas-gi', name: 'Graph Paper', slot: 'texture-1', track: 'martial-arts',familyId:47 },
 { id: 'martial-arts-bamboo', name: 'Bamboo', slot: 'texture-2', track: 'martial-arts',familyId:48 },
 { id: 'martial-arts-dragon-scale', name: 'Dragon Scale', slot: 'texture-3', track: 'martial-arts',familyId:49 },
 { id: 'cardio-mesh', name: 'Cool Graph Paper', slot: 'texture-1', track: 'cardio',familyId:50 },
 { id: 'cardio-terry-cloth', name: 'Terry Cloth', slot: 'texture-2', track: 'cardio',familyId:51 },
 { id: 'cardio-pebble-path', name: 'Pebble Path', slot: 'texture-3', track: 'cardio',familyId:52 },
 { id: 'meditation-sand-garden', name: 'Wiggles', slot: 'texture-1', track: 'meditation',familyId:53 },
 { id: 'meditation-river-stone', name: 'River Stone', slot: 'texture-2', track: 'meditation',familyId:54 },
 { id: 'meditation-moss', name: 'Moss', slot: 'texture-3', track: 'meditation',familyId:55 },
];
// R18 G1: only FREE_TEXTURE_IDS (battle-pass-rewards.mjs) are free; TEXTURE_SWAP now just names which legacy
// texture sits in a battle-pass slot (and drives the #140 grandfather below), it never unlocks anything.
const SWAPPED_IN = new Map<string, string>(Object.entries(TEXTURE_SWAP).map(([freed, [legacyId]]) => [legacyId as string, freed]));
const textureRule = (id: string): UnlockRule => FREE_TEXTURE_IDS.includes(id) ? 'default' : 'battle-pass';
const BATTLE_PASS_TEXTURES: TextureDef[] = BATTLE_PASS_SOURCE.map(t => ({ id: t.id, displayName: t.name, unlockRule: textureRule(t.id), track: t.track as Track, passLevel: SLOT_LEVEL[t.slot], packId: 'pack-' + t.track, familyId: t.familyId, defaultColorId: '#7f7d78' }));
const LEGACY_TEXTURES: TextureDef[] = LEGACY_STYLES.map(s => {
 const id = 'legacy-' + s.id, slot = BATTLE_PASS_TEXTURES.find(t => t.id === SWAPPED_IN.get(id));
 return { id, displayName: s.name, unlockRule: textureRule(id), track: slot?.track, passLevel: slot?.passLevel, legacy: true, familyId: s.id, defaultColorId: 'legacy-color-' + s.id };
});

export const COACH_64_BIT_TEXTURE:TextureDef={id:'coach-64-bit',displayName:'64-bit Pixel Finish',unlockRule:'battle-pass',familyId:56,defaultColorId:'#7f7d78'};
export const TEXTURES: TextureDef[] = [FLAT_TEXTURE, CLAY_TEXTURE, ...LEGACY_TEXTURES, ...BATTLE_PASS_TEXTURES,COACH_64_BIT_TEXTURE];
export const COLORS: ColorDef[] = [...SIMPLE_COLORS, ...LEGACY_COLORS];

// --- Palettes: palettes.json next to this file (plan/muse/palettes.json cut to triads, plus the
// D32 battle-pass fill). Adding a palette is a new row there. ---
export const PALETTES: PaletteDef[] = PALETTE_DATA.map(({ name, ...p }) => ({ ...p, displayName: name }) as PaletteDef);

export const findTexture = (id: string) => TEXTURES.find(t => t.id === id);
export const findColor = (id: string) => COLORS.find(c => c.id === id);
export const findPalette = (id: string) => PALETTES.find(p => p.id === id);
export function textureDefaultMetalness(id:string):number|undefined {
 const texture=findTexture(id);if(!texture)return undefined;
 return builtinSurfaceProfile(texture.familyId)?.metalness??(texture.legacy?LEGACY_STYLES[texture.familyId]?.metalness:texture.id==='clay'?CLAY_BASE.metalness:FLAT_BASE.metalness);
}

function triadFromPalette(p: PaletteDef) { const [primary, secondary, accent] = p.colors; return { primary, secondary, accent }; }

// R18 G2/G3: a colour channel holds ONE colour. A "#rrggbb" colorId is a single hex: free if it is one of
// the 15 FREE_COLOURS, otherwise owned when any owned colour or palette contains it (so unlocking a
// palette gives you its three hexes for the Body/Head/Eyes rows). Existing ids (default-ruby, pal-03, ...) still work.
const HEX = /^#[0-9a-f]{6}$/i;
const mix = (hex: string, to: number, t: number) => '#' + [1, 3, 5].map(i => Math.round(parseInt(hex.slice(i, i + 2), 16) * (1 - t) + to * t).toString(16).padStart(2, '0')).join('');
const hexOwned = (hex: string,coachId?:string) => FREE_COLOURS.includes(hex) || COLORS.some(c => isColorUnlocked(c,coachId) && [c.primary, c.secondary, c.accent].some(h => h.toLowerCase() === hex)) || PALETTES.some(p => isPaletteUnlocked(p,coachId) && p.colors.some(h => h.toLowerCase() === hex));
/** A palette as three single-colour channel ids: primary -> body, secondary -> head, accent -> eyes. */
export const paletteChannelIds = (p: PaletteDef) => p.colors.map(h => h.toLowerCase()) as [string, string, string];

/** The tint triad for a colour, hex or palette id, or undefined if it doesn't exist or isn't unlocked yet
 * (`preview` paints a locked one too — the editor's look-before-you-unlock layer, never saved). */
export function colorTriad(id: string, preview = false,coachId?:string): { primary: string; secondary: string; accent: string } | undefined {
 if (HEX.test(id)) { const hex = id.toLowerCase(); return preview || hexOwned(hex,coachId) ? { primary: hex, secondary: mix(hex, 0, .55), accent: mix(hex, 255, .55) } : undefined; }
 const c = findColor(id); if (c) return preview || isColorUnlocked(c,coachId) ? { primary: c.primary, secondary: c.secondary, accent: c.accent } : undefined;
 const p = findPalette(id); if (p) return preview || isPaletteUnlocked(p,coachId) ? triadFromPalette(p) : undefined;
 return undefined;
}

/** True when a texture/colour/palette id is a registry item the player doesn't own yet (the UI shows just a lock).
 * Installed creature skins and unknown ids guard themselves and are never "locked" here. */
export function isLocked(id: string,coachId?:string): boolean {
 const t = findTexture(id); if (t) return !isTextureUnlocked(t,coachId);
 if (HEX.test(id)) return !hexOwned(id.toLowerCase(),coachId);
 const c = findColor(id); if (c) return !isColorUnlocked(c,coachId);
 const p = findPalette(id); if (p) return !isPaletteUnlocked(p,coachId);
 return false;
}

// #140 grandfather: a coach saved while the swapped-in legacy textures were still free keeps them.
// Once per device, on the first saved recipe any renderer sees (this module's load in the customizer,
// pod or ship, or a `myr5:recipe` handoff); grants only textures that recipe actually uses.
const SWAP_MIGRATED_KEY = 'myr5-texture-swap-v1';
export function grandfatherSwappedTextures(recipe?: { body?:string;materials?: Record<string, { textureId?: string } | undefined> } | null) {
 try {
  if (!recipe) return;
  migrateSavedCosmetics(recipe);
  if(localStorage.getItem(SWAP_MIGRATED_KEY))return;
  for (const choice of Object.values(recipe.materials ?? {})) if (choice?.textureId && SWAPPED_IN.has(choice.textureId)) grantUnlock('texture', choice.textureId,recipe.body);
  localStorage.setItem(SWAP_MIGRATED_KEY, '1');
 } catch { /* no storage or unreadable recipe: nothing to keep */ }
}
try { const raw = localStorage.getItem(RECIPE_KEY); if (raw) grandfatherSwappedTextures(JSON.parse(raw)); } catch { /* no storage */ }
globalThis.addEventListener?.('myr5:recipe', event => grandfatherSwappedTextures((event as CustomEvent).detail));

/**
 * The single seam between the old `styles[region]` numeric recipe and the new decoupled
 * texture+colour+sparkle+metallic recipe. Called once per region in assemble.ts.
 * No `choice` (old recipes, or a region nobody has re-customized) -> renders byte-for-byte
 * like today's STYLES[legacyIndex]. A `choice` resolves texture+colour independently and
 * always falls back to Flat/its default colour rather than ever throwing or loading nothing.
 * `preview` lets a locked texture/colour paint (editor preview only; save-look.ts guards saves).
 */
/** G3: the material choice a region really renders with. Body colour drives body, arms, feet and collar;
 * head and eyes have their own. Old saves map body<-body region, head<-head, eyes<-eye. */
export function regionChoice(materials: Partial<Record<Region, MaterialChoice>> | undefined, region: Region): MaterialChoice | undefined {
 const own = materials?.[region], source = materials?.[COLOUR_SOURCE[region]];
 return own && source && source !== own ? { ...own, colorId: source.colorId } : own;
}

export function resolveRegionMaterial(legacyIndex: number, choice?: MaterialChoice, preview = false,coachId?:string) {
 if (!choice) return { ...LEGACY_STYLES[legacyIndex], sparkle: 0 };
 const texture = findTexture(choice.textureId);
 const safeTexture = texture && (preview || isTextureUnlocked(texture,coachId)) && texture.familyId >= 0 ? texture : FLAT_TEXTURE;
 const profile=builtinSurfaceProfile(safeTexture.familyId);
 const base = safeTexture.legacy ? LEGACY_STYLES[safeTexture.familyId] : safeTexture.id === 'clay' ? CLAY_BASE : profile ? {id:profile.id,name:profile.name,realm:'',primary:'#8b8f9a',secondary:'#4a4d55',accent:'#e7e9ee',emissive:'#000000',roughness:profile.roughness,metalness:profile.metalness,detail:profile.name.toLowerCase().replace(/[^a-z0-9]+/g,'-')} : FLAT_BASE;
 const triad = colorTriad(choice.colorId, preview,coachId) ?? colorTriad(safeTexture.defaultColorId, preview,coachId) ?? base;
 const metalness = Number.isFinite(choice.metallic) ? Math.max(0, Math.min(1, choice.metallic)) : base.metalness;
 const sparkle = Number.isFinite(choice.sparkle) ? Math.max(0, Math.min(1, choice.sparkle)) : 0;
 return { ...base, ...triad, metalness, sparkle };
}
