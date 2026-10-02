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
const {TEXTURES,COLORS,PALETTES,FREE_COLOURS,isTextureUnlocked,isColorUnlocked,isLocked,regionChoice,colorTriad,paletteChannelIds,COLOUR_SOURCE,COLOUR_CHANNELS}=m;
const {PACK_ODDS}=await import('../reward-packs.mjs');
const {textureRewardPool,colourRewardPool,FREE_TEXTURE_IDS}=await import('../battle-pass-rewards.mjs');

test('pack odds are exactly the spec and each tier sums to 100',()=>{
 assert.deepEqual(PACK_ODDS,{uncommon:{color:90,'64-bit':7,texture:3},rare:{color:80,'64-bit':15,texture:5},legendary:{color:70,'64-bit':20,texture:10}});
 for(const odds of Object.values(PACK_ODDS))assert.equal(Object.values(odds).reduce((a,b)=>a+b,0),100);
});

const FREE_NAMES=['Flat','Clay','Reptilian','Baby','Speckled','Fine Stripe','Snake Skin','Holey','Graph Paper','Cool Graph Paper','Bamboo','Wiggles','Moss'];
test('exactly 13 textures are free, and they are the 13 named ones',()=>{
 const free=TEXTURES.filter(isTextureUnlocked);
 assert.deepEqual(free.map(t=>t.displayName).sort(),[...FREE_NAMES].sort());
 assert.deepEqual(free.map(t=>t.id).sort(),[...FREE_TEXTURE_IDS].sort());
 assert.equal(FREE_TEXTURE_IDS.length,13);
});

test('every non-free texture is in the texture pack pool, and the pool holds nothing free or unknown',()=>{
 const pool=new Set(textureRewardPool().map(t=>t.id)),ids=new Set(TEXTURES.map(t=>t.id));
 for(const t of TEXTURES)assert.equal(pool.has(t.id),!isTextureUnlocked(t),t.id);
 for(const id of pool)assert.ok(ids.has(id),`pool id ${id} exists in the registry`);
 assert.equal(textureRewardPool().length,pool.size,'no duplicate pool entries');
});

test('the 15 free colours span the hue range and each already exists in the census',()=>{
 assert.deepEqual([...FREE_COLOURS],['#060409','#ffffff','#7f7d78','#ff3b30','#ff8a2a','#ffd100','#2bd97c','#008c8c','#2454d6','#6a2bd9','#f59ec4','#7a5530','#c4a77d','#0b1a45','#9fe2bf']);
 const census=new Set(),add=h=>census.add(h.toLowerCase());
 for(const c of COLORS)[c.primary,c.secondary,c.accent].forEach(add);
 for(const p of PALETTES)p.colors.forEach(add);
 for(const h of FREE_COLOURS)assert.ok(census.has(h),h);
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
 assert.match(src,/resolveRegionMaterial\(d\.styles\[region\],regionChoice\(d\.materials,region\),preview\)/,'assemble resolves every region through the channel colour');
});

test('an owned palette fills the three channels: primary body, secondary head, accent eyes',()=>{
 memory.clear();
 const p=PALETTES.find(p=>!p.colors.some(h=>FREE_COLOURS.includes(h.toLowerCase())));
 assert.equal(isLocked(p.id),true);
 const [body,head,eyes]=paletteChannelIds(p);
 assert.deepEqual([body,head,eyes],p.colors.map(h=>h.toLowerCase()));
 assert.equal(isLocked(body),true,`${body} is not free until the palette is owned`);
 m.grantUnlock('palette',p.id);
 for(const h of [body,head,eyes]){assert.equal(isLocked(h),false);assert.equal(colorTriad(h).primary,h);}
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
