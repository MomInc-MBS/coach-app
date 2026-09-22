// Rank 4 runtime material registry: textures, colours and palettes.
// Adding a texture/colour/palette is a new entry (+ files for battle-pass packs) here —
// no other code changes. See plan/PLAN.md "Rank 4" and plan/reports/audit-materials.md.
import {STYLES as LEGACY_STYLES, type MaterialChoice} from './design';
import {isGranted, grantUnlock, type UnlockKind} from './unlock-store';
export {grantUnlock};

export type UnlockRule = 'default' | 'battle-pass' | 'aura-milestone';
export type Track = 'chest' | 'quads' | 'glutes' | 'arms' | 'yoga' | 'martial-arts' | 'cardio' | 'meditation';

export type TextureDef = {
 id: string; displayName: string; unlockRule: UnlockRule;
 track?: Track; passLevel?: 1 | 3 | 5; packId?: string; legacy?: boolean;
 familyId: number;        // feeds surfaceSample()'s procedural pattern switch in material-language.ts
 defaultColorId: string;  // colour used until the player chooses another
};
export type ColorDef = { id: string; displayName: string; unlockRule: UnlockRule; primary: string; secondary: string; accent: string; packId?: string };
export type PaletteDef = { id: string; displayName: string; unlockRule: 'aura-milestone'; unlockAtDay: number; colors: [string, string, string, string, string] };

const isUnlocked = (kind: UnlockKind, item: { id: string; unlockRule: UnlockRule }) => item.unlockRule === 'default' || isGranted(kind, item.id);
export const isTextureUnlocked = (t: TextureDef) => isUnlocked('texture', t);
export const isColorUnlocked = (c: ColorDef) => isUnlocked('color', c);
export const isPaletteUnlocked = (p: PaletteDef) => isUnlocked('palette', p);

// --- Flat + Clay: always unlocked, procedural, never downloaded (PLAN §6.1). ---
// familyId 30/31 have matching cases added to surfaceSample() in material-language.ts.
const FLAT_BASE = { id: 30, name: 'Flat', realm: '', primary: '#c7c3ce', secondary: '#6d6a75', accent: '#ffffff', emissive: '#000000', roughness: .55, metalness: 0, detail: 'flat' } as const;
const CLAY_BASE = { id: 31, name: 'Clay', realm: '', primary: '#b7a68e', secondary: '#7a6b57', accent: '#ddcdb3', emissive: '#000000', roughness: .92, metalness: 0, detail: 'clay' } as const;
export const FLAT_TEXTURE: TextureDef = { id: 'flat', displayName: 'Flat', unlockRule: 'default', familyId: FLAT_BASE.id, defaultColorId: 'default-slate' };
const CLAY_TEXTURE: TextureDef = { id: 'clay', displayName: 'Clay', unlockRule: 'default', familyId: CLAY_BASE.id, defaultColorId: 'default-clay' };

// --- The 22 (well, 23: 0-22) existing procedural surface families keep working exactly as
// before for legacy `styles` recipes, and are also exposed as ordinary registry textures +
// their historical colour, `legacy:true`, unlockRule 'default' (no owner decision to relock them yet). ---
const LEGACY_TEXTURES: TextureDef[] = LEGACY_STYLES.map(s => ({ id: 'legacy-' + s.id, displayName: s.name, unlockRule: 'default', legacy: true, familyId: s.id, defaultColorId: 'legacy-color-' + s.id }));
const LEGACY_COLORS: ColorDef[] = LEGACY_STYLES.map(s => ({ id: 'legacy-color-' + s.id, displayName: s.name + ' (original)', unlockRule: 'default', primary: s.primary, secondary: s.secondary, accent: s.accent }));

// --- Simple default colours: "basic colours auto" (audit M7). Any of these tints any texture. ---
const SIMPLE_COLORS: ColorDef[] = [
 { id: 'default-slate', displayName: 'Slate', unlockRule: 'default', primary: '#8b8f9a', secondary: '#4a4d55', accent: '#e7e9ee' },
 { id: 'default-clay', displayName: 'Warm Clay', unlockRule: 'default', primary: '#b7a68e', secondary: '#7a6b57', accent: '#ddcdb3' },
 { id: 'default-ruby', displayName: 'Ruby', unlockRule: 'default', primary: '#a23b4a', secondary: '#4f1620', accent: '#f2a3ae' },
 { id: 'default-sapphire', displayName: 'Sapphire', unlockRule: 'default', primary: '#2d5aa0', secondary: '#122a4d', accent: '#a9c9f5' },
 { id: 'default-moss', displayName: 'Moss', unlockRule: 'default', primary: '#4c7a3f', secondary: '#20351a', accent: '#c3e6a8' },
 { id: 'default-gold', displayName: 'Gold', unlockRule: 'default', primary: '#c9a13a', secondary: '#5f4a15', accent: '#ffe9a8' },
 { id: 'default-charcoal', displayName: 'Charcoal', unlockRule: 'default', primary: '#333238', secondary: '#131318', accent: '#8d8d96' },
 { id: 'default-blush', displayName: 'Blush', unlockRule: 'default', primary: '#d98fa0', secondary: '#7a3d49', accent: '#ffdbe4' },
];

