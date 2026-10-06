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
const allSteps=n=>steps({chest:n,legs:n,hips:n,shoulders:n,yoga:n,'martial-arts':n,cardio:n,meditation:n,food:n});

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

test('legacy food reward definitions remain readable without minting new step-based rewards',()=>{
 assert.equal(FOOD_LEVELS,5);
 foodRewards().forEach((items,index)=>{
  assert.deepEqual(items.map(item=>item.kind),['reward-pack','bonus']);
  assert.equal(items[0].tier,'uncommon');
  assert.equal(items[1].id,`food-bonus-${index+1}`);
 });
 fresh();const result=syncBattlePass({tracks:steps({food:10})});
 assert.deepEqual(result.granted,[]);
 assert.equal(syncBattlePass({tracks:steps({food:10})}).granted.length,0);
});

const {recordPerformanceSession,recordDailyActivity,readPerformanceProgress}=await import('../performance-progress.mjs');
const {COACH_REQUIREMENTS}=await import('../performance-catalog.mjs');
test('cosmetic pass grants packs from XP once, never performance items from circuit steps',()=>{
 fresh();setSelectedTracks(['chest','quads']);
 const old=syncBattlePass({tracks:allSteps(99999)});assert.equal(old.granted.length,0);
 recordPerformanceSession({id:'saved-hold',mode:'horse',kind:'hold',difficulty:'easy',activeSeconds:15,continuousSeconds:15,xpBase:1,earnedCoachCount:0,day:'2026-10-04'});
 recordDailyActivity('meditation',{id:'med',day:'2026-10-04'});recordDailyActivity('food',{id:'food',day:'2026-10-04'});
 assert.equal(readPerformanceProgress().totalXp,502);
 const first=syncBattlePass();assert.equal(first.granted.length,7);assert.ok(first.granted.every(item=>item.kind==='reward-pack'));
 assert.ok(first.granted.some(item=>item.tier==='rare'));assert.equal(syncBattlePass().granted.length,0);
 for(const kind of ['weapon','ship','boss-unlock'])assert.equal(ledger.grantedIds(kind).length,0);
});
test('achievement board mirrors earned coaches and golden variants independently of selected paths',()=>{
 fresh();setSelectedTracks(['glutes','cardio']);
 assert.deepEqual(Object.keys(loadProgress()),BOSSES.map(b=>b.id));
 recordPerformanceSession({id:'earned-coach',mode:'pushup',kind:'hold',difficulty:'easy',value:300,activeSeconds:300,continuousSeconds:300,xpBase:1,earnedCoachCount:0});
 assert.ok(readPerformanceProgress().coaches.some(id=>COACH_REQUIREMENTS.some(c=>c.id===id&&c.groups.includes('chest'))));
 assert.ok(Object.values(loadProgress()).some(n=>n===4));
 recordPerformanceSession({id:'earned-gold',mode:'pushup',kind:'hold',difficulty:'easy',value:600,activeSeconds:600,continuousSeconds:600,xpBase:1,earnedCoachCount:0});
 assert.ok(Object.values(loadProgress()).some(n=>n===5));
});
test('exactly two owner-scoped paths grant only their introductory coaches, never step-based rewards',()=>{
 fresh();assert.deepEqual([...selectedTracks(nobody)],['meditation']);
 assert.throws(()=>setSelectedTracks(['glutes','nope','glutes']),/Exactly 2/);
 assert.deepEqual(setSelectedTracks(['glutes','cardio']),['glutes','cardio']);
 assert.deepEqual([...selectedTracks(nobody)],['meditation','glutes','cardio']);
 assert.equal(readPerformanceProgress().paths.length,2);
 assert.equal(loadProgress({tracks:allSteps(99999)})['strider-1'],0);
 globalThis.myr5AuthenticatedAccount={user:{id:'other-path-owner'}};
 assert.deepEqual([...selectedTracks(nobody)],['meditation'],'another account does not inherit the paths');
});
