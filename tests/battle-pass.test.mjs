import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';

// Node has no localStorage; one in-memory stand-in shared by every module under test.
const memory=new Map();
globalThis.localStorage={getItem:k=>memory.has(k)?memory.get(k):null,setItem:(k,v)=>memory.set(k,String(v)),removeItem:k=>memory.delete(k),clear:()=>memory.clear()};

const {levelsBeaten,loadProgress,selectedTracks,setSelectedTracks,battlePassState,syncBattlePass,STEPS_PER_LEVEL}=await import('../battle-pass.mjs');
const {BOSSES,ROWS,TRACKS,FOOD_LEVELS,FOOD_BONUS,TEXTURE_SWAP,bossRewards,foodRewards}=await import('../battle-pass-rewards.mjs');
const {FOOD_BONUS_DAMAGE_MULTIPLIER}=await import('../combat-config.mjs');
const {default:PALETTES}=await import('../creature/source/creator/palettes.json',{with:{type:'json'}});
const D32_PALETTES=new Set(PALETTES.filter(p=>p.reward).map(p=>p.id)); // the D32 fill, board + food
const store=await import('../creature/source/creator/unlock-store.ts');
const ledger=await import('../unlock-ledger.mjs');

const nobody={onboarding:{data:{profile:{exercises:[]}}}};
const steps=obj=>Object.fromEntries(Object.entries(obj).map(([t,s])=>[t,{steps:s}])); // circuit.mjs track ids
const row=(progress,id)=>BOSSES.filter(b=>b.row===id).map(b=>progress[b.id]);
const fresh=()=>{memory.clear();globalThis.myr5AuthenticatedAccount={user:{id:'battle-pass-test'}};};
const ALL_TRACKS=['chest','quads','glutes','arms-shoulders','yoga','martial-arts','cardio'];
const allSteps=n=>steps({chest:n,legs:n,hips:n,shoulders:n,yoga:n,'martial-arts':n,cardio:n,meditation:n,food:n});

test('level math at 4/5/24/25/26 steps (stepsPerLevel defaults to 5)',()=>{
 assert.equal(STEPS_PER_LEVEL,5);
 assert.deepEqual([4,5,24,25,26].map(s=>levelsBeaten(s)),[0,1,4,5,5]);
 fresh();setSelectedTracks(['chest']);
 assert.deepEqual([4,5,24,25,26].map(s=>loadProgress({tracks:steps({chest:s})})['strider-1']),[0,1,4,5,5]);
 assert.deepEqual([24,25,26,30].map(s=>loadProgress({tracks:steps({chest:s})})['strider-2']),[0,0,0,1]);
 assert.equal(loadProgress({tracks:steps({chest:10}),stepsPerLevel:2})['strider-1'],5,'one knob retunes it');
});

test('bosses in a row are consecutive: boss k = clamp(level - 5(k-1), 0, 5)',()=>{
 fresh();setSelectedTracks(['chest']);
 assert.deepEqual(row(loadProgress({tracks:steps({chest:65})}),'strider'),[5,5,3,0,0,0]);
 assert.deepEqual(row(loadProgress({tracks:steps({chest:500})}),'strider'),[5,5,5,5,5,5],'a row caps at its last boss');
});

test('same boss ids and order as the board (38 bosses, Warden/Lume shared)',()=>{
 fresh();
 const progress=loadProgress({tracks:{},account:nobody});
 assert.equal(Object.keys(progress).length,38);
 assert.deepEqual(Object.keys(progress),BOSSES.map(b=>b.id));
 assert.deepEqual(ROWS.filter(r=>!r.track).map(r=>r.id),['warden','lume']);
 assert.deepEqual(ROWS.map(r=>r.bosses),[6,5,5,5,1,4,3,4,4,1]);
});

test('only selected paths + meditation progress; explicit pick beats onboarding movements',()=>{
 fresh();
 const account={onboarding:{data:{profile:{exercises:['squat','pushup','boxing','jumping','tree']}}}};
 assert.deepEqual([...selectedTracks(null)],['meditation']);
 assert.deepEqual([...selectedTracks(account)].sort(),['cardio','chest','martial-arts','meditation','quads']);
 const all=steps({chest:25,legs:25,hips:25,shoulders:25,yoga:25,'martial-arts':25,cardio:25,meditation:25});
 const p=loadProgress({tracks:all,account});
 for(const id of ['strider','ringer','cap','stalk','tanka'])assert.equal(row(p,id)[0],5,id);
 for(const id of ['manyarm','wedge','blob'])assert.equal(row(p,id)[0],0,`${id} is not a selected path`);
 assert.deepEqual(setSelectedTracks(['glutes','meditation','nope','glutes']),['glutes']);
 assert.deepEqual([...selectedTracks(account)],['meditation','glutes']);
 const q=loadProgress({tracks:all,account});
 assert.equal(q['manyarm-1'],5);assert.equal(q['strider-1'],0);assert.equal(q['tanka-1'],5);
});

