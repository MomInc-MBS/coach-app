import {shipDetails} from './modules/ships/ship-catalog.mjs';
// Battle-pass reward table (rank 6b) — pure data + one lookup, no storage, no DOM.
// Board rows are D30 (the owner's achievements board, plan/handoff/achievements-board);
// item content is plan/muse/item-catalog.json, copied row-for-row below because this worktree
// has no plan/ dir at build time and root .json files are left out of the AGPL source offer
// (scripts/build.mjs). Regenerate by hand if the catalog changes. Food rows and the `keys`
// list are not copied: D32 gives Food no weapons/pet/boss (only palettes + bonuses, below), and
// keys are not pass rewards.
//
// Ladder per boss = D22 (L1 weapon 1 · L2 palette + boss texture · L3 weapon 2 · L4 pet ·
// L5 aura + boss skin) + D16 (the style's 3 textures at L1/L3/L5) + D17 (special at L3) —
// the same text as the board's LEVELS. D30 vs D21: D21 has one boss per family; D30 has rows
// of 3–6 consecutive bosses per track plus two shared ones. Following D30:
//  - boss looks (texture L2, skin L5) belong to each board boss, not to the family;
//  - a style's catalog items (2 weapons, 3 textures, special, aura, palette) exist once, so
//    they sit on the row's FIRST boss; D32 fills the other bosses' empty L1/L3/L4 with palettes
//    from creature/source/creator/palettes.json (each row's `reward` names its slot);
//  - D21 sharing still applies to pets: one pet per family, and the second row of a family
//    gets that family's substitute palette at L4 instead (resolved in battle-pass.mjs).

import PALETTES from './creature/source/creator/palettes.json' with {type:'json'};
import SKIN_CATALOG from './creature/source/creator/creature-skins.json' with {type:'json'};
import {FOOD_BONUS_DAMAGE_MULTIPLIER} from './combat-config.mjs';
import {STYLES as LEGACY_STYLES} from './creature/source/creator/catalog.ts';
import {FREE_TEXTURE_IDS,RETIRED_TEXTURE_IDS} from './creature/source/creator/texture-policy.mjs';
export {FREE_TEXTURE_IDS};

// D30 rows, top to bottom — ids/order/counts must match achievements-board.mjs TIERS.
export const ROWS=Object.freeze([
 {id:'strider',name:'Strider',track:'chest',bosses:6},
 {id:'ringer',name:'Ringer',track:'quads',bosses:5},
 {id:'manyarm',name:'Manyarm',track:'glutes',bosses:5},
 {id:'wedge',name:'Wedge',track:'arms-shoulders',bosses:5},
 {id:'warden',name:'Warden',track:null,bosses:1},
 {id:'blob',name:'Blob',track:'yoga',bosses:4},
 {id:'cap',name:'Cap',track:'martial-arts',bosses:3},
 {id:'stalk',name:'Stalk',track:'cardio',bosses:4},
 {id:'tanka',name:'Tanka',track:'meditation',bosses:4},
 {id:'lume',name:'Lume',track:null,bosses:1},
]);
export const LEVELS_PER_BOSS=5;
// Same ids/names the board builds: `${row}-${k}`, name numbered only in multi-boss rows.
export const BOSSES=Object.freeze(ROWS.flatMap(row=>Array.from({length:row.bosses},(_,i)=>({
 id:`${row.id}-${i+1}`,name:row.bosses>1?`${row.name} ${i+1}`:row.name,row:row.id,track:row.track,index:i+1,
}))));

// D25 track -> circuit.mjs step-track id, item-catalog `track`, D21 family, L2 palette.
// Palettes: L2 reuses the aura-milestone palettes (pal-01…12) — one per row, plus one D21
// substitute per two-row family. Every other palette slot comes from palettes.json `reward`.
export const TRACKS=Object.freeze({
 chest:{circuit:'chest',catalog:'chest',family:'push',name:'Chest',palette:'pal-01'},
 quads:{circuit:'legs',catalog:'quads',family:'legs',name:'Quads',palette:'pal-02'},
 glutes:{circuit:'hips',catalog:'glutes',family:'legs',name:'Glutes',palette:'pal-03'},
 'arms-shoulders':{circuit:'shoulders',catalog:'arms',family:'push',name:'Arms & Shoulders',palette:'pal-04'},
 yoga:{circuit:'yoga',catalog:'yoga',family:'flow',name:'Yoga',palette:'pal-05'},
 'martial-arts':{circuit:'martial-arts',catalog:'martial-arts',family:'motion',name:'Martial Arts',palette:'pal-06'},
 cardio:{circuit:'cardio',catalog:'cardio',family:'motion',name:'Cardio',palette:'pal-07'},
 meditation:{circuit:'meditation',catalog:'meditation',family:'meditation',name:'Meditation',palette:'pal-08'},
});
export const PET_SUBSTITUTE_PALETTE=Object.freeze({push:'pal-09',legs:'pal-10',motion:'pal-11'});