// --- Battle-pass textures: PLAN §6.2 / plan/muse/item-catalog.json (D14: 3 per style, D16: L1/L3/L5).
// No files exist yet — familyId -1 means "no renderable pattern"; resolveRegionMaterial() below
// falls back to Flat if one is ever selected before it is actually unlocked *and* delivered. ---
const SLOT_LEVEL: Record<string, 1 | 3 | 5> = { 'texture-1': 1, 'texture-2': 3, 'texture-3': 5 };
const BATTLE_PASS_SOURCE: { id: string; name: string; slot: string; track: string }[] = [
 { id: 'chest-plate-steel', name: 'Plate Steel', slot: 'texture-1', track: 'chest' },
 { id: 'chest-rubber-grip', name: 'Rubber Grip', slot: 'texture-2', track: 'chest' },
 { id: 'chest-chain-mail', name: 'Chain Mail', slot: 'texture-3', track: 'chest' },
 { id: 'quads-track-rubber', name: 'Track Rubber', slot: 'texture-1', track: 'quads' },
 { id: 'quads-denim', name: 'Denim', slot: 'texture-2', track: 'quads' },
 { id: 'quads-hex-tread', name: 'Hex Tread', slot: 'texture-3', track: 'quads' },
 { id: 'glutes-sweatshirt-fleece', name: 'Sweatshirt Fleece', slot: 'texture-1', track: 'glutes' },
 { id: 'glutes-quilted', name: 'Quilted', slot: 'texture-2', track: 'glutes' },
 { id: 'glutes-peach', name: 'Peach', slot: 'texture-3', track: 'glutes' },
 { id: 'arms-hammered-bronze', name: 'Hammered Bronze', slot: 'texture-1', track: 'arms' },
 { id: 'arms-rope', name: 'Rope', slot: 'texture-2', track: 'arms' },
 { id: 'arms-leather', name: 'Leather', slot: 'texture-3', track: 'arms' },
 { id: 'yoga-cork', name: 'Cork', slot: 'texture-1', track: 'yoga' },
 { id: 'yoga-woven-mat', name: 'Woven Mat', slot: 'texture-2', track: 'yoga' },
 { id: 'yoga-petal', name: 'Petal', slot: 'texture-3', track: 'yoga' },
 { id: 'martial-arts-canvas-gi', name: 'Canvas Gi', slot: 'texture-1', track: 'martial-arts' },
 { id: 'martial-arts-bamboo', name: 'Bamboo', slot: 'texture-2', track: 'martial-arts' },
 { id: 'martial-arts-dragon-scale', name: 'Dragon Scale', slot: 'texture-3', track: 'martial-arts' },
 { id: 'cardio-mesh', name: 'Mesh', slot: 'texture-1', track: 'cardio' },
 { id: 'cardio-terry-cloth', name: 'Terry Cloth', slot: 'texture-2', track: 'cardio' },
 { id: 'cardio-pebble-path', name: 'Pebble Path', slot: 'texture-3', track: 'cardio' },
 { id: 'meditation-sand-garden', name: 'Sand Garden', slot: 'texture-1', track: 'meditation' },
 { id: 'meditation-river-stone', name: 'River Stone', slot: 'texture-2', track: 'meditation' },
 { id: 'meditation-moss', name: 'Moss', slot: 'texture-3', track: 'meditation' },
];
const BATTLE_PASS_TEXTURES: TextureDef[] = BATTLE_PASS_SOURCE.map(t => ({ id: t.id, displayName: t.name, unlockRule: 'battle-pass', track: t.track as Track, passLevel: SLOT_LEVEL[t.slot], packId: 'pack-' + t.track, familyId: -1, defaultColorId: 'default-slate' }));

export const TEXTURES: TextureDef[] = [FLAT_TEXTURE, CLAY_TEXTURE, ...LEGACY_TEXTURES, ...BATTLE_PASS_TEXTURES];
export const COLORS: ColorDef[] = [...SIMPLE_COLORS, ...LEGACY_COLORS];