test('Warden then Lume open only once every available row is beaten, fed by overflow',()=>{
 fresh();setSelectedTracks(['yoga']); // rows: blob (4 bosses = 20 levels) + tanka (20 levels)
 const at=(yoga,med)=>loadProgress({tracks:steps({yoga:yoga*5,meditation:med*5})});
 let p=at(19,40);assert.equal(p['warden-1'],0,'yoga row not finished: meditation overflow waits');
 p=at(20,23);assert.deepEqual([p['warden-1'],p['lume-1']],[3,0]);
 p=at(22,26);assert.deepEqual([p['warden-1'],p['lume-1']],[5,3]);
 p=at(40,40);assert.deepEqual([p['warden-1'],p['lume-1']],[5,5]);
});

test('pack ladder retains fixed weapons, pet, boss looks and ship placement',()=>{
 const levels=bossRewards('strider-1');
 assert.deepEqual(levels.map(items=>items.filter(item=>item.kind==='reward-pack').map(item=>item.tier)),[['legendary'],['uncommon'],['legendary'],['rare'],['legendary']]);
 assert.deepEqual(levels.map(items=>items.filter(item=>item.kind==='weapon').map(item=>item.id)),[['chest-w1'],[],['chest-w2'],[],[]]);
 assert(levels[3].some(item=>item.kind==='pet'&&item.id==='push-pet'));
 assert(levels[1].some(item=>item.kind==='boss-texture'));
 assert(levels[4].some(item=>item.kind==='boss-unlock'));
 assert(levels[2].some(item=>item.kind==='ship'&&item.id==='ship-supportive'));
 for(const boss of BOSSES)assert(bossRewards(boss.id).every(items=>items.length>0),boss.id);
});

test('D32 palette fill becomes Uncommon packs in original slots',()=>{
 const filled=BOSSES.filter(boss=>!boss.track||boss.index>1);
 assert.equal(filled.length,30);
 for(const boss of filled){
  const levels=bossRewards(boss.id);
  assert.deepEqual(levels.map(items=>items.filter(item=>item.tier==='uncommon').length),[1,1,1,1,0],boss.id);
  assert(levels[3].some(item=>item.tier==='rare'),boss.id);
  assert(levels[1].some(item=>item.kind==='boss-texture'),boss.id);
  assert(!levels[4].some(item=>item.kind==='boss-skin'),boss.id);
 }
});

test('Food levels give Uncommon packs and retain per-level bonuses',()=>{
 assert.equal(FOOD_LEVELS,5);
 foodRewards().forEach((items,index)=>{
  assert.deepEqual(items.map(item=>item.kind),['reward-pack','bonus']);
  assert.equal(items[0].tier,'uncommon');
  assert.equal(items[1].id,`food-bonus-${index+1}`);
 });
 fresh();const result=syncBattlePass({tracks:steps({food:10})});
 assert.deepEqual(result.granted.map(item=>item.kind),['reward-pack','bonus','reward-pack','bonus']);
 assert.equal(syncBattlePass({tracks:steps({food:10})}).granted.length,0);
});

test('shared family pet substitutes use Uncommon packs while first pet stays at level four',()=>{
 fresh();setSelectedTracks(['chest','arms-shoulders']);
 const state=battlePassState({tracks:steps({chest:25,shoulders:25})});
 const l4=id=>state.bosses.find(b=>b.id===id).rewards[3].items;
 assert(l4('strider-1').some(item=>item.kind==='pet'&&item.id==='push-pet'));
 assert(l4('wedge-1').some(item=>item.kind==='reward-pack'&&item.tier==='uncommon'));
 assert(l4('wedge-1').some(item=>item.kind==='reward-pack'&&item.tier==='rare'));
});

test('all earned packs persist once and do not directly unlock cosmetics',()=>{
 fresh();setSelectedTracks(['chest']);
 const tracks=steps({chest:25,meditation:4});
 const first=syncBattlePass({tracks});
 assert(first.granted.some(item=>item.kind==='reward-pack'));
 assert(ledger.isGranted('weapon','chest-w1'));
 assert(!ledger.isGranted('boss-skin','strider-1-skin'));
 assert.equal(store.grantedIds('palette').length,0);
 assert.equal(store.grantedIds('texture').length,0);
 assert.equal(syncBattlePass({tracks}).granted.length,0);
});

test('step source: live coachProgress, else the cached progress snapshot',()=>{
 fresh();setSelectedTracks(['cardio']);
 memory.set('myr5-workout-progress-v1',JSON.stringify({version:1,completedSets:0,circuit:{tracks:steps({cardio:12})}}));
 assert.equal(loadProgress()['stalk-1'],2);
 globalThis.coachProgress={circuit:{tracks:steps({cardio:20})}};
 assert.equal(loadProgress()['stalk-1'],4);
 delete globalThis.coachProgress;
});

test('R20: every boss shows a pack on level 2 (Uncommon) and level 5 (Legendary), granted once',()=>{
 for(const boss of BOSSES){
  const levels=bossRewards(boss.id);
  assert(levels[1].some(item=>item.kind==='reward-pack'&&item.tier==='uncommon'),boss.id);
  assert(levels[4].some(item=>item.kind==='reward-pack'&&item.tier==='legendary'),boss.id);
  const ids=levels.flat().filter(item=>item.kind==='reward-pack').map(item=>item.id);
  assert.equal(new Set(ids).size,ids.length,boss.id);
 }
 assert.equal(bossRewards('warden-1')[1].filter(item=>item.kind==='reward-pack').length,1);
 assert.equal(bossRewards('strider-1')[4].filter(item=>item.kind==='reward-pack').length,1,'first bosses keep their L5 texture pack, no bonus added');
});
