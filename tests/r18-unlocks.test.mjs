import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,statSync} from 'node:fs';
import {join} from 'node:path';
import {build} from 'esbuild';

// R18 lane G: free textures, free colours, three colour channels, no unlock hint text.
const memory=new Map();
globalThis.localStorage={getItem:k=>memory.has(k)?memory.get(k):null,setItem:(k,v)=>memory.set(k,String(v)),removeItem:k=>memory.delete(k),clear:()=>memory.clear()};
globalThis.myr5AuthenticatedAccount={user:{id:'r18-unlocks'}};
const result=await build({stdin:{contents:"export * from './creature/source/creator/materials-registry';export {COLOUR_CHANNELS,COLOUR_SOURCE,REGIONS} from './creature/source/creator/design';",resolveDir:process.cwd(),loader:'ts'},bundle:true,format:'esm',platform:'neutral',mainFields:['module','main'],write:false,target:'es2022'});
const m=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
const {TEXTURES,COLORS,PALETTES,FREE_COLOURS,isTextureUnlocked,isColorUnlocked,isLocked,regionChoice,colorTriad,resolveRegionMaterial,COLOUR_SOURCE,COLOUR_CHANNELS}=m;
const {PACK_ODDS}=await import('../reward-packs.mjs');
const {textureRewardPool,colourRewardPool,FREE_TEXTURE_IDS}=await import('../battle-pass-rewards.mjs');

test('pack odds are exactly the spec and each tier sums to 100',()=>{
 assert.deepEqual(PACK_ODDS,{uncommon:{color:90,'64-bit':7,texture:3},rare:{color:80,'64-bit':15,texture:5},legendary:{color:70,'64-bit':20,texture:10}});
 for(const odds of Object.values(PACK_ODDS))assert.equal(Object.values(odds).reduce((a,b)=>a+b,0),100);
});

const FREE_NAMES=['Flat','Clay','Reptilian','Baby','Speckled','Fine Stripe','Snake Skin','Holey','Graph Paper','Cool Graph Paper','Bamboo','Wiggles','Moss'];
test('the original 13 free textures retain their rules beside the six new finishes',()=>{
 const free=TEXTURES.filter(t=>t.familyId<57&&isTextureUnlocked(t));
 assert.deepEqual(free.map(t=>t.displayName).sort(),[...FREE_NAMES].sort());
 assert.deepEqual(free.map(t=>t.id).sort(),[...FREE_TEXTURE_IDS].sort());
 assert.equal(FREE_TEXTURE_IDS.length,13);
});

test('every ordinary non-free texture is in the texture pack pool; the pixel finish uses the 64-bit category, and the pool holds nothing free or unknown',()=>{
 const pool=new Set(textureRewardPool().map(t=>t.id)),ids=new Set(TEXTURES.map(t=>t.id));
 for(const t of TEXTURES.filter(t=>t.id!=='coach-64-bit'))assert.equal(pool.has(t.id),!isTextureUnlocked(t),t.id);
 assert(TEXTURES.some(t=>t.id==='coach-64-bit'));assert(!pool.has('coach-64-bit'));
 for(const id of pool)assert.ok(ids.has(id),`pool id ${id} exists in the registry`);
 assert.equal(textureRewardPool().length,pool.size,'no duplicate pool entries');
});

test('the 15 free colours span the hue range and remain selectable independently of palette redesigns',()=>{
 assert.deepEqual([...FREE_COLOURS],['#060409','#ffffff','#7f7d78','#ff3b30','#ff8a2a','#ffd100','#2bd97c','#008c8c','#2454d6','#6a2bd9','#f59ec4','#7a5530','#c4a77d','#0b1a45','#9fe2bf']);
 assert.equal(new Set(FREE_COLOURS).size,15);
 for(const h of FREE_COLOURS){assert.equal(isLocked(h),false,h);assert.ok(colorTriad(h));}
 assert.equal(isLocked('#0a0a0a'),true);
});

test('every non-free colour and palette is in the colour pack pool',()=>{
 memory.clear();
 const pool=colourRewardPool(),poolIds=new Set(pool.map(i=>i.id));
 for(const c of COLORS)assert.equal(poolIds.has(c.id),!isColorUnlocked(c),c.id);
 for(const p of PALETTES)assert.ok(poolIds.has(p.id),p.id);
 for(const item of pool)assert.ok(item.kind==='palette'?PALETTES.some(p=>p.id===item.id):COLORS.some(c=>c.id===item.id),`${item.id} exists`);
});