// --- Palettes: plan/muse/palettes.json (aura-milestone, unlockAtDay). Inlined — that plan/
// directory isn't part of this worktree's build (a battle-pass worker can regenerate this
// block from the source JSON if the palette list changes). ---
export const PALETTES: PaletteDef[] = [
 { id: 'pal-01', displayName: 'Morning Mist', unlockRule: 'aura-milestone', unlockAtDay: 5, colors: ['#F6E8E8', '#DCE9F5', '#CFE8D8', '#F5E6C8', '#E8D8F0'] },
 { id: 'pal-02', displayName: 'River Clay', unlockRule: 'aura-milestone', unlockAtDay: 10, colors: ['#8A6F55', '#C2A878', '#5C4A3A', '#D9C7A5', '#3E5C4B'] },
 { id: 'pal-03', displayName: 'Static Pop', unlockRule: 'aura-milestone', unlockAtDay: 15, colors: ['#111111', '#FFFFFF', '#FF3B30', '#34C759', '#0A84FF'] },
 { id: 'pal-04', displayName: 'Night Shift', unlockRule: 'aura-milestone', unlockAtDay: 20, colors: ['#1A1A2E', '#16213E', '#0F3460', '#533483', '#E94560'] },
 { id: 'pal-05', displayName: 'Tin Star', unlockRule: 'aura-milestone', unlockAtDay: 25, colors: ['#C0C0C8', '#8E8E96', '#E8E8F0', '#5A5A66', '#FFD166'] },
 { id: 'pal-06', displayName: 'Meadow Line', unlockRule: 'aura-milestone', unlockAtDay: 30, colors: ['#E3F2E1', '#BFE3C0', '#F9F3D9', '#F6C9B8', '#A8D5E2'] },
 { id: 'pal-07', displayName: 'Campfire', unlockRule: 'aura-milestone', unlockAtDay: 35, colors: ['#7A4A2B', '#C97B3D', '#E8A94C', '#4A2E1B', '#F5E0B8'] },
 { id: 'pal-08', displayName: 'Signal Jam', unlockRule: 'aura-milestone', unlockAtDay: 40, colors: ['#00E5FF', '#FF00E5', '#0A0A0A', '#F5F5F5', '#FFEA00'] },
 { id: 'pal-09', displayName: 'Deep Well', unlockRule: 'aura-milestone', unlockAtDay: 45, colors: ['#0B0F1A', '#1B2A4A', '#274156', '#3E6B7E', '#9AD1D4'] },
 { id: 'pal-10', displayName: 'Chrome Garden', unlockRule: 'aura-milestone', unlockAtDay: 50, colors: ['#D9DDE3', '#A6ACB8', '#6E7480', '#F2C14E', '#7FB069'] },
 { id: 'pal-11', displayName: 'Sorbet Stand', unlockRule: 'aura-milestone', unlockAtDay: 55, colors: ['#FFD6E0', '#C1F0F6', '#FFF3B0', '#D8F3DC', '#E4C1F9'] },
 { id: 'pal-12', displayName: 'Foundry Floor', unlockRule: 'aura-milestone', unlockAtDay: 60, colors: ['#2B2B30', '#6B6B75', '#B8B8C4', '#E8B44C', '#4CC9F0'] },
];

export const findTexture = (id: string) => TEXTURES.find(t => t.id === id);
export const findColor = (id: string) => COLORS.find(c => c.id === id);
export const findPalette = (id: string) => PALETTES.find(p => p.id === id);

const luminance = (hex: string) => { const n = parseInt(hex.slice(1), 16); return .2126 * (n >> 16 & 255) + .7152 * (n >> 8 & 255) + .0722 * (n & 255); };
// Palettes are five loose colours (not authored as a dark/mid/light ramp), so derive a
// tintable triad by sorting on perceived brightness. ponytail: a straight luminance sort is a
// blunt instrument for palettes with two equally-bright hues; good enough for a first pass.
function triadFromPalette(p: PaletteDef) { const sorted = [...p.colors].sort((a, b) => luminance(a) - luminance(b)); return { primary: sorted[2], secondary: sorted[0], accent: sorted[4] }; }

/** The tint triad for a colour or palette id, or undefined if it doesn't exist or isn't unlocked yet. */
export function colorTriad(id: string): { primary: string; secondary: string; accent: string } | undefined {
 const c = findColor(id); if (c) return isColorUnlocked(c) ? { primary: c.primary, secondary: c.secondary, accent: c.accent } : undefined;
 const p = findPalette(id); if (p) return isPaletteUnlocked(p) ? triadFromPalette(p) : undefined;
 return undefined;
}

/**
 * The single seam between the old `styles[region]` numeric recipe and the new decoupled
 * texture+colour+sparkle+metallic recipe. Called once per region in assemble.ts.
 * No `choice` (old recipes, or a region nobody has re-customized) -> renders byte-for-byte
 * like today's STYLES[legacyIndex]. A `choice` resolves texture+colour independently and
 * always falls back to Flat/its default colour rather than ever throwing or loading nothing.
 */
export function resolveRegionMaterial(legacyIndex: number, choice?: MaterialChoice) {
 if (!choice) return { ...LEGACY_STYLES[legacyIndex], sparkle: 0 };
 const texture = findTexture(choice.textureId);
 const safeTexture = texture && isTextureUnlocked(texture) && texture.familyId >= 0 ? texture : FLAT_TEXTURE;
 const base = safeTexture.legacy ? LEGACY_STYLES[safeTexture.familyId] : safeTexture.id === 'clay' ? CLAY_BASE : FLAT_BASE;
 const triad = colorTriad(choice.colorId) ?? colorTriad(safeTexture.defaultColorId) ?? base;
 const metalness = Number.isFinite(choice.metallic) ? Math.max(0, Math.min(1, choice.metallic)) : base.metalness;
 const sparkle = Number.isFinite(choice.sparkle) ? Math.max(0, Math.min(1, choice.sparkle)) : 0;
 return { ...base, ...triad, metalness, sparkle };
}
