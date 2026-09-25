import test from 'node:test';
import assert from 'node:assert/strict';
const memory=new Map();
globalThis.localStorage={getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,String(value)),removeItem:key=>memory.delete(key),clear:()=>memory.clear()};
globalThis.myr5AuthenticatedAccount={user:{id:'reward-test'}};
const {bossRewards,foodRewards}=await import('../battle-pass-rewards.mjs');
const {grantDailyPack,openRewardPack,rollCategory,openedPack,unopenedPacks}=await import('../reward-packs.mjs');
const ledger=await import('../unlock-ledger.mjs');
const store=await import('../creature/source/creator/unlock-store.ts');

test('exact category boundaries for all three tiers',()=>{
 for(const [tier,low,middle] of [['uncommon',90,97],['rare',80,95],['legendary',70,90]]){
  assert.equal(rollCategory(tier,()=>0),'color');
  assert.equal(rollCategory(tier,()=>(low-.001)/100),'color');
  assert.equal(rollCategory(tier,()=>low/100),'64-bit');
  assert.equal(rollCategory(tier,()=>(middle-.001)/100),'64-bit');
  assert.equal(rollCategory(tier,()=>middle/100),'texture');
  assert.equal(rollCategory(tier,()=>1),'texture');
 }
});

test('five-step cycle preserves weapons, pet and boss while replacing cosmetic slots',()=>{
 const levels=bossRewards('strider-1');
 assert(levels[0].some(item=>item.kind==='weapon'&&item.id==='chest-w1'));
 assert(levels[1].some(item=>item.kind==='reward-pack'&&item.tier==='uncommon'));
 assert(levels[2].some(item=>item.kind==='weapon'&&item.id==='chest-w2'));
 assert(levels[3].some(item=>item.kind==='pet'));
 assert(levels[3].some(item=>item.kind==='reward-pack'&&item.tier==='rare'));
 assert(!levels.flat().some(item=>item.kind==='boss-skin'),'64-bit boss skin is pack loot');
 assert(levels[4].some(item=>item.kind==='reward-pack'&&item.tier==='legendary'));
 assert(!levels.flat().some(item=>['palette','texture','boss-skin'].includes(item.kind)));
 assert(levels[4].some(item=>item.kind==='boss-unlock'));
 assert(foodRewards()[0].some(item=>item.kind==='reward-pack'&&item.tier==='uncommon'));
});

test('opening is saved once and unlocks in the existing cosmetic store',()=>{
 memory.clear();const item=bossRewards('strider-1')[1].find(item=>item.tier==='uncommon');
 assert.equal(openRewardPack(item,{random:()=>0}),null,'unearned pack cannot open');
 assert(ledger.grantUnlock('reward-pack',item.id));
 const opened=openRewardPack(item,{random:()=>0});
 assert.equal(opened.category,'color');assert.equal(opened.reward.kind,'palette');
 assert(store.isGranted('palette',opened.reward.id));
 assert.deepEqual(openRewardPack(item,{random:()=>.99}),opened,'reopen never rerolls');
 assert.deepEqual(openedPack(item.id),opened);
});

test('daily login grants one Uncommon pack per local calendar day',()=>{
 memory.clear();const date=new Date(2026,8,24,12);const first=grantDailyPack({date,account:globalThis.myr5AuthenticatedAccount});
 assert.equal(first.tier,'uncommon');assert.equal(grantDailyPack({date,account:globalThis.myr5AuthenticatedAccount}),null);
 assert(grantDailyPack({date:new Date(2026,8,25,12),account:globalThis.myr5AuthenticatedAccount}));
});

test('a saved roll repairs an interrupted cosmetic grant without rerolling',()=>{
 memory.clear();const item=bossRewards('strider-1')[1].find(item=>item.tier==='uncommon');
 assert(ledger.grantUnlock('reward-pack',item.id));
 const original=localStorage.setItem;
 localStorage.setItem=(key,value)=>{if(key==='myr5-unlocks-v1')throw Error('quota');original(key,value);};
 try{assert.equal(openRewardPack(item,{random:()=>0}),null);}finally{localStorage.setItem=original;}
 const saved=openedPack(item.id);assert(saved);
 assert(!store.isGranted('palette',saved.reward.id));
 assert(unopenedPacks().includes(item.id),'failed grant remains visible in pack launcher');
 assert.deepEqual(openRewardPack(item,{random:()=>.999}),saved);
 assert(store.isGranted('palette',saved.reward.id));
 assert(!unopenedPacks().includes(item.id),'completed grant leaves pack launcher');
});

test('64-bit rolls award existing boss skins and do not advance boss progress',async()=>{
 memory.clear();const item=bossRewards('strider-1')[3].find(item=>item.tier==='rare');
 assert(ledger.grantUnlock('reward-pack',item.id));
 const {loadProgress}=await import('../battle-pass.mjs');
 const before=loadProgress({tracks:{},account:{onboarding:{data:{profile:{exercises:[]}}}}});
 const result=openRewardPack(item,{random:(()=>{let n=0;return ()=>n++?0:.82;})()});
 assert.equal(result.category,'64-bit');assert.equal(result.reward.kind,'boss-skin');
 assert(ledger.isGranted('boss-skin',result.reward.id));
 assert.deepEqual(loadProgress({tracks:{},account:{onboarding:{data:{profile:{exercises:[]}}}}}),before);
});