test('three channels: body colour reaches body, arms, feet and collar; head and eyes keep their own',()=>{
 const mc=(colorId,textureId='flat')=>({textureId,colorId,sparkle:0,metallic:0});
 const materials={body:mc('#a23b4a'),arms:mc('default-sapphire'),feet:mc('default-sapphire'),collar:mc('default-sapphire'),head:mc('#2d5aa0'),eye:mc('#ffffff')};
 for(const r of ['body','arms','feet','collar'])assert.equal(regionChoice(materials,r).colorId,'#a23b4a',r);
 assert.equal(regionChoice(materials,'head').colorId,'#2d5aa0');assert.equal(regionChoice(materials,'eye').colorId,'#ffffff');
 assert.equal(regionChoice({arms:mc('#a23b4a','flat')},'arms').colorId,'#a23b4a','a lone region keeps its own colour');
 assert.equal(regionChoice({body:mc('#a23b4a'),arms:mc('default-sapphire','clay')},'arms').textureId,'clay','textures stay per region');
 assert.deepEqual(COLOUR_CHANNELS.map(c=>c.id),['body','head','eyes']);
 for(const r of m.REGIONS)assert.ok(COLOUR_SOURCE[r]);
 const src=readFileSync('creature/source/creator/assemble.ts','utf8');
 assert.match(src,/resolveRegionMaterial\(d\.styles\[region\],regionChoice\(d\.materials,region\),preview,d\.body\)/,'assemble resolves every region through the channel colour');
});

test('an owned palette keeps all three colors together on its selected part; base colors stay distinct',()=>{
 memory.clear();
 const p=PALETTES.find(p=>!p.colors.some(h=>FREE_COLOURS.includes(h.toLowerCase())));
 assert.equal(isLocked(p.id),true);
 assert.equal(colorTriad(p.id),undefined);
 assert.equal(colorTriad(p.id,true).paletteId,p.id,'locked preview renders the complete palette');
 m.grantUnlock('palette',p.id);
 const triad=colorTriad(p.id);
 assert.equal(triad.paletteId,p.id);assert.deepEqual([triad.primary,triad.secondary,triad.accent],p.colors);
 const materials={body:{textureId:'flat',colorId:'#7f7d78'},head:{textureId:'clay',colorId:p.id},eye:{textureId:'flat',colorId:'#ffffff'}};
 assert.equal(resolveRegionMaterial(0,regionChoice(materials,'head')).paletteId,p.id);
 assert.equal(resolveRegionMaterial(0,regionChoice(materials,'body')).paletteId,undefined);
 assert.equal(resolveRegionMaterial(0,regionChoice(materials,'eye')).paletteId,undefined);
 assert.equal(colorTriad('#7f7d78').paletteId,undefined);
 assert.equal(colorTriad(p.id,false,'other-coach'),undefined,'palette ownership is still coach-specific');
 for(const h of p.colors){assert.equal(isLocked(h),false,'old single-color saved choices remain usable');}
});

test('no "unlocks at" text anywhere in creature/source',()=>{
 const walk=d=>readdirSync(d).flatMap(f=>{const q=join(d,f);return statSync(q).isDirectory()?walk(q):[q];});
 for(const f of walk('creature/source').filter(f=>/\.(ts|mjs|js|html|css)$/.test(f)))assert.doesNotMatch(readFileSync(f,'utf8'),/unlocks at/i,f);
 for(const f of ['creature/index.html','creature/creature.css'])assert.doesNotMatch(readFileSync(f,'utf8'),/unlocks at/i,f);
});

test('G5: every single-colour pack reward carries the registry primary, so the pack screen can show a swatch',async()=>{
 const {rewardSummary}=await import('../reward-pack-ui.mjs');
 for(const item of colourRewardPool().filter(i=>i.kind==='color')){
  assert.equal(item.hex.toLowerCase(),COLORS.find(c=>c.id===item.id).primary.toLowerCase(),item.id);
  assert.deepEqual(rewardSummary({category:'color',reward:item}).colors,[item.hex],item.id);
 }
 assert.deepEqual(rewardSummary({category:'color',reward:{kind:'color',id:'#ff3b30',name:'x'}}).colors,['#ff3b30'],'a hex colour id is its own swatch');
 assert.equal(rewardSummary({category:'texture',reward:{kind:'texture',id:'flat',name:'Flat'}}).colors.length,0);
});

test('every free colour has a name for its swatch, in FREE_COLOURS order',async()=>{
 const {FREE_COLOUR_NAMES}=await import('../battle-pass-rewards.mjs');
 assert.deepEqual([...FREE_COLOUR_NAMES],['Black','White','Grey','Red','Orange','Yellow','Green','Teal','Blue','Purple','Pink','Brown','Tan','Navy','Mint']);
 assert.equal(FREE_COLOUR_NAMES.length,FREE_COLOURS.length);
});