// Two additive post-download skin collections: all collection slots repeat at L1/L3/L5.
// This distribution depends only on each track's own ladder, never family grouping.
export const CREATURE_SKIN_REWARDS=Object.freeze(SKIN_CATALOG.skins.map(skin=>Object.freeze({
 kind:'creature-skin',id:skin.id,name:skin.displayName,line:`${skin.realm} creature finish · ${skin.rarity}`,
 track:skin.track,level:skin.runtime.unlock.level,pack:skin.runtime.pack,collection:skin.collection,
})));

// Every track receives a midpoint and end milestone, cycling six unique ships.
// Duplicate grants are idempotent; family/grouping does not affect placement.
const SHIPS=['supportive','direct','analytical','playful','calm','mom'];
export const SHIP_DEFINITIONS=Object.freeze(Object.values(TRACKS).flatMap(({catalog:track},index)=>
 [3,5].map((level,slot)=>{const ship=SHIPS[(index*2+slot)%SHIPS.length];return Object.freeze({id:`ship-${ship}`,ship,name:shipDetails(ship).name,track,level});})
));

// --- item-catalog.json `weapons` (D21: 2 per style) ---
const WEAPONS=[
 ['chest-w1','Glove on a Stick','For winning arguments with the air.'],['chest-w2','Chrome Bar Mace','It benches you.'],
 ['arms-w1','Dumbbellchucks','Twice the dumbbell, half the coordination.'],['arms-w2','Pull-Up Staff','For reaching the top shelf of victory.'],
 ['quads-w1','Squat-Rack Axe','Leg day has a new ambassador.'],['quads-w2','Kettlebell Flail','Swings hard, asks questions never.'],
 ['glutes-w1','Band Slingshot','Resistance is futile. Literally.'],['glutes-w2','Hip-Thrust Hammer','Bridges: now with consequences.'],
 ['yoga-w1','Mat Bo Staff','Rolled with intention. Swung with more.'],['yoga-w2','Block Gauntlets','Namaste out of the way.'],
 ['martial-arts-w1','Black-Belt Whip','It earned its own belt.'],['martial-arts-w2','Dummy Club','The dummy saw it coming. Still lost.'],
 ['cardio-w1','Jump-Rope Lasso','For roping runaway heart rates.'],['cardio-w2','Shoe Boomerang','It always comes back. Like soreness.'],
 ['meditation-w1','Singing-Bowl Aegis','Om. Also, clang.'],['meditation-w2','Incense Wand','Smells like victory. Allegedly.'],
];
// --- item-catalog.json `textures` (D14: 3 per style, slot order = texture-1/2/3; ids match materials-registry.ts) ---
const TEXTURES=[
 ['chest-plate-steel','Plate Steel','Now with 40% more clank.'],['chest-rubber-grip','Rubber Grip','For hands that mean business.'],['chest-chain-mail','Chain Mail','Medieval. But make it cardio.'],
 ['quads-track-rubber','Track Rubber','Smells faintly of starting blocks.'],['quads-denim','Denim','For legs that never skip jeans either.'],['quads-hex-tread','Hex Tread','Grip: gecko-grade.'],
 ['glutes-sweatshirt-fleece','Sweatshirt Fleece','Like a hug from laundry day.'],['glutes-quilted','Quilted','Grandma approved. Gains approved harder.'],['glutes-peach','Speckled','Ripe. Do not squeeze the coach.'],
 ['arms-hammered-bronze','Hammered Bronze','Shiny. Slightly dented. Like all of us.'],['arms-rope','Fine Stripe','Climb every metaphor.'],['arms-leather','Snake Skin','Broken in. Like you, after set three.'],
 ['yoga-cork','Holey','Floats. Like your downward dog.'],['yoga-woven-mat','Woven Mat','Hand-woven by extremely calm spiders.'],['yoga-petal','Petal','Delicate. Unlike your warrior two.'],
 ['martial-arts-canvas-gi','Graph Paper','It has seen things. Mostly laundry.'],['martial-arts-bamboo','Bamboo','Bends. Does not break. Unlike resolutions.'],['martial-arts-dragon-scale','Dragon Scale','The dragon is fine. It donated.'],
 ['cardio-mesh','Cool Graph Paper','Maximum airflow. Minimum excuses.'],['cardio-terry-cloth','Terry Cloth','Absorbs sweat and bad decisions.'],['cardio-pebble-path','Pebble Path','A tiny trail, wherever you go.'],
 ['meditation-sand-garden','Wiggles','Raked by a very patient rake.'],['meditation-river-stone','River Stone','Smooth. Unbothered. Goals.'],['meditation-moss','Moss','Grows on you. Literally, now.'],
];
// #140 (D45; slots approved D47): the once-free legacy textures (materials-registry.ts `legacy-<n>`,
// names = catalog.ts STYLES) are battle-pass rewards now, each in the slot of a catalog texture above,
// which became free instead. The ONE swap table; materials-registry.ts derives its locks from it.
// Reshuffle = move a legacy row to another freed id. freed catalog id -> [legacy id, name, line].
export const TEXTURE_SWAP=Object.freeze({
 'chest-rubber-grip':['legacy-15','Magma','Runs hot. Cools never.'], // Chest L3
 'glutes-sweatshirt-fleece':['legacy-13','Stone Golem','Built slow. Built to last.'], // Glutes L1 (Ian's "rock golem")
 'arms-rope':['legacy-14','Crystal','Clear eyes. Sharp facets.'], // Arms L3
 'arms-leather':['legacy-8','Spectral','Here in spirit. Also in body.'], // Arms L5
 'yoga-cork':['legacy-20','Fluffy','Maximum floof. Minimum mercy.'], // Yoga L1
 'yoga-woven-mat':['legacy-21','Jelly','Wobbles. Never falls.'], // Yoga L3 (R25: Jelly is retired; the id only keeps this slot's earned pack id stable)
 'cardio-terry-cloth':['legacy-16','Glacial','Cool under pressure. Very cool.'], // Cardio L3
});
// --- item-catalog.json `bosses` (unlock lines reused for every board boss of that family) ---
const BOSS_LINES={
 push:['Forged from lost remote controls.','For the comfiest conqueror.'],
 legs:['Always moving. Never in a hurry.','Polished by a thousand commutes.'],
 motion:['Nine more minutes. Forever.','Shiny. Like your intentions at 6 AM.'],
 flow:['Eight arms. Zero flexibility.','Breathe in. The kraken breathes out.'],
 meditation:['99+ unread. All of them urgent.','Silent. At last.'],
};
// --- item-catalog.json `pets` (D21: one per family; the catalog leaves names null) ---
const PET_LINES={
 push:'It followed you home from the gym. Keep it.',legs:'It never skips leg day. It never skips anything.',
 motion:'Fast. Loud. Naps hard.',flow:'Bends in ways physics dislikes.',meditation:'It hums when you breathe. Do not ask how.',
};

const item=(kind,[id,name,line])=>({kind,id,name,line});
const rewardPack=(tier,id)=>({kind:'reward-pack',id:`reward-pack:${tier}:${id}`,tier,name:`${tier[0].toUpperCase()+tier.slice(1)} Pack`,line:'Open for one random cosmetic.'});
// The five free texture IDs live in texture-policy.mjs; catalog additions go to packs.
// catalog.ts STYLES names, id order (legacy-<n> textures; legacy-color-<n> colours are "<name> (original)").
export const LEGACY_NAMES=Object.freeze(['Mortal','Verdant','Mycelial','Chitin','Reptilian','Abyssal','Coral','Skeletal','Spectral','Infernal','Celestial','Voidborn','Eldritch','Stone Golem','Crystal','Magma','Glacial','Stormcharged','Clockwork Robot','Neon Synth','Fluffy','Jelly','Baby']);
// The texture pack pool: every non-free texture, once. (TEXTURE_SWAP below only decides which texture a
// battle-pass slot names; the pack pool never depends on it, so no texture can be unreachable.)
export const textureRewardPool=()=>[
 ...TEXTURES.map(t=>item('texture',t)),
 ...[["opal-jelly","Opal Jelly"],["bubble-glass","Bubble Glass"],["prism-crystal","Prism Crystal"],["holo-foil","Holographic Foil"],["glitter-resin","Glitter Resin"],["galaxy-geode","Galaxy Geode"],["caustic-slime", "Caustic Slime"], ["blister-hide", "Blister Hide"], ["rotten-rind", "Rotten Rind"], ["parasite-nest", "Parasite Nest"], ["exposed-sinew", "Exposed Sinew"], ["abyssal-maw", "Abyssal Maw"], ["circuit-alloy", "Circuit Alloy"], ["servo-armor", "Servo Armor"], ["chrome-rib", "Chrome Rib"], ["carbon-mech", "Carbon Mech"], ["hazard-panel", "Hazard Panel"], ["reactor-glass", "Reactor Glass"]].map(([id,name])=>item('texture',[id,name,''])),
 ...LEGACY_NAMES.map((name,n)=>item('texture',[`legacy-${n}`,name,''])),
 item('texture',['coach-64-bit','64-bit Pixel Finish','A pixel finish for a coach with a boss skin.']),
].filter(t=>!FREE_TEXTURE_IDS.includes(t.id)&&!RETIRED_TEXTURE_IDS.includes(t.id));
// R18 G2b: the 15 free colours span the hue range; each is the nearest (Lab) hex
// already present in the census of palettes.json + SIMPLE_COLORS + LEGACY_COLORS
// (scripts/colour-census.mjs). Everything else is pack-only.
export const FREE_COLOURS=Object.freeze([
 '#060409', // black
 '#ffffff', // white
 '#7f7d78', // grey
 '#ff3b30', // red
 '#ff8a2a', // orange
 '#ffd100', // yellow
 '#2bd97c', // green
 '#008c8c', // teal
 '#2454d6', // blue
 '#6a2bd9', // purple
 '#f59ec4', // pink
 '#7a5530', // brown
 '#c4a77d', // tan
 '#0b1a45', // navy
 '#9fe2bf', // mint
]);
export const FREE_COLOUR_NAMES=Object.freeze(['Black','White','Grey','Red','Orange','Yellow','Green','Teal','Blue','Purple','Pink','Brown','Tan','Navy','Mint']); // same order as FREE_COLOURS
// R18 G5: every colour item carries its primary `hex`, so the pack screen can show a swatch (a test pins these to the registry).
export const colourRewardPool=()=>[
 ...PALETTES.map(p=>({kind:'palette',id:p.id,name:p.name})),
 ...[['default-slate','Slate','#8b8f9a'],['default-clay','Warm Clay','#b7a68e'],['default-ruby','Ruby','#a23b4a'],['default-sapphire','Sapphire','#2d5aa0'],['default-moss','Moss','#4c7a3f'],['default-gold','Gold','#c9a13a'],['default-charcoal','Charcoal','#333238'],['default-blush','Blush','#d98fa0']].map(([id,name,hex])=>({kind:'color',id,name,hex})), // R18 G2b: none of the 8 simple colours is a free hex
 ...LEGACY_NAMES.map((name,n)=>({kind:'color',id:`legacy-color-${n}`,name:`${name} (original)`,hex:n?LEGACY_STYLES[n].primary:'#7946aa'})), // design.ts restyles #0 as Original MYR5
];
function packCosmetics(levels,bossId){
 for(let level=0;level<levels.length;level++)levels[level]=levels[level].flatMap(reward=>{
  if(reward.kind==='palette')return [rewardPack('uncommon',`${bossId}:L${level+1}:${reward.id}`)];
  if(reward.kind==='texture')return [rewardPack('legendary',`${bossId}:L${level+1}:${reward.id}`)];
  if(reward.kind==='boss-skin')return [{kind:'boss-unlock',id:bossId,name:reward.name.replace(/ Skin$/,' Beaten'),line:'Boss cleared at level 5.'}];
  return [reward];
 });
 levels[3].push(rewardPack('rare',`${bossId}:L4:64-bit`));
 // R20: L2 (boss texture) and L5 (Boss beaten) otherwise show no pack on the board.
 const hasPack=level=>level.some(reward=>reward.kind==='reward-pack');
 if(!hasPack(levels[1]))levels[1].push(rewardPack('uncommon',`${bossId}:L2:bonus`));
 if(!hasPack(levels[4]))levels[4].push(rewardPack('legendary',`${bossId}:L5:bonus`));
 return levels;
}
const find=(list,id)=>list.find(row=>row[0]===id);
export function paletteItem(id){const p=PALETTES.find(p=>p.id===id);return {kind:'palette',id,name:p.name,line:p.tagline};}
// palettes.json `reward` ('<bossId>:L<n>' | 'food:L<n>') -> palette id.
const SLOT_PALETTE=new Map(PALETTES.filter(p=>p.reward).map(p=>[p.reward,p.id]));
const slotPalettes=(owner,count)=>Array.from({length:count},(_,i)=>SLOT_PALETTE.get(`${owner}:L${i+1}`)).map(id=>id?[paletteItem(id)]:[]);
const petItem=family=>({kind:'pet',id:`${family}-pet`,name:`${family[0].toUpperCase()}${family.slice(1)} pet`,line:PET_LINES[family],family});

/** The D22 ladder for one board boss: an array of 5 levels, each an array of
 * `{kind,id,name,line}` items. Pets carry `family` (D21 sharing, resolved by the caller).
 * Pure; returns null for an unknown boss id. */
export function bossRewards(bossId){
 const boss=BOSSES.find(b=>b.id===bossId);
 if(!boss)return null;
 const meta=boss.track&&TRACKS[boss.track],lines=BOSS_LINES[meta?.family]||[null,null];
 const levels=slotPalettes(boss.id,LEVELS_PER_BOSS); // D32 fill (empty for first bosses)
 levels[1].push({kind:'boss-texture',id:`${boss.id}-texture`,name:`${boss.name} Texture`,line:lines[0]});
 levels[4].push({kind:'boss-skin',id:`${boss.id}-skin`,name:`${boss.name} Skin`,line:lines[1]});
 if(!meta||boss.index!==1)return packCosmetics(levels,boss.id);
 const c=meta.catalog,tex=TEXTURES.filter(t=>t[0].startsWith(c+'-')).map(t=>TEXTURE_SWAP[t[0]]??t); // catalog order = texture-1/2/3
 levels[0].unshift(item('weapon',find(WEAPONS,`${c}-w1`)),item('texture',tex[0]));
 levels[1].unshift(paletteItem(meta.palette));
 levels[2].push(item('weapon',find(WEAPONS,`${c}-w2`)),{kind:'special',id:`${c}-special`,name:`${meta.name} Special`,line:'Unlocked at level 3.'},item('texture',tex[1]));
 levels[3].push(petItem(meta.family));
 levels[4].unshift({kind:'aura',id:`${c}-aura`,name:`${meta.name} Aura`,line:'Your first aura look.'});
 levels[4].push(item('texture',tex[2]));
 for(const skin of CREATURE_SKIN_REWARDS.filter(row=>row.track===c))levels[skin.level-1].push(skin);
 for(const ship of SHIP_DEFINITIONS.filter(row=>row.track===c))levels[ship.level-1].push({kind:'ship',id:ship.id,name:ship.name,line:shipDetails(ship.ship).description,ship:ship.ship,pack:'coach-ships-biomes'});
 return packCosmetics(levels,boss.id);
}

// --- Food (D32): no board row, no weapons (item-catalog's food-w1/w2 are never granted), no pet
// or boss. Each Food level (food-photo steps, circuit `tracks.food`) grants its palettes.json
// palette + one bonus. Levels = the food:L<n> palettes, so adding one adds a level. ---
export const FOOD_BONUS=Object.freeze({id:'food-bonus',name:'Second Helping',line:'Hits harder for one day. Chew responsibly.',
 effect:Object.freeze({type:'damage-multiplier',days:1,value:FOOD_BONUS_DAMAGE_MULTIPLIER})});
export const FOOD_LEVELS=PALETTES.filter(p=>p.reward?.startsWith('food:')).length;
/** Food ladder: FOOD_LEVELS levels, each `[palette, bonus]`. Bonus ids are per level
 * (`food-bonus-<n>`) so each grant happens once. */
export const foodRewards=()=>slotPalettes('food',FOOD_LEVELS).map((items,i)=>[...items.map(reward=>rewardPack('uncommon',`food:L${i+1}:${reward.id}`)),{kind:'bonus',id:`${FOOD_BONUS.id}-${i+1}`,name:FOOD_BONUS.name,line:FOOD_BONUS.line,effect:FOOD_BONUS.effect}]);
